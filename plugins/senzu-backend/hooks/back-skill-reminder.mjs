// Hook PreToolUse (Edit|Write|MultiEdit): la PRIMERA vez por sesión que el agente va a editar código de
// backend (controladores, servicios, modelos, rutas, migraciones, API), le recuerda la receta de su stack,
// las convenciones selladas y las versiones reales. Equivalente de front-skill-reminder. No bloquea.

import fs from 'node:fs';
import path from 'node:path';
import {
    readHookInput, projectRoot, hookConfig, testOnce, outHookJson, ruta, rutaRel, esCodigoBackend, relDelProyecto,
} from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const file = String((p.tool_input && p.tool_input.file_path) || '').replace(/\\/g, '/');
if (!file) process.exit(0);
// Qué es backend: una sola definición para todos los muros (lib.mjs esCodigoBackend)
if (!esCodigoBackend(relDelProyecto(projectRoot(), file) || file)) process.exit(0);
if (!testOnce(p.session_id || 'default', 'back-reminder')) process.exit(0);

const root = projectRoot();
const cfg = hookConfig(root) || {};
const receta = {
    laravel: 'php-laravel.md', wordpress: 'wordpress.md', 'node-api': 'node-api.md', next: 'react-next.md',
    nuxt: 'nuxt.md', sveltekit: 'sveltekit.md', astro: 'astro.md', 'vue-ts': 'typescript.md', 'python-langgraph': 'python.md',
}[cfg.stack] || null;
const convenciones = fs.existsSync(ruta(root, 'conventions.md'));

outHookJson('PreToolUse', {
    additionalContext: `[senzu] Vas a editar backend (${path.basename(file)}). Aplica la skill code-quality`
        + (receta ? ` (receta del stack: references/${receta})` : '')
        + '; para un tema concreto, su catálogo references/backend-catalog.md. '
        + (convenciones ? `Hay convenciones selladas en ${rutaRel(root, 'conventions.md')}: mandan sobre tu preferencia. ` : 'Imita el estilo del código vecino. ')
        + 'Usa las prácticas de la versión REAL del framework (la indicó session-start). Valida la entrada en el borde, '
        + 'autorización en cada acción sensible, sin N+1, y el cambio va con su test. Al cerrar, feature-guard comprueba que hay test, '
        + 'que las migraciones se ejecutaron y se probó su rollback, y que las variables de entorno nuevas están en .env.example. '
        + 'Varias escrituras que van juntas, en una transacción. Si algo falla, skill depurar.',
});
process.exit(0);
