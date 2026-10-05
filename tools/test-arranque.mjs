#!/usr/bin/env node
// Suite del arranque guiado: siguientePaso() en lib.mjs (qué paso del método falta), el muro arranque-guard
// (no deja escribir código sin él, una vez por paso y sesión) y lo que anuncia session-start.
//   node tools/test-arranque.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = path.join(ROOT, 'core', 'hooks');
const lib = await import(pathToFileURL(path.join(HOOKS, 'lib.mjs')).href);
const PLANTILLAS = path.join(ROOT, 'core', 'skills', 'project-planner', 'templates');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const RUN = Date.now().toString(36);

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-arranque-'));
// Proyecto de prueba: marcador (o no), plantillas del plan como las deja el instalador y archivos extra
function proyecto(nombre, { marker = null, archivos = {} } = {}) {
    const d = path.join(base, nombre);
    fs.mkdirSync(path.join(d, 'senzu', 'plan'), { recursive: true });
    if (marker) fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), JSON.stringify(marker));
    fs.copyFileSync(path.join(PLANTILLAS, 'PLAN.md'), path.join(d, 'senzu', 'plan', 'PLAN.md'));
    fs.copyFileSync(path.join(PLANTILLAS, 'brief.md'), path.join(d, 'senzu', 'plan', 'brief.md'));
    for (const [rel, txt] of Object.entries(archivos)) {
        fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true });
        fs.writeFileSync(path.join(d, rel), txt);
    }
    return d;
}
const FRONT = { stack: 'astro', frontProfile: { label: 'Astro', stacks: ['astro'] } };
const BACK = { stack: 'node-api' };
const paso = d => (lib.siguientePaso(d) || { paso: null }).paso;
const CARTA = '\n### F1-T1 · Crear el endpoint de pedidos  [M] [todo]\n- Para qué: que el cliente pueda pedir\n';

// 1. siguientePaso: el orden del método
ok(paso(proyecto('sin-marcador')) === 'instalar', 'sin senzu.json → instalar');
ok(paso(proyecto('nuevo-front', { marker: FRONT })) === 'brief', 'nuevo con interfaz → brief');
ok(paso(proyecto('nuevo-back', { marker: BACK })) === 'plan', 'nuevo sin interfaz → plan (no brief)');
const conBrief = proyecto('front-con-brief', { marker: FRONT });
fs.writeFileSync(path.join(conBrief, 'senzu', 'plan', 'brief.md'), '# Brief — Tienda\n\n## Objetivo (una frase)\nVender cerámica online.\n');
ok(paso(conBrief) === 'plan', 'con brief real → plan');
const conPlan = proyecto('con-plan', { marker: BACK });
fs.appendFileSync(path.join(conPlan, 'senzu', 'plan', 'PLAN.md'), CARTA);
const sp = lib.siguientePaso(conPlan);
ok(sp && sp.paso === 'siguiente' && sp.bloquea === false && /F1-T1/.test(sp.motivo), 'con tarjetas reales → /siguiente, sin bloquear', JSON.stringify(sp));
ok(paso(proyecto('existente', { marker: BACK, archivos: { 'src/app.ts': 'export const x = 1;\n' } })) === 'adoptar', 'código sin convenciones → adoptar');
ok(paso(proyecto('existente-suelto', { marker: BACK, archivos: { 'tools/run.mjs': 'export {};\n' } })) === 'adoptar', 'código fuera de src/ también cuenta como existente');
ok(paso(proyecto('con-convenciones', { marker: BACK, archivos: { 'src/app.ts': 'x', 'senzu/conventions.md': '# Convenciones\n' } })) !== 'adoptar', 'con convenciones selladas no pide adoptar');
ok(paso(proyecto('omite-adoptar', { marker: { ...BACK, omitirPasos: ['adoptar'] }, archivos: { 'src/app.ts': 'x' } })) !== 'adoptar', 'omitirPasos adoptar');
ok(paso(proyecto('omite-plan', { marker: { ...FRONT, omitirPasos: ['plan'] } })) === null, 'omitirPasos plan (también quita el brief)');
ok(paso(proyecto('omite-brief', { marker: { ...FRONT, omitirPasos: ['brief'] } })) === 'plan', 'omitirPasos brief → sigue pidiendo el plan');
ok(paso(proyecto('solo-docs', { marker: BACK, archivos: { 'README.md': '# Hola\n' } })) === 'plan', 'un README no convierte el proyecto en existente');

// 2. planStatus no cuenta las tarjetas de ejemplo de la plantilla
ok(lib.planStatus(proyecto('plantilla', { marker: BACK })).total === 0, 'la plantilla de PLAN.md tiene 0 tareas reales');
ok(lib.planStatus(conPlan).total === 1, 'una tarjeta real cuenta');

// 3. el muro
const HOOK = path.join(HOOKS, 'arranque-guard.mjs');
const hook = (d, entrada) => spawnSync(process.execPath, [HOOK], { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: d } });
const escribe = (d, sid, file, tool = 'Write') => hook(d, { session_id: sid, tool_name: tool, tool_input: { file_path: path.join(d, file), content: 'x', old_string: 'a', new_string: 'b' } });
const bloquea = (r, n, re) => ok(r.status === 2 && (!re || re.test(r.stderr)), `bloquea: ${n}`, `exit ${r.status} ${r.stderr.slice(0, 200)}`);
const deja = (r, n) => ok(r.status === 0, `deja: ${n}`, `exit ${r.status} ${r.stderr.slice(0, 200)}`);

const nb = proyecto('muro-back', { marker: BACK });
bloquea(escribe(nb, `a-${RUN}`, 'src/index.ts'), 'primer código sin plan', /\/plan[\s\S]*Por qué[\s\S]*--omitir-paso plan/);
deja(escribe(nb, `a-${RUN}`, 'src/otro.ts'), 'la segunda vez en la misma sesión (el usuario ya está avisado)');
bloquea(escribe(nb, `b-${RUN}`, 'src/index.ts', 'Edit'), 'en otra sesión vuelve a avisar (Edit)');
bloquea(escribe(nb, `c-${RUN}`, 'package.json'), 'el manifiesto también es código');
for (const f of ['senzu/plan/PLAN.md', 'senzu/plan/brief.md', 'CLAUDE.md', 'AGENTS.md', 'README.md', 'docs/guia.md', '.claude/settings.json'])
    deja(escribe(nb, `d-${RUN}`, f), `lo del método y la documentación: ${f}`);
deja(escribe(nb, `d2-${RUN}`, '../fuera/app.ts'), 'archivos fuera del proyecto');
deja(escribe(conPlan, `e-${RUN}`, 'src/index.ts'), 'con plan real no bloquea');
bloquea(escribe(proyecto('muro-sin', {}), `f-${RUN}`, 'src/index.ts'), 'sin Senzu instalado: /instalar', /\/instalar/);
ok(!/omitir-paso/.test(escribe(proyecto('muro-sin2', {}), `f2-${RUN}`, 'app.py').stderr), 'instalar no se puede omitir');
bloquea(escribe(proyecto('muro-exist', { marker: BACK, archivos: { 'src/a.ts': 'x' } }), `g-${RUN}`, 'src/b.ts'), 'proyecto existente: /adoptar', /\/adoptar/);
deja(escribe(proyecto('muro-apagado', { marker: { ...BACK, hooksApagados: ['arranque-guard'] } }), `h-${RUN}`, 'src/index.ts'), 'apagado por el usuario en el marcador');
const parche = '*** Begin Patch\n*** Add File: src/main.py\n+print(1)\n*** End Patch\n';
const nc = proyecto('muro-codex', { marker: BACK });
const rc = hook(nc, { session_id: `i-${RUN}`, tool_name: 'apply_patch', tool_input: { command: parche }, cwd: nc });
bloquea(rc, 'Codex (apply_patch) también');

// 4. session-start anuncia el paso y el idioma
const ss = spawnSync(process.execPath, [path.join(HOOKS, 'session-start.mjs')], { input: JSON.stringify({ session_id: `s-${RUN}`, hook_event_name: 'SessionStart' }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: nb } });
let ctx = ''; try { ctx = JSON.parse(ss.stdout).hookSpecificOutput.additionalContext; } catch { }
ok(/SIGUIENTE PASO DEL MÉTODO: \/plan/.test(ctx), 'session-start: siguiente paso', ctx.slice(0, 300));
ok(/Idioma: responde en castellano/.test(ctx), 'session-start: idioma');
ok(!/Empieza por \/brief/.test(ctx), 'session-start: sin interfaz no propone /brief');
ok(/todavía la plantilla/.test(ctx), 'session-start: plan de plantilla = por hacer');
const ssF = spawnSync(process.execPath, [path.join(HOOKS, 'session-start.mjs')], { input: JSON.stringify({ session_id: `s2-${RUN}`, hook_event_name: 'SessionStart' }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: proyecto('ss-sin', {}) } });
ok(/no está instalado[\s\S]*\/instalar/.test(ssF.stdout), 'session-start: sin Senzu propone /instalar');

// 5. el instalador guarda omitirPasos, lo conserva al reinstalar y lo quita con --sin-omitir (sync.ps1: test-init-parity)
const inst = path.join(base, 'instalado');
fs.mkdirSync(inst);
const init = (...extra) => spawnSync(process.execPath, [path.join(ROOT, 'tools', 'init.mjs'), '--stack', 'node-api', '--perfil', 'backend', '--path', inst, '--tools', 'claude', ...extra], { encoding: 'utf8' });
const omitidos = () => { try { return JSON.parse(fs.readFileSync(path.join(inst, 'senzu', 'senzu.json'), 'utf8')).omitirPasos || null; } catch { return 'sin marcador'; } };
const r1 = init('--omitir-paso', 'adoptar,raro');
ok(JSON.stringify(omitidos()) === '["adoptar"]', 'init --omitir-paso guarda los válidos', JSON.stringify(omitidos()));
ok(/Paso desconocido: raro/.test(r1.stdout + r1.stderr), 'init avisa de un paso desconocido');
init();
ok(JSON.stringify(omitidos()) === '["adoptar"]', 'reinstalar sin la opción lo conserva', JSON.stringify(omitidos()));
init('--sin-omitir');
ok(omitidos() === null, '--sin-omitir lo quita', JSON.stringify(omitidos()));

// limpieza: proyectos y marcadores de sesión de esta ejecución
fs.rmSync(base, { recursive: true, force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) { try { fs.rmSync(path.join(os.tmpdir(), f), { force: true }); } catch { } }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
