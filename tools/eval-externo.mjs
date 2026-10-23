#!/usr/bin/env node
// Benchmark EXTERNO de la memoria (plan F8-T7): el motor y los baselines medidos contra un corpus público reconocido,
// Answerable TyDi QA (multilingüe, con preguntas CON y SIN respuesta). No es nuestro corpus: es el rasero de un tercero.
//   Montaje: cada pasaje del dataset es un «hecho»; por idioma, una memoria con todos sus pasajes.
//     answerable → el motor debe traer SU pasaje (recall@1/@3);  unanswerable → debe abstenerse.
//   Mismo input y mismas métricas para los cuatro motores (motor|embedding|bm25|grep): comparación justa.
//   node tools/eval-externo.mjs [--baseline grep|bm25|embedding|motor] [--json]
// Requiere el corte: node tools/eval-externo/bajar-tydiqa.mjs (una vez). Guarda tools/eval-externo/resultados.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crearBaseline } from './eval-hechos/baselines.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const DATOS = path.join(ROOT, 'tools', '.datos', 'tydiqa.json');
if (!fs.existsSync(DATOS)) { process.stderr.write('Falta el corte. Ejecuta: node tools/eval-externo/bajar-tydiqa.mjs\n'); process.exit(1); }
const corte = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
const baseline = (() => { const i = args.indexOf('--baseline'); const v = i >= 0 ? args[i + 1] : null; return v && v !== 'motor' ? v : null; })();

const m = await import(pathToFileURL(path.join(process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks'), 'hechos.mjs')).href);
const UMBRAL = m.UMBRAL_RECUERDO;
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-eval-externo-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);

// Por idioma: memoria = pasajes únicos (dedup por texto); cada answerable apunta al id de su pasaje; unanswerable → nada.
const porIdioma = new Map();
for (const f of corte.filas) {
    if (!porIdioma.has(f.lang)) porIdioma.set(f.lang, { pasajes: new Map(), preguntas: [] });
    const g = porIdioma.get(f.lang);
    if (!g.pasajes.has(f.passage)) g.pasajes.set(f.passage, `p${g.pasajes.size}`);
    g.preguntas.push({ q: f.q, answerable: f.answerable, gold: g.pasajes.get(f.passage) });
}

const filas = [];
for (const [lang, g] of porIdioma) {
    const hechos = [...g.pasajes.entries()].map(([texto, id], i) => ({ id, dimension: `nota.tydiqa-${i}`, valor: texto, t: i }));
    // índice del baseline (léxico o embedding), o la memoria del motor en un proyecto propio por idioma
    let idx = null, P = null, idMotor = null;
    if (baseline === 'embedding') idx = await (await import('./eval-hechos/embedding.mjs')).crearBaselineEmbedding(hechos);
    else if (baseline) idx = crearBaseline(baseline, hechos, { palabras: m.palabras, palabraConPeso: m.palabraConPeso });
    else {
        P = path.join(base, 'proyecto-' + lang);
        fs.mkdirSync(path.join(P, 'senzu'), { recursive: true });
        fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
        process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario-' + lang, 'memoria.md');
        idMotor = new Map();   // el motor genera su propio id; lo mapeamos al id del pasaje (como eval-hechos)
        for (const h of hechos) { const r = m.guardarHecho(P, { dimension: h.dimension, valor: h.valor }, { ahora: new Date(T0 + h.t * 1000).toISOString() }); idMotor.set(r.hecho.id, h.id); }
    }
    for (const q of g.preguntas) {
        let got;
        if (idx) got = (await idx.buscar(q.q, { limite: 3 })).map(x => x.id);
        else got = m.buscarHechos(P, q.q, { historico: false, limite: 3 }).filter(x => x.puntuacion >= UMBRAL).map(x => idMotor.get(x.hecho.id));
        filas.push({ lang, answerable: q.answerable,
            r1: q.answerable ? got[0] === q.gold : null, r3: q.answerable ? got.includes(q.gold) : null,
            calla: q.answerable ? null : got.length === 0 });
    }
}
fs.rmSync(base, { recursive: true, force: true });

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
function medir(l) {
    const con = l.filter(f => f.answerable), sin = l.filter(f => !f.answerable);
    return { preguntas: l.length, conRespuesta: con.length, sinRespuesta: sin.length,
        recall1: pct(con.filter(f => f.r1).length, con.length), recall3: pct(con.filter(f => f.r3).length, con.length),
        abstencion: pct(sin.filter(f => f.calla).length, sin.length) };
}
const porLang = Object.fromEntries([...porIdioma.keys()].sort().map(k => [k, medir(filas.filter(f => f.lang === k))]));
const total = medir(filas);
const motorNom = baseline || 'motor';
const res = { dataset: corte.dataset, split: corte.split, revision: corte.revision, fecha: corte.fecha,
    corte: corte.objetivoPorIdioma, motor: motorNom, umbral: baseline === 'embedding' ? undefined : (baseline ? undefined : UMBRAL),
    total, porIdioma: porLang };

if (opt('--json')) { process.stdout.write(JSON.stringify(res, null, 2) + '\n'); }
else {
    const f = x => (x === null ? '  —  ' : `${String(x).padStart(5)}%`);
    const linea = (n, x) => `  ${n.padEnd(12)} ${String(x.preguntas).padStart(3)} preg (${x.conRespuesta}✓/${x.sinRespuesta}∅)  recall@1 ${f(x.recall1)}  recall@3 ${f(x.recall3)}  abstención ${f(x.abstencion)}`;
    process.stdout.write(`Benchmark EXTERNO · Answerable TyDi QA (${corte.revision.slice(0, 8)}, ${corte.fecha}) · ${baseline ? 'BASELINE ' + baseline : `motor (umbral ${UMBRAL})`}\n`);
    process.stdout.write(`  ${corte.filas.length} preguntas, ${porIdioma.size} idiomas (${corte.objetivoPorIdioma.ans} con / ${corte.objetivoPorIdioma.unans} sin respuesta por idioma)\n`);
    process.stdout.write(linea('TOTAL', total) + '\n\nPor idioma:\n');
    for (const [k, v] of Object.entries(porLang)) process.stdout.write(linea(k, v) + '\n');
}

// Guardar DATOS REALES (acumula los motores ya corridos en un único resultados.json con su procedencia)
const SAL = path.join(ROOT, 'tools', 'eval-externo', 'resultados.json');
let acc = { dataset: corte.dataset, split: corte.split, revision: corte.revision, fecha: corte.fecha, corte: corte.objetivoPorIdioma, motores: {} };
try { if (fs.existsSync(SAL)) { const prev = JSON.parse(fs.readFileSync(SAL, 'utf8')); if (prev.revision === corte.revision) acc = prev; } } catch {}
acc.motores[motorNom] = { total, porIdioma: porLang };
acc.generado = new Date().toISOString();
fs.writeFileSync(SAL, JSON.stringify(acc, null, 2) + '\n');
