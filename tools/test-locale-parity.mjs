#!/usr/bin/env node
// Suite de paridad de locales (F0-T4): las capas de UI en 'en' y 'es' no se desincronizan.
//   node tools/test-locale-parity.mjs
// Anti-divergencia: si un idioma gana una cadena/comando y el otro se queda atras, esto falla y dice cual.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let casos = 0, fallos = 0;
const ok = (c, n) => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}\n`); } };

// --- 1. Catalogo de mensajes: cada id con en y es, misma forma (string<->string, array<->array mismo largo) ---
const { CAT } = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'messages.mjs')).href);
function desajustes(cat) {
    const malos = [];
    for (const [id, e] of Object.entries(cat)) {
        const en = e && e.en, es = e && e.es;
        if (en == null || es == null) { malos.push(`${id}: falta ${en == null ? 'en' : 'es'}`); continue; }
        if (Array.isArray(en) !== Array.isArray(es)) { malos.push(`${id}: tipos distintos`); continue; }
        if (Array.isArray(en) && en.length !== es.length) { malos.push(`${id}: longitudes distintas (${en.length} vs ${es.length})`); continue; }
        const vacio = v => (Array.isArray(v) ? v.some(s => !String(s).trim()) : !String(v).trim());
        if (vacio(en) || vacio(es)) malos.push(`${id}: cadena vacia`);
    }
    return malos;
}
ok(desajustes(CAT).length === 0, `catalogo real sincronizado en/es (${desajustes(CAT).join(' | ')})`);

// caso negativo: la comprobacion DE VERDAD detecta desincronizacion
const malo = { 'a.solo_en': { en: 'hi' }, 'b.tipos': { en: ['x'], es: 'y' }, 'c.largo': { en: ['x', 'y'], es: ['x'] }, 'd.vacio': { en: 'ok', es: '  ' } };
ok(desajustes(malo).length === 4, `detecta los 4 desajustes de prueba (dio ${desajustes(malo).length})`);

// --- 2. Mapa de comandos <-> archivos reales (regresion del renombrado -Lang) ---
const mapa = JSON.parse(fs.readFileSync(path.join(ROOT, 'core', 'i18n', 'commands.json'), 'utf8')).comandos;
const claves = Object.keys(mapa).sort();
const archivos = fs.readdirSync(path.join(ROOT, 'core', 'commands')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')).sort();
const sinMapa = archivos.filter(a => !(a in mapa));
const mapaSobra = claves.filter(k => !archivos.includes(k));
ok(sinMapa.length === 0, `todos los comandos tienen nombre en ingles en commands.json (faltan: ${sinMapa.join(', ')})`);
ok(mapaSobra.length === 0, `commands.json no mapea comandos inexistentes (sobran: ${mapaSobra.join(', ')})`);
const vals = Object.values(mapa);
ok(new Set(vals).size === vals.length, 'los nombres en ingles no colisionan');

// --- 2b. Descripciones de comando: todas las de los archivos, con en y es no vacios ---
const desc = JSON.parse(fs.readFileSync(path.join(ROOT, 'core', 'i18n', 'command-descriptions.json'), 'utf8')).descripciones;
const sinDesc = archivos.filter(a => !(a in desc));
ok(sinDesc.length === 0, `todos los comandos tienen descripcion en command-descriptions.json (faltan: ${sinDesc.join(', ')})`);
const descMal = Object.entries(desc).filter(([, v]) => !v || !String(v.en || '').trim() || !String(v.es || '').trim()).map(([k]) => k);
ok(descMal.length === 0, `cada descripcion tiene en y es no vacios (mal: ${descMal.join(', ')})`);

// --- 3. Router: si skills-registry gana keywords_en/when_en, TODAS las entradas deben tenerlo (aun no existe) ---
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'core', 'skills-registry.json'), 'utf8'));
const skills = Array.isArray(reg.skills) ? reg.skills : Object.values(reg.skills || {});
for (const campo of ['keywords_en', 'when_en']) {
    const conCampo = skills.filter(s => s && s[campo] != null);
    if (conCampo.length) ok(conCampo.length === skills.length, `${campo}: o en todas las skills o en ninguna (${conCampo.length}/${skills.length})`);
}

process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
