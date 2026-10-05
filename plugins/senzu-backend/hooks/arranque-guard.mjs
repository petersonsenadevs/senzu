// Hook PreToolUse (Edit|Write|MultiEdit; en Codex, apply_patch traducido por lib.mjs): el MÉTODO antes que el código.
// Si al proyecto le falta un paso que va antes de programar (instalar Senzu, /adoptar en un proyecto con código,
// /brief o /plan en uno nuevo), la primera vez en la sesión que el agente va a escribir CÓDIGO lo para y le dice
// cuál es el paso y por qué. Solo una vez por paso y sesión: si el usuario, avisado, quiere seguir sin él, se sigue.
// El usuario puede quitar un paso para siempre en un proyecto: init.mjs --omitir-paso adoptar|plan|brief.
// Nunca para lo que es del propio método: senzu/, CLAUDE.md, AGENTS.md, .claude/, .agents/ y la documentación.

import path from 'node:path';
import { readHookInput, projectRoot, testOnce, siguientePaso, esArchivoDeCodigo } from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const file = p.tool_input && p.tool_input.file_path ? String(p.tool_input.file_path) : '';
if (!file) process.exit(0);
const root = projectRoot();
const rel = path.relative(path.resolve(root), path.resolve(root, file)).replace(/\\/g, '/');
if (!rel || rel.startsWith('..')) process.exit(0);
if (/^(senzu|\.claude|\.agents|\.codex|\.githooks|\.dev-standards|docs?)\//i.test(rel) || /^(CLAUDE|AGENTS)\.md$/i.test(rel)) process.exit(0);
// código o el andamiaje del proyecto (el manifiesto también decide cómo se programa)
const MANIFIESTOS = /^(package\.json|composer\.json|pyproject\.toml|go\.mod|Cargo\.toml|Gemfile|requirements\.txt)$/i;
if (!esArchivoDeCodigo(rel) && !MANIFIESTOS.test(path.basename(rel))) process.exit(0);

const paso = siguientePaso(root);
if (!paso || !paso.bloquea) process.exit(0);
const sid = p.session_id ? String(p.session_id) : 'default';
if (!testOnce(sid, 'arranque-' + paso.paso)) process.exit(0);

const omitible = paso.paso !== 'instalar'
    ? `\nSi el usuario no quiere este paso en este proyecto, que lo quite él: node <senzu>/tools/init.mjs --path . --omitir-paso ${paso.paso} (tú no puedes).`
    : '';
process.stderr.write(`[BLOQUEADO por Senzu] Antes de escribir código (${rel}) falta un paso del método: ${paso.comando}.\n`
    + `Por qué: ${paso.motivo}.\n`
    + `Qué hacer: para, explícale al usuario en una frase qué falta y por qué, y proponle ${paso.comando}. `
    + 'Si te dice que sigas sin él, sigue: este muro solo te para una vez por paso y sesión.'
    + omitible + '\n');
process.exit(2);
