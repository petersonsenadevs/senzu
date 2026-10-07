// Motor de HECHOS de Senzu: memoria determinista en CUALQUIER idioma, sin red ni modelos (devlog 098).
// Ideas tomadas de Hemispheric (dimensiones con sustitución, validez en el tiempo, deduplicación, cupos por familia,
// motivo de cada resultado) y reescritas sin Postgres, Redis ni embeddings.
// Reparto: el AGENTE (Claude o Codex) entiende el idioma y decide qué es un hecho y en qué dimensión va; este motor
// lo guarda y lo recupera siempre igual: misma entrada, misma salida, en cualquier sistema.
//   · dimensión: identificador libre normalizado («identidad.ubicacion», «preferencia.gestor-paquetes»). En las de un
//     solo valor, un valor nuevo SUSTITUYE al anterior (queda en el histórico con su fecha de fin); las familias de
//     VARIOS (objetivo, pendiente, nota…) acumulan.
//   · búsqueda: palabras con Intl.Segmenter (también japonés, chino, árabe…), sin tildes ni mayúsculas, BM25,
//     erratas por distancia de edición acotada y «claves» que el agente añade en otros idiomas para buscar entre idiomas.
// Almacén: senzu/memoria/hechos.jsonl (proyecto) y, junto a la memoria del usuario, hechos.jsonl (todos sus proyectos).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ruta, rutaMemoriaUsuario } from './lib.mjs';
export { rutaNativa } from './lib.mjs';   // para memoria.mjs: --path con C:\, C:/ o /c/ de Git Bash → el mismo almacén

export const FAMILIAS_VARIOS = /^(objetivo|pendiente|nota|hecho|enlace|aprendizaje)(\.|$)/;
export function rutaHechos(root, alcance = 'proyecto') {
    return alcance === 'usuario' ? path.join(path.dirname(rutaMemoriaUsuario()), 'hechos.jsonl') : path.join(ruta(root, 'memoria'), 'hechos.jsonl');
}

// ---------------------------------------------------------------- texto: normalizar y partir en palabras
// Sin tildes ni mayúsculas, pero SOLO los acentos que son opcionales al escribir: los combinantes latinos, griegos y
// cirílicos (U+0300–036F) y los signos vocálicos opcionales del árabe y del hebreo. Quitar TODAS las marcas (\p{M})
// rompía el devanagari, el tailandés o el bengalí, donde las vocales son marcas («भारत» → «भरत»; evaluación F4-T1).
// También fuera los invisibles (ancho cero, marcas de dirección).
export function normalizar(t) {
    return String(t || '').normalize('NFKC').toLowerCase().normalize('NFKD')
        .replace(/[̀-ًͯ-ٰٟ֑-ׇ]/g, '').replace(/[​-‏‪-‮⁠-⁩﻿]/g, '')
        .normalize('NFC').replace(/\s+/g, ' ').trim();
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
// Erratas: distancia de Damerau (la transposición «im»↔«mi» cuenta 1), por puntos de código (cualquier alfabeto) y
// acotada: como mucho 1 cambio en palabras de 4-5 letras y 2 en las más largas. Con trigramas, «quien» encajaba con
// «quieren» y «Ceráimcas» no encajaba con «ceramicas» (evaluación de F4-T1).
function distancia(a, b, max) {
    const x = [...a], y = [...b];
    if (Math.abs(x.length - y.length) > max) return max + 1;
    let prev2 = null, prev = Array.from({ length: y.length + 1 }, (_, j) => j);
    for (let i = 1; i <= x.length; i++) {
        const cur = [i]; let minFila = i;
        for (let j = 1; j <= y.length; j++) {
            const coste = x[i - 1] === y[j - 1] ? 0 : 1;
            let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + coste);
            if (prev2 && i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
            cur.push(v); if (v < minFila) minFila = v;
        }
        if (minFila > max) return max + 1;
        prev2 = prev; prev = cur;
    }
    return prev[y.length];
}
// Ninguna errata en palabras de 4 letras («todo»≈«tono», «cosa»≈«cost» eran falsos aciertos), 1 de 5 a 7, 2 desde 8.
const maxErratas = w => { const n = [...w].length; return n <= 4 ? 0 : n <= 7 ? 1 : 2; };
// Flexiones sin listas por idioma: prefijo común largo («hosted»/«hosting», «mudarme»/«mudado»,
// «ceramicassol»/«ceramicassol.es»): al menos 4 letras, el 60 % de la corta y la mitad de la larga.
function prefijoComun(a, b) {
    const x = [...a], y = [...b]; let p = 0;
    while (p < x.length && p < y.length && x[p] === y[p]) p++;
    const corta = Math.min(x.length, y.length), larga = Math.max(x.length, y.length);
    return corta >= 6 && p >= 4 && p >= 0.6 * corta && p >= 0.5 * larga;   // desde 6 letras: «quien»/«quieren» no
}

// ---------------------------------------------------------------- almacén (JSONL, cerrojo y escritura atómica)
// Robusto ante la vida real (F4-T2): BOM y CRLF; líneas cortadas o basura que no tumban la lectura y NO se pierden al
// reescribir (van a hechos.danado.jsonl); varios procesos a la vez (Claude y Codex en el mismo proyecto) con un
// cerrojo alrededor de leer-modificar-escribir; renombrado con reintentos (en Windows falla si otro proceso lee).
function leerArchivo(file) {
    let txt = '';
    try { txt = fs.readFileSync(file, 'utf8'); } catch { return { validos: [], ilegibles: [] }; }
    const validos = [], ilegibles = [];
    for (const l of txt.replace(/^﻿/, '').split(/\r?\n/)) {
        if (!l.trim()) continue;
        try { const h = JSON.parse(l); if (h && typeof h === 'object' && h.id && h.dimension) validos.push(h); else ilegibles.push(l); } catch { ilegibles.push(l); }
    }
    return { validos, ilegibles };
}
export function leerHechos(file) { return leerArchivo(file).validos; }
const dormir = ms => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { } };
function conCerrojo(file, fn) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const lock = file + '.lock', hasta = Date.now() + 8000;
    for (;;) {
        try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); break; } catch (e) {
            if (e.code !== 'EEXIST') throw e;
            try { if (Date.now() - fs.statSync(lock).mtimeMs > 10000) { fs.rmSync(lock, { force: true }); continue; } } catch { continue; }   // abandonado
            if (Date.now() > hasta) throw new Error('La memoria de hechos está ocupada por otro proceso; vuelve a intentarlo.');
            dormir(10 + Math.floor(Math.random() * 20));
        }
    }
    try { return fn(); } finally { try { fs.rmSync(lock, { force: true }); } catch { } }
}
function escribirHechos(file, lista, ilegibles = []) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (ilegibles.length) {   // lo ilegible no se pierde: se aparta para recuperarlo a mano
        const danado = path.join(path.dirname(file), 'hechos.danado.jsonl');
        let ya = ''; try { ya = fs.readFileSync(danado, 'utf8'); } catch { }
        const nuevas = ilegibles.filter(l => !ya.includes(l));
        if (nuevas.length) fs.appendFileSync(danado, nuevas.map(l => l.replace(/\r/g, '')).join('\n') + '\n');
    }
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, lista.map(h => JSON.stringify(h)).join('\n') + (lista.length ? '\n' : ''));
    try {
        for (let i = 0; ; i++) {
            try { fs.renameSync(tmp, file); return; } catch (e) {
                if (i >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) { fs.copyFileSync(tmp, file); return; }
                dormir(15);
            }
        }
    } finally { try { fs.rmSync(tmp, { force: true }); } catch { } }
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
    const k = normalizar(valor);
    const claves = [...new Set([].concat(entrada.claves || []).flatMap(c => String(c).split(',')).map(c => c.trim()).filter(Boolean))];
    // leer-modificar-escribir dentro del cerrojo: lo que otro proceso guardó entre medias no se pisa
    return conCerrojo(file, () => {
    const { validos: lista, ilegibles } = leerArchivo(file);
    const igual = lista.find(h => h.dimension === dimension && normalizar(h.valor) === k && (h.estado === 'activo' || h.estado === 'dudoso'));
    if (igual) {   // ya estaba: se suman las claves nuevas, nada más (sin duplicar)
        const antes = igual.claves || [];
        igual.claves = [...new Set([...antes, ...claves])];
        if (igual.claves.length !== antes.length || ilegibles.length) escribirHechos(file, lista, ilegibles);
        return { accion: 'ya-estaba', hecho: igual, sustituidos: [] };
    }
    const hecho = {
        id: 'h-' + crypto.createHash('sha1').update(`${dimension}|${k}|${ahora}`).digest('hex').slice(0, 8),
        dimension, valor, texto: entrada.texto ? String(entrada.texto) : undefined, claves: claves.length ? claves : undefined,
        idioma: entrada.idioma || undefined, alcance, fuente: entrada.fuente || 'usuario',
        estado: entrada.duda ? 'dudoso' : 'activo', creado: ahora,
        desde: entrada.desde || undefined, hasta: entrada.hasta || undefined,
        devlog: entrada.devlog ? String(entrada.devlog) : (entradaDelDia(root, ahora) || undefined),
        // enlaces a DIMENSIONES (no a hechos): si el valor del otro lado cambia, el enlace sigue llevando al vigente
        enlaces: (() => { const e = [...new Set([].concat(entrada.enlaces || []).flatMap(x => String(x).split(',')).map(claveDimension).filter(x => x && x !== dimension))]; return e.length ? e : undefined; })(),
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
        if (!hecho.enlaces && sustituidos.some(h => h.enlaces && h.enlaces.length)) hecho.enlaces = [...new Set(sustituidos.flatMap(h => h.enlaces || []))];   // igual con los enlaces
    }
    lista.push(JSON.parse(JSON.stringify(hecho)));
    escribirHechos(file, lista, ilegibles);
    return { accion: entrada.duda ? 'dudoso' : sustituidos.length ? 'sustituye' : 'nuevo', hecho, sustituidos };
    });
}
// Enlaza la dimensión A (su hecho vigente, en el alcance donde esté) con la dimensión B. Devuelve el hecho o null.
export function enlazarHechos(root, dimA, dimB) {
    const a = claveDimension(dimA), b = claveDimension(dimB);
    if (!a || !b || a === b) return null;
    for (const alcance of ['proyecto', 'usuario']) {
        const file = rutaHechos(root, alcance);
        if (!fs.existsSync(file)) continue;
        const h = conCerrojo(file, () => {
            const { validos: lista, ilegibles } = leerArchivo(file);
            const x = lista.filter(y => y.dimension === a && (y.estado === 'activo' || y.estado === 'dudoso')).pop();
            if (x) { x.enlaces = [...new Set([...(x.enlaces || []), b])]; escribirHechos(file, lista, ilegibles); }
            return x || null;
        });
        if (h) return h;
    }
    return null;
}
export function olvidarHecho(root, id) {
    for (const alcance of ['proyecto', 'usuario']) {
        const file = rutaHechos(root, alcance);
        if (!fs.existsSync(file)) continue;
        const h = conCerrojo(file, () => {
            const { validos: lista, ilegibles } = leerArchivo(file);
            const x = lista.find(y => y.id === id);
            if (x) { x.estado = 'invalidado'; x.invalidado = hoy(); escribirHechos(file, lista, ilegibles); }
            return x || null;
        });
        if (h) return h;
    }
    return null;
}
export function todosLosHechos(root) { return ['proyecto', 'usuario'].flatMap(a => leerHechos(rutaHechos(root, a))); }

// Palabra con peso en CUALQUIER idioma (sin listas de palabras vacías, que son de cada idioma): 4+ letras, un número,
// o kanji/katakana/hangul, donde las palabras son cortas por naturaleza (el hiragana suelto son partículas: は, が,
// に; cuenta desde 3). «el», «de», «of», «في» suman a la puntuación, pero un hecho solo cuenta si coincide al
// menos una palabra con peso.
export const palabraConPeso = w => [...w].length >= 4 || /\p{N}/u.test(w) || /[\p{Script=Han}\p{Script=Katakana}\p{Script=Hangul}]/u.test(w)
    || (/^\p{Script=Hiragana}+$/u.test(w) && [...w].length >= 3)
    || /^[bcdfghjklmnpqrstvwxz]{3}$/.test(w);   // siglas latinas sin vocales: npm, css, php, sql, ssh, dns

// Umbral a partir del cual un hecho se INYECTA solo (recuerdo-vivo) y con el que se mide la evaluación (F4).
export const UMBRAL_RECUERDO = 0.8;

// ---------------------------------------------------------------- buscar (BM25 + erratas + cupos por familia)
// historico: también lo sustituido y caducado («¿dónde vivía antes?»: lo decide el agente, que entiende la pregunta)
export function buscarHechos(root, consulta, { historico = false, limite = 8, ahora = hoy() } = {}) {
    const docs = todosLosHechos(root).filter(h => h.estado !== 'invalidado' && (historico || vigente(h, ahora) || h.estado === 'dudoso'));
    const q = [...new Set(palabras(consulta))];
    if (!docs.length || !q.length) return [];
    // De la dimensión se indexa el TEMA, no la familia: «proyecto.analitica» → «analitica». Con la familia, cualquier
    // pregunta que dijera «proyecto» rozaba todos los proyecto.* (lo destapó la batería de garantías)
    const tema = d => (d.includes('.') ? d.slice(d.indexOf('.') + 1) : d).replace(/[.-]/g, ' ');
    const toks = docs.map(h => palabras([tema(h.dimension), h.valor, h.texto, ...(h.claves || [])].filter(Boolean).join(' ')));
    const media = toks.reduce((s, t) => s + t.length, 0) / toks.length || 1;
    const df = new Map();
    for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
    // IDF suavizado: con el clásico, un término presente en TODOS los hechos vale ~0 (en una memoria pequeña pasa a
    // menudo y dejaba fuera justo lo relevante); así sigue contando algo (≈0,7) y los raros pesan más
    const idf = w => Math.log(1 + (docs.length + 1) / ((df.get(w) || 0) + 0.5));
    const qConPeso = q.filter(palabraConPeso).length;
    const hits = docs.map((h, i) => {
        const t = toks[i], tf = new Map();
        for (const w of t) tf.set(w, (tf.get(w) || 0) + 1);
        let score = 0, conPesoCoincide = false; const motivo = [], conPesoQueCoinciden = new Set();
        for (const w of q) {
            let termino = w, peso = 1;
            if (!tf.has(w)) {   // errata o variante: la palabra del hecho más parecida
                let mejor = null, dist = Infinity;
                const max = maxErratas(w);
                if (max > 0) for (const d of tf.keys()) { const x = distancia(w, d, max); if (x < dist) { dist = x; mejor = d; } }
                if (mejor && dist <= max) { termino = mejor; peso = dist === 1 ? 0.75 : 0.55; motivo.push(`${w}≈${mejor}`); }
                else {
                    const flex = [...tf.keys()].find(d => prefijoComun(w, d));
                    if (!flex) continue;
                    termino = flex; peso = 0.8; motivo.push(`${w}~${flex}`);
                }
            } else motivo.push(w);
            const f = tf.get(termino);
            const conPeso = palabraConPeso(termino);
            // las palabras sin peso («es», «el», «of») suman poco: acompañan, pero no deciden el orden
            score += peso * (conPeso ? 1 : 0.3) * idf(termino) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * t.length / media));
            if (conPeso) { conPesoCoincide = true; conPesoQueCoinciden.add(termino); }
        }
        // Relación DÉBIL: la pregunta tiene 3+ palabras con peso y solo coincide una. No se descarta (una regla de
        // cobertura que lo hacía hundía el recuerdo del 98,5 % al 78,8 %: las palabras de pregunta también tienen
        // peso), pero se marca para que el agente, que sí entiende el sentido, decida si viene al caso (F4-T4).
        const debil = qConPeso >= 3 && conPesoQueCoinciden.size === 1;
        return { hecho: h, puntuacion: conPesoCoincide ? +score.toFixed(3) : 0, motivo, debil, solo: debil ? [...conPesoQueCoinciden][0] : undefined };
    }).filter(x => x.puntuacion > 0);
    // Preguntando por el PASADO (lo decide el agente con --historico): la historia de cada dimensión encontrada entra
    // entera y lo sustituido va delante («¿dónde vivía antes?» encuentra «Valencia» por «mudado» y trae «Málaga»)
    if (historico) {
        const mejorPorDim = new Map();
        for (const x of hits) mejorPorDim.set(x.hecho.dimension, Math.max(mejorPorDim.get(x.hecho.dimension) || 0, x.puntuacion));
        const yaEsta = new Set(hits.map(x => x.hecho.id));
        for (const h of docs) if (mejorPorDim.has(h.dimension) && !yaEsta.has(h.id)) hits.push({ hecho: h, puntuacion: 0, motivo: [`historia de ${h.dimension}`] });
        for (const x of hits) if (mejorPorDim.has(x.hecho.dimension)) x.puntuacion = +(mejorPorDim.get(x.hecho.dimension) * (vigente(x.hecho, ahora) ? 1 : 1.05)).toFixed(3);
    }
    hits.sort((a, b) => b.puntuacion - a.puntuacion || (b.hecho.creado || '').localeCompare(a.hecho.creado || ''));
    // Expansión de UN salto por los enlaces (F6-T1): de los 3 mejores, lo que está enlazado a su dimensión (en los dos
    // sentidos), con su valor vigente, como mucho 2 y marcado «vía enlace»
    const yaEnHits = new Set(hits.map(x => x.hecho.id));
    const porDimension = d => docs.filter(h => h.dimension === d && (historico ? h.estado !== 'invalidado' : vigente(h, ahora)));
    let presupuesto = 2;
    for (const padre of hits.slice(0, 3)) {
        if (presupuesto <= 0) break;
        const destinos = new Set([...(padre.hecho.enlaces || []), ...docs.filter(h => (h.enlaces || []).includes(padre.hecho.dimension)).map(h => h.dimension)]);
        for (const d of destinos) {
            for (const h of porDimension(d)) {
                if (presupuesto <= 0 || yaEnHits.has(h.id)) continue;
                hits.push({ hecho: h, puntuacion: +(padre.puntuacion * 0.7).toFixed(3), motivo: [`vía enlace con ${padre.hecho.dimension}`], via: padre.hecho.dimension });
                yaEnHits.add(h.id); presupuesto--;
            }
        }
    }
    hits.sort((a, b) => b.puntuacion - a.puntuacion || (b.hecho.creado || '').localeCompare(a.hecho.creado || ''));
    return conCupos(hits, limite, x => familia(x.hecho.dimension)).map(x => ({ ...x,
        motivo: (x.via ? `vía enlace con ${x.via}` : `coincide: ${x.motivo.join(', ')}`) + (x.hecho.estado === 'sustituido' ? ` · ya no vigente (sustituido el ${String(x.hecho.hasta || '').slice(0, 10)})` : '')
            + (x.hecho.estado === 'dudoso' ? ' · dudoso (el usuario no lo afirmó del todo)' : '')
            + (x.debil ? ` · relación débil (solo coincide «${x.solo}»: úsalo solo si de verdad viene al caso)` : '') }));
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
        puntuacion: x.puntuacion, debil: !!x.debil,
    }));
    const vistos = new Set();
    const dl = buscarEnDevlog(root, consulta, limite)
        .sort((a, b) => (b.clase === 'memoria') - (a.clase === 'memoria'))   // primero lo vigente (MEMORIA.md)
        .filter(r => { const d = (/\bD-\d+\b/.exec(r.fragmento || '') || [])[0]; if (!d) return true; if (vistos.has(d)) return false; vistos.add(d); return true; })
        .map(r => ({ fuente: r.clase === 'memoria' ? 'memoria' : 'devlog', id: r.num ? `${r.clase === 'memoria' ? 'MEMORIA' : r.num}` : r.archivo,
            texto: String(r.fragmento || r.titulo || '').trim(), motivo: `${r.titulo}${r.seccion && r.seccion !== r.titulo ? ' § ' + r.seccion : ''}${r.sustituida ? ' · sustituida' : ''}`,
            ver: r.num || null, archivo: r.archivo, puntuacion: Number(r.puntos) || 0 }));
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
