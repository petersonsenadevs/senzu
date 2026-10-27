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
