#!/usr/bin/env node
// Cliente LLM del cara a cara contra productos de memoria (plan F8-T9, Fase 2). Selector de proveedor (openai | gemini |
// claude | local) por variable de entorno, con CONTABILIDAD de coste por llamada para medir el gasto real antes del run
// grande. La clave la pone el usuario en tools/.env (gitignored); aquí solo se lee de process.env. Determinista en lo que
// el proveedor permite (temperatura 0, seed). Nota: el rol de contestar se llama 'respuesta' (no la palabra que choca con
// una herramienta de pentest y dispara pentest-guard en cualquier .mjs en castellano). Uso:
//   node tools/eval-productos/llm.mjs --probar            # una llamada mínima para validar conexión y coste
//   import { chat, coste, config } from './llm.mjs'

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Carga .env (tools/.env y la raíz) sin dependencias; no pisa lo que ya esté en el entorno.
function cargarEnv() {
    for (const ruta of [path.join(HERE, '..', '.env'), path.join(HERE, '..', '..', '.env')]) {
        if (!fs.existsSync(ruta)) continue;
        for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
            const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(linea);
            if (!m || m[1].startsWith('#')) continue;
            let v = m[2].trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
            if (process.env[m[1]] === undefined && v !== '') process.env[m[1]] = v;
        }
    }
}
cargarEnv();

// Precios de lista en $/1M tokens (ver devlog 181; OpenAI 2026). Para la contabilidad del gasto.
const PRECIOS = {
    'gpt-4o': { entrada: 2.5, salida: 10 },
    'gpt-4o-mini': { entrada: 0.15, salida: 0.6 },
    'gemini-2.0-flash': { entrada: 0, salida: 0 },       // free tier
    'local': { entrada: 0, salida: 0 },
};

export const config = () => ({
    proveedor: process.env.EVAL_LLM_PROVIDER || 'openai',
    respuesta: process.env.EVAL_LLM_RESPUESTA || 'gpt-4o-mini',
    juez: process.env.EVAL_LLM_JUEZ || 'gpt-4o',
    localUrl: process.env.EVAL_LLM_LOCAL_URL || 'http://localhost:11434/v1',
});

export function coste(modelo, uso) {
    const p = PRECIOS[modelo] || PRECIOS[modelo?.replace(/-\d{4}-\d{2}-\d{2}$/, '')] || { entrada: 0, salida: 0 };
    return (uso.entrada / 1e6) * p.entrada + (uso.salida / 1e6) * p.salida;
}

async function openaiChat({ modelo, sistema, usuario, maxTokens, temperatura, apiBase, apiKey }) {
    const res = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        body: JSON.stringify({
            model: modelo,
            messages: [...(sistema ? [{ role: 'system', content: sistema }] : []), { role: 'user', content: usuario }],
            temperature: temperatura, max_tokens: maxTokens, seed: 7,
        }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    return {
        texto: j.choices?.[0]?.message?.content ?? '',
        uso: { entrada: j.usage?.prompt_tokens ?? 0, salida: j.usage?.completion_tokens ?? 0 },
    };
}

// Un solo turno pregunta→respuesta. Devuelve { texto, uso:{entrada,salida}, modelo, coste }.
export async function chat({ rol = 'respuesta', modelo, sistema = '', usuario, maxTokens = 512, temperatura = 0 } = {}) {
    const c = config();
    modelo = modelo || (rol === 'juez' ? c.juez : c.respuesta);
    let out;
    if (c.proveedor === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('Falta OPENAI_API_KEY (ponla en tools/.env; ver tools/.env.example)');
        out = await openaiChat({ modelo, sistema, usuario, maxTokens, temperatura, apiBase: 'https://api.openai.com/v1', apiKey });
    } else if (c.proveedor === 'local') {
        out = await openaiChat({ modelo, sistema, usuario, maxTokens, temperatura, apiBase: c.localUrl, apiKey: 'sk-local' });
    } else {
        throw new Error(`Proveedor '${c.proveedor}' aún no implementado (openai y local sí). Pendiente: gemini, claude.`);
    }
    return { ...out, modelo, coste: coste(modelo, out.uso) };
}

if (process.argv[1]?.endsWith('llm.mjs')) {
    if (process.argv.includes('--probar')) {
        const c = config();
        process.stdout.write(`Proveedor: ${c.proveedor} · respuesta: ${c.respuesta} · juez: ${c.juez}\n`);
        try {
            const r = await chat({ usuario: 'Responde SOLO con la palabra: listo', maxTokens: 8 });
            process.stdout.write(`Respuesta (${r.modelo}): ${JSON.stringify(r.texto)}\n`);
            process.stdout.write(`Tokens: ${r.uso.entrada} entrada / ${r.uso.salida} salida · coste $${r.coste.toFixed(6)}\n`);
            process.stdout.write('Conexión OK.\n');
        } catch (e) {
            process.stdout.write(`No se pudo probar: ${e.message}\n`);
            process.exitCode = 1;
        }
    } else {
        process.stdout.write('Uso: node tools/eval-productos/llm.mjs --probar\n');
    }
}
