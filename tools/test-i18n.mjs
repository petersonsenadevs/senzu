#!/usr/bin/env node
// Suite de i18n (F0-T1): localeUI (idioma de la UI, por defecto 'en') y el mapa de nombres de comando.
//   node tools/test-i18n.mjs
// El CONTENIDO de las skills no depende del locale (lo lee el agente); esto cubre solo la capa de UI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

// 4. msg(): catalogo de mensajes por idioma (piloto deploy + verify-build)
const dep = lib.msg('deploy.block', 'es');
ok(Array.isArray(dep) && dep.length === 2, 'deploy.block es -> array de 2 lineas');
ok(dep[0] === '[BLOQUEADO por Senzu] Deploy a PRODUCCION detectado. Requiere aprobacion explicita del usuario en este momento (checklist /desplegar: backup fresco verificado + plan de rollback + smoke posterior).', 'deploy.block es[0] byte a byte igual al inline anterior');
ok(dep[1] === 'Con la aprobacion recibida: reintenta con SENZU_ALLOW_DEPLOY=1 y documenta la aprobacion y el resultado en el devlog. Los deploys de preview (sin --prod) pasan sin muro.', 'deploy.block es[1] byte a byte igual al inline anterior');
ok(/Production deploy detected/.test(lib.msg('deploy.block', 'en')[0]) && lib.msg('deploy.block', 'en')[0] !== dep[0], 'deploy.block en es ingles y distinto del es');
ok(lib.msg('deploy.block', 'fr')[0] === lib.msg('deploy.block', 'en')[0], 'idioma desconocido cae a ingles');
ok(lib.msg('stop.verifyBuild', 'es') === "Has editado codigo y NO hay verificacion posterior: ejecuta 'node <skills-dir>/code-quality/scripts/verify-build.mjs' (corre lint/types/tests/build del stack y deja constancia) o los comandos del stack a mano, corrige los fallos y pega el resultado antes de cerrar.", 'stop.verifyBuild es byte a byte igual al inline anterior');
ok(/You edited code/.test(lib.msg('stop.verifyBuild', 'en')), 'stop.verifyBuild en es ingles');
ok(lib.msg('no.existe', 'en') === '?no.existe?', 'id inexistente -> marcador visible (no revienta)');
ok(lib.msg('deploy.block', 'es', { x: 1 })[0] === dep[0], 'vars sin placeholders no altera el mensaje');

// 6. End-to-end: el idioma del MARCADOR (senzu.json "lang") decide el idioma del muro (no solo SENZU_LANG).
//    Instalar --lang es escribe lang:es; aqui se comprueba la otra mitad: un proyecto lang:es -> muro en es.
function corrGuard(tmp, cmd) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'core', 'hooks', 'guard.mjs')], {
        input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: tmp }), encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: tmp, SENZU_LANG: '', DEV_STANDARDS_LANG: '', SENZU_ALLOW_DEPLOY: '', SENZU_TEST_ISOLATED: '1' },
    });
    return (r.stdout || '') + (r.stderr || '');
}
ok(/Deploy a PRODUCCION detectado/.test(corrGuard(raiz('es'), 'netlify deploy --prod')), 'proyecto con marcador lang=es -> muro de deploy en castellano');
ok(/Production deploy detected/.test(corrGuard(raiz('en'), 'netlify deploy --prod')), 'proyecto con marcador lang=en -> muro de deploy en ingles');
ok(/Production deploy detected/.test(corrGuard(raiz(), 'netlify deploy --prod')), 'proyecto sin marcador de lang -> muro en ingles (por defecto)');

// 5. Integridad: los hooks copiados al plugin resuelven sus imports locales (el fallo de messages.mjs:
//    lib.mjs importaba './messages.mjs' pero build-plugins no lo copiaba -> ERR_MODULE_NOT_FOUND en runtime).
const pluginHooks = path.join(ROOT, 'plugins', 'senzu-all', 'hooks');
if (fs.existsSync(pluginHooks)) {
    const rotos = [];
    for (const f of fs.readdirSync(pluginHooks).filter(f => f.endsWith('.mjs'))) {
        const txt = fs.readFileSync(path.join(pluginHooks, f), 'utf8');
        for (const m of txt.matchAll(/\bfrom\s+'(\.\/[^']+\.mjs)'/g)) {
            if (!fs.existsSync(path.join(pluginHooks, m[1]))) rotos.push(`${f} -> ${m[1]}`);
        }
    }
    ok(rotos.length === 0, `los hooks del plugin senzu-all resuelven sus imports locales (${rotos.join(', ')})`);
}

// 7. Paridad de la documentación en inglés: build-docs y build-creditos caen al castellano si falta una
//    traducción (no rompen el pre-commit); aquí es donde falla, al añadir una skill, una novedad o un efecto.
{
    const leerJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8').replace(/^﻿/, ''));
    const reg = leerJson('core', 'skills-registry.json');
    const sk = leerJson('core', 'i18n', 'skills.json');
    const sinGrupo = Object.keys(reg.groups).filter(g => !sk.grupos?.[g]);
    const sinWhen = reg.skills.map(s => s.name).filter(n => !sk.when?.[n]);
    ok(!sinGrupo.length && !sinWhen.length, `core/i18n/skills.json traduce todos los grupos y skills (faltan: ${[...sinGrupo, ...sinWhen].join(', ')})`);
    const sobran = Object.keys(sk.when || {}).filter(n => !reg.skills.some(s => s.name === n));
    ok(!sobran.length, `core/i18n/skills.json sin skills que ya no existen (${sobran.join(', ')})`);
    const sinEn = leerJson('core', 'novedades.json').novedades.filter(n => !n.en).map(n => n.version);
    ok(!sinEn.length, `cada novedad de core/novedades.json tiene su "en" (faltan: ${sinEn.join(', ')})`);
    const man = leerJson('core', 'effects-vendor', 'manifest.json').repos || [];
    const cr = leerJson('core', 'i18n', 'creditos.json');
    const sinCat = [...new Set(man.map(e => e.category))].filter(c => !cr.categorias?.[c]);
    const sinPara = man.filter(e => !cr.para?.[e.repo]).map(e => e.repo);
    ok(!sinCat.length && !sinPara.length, `core/i18n/creditos.json traduce todas las categorías y efectos (faltan: ${[...sinCat, ...sinPara].join(', ')})`);
}

// 8. Skills y comandos en inglés para la documentación (docs/en/, tools/traducciones.mjs): cada uno tiene la suya.
//    Desfasada (el original cambió después) no falla: se avisa aquí y la web lo dice en la página; se retraduce
//    y se sella con `node tools/traducciones.mjs --sellar <nombre>`.
{
    const { estado } = await import(pathToFileURL(path.join(ROOT, 'tools', 'traducciones.mjs')).href);
    const est = estado();
    const faltan = est.filter(e => e.estado === 'falta').map(e => e.traduccion);
    ok(!faltan.length, `cada skill y comando tiene su traducción en docs/en/ (faltan: ${faltan.join(', ')})`);
    const desfasadas = est.filter(e => e.estado === 'desfasada').map(e => e.traduccion);
    if (desfasadas.length) process.stdout.write(`AVISO ${desfasadas.length} traducción(es) desfasada(s) (el original cambió): ${desfasadas.join(', ')}\n`);
}

for (const d of temporales) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
