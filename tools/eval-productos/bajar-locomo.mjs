#!/usr/bin/env node
// Descarga UNA vez el dataset oficial LoCoMo (10 conversaciones muy largas con QA con evidencia, resúmenes de evento y
// observaciones) para el cara a cara contra productos de memoria (plan F8-T9). Fichero JSON plano del repo oficial en
// GitHub (snap-research/locomo, data/locomo10.json, ~2,7 MB). Licencia CC BY-NC 4.0 (solo uso NO comercial; la evaluación
// entra). Guarda tools/.datos/locomo.json (gitignored) con procedencia (commit del repo). Luego el arné corre offline.
//   node tools/eval-productos/bajar-locomo.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = path.join(HERE, '..', '.datos', 'locomo.json');
const REPO = 'snap-research/locomo', RUTA = 'data/locomo10.json', RAMA = 'main';
const URL = `https://raw.githubusercontent.com/${REPO}/${RAMA}/${RUTA}`;

// Procedencia: último commit que tocó el fichero
let commit = 'desconocido';
try {
    const api = `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(RUTA)}&per_page=1`;
    const j = await (await fetch(api, { headers: { 'User-Agent': 'senzu-eval' } })).json();
    commit = j?.[0]?.sha || commit;
} catch {}

process.stdout.write(`Descargando LoCoMo de ${REPO}/${RUTA}…\n`);
const datos = await (await fetch(URL)).json();
if (!Array.isArray(datos)) throw new Error('Formato inesperado: se esperaba un array de muestras');
const salida = {
    dataset: 'snap-research/locomo', fichero: RUTA, commit, licencia: 'CC BY-NC 4.0',
    fecha: new Date().toISOString().slice(0, 10), muestras: datos.length, datos,
};

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, JSON.stringify(salida, null, 0) + '\n');
process.stdout.write(`Guardado ${DESTINO}\n  ${datos.length} muestras · commit ${commit.slice(0, 12)}\n`);
