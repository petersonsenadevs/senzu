#!/usr/bin/env node
// Juez del cara a cara (plan F8-T9): decide si la respuesta del modelo CASA con la de referencia, como los scorers de
// LoCoMo/LongMemEval. Compartido por el pipeline (juzga al contestar) y por el re-juez (vuelve a puntuar lo ya guardado).
// Por defecto el juez es local (Qwen3-8B, 0 €); se puede pasar { proveedor, modelo } por llamada para validarlo contra
// GPT-4o sin tocar el contestador.
import { chat } from './llm.mjs';

export const SIS_JUEZ = 'You grade whether a predicted answer matches the reference answer for a question. It is correct if it '
    + 'conveys the same information, even if worded differently; otherwise wrong. Reply with exactly one word: CORRECT or WRONG.';

// Heurística de abstención: ¿el modelo dijo "no lo sé / no aparece"? (para las preguntas de abstención, acertar = abstenerse)
export const esAbstencion = t => /\bi\s*don'?t\s*know\b|no\s+(information|answer|mention|idea)|not\s+(mentioned|available|stated|in the)/i.test(t || '');

export async function juzgar(pregunta, oro, predicha, { proveedor, modelo } = {}) {
    const r = await chat({ rol: 'juez', proveedor, modelo, sistema: SIS_JUEZ, maxTokens: 4,
        usuario: `Question: ${pregunta}\nReference answer: ${oro}\nPredicted answer: ${predicha}\nVerdict:` });
    return { correcto: /\bcorrect\b/i.test(r.texto) && !/\bwrong\b/i.test(r.texto), coste: r.coste, texto: r.texto };
}
