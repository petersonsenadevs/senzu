#!/usr/bin/env node
// Capa de RECUPERACIÓN del cara a cara contra productos de memoria (plan F8-T9). Mide, OFFLINE y sin LLM, cómo de bien
// cada recuperador saca del haystack los turnos que de verdad contienen la respuesta (el "oro" de evidencia del dataset).
// Es el diagnóstico previo al end-to-end: si un motor no RECUPERA la evidencia, por buen contestador que sea no acierta.
// La unidad es el TURNO (como en el loader); el oro son los turnos marcados como evidencia (LoCoMo dia_id, LongMemEval
// has_answer). Dos recuperadores, exactamente los mismos turnos para ambos (comparación justa):
//   - embedding: multilingual-e5-small local (tools/.models, cero red tras la descarga), coseno, ranking puro (sin umbral).
//   - motor: el motor de hechos de Senzu (core/hooks/hechos.mjs), cada turno ingerido como un hecho, su propio ranking.
// NO hay extracción con LLM aquí (eso es la ingesta del end-to-end, que llega después con Qwen3): esto recupera sobre los
// turnos crudos, que es lo que se puede construir y verificar sin nada instalado.
//   recall@k   = de los turnos oro, cuántos salen en el top-k (promedio sobre preguntas con evidencia)
//   acierto@k  = en cuántas preguntas sale al menos un turno oro en el top-k
//   cobertura  = de los turnos oro, cuántos existen de verdad en el haystack (diagnóstico: si <100 %, el oro no casa
//                con los tid del corpus y el recall no es comparable; nunca debe fallar en LongMemEval, que es autogenerado)
//   node tools/eval-productos/recuperar.mjs --locomo --limite 30 [--motor|--embedding] [--k 1,3,5,10] [--json] [--guardar]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cargarLocomo, cargarLongmemeval } from './loader.mjs';
import { crearBaselineEmbedding } from '../eval-hechos/embedding.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const motor = await import(pathToFileURL(path.join(HOOKS, 'hechos.mjs')).href);

// --- recuperador 1: embedding e5-small (ranking puro: umbral 0, no abstiene; aquí medimos orden, no el "me callo") ---
export async function recuperadorEmbedding(turnos) {
    const map = new Map();                                  // id sintético -> tid real (los tid pueden repetirse)
    const hechos = turnos.map((t, i) => { const uid = 'd' + i; map.set(uid, t.tid); return { id: uid, valor: t.texto, t: i }; });
    const idx = await crearBaselineEmbedding(hechos, { umbral: 0 });
    return { async buscar(q, k) { return (await idx.buscar(q, { limite: k })).map(h => map.get(h.id)); } };
}

// --- recuperador 2: el motor de Senzu (cada turno un hecho con dimensión única; se mapea el id del hecho a su tid) ---
export function recuperadorMotor(turnos) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-recup-'));
    const P = path.join(base, 'proj');
    fs.mkdirSync(path.join(P, 'senzu'), { recursive: true });
    fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
    process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'memoria.md');
    const map = new Map();
    const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
    turnos.forEach((t, i) => {
        if (!t.texto) return;                               // turnos sin texto (p. ej. solo imagen) no se ingieren
        const r = motor.guardarHecho(P, { dimension: `nota.t${i}`, valor: t.texto, claves: t.hablante ? [t.hablante] : [] },
            { ahora: new Date(T0 + i * 1000).toISOString() });
        map.set(r.hecho.id, t.tid);
    });
    return {
        buscar(q, k) { return motor.buscarHechos(P, q, { limite: k }).map(h => map.get(h.hecho.id)).filter(Boolean); },
        limpiar() { fs.rmSync(base, { recursive: true, force: true }); },
    };
}

export function recallItem(tids, gold, ks) {
    const out = {};
    for (const k of ks) {
        const top = new Set(tids.slice(0, k));
        let hit = 0; for (const g of gold) if (top.has(g)) hit++;
        out['r' + k] = hit / gold.size;        // aporte a recall@k medio
        out['h' + k] = hit > 0 ? 1 : 0;        // acierto@k (al menos uno)
    }
    return out;
}

export async function evaluar(ds, retriever, { ks, limite }) {
    const porHay = new Map();
    for (const it of ds.items) { if (!porHay.has(it.haystack)) porHay.set(it.haystack, []); porHay.get(it.haystack).push(it); }
    const filas = [], lat = [];
    let turnosTotal = 0, evaluados = 0;
    const maxK = Math.max(...ks);
    for (const [hid, items] of porHay) {
        if (limite && evaluados >= limite) break;
        const turnos = ds.haystacks[hid].sessions.flatMap(s => s.turnos);
        const tidSet = new Set(turnos.map(t => t.tid));
        turnosTotal += turnos.length;
        const idx = retriever === 'embedding' ? await recuperadorEmbedding(turnos) : recuperadorMotor(turnos);
        for (const it of items) {
            if (limite && evaluados >= limite) break;
            const gold = new Set(it.evidencia);
            if (gold.size === 0) continue;                  // sin oro no se puede medir recuperación
            const cobertura = [...gold].filter(g => tidSet.has(g)).length / gold.size;
            const t0 = performance.now();
            const tids = await idx.buscar(it.pregunta, maxK);
            lat.push(performance.now() - t0);
            filas.push({ id: it.id, tipo: it.tipo, oro: gold.size, cobertura, ...recallItem(tids, gold, ks) });
            evaluados++;
        }
        idx.limpiar?.();
    }
    return { filas, lat, turnosTotal };
}

function resumir(filas, lat, ks) {
    const med = clave => filas.length ? +(filas.reduce((s, f) => s + f[clave], 0) / filas.length).toFixed(4) : null;
    const ordena = lat.slice().sort((a, b) => a - b);
    const p = q => ordena.length ? +ordena[Math.min(ordena.length - 1, Math.floor((q / 100) * ordena.length))].toFixed(2) : null;
    const r = { preguntas: filas.length, cobertura: med('cobertura'), latP50: p(50), latP95: p(95) };
    for (const k of ks) { r['recall@' + k] = med('r' + k); r['acierto@' + k] = med('h' + k); }
    return r;
}

// ---- CLI (solo al ejecutar directo; como librería exporta los recuperadores para el pipeline end-to-end) ----
const esCLI = process.argv[1] && (import.meta.url === pathToFileURL(process.argv[1]).href || process.argv[1].endsWith('recuperar.mjs'));
if (esCLI) {
const args = process.argv.slice(2);
const opt = n => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const ks = (val('--k', '1,3,5,10')).split(',').map(Number).filter(Boolean).sort((a, b) => a - b);
const limite = Number(val('--limite', 0)) || 0;
const retrievers = opt('--motor') ? ['motor'] : opt('--embedding') ? ['embedding'] : ['motor', 'embedding'];
const cualDataset = opt('--longmemeval') ? 'longmemeval' : 'locomo';   // por defecto LoCoMo (rápido, completo offline)

const ds = cualDataset === 'longmemeval' ? await cargarLongmemeval({ limite: limite || Infinity }) : cargarLocomo();
const salida = { dataset: cualDataset, ks, limite: limite || null, fecha: new Date().toISOString(), motores: {} };
process.stdout.write(`\nRecuperación · ${cualDataset}${limite ? ` (límite ${limite} preguntas)` : ''} · k=${ks.join(',')}\n\n`);
const pad = (s, n) => String(s).padStart(n);
process.stdout.write(`  motor       preg.  cobertura  ${ks.map(k => `rec@${k}`.padStart(8)).join('')}  ${ks.map(k => `ac@${k}`.padStart(7)).join('')}   p50   p95\n`);
for (const nombre of retrievers) {
    const { filas, lat, turnosTotal } = await evaluar(ds, nombre, { ks, limite });
    const r = resumir(filas, lat, ks);
    salida.motores[nombre] = { ...r, turnosIngeridos: turnosTotal };
    const pc = x => (x == null ? '  —' : (100 * x).toFixed(1) + '%');
    process.stdout.write(`  ${nombre.padEnd(10)} ${pad(r.preguntas, 5)}  ${pad(pc(r.cobertura), 8)}  ${ks.map(k => pad(pc(r['recall@' + k]), 8)).join('')}  ${ks.map(k => pad(pc(r['acierto@' + k]), 7)).join('')} ${pad(r.latP50, 5)} ${pad(r.latP95, 5)}\n`);
}
process.stdout.write('\n  cobertura = % de turnos oro que existen en el haystack (debe ser ~100 %; si no, el oro no casa con los tid).\n');
process.stdout.write('  Sin red ni clave: embedding local (tools/.models) + motor de hechos. recall = ranking puro (sin umbral).\n');

if (opt('--json')) process.stdout.write('\n' + JSON.stringify(salida, null, 2) + '\n');
if (opt('--guardar')) {
    const ruta = path.join(HERE, `resultados-recuperacion-${cualDataset}.json`);
    fs.writeFileSync(ruta, JSON.stringify(salida, null, 2) + '\n');
    process.stdout.write(`\nGuardado: ${ruta}\n`);
}
}
