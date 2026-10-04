#!/usr/bin/env node
// Suite del muro cierre-limpio (core/hooks/cierre-limpio.mjs + edit-tracker.mjs) en un repo git temporal:
// el agente no se va con archivos SUYOS sin commitear, y no toca los AJENOS (otro agente u otra sesión).
//   node tools/test-cierre.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = path.join(ROOT, 'core', 'hooks');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };

const RUN = crypto.randomUUID();                   // ids de sesión únicos por ejecución (devlog 085)
const sesion = n => `cierre-${RUN}-${n}`;
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-cierre-'));
const g = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
fs.writeFileSync(path.join(repo, 'leeme.md'), '# repo\n'); g('add', '-A'); g('commit', '-q', '-m', 'init');

const hook = (nombre, entrada) => {
    const r = spawnSync(process.execPath, [path.join(HOOKS, nombre)], { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: repo } });
    const t = (r.stdout || '').trim();
    try { return t ? JSON.parse(t) : null; } catch { return { crudo: t }; }
};
const edita = (sid, rel, contenido = 'x\n') => {
    const f = path.join(repo, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenido);
    hook('edit-tracker.mjs', { session_id: sid, tool_name: 'Write', tool_input: { file_path: f } });
};
const cierra = (sid, activo = false) => hook('cierre-limpio.mjs', { session_id: sid, stop_hook_active: activo });

// 0. repo limpio: no dice nada
ok(cierra(sesion('a')) === null, 'repo sin cambios: silencio');

// 1. la sesión A edita y no commitea; «otro agente» deja un archivo a medias
g('switch', '-q', '-c', 'feat/x');
edita(sesion('a'), 'src/mio.js');
fs.writeFileSync(path.join(repo, 'ajeno.py'), 'print(1)\n');          // de Codex: la sesión A no lo tocó
let r = cierra(sesion('a'));
ok(r && r.decision === 'block', 'archivo propio sin commitear: bloquea el cierre', JSON.stringify(r));
ok(r && /src\/mio\.js/.test(r.reason) && /QUÉ FALTA/.test(r.reason), 'nombra el archivo propio y pide commitear o decir qué falta', r && r.reason);
ok(r && /ajeno\.py/.test(r.reason) && /No los commitees ni los descartes/.test(r.reason), 'separa el archivo ajeno: no commitearlo ni descartarlo', r && r.reason);
ok(r && !/src\/mio\.js[^:]*ajeno|NO has tocado en esta sesión \(src/.test(r.reason), 'no mete el propio entre los ajenos', r && r.reason);
ok(r && !/crea antes una rama/.test(r.reason), 'en una rama de trabajo no pide crear rama', r && r.reason);

// 2. segundo cierre (el agente ya respondió): solo recuerda, no vuelve a bloquear (sin bucles)
r = cierra(sesion('a'), true);
ok(r && !r.decision && /mio\.js/.test(r.systemMessage || ''), 'segundo intento: avisa sin bloquear', JSON.stringify(r));

// 3. otra sesión (B) que no tocó nada: los dos archivos son ajenos para ella -> aviso, nunca bloqueo
r = cierra(sesion('b'));
ok(r && !r.decision && /mio\.js/.test(r.systemMessage) && /ajeno\.py/.test(r.systemMessage), 'otra sesión: lo de A y lo de Codex son ajenos (aviso, sin bloquear)', JSON.stringify(r));
ok(cierra(sesion('b')) === null, 'el aviso de ajenos sale una vez por sesión');

// 4. A commitea lo suyo: ya no bloquea; queda el ajeno solo como aviso
g('add', 'src/mio.js'); g('commit', '-q', '-m', 'feat: mio');
r = cierra(sesion('a'));
ok(!r || !r.decision, 'commiteado lo propio: no bloquea', JSON.stringify(r));

// 5. en main: además pide crear una rama
g('switch', '-q', 'main');
edita(sesion('c'), 'docs/nota.md');
r = cierra(sesion('c'));
ok(r && r.decision === 'block' && /Estás en 'main': crea antes una rama/.test(r.reason), 'en main: bloquea y pide crear una rama', r && r.reason);

// 6. archivos nuevos dentro de una carpeta nueva: cada uno por su nombre (no «carpeta/»)
edita(sesion('d'), 'nueva/carpeta/uno.ts');
r = cierra(sesion('d'));
ok(r && /nueva\/carpeta\/uno\.ts/.test(r.reason), 'archivo nuevo en carpeta nueva: lo nombra entero', r && r.reason);

// 7. un archivo fuera del proyecto (temp) no cuenta como propio
const fuera = path.join(os.tmpdir(), `senzu-fuera-${RUN}.js`); fs.writeFileSync(fuera, '1');
hook('edit-tracker.mjs', { session_id: sesion('e'), tool_name: 'Write', tool_input: { file_path: fuera } });
r = cierra(sesion('e'));
ok(!r || !r.decision, 'editar fuera del proyecto no bloquea el cierre', JSON.stringify(r));
fs.rmSync(fuera, { force: true });

// 8. Codex: la edición llega como apply_patch y también cuenta como propia
const parche = '*** Begin Patch\n*** Add File: codex/hecho.md\n+hola\n*** End Patch\n';
fs.mkdirSync(path.join(repo, 'codex'), { recursive: true }); fs.writeFileSync(path.join(repo, 'codex', 'hecho.md'), 'hola\n');
hook('edit-tracker.mjs', { session_id: sesion('f'), tool_name: 'apply_patch', tool_input: { command: parche }, cwd: repo });
r = cierra(sesion('f'));
ok(r && r.decision === 'block' && /codex\/hecho\.md/.test(r.reason), 'Codex (apply_patch): su archivo cuenta como propio', JSON.stringify(r));

// limpieza: el repo temporal y las marcas de sesión de esta ejecución
fs.rmSync(repo, { recursive: true, force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) fs.rmSync(path.join(os.tmpdir(), f), { force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
