#!/usr/bin/env node
// Suite de i18n (F0-T1): localeUI (idioma de la UI, por defecto 'en') y el mapa de nombres de comando.
//   node tools/test-i18n.mjs
// El CONTENIDO de las skills no depende del locale (lo lee el agente); esto cubre solo la capa de UI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'lib.mjs')).href);
let casos = 0, fallos = 0;
const ok = (c, n) => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}\n`); } };

const temporales = [];
function raiz(lang) {   // raiz de proyecto temporal con senzu/senzu.json (si se pasa lang)
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-i18n-'));
    temporales.push(d);
    if (lang !== undefined) {
        fs.mkdirSync(path.join(d, 'senzu'), { recursive: true });
        fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), JSON.stringify({ stack: 'next', lang }));
    }
    return d;
}
const limpiarEnv = () => { delete process.env.SENZU_LANG; delete process.env.DEV_STANDARDS_LANG; };

// 1. localeUI: por defecto ingles
limpiarEnv();
ok(lib.localeUI(raiz()) === 'en', 'sin marcador ni entorno -> en (por defecto)');
ok(lib.localeUI(raiz('es')) === 'es', 'marcador lang=es -> es');
ok(lib.localeUI(raiz('en')) === 'en', 'marcador lang=en -> en');
ok(lib.localeUI(raiz('es-ES')) === 'es', 'marcador lang=es-ES -> es (normaliza el prefijo)');
ok(lib.localeUI(raiz('fr')) === 'en', 'marcador lang desconocido -> en (cae al por defecto)');

// 2. localeUI: el entorno (SENZU_LANG) manda sobre el marcador
process.env.SENZU_LANG = 'es'; ok(lib.localeUI(raiz('en')) === 'es', 'SENZU_LANG=es manda sobre marcador en -> es'); limpiarEnv();
process.env.SENZU_LANG = 'en'; ok(lib.localeUI(raiz('es')) === 'en', 'SENZU_LANG=en manda sobre marcador es -> en'); limpiarEnv();
process.env.SENZU_LANG = 'fr'; ok(lib.localeUI(raiz('es')) === 'es', 'SENZU_LANG desconocido se ignora -> gana el marcador es'); limpiarEnv();

// 3. Mapa de nombres de comando: cuadra con los 22 archivos reales y sin colisiones en ingles
const mapa = JSON.parse(fs.readFileSync(path.join(ROOT, 'core', 'i18n', 'commands.json'), 'utf8')).comandos;
const claves = Object.keys(mapa).sort();
const archivos = fs.readdirSync(path.join(ROOT, 'core', 'commands')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')).sort();
ok(claves.length === archivos.length && claves.join(',') === archivos.join(','), `el mapa cubre EXACTAMENTE los ${archivos.length} comandos (sin sobrar ni faltar)`);
const valores = Object.values(mapa);
ok(new Set(valores).size === valores.length, 'los nombres en ingles no colisionan');
ok(valores.every(v => /^[a-z][a-z0-9-]*$/.test(v)), 'los nombres en ingles son slugs validos (minusculas, guiones)');

for (const d of temporales) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
