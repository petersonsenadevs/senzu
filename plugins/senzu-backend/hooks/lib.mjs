// Funciones compartidas por los hooks de Senzu (Node >= 18, ESM).
// Port agnóstico de _common.ps1: mismo comportamiento en Windows, macOS y Linux.
// Los hooks leen stdin como UTF-8 directo (sin reparación de codepage OEM: eso era un problema de PowerShell).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// ---------------------------------------------------------------- compatibilidad con Codex
// Codex usa el mismo formato de hooks que Claude Code, pero sus ediciones llegan como tool_name "apply_patch"
// con el parche entero en tool_input.command (formato "*** Begin Patch" o diff unificado), no con
// file_path/content/old_string. Se traduce a la forma de Claude (Write / Edit / MultiEdit por archivo) para
// que todos los hooks funcionen igual en los dos agentes. Un parche con varios archivos ejecuta el hook una
// vez por archivo (ver readHookInput).
export function parsearParche(texto) {
    const t = String(texto || '').replace(/\r\n?/g, '\n');
    const archivos = [];
    let actual = null, hunk = null;
    const cerrarHunk = () => { if (actual && hunk && (hunk.viejo.length || hunk.nuevo.length)) actual.hunks.push(hunk); hunk = null; };
    const nuevo = (ruta, tipo) => { cerrarHunk(); actual = { ruta: ruta.trim(), tipo, hunks: [], contenido: [] }; archivos.push(actual); };
    const lineas = t.split('\n');
    for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i];
        let m;
        if ((m = /^\*\*\* (Add|Update|Delete) File:\s*(.+)$/.exec(l))) { nuevo(m[2], m[1].toLowerCase()); continue; }
        if ((m = /^\*\*\* Move to:\s*(.+)$/.exec(l)) && actual) { actual.destino = m[1].trim(); continue; }
        if (/^\*\*\* (Begin|End) Patch/.test(l) || /^\*\*\* End of File/.test(l)) continue;
        // Diff unificado: la cabecera son DOS líneas seguidas "--- a/x" + "+++ b/x". Una línea borrada que empiece
        // por "--" (comentario SQL o Lua) no va seguida de "+++", así que no se confunde con una cabecera.
        const sig = lineas[i + 1] || '';
        if (l.startsWith('--- ') && sig.startsWith('+++ ')) {
            const viejo = l.slice(4).trim().replace(/^a\//, '').replace(/\t.*$/, '');
            const nuevoR = sig.slice(4).trim().replace(/^b\//, '').replace(/\t.*$/, '');
            if (nuevoR === '/dev/null') nuevo(viejo, 'delete');
            else nuevo(nuevoR, viejo === '/dev/null' ? 'add' : 'update');
            i++;
            continue;
        }
        if (!actual) continue;
        if (actual.tipo === 'add') { if (l.startsWith('+')) actual.contenido.push(l.slice(1)); continue; }
        if (l.startsWith('@@')) { cerrarHunk(); hunk = { viejo: [], nuevo: [] }; continue; }
        if (!hunk) hunk = { viejo: [], nuevo: [] };
        if (l.startsWith('-')) hunk.viejo.push(l.slice(1));
        else if (l.startsWith('+')) hunk.nuevo.push(l.slice(1));
        else if (l.startsWith(' ')) { hunk.viejo.push(l.slice(1)); hunk.nuevo.push(l.slice(1)); }
    }
    cerrarHunk();
    return archivos.filter(a => a.ruta);
}

export function entradasDesdeParche(p) {   // una entrada estilo Claude por archivo del parche
    const base = p.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    return parsearParche(p.tool_input && (p.tool_input.command || p.tool_input.patch || p.tool_input.input)).map(a => {
        const ruta = path.resolve(base, a.destino || a.ruta);
        let tool_name, tool_input;
        if (a.tipo === 'add') { tool_name = 'Write'; tool_input = { file_path: ruta, content: a.contenido.join('\n') + (a.contenido.length ? '\n' : '') }; }
        else if (a.tipo === 'delete') { tool_name = 'Edit'; tool_input = { file_path: path.resolve(base, a.ruta), old_string: '', new_string: '' }; }
        else if (a.hunks.length === 1) { tool_name = 'Edit'; tool_input = { file_path: ruta, old_string: a.hunks[0].viejo.join('\n'), new_string: a.hunks[0].nuevo.join('\n') }; }
        else { tool_name = 'MultiEdit'; tool_input = { file_path: ruta, edits: a.hunks.map(h => ({ old_string: h.viejo.join('\n'), new_string: h.nuevo.join('\n') })) }; }
        return { ...p, tool_name, tool_input, codex_tool_name: p.tool_name };
    });
}

function ejecutarPorArchivo(entradas) {
    // Re-ejecuta este mismo hook con cada archivo del parche y combina: el primer bloqueo gana (exit 2 + stderr);
    // si nadie bloquea, se unen los additionalContext.
    const contextos = []; let evento = null, otro = '';
    for (const e of entradas) {
        const r = spawnSync(process.execPath, [process.argv[1]], { input: JSON.stringify(e), encoding: 'utf8', env: process.env, timeout: 25000 });
        if (r.status === 2) { process.stderr.write(r.stderr || ''); process.exit(2); }
        const out = (r.stdout || '').trim();
        if (!out) continue;
        try {
            const j = JSON.parse(out);
            if (j.hookSpecificOutput && j.hookSpecificOutput.additionalContext) { evento = j.hookSpecificOutput.hookEventName; contextos.push(j.hookSpecificOutput.additionalContext); }
            else if (!otro) otro = out;
        } catch { if (!otro) otro = out; }
    }
    if (contextos.length) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: evento, additionalContext: contextos.join('\n') } }) + '\n');
    else if (otro) process.stdout.write(otro + '\n');
    process.exit(0);
}

// ---------------------------------------------------------------- carpeta del proyecto: senzu/
// Todo lo de Senzu que no exige una ubicación fija vive en <proyecto>/senzu/: devlog, plan, design-system,
// conventions.md/json, ui-verify y el marcador senzu.json. Proyectos antiguos sin migrar (devlog/ y
// .dev-standards.json en la raíz) siguen funcionando: cada ruta se busca primero donde corresponde al
// proyecto y después en la otra ubicación. /instalar migra con git mv.
export const CARPETA = 'senzu';
export function esLegado(root) {
    return !fs.existsSync(path.join(root, CARPETA)) && (fs.existsSync(path.join(root, '.dev-standards.json')) || fs.existsSync(path.join(root, 'devlog')));
}
const VIEJA = { 'ui-verify': '.ui-verify', 'senzu.json': '.dev-standards.json', auditoria: 'docs/auditoria', entrega: 'docs/entrega', 'mapa.md': 'docs/MAPA.md' };
export function ruta(root, nombre) {   // 'devlog' | 'plan' | 'design-system' | 'conventions.md' | 'conventions.json' | 'ui-verify' | 'senzu.json'
    const nueva = path.join(root, CARPETA, nombre);
    const vieja = path.join(root, VIEJA[nombre] || nombre);
    const [primera, segunda] = esLegado(root) ? [vieja, nueva] : [nueva, vieja];
    if (fs.existsSync(primera)) return primera;
    if (fs.existsSync(segunda)) return segunda;
    return primera;
}
export const rutaRel = (root, nombre) => path.relative(root, ruta(root, nombre)).replace(/\\/g, '/');
export const rutaMarcador = root => ruta(root, 'senzu.json');

// ---------------------------------------------------------------- permisos y hooks apagados por proyecto
// En .dev-standards.json (protegido: el agente no puede editarlo, lo decide el usuario):
//   "permisos": { "push": true, "pushMain": true, "commitEnMain": true }
//   "hooksApagados": ["format-on-save", "front-skill-reminder"]
// Solo cuenta el valor booleano true. guard, secrets-guard, protect-files y conventions-guard NO se pueden apagar: el push forzado,
// lo destructivo, los secretos y los archivos protegidos siguen bloqueados siempre.
export const HOOKS_NO_APAGABLES = ['guard', 'secrets-guard', 'protect-files', 'conventions-guard', 'arquitectura-guard'];   // las convenciones selladas tampoco se apagan
// Ramas PRINCIPALES: ni commit directo ni push del agente (salvo permiso commitEnMain / pushMain del usuario).
// Todas las de entorno, no solo main: un push a staging o production también despliega. El usuario puede añadir
// las suyas en el marcador: "ramasProtegidas": ["demo", "cliente-x"].
export const RAMAS_PRINCIPALES = ['main', 'master', 'trunk', 'develop', 'development', 'dev', 'staging', 'stage', 'stg',
    'preprod', 'pre-production', 'production', 'prod', 'live', 'qa', 'uat', 'release'];
export function ramaProtegida(root, rama) {
    const r = String(rama || '').trim().replace(/^refs\/heads\//, '').toLowerCase();
    if (!r) return false;
    if (RAMAS_PRINCIPALES.includes(r) || /^(release|releases|production|prod|staging|stage)\//.test(r)) return true;
    const m = getMarkerSeguro(root);
    return !!(m && Array.isArray(m.ramasProtegidas) && m.ramasProtegidas.map(x => String(x).toLowerCase()).includes(r));
}
export function permisosProyecto(root) {
    const m = getMarkerSeguro(root);
    const p = (m && m.permisos && typeof m.permisos === 'object') ? m.permisos : {};
    return { push: p.push === true || p.pushMain === true, pushMain: p.pushMain === true, commitEnMain: p.commitEnMain === true };
}
export function hookApagado(root, nombre) {
    if (HOOKS_NO_APAGABLES.includes(nombre)) return false;
    const m = getMarkerSeguro(root);
    return !!(m && Array.isArray(m.hooksApagados) && m.hooksApagados.map(String).includes(nombre));
}
function getMarkerSeguro(root) { try { return readJson(rutaMarcador(root)); } catch { return null; } }

// Variables de entorno: SENZU_X (nombre actual) o SENZU_X (nombre anterior, se sigue aceptando)
export const envSenzu = n => process.env['SENZU_' + n] || process.env['DEV_STANDARDS_' + n] || '';   // compat-dev-standards

export function readHookInput() {
    const p = leerEntradaCruda();
    if (!p) return p;
    // Codex no exporta CLAUDE_PROJECT_DIR: la raíz del proyecto llega como "cwd" en la entrada
    if (!process.env.CLAUDE_PROJECT_DIR && p.cwd) process.env.CLAUDE_PROJECT_DIR = String(p.cwd);
    // Hook apagado por el usuario en este proyecto: sale sin hacer nada (salida vacía vale en Claude y Codex)
    if (hookApagado(projectRoot(), path.basename(process.argv[1] || '', '.mjs'))) process.exit(0);
    const esParche = p.tool_name === 'apply_patch'
        || (!/^(Bash|PowerShell)$/.test(String(p.tool_name || '')) && p.tool_input && typeof p.tool_input.command === 'string' && /^\*\*\* Begin Patch/m.test(p.tool_input.command));
    if (!esParche) return normalizarRutas(p);
    const entradas = entradasDesdeParche(p);
    if (!entradas.length) return null;
    if (entradas.length === 1) return normalizarRutas(entradas[0]);
    ejecutarPorArchivo(entradas);   // no vuelve
}

// El archivo de la herramienta llega como ruta nativa absoluta (relativa → desde la raíz del proyecto)
function normalizarRutas(p) {
    const ti = p && p.tool_input;
    if (ti && typeof ti === 'object') {
        for (const k of ['file_path', 'notebook_path']) if (typeof ti[k] === 'string' && ti[k].trim()) ti[k] = rutaNativa(ti[k], projectRoot());
    }
    return p;
}

function leerEntradaCruda() {
    // Lectura de stdin robusta en Windows: readFileSync(0) falla con pipes de algunas shells
    // (EOF/EAGAIN a mitad); se lee por bloques tolerando esos errores.
    const chunks = [];
    const buf = Buffer.alloc(65536);
    for (;;) {
        let n = 0;
        try { n = fs.readSync(0, buf, 0, buf.length, null); }
        catch (e) { if (e && e.code === 'EAGAIN') continue; break; }
        if (n <= 0) break;
        chunks.push(Buffer.from(buf.subarray(0, n)));
    }
    let raw = Buffer.concat(chunks).toString('utf8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);   // PowerShell 5.1 antepone BOM al pipe
    if (!raw || !raw.trim()) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

// Regex del registro/config (sintaxis .NET): JS no soporta el inline (?i), se quita y se aplica el flag i.
export function psRegex(pattern, flags = 'i') {
    return new RegExp(String(pattern).replace(/\(\?i\)/g, ''), flags);
}

// Una ruta en cualquier formato → ruta nativa absoluta. En Windows llegan mezcladas: C:\a, C:/a, c:\a, con barra
// final, /c/a (Git Bash, MSYS) o /mnt/c/a (WSL). Compararlas como texto hacía que protect-files y
// conventions-guard no reconocieran el archivo y no bloquearan nada (ver 092). Todo hook compara rutas con esto.
export function rutaNativa(p, base) {
    let s = String(p || '').trim();
    if (!s) return s;
    if (process.platform === 'win32') {
        const m = /^\/(?:mnt\/)?([a-zA-Z])(?:\/(.*))?$/.exec(s);
        if (m) s = m[1].toUpperCase() + ':/' + (m[2] || '');
    }
    s = path.resolve(base || process.cwd(), s);
    if (process.platform === 'win32' && /^[a-z]:/.test(s)) s = s[0].toUpperCase() + s.slice(1);
    return s;
}
// Ruta relativa a la raíz del proyecto, con «/». null si el archivo está fuera (otra carpeta u otra unidad).
export function relDelProyecto(root, file) {
    const r = rutaNativa(root), f = rutaNativa(file, r);
    const rel = path.relative(r, f);   // en Windows path.relative ya compara sin distinguir mayúsculas
    if (rel === '') return '';
    if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) return null;
    return rel.replace(/\\/g, '/');
}

// ¿El proyecto tiene convenciones SELLADAS por /adoptar? (conventions.md o .json con la marca senzu:inmutable)
export function convencionesSelladas(root) {   // también la arquitectura declarada (capas.json), cuando está sellada
    return ['conventions.md', 'conventions.json'].some(n => /(senzu|dev-standards):inmutable/.test(readText(ruta(root, n)) || ''))   // compat-dev-standards
        || /senzu:inmutable/.test(readText(rutaArquitectura(root)) || '');
}

export function projectRoot() { return rutaNativa(process.env.CLAUDE_PROJECT_DIR || process.cwd()); }

export function sessionFlag(sid, name) {
    const s = String(sid || '').replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
    return path.join(os.tmpdir(), `dev-standards-${name}-${s}.flag`);   // compat-dev-standards (nombre interno de los marcadores temporales)
}

export function projectFlag(root, name) {
    // Flag keyed por proyecto (no por sesión): builds/tests son estado del proyecto.
    const hash = crypto.createHash('md5').update(String(root).toLowerCase(), 'utf8').digest('hex').slice(0, 12);
    return path.join(os.tmpdir(), `dev-standards-${name}-${hash}.flag`);   // compat-dev-standards
}

export function testOnce(sid, name) {   // true la PRIMERA vez por sesión; crea el marcador
    const f = sessionFlag(sid, name);
    if (fs.existsSync(f)) return false;
    try { fs.writeFileSync(f, ''); } catch {}
    return true;
}

function stripBom(s) { return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s; }
function readJson(file) { try { return JSON.parse(stripBom(fs.readFileSync(file, 'utf8'))); } catch { return null; } }
export function readText(file) { try { return stripBom(fs.readFileSync(file, 'utf8')); } catch { return null; } }

export function hookConfig(root) {
    // Proyecto primero; en modo plugin, config.json neutro del plugin
    const candidates = [path.join(root, '.claude', 'hooks', 'config.json')];
    if (process.env.CLAUDE_PLUGIN_ROOT) candidates.push(path.join(process.env.CLAUDE_PLUGIN_ROOT, 'hooks', 'config.json'));
    for (const c of candidates) {
        if (fs.existsSync(c)) { const j = readJson(c); if (j) return j; }
    }
    return null;
}

export function getMarker(root) {
    // .dev-standards.json del proyecto; si no existe (modo plugin), se reconstruye desde config.json
    const m = rutaMarcador(root);
    if (fs.existsSync(m)) { const j = readJson(m); if (j) return j; }
    const cfg = hookConfig(root);
    if (cfg && cfg.stack) return { stack: cfg.stack, frontProfile: cfg.frontProfile, extraSkills: [], bundles: [], fromConfig: true };
    return null;
}

function dirNames(d) {
    try { return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort(); }
    catch { return []; }
}
function fileNames(d) {
    try { return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name).sort(); }
    catch { return []; }
}

export function availableSkills(root, cfg) {
    // Modo hermético (suite test-router): solo skills del proyecto + config, ignorando ~/.claude global
    let a = [];
    const projSkills = path.join(root, '.claude', 'skills');
    if (envSenzu('TEST_ISOLATED') === '1') {
        a = a.concat(dirNames(projSkills));
        if (cfg && cfg.skills) a = a.concat(cfg.skills);
        return [...new Set(a)];
    }
    for (const d of [projSkills, path.join(os.homedir(), '.claude', 'skills')]) a = a.concat(dirNames(d));
    if (cfg && cfg.skills) a = a.concat(cfg.skills);
    // skills de TODOS los plugins instalados (no solo el que ejecuta el hook)
    const plugRoot = path.join(os.homedir(), '.claude', 'plugins');
    for (const sd of findDirsNamed(plugRoot, 'skills', 6)) {
        for (const n of dirNames(sd)) if (fs.existsSync(path.join(sd, n, 'SKILL.md'))) a.push(n);
    }
    if (process.env.CLAUDE_PLUGIN_ROOT) a = a.concat(dirNames(path.join(process.env.CLAUDE_PLUGIN_ROOT, 'skills')));
    return [...new Set(a)];
}

function findDirsNamed(base, name, maxDepth) {
    const out = [];
    const stack = [[base, 0]];
    while (stack.length) {
        const [d, depth] = stack.pop();
        for (const n of dirNames(d)) {
            const p = path.join(d, n);
            if (n === name) out.push(p);
            else if (depth < maxDepth) stack.push([p, depth + 1]);
        }
    }
    return out;
}

export function git(root, args) {
    try {
        return execFileSync('git', ['-C', root, ...args], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    } catch { return ''; }
}
export function gitBranch(root) { return git(root, ['rev-parse', '--abbrev-ref', 'HEAD']); }
// Archivos con cambios sin commitear (rutas relativas a la raíz, con «/»): modificados, nuevos (uno a uno, también
// dentro de carpetas nuevas), borrados y renombrados (la ruta nueva). Sin ignorados. [] si no hay git.
export function gitCambios(root) {
    // sin git() porque recorta: la primera línea del porcelain puede empezar por espacio (« M archivo»)
    let o = '';
    try { o = execFileSync('git', ['-C', root, '-c', 'core.quotePath=false', 'status', '--porcelain', '-uall'], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }); } catch { return []; }
    return o.split(/\r?\n/).filter(l => l.length > 3).map(l => {
        let r = l.slice(3);
        if (r.includes(' -> ')) r = r.split(' -> ').pop();
        return r.replace(/^"(.*)"$/, '$1').replace(/\\/g, '/');
    });
}
// Archivos que ha tocado ESTA sesión del agente (los apunta edit-tracker): rutas relativas a la raíz, con «/».
export function editadosSesion(sid) {
    try { return [...new Set(fs.readFileSync(sessionFlag(sid, 'editados'), 'utf8').split(/\r?\n/).filter(Boolean))]; } catch { return []; }
}
export function gitDirty(root) {   // número de archivos con cambios (tracked + untracked, sin ignorados)
    const o = git(root, ['status', '--porcelain']);
    return o ? o.split(/\r?\n/).filter(l => l).length : 0;
}

function findFirstFile(dir, fileName) {
    if (!fs.existsSync(dir)) return null;
    for (const f of fileNames(dir)) if (f === fileName) return path.join(dir, f);
    for (const d of dirNames(dir)) {
        const hit = findFirstFile(path.join(dir, d), fileName);
        if (hit) return hit;
    }
    return null;
}
export { findFirstFile };

// ---------------------------------------------------------------- identidad ya elegida (logos finales)
// Convención: <design-system>/<slug>/logos/final/<tipo>/ (tipo: simbolo, logotipo, combinado, mascota…) con
// los maestros elegidos. Sirve igual si los generó Claude, Codex o una persona: lo que manda es el archivo.
const IMAGEN = /\.(svg|png|webp|jpe?g|avif|ico|pdf)$/i;
export function logosFinales(root) {
    const ds = ruta(root, 'design-system');
    const out = [];
    for (const slug of dirNames(ds)) {
        const fin = path.join(ds, slug, 'logos', 'final');
        if (!fs.existsSync(fin)) continue;
        const tipos = dirNames(fin);
        const sueltos = fileNames(fin).filter(f => IMAGEN.test(f));
        const grupos = [...tipos.map(t => [t, fileNames(path.join(fin, t)).filter(f => IMAGEN.test(f))]), ...(sueltos.length ? [['logo', sueltos]] : [])];
        for (const [tipo, archivos] of grupos) {
            if (!archivos.length) continue;
            const dir = tipo === 'logo' ? fin : path.join(fin, tipo);
            // El maestro: el .svg sin sufijo de tamaño/variante si existe; si no, el primero
            const maestro = archivos.find(f => /\.svg$/i.test(f) && !/-(black|white|negativ\w*|mono\w*|\d+)\.svg$/i.test(f)) || archivos.find(f => /\.svg$/i.test(f)) || archivos[0];
            out.push({ slug, tipo, dir: path.relative(root, dir).replace(/\\/g, '/'), maestro: path.relative(root, path.join(dir, maestro)).replace(/\\/g, '/'), n: archivos.length });
        }
    }
    return out;
}
// ¿Está registrado el logo elegido en gustos.md (Fijado) y en la memoria? Si no, se pide registrarlo.
export function logosSinRegistrar(root) {
    const finales = logosFinales(root);
    if (!finales.length) return [];
    const gustos = readText(findFirstFile(ruta(root, 'design-system'), 'gustos.md') || '') || '';
    const memoria = readText(path.join(ruta(root, 'devlog'), 'MEMORIA.md')) || '';
    const fijado = seccionMd(gustos, 'Fijado');
    return finales.filter(l => {
        const enFijado = fijado.includes(`logos/final/${l.tipo}`) || fijado.includes(l.maestro);
        const enMemoria = new RegExp(`logos/final/${l.tipo}|logo|s[ií]mbolo|logotipo`, 'i').test(memoria);
        return !enFijado || !enMemoria;
    });
}
export function textoLogos(root) {
    const finales = logosFinales(root);
    if (!finales.length) return '';
    return 'IDENTIDAD YA ELEGIDA: ' + finales.map(l => `${l.tipo} → ${l.maestro} (${l.n} archivos en ${l.dir}/)`).join(' · ')
        + '. Úsalos tal cual: NO generes bocetos, variantes ni logos nuevos de esos tipos salvo que el usuario lo pida explícitamente (y entonces pregunta si es para sustituir el elegido). Lo decidido está en gustos.md (Fijado) y en la memoria.';
}

export function designSystemMaster(root) {
    const f = findFirstFile(ruta(root, 'design-system'), 'MASTER.md');
    return f ? path.relative(root, f).replace(/\\/g, '/') : null;
}

export function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayDevlog(root) {
    const d = path.join(ruta(root, 'devlog'), todayStr());
    return fileNames(d).filter(n => n.endsWith('.md') && n !== 'DECISIONES.md');
}

export function devlogNextNumber(root) {   // mayor NNN global + 1 (numeración correlativa de toda la vida del proyecto)
    const base = ruta(root, 'devlog');
    if (!fs.existsSync(base)) return 1;
    let max = 0;
    const stack = [base];
    while (stack.length) {
        const d = stack.pop();
        for (const f of fileNames(d)) {
            const m = /^(\d{3})-/.exec(f);
            if (f.endsWith('.md') && m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
        }
        for (const sd of dirNames(d)) stack.push(path.join(d, sd));
    }
    return max + 1;
}

// ---------------------------------------------------------------- memoria del proyecto (devlog/MEMORIA.md)
// Decisiones vigentes, reglas, lo que no funcionó y pendientes. session-start y pre-compact la inyectan;
// stop-guard exige actualizarla cuando el devlog de hoy trae decisiones.
export function memoriaProyecto(root) {
    const f = path.join(ruta(root, 'devlog'), 'MEMORIA.md');
    const txt = readText(f);
    if (txt == null) return { existe: false, items: 0, lineas: [], mtime: 0, ruta: f };
    const lineas = txt.replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => l.trim());
    const items = lineas.filter(l => /^\s*[-*]\s+\S/.test(l) && !/^\s*[-*]\s+(…|\.\.\.|—|-)\s*$/.test(l)).length;
    let mtime = 0; try { mtime = fs.statSync(f).mtimeMs; } catch {}
    return { existe: true, items, lineas, mtime, ruta: f };
}

export function devlogEntradas(root) {   // [{ num, fecha, archivo }] de todo el devlog, ordenadas por número
    const base = ruta(root, 'devlog');
    const out = [];
    for (const d of dirNames(base)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        for (const f of fileNames(path.join(base, d))) {
            const m = /^(\d{3,})-.*\.md$/.exec(f);
            if (m) out.push({ num: m[1], fecha: d, archivo: path.join(base, d, f) });
        }
    }
    return out.sort((a, b) => parseInt(a.num, 10) - parseInt(b.num, 10));
}

export function seccionMd(txt, patron) {   // cuerpo de la primera sección "## <patron>" de un markdown
    const t = String(txt || '').replace(/\r/g, '');
    const m = new RegExp('^##\\s+' + patron + '[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))', 'im').exec(t);
    return m ? m[1].trim() : '';
}

export function tieneContenido(seccion) {   // ¿hay algo más que "…", "—" o "ninguna"?
    return String(seccion || '').split('\n').some(l => {
        const s = l.replace(/^\s*[-*]\s*/, '').trim();
        return s && !/^(…|\.\.\.|—|-|ninguna\.?|n\/a)$/i.test(s);
    });
}

export function rutaBuscador(root) {   // ruta del buscador del devlog, la instalada en el proyecto o la del plugin
    const rel = ['.claude/skills', '.agents/skills'].map(d => `${d}/devlog/scripts/buscar.mjs`).find(r => fs.existsSync(path.join(root, r)));
    if (rel) return rel;
    if (process.env.CLAUDE_PLUGIN_ROOT) {
        const p = path.join(process.env.CLAUDE_PLUGIN_ROOT, 'skills', 'devlog', 'scripts', 'buscar.mjs');
        if (fs.existsSync(p)) return p.replace(/\\/g, '/');
    }
    return '<skills-dir>/devlog/scripts/buscar.mjs';
}

// Líneas de contexto con la memoria del proyecto (session-start y pre-compact)
export function bloqueMemoria(root, maxLineas = 70) {
    const DL = rutaRel(root, 'devlog'), PL = rutaRel(root, 'plan'), DS = rutaRel(root, 'design-system'), CV = rutaRel(root, 'conventions.md');   // rutas reales (senzu/ o antiguas)
    const L = [];
    const mem = memoriaProyecto(root);
    const entradas = devlogEntradas(root);
    const buscador = rutaBuscador(root);
    if (mem.items) {
        L.push(`- MEMORIA del proyecto (${DL}/MEMORIA.md): decisiones VIGENTES, reglas y lo que no funcionó. No contradigas una decisión sin citarla (D-xxx) y preguntar; si cambia, márcala como sustituida y anota la nueva:`);
        const cuerpo = mem.lineas.filter(l => !/^#\s/.test(l));
        let chars = 0;
        for (const l of cuerpo.slice(0, maxLineas)) { if ((chars += l.length) > 6000) break; L.push('    ' + l.trim()); }
        if (cuerpo.length > maxLineas) L.push(`    (… ${cuerpo.length - maxLineas} líneas más en ${DL}/MEMORIA.md)`);
    } else if (entradas.length >= 3) {
        L.push(`- No hay ${DL}/MEMORIA.md (o está vacía) y el proyecto ya tiene ${entradas.length} entradas de devlog: créala AHORA con la skill devlog (references/memoria.md, "Crear la memoria desde un devlog existente") antes de seguir con la tarea.`);
    } else {
        L.push(`- Las decisiones vigentes del proyecto van a ${DL}/MEMORIA.md (skill devlog): créala con la primera decisión.`);
    }
    if (entradas.length) {
        L.push(`- Para lo que NO esté en la memoria, busca en el devlog antes de decidir o preguntar: node ${buscador} "palabras clave" (raíces, erratas y sinónimos; --desde, --tipo). Cita la entrada (NNN) al responder; si no aparece nada, dilo: no lo supongas.`);
    }
    return L;
}

// ---------------------------------------------------------------- memoria del USUARIO (todos sus proyectos)
// Sus reglas de siempre (idioma, git, estilo), para no repetirlas proyecto a proyecto. Fuera de ~/.senzu: esa
// carpeta es un clon de git que se actualiza con pull.
export function rutaMemoriaUsuario() {
    return envSenzu('MEMORIA_USUARIO') || path.join(os.homedir(), '.config', 'senzu', 'memoria.md');
}
export function bloqueMemoriaUsuario(maxLineas = 30) {
    const f = rutaMemoriaUsuario();
    const txt = readText(f);
    if (!txt) return [];
    const lineas = txt.replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n').filter(l => l.trim() && !/^#\s/.test(l));
    if (!lineas.length) return [];
    const L = [`- MEMORIA DEL USUARIO (${f.replace(/\\/g, '/')}): sus reglas en TODOS sus proyectos. Ganan a tus costumbres; si chocan con la memoria del proyecto, manda la del proyecto:`];
    for (const l of lineas.slice(0, maxLineas)) L.push('    ' + l.trim());
    if (lineas.length > maxLineas) L.push(`    (… ${lineas.length - maxLineas} líneas más)`);
    return L;
}

// ---------------------------------------------------------------- revisar la memoria del proyecto
// Avisos (no bloquea): demasiado larga, «ver NNN» que no existe, D-xxx repetido, pendientes caducados.
// Los pendientes con fecha se escriben «- [desde AAAA-MM-DD] texto».
export function revisarMemoria(root, { diasPendiente = 7, hoy = new Date() } = {}) {
    const mem = memoriaProyecto(root);
    if (!mem.existe) return [];
    const avisos = [];
    const cuerpo = mem.lineas.filter(l => !/^#/.test(l.trim()));
    if (cuerpo.length > 60) avisos.push(`MEMORIA.md tiene ${cuerpo.length} líneas (máximo 60): mueve lo sustituido y lo cerrado a MEMORIA-historico.md.`);
    const nums = new Set(devlogEntradas(root).map(e => e.num));
    const rotas = [...new Set(mem.lineas.flatMap(l => [...l.matchAll(/\bver\s+(\d{3,})\b/gi)].map(m => m[1])))].filter(n => nums.size && !nums.has(n));
    if (rotas.length) avisos.push(`MEMORIA.md cita entradas que no existen en el devlog: ${rotas.map(n => 'ver ' + n).join(', ')}.`);
    const ids = mem.lineas.map(l => (/^\s*[-*]\s+(D-\d+)\s*·/.exec(l) || [])[1]).filter(Boolean);
    const repes = [...new Set(ids.filter((d, i) => ids.indexOf(d) !== i))];
    if (repes.length) avisos.push(`MEMORIA.md repite números de decisión: ${repes.join(', ')} (cada D-xxx es único).`);
    const pend = seccionMd(mem.lineas.join('\n'), 'Pendientes');
    const viejos = [];
    for (const l of pend.split('\n')) {
        const m = /\[desde (\d{4}-\d{2}-\d{2})\]/.exec(l);
        if (!m) continue;
        const dias = Math.floor((hoy - new Date(m[1] + 'T00:00:00')) / 864e5);
        if (dias >= diasPendiente) viejos.push(`${l.replace(/^\s*[-*]\s*/, '').replace(/\[desde [^\]]+\]\s*/, '').slice(0, 90)} (${dias} días)`);
    }
    if (viejos.length) avisos.push(`Pendientes abiertos hace tiempo, pregunta al usuario si siguen vigentes (y ciérralos o pásalos al histórico): ${viejos.join(' · ')}.`);
    return avisos;
}

// ---------------------------------------------------------------- memoria por archivo
// Qué dicen la memoria y el devlog de un archivo concreto (por su ruta o su nombre): lo más reciente primero.
export function decisionesDeArchivo(root, rel, max = 3) {
    const base = path.basename(rel);
    if (base.length < 5) return [];                                    // «a.js», «x.md»: demasiado genérico
    const sinExt = base.replace(/\.[^.]+$/, '');
    const genericos = /^(index|main|app|utils?|helpers?|types?|config|readme|package|styles?|global|layout)$/i;
    const busca = genericos.test(sinExt) ? [rel.replace(/\\/g, '/')] : [rel.replace(/\\/g, '/'), base];
    const hit = t => busca.some(b => t.includes(b));
    const out = [];
    const mem = memoriaProyecto(root);
    for (const l of mem.lineas) if (/^\s*[-*]\s+\S/.test(l) && hit(l)) out.push(`MEMORIA: ${l.replace(/^\s*[-*]\s*/, '').trim().slice(0, 200)}`);
    for (const e of devlogEntradas(root).reverse()) {
        if (out.length >= max) break;
        const t = readText(e.archivo) || '';
        if (!hit(t)) continue;
        const titulo = ((/^#\s+(.+)/m.exec(t) || [])[1] || e.num).trim();
        const linea = t.split(/\r?\n/).find(x => hit(x) && !/^#/.test(x)) || '';
        out.push(`${titulo.slice(0, 110)}${linea ? ` — ${linea.replace(/^\s*[-*]\s*/, '').trim().slice(0, 160)}` : ''}`);
    }
    return out.slice(0, max);
}

// ---------------------------------------------------------------- estado de la sesión (para /retomar)
// En senzu/.estado/ (ignorado por git con su propio .gitignore): no ensucia el repo ni cuenta como cambio.
export function rutaEstado(root) {
    const dir = ruta(root, '.estado');
    try {
        fs.mkdirSync(dir, { recursive: true });
        const gi = path.join(dir, '.gitignore');
        if (!fs.existsSync(gi)) fs.writeFileSync(gi, '*\n');
    } catch {}
    return path.join(dir, 'ultima-sesion.json');
}
export function leerUltimaSesion(root) {
    try { return JSON.parse(fs.readFileSync(path.join(ruta(root, '.estado'), 'ultima-sesion.json'), 'utf8')); } catch { return null; }
}

export function proximosPasos(root) {   // "NNN título: próximos pasos" de la última entrada del devlog
    const e = devlogEntradas(root).pop();
    if (!e) return '';
    const t = readText(e.archivo) || '';
    const titulo = ((/^#\s+(.+)/m.exec(t) || [])[1] || e.num).trim();
    const pasos = seccionMd(t, 'Pr[oó]ximos pasos');
    if (!tieneContenido(pasos)) return '';
    const plano = pasos.split('\n').map(l => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean).join(' · ');
    return `${titulo} → ${plano.length > 400 ? plano.slice(0, 397) + '…' : plano}`;
}

export function devlogIndexed(root, name) {   // ¿aparece el NNN de la entrada en devlog/INDEX.md?
    const idx = path.join(ruta(root, 'devlog'), 'INDEX.md');
    const m = /^(\d{3})-/.exec(name);
    if (!fs.existsSync(idx) || !m) return true;
    const txt = readText(idx) || '';
    return new RegExp('\\|\\s*' + m[1] + '\\s*\\|').test(txt);
}

export function outHookJson(event, extra) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, ...extra } }) + '\n');
}

export function planStatus(root) {
    // Devuelve { exists, doing: [], next: [], done, total } leyendo plan/PLAN.md (tarjetas "### ID · Titulo [S] [estado]")
    const f = path.join(ruta(root, 'plan'), 'PLAN.md');
    const r = { exists: false, doing: [], next: [], done: 0, total: 0 };
    const txt = readText(f);
    if (txt === null) return r;
    r.exists = true;
    for (const line of txt.split(/\r?\n/)) {
        const m = /^###\s+([A-Z]+\d*-T\d+[a-z]?)\s*[·\-]\s*(.+?)\s*\[(S|M|L)\]\s*\[(todo|doing|blocked|done)\]/.exec(line);
        if (m && !/^(…|\.\.\.|<)/.test(m[2])) {   // las tarjetas de ejemplo de la plantilla («X-T1 …», «<Verbo + objeto>») no cuentan
            r.total++;
            const [, id, title, , st] = m;
            if (st === 'done') r.done++;
            else if (st === 'doing') r.doing.push(`${id} ${title}`);
            else if (st === 'todo' && r.next.length < 2) r.next.push(`${id} ${title}`);
        }
    }
    return r;
}

export function pad3(n) { return String(n).padStart(3, '0'); }

// ¿Archivos de código en la raíz o un nivel por debajo? (sin node_modules, .git, senzu, .claude, .agents…)
const EXT_CODIGO = /\.(php|ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|java|kt|cs|vue|svelte|astro|ps1|sh)$/i;
const NO_MIRAR = new Set(['node_modules', '.git', 'senzu', '.claude', '.agents', 'vendor', 'dist', 'build', '.venv', 'venv', '__pycache__']);
function hayCodigoSuelto(root) {
    const mira = (dir, nivel) => {
        let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
        if (ents.some(e => e.isFile() && EXT_CODIGO.test(e.name))) return true;
        return nivel < 1 && ents.some(e => e.isDirectory() && !NO_MIRAR.has(e.name) && !e.name.startsWith('.') && mira(path.join(dir, e.name), nivel + 1));
    };
    return mira(root, 0);
}
export function esArchivoDeCodigo(rel) { return EXT_CODIGO.test(String(rel || '')); }

// ---------------------------------------------------------------- el SIGUIENTE PASO del método
// Una sola respuesta a «¿en qué punto está este proyecto?» que comparten session-start (lo anuncia), el muro
// arranque-guard (no deja escribir código hasta darlo) y stop-guard (lo propone al cerrar). Orden: instalar →
// adoptar (si hay código sin convenciones) → brief (solo con interfaz) y plan (si es nuevo) → siguiente tarjeta →
// con el plan terminado, verificar → lanzar (si hay interfaz) → desplegar → entregar. El usuario puede omitir
// adoptar, plan o brief por proyecto: "omitirPasos" en el marcador (init.mjs --omitir-paso; el agente no puede).
// Tres niveles: bloquea (instalar, adoptar), conversar (sin plan en proyecto nuevo: saber qué se hace o
// preguntarlo) y anunciar (solo se dice: /siguiente, /plan en uno existente, el cierre del plan).
export function siguientePaso(root) {
    const marker = getMarkerSeguro(root);
    if (!marker) return { paso: 'instalar', comando: '/instalar', bloquea: true,
        motivo: 'Senzu no está instalado en este proyecto: sin eso solo hay skills sueltas, no el método (perfil, plan, devlog, memoria y los muros del proyecto)' };
    const omitir = new Set([].concat(marker.omitirPasos || []).map(String));
    const mat = projectMaturity(root);
    if (mat.existing && !mat.hasConventions && !omitir.has('adoptar')) return { paso: 'adoptar', comando: '/adoptar', bloquea: true,
        motivo: 'hay código con su propio estilo y ninguna convención sellada: sin /adoptar escribirías a tu manera, no a la del proyecto' };
    const plan = planStatus(root);
    if (!mat.existing && !plan.total) {
        const briefTxt = readText(path.join(ruta(root, 'plan'), 'brief.md')) || '';
        const hayBrief = tieneContenido(seccionMd(briefTxt, 'Objetivo'));
        // Plan y brief NO se imponen: no todo proyecto los necesita. Lo obligatorio es saber qué se va a hacer;
        // si el usuario no lo ha dicho claro, se habla con él antes de programar (decisión del usuario, ver 091).
        if (marker.frontProfile && !hayBrief && !omitir.has('brief') && !omitir.has('plan')) return { paso: 'brief', comando: '/brief y después /plan', bloquea: false, conversar: true,
            motivo: 'proyecto nuevo con interfaz y sin brief ni plan' };
        if (!omitir.has('plan')) return { paso: 'plan', comando: '/plan', bloquea: false, conversar: true,
            motivo: 'proyecto nuevo sin plan' };
    }
    if (plan.doing.length || plan.next.length) return { paso: 'siguiente', comando: '/siguiente', bloquea: false, anunciar: true,
        motivo: plan.doing.length ? `tarea en curso: ${plan.doing[0]}` : `siguiente tarjeta: ${plan.next[0]}` };
    if (plan.total && plan.done >= plan.total) return { paso: 'cierre', bloquea: false, anunciar: true,
        comando: marker.frontProfile ? '/verificar → /lanzar → /desplegar → /entregar' : '/verificar → /desplegar → /entregar',
        motivo: `plan terminado (${plan.done}/${plan.total} tarjetas): toca comprobarlo todo y llevarlo a producción, con el OK del usuario en cada paso` };
    if (mat.existing && !plan.total && !omitir.has('plan')) return { paso: 'plan', comando: '/plan', bloquea: false, anunciar: true,
        motivo: 'proyecto con código y sin plan: para una feature de varias partes, /plan (objetivo, alcance y tarjetas); para un arreglo puntual no hace falta' };
    return null;
}

export function projectMaturity(root) {
    // ¿Proyecto nuevo o existente? Guía la puerta de entrada: /adoptar (existente) vs /brief + /plan (nuevo).
    const commits = parseInt(git(root, ['rev-list', '--count', 'HEAD']) || '0', 10) || 0;
    // Existente = hay código o historia. Antes solo miraba carpetas típicas (src/, app/…) y un repo con cientos de
    // commits y su código en tools/ o core/ salía como «nuevo».
    const hasCode = ['src', 'app', 'apps', 'lib', 'resources', 'components', 'pages', 'packages'].some(d => fs.existsSync(path.join(root, d)))
        || ['composer.json', 'package.json', 'pyproject.toml', 'go.mod', 'pom.xml', 'Cargo.toml', 'Gemfile'].some(f => fs.existsSync(path.join(root, f)))
        || commits >= 5 || hayCodigoSuelto(root);
    const ownDiary = ['CHANGELOG.md', path.join('docs', 'decisions'), path.join('docs', 'adr'), 'HISTORY.md']
        .find(f => fs.existsSync(path.join(root, f))) || null;
    return {
        existing: hasCode,
        commits,
        ownDiary: ownDiary ? ownDiary.replace(/\\/g, '/') : null,
        ownGuide: fs.existsSync(path.join(root, 'CLAUDE.project.md')),
        hasConventions: fs.existsSync(ruta(root, 'conventions.md')),
    };
}

// --- deteccion de versiones del stack (en vivo, sin estado: composer/package/pyproject) ---
function firstMajorMinor(spec) {
    const m = /(\d+)(?:\.(\d+))?/.exec(String(spec || ''));
    return m ? { major: m[1], minor: m[2] } : null;
}
export function detectVersions(root) {
    // Devuelve [{ name, spec, key }]: key = 'php 8.2' / 'laravel 11' para la tabla de EOL.
    // En monorepos sin manifest en la raiz, mira un nivel dentro (apps/*, packages/*, services/*).
    const out = [];
    scanVersions(root, '', out);
    if (!out.length) {
        for (const base of ['apps', 'packages', 'services']) {
            for (const sub of dirNames(path.join(root, base)).slice(0, 10)) {
                scanVersions(path.join(root, base, sub), `${base}/${sub}: `, out);
            }
        }
    }
    return out;
}
function scanVersions(root, prefix, out) {
    const push = (name, spec, keyBase, useMinor) => {
        if (!spec) return;
        const v = firstMajorMinor(spec);
        const key = v ? `${keyBase} ${v.major}${useMinor && v.minor !== undefined ? '.' + v.minor : ''}` : null;
        out.push({ name: prefix + name, spec: String(spec), key });
    };
    const composer = (() => { try { return JSON.parse(readText(path.join(root, 'composer.json')) || 'null'); } catch { return null; } })();
    if (composer && composer.require) {
        push('PHP', composer.require.php, 'php', true);
        push('Laravel', composer.require['laravel/framework'], 'laravel', false);
        push('Symfony', composer.require['symfony/framework-bundle'], 'symfony', false);
    }
    const pkg = (() => { try { return JSON.parse(readText(path.join(root, 'package.json')) || 'null'); } catch { return null; } })();
    if (pkg) {
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const [dep, label, keyBase] of [
            ['astro', 'Astro', 'astro'], ['next', 'Next.js', 'next'], ['react', 'React', 'react'],
            ['vue', 'Vue', 'vue'], ['nuxt', 'Nuxt', 'nuxt'], ['svelte', 'Svelte', 'svelte'],
            ['tailwindcss', 'Tailwind', 'tailwind'], ['typescript', 'TypeScript', 'typescript'],
        ]) push(label, deps[dep], keyBase, false);
        if (pkg.engines && pkg.engines.node) push('Node', pkg.engines.node, 'node', false);
    }
    const pyproject = readText(path.join(root, 'pyproject.toml'));
    if (pyproject) {
        const py = /requires-python\s*=\s*["']([^"']+)["']/.exec(pyproject);
        if (py) push('Python', py[1], 'python', true);
        for (const [dep, label] of [['fastapi', 'FastAPI'], ['langgraph', 'LangGraph'], ['django', 'Django']]) {
            const m = new RegExp(`["']${dep}\\s*([^"']*)["']`).exec(pyproject);
            if (m) push(label, m[1].trim() || 'sin version fijada', dep, false);
        }
    }
    // WordPress: version del core en wp-includes/version.php
    const wpVer = readText(path.join(root, 'wp-includes', 'version.php'));
    if (wpVer) { const m = /\$wp_version\s*=\s*['"]([^'"]+)['"]/.exec(wpVer); if (m) push('WordPress', m[1], 'wordpress', false); }
    // Go: directiva go de go.mod
    const gomod = readText(path.join(root, 'go.mod'));
    if (gomod) { const m = /^go\s+(\d+\.\d+(?:\.\d+)?)/m.exec(gomod); if (m) push('Go', m[1], 'go', true); }
    // Java: pom.xml (java.version / maven.compiler.source) o build.gradle (sourceCompatibility)
    const pom = readText(path.join(root, 'pom.xml'));
    if (pom) { const m = /<(?:java\.version|maven\.compiler\.(?:source|release))>\s*(\d+)/.exec(pom); if (m) push('Java', m[1], 'java', false); }
    const gradle = readText(path.join(root, 'build.gradle')) || readText(path.join(root, 'build.gradle.kts'));
    if (gradle) { const m = /(?:sourceCompatibility|languageVersion)[^\d]*(\d+)/.exec(gradle); if (m) push('Java', m[1], 'java', false); }
    // .NET: TargetFramework del primer .csproj de la raiz
    try {
        const csproj = fs.readdirSync(root).find(f => f.endsWith('.csproj'));
        if (csproj) {
            const m = /<TargetFramework>net(\d+)\.(\d+)<\/TargetFramework>/.exec(readText(path.join(root, csproj)) || '');
            if (m) push('.NET', `${m[1]}.${m[2]}`, 'dotnet', false);
        }
    } catch {}
}

// Fin de soporte (fecha de EOL de seguridad, aproximada — verificar en endoflife.date si es critico).
const EOL = {
    'php 8.0': '2023-11', 'php 8.1': '2025-12', 'php 8.2': '2026-12', 'php 8.3': '2027-12', 'php 8.4': '2028-12',
    'laravel 9': '2024-02', 'laravel 10': '2025-02', 'laravel 11': '2026-03', 'laravel 12': '2027-02',
    'node 16': '2023-09', 'node 18': '2025-04', 'node 20': '2026-04', 'node 22': '2027-04',
    'python 3.8': '2024-10', 'python 3.9': '2025-10', 'python 3.10': '2026-10', 'python 3.11': '2027-10',
    'vue 2': '2023-12',
    'dotnet 6': '2024-11', 'dotnet 7': '2024-05', 'dotnet 8': '2026-11', 'dotnet 9': '2026-05',
};
export function eolWarnings(versions) {
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();          // meses absolutos
    const warns = [];
    for (const v of versions) {
        const eol = v.key && EOL[v.key];
        if (!eol) continue;
        const [y, mo] = eol.split('-').map(Number);
        const eolKey = y * 12 + (mo - 1);
        if (eolKey < nowKey) warns.push(`${v.name} ${v.key.split(' ')[1]} SIN SOPORTE desde ${eol} (sin parches de seguridad: proponer upgrade)`);
        else if (eolKey - nowKey <= 6) warns.push(`${v.name} ${v.key.split(' ')[1]} llega a EOL en ${eol} (planificar upgrade)`);
    }
    return warns;
}

// Patron introducido: casa en lo NUEVO y no estaba en lo VIEJO. Escape: la linea lleva 'senzu-allow'.
// Compartido por code-hygiene (debug + vetos de gustos.md) y conventions-guard (convenciones adoptadas).
// codigo: { strings, almohadilla } → busca solo en el CÓDIGO (sin comentarios ni, si se pide, strings: citar no es usar);
// soloCodigo conserva la longitud, así que la línea que se enseña y la de «senzu-allow» son las originales.
export function testIntroduced(pattern, neu, old, codigo = null) {
    if (!neu) return null;
    const rx = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    const ver = t => (codigo && t ? soloCodigo(t, codigo) : t);
    old = ver(old);
    for (const m of ver(neu).matchAll(rx)) {
        let start = neu.lastIndexOf('\n', Math.max(m.index - 1, 0)); if (start < 0) start = 0;
        let end = neu.indexOf('\n', m.index); if (end < 0) end = neu.length;
        const line = neu.substring(start, end);
        if (/(senzu|dev-standards)-allow/i.test(line)) continue;   // compat-dev-standards
        if (old && new RegExp(pattern.source, pattern.flags.replace('g', '')).test(old)) continue;
        return line.trim();
    }
    return null;
}

// ---------------------------------------------------------------- ¿Senzu al día?
// Un proyecto que sigue con una versión vieja no recibe los arreglos (el de las convenciones selladas se
// descubrió en uno con la 2.2.2). session-start avisa con QUÉ hacer y qué se pierde. Tres casos, del más barato
// al más caro: (1) hay una versión nueva instalada y la sesión sigue con la vieja; (2) el marketplace ya la trae;
// (3) GitHub tiene una más nueva (red: caché de 24 h, 1,5 s como mucho, SENZU_SIN_RED=1 la apaga). Con los hooks
// copiados al proyecto (.claude/hooks) se comparan con el repo de origen (standardsRoot), sin red.
export function cmpVer(a, b) {
    const x = String(a || '').split('.').map(n => parseInt(n, 10) || 0), y = String(b || '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
}
const leerJsonSeguro = f => { try { return JSON.parse(stripBom(fs.readFileSync(f, 'utf8'))); } catch { return null; } };
const maxVer = vs => vs.filter(Boolean).reduce((m, v) => (!m || cmpVer(v, m) > 0 ? v : m), null);
const textoNormal = f => { try { return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); } catch { return null; } };

async function ultimaDeGithub(repo, home) {
    const cache = path.join(home, '.config', 'senzu', 'ultima-version.json');
    const c = leerJsonSeguro(cache);
    if (c && Date.now() - (c.fecha || 0) < 24 * 3600 * 1000) return c;
    const out = { fecha: Date.now(), version: null, novedades: [] };
    const traer = async rel => {
        const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 1500);
        try { const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/${rel}`, { signal: ac.signal }); return r.ok ? await r.json() : null; }
        catch { return null; } finally { clearTimeout(t); }
    };
    const mk = await traer('.claude-plugin/marketplace.json');
    if (mk) out.version = maxVer([].concat(mk.plugins || []).map(p => p.version));
    const nv = out.version ? await traer('core/novedades.json') : null;
    if (nv) out.novedades = [].concat(nv.novedades || []);
    try { fs.mkdirSync(path.dirname(cache), { recursive: true }); fs.writeFileSync(cache, JSON.stringify(out)); } catch { }
    return out;
}

function novedadesDesde(lista, actual, ultima) {   // las que gana al pasar de actual a ultima (ni más viejas ni más nuevas)
    return [].concat(lista || []).filter(n => n && n.version && (!actual || cmpVer(n.version, actual) > 0) && (!ultima || cmpVer(n.version, ultima) <= 0))
        .sort((a, b) => (b.importante === true) - (a.importante === true) || cmpVer(b.version, a.version)).slice(0, 3);
}

export async function estadoVersion(root, { hooksDir = path.dirname(process.argv[1] || ''), home = os.homedir(), red = true } = {}) {
    const plugin = leerJsonSeguro(path.join(hooksDir, '..', '.claude-plugin', 'plugin.json'));
    if (!plugin) {
        // Hooks copiados al proyecto: ¿son los mismos que los del repo del que se instalaron?
        const m = getMarkerSeguro(root) || {};
        const origen = [m.standardsRoot, process.env.SENZU_HOME].filter(Boolean).find(d => fs.existsSync(path.join(d, 'core', 'hooks', 'lib.mjs')));
        if (!origen || relDelProyecto(path.join(origen, 'core', 'hooks'), hooksDir) !== null) return null;   // sin origen, o los hooks SON el origen
        const fuente = path.join(origen, 'core', 'hooks');
        const distintos = fs.readdirSync(fuente).filter(f => f.endsWith('.mjs')).filter(f => textoNormal(path.join(fuente, f)) !== textoNormal(path.join(hooksDir, f)));
        if (!distintos.length) return null;
        const ultima = (leerJsonSeguro(path.join(origen, 'plugins', 'senzu-core', '.claude-plugin', 'plugin.json')) || {}).version || null;
        return { modo: 'proyecto', actual: null, ultima, accion: 'instalar', distintos,
            mensaje: `los hooks de este proyecto (.claude/hooks) son anteriores a los de Senzu${ultima ? ' ' + ultima : ''} (${distintos.length} distintos, p. ej. ${distintos.slice(0, 3).join(', ')}): actualízalos con /instalar`,
            novedades: [] };
    }
    const nombre = plugin.name, actual = plugin.version;
    const id = `${nombre}@senzu`;
    // (1) instalada más nueva que la que corre esta sesión
    const inst = leerJsonSeguro(path.join(home, '.claude', 'plugins', 'installed_plugins.json')) || {};
    const registrada = maxVer([].concat(((inst.plugins || inst)[id]) || []).map(e => e && e.version));
    // (2) la que trae el marketplace descargado
    const mks = leerJsonSeguro(path.join(home, '.claude', 'plugins', 'known_marketplaces.json')) || {};
    const mk = mks.senzu || {};
    const clon = mk.installLocation || null;
    const enClon = clon ? ([].concat((leerJsonSeguro(path.join(clon, '.claude-plugin', 'marketplace.json')) || {}).plugins || []).find(p => p.name === nombre) || {}).version : null;
    const novClon = clon ? (leerJsonSeguro(path.join(clon, 'core', 'novedades.json')) || {}).novedades : null;
    let r = null;
    if (registrada && cmpVer(registrada, actual) > 0) {
        r = { accion: 'sesion', ultima: registrada, mensaje: `esta sesión usa Senzu ${actual}, pero ya está instalada la ${registrada}: abre una sesión nueva para usarla` };
    } else if (enClon && cmpVer(enClon, maxVer([actual, registrada])) > 0) {
        r = { accion: 'update', ultima: enClon, mensaje: `Senzu ${actual} está desactualizado: tu marketplace ya trae la ${enClon}. Actualiza con /plugin update ${id} (o desde /plugin) y abre una sesión nueva` };
    }
    let nov = novClon;
    // (3) GitHub, solo si lo local no ha encontrado nada
    if (!r && red && process.env.SENZU_SIN_RED !== '1' && !(mk.source && mk.source.source && mk.source.source !== 'github')) {
        const gh = await ultimaDeGithub((mk.source && mk.source.repo) || 'petersonsenadevs/senzu', home);
        if (gh.version && cmpVer(gh.version, maxVer([actual, registrada, enClon])) > 0) {
            r = { accion: 'marketplace', ultima: gh.version, mensaje: `Senzu ${actual} está desactualizado: la última es la ${gh.version}. Actualiza con /plugin marketplace update senzu y después /plugin update ${id}, y abre una sesión nueva` };
            nov = gh.novedades;
        }
    }
    return r ? { modo: 'plugin', actual, ...r, novedades: novedadesDesde(nov, actual, r.ultima) } : null;
}

// ---------------------------------------------------------------- texto CITADO frente a lo que se ejecuta
// Los muros buscan patrones («git push», «rm -rf», funciones de depuración) en el texto. Si el agente solo los
// CITA (un mensaje de commit, un heredoc que va a un archivo, un echo, un grep, un string o un comentario), no hace
// nada peligroso y bloquearlo le enseña a rodear el muro (ver 094). Estas funciones quitan el texto que es SOLO
// dato y dejan todo lo que se puede ejecutar: un heredoc o un echo que alimentan a bash/node/python, el texto de
// bash -c y las cadenas con $(…) o comillas invertidas (se ejecutan) se conservan siempre.
const INTERPRETES = /(^|[\s|;&(])(bash|sh|zsh|dash|ksh|fish|pwsh|powershell(\.exe)?|cmd(\.exe)?|node|deno|bun|python[0-9.]*|py|ruby|perl|php|psql|mysql|sqlite3|mongosh|redis-cli|ssh|eval|source|xargs|iex|invoke-expression|docker|kubectl|npx|env|sudo|exec|time|nohup)(\s|$)/i;
const CMD_TEXTO = /^(echo|printf|write-host|write-output|grep|egrep|fgrep|rg|ag|ack|findstr|select-string|sls)$/i;
const OPC_TEXTO = /^(-m|--message|--title|--body|--notes|--subject|--description|--grep|-message|-body|-title|-subject)$/i;
const OPC_TEXTO_PEGADA = /(?:^|\s)(--message|--title|--body|--notes|--subject|--description|--grep)=$/i;

export function sinTextoCitado(cmd) {
    let s = String(cmd || '').replace(/\r\n/g, '\n');
    // 1. heredocs (<<EOF … EOF, <<-'EOF' …): fuera el cuerpo salvo que la línea lo dé a un intérprete
    s = s.replace(/^(.*?)<<-?[ \t]*(['"]?)([A-Za-z_][\w-]*)\2(.*)\n([\s\S]*?)\n[ \t]*\3[ \t]*$/gm, (todo, antes, _q, fin, despues) => {
        const linea = antes + ' ' + despues;
        if (INTERPRETES.test(linea.replace(/^\s*(cat|tee)\b/i, ''))) return todo;
        return `${antes}<<${fin}${despues}\n${fin}`;
    });
    // 2. here-strings de PowerShell (@' … '@, @" … "@): fuera salvo que el comando los ejecute
    if (!/\b(iex|invoke-expression|-command|-encodedcommand|\[scriptblock\]|start-process|powershell|pwsh|bash)\b/i.test(s)) {
        s = s.replace(/@'\n[\s\S]*?\n'@/g, "@''@").replace(/@"\n[\s\S]*?\n"@/g, m => (/\$\(|`/.test(m) ? m : '@""@'));
    }
    // 3. cadenas entre comillas que son argumentos de texto, orden a orden
    let out = '', i = 0, palabras = [], inicioOrden = 0;
    const restoDeLinea = j => { const k = s.indexOf('\n', j); return s.slice(j, k < 0 ? s.length : k); };
    while (i < s.length) {
        const ch = s[i];
        if (ch === '\n' || ch === ';' || ch === '&' || ch === '|') {   // fin de orden
            out += ch; i++; palabras = []; inicioOrden = out.length; continue;
        }
        if (ch === "'" || ch === '"') {
            let j = i + 1;
            while (j < s.length && s[j] !== ch) { if (ch === '"' && s[j] === '\\') j++; j++; }
            const cuerpo = s.slice(i + 1, j), cierre = j < s.length ? ch : '';
            const cabeza = (palabras[0] || '').replace(/^.*[\\/]/, '');
            const sub = palabras[1] || '';
            const previa = palabras[palabras.length - 1] || '';
            const pegada = OPC_TEXTO_PEGADA.test(out.slice(inicioOrden));
            const ejecuta = ch === '"' && /\$\(|`/.test(cuerpo);
            const resto = restoDeLinea(j + 1);
            const alimentaInterprete = /\|/.test(resto) && INTERPRETES.test(resto.slice(resto.indexOf('|')));
            const esDestino = /[<>]\s*$/.test(out);   // > "archivo", >> 'archivo', < "entrada": es una ruta, no texto
            const esTexto = !ejecuta && !alimentaInterprete && !esDestino && (OPC_TEXTO.test(previa) || pegada || CMD_TEXTO.test(cabeza)
                || (/^git$/i.test(cabeza) && /^(log|grep|show|shortlog)$/i.test(sub)));
            out += esTexto ? ch + cierre : ch + cuerpo + cierre;
            palabras.push(esTexto ? '""' : cuerpo);
            i = j + 1; continue;
        }
        if (/\s/.test(ch)) { out += ch; i++; continue; }
        let j = i; while (j < s.length && !/[\s'";&|\n]/.test(s[j])) j++;
        const w = s.slice(i, j);
        if (!(palabras.length === 0 && /^\w+=/.test(w))) palabras.push(w);   // VAR=x cmd: la cabeza es cmd
        out += w; i = j;
    }
    return out;
}

// Código sin comentarios (y, si se pide, sin strings) en JS/TS/PHP/CSS y parecidos, con los saltos de línea
// intactos para que las líneas «senzu-allow» sigan cuadrando. Para buscar CÓDIGO (una llamada de depuración, un
// «: any» que se usa), no texto que lo menciona.
export function soloCodigo(txt, { strings = true, almohadilla = false } = {}) {   // almohadilla: «# …» es comentario (PHP, Python, shell; no CSS ni JS)
    const s = String(txt || ''); let out = '', i = 0;
    const blanco = t => t.replace(/[^\n]/g, ' ');
    while (i < s.length) {
        const c2 = s.slice(i, i + 2);
        if (c2 === '/*') { const j = s.indexOf('*/', i + 2); const k = j < 0 ? s.length : j + 2; out += blanco(s.slice(i, k)); i = k; continue; }
        if (c2 === '//' && s[i - 1] !== ':') { const j = s.indexOf('\n', i); const k = j < 0 ? s.length : j; out += blanco(s.slice(i, k)); i = k; continue; }   // («https://» no es comentario)
        if (almohadilla && s[i] === '#' && (i === 0 || s[i - 1] === '\n' || /\s/.test(s[i - 1])) && s[i + 1] !== '[' && s[i + 1] !== '!') {   // PHP/Python «# …» (no «#[atributo]» ni «#!»)
            const j = s.indexOf('\n', i); const k = j < 0 ? s.length : j; out += blanco(s.slice(i, k)); i = k; continue;
        }
        if (s[i] === "'" || s[i] === '"' || s[i] === '`') {   // los strings se saltan siempre (un «//» dentro no es comentario)
            const q = s[i]; let j = i + 1, cuerpo = '';
            while (j < s.length && s[j] !== q && !(q !== '`' && s[j] === '\n')) {
                if (s[j] === '\\') { cuerpo += strings ? '  ' : s.slice(j, j + 2); j += 2; continue; }
                if (q === '`' && s[j] === '$' && s[j + 1] === '{') {   // ${…} de una plantilla ES código: se conserva tal cual
                    let k = j + 2, prof = 1;
                    while (k < s.length && prof) { if (s[k] === '{') prof++; else if (s[k] === '}') prof--; k++; }
                    cuerpo += soloCodigo(s.slice(j, k), { strings, almohadilla }); j = k; continue;
                }
                cuerpo += strings ? (s[j] === '\n' ? '\n' : ' ') : s[j]; j++;
            }
            out += q + cuerpo + (j < s.length ? s[j] : ''); i = j + 1; continue;
        }
        out += s[i]; i++;
    }
    return out;
}

// ---------------------------------------------------------------- qué es backend, test y migración
// Una sola definición para todos los muros de backend (antes cada hook tenía su regex). rel con «/».
const EXT_BACK = /\.(php|ts|js|mjs|cjs|py|go|java|kt|cs|rb)$/i;
const DIR_BACK = /(^|\/)(app\/(Http|Models|Services|Actions|Jobs|Policies|Listeners|Console|Domain|Application|Infrastructure|Data|DTOs?)|routes|database\/(migrations|seeders|factories)|server|api|services|domain|application|infrastructure|modules|controllers|repositories|internal|handlers|usecases|use-cases|src\/main\/java|Controllers|prisma|alembic|migrations|db\/migrate)\//i;
const SUFIJO_BACK = /\.(service|controller|repository|resolver|module|handler|router|routes|model|entity|dto|usecase|use-case|gateway|guard|middleware|schema)\.[cm]?[jt]s$/i;
export function esTest(rel) {
    return /(^|\/)(tests?|__tests__|specs?)\/|\.(test|spec)\.[cm]?[jt]sx?$|Test\.php$|(^|\/)test_[^/]+\.py$|_test\.(py|go)$|Spec\.(kt|java)$/i.test(String(rel || ''));
}
export function esMigracion(rel) {
    return /(^|\/)(database\/migrations|migrations|alembic\/versions|prisma\/migrations|db\/migrate)\//i.test(String(rel || ''));
}
export function esCodigoBackend(rel) {
    const r = String(rel || '').replace(/\\/g, '/');
    if (!EXT_BACK.test(r) || /\.blade\.php$/i.test(r) || esTest(r)) return false;
    if (/(^|\/)(node_modules|vendor|dist|build|\.next|tools|scripts|\.claude|\.agents|senzu)\//i.test(r)) return false;
    return DIR_BACK.test(r) || SUFIJO_BACK.test(r) || esMigracion(r);
}

// Líneas que la sesión ha AÑADIDO a un archivo respecto a HEAD (git diff); archivo nuevo o sin git: todas.
export function lineasAnadidas(root, rel) {
    const abs = path.join(root, rel);
    const txt = readText(abs);
    if (txt === null) return [];
    try {
        const enGit = spawnSync('git', ['ls-files', '--error-unmatch', '--', rel], { cwd: root, encoding: 'utf8' }).status === 0;
        if (!enGit) return txt.split(/\r?\n/);
        const d = spawnSync('git', ['diff', 'HEAD', '--unified=0', '--no-color', '--', rel], { cwd: root, encoding: 'utf8' });
        if (d.status !== 0) return txt.split(/\r?\n/);
        return d.stdout.split(/\r?\n/).filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
    } catch { return txt.split(/\r?\n/); }
}

// Variables de entorno que usa un trozo de código (PHP, JS/TS, Python, Go, Ruby)
const ENV_IGNORAR = /^(NODE_ENV|CI|HOME|PATH|PWD|TZ|NEXT_RUNTIME|VERCEL(_\w+)?|GITHUB_\w+|RUNNER_\w+|npm_\w+|SENZU_\w+|DEV_STANDARDS_\w+|CLAUDE_\w+)$/;
export function clavesDeEntorno(lineas) {
    const txt = [].concat(lineas || []).join('\n');
    const out = new Set();
    const pats = [
        /\benv\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g, /\bgetenv\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g,
        /process\.env\.([A-Z][A-Z0-9_]+)/g, /process\.env\[\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\]/g, /import\.meta\.env\.([A-Z][A-Z0-9_]+)/g,
        /os\.environ\[\s*['"]([A-Z][A-Z0-9_]+)['"]\s*\]/g, /os\.environ\.get\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g,
        /os\.Getenv\(\s*"([A-Z][A-Z0-9_]+)"/g, /\bENV(?:\.fetch\(\s*|\[\s*)['"]([A-Z][A-Z0-9_]+)['"]/g,
    ];
    for (const rx of pats) for (const m of txt.matchAll(rx)) if (!ENV_IGNORAR.test(m[1])) out.add(m[1]);
    return [...out];
}
// El .env.example que documenta un archivo: el más cercano subiendo hasta la raíz (monorepos)
export function envEjemplo(root, rel) {
    let dir = path.dirname(path.join(root, rel));
    const tope = path.resolve(root);
    for (;;) {
        for (const n of ['.env.example', '.env.sample', '.env.dist', '.env.template']) {
            const f = path.join(dir, n);
            if (fs.existsSync(f)) return f;
        }
        if (path.resolve(dir) === tope || path.dirname(dir) === dir) return null;
        dir = path.dirname(dir);
    }
}

// ¿Lo escribió el usuario? Los informes de subagentes y las notificaciones también llegan como «prompt» y no
// deben enrutarse ni apuntarse como correcciones del usuario.
export function esMensajeDelUsuario(prompt) {
    const s = String(prompt || '');
    return !/<agent-message\b|<task-notification\b|^\s*\[SYSTEM NOTIFICATION|\[Subagent hand-back\]/i.test(s);
}

// ---------------------------------------------------------------- arquitectura DECLARADA (senzu/arquitectura/capas.json)
// El proyecto dice qué arquitectura tiene (capas, carpetas, quién puede usar a quién, contextos de DDD) y los
// muros la hacen cumplir. Sin capas.json no se aplica nada: no se impone DDD a quien no lo usa (ver 096).
// Lo comparten arquitectura-guard (lo que introduce cada cambio) y code-quality/scripts/arquitectura.mjs
// (el proyecto entero: /adoptar, /verificar, CI). Plantillas en code-quality/arquitectura/<estilo>.<stack>.json.
export function rutaArquitectura(root) { return path.join(path.dirname(rutaMarcador(root)), 'arquitectura', 'capas.json'); }
export function leerArquitectura(root) {
    const a = leerJsonSeguro(rutaArquitectura(root));
    return a && Array.isArray(a.capas) && a.capas.length ? a : null;
}
// Glob simple → regex: ** cualquier cosa (también nada), * un segmento. El primer * de un patrón de contextos se captura.
export function globARegex(glob, capturar = false) {
    let g = String(glob).replace(/\\/g, '/').replace(/^\.\//, ''), out = '', capturado = false;
    for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (c === '*' && g[i + 1] === '*') { out += g[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += g[i + 2] === '/' ? 2 : 1; continue; }
        if (c === '*') { out += capturar && !capturado ? '([^/]+)' : '[^/]*'; capturado = true; continue; }
        out += /[.+?^${}()|[\]\\]/.test(c) ? '\\' + c : c;
    }
    return new RegExp('^' + out + (g.endsWith('/') ? '' : '(?:/.*)?') + '$', 'i');
}
const encaja = (rel, globs) => [].concat(globs || []).some(g => globARegex(g).test(rel));
export function capaDe(arq, rel) { return arq.capas.find(c => encaja(rel, c.rutas)) || null; }
export function contextoDe(arq, rel) {
    for (const g of [].concat((arq.contextos && arq.contextos.rutas) || [])) { const m = globARegex(g, true).exec(rel); if (m && m[1]) return m[1]; }
    return null;
}

// Imports de un trozo de código (sin comentarios). PHP: use; TS/JS: import/require/export from; Python: import/from.
export function importsDe(txt, rel) {
    const t = soloCodigo(txt, { strings: false, almohadilla: /\.(php|py|rb)$/i.test(rel) });
    const out = [], add = (spec, idx) => { const linea = txt.slice(txt.lastIndexOf('\n', idx) + 1, (txt.indexOf('\n', idx) + 1 || txt.length + 1) - 1).trim(); out.push({ spec, linea }); };
    if (/\.php$/i.test(rel)) {
        for (const m of t.matchAll(/^\s*use\s+(?:function\s+|const\s+)?([A-Za-z_\\][\w\\]*)(?:\s*\{|\s*;|\s+as\s)/gm)) add(m[1].replace(/^\\/, ''), m.index + m[0].length - 1);
        for (const m of t.matchAll(/new\s+\\([A-Z][\w\\]+)\s*\(|\\([A-Z][\w]*\\[\w\\]+)::/g)) add((m[1] || m[2]), m.index + m[0].length - 1);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/i.test(rel)) {
        for (const m of t.matchAll(/(?:^|[;\s])(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g)) add(m[1] || m[2] || m[3], m.index + m[0].length - 1);
    } else if (/\.py$/i.test(rel)) {
        for (const m of t.matchAll(/^\s*from\s+([.\w]+)\s+import\b|^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm)) {
            if (m[1]) add(m[1], m.index + m[0].length - 1); else for (const x of m[2].split(',')) add(x.trim().split(/\s+as\s+/)[0], m.index + m[0].length - 1);
        }
    }
    return out;
}

// ¿Adónde apunta un import? { ruta: rel dentro del proyecto } o { paquete: nombre externo }
const cacheResolver = new Map();
function mapasDelProyecto(root) {
    if (cacheResolver.has(root)) return cacheResolver.get(root);
    const comp = leerJsonSeguro(path.join(root, 'composer.json')) || {};
    const psr4 = Object.entries(Object.assign({}, ((comp.autoload || {})['psr-4']) || {}, ((comp['autoload-dev'] || {})['psr-4']) || {}))
        .flatMap(([ns, dirs]) => [].concat(dirs).map(d => [ns, String(d).replace(/\\/g, '/').replace(/\/?$/, '/')])).sort((a, b) => b[0].length - a[0].length);
    let alias = [];
    try {
        const ts = JSON.parse(soloCodigo(readText(path.join(root, 'tsconfig.json')) || '{}', { strings: false }).replace(/,(\s*[}\]])/g, '$1'));
        const co = ts.compilerOptions || {}, baseUrl = String(co.baseUrl || '.').replace(/^\.\/?/, '');
        alias = Object.entries(co.paths || {}).map(([k, v]) => [k.replace(/\*$/, ''), path.posix.join(baseUrl, String([].concat(v)[0] || '').replace(/\*$/, ''))]);
    } catch { }
    if (!alias.length && fs.existsSync(path.join(root, 'src'))) alias = [['@/', 'src/'], ['~/', 'src/']];
    const m = { psr4, alias };
    cacheResolver.set(root, m);
    return m;
}
export function resolverImport(root, rel, spec) {
    const { psr4, alias } = mapasDelProyecto(root);
    if (/\.php$/i.test(rel)) {
        const s = spec.replace(/^\\/, '');
        for (const [ns, dir] of psr4) if (s.startsWith(ns)) return { ruta: path.posix.join(dir, s.slice(ns.length).replace(/\\/g, '/')) + '.php' };
        return { paquete: s };
    }
    if (/\.py$/i.test(rel)) {
        if (spec.startsWith('.')) {   // relativo: from ..infra import x
            const sube = spec.match(/^\.+/)[0].length;
            let dir = path.posix.dirname(rel); for (let i = 1; i < sube; i++) dir = path.posix.dirname(dir);
            return { ruta: path.posix.join(dir, spec.slice(sube).replace(/\./g, '/')) };
        }
        const como = spec.replace(/\./g, '/');
        for (const pre of ['', 'src/']) if (fs.existsSync(path.join(root, pre + como)) || fs.existsSync(path.join(root, pre + como + '.py'))) return { ruta: pre + como };
        return { paquete: spec };   // completo: «django.db» se distingue de «django.utils»
    }
    if (spec.startsWith('.')) return { ruta: path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)) };
    for (const [a, dest] of alias) if (spec.startsWith(a)) return { ruta: path.posix.normalize(path.posix.join(dest, spec.slice(a.length))) };
    return { paquete: spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0] };
}

// Infracciones que INTRODUCE un cambio (antes → después). Con antes = '' revisa el archivo entero (el script).
export function infraccionesArquitectura(root, arq, rel, antes, despues, { nuevo = false } = {}) {
    const out = [];
    if (encaja(rel, arq.excepciones) || esTest(rel)) return out;
    const capa = capaDe(arq, rel);
    const viejos = new Set(importsDe(antes || '', rel).map(i => i.spec));
    const nombre = c => c.nombre;
    if (capa) {
        const ctx = contextoDe(arq, rel);
        for (const imp of importsDe(despues || '', rel)) {
            if (viejos.has(imp.spec) || /senzu-allow/i.test(imp.linea)) continue;
            const r = resolverImport(root, rel, imp.spec);
            if (r.paquete) {
                // por segmentos: «pg» no atrapa «pg-pool» ni «django» a «djangorestframework»; un prefijo que acaba en \ o / sí
                const prohibido = [].concat(capa.prohibido || []).find(pfx => r.paquete === pfx
                    || (/[\\/.]$/.test(pfx) ? r.paquete.startsWith(pfx) : ['/', '.', '\\'].some(sep => r.paquete.startsWith(pfx + sep))));
                if (prohibido) out.push({ tipo: 'bloquea', regla: 'prohibido', linea: imp.linea,
                    msg: `la capa «${capa.nombre}» no puede usar ${prohibido} (${r.paquete})${capa.por_que ? ': ' + capa.por_que : ''}` });
                continue;
            }
            const destino = capaDe(arq, r.ruta);
            if (!destino || destino === capa) {
                // DDD: dentro de la misma capa, otro contexto
                const ctxDest = contextoDe(arq, r.ruta);
                if (ctx && ctxDest && ctx !== ctxDest && destino && !compartido(arq, ctxDest) && !publico(arq, r.ruta)) out.push({ tipo: 'bloquea', regla: 'contexto', linea: imp.linea,
                    msg: `el contexto «${ctx}» usa por dentro el contexto «${ctxDest}» (${r.ruta}): entre contextos solo se usa su capa pública (${[].concat((arq.contextos || {}).publico || ['Application']).join(', ')}), eventos o una capa anticorrupción` });
                continue;
            }
            if (![].concat(capa.puede_usar || []).includes(destino.nombre)) out.push({ tipo: 'bloquea', regla: 'dependencia', linea: imp.linea,
                msg: `la capa «${capa.nombre}» no puede usar la capa «${destino.nombre}» (${r.ruta}). Puede usar: ${[].concat(capa.puede_usar || []).join(', ') || 'ninguna (es el centro)'}` });
            else {
                const ctxDest = contextoDe(arq, r.ruta);
                if (ctx && ctxDest && ctx !== ctxDest && !compartido(arq, ctxDest) && !publico(arq, r.ruta)) out.push({ tipo: 'bloquea', regla: 'contexto', linea: imp.linea,
                    msg: `el contexto «${ctx}» usa por dentro el contexto «${ctxDest}» (${r.ruta}): entre contextos solo se usa su capa pública (${[].concat((arq.contextos || {}).publico || ['Application']).join(', ')}), eventos o una capa anticorrupción` });
            }
        }
    }
    // Controlador gordo: el controlador habla con el ORM en vez de con el servicio / caso de uso
    const ctl = arq.controladores;
    if (ctl && encaja(rel, ctl.rutas) && ctl.orm) {
        let rx = null; try { rx = new RegExp(ctl.orm); } catch { }
        const hit = rx && testIntroduced(rx, despues, antes, { strings: false, almohadilla: /\.(php|py|rb)$/i.test(rel) });
        if (hit) out.push({ tipo: 'bloquea', regla: 'controlador', linea: hit,
            msg: `el controlador accede a la base de datos directamente; en este proyecto la lógica va en ${ctl.logica_en || 'el servicio o caso de uso'} y el controlador solo traduce HTTP ↔ aplicación` });
        if (ctl.dto) {
            let rd = null; try { rd = new RegExp(ctl.dto); } catch { }
            const hd = rd && testIntroduced(rd, despues, antes, { strings: false, almohadilla: /\.(php|py|rb)$/i.test(rel) });
            if (hd) out.push({ tipo: 'aviso', regla: 'dto', linea: hd,
                msg: `pasas el array o el cuerpo de la petición tal cual a la capa de aplicación: crea un DTO (${ctl.dto_en || 'objeto de datos tipado'}) con lo validado, así el servicio no depende de HTTP` });
        }
    }
    // Árbol de carpetas: código nuevo fuera de las carpetas declaradas
    if (nuevo && !capa && esCodigoBackend(rel)) out.push({ tipo: 'aviso', regla: 'carpetas', linea: rel,
        msg: `${rel} no está en ninguna carpeta de la arquitectura declarada (${arq.estilo}). Donde va cada cosa: `
            + arq.capas.map(c => `${c.nombre} → ${[].concat(c.rutas).join(', ')}`).join(' · ') });
    return out;
}
const compartido = (arq, ctx) => [].concat((arq.contextos && arq.contextos.compartido) || []).map(s => s.toLowerCase()).includes(String(ctx).toLowerCase());
const publico = (arq, ruta) => [].concat((arq.contextos && arq.contextos.publico) || []).some(seg => new RegExp(`(^|/)${seg}(/|$)`, 'i').test(ruta));
