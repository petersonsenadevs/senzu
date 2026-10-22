// Hook PreToolUse (Bash|PowerShell): muro de cadena de suministro. Capa complementaria a guard.mjs.
//   - Comando de instalacion (npm/pip/composer... install <pkg>): mira los NOMBRES de paquete (typosquatting,
//     denylist de malware) ANTES de que entren.
//   - git commit: escanea lo que entra en el commit (staged) -> manifests de dependencias, archivos de skills/
//     plugins (inyeccion de prompt, exfiltracion, ofuscacion) y .mcp.json (servidores que descargan/ejecutan).
// high -> bloquea (exit 2). med -> avisa (additionalContext, no bloquea). Escape (tras verificar): SENZU_ALLOW_SUPPLY=1.
// "Citar no es hacer" (D-036): se mira lo que se EJECUTA (sinTextoCitado), no el texto citado de un commit/heredoc.
// Es de seguridad: no se puede apagar (HOOKS_NO_APAGABLES en lib.mjs).

import { readHookInput, projectRoot, localeUI, msg, envSenzu, sinTextoCitado, git, scriptsEjecutados } from './lib.mjs';
import { scanInstallCommand, scanDependencies, scanSkills, scanInstallSource, scanStagedSecrets } from './supply-scan.mjs';

const p = readHookInput();
if (!p) process.exit(0);
if (!['Bash', 'PowerShell'].includes(p.tool_name)) process.exit(0);
const cmd = p.tool_input && p.tool_input.command ? String(p.tool_input.command) : '';
if (!cmd.trim()) process.exit(0);
const c = sinTextoCitado(cmd);
const root = projectRoot();
const lang = localeUI(root);

const findings = [];
// 1. comando de instalacion (cada trozo ejecutable por separado)
for (const trozo of c.split(/&&|\|\||;|\n|\|/)) findings.push(...scanInstallCommand(trozo));
// 1b. lo que hay DENTRO de un script que el comando ejecuta (bash x.sh con «npm install <malware>» dentro): asi no
// se evade metiendo la instalacion en un archivo y lanzandolo. Un solo nivel, sin recursion (scriptsEjecutados).
for (const { rel, contenido } of scriptsEjecutados(c, root)) {
    for (const trozo of sinTextoCitado(contenido).split(/&&|\|\||;|\n|\|/)) {
        for (const f of scanInstallCommand(trozo)) { f.why = `${f.why} [en el script ${rel}]`; findings.push(f); }
    }
}

// 2. git commit: escanear lo que entra (staged)
if (/\bgit\s+commit\b/i.test(c)) {
    const staged = git(root, ['diff', '--cached', '--name-only', '--diff-filter=d']).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const manifests = staged.filter(f => /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|composer\.json)$/i.test(f));
    // Solo skills que AÑADE el usuario (no confiables): .claude/skills, .agents/skills. NO la maquinaria de Senzu
    // (core/hooks, plugins/*/hooks) ni las skills first-party: darian falsos positivos (un hook cita `fetch`, una
    // guia OWASP cita el ataque). Las vendored las cubre la suite test-supply en el pre-commit.
    const skillFiles = staged.filter(f => /(^|\/)\.(claude|agents)\/skills\//i.test(f));
    const mcp = staged.filter(f => /(^|\/)\.mcp\.json$/i.test(f));
    if (manifests.length) findings.push(...scanDependencies(root, { files: manifests }));
    if (skillFiles.length) findings.push(...scanSkills(root, { files: skillFiles }));
    if (mcp.length) findings.push(...scanInstallSource(root, { files: mcp }));
    // secretos en CUALQUIER archivo que entra en el commit (no solo manifests): un .env, un config, un json
    if (staged.length) findings.push(...scanStagedSecrets(root, { files: staged }));
}

if (!findings.length) process.exit(0);
const linea = f => `- [${f.axis}] ${f.where}: ${f.why}`;
// Secretos: concepto aparte (no es typosquatting). Se bloquea siempre, sin el escape SENZU_ALLOW_SUPPLY: la
// solucion es quitar la credencial y usar variables de entorno, no commitearla igual. (Como secrets-guard en edicion.)
const secretos = findings.filter(f => f.axis === 'secreto');
if (secretos.length) {
    process.stderr.write(msg('secrets.commitBlock', lang) + '\n');
    for (const f of secretos) process.stderr.write(linea(f) + '\n');
    process.stderr.write(msg('secrets.hint', lang) + '\n');
    process.exit(2);
}
const high = findings.filter(f => f.sev === 'high');
const med = findings.filter(f => f.sev === 'med');
const allow = envSenzu('ALLOW_SUPPLY') === '1';

if (high.length && !allow) {
    process.stderr.write(msg('guard.prefix', lang) + ' ' + msg('supply.block', lang) + '\n');
    for (const f of high) process.stderr.write(linea(f) + '\n');
    for (const f of med) process.stderr.write(linea(f) + '\n');
    process.stderr.write(msg('supply.retry', lang) + '\n');
    process.exit(2);
}
// solo avisos (o high ya autorizado con el escape): contexto, no bloquea
const avisos = allow ? findings : med;
if (avisos.length) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse',
        additionalContext: msg('supply.warn', lang) + ' ' + avisos.map(linea).join(' ') } }) + '\n');
}
process.exit(0);
