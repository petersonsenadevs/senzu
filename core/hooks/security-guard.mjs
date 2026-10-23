// Hook PreToolUse (Edit|Write|MultiEdit): AVISO (no bloquea) de puntos de inyeccion que se INTRODUCEN en el
// codigo. Son los sinks que code-quality/references/security-owasp.md explica pero que ningun muro vigilaba:
//   - XSS: HTML sin escapar con una variable (dangerouslySetInnerHTML, v-html, set:html, {@html}, Blade {!! $x !!},
//     innerHTML/outerHTML/insertAdjacentHTML/document.write con una variable).
//   - SQL injection: consulta cruda con una variable interpolada ($queryRawUnsafe de Prisma, DB::raw/whereRaw de
//     Laravel con $, cursor.execute con f-string, % o concatenacion en Python).
//   - Inyeccion de comando / ejecucion dinamica: exec/execSync/shell_exec/os.system con una variable, shell=True, eval().
// No puede saber si el dato viene saneado o parametrizado, por eso AVISA (una vez por archivo y sesion), no bloquea:
// el agente comprueba que se escapa/parametriza o sigue si es constante. Solo mira lo INTRODUCIDO y el CODIGO sin
// comentarios (D-036: citar un sink en un comentario no cuenta); escape por linea con 'senzu-allow'.

import crypto from 'node:crypto';
import fs from 'node:fs';
import {
    readHookInput, testIntroduced, projectRoot, relDelProyecto, testOnce, outHookJson, localeUI, msg,
} from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const ti = p.tool_input || {};
const file = String(ti.file_path || '').replace(/\\/g, '/');
if (!/\.(php|ts|tsx|js|jsx|mjs|cjs|py|vue|svelte|astro|html?)$/i.test(file)) process.exit(0);
if (/(^|\/)(vendor|node_modules|dist|build|\.next)\//i.test(file)) process.exit(0);
const root = projectRoot();
const rel = relDelProyecto(root, file) || file;

let antes = '';
try { antes = fs.readFileSync(file, 'utf8'); } catch {}
let despues = antes;
if (p.tool_name === 'Write') despues = String(ti.content || '');
else if (p.tool_name === 'Edit') despues = antes.replace(String(ti.old_string || ''), () => String(ti.new_string || ''));
else for (const e of [].concat(ti.edits || [])) despues = despues.replace(String(e.old_string || ''), () => String(e.new_string || ''));

// Se mira el CODIGO sin comentarios; los strings se CONSERVAN (el HTML y el SQL viven en strings: hay que ver si
// interpolan una variable). almohadilla: «# …» es comentario en PHP y Python, no en plantillas ni JS.
const COD = { strings: false, almohadilla: /\.(php|py)$/i.test(file) };
const jsFam = /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file);
const isPhp = /\.php$/i.test(file), isPy = /\.py$/i.test(file);
const isVue = /\.vue$/i.test(file), isSvelte = /\.svelte$/i.test(file), isAstro = /\.astro$/i.test(file);
const isHtml = /\.html?$/i.test(file);
const domHost = jsFam || isVue || isSvelte || isAstro || isHtml;

// Cada sink: [tipo, regex]. El regex casa en el codigo con strings conservados.
const SINKS = [];
if (jsFam) SINKS.push(['XSS (dangerouslySetInnerHTML)', /dangerouslySetInnerHTML\s*=/]);
if (isVue) SINKS.push(['XSS (v-html)', /\bv-html\s*=/]);
if (isAstro) SINKS.push(['XSS (set:html)', /\bset:html\s*=/]);
if (isSvelte) SINKS.push(['XSS ({@html})', /\{@html\s/]);
if (isPhp) SINKS.push(['XSS (Blade {!! !!} con variable)', /\{!!\s*[^!]*\$\w/]);
if (domHost) {
    SINKS.push(['XSS (innerHTML/outerHTML con variable)', /\.(inner|outer)HTML\s*=\s*(?:(?!["'`])\S|`[^`]*\$\{)/]);
    SINKS.push(['XSS (insertAdjacentHTML con variable)', /insertAdjacentHTML\s*\([^,]*,\s*(?:(?!["'`])\S|`[^`]*\$\{)/]);
    SINKS.push(['XSS (document.write con variable)', /document\.write(?:ln)?\s*\(\s*(?:(?!["'`])\S|`[^`]*\$\{)/]);
}
if (jsFam) {
    SINKS.push(['SQLi (Prisma $queryRawUnsafe/$executeRawUnsafe)', /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/]);
    SINKS.push(['inyección de comando (execSync/exec con variable)', /\bexecSync\s*\(\s*(?:(?!["'`])[A-Za-z_$]|`[^`]*\$\{)|\.exec\s*\(\s*`[^`]*\$\{/]);
}
if (isPhp) {
    SINKS.push(['SQLi (consulta raw con variable)', /(?:->|::)\s*\w*[Rr]aw\s*\(\s*(?:"[^"]*\$|[^)]*\.\s*\$|[^)]*\$\w+\s*\.)/]);
    SINKS.push(['inyección de comando (shell_exec/system/exec/passthru con variable)', /\b(?:shell_exec|passthru|proc_open|popen)\s*\(|\b(?:system|exec)\s*\(\s*(?:"[^"]*\$|[^)]*\.\s*\$|[^)]*\$\w+\s*\.)/]);
}
if (isPy) {
    SINKS.push(['SQLi (execute con f-string, % o concatenación)', /\.execute\s*\(\s*(?:f["']|[^,)]*(?:%|\+|\.format\s*\())/]);
    SINKS.push(['inyección de comando (shell=True / os.system)', /\bshell\s*=\s*True\b|\bos\.system\s*\(/]);
}
// eval() de algo que no es un literal: en JS, PHP y Python
SINKS.push(['ejecución dinámica (eval de entrada no literal)', /\beval\s*\(\s*(?:(?!["'`])[A-Za-z_$]|`[^`]*\$\{)/]);

let hit = null, tipo = null;
for (const [t, re] of SINKS) {
    const l = testIntroduced(re, despues, antes, COD);
    if (l) { hit = l; tipo = t; break; }
}

if (hit && testOnce(p.session_id || 'default', 'sec-' + crypto.createHash('md5').update(rel.toLowerCase()).digest('hex').slice(0, 10))) {
    outHookJson('PreToolUse', { additionalContext: msg('security.sink', localeUI(root), { rel, tipo, linea: hit.slice(0, 120) }) });
}
process.exit(0);
