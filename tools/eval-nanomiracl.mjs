#!/usr/bin/env node
// 2.º benchmark EXTERNO (plan F8-T8): el motor y los baselines contra NanoMIRACL, el estándar de oro de recuperación
// multilingüe (jueces nativos). Pool por idioma = corpus de NanoMIRACL recortado (todos los relevantes + distractores
// hasta el tope); cada pregunta tiene uno o varios pasajes relevantes (qrels). Métrica: recall@1/@3 (todas tienen
// respuesta, no hay abstención). Mismo pool y mismas métricas para los cuatro motores = justo.
//   node tools/eval-nanomiracl.mjs [--baseline grep|bm25|embedding|motor] [--json]
// Requiere el corte: node tools/eval-externo/bajar-nanomiracl.mjs (una vez). Guarda tools/eval-externo/resultados-nanomiracl.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crearBaseline } from './eval-hechos/baselines.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const DATOS = path.join(ROOT, 'tools', '.datos', 'nanomiracl.json');
if (!fs.existsSync(DATOS)) { process.stderr.write('Falta el corte. Ejecuta: node tools/eval-externo/bajar-nanomiracl.mjs\n'); process.exit(1); }
const corte = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
const baseline = (() => { const i = args.indexOf('--baseline'); const v = i >= 0 ? args[i + 1] : null; return v && v !== 'motor' ? v : null; })();
// tope de queries por idioma (el motor hace activación por grafo: con pools grandes es caro; acotamos para que el
// benchmark corra en un tiempo razonable, deterministamente — las primeras N de cada idioma). 0 = todas.
const MAXQ = (() => { const i = args.indexOf('--maxq'); return i >= 0 ? Number(args[i + 1]) : 50; })();

const m = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'hechos.mjs')).href);
const UMBRAL = m.UMBRAL_RECUERDO;
const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-nanomiracl-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');

const filas = [];
for (const lang of corte.idiomas) {
    const g = corte.porIdioma[lang];
    if (!g) continue;
    const hechos = g.pasajes.map((p, i) => ({ id: p.id, dimension: `nota.miracl-${i}`, valor: p.text, t: i }));
    let idx = null, P = null;
    if (baseline === 'embedding') idx = await (await import('./eval-hechos/embedding.mjs')).crearBaselineEmbedding(hechos);
    else if (baseline) idx = crearBaseline(baseline, hechos, { palabras: m.palabras, palabraConPeso: m.palabraConPeso });
    else {   // motor: carga MASIVA del almacén (2000 pasajes/idioma; guardarHecho reescribe el archivo entero por llamada)
        P = path.join(base, 'proy-' + lang);
        fs.mkdirSync(path.join(P, 'senzu', 'memoria'), { recursive: true });
        fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
        const lineas = hechos.map(h => JSON.stringify({ id: h.id, dimension: h.dimension, valor: h.valor, estado: 'activo', alcance: 'proyecto', creado: new Date(T0 + h.t * 1000).toISOString() }));
        fs.writeFileSync(path.join(P, 'senzu', 'memoria', 'hechos.jsonl'), lineas.join('\n') + '\n');
    }
    const preguntas = MAXQ > 0 ? g.preguntas.slice(0, MAXQ) : g.preguntas;
    for (const q of preguntas) {
        const gold = new Set(q.gold);
        let got;
        if (idx) got = (await idx.buscar(q.q, { limite: 3 })).map(x => x.id);
        else got = m.buscarHechos(P, q.q, { historico: false, limite: 3 }).filter(x => x.puntuacion >= UMBRAL).map(x => x.hecho.id);
        filas.push({ lang, r1: gold.has(got[0]), r3: got.slice(0, 3).some(id => gold.has(id)) });
    }
}
fs.rmSync(base, { recursive: true, force: true });

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
const medir = l => ({ preguntas: l.length, recall1: pct(l.filter(f => f.r1).length, l.length), recall3: pct(l.filter(f => f.r3).length, l.length) });
const porLang = Object.fromEntries(corte.idiomas.filter(l => corte.porIdioma[l]).map(l => [l, medir(filas.filter(f => f.lang === l))]));
const total = medir(filas);
const motorNom = baseline || 'motor';
const res = { dataset: corte.dataset, revision: corte.revision, fecha: corte.fecha, tope: corte.tope, motor: motorNom, total, porIdioma: porLang };

if (opt('--json')) { process.stdout.write(JSON.stringify(res, null, 2) + '\n'); }
else {
    const f = x => (x === null ? '  —  ' : `${String(x).padStart(5)}%`);
    const linea = (n, x) => `  ${n.padEnd(10)} ${String(x.preguntas).padStart(4)} preg  recall@1 ${f(x.recall1)}  recall@3 ${f(x.recall3)}`;
    process.stdout.write(`Benchmark EXTERNO 2 · NanoMIRACL (${corte.revision.slice(0, 8)}, ${corte.fecha}) · ${baseline ? 'BASELINE ' + baseline : `motor (umbral ${UMBRAL})`}\n`);
    process.stdout.write(`  pool ${corte.tope}/idioma · ${corte.idiomas.length} idiomas · ${filas.length} queries\n`);
    process.stdout.write(linea('TOTAL', total) + '\n\nPor idioma:\n');
    for (const [k, v] of Object.entries(porLang)) process.stdout.write(linea(k, v) + '\n');
}

const SAL = path.join(ROOT, 'tools', 'eval-externo', 'resultados-nanomiracl.json');
let acc = { dataset: corte.dataset, revision: corte.revision, fecha: corte.fecha, tope: corte.tope, idiomas: corte.idiomas, motores: {} };
try { if (fs.existsSync(SAL)) { const prev = JSON.parse(fs.readFileSync(SAL, 'utf8')); if (prev.revision === corte.revision) acc = prev; } } catch {}
acc.motores[motorNom] = { total, porIdioma: porLang };
acc.generado = new Date().toISOString();
fs.writeFileSync(SAL, JSON.stringify(acc, null, 2) + '\n');
