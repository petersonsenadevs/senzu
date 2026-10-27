#!/usr/bin/env node
// Descarga UNA vez LongMemEval (variante _s: 500 preguntas, haystacks de sesiones ~115k tokens; los ids que acaban en
// _abs son preguntas de abstención) para el cara a cara contra productos de memoria (plan F8-T9). Fichero JSON del repo
// oficial "cleaned" en HuggingFace (xiaowu0162/longmemeval-cleaned, longmemeval_s_cleaned.json, ~264 MB). Lo escribe por
// streaming a disco para no cargarlo entero en memoria. Guarda tools/.datos/longmemeval-s.json (gitignored) y, aparte,
// la procedencia en longmemeval-s.meta.json. Luego el arné corre offline.
//   node tools/eval-productos/bajar-longmemeval.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(HERE, '..', '.datos', 'longmemeval-s.json');
const META = path.join(HERE, '..', '.datos', 'longmemeval-s.meta.json');
const DATASET = 'xiaowu0162/longmemeval-cleaned', FICHERO = 'longmemeval_s_cleaned.json';
const URL = `https://huggingface.co/datasets/${DATASET}/resolve/main/${FICHERO}`;

// Procedencia: sha del dataset
let revision = 'desconocida';
try { revision = (await (await fetch(`https://huggingface.co/api/datasets/${DATASET}`)).json()).sha || revision; } catch {}

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
process.stdout.write(`Descargando LongMemEval de ${DATASET}/${FICHERO} (~264 MB, por streaming)…\n`);
const res = await fetch(URL);
if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${URL}`);
await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(DESTINO));

const bytes = fs.statSync(DESTINO).size;
fs.writeFileSync(META, JSON.stringify({
    dataset: DATASET, fichero: FICHERO, revision, fecha: new Date().toISOString().slice(0, 10), bytes,
}, null, 0) + '\n');
process.stdout.write(`Guardado ${DESTINO}\n  ${(bytes / 1e6).toFixed(1)} MB · revisión ${revision.slice(0, 12)}\n`);
