// Escaner de cadena de suministro de Senzu (supply-guard). Offline y determinista (D-003): sin red, sin estado.
// Cuatro ejes:
//   1. Dependencias instaladas/declaradas: scripts de instalacion peligrosos, paquetes en denylist, typosquatting.
//   2. Skills/plugins de terceros: inyeccion de prompt, exfiltracion, ofuscacion, URLs sospechosas.
//   3. Origen de lo que se instala: servidores .mcp.json que descargan y ejecutan.
//   4. Comandos de instalacion (para el muro): npm/pip/composer... install <paquete> antes de que entre.
//
// "Citar no es hacer" (D-036): los patrones de CODIGO (eval, fetch+env, base64) solo se miran en archivos de
// codigo, nunca en la prosa de un .md (una guia que menciona `curl` o `eval()` no es un ataque). La inyeccion de
// prompt y los caracteres ocultos se miran en todo el texto: ahi el texto ES la carga util.
//
// Severidad: 'high' = bloquea (exit 2 en el muro); 'med' = avisa (contexto, no bloquea). La denylist, los scripts
// de instalacion con red/shell, la inyeccion de prompt, la exfiltracion y la ofuscacion son high. El typosquatting
// y las URLs sueltas son med (son heuristicas con riesgo de falso positivo: avisan, no frenan).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSecrets } from './secret-patterns.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CODE_EXT = /\.(m?js|cjs|ts|tsx|jsx|py|sh|bash|zsh|rb|php|ps1|psm1)$/i;
const TEXT_EXT = /\.(m?js|cjs|ts|tsx|jsx|py|sh|bash|zsh|rb|php|ps1|psm1|md|mdx|txt|json|ya?ml|toml|cfg|ini)$/i;
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'vendor', '__pycache__', '.venv', 'venv', 'coverage', 'effects-vendor']);
const MAX_FILE = 512 * 1024;

// ---------------------------------------------------------------- datos empaquetados
function loadJson(name, fallback) {
    try { return JSON.parse(fs.readFileSync(path.join(HERE, 'data', name), 'utf8')); } catch { return fallback; }
}
const POPULAR = loadJson('popular-packages.json', { npm: [], pypi: [], packagist: [] });
const DENY = loadJson('malware-denylist.json', { npm: [], pypi: [], packagist: [] });

// ---------------------------------------------------------------- utilidades
export function levenshtein(a, b) {
    a = String(a); b = String(b);
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        }
        prev = cur;
    }
    return prev[n];
}

// Confusiones clasicas de typosquat (homoglifos y errores de teclado comunes)
function confusables(name) {
    const out = new Set();
    const subs = [[/0/g, 'o'], [/1/g, 'l'], [/l/g, '1'], [/o/g, '0'], [/i/g, 'l'], [/rn/g, 'm'], [/-/g, ''], [/_/g, '-'], [/\./g, '-']];
    for (const [re, to] of subs) out.add(name.replace(re, to));
    return [...out];
}

function adjacentTranspose(a, b) {   // misma longitud, dos posiciones contiguas intercambiadas
    if (a.length !== b.length) return false;
    const d = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
    return d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]];
}

// Nombre popular que imita (o null). Conservador: ignora exacto, scoped y nombres <4. MED, no bloquea.
export function typosquatOf(name, list) {
    const n = String(name || '').toLowerCase().trim();
    if (!n || n.length < 4 || n.startsWith('@')) return null;
    const set = new Set(list.map(x => String(x).toLowerCase()));
    if (set.has(n)) return null;                                  // es el paquete popular, no un squat
    for (const p of set) {
        if (p.length < 4) continue;
        // sufijos/prefijos pegados a un nombre famoso: react-js, nodereact, reactjs, lodash-official
        if (n === p + 'js' || n === p + '-js' || n === p + '.js' || n === 'node-' + p || n === p + '-official' || n === p + 'official') return p;
        if (levenshtein(n, p) === 1) return p;                    // una sola edicion de distancia
        if (adjacentTranspose(n, p)) return p;                    // dos letras contiguas intercambiadas (lodahs<-lodash)
        if (confusables(n).includes(p) || confusables(p).includes(n)) return p;
    }
    return null;
}

const DENY_INSTALL = [
    { re: /\b(curl|wget)\b[^\n|&;]*\b(https?:\/\/|ftp:\/\/)/i, why: 'descarga por red (curl/wget)' },
    { re: /\|\s*(ba)?sh\b/i, why: 'tuberia a sh/bash (|sh)' },
    { re: /\b(ba)?sh\s+-c\b/i, why: 'sh -c' },
    { re: /\bnode\s+-e\b/i, why: 'node -e (codigo inline)' },
    { re: /\beval\b/i, why: 'eval' },
    { re: /\bbase64\s+-?-?d(ecode)?\b/i, why: 'base64 -d' },
    { re: /\bchild_process\b|\brequire\(['"]child_process['"]\)/i, why: 'child_process' },
    { re: /\b(Invoke-WebRequest|iwr|certutil\s+-urlcache|powershell\s+-e(nc)?)\b/i, why: 'descarga/ejecucion en Windows' },
    { re: /~\/\.(ssh|aws|npmrc|gnupg)\b|\bid_rsa\b/i, why: 'toca credenciales (~/.ssh, ~/.aws, .npmrc)' },
    { re: />>?\s*~\/\.(bash|zsh|profile)/i, why: 'modifica el shell de arranque' },
];
// Un valor de script de instalacion (preinstall/install/postinstall) con red o shell = high.
export function maliciousScript(value) {
    const v = String(value || '');
    for (const d of DENY_INSTALL) if (d.re.test(v)) return d.why;
    return null;
}

// Devuelve { note, exact } o null. exact=true cuando la version coincide o la entrada vale para '*' (bloquea);
// exact=false cuando la entrada tiene versiones concretas y el comando/manifest no fija version (solo avisa: hay
// versiones limpias). Una version distinta de las malas = null (esa version esta bien).
function denyHit(name, version, eco) {
    const n = String(name || '').toLowerCase();
    for (const e of (DENY[eco] || [])) {
        if (String(e.name).toLowerCase() !== n) continue;
        const vs = (e.versions || ['*']).map(String);
        const note = e.note || 'en la lista de malware conocido';
        if (vs.includes('*')) return { note, exact: true };
        if (version) return vs.includes(String(version)) ? { note, exact: true } : null;
        return { note, exact: false };
    }
    return null;
}

const F = (axis, sev, where, why) => ({ axis, sev, where, why });

// ---------------------------------------------------------------- 1. dependencias
function parseNameSpec(raw) {
    // "lodash@4.1.0" | "left-pad" | "requests==2.0" | "requests>=2" | "vendor/pkg:^1.0"
    let s = String(raw).trim().replace(/^['"]|['"]$/g, '');
    s = s.replace(/[;,].*$/, '');
    const scoped = s.startsWith('@');
    const at = scoped ? s.indexOf('@', 1) : s.indexOf('@');
    let name = at > 0 ? s.slice(0, at) : s;
    let version = at > 0 ? s.slice(at + 1) : '';
    const mver = name.match(/^([^=<>~^! ]+)\s*(?:[=<>~^!]+\s*(.+))?$/);
    if (mver) { name = mver[1]; if (!version && mver[2]) version = mver[2]; }
    return { name: name.trim(), version: version.trim() };
}

function checkNames(entries, eco, axisWhere, out) {
    const popList = POPULAR[eco] || [];
    for (const { name, version } of entries) {
        if (!name) continue;
        const d = denyHit(name, version, eco);
        if (d) { out.push(F('deps', d.exact ? 'high' : 'med', `${axisWhere}: ${name}${version ? '@' + version : ''}`, d.exact ? `paquete en denylist (${d.note})` : `este paquete tuvo una version con malware (${d.note}): fija una version segura`)); continue; }
        const sq = typosquatOf(name, popList);
        if (sq) out.push(F('deps', 'med', `${axisWhere}: ${name}`, `posible typosquatting de "${sq}" (verifica que es el paquete real, no uno casi identico)`));
    }
}

export function scanPackageJson(text, where, out) {
    let j; try { j = JSON.parse(text); } catch { return; }
    const names = [];
    for (const k of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
        if (j[k] && typeof j[k] === 'object') for (const [n, v] of Object.entries(j[k])) names.push({ name: n, version: String(v || '').replace(/^[\^~>=< ]+/, '') });
    }
    checkNames(names, 'npm', where, out);
    if (j.scripts && typeof j.scripts === 'object') {
        for (const stage of ['preinstall', 'install', 'postinstall', 'prepare', 'preprepare']) {
            const why = maliciousScript(j.scripts[stage]);
            if (why) out.push(F('deps', 'high', `${where} scripts.${stage}`, `script de instalacion que ${why}: se ejecuta solo al instalar (vector #1 de malware npm)`));
        }
    }
}

function scanRequirements(text, where, out) {
    const entries = text.split(/\r?\n/).map(l => l.replace(/#.*$/, '').trim()).filter(l => l && !l.startsWith('-')).map(parseNameSpec);
    checkNames(entries, 'pypi', where, out);
}
function scanPyproject(text, where, out) {
    // [tool.poetry.dependencies] o [project] dependencies = ["x>=1"]
    const entries = [];
    for (const m of text.matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=\s*["']?[\d^~>=<*]/gm)) entries.push({ name: m[1], version: '' });
    for (const m of text.matchAll(/["']([A-Za-z0-9_.-]+)\s*(?:[=<>~!]+[^"']*)?["']/g)) entries.push(parseNameSpec(m[1]));
    checkNames(entries.filter(e => e.name && !/^(python|tool|project|build|name|version|description)$/i.test(e.name)), 'pypi', where, out);
}
function scanComposer(text, where, out) {
    let j; try { j = JSON.parse(text); } catch { return; }
    const names = [];
    for (const k of ['require', 'require-dev']) if (j[k] && typeof j[k] === 'object') for (const [n, v] of Object.entries(j[k])) { if (!/^(php|ext-|lib-)/.test(n) && n.includes('/')) names.push({ name: n, version: String(v || '') }); }
    checkNames(names, 'packagist', where, out);
}

const MANIFEST = {
    'package.json': scanPackageJson,
    'requirements.txt': scanRequirements,
    'pyproject.toml': scanPyproject,
    'composer.json': scanComposer,
};

export function scanDependencies(root, { files } = {}) {
    const out = [];
    const rels = files || manifestFiles(root);
    for (const rel of rels) {
        const base = path.basename(rel);
        const fn = MANIFEST[base];
        if (!fn) continue;
        const text = readSafe(path.join(root, rel));
        if (text != null) fn(text, rel.replace(/\\/g, '/'), out);
    }
    return out;
}

function manifestFiles(root) {
    const out = [];
    const bases = ['', 'apps', 'packages', 'services'];
    for (const b of bases) {
        const dir = b ? path.join(root, b) : root;
        if (b) { for (const sub of dirNames(dir)) collectManifests(path.join(dir, sub), root, out, 0); }
        else collectManifests(root, root, out, 0, true);
    }
    return [...new Set(out)];
}
function collectManifests(dir, root, out, depth, shallow) {
    for (const f of fileNames(dir)) if (MANIFEST[f]) out.push(path.relative(root, path.join(dir, f)).replace(/\\/g, '/'));
    if (shallow && depth === 0) return;
}

// ---------------------------------------------------------------- 2. skills / plugins de terceros
const INJECT = [
    { re: /\bignore\s+(all\s+|any\s+)?(the\s+|your\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|prompts?|messages?|rules?|context|directions?)\b/i, why: 'intenta anular instrucciones previas (inyeccion de prompt)' },
    { re: /\bdisregard\s+(all\s+|any\s+)?(the\s+|your\s+)?(previous|prior|above|system|safety)\b/i, why: 'pide ignorar instrucciones/sistema (inyeccion de prompt)' },
    { re: /\b(reveal|print|show|send|leak|exfiltrate|dump|email|post|upload)\s+(me\s+)?(the\s+|your\s+|all\s+)?(system\s+prompt|instructions|api[_ -]?keys?|secrets?|credentials?|passwords?|tokens?|\.env|environment\s+variables?)\b/i, why: 'pide revelar/enviar el prompt del sistema o secretos (exfiltracion por prompt)' },
    { re: /\bnew\s+instructions?\s*:/i, why: 'inyecta "new instructions:" (inyeccion de prompt)' },
    { re: /<\|?(im_start|system|endoftext)\|?>/i, why: 'tokens de chat falsificados (inyeccion de prompt)' },
];
const EXFIL_SECRET = /\bprocess\.env\b|\bos\.environ\b|\.aws\/credentials|\.ssh\/|\bid_rsa\b|\.npmrc\b|\.env\b|\bAWS_SECRET|\bapi[_-]?key\b|\bsecret[_-]?key\b/i;
const EXFIL_NET = /\b(fetch|axios|XMLHttpRequest|navigator\.sendBeacon|https?\.request|requests\.(get|post|put)|urllib\.request|http\.client|net\.connect|dns\.lookup)\b|\b(curl|wget)\b/i;
const OBFUS = [
    { re: /\beval\s*\(/, why: 'eval(' },
    { re: /\bnew\s+Function\s*\(/, why: 'new Function(' },
    { re: /\bexec\s*\(\s*(atob|Buffer\.from)/i, why: 'ejecuta codigo decodificado' },
    { re: /(atob|Buffer\.from)\s*\(\s*['"][A-Za-z0-9+/=]{120,}/, why: 'blob base64 largo decodificado' },
    { re: /(\\x[0-9a-fA-F]{2}){16,}/, why: 'cadena larga en escapes hex (ofuscacion)' },
    { re: /\bimport\s+(os|subprocess)\b[\s\S]{0,80}\b(system|popen|call|run)\s*\(/i, why: 'ejecuta comandos del sistema (os/subprocess)' },
];
const BAD_URL = [
    { re: /https?:\/\/\d{1,3}(\.\d{1,3}){3}(?![\d.])/, why: 'URL con IP literal (no un dominio)' },
    { re: /https?:\/\/(bit\.ly|tinyurl\.com|is\.gd|goo\.gl|t\.co|cutt\.ly|rb\.gy|shorturl\.|rebrand\.ly)/i, why: 'URL acortada (oculta el destino real)' },
    { re: /https?:\/\/[^\s"')]+\.(ru|cn|tk|top|xyz|gq|ml|cf)\b(?![a-z])/i, why: 'host en TLD de alto abuso' },
];

export function scanSkillText(text, rel, { isCode } = {}) {
    const out = [];
    const t = String(text);
    for (const p of INJECT) if (p.re.test(t)) out.push(F('skills', 'high', rel, p.why));
    // caracteres ocultos (ancho cero, anulacion bidi, isolates) fuera del BOM inicial. Los marcos LTR/RTL
    // (‎/‏) quedan fuera: son legitimos en i18n y dan falsos positivos.
    const hidden = t.slice(1).match(/[​-‍⁠‪-‮⁦-⁩﻿]/);
    if (hidden) out.push(F('skills', 'high', rel, 'contiene caracteres unicode ocultos (ancho cero / anulacion bidi): texto invisible para el usuario'));
    if (isCode) {
        if (EXFIL_SECRET.test(t) && EXFIL_NET.test(t)) out.push(F('skills', 'high', rel, 'lee secretos/entorno Y abre red en el mismo archivo (posible exfiltracion)'));
        for (const o of OBFUS) if (o.re.test(t)) out.push(F('skills', 'high', rel, `codigo ofuscado o de ejecucion dinamica: ${o.why}`));
        for (const u of BAD_URL) if (u.re.test(t)) out.push(F('skills', 'med', rel, u.why));
    }
    return out;
}

export function scanSkills(root, { files, dirs } = {}) {
    const out = [];
    let targets = [];
    if (files) targets = files.map(f => ({ rel: f.replace(/\\/g, '/'), abs: path.join(root, f) }));
    else {
        // Por defecto, solo lo NO confiable (de terceros): las skills vendored. Las first-party (core/skills,
        // core/skills-overlay) son nuestras y de fiar: escanearlas da falsos positivos (una guia de OWASP cita el
        // ataque; image-gen lee una API key a proposito). En un proyecto se pasan 'files' (lo que entra en el commit).
        const roots = dirs || ['core/skills-vendor'];
        for (const d of roots) walk(path.join(root, d), root, targets);
    }
    for (const { rel, abs } of targets) {
        if (!TEXT_EXT.test(rel) || /\.min\.(js|css)$/i.test(rel)) continue;
        const text = readSafe(abs);
        if (text == null) continue;
        out.push(...scanSkillText(text, rel, { isCode: CODE_EXT.test(rel) }));
    }
    return out;
}

// ---------------------------------------------------------------- 3. origen de lo que se instala
export function scanInstallSource(root, { files } = {}) {
    const out = [];
    const rel = '.mcp.json';
    if (files && !files.map(f => f.replace(/\\/g, '/')).includes(rel)) return out;
    const text = readSafe(path.join(root, rel));
    if (text == null) return out;
    let j; try { j = JSON.parse(text); } catch { return out; }
    const servers = j.mcpServers || j.servers || {};
    for (const [name, s] of Object.entries(servers)) {
        const cmd = [s && s.command, ...(s && Array.isArray(s.args) ? s.args : [])].filter(Boolean).join(' ');
        const why = maliciousScript(cmd);
        if (why) out.push(F('source', 'high', `.mcp.json server "${name}"`, `el servidor MCP ${why} al arrancar`));
        else if (/\bnpx\s+(-y\s+)?https?:\/\//i.test(cmd) || /\buvx?\s+https?:\/\//i.test(cmd)) out.push(F('source', 'med', `.mcp.json server "${name}"`, 'ejecuta un paquete directamente desde una URL (verifica el origen)'));
    }
    return out;
}

// ---------------------------------------------------------------- 3b. secretos que entran en el commit
// secrets-guard frena un secreto al ESCRIBIRLO, pero no uno que entra por otra via (lo crea un comando, ya estaba
// en disco, se hace git add de un .env). Al hacer git commit se escanea lo que entra (staged) con los mismos
// patrones de secret-patterns.mjs. Los archivos de ejemplo/plantilla no cuentan (ahi va un placeholder a proposito).
export function scanStagedSecrets(root, { files } = {}) {
    const out = [];
    for (const f of (files || [])) {
        const rel = String(f).replace(/\\/g, '/');
        if (/\.(example|sample|template|dist)$|(^|\/)\.env\.example$/i.test(rel)) continue;
        const text = readSafe(path.join(root, rel));
        if (text == null) continue;
        for (const tipo of scanSecrets(text)) out.push(F('secreto', 'high', rel, `credencial real en el commit (${tipo})`));
    }
    return out;
}

// ---------------------------------------------------------------- 4. comando de instalacion (para el muro)
const INSTALL_CMD = [
    { re: /\b(?:npm|pnpm|bun)\s+(?:i|install|add)\b/i, eco: 'npm' },
    { re: /\byarn\s+add\b/i, eco: 'npm' },
    { re: /\b(?:pip|pip3|pipx)\s+install\b/i, eco: 'pypi' },
    { re: /\bpoetry\s+add\b/i, eco: 'pypi' },
    { re: /\buv\s+(?:pip\s+install|add)\b/i, eco: 'pypi' },
    { re: /\bcomposer\s+require\b/i, eco: 'packagist' },
];
export function scanInstallCommand(cmd) {
    const out = [];
    const c = String(cmd || '');
    const m = INSTALL_CMD.find(x => x.re.test(c));
    if (!m) return out;
    // quita el verbo y toma los argumentos que no sean flags
    const after = c.replace(/^[\s\S]*?\b(install|add|require|i)\b/i, ' ');
    const toks = after.split(/\s+/).filter(t => t && !t.startsWith('-') && !/[|&;><]/.test(t) && !/^(--|npm|pnpm|yarn|bun|pip3?|pipx|poetry|composer|uv|run|exec)$/i.test(t));
    const popList = POPULAR[m.eco] || [];
    for (const tok of toks) {
        const { name, version } = parseNameSpec(tok);
        if (!name || /^[./~]/.test(name) || name.includes('://')) continue;        // rutas/urls locales: no son del registro
        const d = denyHit(name, version, m.eco);
        if (d) { out.push(F('install', d.exact ? 'high' : 'med', `${name}${version ? '@' + version : ''}`, d.exact ? `paquete en denylist de malware (${d.note})` : `este paquete tuvo una version con malware (${d.note}): instala una version segura y fijada`)); continue; }
        const sq = typosquatOf(name, popList);
        if (sq) out.push(F('install', 'med', name, `posible typosquatting de "${sq}": confirma que es el paquete real antes de instalarlo`));
    }
    return out;
}

// ---------------------------------------------------------------- agregado + CLI
export function scanProject(root, opts = {}) {
    const findings = [
        ...scanDependencies(root, opts),
        ...scanSkills(root, opts),
        ...scanInstallSource(root, opts),
    ];
    return summarize(findings);
}
export function summarize(findings) {
    const high = findings.filter(f => f.sev === 'high');
    const med = findings.filter(f => f.sev === 'med');
    return { findings, high, med, blocked: high.length > 0 };
}

// ---------------------------------------------------------------- helpers de fichero
function readSafe(abs) {
    try { const st = fs.statSync(abs); if (!st.isFile() || st.size > MAX_FILE) return null; return fs.readFileSync(abs, 'utf8'); } catch { return null; }
}
function dirNames(d) { try { return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch { return []; } }
function fileNames(d) { try { return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name); } catch { return []; } }
function walk(dir, root, acc, depth = 0) {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
        if (e.name.startsWith('.') && e.name !== '.claude' && e.name !== '.agents' && e.name !== '.mcp.json') continue;
        if (SKIP_DIR.has(e.name)) continue;
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) { if (depth < 8) walk(abs, root, acc, depth + 1); }
        else acc.push({ rel: path.relative(root, abs).replace(/\\/g, '/'), abs });
    }
}

// CLI: node supply-scan.mjs --root <dir> [--json]. Exit 2 si hay hallazgos high (salvo SENZU_ALLOW_SUPPLY=1).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const args = process.argv.slice(2);
    const root = args.includes('--root') ? args[args.indexOf('--root') + 1] : process.cwd();
    const r = scanProject(path.resolve(root));
    if (args.includes('--json')) { process.stdout.write(JSON.stringify(r.findings, null, 2) + '\n'); }
    else {
        for (const f of r.findings) process.stdout.write(`[${f.sev}] ${f.axis}: ${f.where} -> ${f.why}\n`);
        process.stdout.write(`${r.high.length} high, ${r.med.length} med\n`);
    }
    const allow = process.env.SENZU_ALLOW_SUPPLY === '1' || process.env.DEV_STANDARDS_ALLOW_SUPPLY === '1';
    process.exit(r.blocked && !allow ? 2 : 0);
}
