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
import { readHookInput, projectRoot, testOnce, siguientePaso, esArchivoDeCodigo, outHookJson } from './lib.mjs';

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
    outHookJson('PreToolUse', {
        additionalContext: `[senzu] Vas a escribir código (${rel}) en un ${paso.motivo}. No hace falta un plan para todo, pero sí saber qué se va a hacer: `
            + 'si el usuario te ha dicho con claridad qué quiere y para qué, sigue. Si no lo sabes (objetivo, alcance, qué entra y qué no), '
            + 'PARA y háblalo con él antes de programar, en llano y con pocas preguntas; no lo supongas. '
            + `Propón ${paso.comando} solo si es algo grande, de varias partes, o si él lo quiere.`,
    });
    process.exit(0);
}

const omitible = paso.paso !== 'instalar'
    ? `\nSi el usuario no quiere este paso en este proyecto, que lo quite él: node <senzu>/tools/init.mjs --path . --omitir-paso ${paso.paso} (tú no puedes).`
    : '';
process.stderr.write(`[BLOQUEADO por Senzu] Antes de escribir código (${rel}) falta un paso del método: ${paso.comando}.\n`
    + `Por qué: ${paso.motivo}.\n`
    + `Qué hacer: para, explícale al usuario en una frase qué falta y por qué, y proponle ${paso.comando}. `
    + 'Si te dice que sigas sin él, sigue: este muro solo te para una vez por paso y sesión.'
    + omitible + '\n');
process.exit(2);
