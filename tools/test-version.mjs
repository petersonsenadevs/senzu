#!/usr/bin/env node
// Suite del aviso de Senzu desactualizado (estadoVersion en lib.mjs + session-start). Sin red ni tocar la
// instalación real: un «home» falso con installed_plugins.json, known_marketplaces.json, el clon del marketplace
// y la caché de GitHub; plugins falsos con su .claude-plugin/plugin.json junto a hooks/.
//   node tools/test-version.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'lib.mjs')).href);
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-version-'));
const escribe = (f, obj) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof obj === 'string' ? obj : JSON.stringify(obj)); };

// 0. comparar versiones
ok(lib.cmpVer('2.14.0', '2.2.2') > 0, '2.14.0 > 2.2.2 (numérico, no texto)');
ok(lib.cmpVer('2.2.2', '2.12.0') < 0 && lib.cmpVer('2.13.0', '2.13.0') === 0 && lib.cmpVer('3.0', '2.99.9') > 0, 'orden de versiones');

const NOV = { novedades: [
    { version: '2.15.0', texto: 'quince' }, { version: '2.14.0', importante: true, texto: 'catorce' },
    { version: '2.13.0', texto: 'trece' }, { version: '2.12.0', texto: 'doce' }, { version: '2.3.0', importante: true, texto: 'vieja' }] };
// Un «home» de Claude Code con la versión registrada, el marketplace descargado y (si se pide) la caché de GitHub
function home(nombre, { registrada, clon, github, fuente = 'github' } = {}) {
    const h = path.join(base, nombre);
    escribe(path.join(h, '.claude', 'plugins', 'installed_plugins.json'), { version: 2, plugins: registrada ? { 'senzu-all@senzu': [{ scope: 'user', version: registrada }] } : {} });
    const loc = path.join(h, 'clon');
    escribe(path.join(h, '.claude', 'plugins', 'known_marketplaces.json'), { senzu: { source: fuente === 'github' ? { source: 'github', repo: 'x/senzu' } : { source: 'directory', path: 'D:/x' }, installLocation: loc } });
    if (clon) { escribe(path.join(loc, '.claude-plugin', 'marketplace.json'), { plugins: [{ name: 'senzu-all', version: clon }, { name: 'senzu-core', version: clon }] }); escribe(path.join(loc, 'core', 'novedades.json'), NOV); }
    if (github) escribe(path.join(h, '.config', 'senzu', 'ultima-version.json'), { fecha: Date.now(), version: github, novedades: NOV.novedades });
    return h;
}
function plugin(version) {
    const d = path.join(base, 'plugin-' + version);
    escribe(path.join(d, '.claude-plugin', 'plugin.json'), { name: 'senzu-all', version });
    fs.mkdirSync(path.join(d, 'hooks'), { recursive: true });
    return path.join(d, 'hooks');
}
const est = (hooksDir, h, red = true) => lib.estadoVersion(base, { hooksDir, home: h, red });

// 1. plugin: los tres casos y el «al día»
let r = await est(plugin('2.2.2'), home('h1', { registrada: '2.12.0', clon: '2.12.0' }));
ok(r && r.accion === 'sesion' && /abre una sesión nueva/.test(r.mensaje) && /2\.12\.0/.test(r.mensaje), 'instalada nueva, sesión vieja → abrir sesión nueva', JSON.stringify(r));
r = await est(plugin('2.12.0'), home('h2', { registrada: '2.12.0', clon: '2.14.0' }));
ok(r && r.accion === 'update' && /\/plugin update senzu-all@senzu/.test(r.mensaje), 'el marketplace trae una nueva → /plugin update', JSON.stringify(r));
ok(r && r.novedades.map(n => n.version).join(',') === '2.14.0,2.13.0', 'novedades: solo las posteriores, primero las importantes', JSON.stringify(r && r.novedades));
r = await est(plugin('2.12.0'), home('h3', { registrada: '2.12.0', clon: '2.12.0', github: '2.15.0' }));
ok(r && r.accion === 'marketplace' && /\/plugin marketplace update senzu/.test(r.mensaje), 'GitHub tiene una nueva → actualizar el marketplace', JSON.stringify(r));
ok(r && r.novedades.length === 3 && r.novedades[0].version === '2.14.0', 'como mucho 3 novedades, la importante delante', JSON.stringify(r && r.novedades));
ok(await est(plugin('2.15.0'), home('h4', { registrada: '2.15.0', clon: '2.15.0', github: '2.15.0' })) === null, 'al día → no dice nada');
ok(await est(plugin('2.12.0'), home('h5', { registrada: '2.12.0', clon: '2.12.0', github: '2.15.0' }), false) === null, 'sin red no mira GitHub');
ok(await est(plugin('2.12.0'), home('h6', { registrada: '2.12.0', clon: '2.12.0', github: '2.15.0', fuente: 'directory' })) === null, 'marketplace local (carpeta): no se compara con GitHub');
process.env.SENZU_SIN_RED = '1';
ok(await est(plugin('2.12.0'), home('h7', { registrada: '2.12.0', clon: '2.12.0', github: '2.15.0' })) === null, 'SENZU_SIN_RED=1 apaga la red');
delete process.env.SENZU_SIN_RED;
ok(await est(plugin('2.12.0'), path.join(base, 'home-vacio'), false) === null, 'un home sin nada de Claude Code no rompe');

// 2. hooks copiados al proyecto: se comparan con el repo de origen
const origen = path.join(base, 'origen');
escribe(path.join(origen, 'core', 'hooks', 'lib.mjs'), 'export const v = 2;\n');
escribe(path.join(origen, 'core', 'hooks', 'guard.mjs'), 'nuevo\n');
escribe(path.join(origen, 'plugins', 'senzu-core', '.claude-plugin', 'plugin.json'), { version: '2.15.0' });
const proj = path.join(base, 'proyecto');
escribe(path.join(proj, 'senzu', 'senzu.json'), { stack: 'next', standardsRoot: origen });
const copia = path.join(proj, '.claude', 'hooks');
escribe(path.join(copia, 'lib.mjs'), 'export const v = 2;\r\n');   // mismo contenido con CRLF: no cuenta como distinto
escribe(path.join(copia, 'guard.mjs'), 'viejo\n');
r = await lib.estadoVersion(proj, { hooksDir: copia, home: path.join(base, 'h1') });
ok(r && r.accion === 'instalar' && /\/instalar/.test(r.mensaje) && r.distintos.join() === 'guard.mjs', 'copia vieja en el proyecto → /instalar (CRLF no cuenta)', JSON.stringify(r));
escribe(path.join(copia, 'guard.mjs'), 'nuevo\n');
ok(await lib.estadoVersion(proj, { hooksDir: copia, home: path.join(base, 'h1') }) === null, 'copia al día → nada');
ok(await lib.estadoVersion(proj, { hooksDir: path.join(origen, 'core', 'hooks'), home: path.join(base, 'h1') }) === null, 'los hooks son el propio origen → nada');

// 3. session-start lo anuncia lo primero, con lo que se pierde (plugin falso con los hooks de verdad)
const pd = path.join(base, 'plugin-real');
fs.cpSync(path.join(ROOT, 'core', 'hooks'), path.join(pd, 'hooks'), { recursive: true });
escribe(path.join(pd, '.claude-plugin', 'plugin.json'), { name: 'senzu-all', version: '2.12.0' });
const hs = home('h-ss', { registrada: '2.12.0', clon: '2.14.0' });
const ss = spawnSync(process.execPath, [path.join(pd, 'hooks', 'session-start.mjs')], {
    input: JSON.stringify({ session_id: 'v-' + Date.now(), hook_event_name: 'SessionStart' }), encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj, USERPROFILE: hs, HOME: hs, SENZU_SIN_RED: '1' },
});
let ctx = ''; try { ctx = JSON.parse(ss.stdout).hookSpecificOutput.additionalContext; } catch { }
ok(/SENZU DESACTUALIZADO: Senzu 2\.12\.0[\s\S]*\/plugin update[\s\S]*2\.14\.0 \(importante\): catorce/.test(ctx), 'session-start: aviso y novedades', ctx.slice(0, 500) || ss.stderr);
ok(ctx.indexOf('SENZU DESACTUALIZADO') < ctx.indexOf('Stack:'), 'session-start: el aviso va antes que el resto');

// 4. cada versión publicada lleva su línea en core/novedades.json (si no, quien no actualice no sabe qué se pierde)
const publicada = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugins', 'senzu-core', '.claude-plugin', 'plugin.json'), 'utf8')).version;
const novedades = JSON.parse(fs.readFileSync(path.join(ROOT, 'core', 'novedades.json'), 'utf8')).novedades;
ok(novedades.some(n => n.version === publicada), `core/novedades.json tiene la versión publicada (${publicada})`);
ok(novedades.every(n => n.version && n.texto && n.texto.length <= 220), 'novedades: versión y texto corto en cada una');

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
