// Hook PreToolUse (Edit|Write|MultiEdit): bloquea escribir secretos en el código.
// Analiza el contenido que se va a escribir (content / new_string / edits[].new_string) y deniega (exit 2)
// si encuentra patrones de credenciales reales: claves AWS, tokens GitHub/GitLab/Slack/Stripe/OpenAI/Anthropic,
// claves privadas PEM, JWT largos, cadenas de conexión con password, Google API keys.
// Los patrones y el criterio de placeholder viven en secret-patterns.mjs (los comparte supply-guard, que escanea
// lo que entra en un git commit): una sola definicion.

import { readHookInput, projectRoot, localeUI, msg } from './lib.mjs';
import { scanSecrets } from './secret-patterns.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);

const texts = [];
const ti = p.tool_input || {};
if (ti.content) texts.push(String(ti.content));
if (ti.new_string) texts.push(String(ti.new_string));
if (ti.edits) for (const e of ti.edits) if (e && e.new_string) texts.push(String(e.new_string));
if (!texts.length) process.exit(0);
const text = texts.join('\n');

// Archivos de ejemplo/plantilla no se analizan
const file = ti.file_path ? String(ti.file_path) : '';
if (/\.(example|sample|template|dist)$|(^|[\\/])\.env\.example$/i.test(file)) process.exit(0);

const hits = scanSecrets(text);
if (hits.length) {
    const lang = localeUI(projectRoot());
    process.stderr.write(msg('secrets.block', lang, { tipo: hits[0] }) + '\n');
    process.stderr.write(msg('secrets.hint', lang) + '\n');
    process.exit(2);
}
process.exit(0);
