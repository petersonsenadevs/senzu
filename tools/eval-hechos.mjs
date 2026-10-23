#!/usr/bin/env node
// Evaluación MEDIDA de la memoria de hechos (plan de Hemispheric, F4-T1): ¿recuerda lo que tiene que recordar, en
// cualquier idioma, y calla cuando no sabe? Corpus en tools/eval-hechos/corpus.json (hechos como los guardaría el
// agente y preguntas en 12 idiomas y 6 escrituras). Mide lo que se INYECTARÍA: resultados por encima del umbral del
// recuerdo vivo (UMBRAL_RECUERDO).
//   recall@1 / recall@3: con respuesta, el hecho esperado sale el primero / entre los 3 primeros
//   abstención: sin respuesta (o no vigente), no sale nada por encima del umbral
//   node tools/eval-hechos.mjs [--fallos] [--json] [--estricto] [--solo desarrollo|reservada] [--corpus base|fitlab] [--cat saltos] [--sin-cat saltos]
//   node tools/eval-hechos.mjs --baseline grep|bm25|embedding|motor   (cara a cara con los baselines, F8-T1)
//   node tools/eval-hechos.mjs --tabla   (ejes F8-T2: los 4 motores con latencia p50/p95, red, coste, determinismo y tamaño)
// --estricto sale con 1 si no llega a los objetivos (recall@3 ≥ 90 % y abstención ≥ 90 %).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crearBaseline } from './eval-hechos/baselines.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const solo = (() => { const i = args.indexOf('--solo'); return i >= 0 ? args[i + 1] : null; })();
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-eval-hechos-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const m = await import(pathToFileURL(path.join(process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks'), 'hechos.mjs')).href);
// Todos los corpus de tools/eval-hechos/ (X-T5): cada uno es un proyecto distinto con SU memoria de usuario
const DIR = path.join(ROOT, 'tools', 'eval-hechos');
const corpora = fs.readdirSync(DIR).filter(f => /^corpus.*\.json$/.test(f)).sort().map(f => ({ nombre: f.replace(/^corpus-?|\.json$/g, '') || 'base', ...JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));
const soloCorpus = (() => { const i = args.indexOf('--corpus'); return i >= 0 ? args[i + 1] : null; })();
// una categoría, o todas menos una (X-T13: los saltos se miden por recall@3; su respuesta es una pareja de hechos)
const soloCat = (() => { const i = args.indexOf('--cat'); return i >= 0 ? args[i + 1] : null; })();
const sinCat = (() => { const i = args.indexOf('--sin-cat'); return i >= 0 ? args[i + 1] : null; })();
// Motor a medir: el de Senzu (por defecto o --baseline motor) o un baseline léxico (grep|bm25) para el cara a cara (F8-T1)
const baseline = (() => { const i = args.indexOf('--baseline'); const v = i >= 0 ? args[i + 1] : null; return v && v !== 'motor' ? v : null; })();

// Relleno determinista (muchos hechos parecidos entre sí: ruido de verdad). La primera mitad, suministro; la segunda,
// mantenimiento, para que no haya dos con la misma combinación y «¿quién mantiene…?» tenga competidores.
function relleno(r) {
    if (!r) return [];
    return Array.from({ length: r.n }, (_, i) => {
        const eq = r.equipos[i % r.equipos.length], ci = r.ciudades[Math.floor(i / r.equipos.length) % r.ciudades.length], em = r.empresas[(i * 7) % r.empresas.length];
        const mant = i >= r.n / 2;
        return { id: `r${i}`, dimension: `${r.familia}.${r.prefijo}-${i}`, valor: `${mant ? 'mantenimiento' : 'proveedor'} de ${eq} en ${ci}: ${em}`,
            claves: mant ? ['maintenance', 'mantenimiento'] : ['supplier', 'proveedor'], t: 100 + i };
    });
}

const UMBRAL = m.UMBRAL_RECUERDO;
const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
function medir(l) {
    const con = l.filter(f => f.espera !== null), sin = l.filter(f => f.espera === null);
    return { preguntas: l.length, conRespuesta: con.length, sinRespuesta: sin.length,
        recall1: pct(con.filter(f => f.r1).length, con.length), recall3: pct(con.filter(f => f.r3).length, con.length), abstencion: pct(sin.filter(f => f.calla).length, sin.length) };
}
function tamDir(d) { try { return fs.readdirSync(d).reduce((s, f) => { const p = path.join(d, f), st = fs.statSync(p); return s + (st.isDirectory() ? tamDir(p) : st.size); }, 0); } catch { return 0; } }

// Evalúa UN motor (motor|grep|bm25|embedding) sobre todos los corpus: filas (acierto/abstención por pregunta),
// latencias por consulta (ms) y bytes en disco del índice (el motor persiste su memoria; los baselines viven en RAM).
async function evaluarMotor(nombre) {
    const esBaseline = nombre !== 'motor';
    const filas = [], latencias = [];
    let totalHechos = 0, discoBytes = 0;
    for (const corpus of corpora) {
        if (soloCorpus && corpus.nombre !== soloCorpus) continue;
        // el proyecto, con los hechos guardados en su orden (t), como en la vida real. Directorio LIMPIO cada vez:
        // --tabla llama a evaluarMotor 3 veces y el motor persiste en disco; sin limpiar, acumularía entre tiradas.
        const P = path.join(base, nombre + '-' + corpus.nombre);
        const userDir = path.join(base, nombre + '-u-' + corpus.nombre);
        fs.rmSync(P, { recursive: true, force: true });
        fs.rmSync(userDir, { recursive: true, force: true });
        fs.mkdirSync(path.join(P, 'senzu'), { recursive: true });
        fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
        process.env.SENZU_MEMORIA_USUARIO = path.join(userDir, 'memoria.md');
        const ids = new Map();
        const hechos = [...corpus.hechos, ...relleno(corpus.relleno)];
        totalHechos += hechos.length;
        // mismos hechos para todos: grep|bm25 (léxico, misma tokenización del motor) o embedding (semántico, modelo local)
        const idx = nombre === 'embedding'
            ? await (await import('./eval-hechos/embedding.mjs')).crearBaselineEmbedding(hechos)
            : esBaseline ? crearBaseline(nombre, hechos, { palabras: m.palabras, palabraConPeso: m.palabraConPeso }) : null;
        for (const h of hechos.sort((a, b) => a.t - b.t)) {
            const r = m.guardarHecho(P, { dimension: h.dimension, valor: h.valor, texto: h.texto, claves: h.claves, alcance: h.alcance, idioma: h.idioma, duda: h.duda, desde: h.desde, hasta: h.hasta, enlaces: h.enlaces },
                { ahora: new Date(T0 + h.t * 1000).toISOString() });
            ids.set(r.hecho.id, h.id);
        }
        if (!esBaseline) discoBytes += tamDir(path.join(P, 'senzu', 'memoria')) + tamDir(userDir);   // índice del motor en disco (proyecto + usuario)
        for (const q of corpus.preguntas) {
            if ((soloCat && q.cat !== soloCat) || (sinCat && q.cat === sinCat)) continue;
            if (solo === 'desarrollo' && q.reservada) continue;
            if (solo === 'reservada' && !q.reservada) continue;
            // --auto-temporal (X-T12): sin la marca del corpus; el pasado se detecta en la pregunta, como en el recuerdo vivo
            const hist = opt('--sin-historico') ? false : opt('--auto-temporal') ? (m.pistaTemporal(q.q) ? 'auto' : false) : !!q.historico;
            let got, topTxt;
            const t0 = performance.now();
            if (idx) {   // baseline: su propia recuperación y su propio «me abstengo» (lista vacía). await: embedding es async
                const hits = await idx.buscar(q.q, { limite: 3 });
                got = hits.map(x => x.id);
                topTxt = hits[0] ? `${hits[0].id} (${hits[0].score}; ${hits[0].motivo})` : '—';
            } else {     // motor de Senzu: resultados por encima del umbral del recuerdo vivo
                const hits = m.buscarHechos(P, q.q, { historico: hist, limite: 3 }).filter(x => x.puntuacion >= UMBRAL);
                got = hits.map(x => ids.get(x.hecho.id));
                topTxt = hits[0] ? `${ids.get(hits[0].hecho.id)} (${hits[0].puntuacion}; ${hits[0].motivo})` : '—';
            }
            latencias.push(performance.now() - t0);
            const conRespuesta = q.espera !== null;
            filas.push({ ...q, corpus: corpus.nombre, got, top: topTxt,
                r1: conRespuesta ? got[0] === q.espera : null, r3: conRespuesta ? got.includes(q.espera) : null, calla: conRespuesta ? null : got.length === 0 });
        }
    }
    return { filas, latencias, totalHechos, discoBytes };
}

// --- modo --tabla: los cuatro motores y los ejes que NO son recall (F8-T2) ---
if (opt('--tabla')) {
    const crypto = await import('node:crypto');
    const huella = r => crypto.createHash('sha1').update(r.filas.map(f => (f.got || []).join('·')).join('|')).digest('hex');
    const DIMS = 384, N = corpora.reduce((s, c) => s + c.hechos.length + (c.relleno?.n || 0), 0);   // e5-small: 384 dims
    const fil = [];
    for (const nombre of ['motor', 'bm25', 'grep', 'embedding']) {
        const corridas = [await evaluarMotor(nombre), await evaluarMotor(nombre), await evaluarMotor(nombre)];   // 3 tiradas → determinismo
        const hs = corridas.map(huella);
        const r = corridas[0], total = medir(r.filas), lat = r.latencias.slice().sort((a, b) => a - b);
        const pctl = p => lat.length ? +lat[Math.min(lat.length - 1, Math.floor((p / 100) * lat.length))].toFixed(3) : null;
        fil.push({ nombre, total, p50: pctl(50), p95: pctl(95), determinista: hs.every(h => h === hs[0]),
            discoKB: nombre === 'embedding' ? Math.round(tamDir(path.join(ROOT, 'tools', '.models')) / 1024) : Math.round(r.discoBytes / 1024) });
    }
    fs.rmSync(base, { recursive: true, force: true });
    if (opt('--json')) { process.stdout.write(JSON.stringify(fil, null, 2) + '\n'); process.exit(0); }
    const pad = (s, n) => String(s).padStart(n);
    const modeloMB = Math.round(tamDir(path.join(ROOT, 'tools', '.models')) / 1048576);
    process.stdout.write(`Ejes del benchmark (F8-T2) · ${N} hechos · todas las consultas locales (0 llamadas de red, 0 €)\n\n`);
    process.stdout.write('  motor       recall@1 recall@3 abstenc   lat.p50   lat.p95  determin.  índice disco\n');
    for (const x of fil) process.stdout.write(`  ${x.nombre.padEnd(10)} ${pad(x.total.recall1, 6)}% ${pad(x.total.recall3, 7)}% ${pad(x.total.abstencion, 6)}% ${pad(x.p50, 8)}ms ${pad(x.p95, 8)}ms ${pad(x.determinista ? 'sí' : 'NO', 9)}  ${pad(x.discoKB, 7)} KB\n`);
    process.stdout.write(`\n  red: 0 llamadas en todos (todo local).  coste: 0 € por consulta.\n`);
    process.stdout.write(`  embedding: descarga única del modelo (~${modeloMB} MB en tools/.models) + ~${Math.round(N * DIMS * 4 / 1024)} KB de vectores en RAM; luego offline.\n`);
    process.stdout.write(`  determinismo: huella sha1 de las respuestas idéntica en 3 tiradas de cada motor.\n`);
    process.exit(0);
}

// --- camino normal: un solo motor (por defecto el motor, o el --baseline indicado) ---
const r0 = await evaluarMotor(baseline || 'motor');
const filas = r0.filas, totalHechos = r0.totalHechos;
fs.rmSync(base, { recursive: true, force: true });

const agrupar = clave => Object.fromEntries([...new Set(filas.map(f => f[clave]))].sort().map(k => [k, medir(filas.filter(f => f[clave] === k))]));
const total = medir(filas);
const res = { umbral: UMBRAL, total, desarrollo: medir(filas.filter(f => !f.reservada)), reservada: medir(filas.filter(f => f.reservada)),
    porCorpus: agrupar('corpus'), porCategoria: agrupar('cat'), porIdioma: agrupar('lang'), fallos: filas.filter(f => f.r3 === false || f.calla === false), ...(opt('--filas') ? { filas } : {}) };

if (opt('--json')) { process.stdout.write(JSON.stringify(res, null, 2) + '\n'); }
else {
    const f = x => (x === null ? '  —  ' : `${String(x).padStart(5)}%`);
    const linea = (n, x) => `  ${n.padEnd(14)} ${String(x.preguntas).padStart(3)} preg.  recall@1 ${f(x.recall1)}  recall@3 ${f(x.recall3)}  abstención ${f(x.abstencion)}`;
    process.stdout.write(`Evaluación de la memoria de hechos · ${baseline ? 'BASELINE ' + baseline : `motor (umbral ${UMBRAL})`}; ${totalHechos} hechos en ${Object.keys(res.porCorpus).length} proyectos\n`);
    process.stdout.write(linea('TOTAL', total) + '\n' + linea('desarrollo', res.desarrollo) + '\n' + linea('reservada', res.reservada) + '\n\nPor corpus:\n');
    for (const [k, v] of Object.entries(res.porCorpus)) process.stdout.write(linea(k, v) + '\n');
    process.stdout.write('\nPor categoría:\n');
    for (const [k, v] of Object.entries(res.porCategoria)) process.stdout.write(linea(k, v) + '\n');
    process.stdout.write('\nPor idioma:\n');
    for (const [k, v] of Object.entries(res.porIdioma)) process.stdout.write(linea(k, v) + '\n');
    if (opt('--fallos')) {
        process.stdout.write(`\nFallos (${res.fallos.length}):\n`);
        for (const x of res.fallos) process.stdout.write(`  [${x.corpus}/${x.cat}/${x.lang}${x.reservada ? '/R' : ''}] «${x.q}» → espera ${x.espera ?? 'nada'}, sale ${x.got.join(',') || 'nada'} · ${x.top}\n`);
    }
}
if (opt('--estricto') && (total.recall3 < 90 || total.abstencion < 90)) process.exit(1);
// Mínimos de no regresión para la CI (las cifras de hoy redondeadas a la baja): --min-recall3 97 --min-abstencion 75
const minimo = n => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : null; };
for (const [n, v] of [['--min-recall3', total.recall3], ['--min-recall1', total.recall1], ['--min-abstencion', total.abstencion]]) {
    const mn = minimo(n);
    if (mn !== null && v < mn) { process.stdout.write(`\nREGRESIÓN: ${n.replace('--min-', '')} ${v}% < ${mn}%\n`); process.exit(1); }
}
