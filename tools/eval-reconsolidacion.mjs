#!/usr/bin/env node
// Evaluación de la RECONSOLIDACIÓN (X-T11): ¿aprende la memoria las palabras del usuario sin estropear lo demás?
// Simula sesiones reales por el camino de verdad: el recuerdo vivo inyecta (registro de uso), el agente, si no le
// llegó lo que necesitaba, lo busca él (--recordar, apuntado sin sesión) y responde; al cerrar, marcarUsoSesion
// evalúa el uso y reconsolida. Con los corpus de tools/eval-hechos/:
//   - ENTRENO: la primera pregunta de cada hecho y la mitad de las preguntas sin respuesta;
//   - PRUEBA: la misma pregunta otra vez («repetida»), las demás preguntas de ese hecho («otra») y la otra mitad de
//     las sin respuesta (la abstención NO puede bajar).
// Agente «ruidoso» (--ruido 0.2): en esa proporción de turnos usa un hecho que no era (un error suyo), para medir
// que un agente que se equivoca no envenena la memoria.
//   node tools/eval-reconsolidacion.mjs [--ruido 0.2] [--rondas 2] [--fallos] [--json]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const RUIDO = Number(val('--ruido') || 0);
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-eval-reco-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const m = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'hechos.mjs')).href);
const DIR = path.join(ROOT, 'tools', 'eval-hechos');
const corpora = fs.readdirSync(DIR).filter(f => /^corpus.*\.json$/.test(f)).sort().map(f => ({ nombre: f.replace(/^corpus-?|\.json$/g, '') || 'base', ...JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));
const UMBRAL = m.UMBRAL_RECUERDO;
let semilla = 11; const rnd = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };

function relleno(r) {   // el mismo relleno que eval-hechos (ruido de verdad)
    if (!r) return [];
    return Array.from({ length: r.n }, (_, i) => {
        const eq = r.equipos[i % r.equipos.length], ci = r.ciudades[Math.floor(i / r.equipos.length) % r.ciudades.length], em = r.empresas[(i * 7) % r.empresas.length];
        const mant = i >= r.n / 2;
        return { id: `r${i}`, dimension: `${r.familia}.${r.prefijo}-${i}`, valor: `${mant ? 'mantenimiento' : 'proveedor'} de ${eq} en ${ci}: ${em}`,
            claves: mant ? ['maintenance', 'mantenimiento'] : ['supplier', 'proveedor'], t: 100 + i };
    });
}

const filas = [];
for (const corpus of corpora) {
    const P = path.join(base, 'p-' + corpus.nombre);
    fs.mkdirSync(path.join(P, 'senzu'), { recursive: true });
    fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
    process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'u-' + corpus.nombre, 'memoria.md');
    const T0 = Date.UTC(2026, 9, 1, 9, 0, 0), ids = new Map(), porCorpus = new Map();
    for (const h of [...corpus.hechos, ...relleno(corpus.relleno)].sort((a, b) => a.t - b.t)) {
        const r = m.guardarHecho(P, { dimension: h.dimension, valor: h.valor, texto: h.texto, claves: h.claves, alcance: h.alcance, idioma: h.idioma, duda: h.duda, desde: h.desde, hasta: h.hasta, enlaces: h.enlaces },
            { ahora: new Date(T0 + h.t * 1000).toISOString() });
        ids.set(r.hecho.id, h.id); porCorpus.set(h.id, r.hecho);
    }
    // las preguntas que valen: con un hecho vigente esperado (sin --historico) o sin respuesta
    const qs = corpus.preguntas.filter(q => !q.historico && (q.espera === null || porCorpus.has(q.espera)));
    const visto = new Set(), entreno = [], prueba = [];
    let sinN = 0;
    for (const q of qs) {
        if (q.espera === null) { if (sinN++ % 2) prueba.push({ ...q, papel: 'sin-respuesta' }); else entreno.push(q); continue; }
        if (!visto.has(q.espera)) { visto.add(q.espera); entreno.push(q); prueba.push({ ...q, papel: 'repetida' }); }
        else prueba.push({ ...q, papel: 'otra' });
    }
    const medir = (fase) => {
        for (const q of prueba) {
            const hits = m.buscarHechos(P, q.q, { limite: 3 }).filter(x => x.puntuacion >= UMBRAL).map(x => ids.get(x.hecho.id));
            filas.push({ corpus: corpus.nombre, fase, papel: q.papel, q: q.q, espera: q.espera, r1: q.espera ? hits[0] === q.espera : null, r3: q.espera ? hits.includes(q.espera) : null, calla: q.espera ? null : !hits.length });
        }
    };
    medir('antes');
    // ---- las sesiones de entreno, por el camino real
    const textos = [], sid = 'eval-' + corpus.nombre;
    let t = Date.UTC(2026, 9, 5, 9, 0, 0);
    const iso = ms => new Date(ms).toISOString();
    const todosLosIds = [...porCorpus.keys()];
    for (const q of Array.from({ length: Number(val("--rondas") || 1) }, () => entreno).flat()) {   // --rondas N: el usuario vuelve a preguntar (confirmaciones)
        t += 120e3;
        const hits = m.buscarHechos(P, q.q, { limite: 5, ahora: iso(t) }).filter(x => x.puntuacion >= UMBRAL);
        m.apuntarInyeccion(P, { sid, origen: 'mensaje', consulta: q.q, items: hits.map(x => ({ fuente: 'hecho', id: x.hecho.id, texto: `[${x.hecho.dimension}] ${x.hecho.valor}`, puntuacion: x.puntuacion, debil: x.debil })) }, { ahora: iso(t) });
        // el agente: lo que necesita es el hecho esperado; un agente ruidoso a veces usa otro que no era
        let usa = q.espera;
        if (RUIDO && rnd() < RUIDO) usa = todosLosIds[Math.floor(rnd() * todosLosIds.length)];
        if (usa) {
            const h = porCorpus.get(usa);
            if (!hits.some(x => x.hecho.id === h.id)) {   // no le llegó: lo busca él (con las palabras del hecho, que sí conoce)
                const tema = h.dimension.slice(h.dimension.indexOf('.') + 1).replace(/[.-]/g, ' ');
                m.apuntarInyeccion(P, { sid: 'cli', origen: 'consulta', consulta: tema, items: [{ fuente: 'hecho', id: h.id, texto: `[${h.dimension}] ${h.valor}`, puntuacion: 2 }] }, { ahora: iso(t + 10e3) });
            }
            textos.push({ t: iso(t + 20e3), texto: `Según la memoria: ${h.dimension} ${h.valor}.` });
        } else textos.push({ t: iso(t + 20e3), texto: 'No lo tengo en la memoria; no lo supongo.' });
        m.marcarUsoSesion(P, sid, textos);   // el cierre de cada turno (Stop)
    }
    medir('después');
}
fs.rmSync(base, { recursive: true, force: true });

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
const res = {};
for (const fase of ['antes', 'después']) {
    const f = filas.filter(x => x.fase === fase), g = p => f.filter(x => x.papel === p);
    res[fase] = {
        repetida: { r1: pct(g('repetida').filter(x => x.r1).length, g('repetida').length), r3: pct(g('repetida').filter(x => x.r3).length, g('repetida').length), n: g('repetida').length },
        otra: { r1: pct(g('otra').filter(x => x.r1).length, g('otra').length), r3: pct(g('otra').filter(x => x.r3).length, g('otra').length), n: g('otra').length },
        abstencion: { pct: pct(g('sin-respuesta').filter(x => x.calla).length, g('sin-respuesta').length), n: g('sin-respuesta').length },
    };
}
if (args.includes('--json')) { process.stdout.write(JSON.stringify(res, null, 2) + '\n'); process.exit(0); }
const a = res.antes, d = res['después'], dif = (x, y) => (y - x >= 0 ? '+' : '') + (Math.round((y - x) * 10) / 10);
process.stdout.write(`Reconsolidación (X-T11)${RUIDO ? ` · agente ruidoso ${RUIDO * 100}%` : ''}\n`);
process.stdout.write(`  misma pregunta otra vez (${a.repetida.n}):  recall@1 ${a.repetida.r1}% → ${d.repetida.r1}% (${dif(a.repetida.r1, d.repetida.r1)})  recall@3 ${a.repetida.r3}% → ${d.repetida.r3}% (${dif(a.repetida.r3, d.repetida.r3)})\n`);
process.stdout.write(`  otra pregunta del hecho (${a.otra.n}):     recall@1 ${a.otra.r1}% → ${d.otra.r1}% (${dif(a.otra.r1, d.otra.r1)})  recall@3 ${a.otra.r3}% → ${d.otra.r3}% (${dif(a.otra.r3, d.otra.r3)})\n`);
process.stdout.write(`  abstención, sin respuesta (${a.abstencion.n}): ${a.abstencion.pct}% → ${d.abstencion.pct}% (${dif(a.abstencion.pct, d.abstencion.pct)})\n`);
// --fallos: lo que falla después; NUEVO si antes acertaba (lo que la reconsolidación estropeó), ARREGLADO al revés
const antesDe = new Map(filas.filter(x => x.fase === 'antes').map(x => [x.corpus + x.papel + x.q, x]));
const bien = x => x.r3 === true || x.calla === true;
if (args.includes('--fallos')) for (const x of filas.filter(x => x.fase === 'después')) {
    const a0 = antesDe.get(x.corpus + x.papel + x.q);
    if (!bien(x)) process.stdout.write(`  · [${x.papel}]${bien(a0) ? ' NUEVO' : ''} ${x.q} → esperaba ${x.espera}\n`);
    else if (!bien(a0)) process.stdout.write(`  · [${x.papel}] ARREGLADO ${x.q}\n`);
}
// --estricto (CI): aprender no puede estropear nada (ni recall@3 ni abstención bajan) y la pregunta repetida mejora
if (args.includes('--estricto')) {
    const malo = d.otra.r3 < a.otra.r3 || d.abstencion.pct < a.abstencion.pct || d.repetida.r3 < a.repetida.r3 || (!RUIDO && d.repetida.r3 <= a.repetida.r3);
    if (malo) { process.stdout.write('ESTRICTO: la reconsolidación empeora algo o no mejora la pregunta repetida\n'); process.exit(1); }
}
