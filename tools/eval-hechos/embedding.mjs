// Baseline SEMÁNTICO para el benchmark comparado de la memoria (plan F8-T1): «lo que haría cualquiera hoy con
// embeddings». Modelo multilingüe pequeño (multilingual-e5-small cuantizado) corriendo EN LOCAL con transformers.js:
// una descarga (tools/.models, gitignored), luego SIN red. Determinista (ONNX q8 en CPU, misma salida siempre).
//
// Va aparte de baselines.mjs (grep/bm25) porque necesita un modelo y es async. Misma entrada que los demás: el mismo
// texto por hecho (docText); el embedding trabaja sobre texto, no sobre tokens, así que esa es la comparación justa.
// Interfaz igual que el motor: buscar(consulta,{limite}) → [{id,score,t,motivo}] ordenado; lista vacía = se abstiene.
// e5 pide prefijos: "query: " en la consulta y "passage: " en cada hecho (su uso recomendado; sin ellos rinde peor).

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELO = 'Xenova/multilingual-e5-small';
// Listón de coseno para abstenerse. e5 normalizado puntúa alto incluso a pares flojos (anisotropía); 0,82 es un
// valor de partida razonable, configurable con SENZU_EMB_UMBRAL. Calibrarlo NO se hace aquí (sería sobreajuste): su
// efecto en recall/abstención es dato honesto que se analiza en F8-T2/F8-T3.
const UMBRAL_EMB = Number(process.env.SENZU_EMB_UMBRAL ?? 0.82);

const docText = h => [h.dimension, h.valor, h.texto, ...[].concat(h.claves || [])].filter(Boolean).join(' ');

export async function crearBaselineEmbedding(hechos, { umbral = UMBRAL_EMB } = {}) {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = path.join(HERE, '..', '.models');   // tools/.models (gitignored): el modelo vive aquí
    env.allowLocalModels = true;                        // tras la primera descarga, lee de la caché y no toca la red

    const extractor = await pipeline('feature-extraction', MODELO, { dtype: 'q8' });
    const embed = async txt => (await extractor(txt, { pooling: 'mean', normalize: true })).data;  // Float32Array L2

    const docs = [];
    for (const h of hechos) docs.push({ id: h.id, t: h.t ?? 0, vec: await embed('passage: ' + docText(h)) });

    const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };  // vectores ya L2

    return {
        async buscar(consulta, { limite = 3 } = {}) {
            const q = await embed('query: ' + consulta);
            return docs.map(d => { const s = +cos(q, d.vec).toFixed(4); return { id: d.id, score: s, t: d.t, motivo: `emb ${s}` }; })
                .filter(d => d.score >= umbral)
                .sort((a, b) => b.score - a.score || b.t - a.t)
                .slice(0, limite);
        },
    };
}
