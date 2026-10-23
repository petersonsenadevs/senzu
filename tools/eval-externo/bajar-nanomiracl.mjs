#!/usr/bin/env node
// Descarga UNA vez un corte DETERMINISTA de NanoMIRACL (estándar de oro de recuperación multilingüe, jueces nativos)
// para el 2.º benchmark externo (plan F8-T8). Lee los parquet (corpus/queries/qrels) del CDN de HuggingFace con
// hyparquet (puro JS). Guarda tools/.datos/nanomiracl.json (gitignored).
//   node tools/eval-externo/bajar-nanomiracl.mjs [--tope 2000] [--idiomas ar,en,es,fr,ja,ru]
// Pool por idioma = TODOS los pasajes relevantes (qrels) de sus queries + distractores hasta el tope (determinista,
// en el orden del corpus). Es un pool REDUCIDO (no el leaderboard oficial); mismo pool para los 4 motores = justo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquetReadObjects } from 'hyparquet';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(HERE, '..', '.datos', 'nanomiracl.json');
const DATASET = 'hakari-bench/NanoMIRACL';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const TOPE = Number(arg('--tope', '1000'));
const IDIOMAS = arg('--idiomas', 'ar,en,es,fr,ja,ru').split(',');

const load = async (cfg, lang) => {
    const urls = await (await fetch(`https://huggingface.co/api/datasets/${DATASET}/parquet/${cfg}/${lang}`)).json();
    const buf = await (await fetch(urls[0])).arrayBuffer();
    return parquetReadObjects({ file: { byteLength: buf.byteLength, slice: (s, e) => buf.slice(s, e) } });
};

let revision = 'desconocida';
try { revision = (await (await fetch(`https://huggingface.co/api/datasets/${DATASET}`)).json()).sha || revision; } catch {}

const porIdioma = {};
for (const lang of IDIOMAS) {
    process.stdout.write(`${lang}: descargando corpus/queries/qrels…\n`);
    const [corpus, queries, qrels] = await Promise.all([load('corpus', lang), load('queries', lang), load('qrels', lang)]);
    const gold = new Map();   // query-id -> Set(corpus-id relevantes)
    for (const r of qrels) { const q = r['query-id'], c = r['corpus-id']; if (!gold.has(q)) gold.set(q, new Set()); gold.get(q).add(c); }
    // pool: todos los relevantes de las queries + distractores hasta el tope (orden del corpus = determinista)
    const relevantes = new Set(); for (const s of gold.values()) for (const c of s) relevantes.add(c);
    const pool = new Map();
    for (const d of corpus) if (relevantes.has(d._id)) pool.set(d._id, d.text);        // primero los relevantes (que no falten)
    for (const d of corpus) { if (pool.size >= TOPE) break; if (!pool.has(d._id)) pool.set(d._id, d.text); }   // luego distractores
    const pasajes = [...pool.entries()].map(([id, text]) => ({ id, text }));
    const preguntas = queries
        .map(q => ({ id: q._id, q: q.text, gold: [...(gold.get(q._id) || [])].filter(c => pool.has(c)) }))
        .filter(q => q.gold.length);   // solo queries con su relevante dentro del pool
    porIdioma[lang] = { pasajes, preguntas };
    process.stdout.write(`   pool ${pasajes.length} pasajes (${relevantes.size} relevantes), ${preguntas.length} queries\n`);
}

const salida = { dataset: DATASET, revision, fecha: new Date().toISOString().slice(0, 10), tope: TOPE, idiomas: IDIOMAS, porIdioma };
fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, JSON.stringify(salida) + '\n');
const tot = Object.values(porIdioma).reduce((s, g) => s + g.preguntas.length, 0);
process.stdout.write(`\nGuardado ${DESTINO}\n  ${IDIOMAS.length} idiomas · ${tot} queries · tope ${TOPE}/idioma · revisión ${revision.slice(0, 12)}\n`);
