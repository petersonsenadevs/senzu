#!/usr/bin/env node
// Ingesta con LLM del cara a cara (plan F8-T9): el paso que hace JUSTO el pipeline. Los productos de memoria (mem0/Zep/Letta)
// no guardan los turnos tal cual: un LLM EXTRAE hechos duraderos de la conversación y eso es lo que almacenan y recuperan.
// Aquí hacemos lo mismo con el MISMO modelo local (Qwen3-8B) para todos los motores, así nadie gana por usar un LLM mejor.
// Caché en disco (tools/.datos/ingesta-cache, gitignored): la extracción es el paso caro en tiempo; se hace una vez por
// conversación y se reutiliza en cada motor y en cada relanzamiento. Determinista (temp 0 + seed en llm.mjs).
//   import { memoriasDeConversacion } from './ingesta.mjs'   // -> { hid, memorias:[{tid,texto}], coste, llamadas }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat } from './llm.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '..', '.datos', 'ingesta-cache');

const SIS_EXTRAER = 'You extract durable facts from a conversation so they can be used to answer questions later. '
    + 'Output ONLY a JSON array of short standalone statements (strings). Each statement must be self-contained: name WHO '
    + 'it is about and, when relevant, WHEN (use the provided date). Include only facts stated in the conversation. '
    + 'No commentary, no markdown, no code fences.';

// Saca la lista de hechos del texto del modelo: primero intenta el array JSON; si no, parte por líneas y limpia viñetas.
function parsearHechos(txt) {
    const m = (txt || '').match(/\[[\s\S]*\]/);
    if (m) { try { const a = JSON.parse(m[0]); if (Array.isArray(a)) return a.map(String).map(s => s.trim()).filter(Boolean); } catch { /* cae al modo líneas */ } }
    return (txt || '').split(/\n+/).map(s => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(s => s.length > 3);
}

// --- Ingesta ESTRUCTURADA (X-T22): para probar de verdad X-18/temporal. El LLM no saca cadenas sueltas sino hechos
// con una CLAVE ESTABLE por atributo (home_city, job, car…), de modo que cuando algo se actualiza entre sesiones cae
// en la misma clave. El adaptador del motor las guarda en identidad.<clave> (familia de valor único) → sustituye y
// data la línea de tiempo; el embedding las embebe planas (sin recencia). Así se aísla la ventaja de la memoria. ---
const SIS_ESTRUCTURAR = 'You extract durable facts about the USER from a conversation, as a JSON array. Each item: '
    + '{"key":"<stable_snake_case_attribute>","value":"<the fact, self-contained>","date":"<YYYY-MM-DD or empty>"}. '
    + 'Use a STABLE key for the same attribute so later updates REUSE the same key (e.g. always "home_city" for where '
    + 'the user lives, "job" for their job, "car" for their car, "employer" for their company). value: a short '
    + 'standalone statement naming who/what. date: when it became true, from the provided date. Only facts explicitly '
    + 'stated. Output ONLY the JSON array, no prose, no markdown, no code fences.';

function parsearEstructurado(txt) {
    const m = (txt || '').match(/\[[\s\S]*\]/);
    if (!m) return [];
    try {
        const a = JSON.parse(m[0]);
        if (!Array.isArray(a)) return [];
        return a.map(o => ({
            key: String(o && o.key || '').trim(),
            value: String(o && (o.value ?? o.valor) || '').trim(),
            date: String(o && (o.date ?? o.fecha) || '').trim(),
        })).filter(o => o.key && o.value);
    } catch { return []; }
}

export async function memoriasEstructuradas(dataset, hid, sessions, { maxTokens = 700 } = {}) {
    const dir = path.join(CACHE, dataset + '-estructurada');
    const ruta = path.join(dir, `${String(hid).replace(/[^\w.-]/g, '_')}.json`);
    if (fs.existsSync(ruta)) { try { const c = JSON.parse(fs.readFileSync(ruta, 'utf8')); if (c.memorias) return c; } catch { /* caché corrupta: se rehace */ } }
    fs.mkdirSync(dir, { recursive: true });
    const memorias = [];   // en ORDEN cronológico (sesiones en orden): el adaptador del motor confía en ese orden para sustituir
    let coste = 0, llamadas = 0;
    for (const s of sessions) {
        const conv = s.turnos.filter(t => t.texto).map(t => `${t.hablante ? t.hablante + ': ' : ''}${t.texto}`).join('\n');
        if (!conv) continue;
        const r = await chat({ rol: 'respuesta', sistema: SIS_ESTRUCTURAR, maxTokens,
            usuario: `Date: ${s.fecha || 'unknown'}\nConversation:\n${conv}\n\nFacts (JSON array):` });
        coste += r.coste; llamadas++;
        parsearEstructurado(r.texto).forEach((o, i) => memorias.push({
            tid: `${hid}:${s.id}:${o.key}:${i}`, key: o.key, valor: o.value,
            fecha: o.date || s.fecha || '', texto: o.date ? `${o.value} (${o.date})` : o.value, hablante: '',
        }));
    }
    const out = { hid, dataset, modelo: 'qwen3:8b', sesiones: sessions.length, memorias, coste, llamadas };
    fs.writeFileSync(ruta, JSON.stringify(out, null, 2) + '\n');
    return out;
}

export async function memoriasDeConversacion(dataset, hid, sessions, { maxTokens = 600 } = {}) {
    const dir = path.join(CACHE, dataset);
    const ruta = path.join(dir, `${String(hid).replace(/[^\w.-]/g, '_')}.json`);
    if (fs.existsSync(ruta)) { try { const c = JSON.parse(fs.readFileSync(ruta, 'utf8')); if (c.memorias) return c; } catch { /* caché corrupta: se rehace */ } }
    fs.mkdirSync(dir, { recursive: true });
    const memorias = [];
    let coste = 0, llamadas = 0;
    for (const s of sessions) {
        const conv = s.turnos.filter(t => t.texto).map(t => `${t.hablante ? t.hablante + ': ' : ''}${t.texto}`).join('\n');
        if (!conv) continue;
        const r = await chat({ rol: 'respuesta', sistema: SIS_EXTRAER, maxTokens,
            usuario: `Date: ${s.fecha || 'unknown'}\nConversation:\n${conv}\n\nFacts (JSON array of strings):` });
        coste += r.coste; llamadas++;
        parsearHechos(r.texto).forEach((f, i) => memorias.push({ tid: `${hid}:${s.id}:m${i}`, texto: f, hablante: '', fecha: '' }));
    }
    const out = { hid, dataset, modelo: 'qwen3:8b', sesiones: sessions.length, memorias, coste, llamadas };
    fs.writeFileSync(ruta, JSON.stringify(out, null, 2) + '\n');
    return out;
}
