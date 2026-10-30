#!/usr/bin/env node
// Senzu como adaptador fino (carve-out Hemispheric, F9-T5). Los inyectores de cerebro (recuerdo-vivo, session-start)
// DELEGAN la decisión de inyectar en el núcleo (host.mjs): Senzu no decide por su cuenta, pregunta al núcleo. Este
// test lo bloquea de dos formas: estructural (los hooks enrutan por host.reclamarInyeccion) y SOBRE TODO behavioral
// (si otra capa ya reclamó el turno, el hook CEDE y no inyecta; sin reclamo, inyecta). Que el MÉTODO Senzu siga
// intacto lo cubren tools/test-hooks.ps1 y verify-build. Sin LLM, sin red, determinista.
//   node tools/test-adaptador.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-adap-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'u', 'mem.md');
const host = await import(pathToFileURL(path.join(HOOKS, 'host.mjs')).href);
const m = await import(pathToFileURL(path.join(HOOKS, 'hechos.mjs')).href);

let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const RUN = Date.now().toString(36);

const P = path.join(base, 'proj');
fs.mkdirSync(path.join(P, 'senzu', 'devlog'), { recursive: true });
fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Valencia', texto: 'vivo en Valencia', claves: ['ciudad', 'city', 'vivo'] }, { ahora: '2026-01-01T00:00:00.000Z' });

const contexto = r => { try { return JSON.parse(r.stdout).hookSpecificOutput.additionalContext || ''; } catch { return ''; } };
const hook = (nombre, entrada) => contexto(spawnSync(process.execPath, [path.join(HOOKS, nombre)], {
    input: JSON.stringify(entrada), encoding: 'utf8', cwd: P, env: { ...process.env, CLAUDE_PROJECT_DIR: P, SENZU_SIN_RED: '1' },
}));

// --- estructural: los inyectores enrutan por el núcleo (host.reclamarInyeccion) --------------------------
for (const f of ['recuerdo-vivo.mjs', 'session-start.mjs']) {
    const txt = fs.readFileSync(path.join(HOOKS, f), 'utf8');
    ok(/from '\.\/host\.mjs'/.test(txt) && /reclamarInyeccion/.test(txt), `${f} delega en host.reclamarInyeccion`);
}

// --- behavioral: la delegación MANDA de verdad --------------------------------------------------------
// recuerdo-vivo: sin reclamo previo inyecta; con el turno ya reclamado por otra capa, CEDE
const eA = { session_id: `adA-${RUN}`, hook_event_name: 'UserPromptSubmit', prompt: 'ciudad donde vivo' };
ok(hook('recuerdo-vivo.mjs', eA).includes('Valencia'), 'recuerdo-vivo: sin reclamo previo, inyecta');
const eB = { session_id: `adB-${RUN}`, hook_event_name: 'UserPromptSubmit', prompt: 'ciudad donde vivo' };
host.reclamarInyeccion('UserPromptSubmit', { input: eB, root: P });   // otra capa se adelanta
ok(hook('recuerdo-vivo.mjs', eB) === '', 'recuerdo-vivo: turno ya reclamado por otra capa → CEDE (no inyecta dos veces)');

// session-start: igual
const sA = { session_id: `adSA-${RUN}`, hook_event_name: 'SessionStart' };
ok(hook('session-start.mjs', sA).length > 0, 'session-start: sin reclamo previo, inyecta');
const sB = { session_id: `adSB-${RUN}`, hook_event_name: 'SessionStart' };
host.reclamarInyeccion('SessionStart', { input: sB, root: P });   // otra capa se adelanta
ok(hook('session-start.mjs', sB) === '', 'session-start: arranque ya reclamado por otra capa → CEDE');

// limpieza de las marcas del temp por defecto de esta corrida
try { for (const n of fs.readdirSync(os.tmpdir())) if (n.startsWith('dev-standards-hsk-') && n.includes(RUN)) fs.rmSync(path.join(os.tmpdir(), n), { force: true }); } catch { }
fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
