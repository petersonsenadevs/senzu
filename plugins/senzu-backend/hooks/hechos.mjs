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
import { ruta, rutaMemoriaUsuario, rutaEstado } from './lib.mjs';
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

// ---------------------------------------------------------------- convención de claves (X-T3)
// El CONTENIDO puede estar en cualquier idioma; las CLAVES no: la misma cosa tiene que acabar en la misma dimensión
// (si no, «project.alojamiento» no sustituye a «proyecto.hosting» y lo viejo sigue vigente). Convención:
//   familia.tema — familia de una lista fija; tema en castellano, minúsculas, sin tildes y con guiones.
//   Lo que el agente escriba en otro idioma (project, goal, location…) se traduce solo a lo canónico.
//   --claves: minúsculas, sin repetir; el término en inglés y el del idioma del usuario. Para los temas conocidos, el
//   inglés lo pone el motor.
export const FAMILIAS = ['identidad', 'preferencia', 'proyecto', 'objetivo', 'pendiente', 'restriccion', 'nota', 'hecho', 'aprendizaje', 'enlace'];
const ALIAS_FAMILIA = {
    identity: 'identidad', identite: 'identidad', identitat: 'identidad', identita: 'identidad', identidade: 'identidad', usuario: 'identidad', user: 'identidad', persona: 'identidad', perfil: 'identidad', profile: 'identidad',
    preference: 'preferencia', preferences: 'preferencia', preferencias: 'preferencia', pref: 'preferencia', preferenz: 'preferencia', gusto: 'preferencia',
    project: 'proyecto', projet: 'proyecto', projeto: 'proyecto', progetto: 'proyecto', projekt: 'proyecto', projecte: 'proyecto',
    goal: 'objetivo', goals: 'objetivo', objective: 'objetivo', objectif: 'objetivo', obiettivo: 'objetivo', ziel: 'objetivo', meta: 'objetivo', objetivos: 'objetivo',
    todo: 'pendiente', task: 'pendiente', tasks: 'pendiente', tarea: 'pendiente', pending: 'pendiente', pendente: 'pendiente', aufgabe: 'pendiente', pendientes: 'pendiente',
    constraint: 'restriccion', constraints: 'restriccion', restriction: 'restriccion', limit: 'restriccion', limite: 'restriccion', limitacion: 'restriccion', restricao: 'restriccion', einschrankung: 'restriccion', vincolo: 'restriccion',
    note: 'nota', notes: 'nota', notiz: 'nota', fact: 'hecho', dato: 'hecho', data: 'hecho',
    learning: 'aprendizaje', learnings: 'aprendizaje', lesson: 'aprendizaje', leccion: 'aprendizaje', aprendizado: 'aprendizaje', lecon: 'aprendizaje', lektion: 'aprendizaje',
    link: 'enlace', relacion: 'enlace',
};
// Temas canónicos de lo habitual: [tema, términos en inglés que el motor añade como claves, alias en otros idiomas]
const TEMAS = [
    ['nombre', ['name'], ['name', 'nom', 'nome', 'vorname']],
    ['ubicacion', ['location', 'city', 'lives'], ['location', 'city', 'ciudad', 'residencia', 'ville', 'cidade', 'citta', 'wohnort', 'stadt', 'lugar']],
    ['idioma', ['language'], ['language', 'lang', 'langue', 'lingua', 'sprache', 'lengua']],
    ['zona-horaria', ['timezone', 'time zone'], ['timezone', 'time-zone', 'tz', 'huso-horario', 'fuseau-horaire', 'fuso-orario', 'zeitzone']],
    ['horario', ['schedule', 'working hours'], ['schedule', 'working-hours', 'hours', 'horaire', 'orario', 'arbeitszeit', 'jornada']],
    ['cliente', ['client', 'customer'], ['client', 'customer', 'kunde', 'cliente-final']],
    ['contacto-cliente', ['client contact'], ['client-contact', 'customer-contact']],
    ['stack', ['stack', 'tech stack', 'framework'], ['tech-stack', 'tecnologia', 'technology', 'framework', 'tecnologias']],
    ['hosting', ['hosting', 'host', 'server'], ['host', 'alojamiento', 'hospedaje', 'hebergement', 'hospedagem', 'servidor-web']],
    ['dominio', ['domain'], ['domain', 'domaine', 'dominio-web']],
    ['repositorio', ['repository', 'repo'], ['repository', 'repo', 'depot', 'repositorio-codigo']],
    ['pasarela-pago', ['payment gateway', 'payments'], ['payment-gateway', 'payments', 'payment', 'pagos', 'pasarela-pagos', 'pasarela', 'zahlungen', 'paiement', 'pagamento', 'pagamenti']],
    ['presupuesto', ['budget'], ['budget', 'orcamento', 'preventivo', 'coste']],
    ['plazo', ['deadline'], ['deadline', 'fecha-limite', 'echeance', 'prazo', 'scadenza', 'frist']],
    ['gestor-paquetes', ['package manager'], ['package-manager', 'gestor-de-paquetes', 'paquetes']],
    ['editor', ['editor', 'ide'], ['ide', 'editeur']],
    ['tipografia', ['font', 'typography'], ['font', 'fonts', 'typography', 'schrift']],
    ['color-marca', ['brand colour', 'brand color'], ['brand-color', 'brand-colour', 'color-de-marca', 'couleur-marque', 'cor-da-marca', 'markenfarbe']],
    ['analitica', ['analytics'], ['analytics', 'analitica-web', 'analyse']],
    ['lanzamiento', ['launch', 'release'], ['launch', 'release', 'lancement', 'lancamento', 'lancio']],
    ['tests', ['tests', 'testing'], ['test', 'testing', 'pruebas', 'tests-automaticos']],
];
const TEMA_ALIAS = new Map();
for (const [tema, , alias] of TEMAS) { TEMA_ALIAS.set(tema, tema); for (const a of alias) if (!TEMA_ALIAS.has(a)) TEMA_ALIAS.set(a, tema); }
const INGLES_DE = new Map(TEMAS.map(([t, en]) => [t, en]));
// Devuelve { dimension, cambios: [«project → proyecto»…] } o lanza un error claro si la familia no es de la lista
export function dimensionConvencional(d) {
    const k = claveDimension(d);
    const i = k.indexOf('.');
    if (i <= 0 || i === k.length - 1) throw new Error(`Dimensión «${d}»: tiene que ser familia.tema (familias: ${FAMILIAS.join(', ')}).`);
    let fam = k.slice(0, i), tema = k.slice(i + 1);
    const cambios = [];
    if (!FAMILIAS.includes(fam)) {
        const alias = ALIAS_FAMILIA[fam];
        if (!alias) {
            const cerca = FAMILIAS.map(f => [f, distancia(fam, f, 3)]).sort((a, b) => a[1] - b[1])[0];
            throw new Error(`Familia «${fam}» fuera de la convención. Usa una de: ${FAMILIAS.join(', ')}${cerca[1] <= 3 ? ` (¿«${cerca[0]}»?)` : ''}.`);
        }
        cambios.push(`${fam} → ${alias}`); fam = alias;
    }
    const canon = TEMA_ALIAS.get(tema);
    let original = null;
    if (canon && canon !== tema) { cambios.push(`${tema} → ${canon}`); original = tema.replace(/-/g, ' '); tema = canon; }
    // la palabra que usó el agente («ciudad») no se pierde: va a las claves, así se sigue encontrando por ella
    return { dimension: `${fam}.${tema}`, cambios, original };
}
// Para BUSCAR por dimensión (resolver, enlazar): la forma convencional si la tiene; si no, tal cual (lo viejo)
const dimensionO = d => { try { return dimensionConvencional(d).dimension; } catch { return claveDimension(d); } };
// Claves con la convención: minúsculas, espacios simples, sin repetir (lo que normaliza igual es lo mismo),
// como mucho 16; y los términos en inglés de los temas conocidos.
export function clavesConvencionales(claves, dimension) {
    const tema = dimension.slice(dimension.indexOf('.') + 1);
    // (la palabra del tema SÍ se queda si el agente la puso: repetirla le dice al buscador que el hecho trata de eso,
    // frente a otro que solo lo menciona; quitarla hundía «¿quién es el cliente?» bajo «contacto del cliente»)
    const vistas = new Set(), out = [];
    for (const c of [].concat(claves || []).flatMap(x => String(x).split(',')).concat(INGLES_DE.get(tema) || [])) {
        const v = String(c).toLocaleLowerCase().replace(/\s+/g, ' ').trim();
        const n = normalizar(v);
        if (!v || vistas.has(n)) continue;
        vistas.add(n); out.push(v);
    }
    return out.slice(0, 16);
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
// (X-T8, medido y descartado: subir a 10 letras el umbral de 2 erratas y no aceptar cambios solo en la última letra
// bajaba el recuerdo en los dos corpus sin mejorar la abstención)
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
function conCerrojo(file, fn, espera = 8000) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const lock = file + '.lock', hasta = Date.now() + espera;
    for (;;) {
        try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); break; } catch (e) {
            // EPERM/EACCES/EBUSY: en Windows, crear el cerrojo mientras otro lo está borrando; es «ocupado», no un error
            if (!['EEXIST', 'EPERM', 'EACCES', 'EBUSY'].includes(e.code)) throw e;
            if (e.code !== 'EEXIST') { if (Date.now() > hasta) throw e; dormir(5); continue; }
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
    const valor = String(entrada.valor || '').trim();
    if (!claveDimension(entrada.dimension || '') || !valor) throw new Error('Hace falta dimension y valor');
    const conv = dimensionConvencional(entrada.dimension);   // X-T3: la misma clave para lo mismo, en cualquier idioma
    const dimension = conv.dimension;
    const alcance = entrada.alcance === 'usuario' ? 'usuario' : 'proyecto';
    const file = rutaHechos(root, alcance);
    const k = normalizar(valor);
    const propias = [].concat(entrada.claves || []).flatMap(c => String(c).split(',')).map(c => c.trim()).filter(Boolean);
    const claves = clavesConvencionales(conv.original ? [...propias, conv.original] : propias, dimension);
    // leer-modificar-escribir dentro del cerrojo: lo que otro proceso guardó entre medias no se pisa
    return conCerrojo(file, () => {
    const { validos: lista, ilegibles } = leerArchivo(file);
    const fuente = FUENTES.includes(entrada.fuente) ? entrada.fuente : 'usuario';
    const igual = lista.find(h => h.dimension === dimension && normalizar(h.valor) === k && (h.estado === 'activo' || h.estado === 'dudoso'));
    if (igual) {   // ya estaba: se suman las claves nuevas (sin duplicar); si ahora lo AFIRMA el usuario, sube de confianza
        const antes = JSON.stringify(igual);
        igual.claves = [...new Set([...(igual.claves || []), ...claves])];
        if (!igual.claves.length) delete igual.claves;
        if (fuente === 'usuario' && igual.fuente !== 'usuario') { igual.fuente = 'usuario'; igual.confirmado = ahora; }
        const sustituidos = [];
        if (igual.estado === 'dudoso' && !entrada.duda) {   // «creo que…» y luego lo afirma: deja de ser dudoso
            igual.estado = 'activo'; igual.confirmado = ahora;
            if (!FAMILIAS_VARIOS.test(dimension)) sustituidos.push(...sustituir(lista, dimension, igual, ahora));
        }
        if (JSON.stringify(igual) !== antes || ilegibles.length) escribirHechos(file, lista, ilegibles);
        return { accion: sustituidos.length ? 'sustituye' : 'ya-estaba', hecho: igual, sustituidos, avisos: [] };
    }
    const hecho = {
        id: 'h-' + crypto.createHash('sha1').update(`${dimension}|${k}|${ahora}`).digest('hex').slice(0, 8),
        dimension, valor, texto: entrada.texto ? String(entrada.texto) : undefined, claves: claves.length ? claves : undefined,
        idioma: entrada.idioma || undefined, alcance, fuente,
        estado: entrada.duda ? 'dudoso' : 'activo', creado: ahora,
        desde: entrada.desde || undefined, hasta: entrada.hasta || undefined,
        devlog: entrada.devlog ? String(entrada.devlog) : (entradaDelDia(root, ahora) || undefined),
        // enlaces a DIMENSIONES (no a hechos): si el valor del otro lado cambia, el enlace sigue llevando al vigente
        enlaces: (() => { const e = [...new Set([].concat(entrada.enlaces || []).flatMap(x => String(x).split(',')).map(x => { try { return dimensionConvencional(x).dimension; } catch { return claveDimension(x); } }).filter(x => x && x !== dimension))]; return e.length ? e : undefined; })(),
    };
    const sustituidos = [];
    if (!entrada.duda && !FAMILIAS_VARIOS.test(dimension)) {
        sustituidos.push(...sustituir(lista, dimension, hecho, ahora));
        // Sin claves propias hereda las del que sustituye: describen la dimensión («idioma», «language»), y sin
        // ellas el valor nuevo dejaría de encontrarse desde otro idioma
        if (!propias.length && sustituidos.some(h => h.claves && h.claves.length)) hecho.claves = clavesConvencionales([...(hecho.claves || []), ...sustituidos.flatMap(h => h.claves || [])], dimension);
        if (!hecho.enlaces && sustituidos.some(h => h.enlaces && h.enlaces.length)) hecho.enlaces = [...new Set(sustituidos.flatMap(h => h.enlaces || []))];   // igual con los enlaces
    }
    // Avisos (no bloquean: decide el agente, que entiende el sentido): lo mismo dicho de otra manera en la familia, y
    // otro valor vigente de la MISMA dimensión que este no sustituye (una duda frente a lo afirmado, u otro alcance)
    const otroAlcance = leerHechos(rutaHechos(root, alcance === 'usuario' ? 'proyecto' : 'usuario'));
    const vigentesAhora = [...lista, ...otroAlcance].filter(h => h.id !== hecho.id && (h.estado === 'activo' || h.estado === 'dudoso') && vigente(h, ahora));
    const avisos = [...avisosAlGuardar(hecho, vigentesAhora), ...avisosConvencion(hecho, conv, propias, vigentesAhora)];
    lista.push(JSON.parse(JSON.stringify(hecho)));
    escribirHechos(file, lista, ilegibles);
    return { accion: entrada.duda ? 'dudoso' : sustituidos.length ? 'sustituye' : 'nuevo', hecho, sustituidos, avisos };
    });
}
// Avisos de la convención (X-T3): lo que se normalizó, claves que faltan y, lo más importante, una dimensión NUEVA que
// parece otra que ya existe (comparten claves): si es el mismo dato con otro nombre, el valor viejo seguiría vigente.
function avisosConvencion(hecho, conv, propias, vigentes) {
    const avisos = [];
    const tema = hecho.dimension.slice(hecho.dimension.indexOf('.') + 1), fam = familia(hecho.dimension);
    if (conv.cambios.length) avisos.push({ tipo: 'convencion', motivo: `dimensión llevada a la convención (${conv.cambios.join(', ')})` });
    if (!INGLES_DE.has(tema) && propias.length < 2) avisos.push({ tipo: 'convencion', motivo: propias.length ? 'una sola clave: añade también el término en inglés y el del idioma del usuario' : 'sin claves: añade --claves con el término en inglés y el del idioma del usuario (así se encuentra desde cualquier idioma)' });
    if (!FAMILIAS_VARIOS.test(hecho.dimension) && !vigentes.some(h => h.dimension === hecho.dimension)) {
        const terminos = h => new Set(palabras([h.dimension.slice(h.dimension.indexOf('.') + 1).replace(/-/g, ' '), ...(h.claves || [])].join(' ')).filter(palabraConPeso));
        const mios = terminos(hecho);
        const vistos = new Set();
        for (const h of vigentes) {
            if (familia(h.dimension) !== fam || h.dimension === hecho.dimension || vistos.has(h.dimension)) continue;
            const comunes = [...terminos(h)].filter(w => mios.has(w));
            if (comunes.length >= 2) {
                vistos.add(h.dimension);
                avisos.push({ tipo: 'misma-dimension', hecho: h, motivo: `comparte «${comunes.slice(0, 3).join('», «')}» con ${h.dimension}: si es el mismo dato, guárdalo en ${h.dimension} para que sustituya al viejo` });
            }
        }
    }
    return avisos;
}
// Lo vigente de la dimensión (activo y dudoso: lo afirmado gana a la duda) pasa a sustituido por «nuevo»
function sustituir(lista, dimension, nuevo, ahora) {
    const fin = nuevo.desde || ahora, out = [];
    for (const h of lista) if (h !== nuevo && h.id !== nuevo.id && h.dimension === dimension && (h.estado === 'activo' || h.estado === 'dudoso')) {
        h.estado = 'sustituido'; h.hasta = h.hasta && h.hasta < fin ? h.hasta : fin; h.sustituido_por = nuevo.id;
        out.push(h);
    }
    if (out.length) nuevo.sustituye = [...new Set([...(nuevo.sustituye || []), ...out.map(h => h.id)])];
    return out;
}

// ---------------------------------------------------------------- procedencia, confianza y casi-duplicados (F6-T4)
// Quién lo dijo: el usuario (lo afirmó), el devlog (se decidió y quedó escrito) o el agente (lo dedujo). Pesa POCO
// en el orden (desempata y baja lo deducido, no lo esconde) y se dice en el motivo. Lo dudoso pesa algo menos.
export const FUENTES = ['usuario', 'devlog', 'agente'];
const PESO_FUENTE = { usuario: 1, devlog: 0.95, agente: 0.9 };
export const pesoConfianza = h => (PESO_FUENTE[h.fuente] || 1) * (h.estado === 'dudoso' ? 0.85 : 1);

// ---------------------------------------------------------------- relevancia por uso y enfriamiento (F6-T5)
// Un USO es que el hecho llegue de verdad al agente (recuerdo-vivo, memoria-archivo, --buscar, --recordar); lo que
// se inyecta al iniciar cada sesión no cuenta (lo inflaría todo por igual). Lo usado sube un poco (hasta ×1,12,
// logarítmico: los primeros usos cuentan más) y lo que lleva más de 90 días sin usarse se enfría despacio hasta
// ×0,9 al año. Suave a propósito: reordena casi empates; no esconde un hecho viejo que de verdad viene al caso.
export const DIAS_TEMPLADO = 90;
export function pesoUso(h, ahora = hoy()) {
    const ref = Date.parse(h.ultimo_uso || h.creado || ahora), dias = Math.max(0, (Date.parse(ahora) - ref) / 864e5);
    const enfria = dias <= DIAS_TEMPLADO ? 1 : Math.max(0.9, 1 - 0.1 * (dias - DIAS_TEMPLADO) / 365);
    return enfria * (1 + Math.min(0.12, 0.04 * Math.log2(1 + (Number(h.usos) || 0))));
}
// Apunta un uso de cada id (una vez por llamada aunque se repita). Nunca rompe a quien lo llama: si el almacén está
// ocupado o es de solo lectura, el uso se pierde y ya está.
export function anotarUso(root, ids, { ahora = hoy() } = {}) {
    const quedan = new Set([].concat(ids || []).filter(Boolean));
    let n = 0;
    for (const alcance of ['proyecto', 'usuario']) {
        if (!quedan.size) break;
        const file = rutaHechos(root, alcance);
        if (!fs.existsSync(file)) continue;
        try {
            n += conCerrojo(file, () => {
                const { validos: lista, ilegibles } = leerArchivo(file);
                let k = 0;
                for (const h of lista) if (quedan.has(h.id)) { h.usos = (Number(h.usos) || 0) + 1; h.ultimo_uso = ahora; quedan.delete(h.id); k++; }
                if (k) escribirHechos(file, lista, ilegibles);
                return k;
            }, 400);   // un hook no espera: si está ocupado, ese uso se pierde
        } catch { }
    }
    return n;
}
// ---------------------------------------------------------------- reconsolidación (X-T11)
// Lo que se recupera y sirve reorganiza la memoria para la próxima vez (REALM, 2026). Aquí, sin modelo: el hecho guarda
// las palabras con que el usuario preguntó por él cuando no lo encontraba solo (`aprendidas`: palabra → confirmaciones,
// 1 a 3). Se indexan como el léxico: coincidencia exacta, peso menor que lo que el hecho dice y que crece con cada
// confirmación, y sin alargar el hecho. Con tope por hecho; de un mensaje largo no se aprende (no se sabe qué parte era).
export const MAX_APRENDIDAS = 24, MAX_PALABRAS_APRENDER = 8, PESO_APRENDIDA = [0, 0.45, 0.7, 0.85];
export function palabrasParaAprender(consulta, h, frecuentes = new Set()) {
    const ws = [...new Set(palabras(consulta))].filter(w => palabraConPeso(w) && !frecuentes.has(w));
    if (!ws.length || ws.length > MAX_PALABRAS_APRENDER) return [];
    const tema = h.dimension.includes('.') ? h.dimension.slice(h.dimension.indexOf('.') + 1) : h.dimension;
    const propias = new Set(palabras([tema.replace(/[.-]/g, ' '), h.valor, h.texto, ...(h.claves || [])].filter(Boolean).join(' ')).concat(lexicoDe(h.dimension)));
    return ws.filter(w => !propias.has(w)).slice(0, 6);
}
// Las palabras que salen en muchos mensajes del usuario son de PREGUNTA («quién», «dónde», «what», «どこ»), en el
// idioma que sea: no distinguen nada, así que ni se aprenden ni se quedan (se sacan del registro, sin listas por idioma)
export function palabrasFrecuentes(mensajes) {
    const n = new Map();
    for (const x of mensajes) for (const w of new Set(palabras(x))) n.set(w, (n.get(w) || 0) + 1);
    const tope = Math.max(3, 0.12 * mensajes.length);
    return new Set([...n].filter(([, k]) => k >= tope).map(([w]) => w));
}
export function reconsolidar(root, cambios, { frecuentes = new Set() } = {}) {
    const quedan = new Map();
    for (const c of cambios) { if (!quedan.has(c.id)) quedan.set(c.id, []); quedan.get(c.id).push(c); }
    let n = 0;
    for (const alcance of ['proyecto', 'usuario']) {
        const file = rutaHechos(root, alcance);
        if (!fs.existsSync(file)) continue;
        n += conCerrojo(file, () => {
            const { validos: lista, ilegibles } = leerArchivo(file);
            let k = 0;
            for (const h of lista) {
                if (!quedan.has(h.id) && !(h.aprendidas && Object.keys(h.aprendidas).some(w => frecuentes.has(w)))) continue;
                const a = Object.fromEntries(Object.entries(h.aprendidas || {}).filter(([w]) => !frecuentes.has(w)));
                for (const c of quedan.get(h.id) || []) {
                    if (c.mas) for (const w of palabrasParaAprender(c.mas, h, frecuentes)) a[w] = Math.min(3, (a[w] || 0) + 1);
                    if (c.menos) for (const w of new Set(palabras(c.menos))) if (a[w]) { a[w]--; if (!a[w]) delete a[w]; }
                }
                // tope: se quedan las más confirmadas (y, a igualdad, las que ya estaban)
                const orden = Object.keys(a).sort((x, y) => a[y] - a[x]).slice(0, MAX_APRENDIDAS);
                const nuevo = Object.fromEntries(orden.map(w => [w, a[w]]));
                if (JSON.stringify(nuevo) !== JSON.stringify(h.aprendidas || {})) { if (orden.length) h.aprendidas = nuevo; else delete h.aprendidas; k++; }
                quedan.delete(h.id);
            }
            if (k) escribirHechos(file, lista, ilegibles);
            return k;
        }, 2000);
    }
    return n;
}
// Lo aprendido de toda la DIMENSIÓN (también de sus valores anteriores: el vocabulario es del tema, no del valor).
// Una palabra aprendida en dos o más dimensiones no distingue («quién», «hoy»): no cuenta para ninguna.
function aprendidasPorDimension(hechos) {
    const porDim = new Map(), dims = new Map();
    for (const h of hechos) for (const [w, n] of Object.entries(h.aprendidas || {})) {
        if (!porDim.has(h.dimension)) porDim.set(h.dimension, new Map());
        const m = porDim.get(h.dimension); m.set(w, Math.max(m.get(w) || 0, n));
        if (!dims.has(w)) dims.set(w, new Set()); dims.get(w).add(h.dimension);
    }
    for (const m of porDim.values()) for (const w of [...m.keys()]) if (dims.get(w).size >= 2) m.delete(w);
    return d => porDim.get(d) || new Map();
}
// Parecido por trigramas de caracteres (Jaccard) sobre el texto normalizado: vale igual en cualquier escritura
function trigramas(t) {
    const c = [...` ${normalizar(t).replace(/\s+/g, ' ').trim()} `], s = new Set();
    for (let i = 0; i + 3 <= c.length; i++) s.add(c.slice(i, i + 3).join(''));
    return s;
}
export function parecido(a, b) {
    const x = trigramas(a), y = trigramas(b);
    if (!x.size || !y.size) return 0;
    let comun = 0; for (const t of x) if (y.has(t)) comun++;
    return comun / (x.size + y.size - comun);
}
export const UMBRAL_CASI_DUPLICADO = 0.6;
function avisosAlGuardar(hecho, vigentes) {
    const avisos = [];
    for (const h of vigentes) {
        if (h.dimension === hecho.dimension && !FAMILIAS_VARIOS.test(hecho.dimension)) {
            if (normalizar(h.valor) !== normalizar(hecho.valor)) avisos.push({ tipo: 'contradice', hecho: h,
                motivo: h.alcance !== hecho.alcance ? `en el alcance ${h.alcance} vale otra cosa` : hecho.estado === 'dudoso' ? 'lo afirmado sigue vigente: la duda no lo sustituye' : 'sigue vigente otro valor' });
        } else if (familia(h.dimension) === familia(hecho.dimension)) {
            const p = parecido(hecho.valor, h.valor);
            if (p >= UMBRAL_CASI_DUPLICADO) avisos.push({ tipo: 'casi-duplicado', hecho: h, parecido: +p.toFixed(2), motivo: `se parece un ${Math.round(p * 100)} %` });
        }
    }
    return avisos.sort((a, b) => (b.parecido || 1) - (a.parecido || 1)).slice(0, 3);
}
// ---------------------------------------------------------------- objetivos y pendientes con ciclo de vida (F6-T2)
// abierto → en curso → resuelto | abandonado, con fecha y nota. Cerrado deja de ser vigente (no se inyecta) y queda
// en el histórico. ref: id del hecho o su dimensión (el vigente de esa dimensión).
export const FAMILIAS_CICLO = /^(objetivo|pendiente)(\.|$)/;
export function cambiarProgreso(root, ref, progreso, nota, { ahora = hoy() } = {}) {
    if (!['en-curso', 'resuelto', 'abandonado'].includes(progreso)) throw new Error('Progreso: en-curso, resuelto o abandonado');
    const dim = dimensionO(ref);
    for (const alcance of ['proyecto', 'usuario']) {
        const file = rutaHechos(root, alcance);
        if (!fs.existsSync(file)) continue;
        const h = conCerrojo(file, () => {
            const { validos: lista, ilegibles } = leerArchivo(file);
            const x = lista.find(y => y.id === ref) || lista.filter(y => y.dimension === dim && y.estado === 'activo').pop();
            if (!x || !FAMILIAS_CICLO.test(x.dimension) || x.estado !== 'activo') return null;
            x.progreso = progreso;
            if (progreso === 'en-curso') x.en_curso_desde = ahora;
            else { x.estado = 'cerrado'; x.hasta = ahora; x.cerrado = ahora; if (nota) x.nota_cierre = String(nota).slice(0, 300); }
            escribirHechos(file, lista, ilegibles);
            return x;
        });
        if (h) return h;
    }
    return null;
}
// Objetivos y pendientes abiertos, LOS MÁS ANTIGUOS PRIMERO (lo que lleva tiempo abierto es lo que se olvida)
export function abiertos(root, { ahora = hoy() } = {}) {
    return todosLosHechos(root).filter(h => FAMILIAS_CICLO.test(h.dimension) && vigente(h, ahora)).sort((a, b) => (a.creado || '').localeCompare(b.creado || ''));
}

// Enlaza la dimensión A (su hecho vigente, en el alcance donde esté) con la dimensión B. Devuelve el hecho o null.
export function enlazarHechos(root, dimA, dimB) {
    const a = dimensionO(dimA), b = dimensionO(dimB);
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

// Nombres propios de la pregunta que la memoria NO conoce (X-T2). Nombre = sigla («PHP», «CI»), mayúscula por
// dentro («GitHub», «PostgreSQL»), letras con cifras («php8», «v18») o mayúscula inicial que no abre la frase
// («Playwright», «Markdown»). En escrituras sin mayúsculas no hay nada que detectar (y no se inventa). En alemán todos
// los sustantivos van en mayúscula: si la pregunta tiene dos o más con mayúscula inicial, esa pista no se usa (solo
// siglas y mayúsculas por dentro). Desconocido = ni está en lo guardado ni se parece (errata o misma raíz).
export function nombresDesconocidos(consulta, vocabulario) {
    const crudas = [];
    for (const s of SEG.segment(String(consulta || ''))) if (s.isWordLike && /\p{L}/u.test(s.segment)) crudas.push(s.segment);
    const inicial = crudas.map((w, i) => i > 0 && /^\p{Lu}\p{Ll}/u.test(w));
    const usarInicial = inicial.filter(Boolean).length < 2;
    const conocida = w => {
        if (vocabulario.has(w)) return true;
        const max = maxErratas(w);
        // para NOMBRES no vale la raíz común de las flexiones («markdown» no es «market»): igual, una errata o uno
        // dentro del otro («api» / «apis»)
        for (const v of vocabulario) if ((max && distancia(w, v, max) <= max) || (Math.min(w.length, v.length) >= 3 && (v.startsWith(w) || w.startsWith(v)))) return true;
        return false;
    };
    const out = [];
    crudas.forEach((w, i) => {
        const sigla = /^\p{Lu}{2,}\d*$/u.test(w), interior = /\p{Ll}\p{Lu}/u.test(w), cifras = /\p{L}/u.test(w) && /\d/.test(w);
        if (!(sigla || interior || cifras || (usarInicial && inicial[i]))) return;
        const n = normalizar(w);
        if (!conocida(n)) out.push(w);
    });
    return [...new Set(out)];
}

// Umbral a partir del cual un hecho se INYECTA solo (recuerdo-vivo) y con el que se mide la evaluación (F4).
export const UMBRAL_RECUERDO = 0.8;

// ---------------------------------------------------------------- buscar (BM25 + erratas + cupos por familia)
// historico: también lo sustituido y caducado («¿dónde vivía antes?»: lo decide el agente, que entiende la pregunta)
export function buscarHechos(root, consulta, { historico = false, limite = 8, ahora = hoy() } = {}) {
    const todosH = todosLosHechos(root);
    const docs = todosH.filter(h => h.estado !== 'invalidado' && (historico || vigente(h, ahora) || h.estado === 'dudoso'));
    const aprendidasDe = aprendidasPorDimension(todosH.filter(h => h.estado !== 'invalidado'));
    // con una pista temporal detectada (X-T12), la pista habla del TIEMPO, no del tema: no busca («antes» traía
    // cualquier hecho que dijera «antes de…»)
    const q = [...new Set(palabras(consulta))].filter(w => historico !== 'auto' || !PISTAS_TEMPORALES.has(w));
    if (!docs.length || !q.length) return [];
    // De la dimensión se indexa el TEMA, no la familia: «proyecto.analitica» → «analitica». Con la familia, cualquier
    // pregunta que dijera «proyecto» rozaba todos los proyecto.* (lo destapó la batería de garantías)
    const tema = d => (d.includes('.') ? d.slice(d.indexOf('.') + 1) : d).replace(/[.-]/g, ' ');
    const base = docs.map(h => palabras([tema(h.dimension), h.valor, h.texto, ...(h.claves || [])].filter(Boolean).join(' ')));
    // + el léxico multilingüe del tema (X-T8): se encuentra, pero no alarga el hecho (no lo penaliza en el orden)
    // (solo lo que el hecho no tenga ya: repetir «cliente» inflaba su frecuencia y lo subía por encima de otros)
    const lexicos = docs.map((h, i) => { const ya = new Set(base[i]); return [...new Set(lexicoDe(h.dimension))].filter(w => !ya.has(w)); });
    // + lo aprendido del uso (X-T11): como el léxico, exacto, sin alargar el hecho y con su peso según confirmaciones
    const aprend = docs.map((h, i) => { const ya = new Set(base[i].concat(lexicos[i])); return new Map([...aprendidasDe(h.dimension)].filter(([w]) => !ya.has(w))); });
    const toks = docs.map((h, i) => base[i].concat(lexicos[i], [...aprend[i].keys()]));
    const media = base.reduce((s, t) => s + t.length, 0) / base.length || 1;
    const df = new Map();
    // la rareza de cada palabra, solo con lo VIGENTE: con la historia, «hosting» contaba dos veces (el valor viejo y el
    // nuevo), valía menos y otro hecho se adelantaba (X-T12)
    const cuenta = docs.map(h => !historico || vigente(h, ahora) || h.estado === 'dudoso');
    const nVig = cuenta.filter(Boolean).length || 1;
    toks.forEach((t, i) => { if (cuenta[i]) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1); });
    // IDF suavizado: con el clásico, un término presente en TODOS los hechos vale ~0 (en una memoria pequeña pasa a
    // menudo y dejaba fuera justo lo relevante); así sigue contando algo (≈0,7) y los raros pesan más
    const idf = w => Math.log(1 + (nVig + 1) / ((df.get(w) || 0) + 0.5));
    const qConPeso = q.filter(palabraConPeso).length;
    const desconocidos = nombresDesconocidos(consulta, new Set(toks.flat()));
    const hits = docs.map((h, i) => {
        const t = toks[i], tf = new Map();
        for (const w of t) tf.set(w, (tf.get(w) || 0) + 1);
        let score = 0, conPesoCoincide = false; const motivo = [], conPesoQueCoinciden = new Set(), porAprender = new Set();
        let rescate = 0;   // X-T11: lo que suman las palabras aprendidas UNA vez
        for (const w of q) {
            let termino = w, peso = 1;
            if (!tf.has(w)) {   // errata o variante: la palabra del hecho más parecida
                let mejor = null, dist = Infinity;
                const max = maxErratas(w);
                // erratas y flexiones, solo contra lo que el hecho DICE; el léxico multilingüe coincide exacto o nada
                // («contratos» no es el portugués «contato»)
                const propias = base[i];
                if (max > 0) for (const d of new Set(propias)) { const x = distancia(w, d, max); if (x < dist) { dist = x; mejor = d; } }
                if (mejor && dist <= max) { termino = mejor; peso = dist === 1 ? 0.75 : 0.55; motivo.push(`${w}≈${mejor}`); }
                else {
                    // (medido y descartado en X-T8: excluir dominios y rutas de las flexiones bajaba el recuerdo sin
                    // mejorar la abstención)
                    const flex = propias.find(d => prefijoComun(w, d));
                    if (!flex) continue;
                    termino = flex; peso = 0.8; motivo.push(`${w}~${flex}`);
                }
            } else if (lexicos[i].includes(w)) { peso = 0.75; motivo.push(`${w} (léxico)`); }   // el concepto, no lo que el hecho dice: pesa menos
            else if (aprend[i].has(w)) { peso = PESO_APRENDIDA[aprend[i].get(w)]; motivo.push(`${w} (aprendida del uso)`); if (aprend[i].get(w) < 2) porAprender.add(w); }
            else motivo.push(w);
            const f = tf.get(termino);
            const conPeso = palabraConPeso(termino);
            // las palabras sin peso («es», «el», «of») suman poco: acompañan, pero no deciden el orden
            const suma = peso * (conPeso ? 1 : 0.3) * idf(termino) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * base[i].length / media));
            if (porAprender.has(termino)) rescate += suma; else score += suma;
            if (conPeso) { conPesoCoincide = true; conPesoQueCoinciden.add(termino); }
        }
        // Relación DÉBIL: la pregunta tiene 3+ palabras con peso y solo coincide una. No se descarta (una regla de
        // cobertura que lo hacía hundía el recuerdo del 98,5 % al 78,8 %: las palabras de pregunta también tienen
        // peso), pero se marca para que el agente, que sí entiende el sentido, decida si viene al caso (F4-T4).
        const debil = qConPeso >= 3 && conPesoQueCoinciden.size === 1;
        // Saber que no sabe (X-T2): si además la pregunta NOMBRA algo que la memoria no ha oído nunca («Playwright»,
        // «PHP», «CI»), ese roce de una palabra («pruebas», «servidor») no es la respuesta: baja por debajo del umbral
        // (no se inyecta solo; --buscar lo sigue enseñando, con el motivo)
        const nombra = debil && desconocidos.length ? desconocidos : null;
        // lo aprendido una sola vez RESCATA (trae un hecho que, si no, no saldría) pero NO ADELANTA: si el hecho ya
        // coincide por lo que dice, no suma (un «quién» aprendido no puede ganarle a otro hecho que nombra al cliente)
        const rescatado = rescate > 0 && ![...conPesoQueCoinciden].some(w => !porAprender.has(w));
        if (rescatado) score += rescate;
        let puntuacion = conPesoCoincide ? +(score * pesoConfianza(h) * pesoUso(h, ahora)).toFixed(3) : 0;
        if (nombra && puntuacion) puntuacion = +Math.min(puntuacion * 0.2, UMBRAL_RECUERDO * 0.75).toFixed(3);   // siempre bajo el umbral
        // X-T11: lo aprendido UNA vez es una pista, no una prueba: si solo coincide eso y la pregunta trae otras palabras
        // con peso que el hecho no tiene («¿qué coche tengo?» con un «tengo» aprendido), no se inyecta solo
        if (puntuacion && porAprender.size && [...conPesoQueCoinciden].every(w => porAprender.has(w)) && qConPeso > conPesoQueCoinciden.size) puntuacion = +Math.min(puntuacion * 0.5, UMBRAL_RECUERDO * 0.75).toFixed(3);
        return { hecho: h, puntuacion, motivo, debil, solo: debil ? [...conPesoQueCoinciden][0] : undefined, nombra, rescatado };
    }).filter(x => x.puntuacion > 0);
    // y en el orden, lo rescatado va DETRÁS de lo que coincide por lo que dice (sin bajar del umbral si ya lo pasaba)
    const firmes = hits.filter(x => !x.rescatado && x.puntuacion >= UMBRAL_RECUERDO).map(x => x.puntuacion);
    if (firmes.length) for (const x of hits) if (x.rescatado && x.puntuacion >= UMBRAL_RECUERDO) x.puntuacion = +Math.max(UMBRAL_RECUERDO, Math.min(x.puntuacion, Math.min(...firmes) * 0.99)).toFixed(3);
    // Garantía: en la misma dimensión, lo DUDOSO nunca puntúa por encima de lo afirmado (no puede depender de que
    // la longitud de cada hecho o el léxico cuadren)
    const afirmado = new Map();
    for (const x of hits) if (x.hecho.estado === 'activo') afirmado.set(x.hecho.dimension, Math.max(afirmado.get(x.hecho.dimension) || 0, x.puntuacion));
    for (const x of hits) if (x.hecho.estado === 'dudoso' && afirmado.has(x.hecho.dimension)) x.puntuacion = Math.min(x.puntuacion, +(afirmado.get(x.hecho.dimension) * 0.95).toFixed(3));
    // Preguntando por el PASADO (lo decide el agente con --historico): la historia de cada dimensión encontrada entra
    // entera y lo sustituido va delante («¿dónde vivía antes?» encuentra «Valencia» por «mudado» y trae «Málaga»)
    if (historico) {
        // detectado ('auto'): lo que ya no vale (también lo caducado de OTROS temas) va siempre detrás de lo vigente
        if (historico === 'auto') for (const x of hits) if (!vigente(x.hecho, ahora) && x.hecho.estado !== 'dudoso') x.puntuacion = +(x.puntuacion * 0.6).toFixed(3);
        const mejorPorDim = new Map();
        for (const x of hits) mejorPorDim.set(x.hecho.dimension, Math.max(mejorPorDim.get(x.hecho.dimension) || 0, x.puntuacion));
        const yaEsta = new Set(hits.map(x => x.hecho.id));
        for (const h of docs) if (mejorPorDim.has(h.dimension) && !yaEsta.has(h.id)) hits.push({ hecho: h, puntuacion: 0, motivo: [`historia de ${h.dimension}`] });
        // pedido (--historico): lo anterior delante; detectado en el mensaje (X-T12, 'auto'): justo detrás de lo vigente
        const atras = historico === 'auto' ? 0.98 : 1.05;
        for (const x of hits) if (mejorPorDim.has(x.hecho.dimension)) x.puntuacion = +(mejorPorDim.get(x.hecho.dimension) * (vigente(x.hecho, ahora) ? 1 : atras)).toFixed(3);
        if (historico === 'auto') {   // lo caducado de un tema sin nada vigente encontrado, detrás de todo lo vigente
            const conVigente = new Set(hits.filter(x => vigente(x.hecho, ahora) || x.hecho.estado === 'dudoso').map(x => x.hecho.dimension));
            const minVig = Math.min(...hits.filter(x => vigente(x.hecho, ahora)).map(x => x.puntuacion));
            if (isFinite(minVig)) for (const x of hits) if (!conVigente.has(x.hecho.dimension)) x.puntuacion = +Math.min(x.puntuacion, minVig * 0.97).toFixed(3);
        }
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
    // lo rescatado que no llega al umbral no ocupa sitio en el reparto: va al final, si cabe
    const flojo = x => x.rescatado && x.puntuacion < UMBRAL_RECUERDO;
    // con la historia, cada dimensión va JUNTA (lo vigente y, pegado, lo anterior): el reparto por familias no la parte
    const juntar = l => { if (!historico) return l; const g = new Map(); for (const x of l) { if (!g.has(x.hecho.dimension)) g.set(x.hecho.dimension, []); g.get(x.hecho.dimension).push(x); } return [...g.values()]; };
    const elegidos = historico
        ? conCupos(juntar(hits.filter(x => !flojo(x))), limite, g => familia(g[0].hecho.dimension)).flat().slice(0, limite)
        : conCupos(hits.filter(x => !flojo(x)), limite, x => familia(x.hecho.dimension));
    return elegidos.concat(hits.filter(flojo).slice(0, Math.max(0, limite - elegidos.length))).map(x => ({ ...x,
        motivo: (x.via ? `vía enlace con ${x.via}` : `coincide: ${x.motivo.join(', ')}`) + (x.hecho.estado === 'sustituido' ? ` · ya no vigente (sustituido el ${String(x.hecho.hasta || '').slice(0, 10)})` : '')
            + (x.hecho.estado === 'cerrado' ? ` · cerrado (${x.hecho.progreso} el ${String(x.hecho.cerrado || '').slice(0, 10)}${x.hecho.nota_cierre ? ': ' + x.hecho.nota_cierre : ''})` : '')
            + (x.hecho.progreso === 'en-curso' && x.hecho.estado === 'activo' ? ' · en curso' : '')
            + (x.hecho.estado === 'dudoso' ? ' · dudoso (el usuario no lo afirmó del todo)' : '')
            + (x.hecho.fuente === 'agente' ? ' · lo dedujo el agente (el usuario no lo dijo)' : x.hecho.fuente === 'devlog' ? ' · sacado del devlog' : '')
            + (x.debil ? ` · relación débil (solo coincide «${x.solo}»: úsalo solo si de verdad viene al caso)` : '')
            + (x.nombra ? ` · la pregunta nombra «${x.nombra.join('», «')}», que la memoria no conoce: no es la respuesta` : '') }));
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
// X-T12 · ¿pregunta por el PASADO? Pistas temporales en ~20 idiomas («antes», «solía», «used to», «früher», «以前»,
// «раньше»…). Con una, el recuerdo vivo trae también la historia de lo que encuentra (modo «auto»: lo vigente sigue
// delante y lo anterior justo detrás, marcado «ya no vigente»; quien entiende si era el pasado lo que se pedía es el
// agente). «antes del lanzamiento» también la activa: cuesta poco (lo vigente no se mueve del primer puesto).
const PISTAS_TEMPORALES = new Set(('antes anterior anteriormente antiguamente antiguo antigua solia soliamos solian originalmente inicialmente '
    + 'before previously formerly originally initially earlier anymore '
    + 'antigamente costumava costumavamos avant auparavant autrefois precedemment initialement '
    + 'fruher vorher zuvor ursprunglich damals bisher prima precedentemente inizialmente abans '
    + 'vroeger eerder voorheen wczesniej dawniej раньше прежде ранее раніше колись πριν παλια eskiden '
    + 'سابقا سابقًا בעבר पहले truoc tidigare forut').split(' '));
const PISTAS_FRASE = /\bdid( \w+)? use to\b|\b(used to|at first|in the beginning|al principio|ya no|no longer|au debut|am anfang|all'inizio|una volta|no inicio)\b|以前|之前|原来|過去|过去|前は|昔|元々|전에|예전|이전/;
export function pistaTemporal(texto) {
    return palabras(texto).some(w => PISTAS_TEMPORALES.has(w)) || PISTAS_FRASE.test(normalizar(texto));
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

// ---------------------------------------------------------------- contradicciones vigentes (X-T6)
// Lo que choca y conviene preguntar al usuario al empezar: (1) dos valores vigentes de la misma dimensión en el mismo
// alcance (una duda frente a lo afirmado); lo del proyecto frente a lo del usuario NO cuenta: es una excepción
// legítima («en este proyecto, espacios»). (2) El mismo dato guardado con dos claves (comparten 2+ términos), lo que
// la convención avisa al guardar pero puede venir de antes.
export function contradicciones(root, { ahora = hoy(), maximo = 3 } = {}) {
    const vig = todosLosHechos(root).filter(h => (h.estado === 'activo' || h.estado === 'dudoso') && (vigente(h, ahora) || h.estado === 'dudoso'));
    const out = [];
    const grupos = new Map();
    for (const h of vig) if (!FAMILIAS_VARIOS.test(h.dimension)) { const k = h.alcance + '|' + h.dimension; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(h); }
    for (const l of grupos.values()) {
        const distintos = [...new Map(l.map(h => [normalizar(h.valor), h])).values()];
        if (distintos.length > 1) out.push({ tipo: 'valores', dimension: l[0].dimension, hechos: distintos });
    }
    const terminos = h => new Set(palabras([h.dimension.slice(h.dimension.indexOf('.') + 1).replace(/-/g, ' '), ...(h.claves || [])].join(' ')).filter(palabraConPeso));
    const unicos = [...new Map(vig.filter(h => !FAMILIAS_VARIOS.test(h.dimension)).map(h => [h.dimension, h])).values()];
    for (let i = 0; i < unicos.length; i++) for (let j = i + 1; j < unicos.length; j++) {
        const a = unicos[i], b = unicos[j];
        if (familia(a.dimension) !== familia(b.dimension)) continue;
        const ta = terminos(a), comunes = [...terminos(b)].filter(w => ta.has(w));
        if (comunes.length >= 2) out.push({ tipo: 'misma-dimension', dimension: a.dimension, hechos: [a, b], comunes });
    }
    return out.slice(0, maximo);
}

// ---------------------------------------------------------------- contexto para el inicio de sesión
export function contextoHechos(root, { presupuesto = 12, ahora = hoy() } = {}) {
    // por ACTIVIDAD (lo creado o usado más recientemente primero): lo que se sigue usando no se cae del contexto
    const activo = h => [h.creado || '', h.ultimo_uso || ''].sort().pop();
    const vigentes = todosLosHechos(root).filter(h => vigente(h, ahora)).sort((a, b) => activo(b).localeCompare(activo(a)));
    return conCupos(vigentes, presupuesto, h => familia(h.dimension));
}

// ---------------------------------------------------------------- Cortex (F7-T3): la memoria entera, por zonas, para VERLA
// Zonas del cerebro (plan/design-system/cortex/MASTER.md §5): lo que se quiere conseguir, el proyecto, normas y
// decisiones, quién es el usuario y lo vivido. Con cliente, lo privado NO SE INCLUYE (no basta con ocultarlo en la
// pantalla: el archivo se manda): nada del usuario, nada deducido ni dudoso, ni aprendizajes, devlog o comandos.
export { ruta };
const ZONAS_FAMILIA = [
    [/^(objetivo|pendiente|restriccion|limite|plazo|presupuesto|meta)(\.|$)/, 'frontal'],
    [/^(identidad|preferencia|usuario|persona)(\.|$)/, 'temporal'],
    [/^(aprendizaje|nota|hecho|leccion)(\.|$)/, 'hipocampo'],
];
export function zonaDe(h) {
    if (h.alcance === 'usuario') return 'temporal';
    for (const [re, z] of ZONAS_FAMILIA) if (re.test(h.dimension)) return z;
    return 'parietal';
}
const temaDe = d => { const t = (d.includes('.') ? d.slice(d.indexOf('.') + 1) : d).replace(/[-._]+/g, ' ').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
function leerSeccion(texto, titulo) {
    const m = new RegExp('^##\\s*' + titulo + '[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))', 'mi').exec(texto);
    return m ? m[1] : '';
}
function memoriaDelProyecto(root) {
    let t = '';
    try { t = fs.readFileSync(path.join(ruta(root, 'devlog'), 'MEMORIA.md'), 'utf8').replace(/\r/g, ''); } catch { return []; }
    const decisiones = leerSeccion(t, 'Decisiones vigentes').split('\n').map(l => /^\s*[-*]\s+(D-\d+)\s*·\s*(.+?)(?:\s*·\s*ver\s+([\d,\s]+))?\s*$/.exec(l)).filter(Boolean)
        .map(m => ({ id: m[1], zona: 'occipital', tipo: 'decision', tema: m[1], valor: m[2].trim(), fuente: 'devlog', devlog: m[3] ? m[3].trim() : undefined }));
    const reglas = leerSeccion(t, 'Reglas').split('\n').map(l => /^\s*[-*]\s+(.+)$/.exec(l)).filter(Boolean)
        .map((m, i) => ({ id: `regla-${i + 1}`, zona: 'occipital', tipo: 'regla', tema: 'Regla', valor: m[1].trim(), fuente: 'devlog' }));
    return [...decisiones, ...reglas];
}
function entradasDelDevlog(root, maximo) {
    let t = '';
    try { t = fs.readFileSync(path.join(ruta(root, 'devlog'), 'INDEX.md'), 'utf8').replace(/\r/g, ''); } catch { return []; }
    return t.split('\n').map(l => /^\|\s*(\d{2,})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/.exec(l)).filter(Boolean)
        .map(m => ({ id: `devlog-${m[1]}`, zona: 'hipocampo', tipo: 'entrada', tema: `Entrada ${m[1]}`, privado: true, valor: m[3], fuente: 'devlog', devlog: m[1], creado: m[2], nota: m[4] || undefined }))
        .sort((a, b) => b.devlog.localeCompare(a.devlog, undefined, { numeric: true })).slice(0, maximo);
}
export function datosCortex(root, { cliente = false, ahora = hoy(), dias = 7, entradas = 12 } = {}) {
    const todos = todosLosHechos(root).filter(h => h.estado !== 'invalidado');
    const privado = h => h.alcance === 'usuario' || zonaDe(h) === 'temporal' || zonaDe(h) === 'hipocampo' || h.fuente === 'agente' || h.estado === 'dudoso';
    const visibles = cliente ? todos.filter(h => !privado(h)) : todos;
    const porDim = new Map();
    for (const h of visibles) { if (!porDim.has(h.dimension)) porDim.set(h.dimension, []); porDim.get(h.dimension).push(h); }
    const vigenteDe = d => (porDim.get(d) || []).filter(h => vigente(h, ahora) || h.estado === 'dudoso').pop();
    const actuales = visibles.filter(h => vigente(h, ahora) || h.estado === 'dudoso');
    const item = h => {
        const historia = FAMILIAS_VARIOS.test(h.dimension) ? [h] : (porDim.get(h.dimension) || []);
        const enlazadas = new Set([...(h.enlaces || []), ...actuales.filter(x => (x.enlaces || []).includes(h.dimension)).map(x => x.dimension)]);
        return {
            id: h.id, zona: zonaDe(h), tipo: 'hecho', privado: privado(h) || undefined, dimension: h.dimension, tema: temaDe(h.dimension), valor: h.valor,
            texto: h.texto || undefined, fuente: h.fuente || 'usuario', estado: h.estado, progreso: h.progreso || undefined,
            usos: cliente ? undefined : Number(h.usos) || 0, ultimo_uso: cliente ? undefined : h.ultimo_uso, creado: h.creado,
            desde: h.desde, hasta: h.hasta, devlog: cliente ? undefined : h.devlog,
            historia: historia.slice().sort((a, b) => String(a.desde || a.creado).localeCompare(String(b.desde || b.creado)))
                .map(x => ({ valor: x.valor, estado: x.estado, desde: x.desde || x.creado, hasta: x.hasta || undefined, nota: x.nota_cierre || undefined })),
            enlaces: [...enlazadas].map(d => vigenteDe(d)).filter(Boolean).map(x => ({ dimension: x.dimension, tema: temaDe(x.dimension), valor: x.valor, zona: zonaDe(x) })),
        };
    };
    const zonas = { frontal: [], parietal: [], occipital: [], temporal: [], hipocampo: [] };
    for (const h of actuales.sort((a, b) => String(b.ultimo_uso || b.creado).localeCompare(String(a.ultimo_uso || a.creado)))) zonas[zonaDe(h)].push(item(h));
    // con cliente, sin «ver NNN»: el devlog es interno
    zonas.occipital.push(...memoriaDelProyecto(root).map(x => (cliente ? { ...x, devlog: undefined } : x)));
    if (!cliente) zonas.hipocampo.push(...entradasDelDevlog(root, entradas));
    // qué ha cambiado: lo nuevo, lo sustituido y lo cerrado en los últimos `dias` días
    const desde = new Date(Date.parse(ahora) - dias * 864e5).toISOString(), cambios = [];
    for (const h of visibles) {
        if (h.estado === 'sustituido' && h.hasta >= desde && h.hasta <= ahora) {
            const nuevo = visibles.find(x => x.id === h.sustituido_por);
            cambios.push({ tipo: 'sustituido', privado: privado(h) || undefined, fecha: h.hasta, zona: zonaDe(h), tema: temaDe(h.dimension), antes: h.valor, ahora: nuevo ? nuevo.valor : undefined });
        } else if (h.estado === 'cerrado' && h.cerrado >= desde) cambios.push({ tipo: h.progreso || 'cerrado', privado: privado(h) || undefined, fecha: h.cerrado, zona: zonaDe(h), tema: temaDe(h.dimension), ahora: h.valor, nota: h.nota_cierre });
        else if (h.creado >= desde && !h.sustituye && (vigente(h, ahora) || h.estado === 'dudoso')) cambios.push({ tipo: zonaDe(h) === 'hipocampo' ? 'aprendido' : 'nuevo', privado: privado(h) || undefined, fecha: h.creado, zona: zonaDe(h), tema: temaDe(h.dimension), ahora: h.valor });
    }
    cambios.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const abiertosV = abiertos(root, { ahora }).filter(h => !cliente || !privado(h))
        .map(h => ({ id: h.id, privado: privado(h) || undefined, tema: temaDe(h.dimension), valor: h.valor, zona: zonaDe(h), progreso: h.progreso || 'abierto', dias: Math.max(0, Math.floor((Date.parse(ahora) - Date.parse(h.creado)) / 864e5)) }));
    // el nombre del proyecto: el que sabe la memoria (proyecto.nombre) o, si no, el de la carpeta
    const nombre = actuales.find(h => h.dimension === 'proyecto.nombre');
    return { proyecto: nombre ? nombre.valor : path.basename(path.resolve(root)), generado: ahora, cliente, zonas, cambios: cambios.slice(0, 20), abiertos: abiertosV,
        actividad: actividadCortex(root, { cliente, ahora }) };
}
// Cómo PIENSA (X-T10): del registro de uso real, qué zonas ha consultado el agente y cuánto. Cada recuerdo que llegó
// pesa más cuanto más reciente (se reduce a la mitad cada 3 días), más si lo usó y menos si lo ignoró. Y la secuencia
// de sus últimas consultas, para reproducirla zona a zona. Con cliente, solo cifras por zona: ni el texto de lo que se
// preguntó ni la zona del usuario.
export function actividadCortex(root, { cliente = false, ahora = hoy(), dias = 14, pasos = 24 } = {}) {
    const desde = new Date(Date.parse(ahora) - dias * 864e5).toISOString();
    const lineas = leerUso(root).filter(x => x.t >= desde && x.t <= ahora);
    const zonaHecho = new Map(todosLosHechos(root).map(h => [h.id, zonaDe(h)]));
    const zonaItem = it => it.fuente === 'hecho' ? zonaHecho.get(it.id) || null : it.fuente === 'memoria' ? 'occipital' : it.fuente === 'devlog' ? 'hipocampo' : null;
    const zonas = { frontal: 0, parietal: 0, occipital: 0, temporal: 0, hipocampo: 0 };
    const pensamientos = [];
    for (const x of lineas) {
        const edad = Math.max(0, (Date.parse(ahora) - Date.parse(x.t)) / 864e5);
        const enX = [];
        for (const it of x.items || []) {
            const z = zonaItem(it);
            if (!z || (cliente && z === 'temporal')) continue;
            zonas[z] += Math.pow(0.5, edad / 3) * (it.usado === true ? 1.5 : it.usado === false ? 0.6 : 1);
            if (!enX.includes(z)) enX.push(z);
        }
        const usado = (x.items || []).some(it => it.usado === true) ? true : (x.items || []).some(it => it.usado === false) ? false : null;
        pensamientos.push({ t: x.t, zonas: enX, usado: x.items && x.items.length ? usado : undefined, origen: x.origen, consulta: cliente ? undefined : x.consulta || undefined });
    }
    for (const z of Object.keys(zonas)) zonas[z] = Math.round(zonas[z] * 100) / 100;
    return { dias, consultas: lineas.length, zonas, pensamientos: pensamientos.slice(-pasos) };
}

// ---------------------------------------------------------------- registro del uso REAL (X-T4)
// Cada vez que la memoria inyecta algo (o calla) se apunta en senzu/.estado/recuerdo-uso.jsonl (privado: la carpeta
// se ignora en git). Al cerrar la sesión se mira lo que respondió el agente DESPUÉS de cada inyección: si el contenido
// del recuerdo aparece, se marca «usado»; si no, «ignorado». Sin la conversación (p. ej. en Codex) queda «sin datos»:
// no se inventa. `memoria.mjs --informe` saca las cifras reales y los casos para afinar con datos de verdad.
const MAX_REGISTRO = 3000;   // líneas que se guardan como mucho (lo más viejo se va)
export function rutaUso(root) { return path.join(path.dirname(rutaEstado(root)), 'recuerdo-uso.jsonl'); }   // rutaEstado da el archivo de la sesión; su carpeta (ignorada en git) crea
export function apuntarInyeccion(root, { sid, origen, consulta, items = [] }, { ahora = hoy() } = {}) {
    try {
        const linea = { t: ahora, sid: String(sid || 'default'), origen, consulta: String(consulta || '').replace(/\s+/g, ' ').slice(0, 200),
            items: items.map(x => ({ fuente: x.fuente, id: x.id, texto: String(x.texto || '').replace(/\s+/g, ' ').slice(0, 160), puntuacion: x.puntuacion, debil: x.debil || undefined })) };
        fs.appendFileSync(rutaUso(root), JSON.stringify(linea) + '\n');
    } catch { }
}
function leerUso(root) {
    try { return fs.readFileSync(rutaUso(root), 'utf8').split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; }
}
// Lo que dijo el agente, con su hora, de una conversación de Claude Code (JSONL). Formato desconocido → [].
export function textosDelAgente(transcript) {
    let crudo = ''; try { crudo = fs.readFileSync(transcript, 'utf8'); } catch { return []; }
    const out = [];
    for (const l of crudo.split(/\r?\n/)) {
        let j; try { j = JSON.parse(l); } catch { continue; }
        const msg = j && (j.message || j);
        if (!msg || (j.type !== 'assistant' && msg.role !== 'assistant')) continue;
        const c = msg.content;
        const texto = typeof c === 'string' ? c : Array.isArray(c) ? c.map(x => (x && (x.type === 'text' ? x.text : x.type === 'tool_use' ? JSON.stringify(x.input || '') : '')) || '').join(' ') : '';
        if (texto) out.push({ t: j.timestamp || null, texto });
    }
    return out;
}
// ¿Usó el agente este recuerdo? Sus palabras con peso propias (sin las que ya traía la pregunta): si al menos la
// mitad (y mínimo una) aparecen en lo que respondió, se usó.
export function seUso(item, consulta, respuesta) {
    const deLaPregunta = new Set(palabras(consulta));
    const propias = [...new Set(palabras(String(item.texto || '').replace(/^\[[^\]]*\]\s*/, '')).filter(w => palabraConPeso(w) && !deLaPregunta.has(w)))];
    if (!propias.length) return null;
    const dicho = new Set(palabras(respuesta));
    const n = propias.filter(w => dicho.has(w)).length;
    return n >= Math.max(1, Math.ceil(propias.length / 2));
}
export function marcarUsoSesion(root, sid, textos) {
    const todas = leerUso(root);
    if (!todas.length) return 0;
    sid = String(sid);
    const turnos = todas.filter(x => x.sid === sid && x.origen === 'mensaje').sort((a, b) => a.t.localeCompare(b.t));
    const finDe = x => { const sig = turnos.find(y => y.t > x.t); return sig ? sig.t : new Date(Date.parse(x.t) + 30 * 60e3).toISOString(); };
    // X-T11: las búsquedas del propio agente (--recordar/--buscar llegan sin sesión) que caen en un turno de esta
    // sesión son suyas: se evalúan con lo que respondió en ese turno
    for (const c of todas) if (c.sid === 'cli' && c.evaluado == null && turnos.some(x => c.t >= x.t && c.t < finDe(x))) c.sid = sid;
    const mias = todas.filter(x => x.sid === sid && x.items.length && x.evaluado == null);
    if (!mias.length && !turnos.some(x => x.rc == null)) return 0;
    let marcadas = 0;
    mias.forEach(x => {
        const siguiente = turnos.find(y => y.t > x.t);
        const tras = textos.filter(m => m.t && m.t >= x.t && (!siguiente || m.t < siguiente.t)).map(m => m.texto).join('\n');
        const conHora = textos.some(m => m.t);
        x.evaluado = textos.length ? true : false;
        x.items.forEach(it => { it.usado = !textos.length || (!conHora && !tras) ? null : seUso(it, x.consulta, tras || textos.map(m => m.texto).join('\n')); });
        marcadas++;
    });
    // X-T11 · reconsolidación: por cada turno, los hechos que el agente USÓ sin que el mensaje se los trajera solo
    // (los buscó él, o le llegaron como relación débil) aprenden las palabras con que preguntó el usuario; los que le
    // llegaron y IGNORÓ desaprenden las palabras aprendidas que los trajeron. Sin la conversación (Codex), nada.
    const cambios = [];
    if (textos.length) for (const msg of turnos.filter(x => x.rc == null)) {
        const fin = finDe(msg), solos = new Map((msg.items || []).filter(it => it.fuente === 'hecho').map(it => [it.id, it]));
        const usados = new Set();
        for (const y of todas) if (y.sid === sid && y.t >= msg.t && y.t < fin) for (const it of y.items || [])
            if (it.fuente === 'hecho' && it.usado === true && (!solos.has(it.id) || solos.get(it.id).debil)) usados.add(it.id);
        for (const id of usados) cambios.push({ id, mas: msg.consulta });
        for (const it of solos.values()) if (it.usado === false) cambios.push({ id: it.id, menos: msg.consulta });
        msg.rc = true;
    }
    if (cambios.length) try { reconsolidar(root, cambios, { frecuentes: palabrasFrecuentes(todas.filter(x => x.origen === 'mensaje').map(x => x.consulta)) }); } catch { }
    try {
        const tmp = rutaUso(root) + '.tmp';
        fs.writeFileSync(tmp, todas.slice(-MAX_REGISTRO).map(x => JSON.stringify(x)).join('\n') + '\n');
        fs.renameSync(tmp, rutaUso(root));
    } catch { }
    return marcadas;
}
export function informeUso(root, { dias = 30, ahora = hoy() } = {}) {
    const desde = new Date(Date.parse(ahora) - dias * 864e5).toISOString();
    const todasL = leerUso(root).filter(x => x.t >= desde);
    const l = todasL.filter(x => x.origen !== 'consulta');   // las búsquedas del agente (X-T11) no son mensajes: aparte
    const items = l.flatMap(x => x.items.map(it => ({ ...it, consulta: x.consulta, t: x.t, origen: x.origen })));
    const cuenta = f => items.filter(f).length;
    const usados = cuenta(i => i.usado === true), ignorados = cuenta(i => i.usado === false), sinDatos = cuenta(i => i.usado == null);
    const porRecuerdo = new Map();
    for (const i of items.filter(x => x.usado != null)) { const k = i.fuente + '|' + i.id; const v = porRecuerdo.get(k) || { fuente: i.fuente, id: i.id, texto: i.texto, usado: 0, ignorado: 0 }; v[i.usado ? 'usado' : 'ignorado']++; porRecuerdo.set(k, v); }
    return {
        dias, mensajes: l.length, busquedas: todasL.length - l.length,
        // X-T11: lo que la memoria ha aprendido del uso, para revisarlo (palabra: confirmaciones)
        aprendido: todosLosHechos(root).filter(h => h.aprendidas && Object.keys(h.aprendidas).length && h.estado !== 'invalidado')
            .map(h => ({ id: h.id, dimension: h.dimension, valor: h.valor, palabras: h.aprendidas })).slice(0, 20), conRecuerdo: l.filter(x => x.items.length).length, silencios: l.filter(x => !x.items.length).length,
        inyectados: items.length, usados, ignorados, sinDatos,
        precision: usados + ignorados ? Math.round(1000 * usados / (usados + ignorados)) / 10 : null,
        debiles: { usados: cuenta(i => i.debil && i.usado === true), ignorados: cuenta(i => i.debil && i.usado === false) },
        ruido: [...porRecuerdo.values()].filter(v => v.ignorado >= 2 && v.ignorado > v.usado).sort((a, b) => b.ignorado - a.ignorado).slice(0, 8),
        ignoradosRecientes: items.filter(i => i.usado === false).slice(-8).reverse().map(i => ({ consulta: i.consulta, texto: i.texto, t: i.t })),
        silenciosRecientes: l.filter(x => !x.items.length).slice(-8).reverse().map(x => ({ consulta: x.consulta, t: x.t })),
    };
}

// ---------------------------------------------------------------- léxico multilingüe de la convención (X-T8)
// Para cada tema canónico, cómo se dice en ~20 idiomas (es, en, ca, pt, fr, de, it, nl, pl, tr, ru, uk, el, ja, zh, ko,
// ar, he, hi, vi, sv). Va al ÍNDICE (no a lo guardado: vale también para lo que ya existe) y no cuenta para la longitud
// del hecho (no lo penaliza en el orden). Es lo que permite que «кто клиент?» o «客户是谁» encuentren al cliente sin
// red ni modelo: la clave es la convención (X-T3) y la convención trae su vocabulario.
export const LEXICO = {
    nombre: 'name nombre nom nome naam imie isim имя імя όνομα 名前 名字 이름 اسم नाम namn',
    ubicacion: 'location city ciudad ciutat cidade ville stadt wohnort citta stad miasto sehir город місто πόλη 都市 住所 城市 도시 مدينة עיר शहर vivo vive live lives moro morava mora morei vivia viviamos lived habite habitais habitait wohne wohnte wohnt abito abitavo abita abitava woon woonde mieszkam yasiyorum живу μένω 住んでいる 住在 사는 أعيش גר रहता bor',
    idioma: 'language idioma llengua lingua langue sprache taal jezyk dil язык мова γλώσσα 言語 语言 언어 لغة שפה भाषा sprak',
    'zona-horaria': 'timezone zeitzone tijdzone tidszon horaria horari fuseau タイムゾーン 时区 시간대',
    horario: 'schedule horario horari horaire arbeitszeit orario werktijden график графік ωράριο 勤務時間 工作时间 arbetstid',
    cliente: 'client customer cliente kunde klant klient musteri клиент клієнт πελάτης クライアント 顧客 客户 客戶 고객 클라이언트 عميل العميل לקוח הלקוח ग्राहक khach kund kunden',
    'contacto-cliente': 'contact contacto contacte contato interlocuteur ansprechpartner referente contactpersoon kontaktowa irtibat kontakt контакт контактна επαφή 担当者 联系人 담당자 الاتصال संपर्क kontaktperson',
    stack: 'stack technology tecnologia framework technologie tecnologie technologia teknoloji технологии технології τεχνολογία 技術 技术栈 기술 تقنية טכנולוגיה तकनीक cong nghe teknik',
    hosting: 'hosting host server servidor alojamiento alojada alojado alojar alojamos allotjament hospedado hospedada hosted hospedagem hebergement serveur serwer sunucu хостинг сервер φιλοξενία διακομιστής ホスティング サーバー 托管 服务器 호스팅 서버 استضافة خادم אחסון שרת होस्टिंग सर्वर may chu',
    dominio: 'domain dominio domini domaine domein domena домен τομέας ドメイン 域名 도메인 نطاق דומיין डोमेन doman',
    repositorio: 'repository repo repositorio repositori depot repozytorium depo репозиторий репозиторій αποθετήριο リポジトリ 仓库 저장소 مستودع מאגר रिपॉजिटरी',
    'pasarela-pago': 'payment payments pagos pasarela pagaments pagamentos paiement paiements zahlung zahlungen pagamenti betaling betalingen platnosci odeme оплата платежи платежі πληρωμές 決済 支付 결제 دفع תשלום भुगतान betalning',
    presupuesto: 'budget presupuesto pressupost orcamento budzet butce бюджет προϋπολογισμός 予算 预算 예산 ميزانية תקציב बजट',
    plazo: 'deadline plazo termini prazo echeance frist scadenza termin teslim срок дедлайн термін προθεσμία 締め切り 截止日期 마감',
    'gestor-paquetes': 'paquetes paquets pacotes paketmanager pacchetti pakketbeheerder pakietow paket пакетный пакетів πακέτων パッケージマネージャー 包管理器 패키지 الحزم חבילות पैकेज pakethanterare',
    editor: 'editor editeur редактор επεξεργαστής エディタ 编辑器 에디터 محرر עורך संपादक redigerare',
    tipografia: 'font fonts typography tipografia police typographie schrift schriftart carattere lettertype czcionka шрифт γραμματοσειρά フォント 字体 글꼴 גופן फ़ॉन्ट typsnitt',
    'color-marca': 'brand corporativo corporatiu markenfarbe merkkleur ブランドカラー 品牌色 브랜드 ब्रांड varumarkesfarg',
    analitica: 'analytics analitica analytique statistiques analytik analisi analityka analitik аналитика аналітика αναλυτικά アナリティクス 分析 분석 تحليلات אנליטיקה एनालिटिक्स phan tich analys',
    lanzamiento: 'launch release lanzamiento llancament lancamento lancement markteinfuhrung lancio lancering premiera lansman запуск κυκλοφορία ローンチ 发布 출시 إطلاق השקה लॉन्च lansering',
    tests: 'tests testing pruebas proves testes essais testen testy testler тесты тести δοκιμές テスト 测试 테스트 اختبارات בדיקות परीक्षण tester',
};
const LEXICO_TOKENS = new Map(Object.entries(LEXICO).map(([t, s]) => [t, palabras(s)]));
// Las palabras del léxico de un hecho (si su tema es de la convención); [] si no
function lexicoDe(dimension) { return LEXICO_TOKENS.get(dimension.slice(dimension.indexOf('.') + 1)) || []; }

// ---------------------------------------------------------------- mapa de la memoria (X-T9)
// Para que el agente SEPA qué hay y qué puede consultar (no solo lo que coincide con un mensaje): los temas de cada
// zona, cuántas decisiones y entradas del devlog. Corto: es un índice, no el contenido.
const NOMBRE_ZONA = { frontal: 'objetivos, pendientes y límites', parietal: 'el proyecto', temporal: 'el usuario', hipocampo: 'aprendizajes y notas' };
export function mapaMemoria(root, { ahora = hoy(), maxTemas = 12 } = {}) {
    const vig = todosLosHechos(root).filter(h => vigente(h, ahora) || h.estado === 'dudoso');
    const zonas = {};
    for (const h of vig) {
        const z = zonaDe(h), t = h.dimension.slice(h.dimension.indexOf('.') + 1);
        (zonas[z] = zonas[z] || new Map()).set(t, (zonas[z].get(t) || 0) + 1);
    }
    const decisiones = memoriaDelProyecto(root).filter(x => x.tipo === 'decision').length;
    const reglas = memoriaDelProyecto(root).filter(x => x.tipo === 'regla').length;
    const entradas = entradasDelDevlog(root, 100000);
    return {
        hechos: vig.length,
        zonas: Object.entries(NOMBRE_ZONA).filter(([z]) => zonas[z]).map(([z, nombre]) => ({ zona: z, nombre, temas: [...zonas[z].keys()].slice(0, maxTemas), mas: Math.max(0, zonas[z].size - maxTemas) })),
        decisiones, reglas, entradas: entradas.length, ultima: entradas[0] ? { num: entradas[0].devlog, titulo: entradas[0].valor } : null,
    };
}
// El mapa en texto, para inyectarlo (session-start: completo; recuerdo-vivo: en una línea)
export function textoMapa(m, { corto = false } = {}) {
    const temas = m.zonas.map(z => `${z.nombre}: ${z.temas.join(', ')}${z.mas ? ` y ${z.mas} más` : ''}`);
    const resto = [m.decisiones ? `${m.decisiones} decisiones${m.reglas ? ` y ${m.reglas} reglas` : ''} en MEMORIA.md` : '', m.entradas ? `${m.entradas} entradas de devlog` : ''].filter(Boolean);
    if (corto) return (temas.length ? temas.join(' · ') : 'sin hechos todavía') + (resto.length ? ' · ' + resto.join(' · ') : '');
    return [...temas.map(t => `  · ${t}`), ...(resto.length ? [`  · ${resto.join(' · ')}${m.ultima ? ` (la última: ${m.ultima.num}, ${m.ultima.titulo.slice(0, 70)})` : ''}`] : [])].join('\n');
}
