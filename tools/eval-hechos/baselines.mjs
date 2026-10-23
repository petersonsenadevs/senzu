// Baselines léxicos para el benchmark comparado de la memoria (plan F8-T1): «lo típico» contra lo que hay que batir.
//   grep → coincidencia de palabras con peso (el «busca en tus notas» de toda la vida)
//   bm25 → recuperación léxica clásica (tf-idf con saturación y normalización por longitud)
// Deterministas y SIN red. Usan la MISMA tokenización que el motor (palabras/palabraConPeso de hechos.mjs): así la
// comparación es justa — misma entrada para todos, solo cambia el algoritmo. El embedding (semántico) va aparte porque
// necesita un modelo. Interfaz igual que el motor: buscar(consulta, {limite}) → [{id, score, motivo}] ya ordenado;
// lista vacía = se abstiene (no hay nada por encima del listón del baseline).

const docText = h => [h.dimension, h.valor, h.texto, ...[].concat(h.claves || [])]
    .filter(Boolean).join(' ');

export function crearBaseline(tipo, hechos, { palabras, palabraConPeso }) {
    const conPeso = toks => toks.filter(palabraConPeso);
    const docs = hechos.map(h => ({ id: h.id, t: h.t ?? 0, toks: palabras(docText(h)) }));

    if (tipo === 'grep') {
        // Cobertura de palabras con peso de la consulta presentes en el hecho. Se abstiene si no coincide ninguna.
        return {
            buscar(consulta, { limite = 3 } = {}) {
                const q = [...new Set(conPeso(palabras(consulta)))];
                if (!q.length) return [];
                return docs.map(d => { const set = new Set(d.toks); const n = q.filter(w => set.has(w)).length;
                        return { id: d.id, score: n, t: d.t, motivo: `grep ${n}/${q.length}` }; })
                    .filter(d => d.score > 0)
                    .sort((a, b) => b.score - a.score || b.t - a.t)
                    .slice(0, limite);
            },
        };
    }

    if (tipo === 'bm25') {
        const k1 = 1.2, b = 0.75, N = docs.length || 1;
        const df = new Map();
        for (const d of docs) for (const w of new Set(d.toks)) df.set(w, (df.get(w) || 0) + 1);
        const idf = w => Math.log(1 + (N - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));
        const avgdl = (docs.reduce((s, d) => s + d.toks.length, 0) / N) || 1;
        const tf = docs.map(d => { const m = new Map(); for (const w of d.toks) m.set(w, (m.get(w) || 0) + 1); return m; });
        // Se abstiene si ningún término de la consulta aparece en ningún hecho (score 0). BM25 no tiene un listón
        // absoluto natural: por eso «calla» poco (contesta en cuanto comparte una palabra), y eso es parte del dato honesto.
        return {
            buscar(consulta, { limite = 3 } = {}) {
                const q = [...new Set(conPeso(palabras(consulta)))];
                if (!q.length) return [];
                return docs.map((d, i) => {
                        let s = 0;
                        for (const w of q) { const f = tf[i].get(w) || 0; if (!f) continue;
                            s += idf(w) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.toks.length / avgdl)); }
                        return { id: d.id, score: +s.toFixed(4), t: d.t, motivo: `bm25 ${+s.toFixed(2)}` };
                    })
                    .filter(d => d.score > 0)
                    .sort((a, b) => b.score - a.score || b.t - a.t)
                    .slice(0, limite);
            },
        };
    }

    throw new Error(`baseline desconocido: ${tipo} (grep|bm25)`);
}
