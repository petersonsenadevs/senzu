#!/usr/bin/env node
// Loader común del cara a cara contra productos de memoria (plan F8-T9). Normaliza LoCoMo y LongMemEval a UN formato único
// para que motor, embedding y los OSS se midan igual. LongMemEval se lee por STREAMING (el fichero pesa ~264 MB: nunca se
// parsea entero en memoria). Formato normalizado:
//   { dataset, haystacks: { [hid]: { sessions: [{ id, fecha, turnos: [{ tid, hablante, texto, esEvidencia }] }] } },
//     items: [{ id, haystack, pregunta, respuesta, tipo, abstencion, evidencia: [tid...], sesionesOro: [sid...] }] }
// El "haystack" es la conversación que da contexto; en LoCoMo lo comparten ~199 preguntas, en LongMemEval es propio de cada
// pregunta. La unidad de recuperación es el TURNO; el oro de recall son los turnos marcados como evidencia.
//   node tools/eval-productos/loader.mjs --stats [--locomo|--longmemeval] [--limite N]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.join(HERE, '..', '.datos');
const RUTA_LOCOMO = path.join(DATOS, 'locomo.json');
const RUTA_LMEVAL = path.join(DATOS, 'longmemeval-s.json');

const texto = v => (v == null ? '' : String(v)).trim();

// ---- LoCoMo (fichero pequeño: parseo directo) ----
export function cargarLocomo() {
    const raw = JSON.parse(fs.readFileSync(RUTA_LOCOMO, 'utf8')).datos;
    const haystacks = {}, items = [];
    for (const muestra of raw) {
        const hid = muestra.sample_id;
        const conv = muestra.conversation || {};
        const sessions = [];
        for (const k of Object.keys(conv)) {
            const m = /^session_(\d+)$/.exec(k);
            if (!m || !Array.isArray(conv[k])) continue;
            const n = m[1];
            const turnos = conv[k].map(t => ({
                tid: t.dia_id || `${hid}:s${n}`,
                hablante: t.speaker || '',
                texto: texto(t.text) || texto(t.blip_caption) || texto(t.query),
                esEvidencia: false,
            }));
            sessions.push({ id: `session_${n}`, fecha: texto(conv[`session_${n}_date_time`]), turnos });
        }
        sessions.sort((a, b) => Number(a.id.slice(8)) - Number(b.id.slice(8)));
        haystacks[hid] = { sessions };
        const qa = Array.isArray(muestra.qa) ? muestra.qa : [];
        qa.forEach((q, i) => {
            const evidencia = Array.isArray(q.evidence) ? q.evidence.map(String) : [];
            items.push({
                id: `${hid}#${i}`, haystack: hid,
                // cat5 (adversaria) trae la respuesta en adversarial_answer, no en answer (que viene undefined).
                pregunta: texto(q.question), respuesta: texto(q.answer) || texto(q.adversarial_answer),
                tipo: `locomo-cat${q.category}`,
                // En LoCoMo la cat 5 (adversaria) lleva evidencia + adversarial_answer (distractor), no es abstención pura.
                abstencion: false,
                evidencia, sesionesOro: [],
            });
        });
    }
    return { dataset: 'locomo', haystacks, items };
}

// ---- LongMemEval (fichero grande: lector de registros por streaming) ----
// Recorre el array JSON emitiendo cada objeto de nivel 1 sin cargar el fichero entero. Máquina de estados que respeta las
// comillas y los escapes para no contar llaves dentro de cadenas.
export async function* leerRegistrosLongmemeval(ruta = RUTA_LMEVAL) {
    const stream = fs.createReadStream(ruta, { encoding: 'utf8', highWaterMark: 1 << 20 });
    let buf = '', prof = 0, ini = -1, enCadena = false, escape = false, arranque = false;
    for await (const trozo of stream) {
        buf += trozo;
        for (let i = buf.length - trozo.length; i < buf.length; i++) {
            const c = buf[i];
            if (!arranque) { if (c === '[') arranque = true; continue; }
            if (enCadena) {
                if (escape) escape = false;
                else if (c === '\\') escape = true;
                else if (c === '"') enCadena = false;
                continue;
            }
            if (c === '"') { enCadena = true; continue; }
            if (c === '{') { if (prof === 0) ini = i; prof++; }
            else if (c === '}') {
                prof--;
                if (prof === 0 && ini >= 0) {
                    yield JSON.parse(buf.slice(ini, i + 1));
                    buf = buf.slice(i + 1); i = -1; ini = -1; // recorta lo ya emitido
                }
            }
        }
    }
}

export async function cargarLongmemeval({ limite = Infinity } = {}) {
    const haystacks = {}, items = [];
    let n = 0;
    for await (const r of leerRegistrosLongmemeval()) {
        if (n >= limite) break;
        n++;
        const hid = r.question_id;
        const oro = new Set(Array.isArray(r.answer_session_ids) ? r.answer_session_ids.map(String) : []);
        const ids = Array.isArray(r.haystack_session_ids) ? r.haystack_session_ids : [];
        const fechas = Array.isArray(r.haystack_dates) ? r.haystack_dates : [];
        const evidencia = [];
        const sessions = (r.haystack_sessions || []).map((ses, si) => {
            const sid = String(ids[si] ?? `s${si}`);
            const turnos = (Array.isArray(ses) ? ses : []).map((t, ti) => {
                const tid = `${sid}:${ti}`;
                const esEvidencia = t.has_answer === true;
                if (esEvidencia) evidencia.push(tid);
                return { tid, hablante: t.role || t.speaker || '', texto: texto(t.content ?? t.text), esEvidencia };
            });
            return { id: sid, fecha: texto(fechas[si]), turnos };
        });
        haystacks[hid] = { sessions };
        items.push({
            id: hid, haystack: hid,
            pregunta: texto(r.question), respuesta: texto(r.answer),
            tipo: r.question_type || 'desconocido',
            abstencion: String(hid).endsWith('_abs'),
            evidencia, sesionesOro: [...oro],
        });
    }
    return { dataset: 'longmemeval', haystacks, items };
}

// ---- stats / smoke ----
function stats(ds) {
    const nH = Object.keys(ds.haystacks).length;
    let turnos = 0, sesiones = 0;
    for (const h of Object.values(ds.haystacks)) { sesiones += h.sessions.length; for (const s of h.sessions) turnos += s.turnos.length; }
    const tipos = {}, conEv = ds.items.filter(i => i.evidencia.length).length, abst = ds.items.filter(i => i.abstencion).length;
    for (const it of ds.items) tipos[it.tipo] = (tipos[it.tipo] || 0) + 1;
    process.stdout.write(`\n[${ds.dataset}]\n`);
    process.stdout.write(`  haystacks: ${nH} · sesiones: ${sesiones} · turnos: ${turnos}\n`);
    process.stdout.write(`  preguntas: ${ds.items.length} · con evidencia: ${conEv} · abstención: ${abst}\n`);
    process.stdout.write(`  tipos: ${Object.entries(tipos).map(([k, v]) => `${k}=${v}`).join(', ')}\n`);
    const ej = ds.items.find(i => i.evidencia.length) || ds.items[0];
    process.stdout.write(`  ejemplo: ${JSON.stringify({ id: ej.id, pregunta: ej.pregunta.slice(0, 60), respuesta: ej.respuesta.slice(0, 40), tipo: ej.tipo, evidencia: ej.evidencia.slice(0, 3), abstencion: ej.abstencion })}\n`);
}

if (process.argv[1] && (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('loader.mjs'))) {
    const arg = n => process.argv.includes(n);
    const num = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
    if (arg('--stats')) {
        const soloL = arg('--locomo'), soloM = arg('--longmemeval');
        if (!soloM) stats(cargarLocomo());
        if (!soloL) stats(await cargarLongmemeval({ limite: num('--limite', Infinity) }));
    } else {
        process.stdout.write('Uso: node tools/eval-productos/loader.mjs --stats [--locomo|--longmemeval] [--limite N]\n');
    }
}
