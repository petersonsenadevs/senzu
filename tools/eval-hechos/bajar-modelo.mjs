#!/usr/bin/env node
// Descarga UNA vez el modelo multilingüe del benchmark (F8) a tools/.models (gitignored). Después, el baseline
// embedding corre sin red. Requiere las deps aisladas: npm install --prefix tools (ver tools/package.json).
//   node tools/eval-hechos/bajar-modelo.mjs

import { crearBaselineEmbedding } from './embedding.mjs';

process.stdout.write('Descargando/cacheando el modelo de embeddings (una sola vez)…\n');
const t0 = Date.now();
const idx = await crearBaselineEmbedding([{ id: 'x', dimension: 'prueba.modelo', valor: 'una frase de prueba' }]);
await idx.buscar('prueba');   // fuerza una pasada completa (modelo + tokenizador)
process.stdout.write(`Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s. Modelo en tools/.models.\n`);
process.stdout.write('Ahora: node tools/eval-hechos.mjs --baseline embedding\n');
