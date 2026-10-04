// Hook PreToolUse (Edit|Write|MultiEdit; en Codex, apply_patch traducido por lib.mjs): memoria POR ARCHIVO.
// La primera vez que la sesión va a tocar un archivo, le pasa al agente lo que la memoria y el devlog dicen de
// ese archivo (por su ruta o su nombre): decisiones vigentes, lo que no funcionó, por qué se hizo así.
// Así no rehace lo que se decidió en otra sesión, ni repite un intento fallido. No bloquea nunca.

import path from 'node:path';
import crypto from 'node:crypto';
import { readHookInput, projectRoot, testOnce, decisionesDeArchivo, outHookJson, rutaRel } from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const file = p.tool_input && p.tool_input.file_path ? String(p.tool_input.file_path) : '';
if (!file) process.exit(0);
const root = projectRoot();
const rel = path.relative(path.resolve(root), path.resolve(root, file)).replace(/\\/g, '/');
if (!rel || rel.startsWith('..')) process.exit(0);
// la propia memoria, el devlog y el plan no se comentan a sí mismos
const DL = rutaRel(root, 'devlog'), PL = rutaRel(root, 'plan');
if (rel.startsWith(DL + '/') || rel.startsWith(PL + '/')) process.exit(0);
const sid = p.session_id ? String(p.session_id) : 'default';
const clave = 'memarch-' + crypto.createHash('md5').update(rel.toLowerCase()).digest('hex').slice(0, 12);
if (!testOnce(sid, clave)) process.exit(0);

const dice = decisionesDeArchivo(root, rel);
if (!dice.length) process.exit(0);
outHookJson('PreToolUse', {
    additionalContext: `[senzu] Antes de tocar ${rel}, esto dice la memoria del proyecto de ese archivo:\n`
        + dice.map(d => `  · ${d}`).join('\n')
        + '\nRespeta lo vigente. Si tu cambio lo contradice, cita la decisión (D-xxx o la entrada) y pregunta antes.',
});
process.exit(0);
