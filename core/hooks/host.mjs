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
import crypto from 'node:crypto';
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

// ---------------------------------------------------------------- apretón de manos (F9-T3)
// Que recuerdo-vivo + session-start (los que emiten additionalContext) no inyecten DOS VECES cuando hay dos capas
// registradas para el mismo evento (p. ej. el núcleo Hemispheric y el adaptador Senzu). Cerrojo de turno
// "primero-gana", atómico: la primera invocación de un evento+turno se queda el turno e inyecta; la segunda lo ve
// y cede. El contenido es el mismo motor en ambas capas, así que da igual quién gane: basta con que inyecte UNA.
// NO se basa en "quién es Senzu" (en el repo fuente los hooks son los de Senzu pero no hay senzu.json; un cede por
// marcador los silenciaría): el dueño determinista por capa se decide en F10, cuando cada capa tiene su instalación.
const sanitClave = s => s.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180);

// Clave del turno: el mismo mensaje/arranque produce la MISMA clave en las dos capas (para que colisionen y una ceda),
// pero DISTINTA entre proyectos (raíz) y sesiones (sid), para no mezclar turnos de proyectos ni de sesiones distintas.
function claveTurno(evento, input, root) {
    const sid = String((input && input.session_id) || 'default');
    const raiz = root ? crypto.createHash('md5').update(String(root)).digest('hex').slice(0, 8) : '';
    let huella = '';
    if (evento === 'UserPromptSubmit') huella = crypto.createHash('md5').update(String((input && input.prompt) || '')).digest('hex').slice(0, 12);
    else if (evento === 'SessionStart') huella = String((input && input.source) || '');
    return `${evento}:${raiz}:${sid}:${huella}`;
}

// Reclamo atómico: true = me quedo el turno (inyecto); false = ya lo tiene otro fresco (cedo). Creación exclusiva
// (flag 'wx') → en una carrera de procesos solo uno crea el archivo. Marca caducada (crash/sesión muerta) → se
// retira y se reintenta. Reloj hacia atrás (ahora < ts) → diff negativa < ttl → fresca → cedo (no caduca en falso).
function reclamarMarca(f, { pid, ahora, ttlMs }) {
    try { fs.mkdirSync(path.dirname(f), { recursive: true }); } catch { }
    for (let i = 0; i < 2; i++) {
        try {
            fs.writeFileSync(f, JSON.stringify({ pid, ts: ahora }), { flag: 'wx' });
            return true;
        } catch (e) {
            if (e.code !== 'EEXIST') throw e;
            let ts = 0;
            try { ts = (JSON.parse(fs.readFileSync(f, 'utf8')) || {}).ts || 0; } catch { }
            if (ahora - ts < ttlMs) return false;          // marca fresca de otra capa: cedo
            try { fs.rmSync(f, { force: true }); } catch { } // marca huérfana: la retiro y reintento
        }
    }
    return false;   // otro se adelantó tras retirar la huérfana: cedo
}

// ¿Debo inyectar YO este evento? dir inyectable para tests; por defecto el temp con prefijo dev-standards- (lo barre
// session-end a los 2 días). ttlMs = ventana de un turno: pasada, una marca se considera huérfana.
export function reclamarInyeccion(evento, { input = {}, root, ahora = Date.now(), ttlMs = 60000, dir } = {}) {
    const clave = claveTurno(evento, input, root);
    const f = dir ? path.join(dir, sanitClave(clave) + '.claim') : path.join(os.tmpdir(), 'dev-standards-hsk-' + sanitClave(clave) + '.flag');
    const inyectar = reclamarMarca(f, { pid: process.pid, ahora, ttlMs });
    return { inyectar, clave, archivo: f, motivo: inyectar ? 'reclamado' : 'ya reclamado este turno' };
}

// CLI de diagnóstico: `node core/hooks/host.mjs` imprime el anfitrión resuelto aquí y ahora.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    process.stdout.write(JSON.stringify(resolverHost(), null, 2) + '\n');
}
