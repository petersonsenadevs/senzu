#!/usr/bin/env node
// Evaluación MEDIDA de la memoria de hechos (plan de Hemispheric, F4-T1): ¿recuerda lo que tiene que recordar, en
// cualquier idioma, y calla cuando no sabe? Corpus en tools/eval-hechos/corpus.json (hechos como los guardaría el
// agente y preguntas en 12 idiomas y 6 escrituras). Mide lo que se INYECTARÍA: resultados por encima del umbral del
// recuerdo vivo (UMBRAL_RECUERDO).
//   recall@1 / recall@3: con respuesta, el hecho esperado sale el primero / entre los 3 primeros
//   abstención: sin respuesta (o no vigente), no sale nada por encima del umbral
//   node tools/eval-hechos.mjs [--fallos] [--json] [--estricto] [--solo desarrollo|reservada]
// --estricto sale con 1 si no llega a los objetivos (recall@3 ≥ 90 % y abstención ≥ 90 %).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const solo = (() => { const i = args.indexOf('--solo'); return i >= 0 ? args[i + 1] : null; })();
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-eval-hechos-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const m = await import(pathToFileURL(path.join(process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks'), 'hechos.mjs')).href);
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'eval-hechos', 'corpus.json'), 'utf8'));

// el proyecto, con los hechos guardados en su orden (t), como en la vida real
const P = path.join(base, 'proyecto');
fs.mkdirSync(path.join(P, 'senzu'), { recursive: true });
fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);
const ids = new Map();
for (const h of [...corpus.hechos].sort((a, b) => a.t - b.t)) {
    const r = m.guardarHecho(P, { dimension: h.dimension, valor: h.valor, texto: h.texto, claves: h.claves, alcance: h.alcance, idioma: h.idioma, duda: h.duda, desde: h.desde, hasta: h.hasta, enlaces: h.enlaces },
        { ahora: new Date(T0 + h.t * 1000).toISOString() });
    ids.set(r.hecho.id, h.id);
}

const UMBRAL = m.UMBRAL_RECUERDO;
const filas = [];
for (const q of corpus.preguntas) {
    if (solo === 'desarrollo' && q.reservada) continue;
    if (solo === 'reservada' && !q.reservada) continue;
    const hits = m.buscarHechos(P, q.q, { historico: !!q.historico, limite: 3 }).filter(x => x.puntuacion >= UMBRAL);
    const got = hits.map(x => ids.get(x.hecho.id));
    const conRespuesta = q.espera !== null;
    filas.push({ ...q, got, top: hits[0] ? `${ids.get(hits[0].hecho.id)} (${hits[0].puntuacion}; ${hits[0].motivo})` : '—',
        r1: conRespuesta ? got[0] === q.espera : null, r3: conRespuesta ? got.includes(q.espera) : null, calla: conRespuesta ? null : got.length === 0 });
}
fs.rmSync(base, { recursive: true, force: true });

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
function medir(l) {
    const con = l.filter(f => f.espera !== null), sin = l.filter(f => f.espera === null);
    return { preguntas: l.length, conRespuesta: con.length, sinRespuesta: sin.length,
        recall1: pct(con.filter(f => f.r1).length, con.length), recall3: pct(con.filter(f => f.r3).length, con.length), abstencion: pct(sin.filter(f => f.calla).length, sin.length) };
}
const agrupar = clave => Object.fromEntries([...new Set(filas.map(f => f[clave]))].sort().map(k => [k, medir(filas.filter(f => f[clave] === k))]));
const total = medir(filas);
const res = { umbral: UMBRAL, total, desarrollo: medir(filas.filter(f => !f.reservada)), reservada: medir(filas.filter(f => f.reservada)),
    porCategoria: agrupar('cat'), porIdioma: agrupar('lang'), fallos: filas.filter(f => f.r3 === false || f.calla === false) };

if (opt('--json')) { process.stdout.write(JSON.stringify(res, null, 2) + '\n'); }
else {
    const f = x => (x === null ? '  —  ' : `${String(x).padStart(5)}%`);
    const linea = (n, x) => `  ${n.padEnd(14)} ${String(x.preguntas).padStart(3)} preg.  recall@1 ${f(x.recall1)}  recall@3 ${f(x.recall3)}  abstención ${f(x.abstencion)}`;
    process.stdout.write(`Evaluación de la memoria de hechos (umbral ${UMBRAL}; ${corpus.hechos.length} hechos)\n`);
    process.stdout.write(linea('TOTAL', total) + '\n' + linea('desarrollo', res.desarrollo) + '\n' + linea('reservada', res.reservada) + '\n\nPor categoría:\n');
    for (const [k, v] of Object.entries(res.porCategoria)) process.stdout.write(linea(k, v) + '\n');
    process.stdout.write('\nPor idioma:\n');
    for (const [k, v] of Object.entries(res.porIdioma)) process.stdout.write(linea(k, v) + '\n');
    if (opt('--fallos')) {
        process.stdout.write(`\nFallos (${res.fallos.length}):\n`);
        for (const x of res.fallos) process.stdout.write(`  [${x.cat}/${x.lang}${x.reservada ? '/R' : ''}] «${x.q}» → espera ${x.espera ?? 'nada'}, sale ${x.got.join(',') || 'nada'} · ${x.top}\n`);
    }
}
if (opt('--estricto') && (total.recall3 < 90 || total.abstencion < 90)) process.exit(1);
// Mínimos de no regresión para la CI (las cifras de hoy redondeadas a la baja): --min-recall3 97 --min-abstencion 75
const minimo = n => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : null; };
for (const [n, v] of [['--min-recall3', total.recall3], ['--min-recall1', total.recall1], ['--min-abstencion', total.abstencion]]) {
    const mn = minimo(n);
    if (mn !== null && v < mn) { process.stdout.write(`\nREGRESIÓN: ${n.replace('--min-', '')} ${v}% < ${mn}%\n`); process.exit(1); }
}
