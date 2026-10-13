// Hook PreToolUse (Edit|Write|MultiEdit; en Codex, apply_patch traducido por lib.mjs): el MÉTODO antes que el código.
// Dos niveles, según el paso que falte (siguientePaso en lib.mjs):
//   - instalar Senzu o /adoptar en un proyecto con código: la primera vez por paso y sesión que el agente va a
//     escribir CÓDIGO lo PARA, con el qué y el porqué. Si el usuario, avisado, quiere seguir sin él, se sigue.
//   - plan o brief en un proyecto nuevo: NO se imponen (no todo proyecto los necesita). Lo obligatorio es saber
//     qué se va a hacer: la primera vez le recuerda que, si el usuario no lo ha dicho claro, lo hable con él
//     antes de programar; /plan solo si es algo grande o el usuario lo quiere. No bloquea.
// El usuario puede quitar un paso para siempre en un proyecto: init.mjs --omitir-paso adoptar|plan|brief.
// Nunca toca lo que es del propio método: senzu/, CLAUDE.md, AGENTS.md, .claude/, .agents/ y la documentación.

import path from 'node:path';
import { readHookInput, projectRoot, testOnce, siguientePaso, esArchivoDeCodigo, outHookJson, localeUI, msg } from './lib.mjs';

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
if (!paso || !(paso.bloquea || paso.conversar)) process.exit(0);
const sid = p.session_id ? String(p.session_id) : 'default';
if (!testOnce(sid, 'arranque-' + paso.paso)) process.exit(0);

if (paso.conversar) {
    outHookJson('PreToolUse', { additionalContext: msg('arranque.conversar', localeUI(root), { rel, motivo: paso.motivo, comando: paso.comando }) });
    process.exit(0);
}

const lang = localeUI(root);
const omitible = paso.paso !== 'instalar' ? msg('arranque.omitible', lang, { paso: paso.paso }) : '';
process.stderr.write(msg('arranque.block', lang, { rel, comando: paso.comando, motivo: paso.motivo }) + omitible + '\n');
process.exit(2);
