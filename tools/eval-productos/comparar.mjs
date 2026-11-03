#!/usr/bin/env node
// Tabla del cara a cara (plan F8-T9): motor vs embedding vs mem0 (y lo que haya) sobre las MISMAS preguntas. Toma los
// ficheros de resultados end-to-end y compara SOLO los ids que estan en TODOS (asi es justo aunque mem0 vaya a medias:
// se compara sobre el subconjunto comun). Acierto global y por tipo, con el tamano de la muestra.
//   node tools/eval-productos/comparar.mjs                     # usa los tres de LoCoMo por defecto
//   node tools/eval-productos/comparar.mjs a.json b.json ...   # los ficheros que se indiquen

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const FICHEROS = args.length ? args : [
    'resultados-e2e-locomo-motor-llm.json',
    'resultados-e2e-locomo-embedding-llm.json',
    'resultados-e2e-locomo-mem0.json',
];

const motores = [];
for (const f of FICHEROS) {
    const ruta = path.isAbsolute(f) ? f : path.join(HERE, f);
    if (!fs.existsSync(ruta)) { process.stdout.write(`(falta ${path.basename(ruta)} — aún no)\n`); continue; }
    const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    const nombre = j.retriever || path.basename(ruta).replace(/\.json$/, '');
    const hechos = Object.fromEntries(Object.entries(j.hechos || {}).filter(([, h]) => !h.seco));
    motores.push({ nombre, hechos });
}
if (motores.length < 2) { process.stdout.write('Hacen falta al menos 2 ficheros con resultados.\n'); process.exit(1); }

// ids comunes a TODOS (el que va a medias — mem0 — manda el tamaño de la muestra)
let comunes = Object.keys(motores[0].hechos);
for (const m of motores.slice(1)) { const s = new Set(Object.keys(m.hechos)); comunes = comunes.filter(id => s.has(id)); }
if (!comunes.length) { process.stdout.write('Todavía no hay preguntas comunes (mem0 aún no ha contestado ninguna).\n'); process.exit(0); }

const tipoDe = id => motores[0].hechos[id].tipo;
const tipos = [...new Set(comunes.map(tipoDe))].sort();
const pct = (m, ids) => ids.length ? Math.round(1000 * ids.filter(id => m.hechos[id]?.correcto).length / ids.length) / 10 : null;

process.stdout.write(`\nCara a cara end-to-end · muestra común: ${comunes.length} preguntas (las que mem0 ya ha hecho)\n\n`);
const pad = (s, n) => String(s).padStart(n);
const col = 11;
process.stdout.write('  ' + 'tipo'.padEnd(22) + motores.map(m => pad(m.nombre, col)).join('') + '\n');
for (const t of tipos) {
    const ids = comunes.filter(id => tipoDe(id) === t);
    process.stdout.write('  ' + `${t} (${ids.length})`.padEnd(22) + motores.map(m => pad((pct(m, ids) ?? '—') + '%', col)).join('') + '\n');
}
process.stdout.write('  ' + '─'.repeat(22 + col * motores.length) + '\n');
process.stdout.write('  ' + 'GLOBAL'.padEnd(22) + motores.map(m => pad((pct(m, comunes) ?? '—') + '%', col)).join('') + '\n');
process.stdout.write('\n  Mismas preguntas para todos · juez local Qwen3 · 0 € · ingesta con LLM (Qwen3)\n');
