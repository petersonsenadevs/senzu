#!/usr/bin/env node
// Re-juez del cara a cara (plan F8-T9): vuelve a puntuar respuestas YA guardadas contra el oro actual, SIN re-contestar.
// Para dos cosas: (a) corregir veredictos tras arreglar el oro (p. ej. cat5 de LoCoMo, que usa adversarial_answer), y
// (b) VALIDAR el juez local contra otro modelo (GPT-4o) barato, sin repetir el contestador (--juez-proveedor openai).
// Reutiliza las respuestas `predicha` del fichero de resultados; solo re-ejecuta el juez. Determinista (temp 0 + seed).
//   node tools/eval-productos/rejuzgar.mjs --salida resultados-e2e-locomo-motor-llm.json           # re-juzga lo que cambió de oro
//   node ... --salida <f.json> --todo                                                               # re-juzga TODO
//   node ... --salida <f.json> --solo-tipo locomo-cat5                                              # solo un tipo
//   node ... --salida <f.json> --juez-proveedor openai --juez-modelo gpt-4o --limite 80            # validar juez vs GPT-4o (~1 $)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarLocomo, cargarLongmemeval } from './loader.mjs';
import { juzgar, esAbstencion } from './juez.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const SALIDA = val('--salida', null);
if (!SALIDA) { process.stdout.write('Falta --salida <fichero de resultados.json>\n'); process.exit(2); }
const RUTA = path.isAbsolute(SALIDA) ? SALIDA : path.join(HERE, SALIDA);
const DATASET = opt('--longmemeval') ? 'longmemeval' : 'locomo';
const JUEZ_PROV = val('--juez-proveedor', null);
const JUEZ_MODELO = val('--juez-modelo', null);
const TODO = opt('--todo');
const SOLO_TIPO = val('--solo-tipo', null);
const LIMITE = Number(val('--limite', 0)) || 0;
const TOPE = Number(val('--tope-gasto', 2));

const estado = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const ds = DATASET === 'longmemeval' ? await cargarLongmemeval({}) : cargarLocomo();
const porId = new Map(ds.items.map(it => [it.id, it]));

let rejuzgadas = 0, gasto = 0, cortado = false;
process.stdout.write(`\nRe-juez · ${path.basename(RUTA)} · dataset ${DATASET} · juez ${JUEZ_MODELO ? (JUEZ_PROV || 'openai') + ':' + JUEZ_MODELO : 'local'}${TODO ? ' · TODO' : SOLO_TIPO ? ' · ' + SOLO_TIPO : ' · solo oro cambiado'}\n`);

for (const [id, h] of Object.entries(estado.hechos)) {
    if (h.seco) continue;
    const it = porId.get(id);
    if (!it) continue;
    const oroNuevo = it.respuesta;
    const cambioOro = (oroNuevo || '') !== (h.oro || '');
    const toca = TODO || (SOLO_TIPO ? h.tipo === SOLO_TIPO : cambioOro);
    if (!toca) continue;
    if (LIMITE && rejuzgadas >= LIMITE) break;
    if (gasto >= TOPE) { process.stdout.write(`\n⛔ Tope $${TOPE} alcanzado; paro y guardo.\n`); cortado = true; break; }
    h.oro = oroNuevo;                                   // fija el oro corregido en el fichero
    if (it.abstencion) { h.correcto = esAbstencion(h.predicha); h.juez = null; }
    else {
        const j = await juzgar(it.pregunta, oroNuevo, h.predicha, { proveedor: JUEZ_PROV, modelo: JUEZ_MODELO });
        h.correcto = j.correcto; h.juez = j.texto; gasto += j.coste || 0;
    }
    h.rejuez = JUEZ_MODELO ? (JUEZ_PROV || 'openai') + ':' + JUEZ_MODELO : 'local';
    rejuzgadas++;
    if (rejuzgadas % 25 === 0) { fs.writeFileSync(RUTA, JSON.stringify(estado, null, 2) + '\n'); process.stdout.write(`  re-juzgadas ${rejuzgadas} · gasto $${gasto.toFixed(4)}\r`); }
}
fs.writeFileSync(RUTA, JSON.stringify(estado, null, 2) + '\n');

// --- informe tras el re-juez ---
const filas = Object.values(estado.hechos).filter(h => !h.seco);
const pct = l => l.length ? Math.round(1000 * l.filter(h => h.correcto).length / l.length) / 10 : 0;
const tipos = {};
for (const h of filas) { (tipos[h.tipo] ||= []).push(h); }
process.stdout.write(`\n\nRe-juzgadas: ${rejuzgadas}${cortado ? ' (cortado por tope)' : ''} · gasto $${gasto.toFixed(4)}\n`);
process.stdout.write(`Acierto global: ${pct(filas)}%  (${filas.filter(h => h.correcto).length}/${filas.length})\n`);
for (const [k, l] of Object.entries(tipos).sort()) process.stdout.write(`  ${k.padEnd(28)} ${String(pct(l)).padStart(5)}%  (${l.filter(h => h.correcto).length}/${l.length})\n`);
process.stdout.write(`Guardado en ${path.basename(RUTA)}\n`);
