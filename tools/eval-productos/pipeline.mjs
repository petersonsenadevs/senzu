#!/usr/bin/env node
// Pipeline END-TO-END del cara a cara contra productos de memoria (plan F8-T9, Fase 2). El comparador JUSTO frente a
// mem0/Zep/Letta: para cada pregunta, recupera del haystack los turnos más relevantes, un LLM contesta SOLO con ese
// contexto, y un LLM-juez decide si la respuesta casa con la de referencia (igual que los scorers de LoCoMo/LongMemEval).
// Todo LOCAL por defecto (Qwen3-8B vía Ollama, 0 red/0 €); el juez se puede validar contra GPT-4o por llamada.
// Garantías del plan para que salga a la primera:
//   - TOPE DE GASTO DURO (--tope-gasto $): antes de cada llamada se comprueba el acumulado; si se pasa, para y guarda.
//   - CHECKPOINTS REANABLES (--salida): cada pregunta resuelta se persiste; al relanzar, se saltan las ya hechas.
//   - DETERMINISMO: temperatura 0 + seed fija en llm.mjs; el modelo se clava por nombre (Ollama lo fija por digest).
//   - --dry: ejecuta recuperación + armado de contexto SIN tocar el LLM (verifica el cableado offline, sin Ollama).
// Uso:
//   node tools/eval-productos/pipeline.mjs --locomo --dry --limite 5          # verificación offline (sin Ollama)
//   node tools/eval-productos/pipeline.mjs --locomo --retriever motor --topk 10 --tope-gasto 2
//   node tools/eval-productos/pipeline.mjs --locomo --limite 80 --juez-proveedor openai --juez-modelo gpt-4o  # validar juez

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarLocomo, cargarLongmemeval } from './loader.mjs';
import { recuperadorEmbedding, recuperadorMotor } from './recuperar.mjs';
import { memoriasDeConversacion } from './ingesta.mjs';
import { juzgar, esAbstencion } from './juez.mjs';
import { chat } from './llm.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const DATASET = opt('--longmemeval') ? 'longmemeval' : 'locomo';
const LIMITE = Number(val('--limite', 0)) || 0;
const RETR = val('--retriever', 'motor');            // motor (nuestro) | embedding (e5-small)
const INGESTA = val('--ingesta', 'crudo');           // crudo (turnos tal cual) | llm (Qwen3 extrae hechos, como los productos)
const TOPK = Number(val('--topk', 10));              // turnos que entran en el contexto del contestador
const TOPE = Number(val('--tope-gasto', 2));         // $ máximos; se corta en seco al superarlo
const DRY = opt('--dry');
const JUEZ_PROV = val('--juez-proveedor', null);     // override del juez (p. ej. openai) sin tocar el contestador
const JUEZ_MODELO = val('--juez-modelo', null);
const SALIDA = val('--salida', path.join(HERE, `resultados-e2e-${DATASET}-${RETR}-${INGESTA}.json`));

// --- checkpoint reanudable ---
let estado = { dataset: DATASET, retriever: RETR, ingesta: INGESTA, topk: TOPK, juez: JUEZ_MODELO || 'local', inicio: new Date().toISOString(), hechos: {} };
if (fs.existsSync(SALIDA)) { try { const p = JSON.parse(fs.readFileSync(SALIDA, 'utf8')); if (p.dataset === DATASET && p.retriever === RETR && (p.ingesta || 'crudo') === INGESTA) estado = p; } catch { /* checkpoint corrupto: se reinicia */ } }
const guardar = () => fs.writeFileSync(SALIDA, JSON.stringify(estado, null, 2) + '\n');

// --- contexto a partir de los turnos recuperados (en orden de ranking) ---
function armarContexto(tids, porTid) {
    return tids.map(t => porTid.get(t)).filter(Boolean)
        .map(t => `${t.fecha ? '[' + t.fecha + '] ' : ''}${t.hablante ? t.hablante + ': ' : ''}${t.texto}`).join('\n');
}

const SIS_CONTESTAR = 'You are a precise assistant. Answer the question using ONLY the conversation excerpts provided. '
    + 'Be concise: a few words or one short sentence. If the answer is not in the excerpts, reply exactly: I don\'t know.';

async function contestarPregunta(ctx, pregunta) {
    return chat({ rol: 'respuesta', sistema: SIS_CONTESTAR, maxTokens: 128,
        usuario: `Conversation excerpts:\n${ctx}\n\nQuestion: ${pregunta}\nAnswer:` });
}

// --- carga del dataset y agrupado por haystack (ingiere una vez por conversación, consulta todas sus preguntas) ---
const ds = DATASET === 'longmemeval' ? await cargarLongmemeval({ limite: LIMITE || Infinity }) : cargarLocomo();
const porHay = new Map();
for (const it of ds.items) { if (!porHay.has(it.haystack)) porHay.set(it.haystack, []); porHay.get(it.haystack).push(it); }

let gasto = Object.values(estado.hechos).reduce((s, h) => s + (h.coste || 0), 0);
let hechos = Object.keys(estado.hechos).length;
let cortado = false;
process.stdout.write(`\nPipeline end-to-end · ${DATASET} · ingesta ${INGESTA} · retriever ${RETR} · top-${TOPK}${DRY ? ' · DRY (sin LLM)' : ` · tope $${TOPE} · juez ${JUEZ_MODELO ? (JUEZ_PROV || 'openai') + ':' + JUEZ_MODELO : 'local'}`}\n`);
if (hechos) process.stdout.write(`Reanudando: ${hechos} preguntas ya resueltas (gasto previo $${gasto.toFixed(4)})\n`);

for (const [hid, items] of porHay) {
    if (cortado) break;
    const pendientes = items.filter(it => !estado.hechos[it.id] && (!LIMITE || hechos < LIMITE));
    if (!pendientes.length) continue;
    let unidades;                                     // la "memoria" sobre la que se recupera: hechos extraídos o turnos crudos
    if (INGESTA === 'llm') { const mem = await memoriasDeConversacion(DATASET, hid, ds.haystacks[hid].sessions); unidades = mem.memorias; gasto += mem.coste || 0; }
    else { unidades = ds.haystacks[hid].sessions.flatMap(s => s.turnos.map(t => ({ ...t, fecha: s.fecha }))); }
    const porTid = new Map(unidades.map(t => [t.tid, t]));
    const idx = RETR === 'embedding' ? await recuperadorEmbedding(unidades) : recuperadorMotor(unidades);
    for (const it of items) {
        if (LIMITE && hechos >= LIMITE) { cortado = true; break; }
        if (estado.hechos[it.id]) continue;              // ya resuelta en una tirada anterior
        const t0 = performance.now();
        const tids = await idx.buscar(it.pregunta, TOPK);
        const ctx = armarContexto(tids, porTid);
        if (DRY) {                                        // offline: solo cableado, sin LLM
            estado.hechos[it.id] = { tipo: it.tipo, seco: true, recuperados: tids.length, ctxChars: ctx.length, coste: 0 };
            hechos++; continue;
        }
        if (gasto >= TOPE) {                              // tope de gasto duro: parar antes de gastar más
            process.stdout.write(`\n⛔ Tope de gasto $${TOPE} alcanzado (gasto $${gasto.toFixed(4)}). Paro y guardo; relanza para continuar.\n`);
            cortado = true; break;
        }
        const resp = await contestarPregunta(ctx, it.pregunta);
        const predicha = (resp.texto || '').trim();
        let correcto, juezTxt = null, costeJuez = 0;
        if (it.abstencion) { correcto = esAbstencion(predicha); }     // oro = "no se puede responder": acierta si se abstiene
        else { const j = await juzgar(it.pregunta, it.respuesta, predicha, { proveedor: JUEZ_PROV, modelo: JUEZ_MODELO }); correcto = j.correcto; juezTxt = j.texto; costeJuez = j.coste; }
        const coste = resp.coste + costeJuez;
        gasto += coste;
        estado.hechos[it.id] = { tipo: it.tipo, abstencion: it.abstencion, predicha, oro: it.respuesta, correcto, juez: juezTxt,
            recuperados: tids.length, coste, ms: +(performance.now() - t0).toFixed(1) };
        hechos++;
        if (hechos % 10 === 0) { guardar(); process.stdout.write(`  ${hechos} preguntas · aciertos ${pct(estado)}% · gasto $${gasto.toFixed(4)}\r`); }
    }
    idx.limpiar?.();
}
guardar();

// --- informe ---
function pct(e) { const l = Object.values(e.hechos).filter(h => !h.seco); return l.length ? Math.round(1000 * l.filter(h => h.correcto).length / l.length) / 10 : 0; }
const filas = Object.values(estado.hechos);
if (DRY) {
    const conCtx = filas.filter(h => h.ctxChars > 0).length;
    process.stdout.write(`\nDRY OK · ${filas.length} preguntas procesadas · ${conCtx} con contexto no vacío · media ${Math.round(filas.reduce((s, h) => s + (h.ctxChars || 0), 0) / (filas.length || 1))} car./contexto\n`);
    process.stdout.write('Cableado verificado sin LLM. Para el run real: quita --dry (necesita Ollama con el modelo cargado).\n');
} else {
    const reales = filas.filter(h => !h.seco);
    const tipos = {};
    for (const h of reales) { (tipos[h.tipo] ||= { n: 0, ok: 0 }).n++; if (h.correcto) tipos[h.tipo].ok++; }
    const abst = reales.filter(h => h.abstencion);
    process.stdout.write(`\n\nResultado · ${reales.length} preguntas · retriever ${RETR} · top-${TOPK}\n`);
    process.stdout.write(`  Acierto global: ${pct(estado)}%  (${reales.filter(h => h.correcto).length}/${reales.length})\n`);
    if (abst.length) process.stdout.write(`  Abstención: ${Math.round(1000 * abst.filter(h => h.correcto).length / abst.length) / 10}%  (${abst.filter(h => h.correcto).length}/${abst.length})\n`);
    process.stdout.write('  Por tipo:\n');
    for (const [k, v] of Object.entries(tipos).sort()) process.stdout.write(`    ${k.padEnd(28)} ${String(Math.round(1000 * v.ok / v.n) / 10).padStart(5)}%  (${v.ok}/${v.n})\n`);
    process.stdout.write(`  Gasto total: $${gasto.toFixed(4)}  ·  guardado en ${path.basename(SALIDA)}\n`);
}
