#!/usr/bin/env node
// host.mjs — Detección de anfitrión del núcleo de memoria (carve-out Hemispheric, F9-T2).
// El MISMO núcleo corre bajo varios anfitriones; aquí se resuelve, por señales del entorno, determinista y sin red:
//   · agente:   'claude' | 'codex' | 'obsidian' | 'standalone'  — el runtime que ejecuta el núcleo
//   · senzu:    ¿está la capa Senzu presente en el proyecto?  — clave para el apretón de manos (F9-T3): si está,
//               el núcleo cede la inyección para no duplicarla
//   · memoria:  dónde leer/escribir  — { proyecto, usuario (global), estado (sesión) }
//   · inyeccion: por dónde sale el contexto  — 'hook-stdout' (claude/codex) | 'plugin-api' (obsidian) | 'stdout'
// Señales REALES del repo (ver lib.readHookInput): Claude exporta CLAUDE_PROJECT_DIR/CLAUDE_PLUGIN_ROOT; Codex no,
// y la raíz llega como "cwd" en la entrada, con forma de parche (apply_patch / codex_tool_name); Senzu = marcador
// senzu/senzu.json (lib.rutaMarcador). Obsidian y standalone aún no corren en este repo: Obsidian lo marca su
// adaptador (HEMI_OBSIDIAN, F10-T3); sin señales → standalone. Todo lee de un `env` INYECTABLE: así se testea
// hermético y queda determinista.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rutaNativa, ruta, rutaMarcador } from './lib.mjs';

export const ANFITRIONES = ['claude', 'codex', 'obsidian', 'standalone'];

// Espejo de lib.rutaMemoriaUsuario pero leyendo del env inyectado (memoria global, igual en todos los anfitriones).
const rutaUsuario = env => env.SENZU_MEMORIA_USUARIO || env.DEV_STANDARDS_MEMORIA_USUARIO
    || path.join(os.homedir(), '.config', 'senzu', 'memoria.md');

const existeMarcadorSenzu = raiz => { try { return fs.existsSync(rutaMarcador(raiz)); } catch { return false; } };

function detectarAgente(env, input) {
    // 1) Forzado explícito, pero SOLO si es un valor conocido: una variable "mentida"/basura se ignora y se detecta igual
    const forzado = String(env.HEMI_ANFITRION || '').toLowerCase();
    if (ANFITRIONES.includes(forzado)) return forzado;
    // 2) Obsidian: marcador explícito de su adaptador (gana a Claude: es una señal deliberada, no ambiental)
    if (env.HEMI_OBSIDIAN) return 'obsidian';
    // 3) Claude: exporta estas variables de entorno
    if (env.CLAUDE_PROJECT_DIR || env.CLAUDE_PLUGIN_ROOT) return 'claude';
    // 4) Codex: no exporta CLAUDE_*; la raíz llega como cwd y la edición como parche
    if (input && (input.codex_tool_name || input.tool_name === 'apply_patch' || input.cwd)) return 'codex';
    // 5) Sin señales: uso directo (CLI / biblioteca)
    return 'standalone';
}

// Resuelve el anfitrión y el mapa de memoria. input = entrada del hook (opcional); env = variables (inyectable);
// root = raíz del proyecto (opcional; si falta se deduce del env/input/cwd). Solo lectura: no crea carpetas.
export function resolverHost({ input = {}, env = process.env, root } = {}) {
    const raiz = rutaNativa(root || env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd());
    const agente = detectarAgente(env, input);
    const senzu = existeMarcadorSenzu(raiz);
    const inyeccion = agente === 'obsidian' ? 'plugin-api' : agente === 'standalone' ? 'stdout' : 'hook-stdout';
    const proyecto = senzu ? path.dirname(rutaMarcador(raiz))
        : agente === 'obsidian' ? (env.HEMI_VAULT || null)
            : path.join(raiz, '.hemispheric');
    return {
        agente,
        senzu,
        raiz,
        inyeccion,
        memoria: {
            proyecto,
            usuario: rutaUsuario(env),
            estado: path.join(ruta(raiz, '.estado'), 'ultima-sesion.json'),   // sin efecto: no crea el dir (a diferencia de lib.rutaEstado)
        },
    };
}

// CLI de diagnóstico: `node core/hooks/host.mjs` imprime el anfitrión resuelto aquí y ahora.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    process.stdout.write(JSON.stringify(resolverHost(), null, 2) + '\n');
}
