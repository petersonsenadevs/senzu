#!/usr/bin/env node
// Apretón de manos del núcleo (carve-out Hemispheric, F9-T3) — host.reclamarInyeccion.
// Que recuerdo-vivo + session-start no inyecten dos veces cuando hay dos capas registradas para el mismo evento.
// Batería rebuscada: doble registro → una sola · turnos/sesiones/proyectos distintos → inyectan · SessionStart por
// source · cerrojo huérfano (pasado el ttl) se reclama · reloj hacia atrás NO caduca en falso · carrera real de
// procesos → exactamente uno. Hermético (dir de marcas inyectado) y determinista (ahora fijo). Sin LLM, sin red.
//   node tools/test-handshake.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const { reclamarInyeccion } = await import(pathToFileURL(path.join(HOOKS, 'host.mjs')).href);

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-hsk-'));
const dir = path.join(base, 'claims');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const U = (sid, prompt) => ({ session_id: sid, prompt });
const inj = o => reclamarInyeccion('UserPromptSubmit', { dir, ...o }).inyectar;

// --- doble registro / aislamiento por turno, sesión y proyecto ----------------------------------------
ok(inj({ input: U('s', 'hola') }), 'primer registro del turno: inyecta');
ok(!inj({ input: U('s', 'hola') }), 'doble registro del MISMO turno: cede (una sola inyección)');
ok(inj({ input: U('s', 'otra cosa') }), 'mismo sid, prompt distinto: turno nuevo, inyecta');
ok(inj({ input: U('s2', 'hola') }), 'misma frase, otra sesión (p. ej. Codex vs Claude): inyecta');
ok(inj({ input: U('s', 'hola'), root: '/proj/B' }), 'misma frase y sesión, otro proyecto: inyecta');

// --- SessionStart por source ---------------------------------------------------------------------------
const ss = (src, extra = {}) => reclamarInyeccion('SessionStart', { dir, input: { session_id: 'z', source: src }, ...extra }).inyectar;
ok(ss('startup'), 'SessionStart: primer arranque inyecta');
ok(!ss('startup'), 'SessionStart mismo source: cede');
ok(ss('resume'), 'SessionStart otro source: inyecta');

// --- cerrojo huérfano (crash / sesión muerta): pasado el ttl se reclama --------------------------------
ok(reclamarInyeccion('UserPromptSubmit', { dir, input: U('orf', 'p'), ahora: 1_000_000 }).inyectar, 'orfandad: primer claim (t viejo)');
ok(!reclamarInyeccion('UserPromptSubmit', { dir, input: U('orf', 'p'), ahora: 1_030_000 }).inyectar, 'dentro del ttl: cede');
ok(reclamarInyeccion('UserPromptSubmit', { dir, input: U('orf', 'p'), ahora: 1_000_000 + 60_001 }).inyectar, 'pasado el ttl: la marca huérfana se reclama (crash no la deja pegada)');

// --- reloj hacia atrás: una marca "del futuro" sigue fresca, no caduca en falso ------------------------
reclamarInyeccion('UserPromptSubmit', { dir, input: U('clk', 'p'), ahora: 5_000_000 });
ok(!reclamarInyeccion('UserPromptSubmit', { dir, input: U('clk', 'p'), ahora: 4_000_000 }).inyectar, 'reloj hacia atrás: no caduca en falso (cede)');

// --- dir por defecto (temp del sistema) también funciona -----------------------------------------------
const unica = `def-${Date.now()}-${Math.random()}`;
const rDef = reclamarInyeccion('UserPromptSubmit', { input: { session_id: unica, prompt: unica } });
ok(rDef.inyectar && fs.existsSync(rDef.archivo), 'dir por defecto (temp del sistema): reclama y deja la marca');
try { fs.rmSync(rDef.archivo, { force: true }); } catch { }

// --- carrera REAL de procesos simultáneos sobre el mismo turno: exactamente uno inyecta ----------------
const runner = path.join(base, 'runner.mjs');
fs.writeFileSync(runner,
    `import path from 'node:path';\nimport { pathToFileURL } from 'node:url';\n` +
    `const [,, hooks, d, sid, prompt] = process.argv;\n` +
    `const { reclamarInyeccion } = await import(pathToFileURL(path.join(hooks, 'host.mjs')).href);\n` +
    `process.stdout.write(reclamarInyeccion('UserPromptSubmit', { dir: d, input: { session_id: sid, prompt } }).inyectar ? 'SI' : 'NO');\n`);
const correr = args => new Promise(res => { let o = ''; const c = spawn(process.execPath, [runner, ...args]); c.stdout.on('data', d => o += d); c.on('close', () => res(o.trim())); });
const dirCarrera = path.join(base, 'carrera');
const K = 8;
const salidas = await Promise.all(Array.from({ length: K }, () => correr([HOOKS, dirCarrera, 'race', 'mensaje-carrera'])));
const sis = salidas.filter(x => x === 'SI').length;
ok(sis === 1, `carrera de ${K} procesos simultáneos: exactamente uno inyecta`, `SI=${sis} (${salidas.join(',')})`);

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
