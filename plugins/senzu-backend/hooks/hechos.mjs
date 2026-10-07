// Motor de HECHOS de Senzu: memoria determinista en CUALQUIER idioma, sin red ni modelos (devlog 098).
// Ideas tomadas de Hemispheric (dimensiones con sustitución, validez en el tiempo, deduplicación, cupos por familia,
// motivo de cada resultado) y reescritas sin Postgres, Redis ni embeddings.
// Reparto: el AGENTE (Claude o Codex) entiende el idioma y decide qué es un hecho y en qué dimensión va; este motor
// lo guarda y lo recupera siempre igual: misma entrada, misma salida, en cualquier sistema.
//   · dimensión: identificador libre normalizado («identidad.ubicacion», «preferencia.gestor-paquetes»). En las de un
//     solo valor, un valor nuevo SUSTITUYE al anterior (queda en el histórico con su fecha de fin); las familias de
//     VARIOS (objetivo, pendiente, nota…) acumulan.
//   · búsqueda: palabras con Intl.Segmenter (también japonés, chino, árabe…), sin tildes ni mayúsculas, BM25,
//     erratas por trigramas y «claves» que el agente añade en otros idiomas para buscar entre idiomas.
// Almacén: senzu/memoria/hechos.jsonl (proyecto) y, junto a la memoria del usuario, hechos.jsonl (todos sus proyectos).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ruta, rutaMemoriaUsuario } from './lib.mjs';

export const FAMILIAS_VARIOS = /^(objetivo|pendiente|nota|hecho|enlace|aprendizaje)(\.|$)/;
export function rutaHechos(root, alcance = 'proyecto') {
    return alcance === 'usuario' ? path.join(path.dirname(rutaMemoriaUsuario()), 'hechos.jsonl') : path.join(ruta(root, 'memoria'), 'hechos.jsonl');
}

// ---------------------------------------------------------------- texto: normalizar y partir en palabras
export function normalizar(t) {
    return String(t || '').normalize('NFKC').toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC').replace(/\s+/g, ' ').trim();
}
const SEG = new Intl.Segmenter(undefined, { granularity: 'word' });
export function palabras(t) {
    const out = [];
    for (const s of SEG.segment(normalizar(t))) if (s.isWordLike && /[\p{L}\p{N}]/u.test(s.segment)) out.push(s.segment);
    return out;
}
export function claveDimension(d) {
    return normalizar(d).replace(/[\s_/]+/g, '-').replace(/[^\p{L}\p{N}.-]/gu, '').replace(/-+/g, '-').replace(/\.{2,}/g, '.').replace(/^[.-]+|[.-]+$/g, '');
}
const familia = dim => dim.split('.')[0];
const trigramas = w => { const s = ` ${w} `; const out = new Set(); for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3)); return out; };
function parecido(a, b) {   // Dice sobre trigramas: 1 = igual. Sirve en cualquier alfabeto
    const A = trigramas(a), B = trigramas(b); let c = 0;
    for (const x of A) if (B.has(x)) c++;
    return (2 * c) / (A.size + B.size);
}

// ---------------------------------------------------------------- almacén (JSONL, escritura atómica)
export function leerHechos(file) {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8'); } catch { return []; }
    return txt.split(/\r?\n/).filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function escribirHechos(file, lista) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, lista.map(h => JSON.stringify(h)).join('\n') + (lista.length ? '\n' : ''));
    fs.renameSync(tmp, file);
}
const hoy = () => new Date().toISOString();
export function vigente(h, ahora = hoy()) {
    return h.estado === 'activo' && (!h.desde || h.desde <= ahora) && (!h.hasta || h.hasta > ahora);
}

// La entrada del devlog del día (la de número más alto): el hecho apunta a la historia de por qué se guardó.
// Carpetas del devlog en fecha LOCAL (AAAA-MM-DD), como las crea la skill devlog.
function fechaLocal(iso) { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function entradaDelDia(root, ahora = hoy()) {
    let nombres = [];
    try { nombres = fs.readdirSync(path.join(ruta(root, 'devlog'), fechaLocal(ahora))); } catch { return null; }
    const nums = nombres.map(n => (/^(\d{3,})-.+\.md$/.exec(n) || [])[1]).filter(Boolean).sort();
    return nums.length ? nums[nums.length - 1] : null;
}

// ---------------------------------------------------------------- guardar, olvidar
// Devuelve { accion: 'nuevo' | 'ya-estaba' | 'sustituye' | 'dudoso', hecho, sustituidos }
export function guardarHecho(root, entrada, { ahora = hoy() } = {}) {
    const dimension = claveDimension(entrada.dimension);
    const valor = String(entrada.valor || '').trim();
    if (!dimension || !valor) throw new Error('Hace falta dimension y valor');
    const alcance = entrada.alcance === 'usuario' ? 'usuario' : 'proyecto';
    const file = rutaHechos(root, alcance);
    const lista = leerHechos(file);
    const k = normalizar(valor);
    const claves = [...new Set([].concat(entrada.claves || []).flatMap(c => String(c).split(',')).map(c => c.trim()).filter(Boolean))];
    const igual = lista.find(h => h.dimension === dimension && normalizar(h.valor) === k && (h.estado === 'activo' || h.estado === 'dudoso'));
    if (igual) {   // ya estaba: se suman las claves nuevas, nada más (sin duplicar)
        const antes = igual.claves || [];
        igual.claves = [...new Set([...antes, ...claves])];
        if (igual.claves.length !== antes.length) escribirHechos(file, lista);
        return { accion: 'ya-estaba', hecho: igual, sustituidos: [] };
    }
    const hecho = {
        id: 'h-' + crypto.createHash('sha1').update(`${dimension}|${k}|${ahora}`).digest('hex').slice(0, 8),
        dimension, valor, texto: entrada.texto ? String(entrada.texto) : undefined, claves: claves.length ? claves : undefined,
        idioma: entrada.idioma || undefined, alcance, fuente: entrada.fuente || 'usuario',
        estado: entrada.duda ? 'dudoso' : 'activo', creado: ahora,
        desde: entrada.desde || undefined, hasta: entrada.hasta || undefined,
        devlog: entrada.devlog ? String(entrada.devlog) : (entradaDelDia(root, ahora) || undefined),
    };
    const sustituidos = [];
    if (!entrada.duda && !FAMILIAS_VARIOS.test(dimension)) {
        for (const h of lista) if (h.dimension === dimension && h.estado === 'activo') {
            h.estado = 'sustituido'; h.hasta = h.hasta && h.hasta < (hecho.desde || ahora) ? h.hasta : (hecho.desde || ahora); h.sustituido_por = hecho.id;
            sustituidos.push(h);
        }
        if (sustituidos.length) hecho.sustituye = sustituidos.map(h => h.id);
        // Sin claves propias hereda las del que sustituye: describen la dimensión («idioma», «language»), y sin
        // ellas el valor nuevo dejaría de encontrarse desde otro idioma
        if (!hecho.claves && sustituidos.some(h => h.claves && h.claves.length)) hecho.claves = [...new Set(sustituidos.flatMap(h => h.claves || []))];
    }
    lista.push(JSON.parse(JSON.stringify(hecho)));
    escribirHechos(file, lista);
    return { accion: entrada.duda ? 'dudoso' : sustituidos.length ? 'sustituye' : 'nuevo', hecho, sustituidos };
}
export function olvidarHecho(root, id) {
    for (const alcance of ['proyecto', 'usuario']) {
        const file = rutaHechos(root, alcance), lista = leerHechos(file);
        const h = lista.find(x => x.id === id);
        if (h) { h.estado = 'invalidado'; h.invalidado = hoy(); escribirHechos(file, lista); return h; }
    }
    return null;
}
export function todosLosHechos(root) { return ['proyecto', 'usuario'].flatMap(a => leerHechos(rutaHechos(root, a))); }

// ---------------------------------------------------------------- buscar (BM25 + erratas + cupos por familia)
// historico: también lo sustituido y caducado («¿dónde vivía antes?»: lo decide el agente, que entiende la pregunta)
export function buscarHechos(root, consulta, { historico = false, limite = 8, ahora = hoy() } = {}) {
    const docs = todosLosHechos(root).filter(h => h.estado !== 'invalidado' && (historico || vigente(h, ahora) || h.estado === 'dudoso'));
    const q = [...new Set(palabras(consulta))];
    if (!docs.length || !q.length) return [];
    const toks = docs.map(h => palabras([h.dimension.replace(/[.-]/g, ' '), h.valor, h.texto, ...(h.claves || [])].filter(Boolean).join(' ')));
    const media = toks.reduce((s, t) => s + t.length, 0) / toks.length || 1;
    const df = new Map();
    for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
    const idf = w => Math.log(1 + (docs.length - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));
    const hits = docs.map((h, i) => {
        const t = toks[i], tf = new Map();
        for (const w of t) tf.set(w, (tf.get(w) || 0) + 1);
        let score = 0; const motivo = [];
        for (const w of q) {
            let termino = w, peso = 1;
            if (!tf.has(w)) {   // errata o variante: la palabra del hecho más parecida
                let mejor = null, sim = 0;
                if ([...w].length >= 4) for (const d of tf.keys()) { const s = parecido(w, d); if (s > sim) { sim = s; mejor = d; } }
                if (!mejor || sim < 0.6) continue;
                termino = mejor; peso = sim * 0.8; motivo.push(`${w}≈${mejor}`);
            } else motivo.push(w);
            const f = tf.get(termino);
            score += peso * idf(termino) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * t.length / media));
        }
        return { hecho: h, puntuacion: +score.toFixed(3), motivo };
    }).filter(x => x.puntuacion > 0).sort((a, b) => b.puntuacion - a.puntuacion || (b.hecho.creado || '').localeCompare(a.hecho.creado || ''));
    return conCupos(hits, limite, x => familia(x.hecho.dimension)).map(x => ({ ...x,
        motivo: `coincide: ${x.motivo.join(', ')}` + (x.hecho.estado === 'sustituido' ? ` · ya no vigente (sustituido el ${String(x.hecho.hasta || '').slice(0, 10)})` : '')
            + (x.hecho.estado === 'dudoso' ? ' · dudoso (el usuario no lo afirmó del todo)' : '') }));
}
// Reparto por turnos entre familias: que un tipo de recuerdo no se coma todo el espacio
function conCupos(lista, limite, fam) {
    const grupos = new Map();
    for (const x of lista) { const f = fam(x); if (!grupos.has(f)) grupos.set(f, []); grupos.get(f).push(x); }
    const out = [];
    while (out.length < limite && [...grupos.values()].some(g => g.length)) for (const g of grupos.values()) if (g.length && out.length < limite) out.push(g.shift());
    return out;
}

// ---------------------------------------------------------------- recuerdo UNIFICADO: hechos + MEMORIA.md + devlog
// Una consulta, las tres memorias: los hechos con este motor (cualquier idioma) y las decisiones y entradas con el
// buscador del devlog (buscar.mjs --json). Cada resultado dice de dónde sale («hecho», «memoria», «devlog») y por qué;
// se reparten por turnos entre fuentes (las puntuaciones de motores distintos no se comparan) y una decisión que
// sale a la vez de MEMORIA.md y de su entrada del devlog cuenta una sola vez (gana la de MEMORIA: es la vigente).
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export function rutaBuscador(root) {
    const c = [process.env.SENZU_BUSCADOR, path.join(AQUI, '..', 'skills', 'devlog', 'scripts', 'buscar.mjs'),
        path.join(root, '.claude', 'skills', 'devlog', 'scripts', 'buscar.mjs'), path.join(root, '.agents', 'skills', 'devlog', 'scripts', 'buscar.mjs')].filter(Boolean);
    return c.find(f => fs.existsSync(f)) || null;
}
function buscarEnDevlog(root, consulta, limite) {
    const b = rutaBuscador(root);
    if (!b) return [];
    try {
        const r = spawnSync(process.execPath, [b, consulta, '--json', '--max', String(limite)], { cwd: root, encoding: 'utf8', timeout: 8000 });
        return (JSON.parse(r.stdout || '{}').resultados || []);
    } catch { return []; }
}
export function recuerdo(root, consulta, { limite = 6, historico = false } = {}) {
    const hechos = buscarHechos(root, consulta, { historico, limite }).map(x => ({
        fuente: 'hecho', id: x.hecho.id, texto: `[${x.hecho.dimension}] ${x.hecho.valor}`, motivo: x.motivo, ver: x.hecho.devlog || null, hecho: x.hecho,
    }));
    const vistos = new Set();
    const dl = buscarEnDevlog(root, consulta, limite)
        .sort((a, b) => (b.clase === 'memoria') - (a.clase === 'memoria'))   // primero lo vigente (MEMORIA.md)
        .filter(r => { const d = (/\bD-\d+\b/.exec(r.fragmento || '') || [])[0]; if (!d) return true; if (vistos.has(d)) return false; vistos.add(d); return true; })
        .map(r => ({ fuente: r.clase === 'memoria' ? 'memoria' : 'devlog', id: r.num ? `${r.clase === 'memoria' ? 'MEMORIA' : r.num}` : r.archivo,
            texto: String(r.fragmento || r.titulo || '').trim(), motivo: `${r.titulo}${r.seccion && r.seccion !== r.titulo ? ' § ' + r.seccion : ''}${r.sustituida ? ' · sustituida' : ''}`,
            ver: r.num || null, archivo: r.archivo }));
    const grupos = [hechos, dl.filter(x => x.fuente === 'memoria'), dl.filter(x => x.fuente === 'devlog')];
    const out = [];
    while (out.length < limite && grupos.some(g => g.length)) for (const g of grupos) if (g.length && out.length < limite) out.push(g.shift());
    return out;
}

// ---------------------------------------------------------------- coherencia con MEMORIA.md
// Si un hecho se sustituyó (el stack pasó de «Laravel 10» a «Laravel 11») y una decisión VIGENTE de MEMORIA.md
// aún cita el valor viejo (y no el nuevo), la decisión puede haberse quedado obsoleta: se avisa con su D-xxx.
// Sin falsos avisos: solo valores con peso (una palabra de 4+ letras, un número o un nombre propio) y como
// secuencia de palabras completas, no como trozo de otra palabra.
const conPeso = v => palabras(v).some(w => [...w].length >= 4 || /\p{N}/u.test(w)) || /\p{Lu}/u.test(String(v));
function contiene(lineaToks, valorToks) {
    if (!valorToks.length) return false;
    for (let i = 0; i + valorToks.length <= lineaToks.length; i++) if (valorToks.every((w, j) => lineaToks[i + j] === w)) return true;
    return false;
}
export function decisionesObsoletas(root) {
    let mem = '';
    try { mem = fs.readFileSync(path.join(ruta(root, 'devlog'), 'MEMORIA.md'), 'utf8'); } catch { return []; }
    const vigentes = (/^##\s+Decisiones vigentes\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(mem.replace(/\r/g, '')) || [])[1] || '';
    const lineas = vigentes.split('\n').map(l => /^\s*[-*]\s+(D-\d+)\s*·\s*(.*)$/.exec(l)).filter(Boolean).map(m => ({ id: m[1], texto: m[2], toks: palabras(m[2]) }));
    if (!lineas.length) return [];
    const todos = todosLosHechos(root), porId = new Map(todos.map(h => [h.id, h]));
    const avisos = [], vistos = new Set();
    for (const viejo of todos.filter(h => h.estado === 'sustituido' && conPeso(h.valor))) {
        const nuevo = porId.get(viejo.sustituido_por);
        if (!nuevo || nuevo.estado !== 'activo') continue;
        const tv = palabras(viejo.valor), tn = palabras(nuevo.valor);
        if (contiene(tn, tv)) continue;   // el nuevo PRECISA al viejo («Hetzner» → «Hetzner Cloud»): no lo contradice
        for (const d of lineas) if (contiene(d.toks, tv) && !contiene(d.toks, tn) && !vistos.has(d.id + viejo.id)) {
            vistos.add(d.id + viejo.id);
            avisos.push({ decision: d.id, texto: d.texto, valorViejo: viejo.valor, valorNuevo: nuevo.valor, dimension: nuevo.dimension });
        }
    }
    return avisos;
}

// ---------------------------------------------------------------- contexto para el inicio de sesión
export function contextoHechos(root, { presupuesto = 12, ahora = hoy() } = {}) {
    const vigentes = todosLosHechos(root).filter(h => vigente(h, ahora)).sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
    return conCupos(vigentes, presupuesto, h => familia(h.dimension));
}
