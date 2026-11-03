#!/usr/bin/env node
// Descarga UNA vez un corte DETERMINISTA de Answerable TyDi QA (benchmark público multilingüe con preguntas CON y SIN
// respuesta) para el benchmark externo (plan F8-T7). Lee el parquet del split validation directo del CDN de HuggingFace
// (una sola petición, sin el límite del rows API) y lo parsea con hyparquet (puro JS). Guarda tools/.datos/tydiqa.json
// (gitignored). Determinista: recorre las filas en orden y toma las primeras N por idioma. Luego, el arné corre offline.
//   node tools/eval-externo/bajar-tydiqa.mjs [--ans 40] [--unans 25]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parquetReadObjects } from 'hyparquet';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(HERE, '..', '.datos', 'tydiqa.json');
const DATASET = 'copenlu/answerable_tydiqa', SPLIT = 'validation';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const N_ANS = arg('--ans', 40), N_UNANS = arg('--unans', 25);
const sinRespuesta = a => !a?.answer_text?.length || a.answer_start?.[0] === -1 || a.answer_text?.[0] === '';

// Procedencia: sha del dataset
let revision = 'desconocida';
try { revision = (await (await fetch(`https://huggingface.co/api/datasets/${DATASET}`)).json()).sha || revision; } catch {}

// Parquet del split (URL del CDN)
process.stdout.write(`Descargando el parquet de ${DATASET} (${SPLIT})…\n`);
const urls = await (await fetch(`https://huggingface.co/api/datasets/${DATASET}/parquet/default/${SPLIT}`)).json();
const buf = await (await fetch(urls[0])).arrayBuffer();
const file = { byteLength: buf.byteLength, slice: (s, e) => buf.slice(s, e) };
const rows = await parquetReadObjects({ file });
process.stdout.write(`  ${rows.length} filas en el parquet; tomando ${N_ANS} con respuesta y ${N_UNANS} sin respuesta por idioma…\n`);

const porIdioma = new Map();
for (const row of rows) {
    const lang = row.language;
    if (!porIdioma.has(lang)) porIdioma.set(lang, { ans: [], unans: [] });
    const b = porIdioma.get(lang);
    const pasaje = (row.document_plaintext || '').trim();
    if (!pasaje) continue;
    if (sinRespuesta(row.annotations)) {
        if (b.unans.length < N_UNANS) b.unans.push({ q: row.question_text, passage: pasaje });
    } else if (b.ans.length < N_ANS) {
        b.ans.push({ q: row.question_text, passage: pasaje, answer: row.annotations.answer_text[0] });
    }
}

const filas = [];
for (const [lang, b] of porIdioma) {
    for (const r of b.ans) filas.push({ lang, q: r.q, passage: r.passage, answerable: true, answer: r.answer });
    for (const r of b.unans) filas.push({ lang, q: r.q, passage: r.passage, answerable: false });
}
const salida = { dataset: DATASET, split: SPLIT, revision, fecha: new Date().toISOString().slice(0, 10),
    objetivoPorIdioma: { ans: N_ANS, unans: N_UNANS }, idiomas: [...porIdioma.keys()].sort(), filas };

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 0) + '\n');
const resumen = [...porIdioma.entries()].map(([l, b]) => `${l} ${b.ans.length}/${b.unans.length}`).join(', ');
process.stdout.write(`Guardado ${DESTINO}\n  ${filas.length} filas · ${porIdioma.size} idiomas (ans/unans): ${resumen}\n  revisión ${revision.slice(0, 12)}\n`);
