#!/usr/bin/env node
// Paridad de inyección entre anfitriones (carve-out Hemispheric, F9-T4). El recall (recuerdo-vivo) y el arranque
// (session-start) deben salir IGUAL bajo Claude, Codex y standalone con los MISMOS hechos — salvo lo propio del
// anfitrión (rutas). Se corre cada hook de verdad con las señales de cada anfitrión (Claude: CLAUDE_PROJECT_DIR;
// Codex: sin esa variable, la raíz por cwd en la entrada; standalone: sin señales, cwd = proyecto) sobre proyectos
// sembrados idénticos, se normaliza la ruta del proyecto y se compara. Incluye recall multilingüe (es/en/pt/fr/de/it).
// Sesiones únicas por corrida para no chocar con el apretón de manos (F9-T3). Sin LLM, sin red, determinista.
//   node tools/test-paridad-inyeccion.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-par-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');   // aislada; igual para los 3 anfitriones
const m = await import(pathToFileURL(path.join(HOOKS, 'hechos.mjs')).href);

let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const RUN = Date.now().toString(36);
const T = s => new Date(Date.UTC(2026, 9, 7, 9, 0, s)).toISOString();

// Siembra idéntica en un proyecto propio por anfitrión (así no se pisan los contadores de uso entre corridas)
function seembra(nombre) {
    const d = path.join(base, nombre);
    fs.mkdirSync(path.join(d, 'senzu', 'devlog'), { recursive: true });
    fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), JSON.stringify({ stack: 'laravel' }));
    m.guardarHecho(d, { dimension: 'identidad.ubicacion', valor: 'Valencia', texto: 'vivo en Valencia',
        claves: ['valencia', 'ciudad', 'city', 'cidade', 'ville', 'stadt', 'citta', 'vivo', 'live', 'moro', 'vis', 'wohne'] }, { ahora: T(0) });
    m.guardarHecho(d, { dimension: 'proyecto.stack', valor: 'Laravel', texto: 'el stack es Laravel',
        claves: ['stack', 'framework', 'laravel'] }, { ahora: T(1) });
    return d;
}

// Un anfitrión = cómo se lanza el hook. Claude: CLAUDE_PROJECT_DIR. Codex: sin esa var, raíz por cwd en la ENTRADA
// (y el proceso desde otra carpeta). Standalone: sin señales, el proceso corre dentro del proyecto.
const ANFITRIONES = {
    claude:     P => ({ env: { CLAUDE_PROJECT_DIR: P, SENZU_SIN_RED: '1' }, cwd: P, extra: {} }),
    codex:      P => ({ env: { CLAUDE_PROJECT_DIR: '', SENZU_SIN_RED: '1' }, cwd: base, extra: { cwd: P } }),
    standalone: P => ({ env: { CLAUDE_PROJECT_DIR: '', SENZU_SIN_RED: '1' }, cwd: P, extra: {} }),
};
const PROY = Object.fromEntries(Object.keys(ANFITRIONES).map(a => [a, seembra(a)]));

const contexto = r => { try { return JSON.parse(r.stdout).hookSpecificOutput.additionalContext || ''; } catch { return ''; } };
const norm = (s, P) => s.split(P).join('<P>').split(P.replace(/\\/g, '/')).join('<P>');   // la ruta del proyecto → <P>

function correr(hook, anfitrion, entradaBase) {
    const P = PROY[anfitrion];
    const cfg = ANFITRIONES[anfitrion](P);
    const r = spawnSync(process.execPath, [path.join(HOOKS, hook)], {
        input: JSON.stringify({ ...entradaBase, ...cfg.extra }), encoding: 'utf8', cwd: cfg.cwd,
        env: { ...process.env, ...cfg.env },
    });
    return norm(contexto(r), P);
}

// --- recall (recuerdo-vivo) idéntico entre anfitriones, en 6 idiomas ------------------------------------
const CONSULTAS = {
    es: 'ciudad donde vivo', en: 'city where i live', pt: 'cidade onde moro',
    fr: 'ville ou je vis', de: 'stadt wo ich wohne', it: 'citta dove vivo',
};
for (const [lang, prompt] of Object.entries(CONSULTAS)) {
    const sid = base => `pv-${RUN}-${lang}-${base}`;
    const outs = Object.keys(ANFITRIONES).map(a =>
        [a, correr('recuerdo-vivo.mjs', a, { session_id: sid(a), hook_event_name: 'UserPromptSubmit', prompt })]);
    const ref = outs[0][1];
    ok(ref.includes('Valencia'), `recall ${lang}: recupera el hecho (no vacío)`, ref.slice(0, 80));
    for (const [a, o] of outs.slice(1)) ok(o === ref, `recall ${lang}: ${a} idéntico a ${outs[0][0]}`, `len ${o.length} vs ${ref.length}`);
}

// --- arranque (session-start) idéntico entre anfitriones (salvo la ruta, ya normalizada) ----------------
{
    const outs = Object.keys(ANFITRIONES).map(a =>
        [a, correr('session-start.mjs', a, { session_id: `ps-${RUN}-${a}`, hook_event_name: 'SessionStart' })]);
    const ref = outs[0][1];
    ok(ref.includes('HECHOS que ya sabes') && ref.includes('Valencia'), 'arranque: inyecta el bloque de memoria', ref.slice(0, 80));
    for (const [a, o] of outs.slice(1)) ok(o === ref, `arranque: ${a} idéntico a ${outs[0][0]}`, `len ${o.length} vs ${ref.length}`);
}

// --- el standalone por el MOTOR coincide con lo que inyecta el hook (engine ≡ hook) --------------------
{
    const P = PROY.standalone;
    const rec = m.recuerdo(P, 'ciudad donde vivo', { limite: 10 });
    const textos = rec.filter(x => x.fuente === 'hecho').map(x => x.texto);
    ok(textos.some(t => /Valencia/.test(t)), 'motor (standalone): recuerdo() trae el mismo hecho que el hook', textos.join(' | '));
}

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
