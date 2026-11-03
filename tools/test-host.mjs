#!/usr/bin/env node
// Detección de anfitrión del núcleo (carve-out Hemispheric, F9-T2) — core/hooks/host.mjs.
// Batería rebuscada: una fila por anfitrión, señales en conflicto, precedencia, variable "mentida" y ausencia
// total → standalone. Hermético: se inyecta `env` e `input` (no toca process.env) y se usan proyectos temporales
// para el marcador senzu/senzu.json. Determinista, sin LLM, sin red.
//   node tools/test-host.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const { resolverHost, ANFITRIONES } = await import(pathToFileURL(path.join(HOOKS, 'host.mjs')).href);

// Proyectos temporales: uno con la capa Senzu (senzu/senzu.json), otro sin nada.
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-host-'));
const rSenzu = path.join(base, 'conSenzu');
fs.mkdirSync(path.join(rSenzu, 'senzu'), { recursive: true });
fs.writeFileSync(path.join(rSenzu, 'senzu', 'senzu.json'), '{}');
const rPlano = path.join(base, 'plano');
fs.mkdirSync(rPlano, { recursive: true });

let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const R = o => resolverHost({ root: rPlano, env: {}, input: {}, ...o });   // por defecto: plano, sin señales

// ---- agente por señal real ----------------------------------------------------------------------------
ok(R({ env: { CLAUDE_PROJECT_DIR: rPlano } }).agente === 'claude', 'claude: CLAUDE_PROJECT_DIR');
ok(R({ env: { CLAUDE_PLUGIN_ROOT: 'x', CLAUDE_PROJECT_DIR: rPlano } }).agente === 'claude', 'claude: CLAUDE_PLUGIN_ROOT');
ok(R({ input: { cwd: rPlano, tool_name: 'apply_patch' } }).agente === 'codex', 'codex: apply_patch + cwd');
ok(R({ input: { codex_tool_name: 'shell', cwd: rPlano } }).agente === 'codex', 'codex: codex_tool_name');
ok(R({ env: { HEMI_OBSIDIAN: '1' } }).agente === 'obsidian', 'obsidian: marcador del adaptador');
ok(R({}).agente === 'standalone', 'standalone: sin ninguna señal');

// ---- punto de inyección por anfitrión -----------------------------------------------------------------
ok(R({ env: { CLAUDE_PROJECT_DIR: rPlano } }).inyeccion === 'hook-stdout', 'inyección claude = hook-stdout');
ok(R({ input: { cwd: rPlano, tool_name: 'apply_patch' } }).inyeccion === 'hook-stdout', 'inyección codex = hook-stdout');
ok(R({ env: { HEMI_OBSIDIAN: '1' } }).inyeccion === 'plugin-api', 'inyección obsidian = plugin-api');
ok(R({}).inyeccion === 'stdout', 'inyección standalone = stdout');

// ---- Senzu presente/ausente (eje independiente del agente) --------------------------------------------
ok(R({ root: rSenzu, env: { CLAUDE_PROJECT_DIR: rSenzu } }).senzu === true, 'senzu presente: hay senzu/senzu.json');
ok(R({ root: rPlano, env: { CLAUDE_PROJECT_DIR: rPlano } }).senzu === false, 'senzu ausente: no hay marcador');
ok(R({ root: rSenzu, env: { CLAUDE_PROJECT_DIR: rSenzu } }).agente === 'claude', 'senzu corre BAJO el agente, no lo sustituye');

// ---- precedencia, conflicto y variable mentida --------------------------------------------------------
ok(R({ env: { HEMI_ANFITRION: 'codex', CLAUDE_PROJECT_DIR: rPlano } }).agente === 'codex', 'forzado válido gana a la señal ambiental');
ok(R({ env: { HEMI_ANFITRION: 'pepe', CLAUDE_PROJECT_DIR: rPlano } }).agente === 'claude', 'variable mentida (valor desconocido) se ignora');
ok(R({ env: { CLAUDE_PROJECT_DIR: rPlano }, input: { cwd: rPlano } }).agente === 'claude', 'conflicto claude+cwd: gana claude (precedencia)');
ok(R({ env: { HEMI_OBSIDIAN: '1', CLAUDE_PROJECT_DIR: rPlano } }).agente === 'obsidian', 'conflicto obsidian+claude: gana la señal deliberada');

// ---- mapa de memoria ----------------------------------------------------------------------------------
ok(R({}).memoria.proyecto.endsWith('.hemispheric'), 'standalone: memoria de proyecto en .hemispheric', R({}).memoria.proyecto);
ok(R({ root: rSenzu, env: { CLAUDE_PROJECT_DIR: rSenzu } }).memoria.proyecto === path.join(rSenzu, 'senzu'), 'senzu: memoria de proyecto junto al marcador');
ok(R({ env: { HEMI_OBSIDIAN: '1', HEMI_VAULT: '/vault' } }).memoria.proyecto === '/vault', 'obsidian: memoria en el vault');
ok(R({ env: { CLAUDE_PROJECT_DIR: rPlano, SENZU_MEMORIA_USUARIO: '/u/mem.md' } }).memoria.usuario === '/u/mem.md', 'memoria de usuario respeta SENZU_MEMORIA_USUARIO');

// ---- invariantes --------------------------------------------------------------------------------------
for (const c of [R({}), R({ env: { CLAUDE_PROJECT_DIR: rPlano } }), R({ input: { cwd: rPlano, tool_name: 'apply_patch' } })])
    ok(ANFITRIONES.includes(c.agente), `el agente resuelto es conocido: ${c.agente}`);
const a = JSON.stringify(R({ env: { CLAUDE_PROJECT_DIR: rPlano } }));
const b = JSON.stringify(R({ env: { CLAUDE_PROJECT_DIR: rPlano } }));
ok(a === b, 'determinista: misma entrada → misma salida');

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
