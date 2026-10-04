// Hook PostToolUse (Edit|Write|MultiEdit; en Codex, apply_patch traducido por lib.mjs):
// 1. Apunta CADA archivo que toca esta sesión (marcador de sesión «editados»). Lo usa cierre-limpio para saber
//    qué cambios sin commitear son de este agente y cuáles no (de Codex, de otra sesión o del usuario).
// 2. Si es CÓDIGO fuente, toca el flag por-proyecto "codeedit". stop-guard lo compara con el flag "verified" que
//    escribe code-quality/scripts/verify-build.mjs: si hay ediciones posteriores a la última verificación,
//    bloquea el cierre pidiendo ejecutar la verificación (build/lint/types/tests del stack).

import fs from 'node:fs';
import path from 'node:path';
import { readHookInput, projectRoot, projectFlag, sessionFlag } from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const file = p.tool_input && p.tool_input.file_path ? String(p.tool_input.file_path) : '';
if (!file) process.exit(0);
const root = projectRoot();

// 1. Lista de archivos de la sesión (solo los de dentro del proyecto: lo de temp no se commitea)
const rel = path.relative(path.resolve(root), path.resolve(root, file));
if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
    const sid = p.session_id ? String(p.session_id) : 'default';
    try { fs.appendFileSync(sessionFlag(sid, 'editados'), rel.replace(/\\/g, '/') + '\n'); } catch {}
}

// 2. Código editado (para exigir la verificación)
if (!/\.(php|ts|tsx|js|jsx|mjs|cjs|py|vue|astro|svelte|css|scss|html|blade\.php|json)$/i.test(file)) process.exit(0);
if (/(^|[\\/])(senzu|devlog|plan|design-system)[\\/]|package-lock\.json|\.dev-standards\.json/i.test(file)) process.exit(0);   // compat-dev-standards
try { fs.writeFileSync(projectFlag(root, 'codeedit'), ''); } catch {}
process.exit(0);
