#!/usr/bin/env node
// Verifica el proyecto tras editar código: lint, types, tests y build, con veredicto.
// Ejecutar desde la RAÍZ del proyecto (cualquier agente, cualquier OS):
//   node <skills-dir>/code-quality/scripts/verify-build.mjs [--todos] [--paquete apps/web] [--sin-build]
// Proyecto simple: comandos de .claude/hooks/config.json -> commands o, si no hay, inferidos del manifiesto.
// Monorepo (pnpm/yarn/npm workspaces, turbo, o paquetes en apps/*, packages/*, services/*, libs/*):
// verifica CADA paquete en su carpeta, con su lenguaje: package.json (con el gestor del lockfile),
// pyproject.toml (ruff/mypy/pytest según su configuración, vía uv o poetry si los usa), composer.json
// (pint/phpstan/artisan test) y go.mod (go vet/go test). Por defecto solo los paquetes con cambios sin
// commitear (si no hay cambios o no hay git, todos); --todos fuerza todos.
// Una herramienta no instalada o un script inexistente cuenta como SKIP con su motivo, no como fallo.
// Si nada FALLA, deja constancia (flag que lee el stop-guard); sale con 1 si algo falla.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execSync, execFileSync } from 'node:child_process';

const root = process.cwd();
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const todos = args.includes('--todos');
const sinBuild = args.includes('--sin-build');
const soloPaquete = opt('--paquete');

const existe = (...p) => fs.existsSync(path.join(...p));
function readJson(f) { try { let s = fs.readFileSync(f, 'utf8'); if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1); return JSON.parse(s); } catch { return null; } }
function readText(f) { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }
const rel = d => (path.relative(root, d) || '.').replace(/\\/g, '/');

// Los comandos del stack vienen en formato POSIX ("./vendor/bin/pint --test"). En Windows cmd.exe no entiende
// "./" y responde "no se reconoce...": se resuelve el binario local a su ruta real (pint.bat, eslint.cmd...).
function resolverComando(c, dir) {
    const m = /^(?:\.\/)?((?:vendor\/bin|node_modules\/\.bin)\/[\w.-]+)(.*)$/.exec(c.trim());
    if (!m) return c;
    const base = path.join(dir, ...m[1].split('/'));
    const candidatos = process.platform === 'win32' ? [base + '.bat', base + '.cmd', base] : [base];
    const real = candidatos.find(f => fs.existsSync(f));
    if (!real) return c;
    const prefijo = process.platform === 'win32' && real === base && m[1].startsWith('vendor/') ? 'php ' : '';
    return `${prefijo}"${real}"${m[2]}`;
}

// ---------------------------------------------------------------- paquetes
const MANIFIESTOS = ['package.json', 'pyproject.toml', 'composer.json', 'go.mod', 'Cargo.toml', 'Gemfile', 'pom.xml', 'build.gradle', 'build.gradle.kts',
    'deno.json', 'deno.jsonc', 'requirements.txt', 'setup.py', 'Makefile', 'makefile', 'justfile', 'Justfile'];
const proyectoDotnet = d => { try { return fs.readdirSync(d).some(f => /\.(csproj|fsproj|sln)$/i.test(f)); } catch { return false; } };
const tieneManifiesto = d => MANIFIESTOS.some(m => existe(d, m)) || proyectoDotnet(d);
function expandir(patron) {   // "apps/*", "packages/**", "apps/web" (sin dependencias de glob)
    const limpio = patron.replace(/^["']|["']$/g, '').replace(/\/+$/, '');
    if (!limpio || limpio.startsWith('!')) return [];
    let actuales = [root];
    for (const p of limpio.split('/')) {
        const sig = [];
        for (const a of actuales) {
            if (p.includes('*')) {
                const re = new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*+/g, '.*') + '$');
                try { for (const e of fs.readdirSync(a, { withFileTypes: true })) if (e.isDirectory() && re.test(e.name) && !/^(node_modules|\.|dist|build|vendor)/.test(e.name)) sig.push(path.join(a, e.name)); } catch {}
            } else if (existe(a, p)) sig.push(path.join(a, p));
        }
        actuales = sig;
    }
    return actuales;
}
function patronesWorkspace() {
    const pats = [];
    const ws = readText(path.join(root, 'pnpm-workspace.yaml'));
    if (ws) { const bloque = /packages:\s*\r?\n((?:[ \t]*-.*(?:\r?\n|$))+)/.exec(ws); if (bloque) for (const l of bloque[1].split(/\r?\n/)) { const m = /^\s*-\s*(.+?)\s*(#.*)?$/.exec(l); if (m) pats.push(m[1]); } }
    const pkg = readJson(path.join(root, 'package.json'));
    if (pkg && pkg.workspaces) pats.push(...[].concat(Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces.packages || [])));
    const lerna = readJson(path.join(root, 'lerna.json')); if (lerna && lerna.packages) pats.push(...lerna.packages);
    return pats;
}
const subpaquetes = [...new Set([...patronesWorkspace(), 'apps/*', 'packages/*', 'services/*', 'libs/*', 'backend', 'frontend', 'api', 'web', 'server', 'client']
    .flatMap(expandir).map(d => path.resolve(d)))].filter(d => d !== root && tieneManifiesto(d)).sort();
const raizEsPaquete = tieneManifiesto(root);
const esMonorepo = subpaquetes.length > 0;

// ---------------------------------------------------------------- gestor de paquetes y prefijo de Python
function gestorJs(dir) {
    for (const d of [dir, root]) {
        if (existe(d, 'pnpm-lock.yaml')) return 'pnpm';
        if (existe(d, 'yarn.lock')) return 'yarn';
        if (existe(d, 'bun.lockb') || existe(d, 'bun.lock')) return 'bun';
        if (existe(d, 'package-lock.json')) return 'npm';
    }
    return 'npm';
}
const correr = (gestor, script) => gestor === 'yarn' ? `yarn ${script}` : `${gestor} run ${script}`;
function prefijoPy(dir) {
    for (const d of [dir, root]) { if (existe(d, 'uv.lock')) return 'uv run '; if (existe(d, 'poetry.lock')) return 'poetry run '; }
    return '';
}
// El Python del sistema: en Windows «python» puede ser el atajo de la Store que no hace nada; el lanzador «py -3» no
let pythonCache = null;
function python() {
    if (pythonCache !== null) return pythonCache;
    const prueba = (exe, a) => { try { execFileSync(exe, [...a, '--version'], { stdio: 'ignore' }); return true; } catch { return false; } };
    pythonCache = process.platform === 'win32' && prueba('py', ['-3']) ? 'py -3' : prueba('python3', []) ? 'python3' : prueba('python', []) ? 'python' : '';
    return pythonCache;
}
// Script envolvente del proyecto (mvnw, gradlew): en Windows su .cmd/.bat
const envoltorio = (dir, n) => (process.platform === 'win32' ? [n + '.cmd', n + '.bat'] : [n]).map(f => path.join(dir, f)).find(f => fs.existsSync(f));

// ---------------------------------------------------------------- comandos por paquete
function comandosDe(dir, esRaiz) {
    const cmds = new Map();
    // config.json manda en un proyecto simple (sus comandos son de raíz; en un monorepo no aplican)
    const cfg = esRaiz && !esMonorepo ? readJson(path.join(root, '.claude', 'hooks', 'config.json')) : null;
    if (cfg && cfg.commands) for (const k of ['lint', 'types', 'test', 'build']) if (cfg.commands[k]) cmds.set(k, resolverComando(String(cfg.commands[k]), dir));
    if (cmds.size) return cmds;
    const pkg = readJson(path.join(dir, 'package.json'));
    if (pkg) {
        const s = pkg.scripts || {};
        const g = gestorJs(dir);
        const uno = (...nombres) => nombres.find(n => s[n] && !/no test specified/i.test(s[n]));
        const lint = uno('lint'); if (lint) cmds.set('lint', correr(g, lint));
        const tipos = uno('typecheck', 'type-check', 'types', 'check-types', 'tsc', 'check');
        if (tipos) cmds.set('types', correr(g, tipos));
        else if ((pkg.dependencies && pkg.dependencies.astro) || (pkg.devDependencies && pkg.devDependencies.astro)) cmds.set('types', 'npx --no-install astro check');
        const test = uno('test', 'test:unit'); if (test) cmds.set('test', correr(g, test));
        const build = uno('build'); if (build && !sinBuild) cmds.set('build', correr(g, build));
    }
    const py = readText(path.join(dir, 'pyproject.toml'));
    if (py) {
        const pre = prefijoPy(dir);
        if (/^\[tool\.ruff/m.test(py) || existe(dir, 'ruff.toml') || existe(dir, '.ruff.toml')) cmds.set(cmds.has('lint') ? 'lint-py' : 'lint', `${pre}ruff check .`);
        if (/^\[tool\.mypy/m.test(py) || existe(dir, 'mypy.ini')) {
            // Respeta lo que la configuración dice que se revisa: con files/packages/modules, mypy sin rutas
            // (pasarle "." lo pisaría y revisaría también los tests); si no, src/ cuando existe.
            const secMypy = (/^\[tool\.mypy\][^[]*/m.exec(py) || [''])[0] + readText(path.join(dir, 'mypy.ini'));
            const objetivoMypy = /^\s*(files|packages|modules)\s*=/m.test(secMypy) ? '' : existe(dir, 'src') ? ' src' : ' .';
            cmds.set(cmds.has('types') ? 'types-py' : 'types', `${pre}mypy${objetivoMypy}`);
        }
        if (/^\[tool\.pytest/m.test(py) || existe(dir, 'pytest.ini') || existe(dir, 'tests')) cmds.set(cmds.has('test') ? 'test-py' : 'test', `${pre}pytest -q`);
    }
    if (existe(dir, 'composer.json')) {
        const bin = n => [n + '.bat', n].map(x => path.join(dir, 'vendor', 'bin', x)).find(f => fs.existsSync(f));
        const pint = bin('pint'); if (pint) cmds.set(cmds.has('lint') ? 'lint-php' : 'lint', `"${pint}" --test`);
        const phpstan = bin('phpstan'); if (phpstan) cmds.set(cmds.has('types') ? 'types-php' : 'types', `"${phpstan}" analyse`);
        if (existe(dir, 'artisan')) cmds.set(cmds.has('test') ? 'test-php' : 'test', 'php artisan test');
    }
    if (existe(dir, 'go.mod')) { cmds.set(cmds.has('lint') ? 'vet-go' : 'lint', 'go vet ./...'); cmds.set(cmds.has('test') ? 'test-go' : 'test', 'go test ./...'); }
    const pon = (k, c) => cmds.set(cmds.has(k) ? `${k}-${cmds.size}` : k, c);
    if (existe(dir, 'Cargo.toml')) {   // Rust: clippy como lint (con avisos = error), tests y build
        pon('lint', 'cargo clippy --quiet --all-targets -- -D warnings'); pon('test', 'cargo test --quiet');
        if (!sinBuild) pon('build', 'cargo build --quiet');
    }
    if (existe(dir, 'Gemfile')) {   // Ruby: rubocop si está configurado; rspec o minitest según la carpeta
        if (existe(dir, '.rubocop.yml')) pon('lint', 'bundle exec rubocop');
        if (existe(dir, 'spec')) pon('test', 'bundle exec rspec'); else if (existe(dir, 'test') && existe(dir, 'Rakefile')) pon('test', 'bundle exec rake test');
    }
    if (existe(dir, 'pom.xml')) { const mvnw = envoltorio(dir, 'mvnw'); pon('test', `${mvnw ? `"${mvnw}"` : 'mvn'} -q -B verify`); }   // verify = compilar + tests + checks del pom
    if (existe(dir, 'build.gradle') || existe(dir, 'build.gradle.kts')) { const gw = envoltorio(dir, 'gradlew'); pon('test', `${gw ? `"${gw}"` : 'gradle'} check -q`); }
    if (proyectoDotnet(dir)) { if (!sinBuild) pon('build', 'dotnet build --nologo -v q'); pon('test', 'dotnet test --nologo -v q'); }
    if (existe(dir, 'deno.json') || existe(dir, 'deno.jsonc')) { pon('lint', 'deno lint'); pon('test', 'deno test --quiet'); }   // deno test también comprueba tipos
    // Python sin pyproject (requirements.txt / setup.py): lo que esté configurado y, si no hay nada, al menos que compile
    if (!py && (existe(dir, 'requirements.txt') || existe(dir, 'setup.py')) && python()) {
        const req = readText(path.join(dir, 'requirements.txt'));
        if (existe(dir, 'ruff.toml') || existe(dir, '.ruff.toml')) pon('lint', `${python()} -m ruff check .`);
        if (existe(dir, 'tests') || existe(dir, 'pytest.ini') || /^pytest\b/mi.test(req)) pon('test', `${python()} -m pytest -q`);
        if (!cmds.size) pon('sintaxis', `${python()} -m compileall -q .`);
    }
    // Makefile / justfile: sus objetivos de verificación, si no ha salido nada del manifiesto
    if (!cmds.size) {
        const mk = readText(path.join(dir, 'Makefile')) || readText(path.join(dir, 'makefile'));
        for (const t of ['lint', 'check', 'test', 'build']) if (new RegExp(`^${t}\\s*:`, 'm').test(mk) && !(t === 'build' && sinBuild)) pon(t, `make ${t}`);
        const just = readText(path.join(dir, 'justfile')) || readText(path.join(dir, 'Justfile'));
        if (!cmds.size) for (const t of ['lint', 'check', 'test', 'build']) if (new RegExp(`^${t}\\s*:`, 'm').test(just) && !(t === 'build' && sinBuild)) pon(t, `just ${t}`);
    }
    // Reglas de arquitectura (backend-audit references/reglas-arquitectura.md)
    const deptracBin = ['deptrac.bat', 'deptrac'].map(n => path.join(dir, 'vendor', 'bin', n)).find(f => fs.existsSync(f));
    const deptracCfg = ['deptrac.yaml', 'deptrac.yml'].find(f => existe(dir, f));
    const depcruiseCfg = ['.dependency-cruiser.cjs', '.dependency-cruiser.js'].find(f => existe(dir, f));
    if (deptracBin && deptracCfg) cmds.set('arch', `"${deptracBin}" analyse --no-progress`);
    else if (depcruiseCfg) cmds.set('arch', `npx --no-install depcruise src --config ${depcruiseCfg}`);
    else if (existe(dir, '.importlinter')) cmds.set('arch', `${prefijoPy(dir)}lint-imports`);
    return cmds;
}

// ---------------------------------------------------------------- qué paquetes verificar
function cambiados() {
    try {
        const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return out.split('\n').map(l => l.slice(3).trim().split(' -> ').pop().replace(/^"|"$/g, '')).filter(Boolean).map(f => path.resolve(root, f));
    } catch { return null; }
}
const candidatos = [...(raizEsPaquete ? [root] : []), ...subpaquetes];
let objetivo = [];
if (soloPaquete) objetivo = candidatos.filter(d => rel(d) === soloPaquete.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, ''));
else if (todos || !esMonorepo) objetivo = candidatos;
else {
    const cam = cambiados();
    if (!cam || !cam.length) objetivo = candidatos;
    else {
        objetivo = subpaquetes.filter(d => cam.some(f => f.startsWith(d + path.sep)));
        // Carpetas de agentes (las reescribe el instalador de Senzu), documentación y diario no son
        // código del proyecto: un .mjs en .claude/hooks no debe disparar la verificación de todo el monorepo
        const NO_CODIGO = /^(\.claude|\.agents|\.codex|\.cursor|\.windsurf|\.github|\.githooks|\.ui-verify|senzu|devlog|docs?|plan|design-system)([\\/]|$)/i;
        const sueltos = cam.filter(f => !subpaquetes.some(d => f.startsWith(d + path.sep)) && !NO_CODIGO.test(path.relative(root, f)));
        const codigoSuelto = sueltos.filter(f => /\.(m?[jt]sx?|cjs|vue|svelte|astro|php|py|go|rs|css|scss)$/i.test(f) || /^(package|tsconfig[\w.-]*|turbo|composer|pyproject|biome|\.?eslint[\w.-]*|\.prettierrc[\w.-]*|prettier\.config[\w.-]*)\.(json|jsonc|toml|js|cjs|mjs|ya?ml)$|^(pnpm-workspace\.yaml|\.eslintrc|\.prettierrc)$/i.test(path.basename(f)));
        if (codigoSuelto.length) objetivo = raizEsPaquete ? [root, ...objetivo] : candidatos;   // config compartida: afecta a todos
        if (!objetivo.length) {
            console.log(`[verify-build] Monorepo: los cambios sin commitear no tocan ningún paquete ni código (${cam.length} archivo(s): docs, devlog, configuración de agentes u otros sin código). Nada que verificar.`);
            constancia();
            process.exit(0);
        }
    }
}
if (soloPaquete && !objetivo.length) { console.log(`[verify-build] No encuentro el paquete "${soloPaquete}". Paquetes: ${candidatos.map(rel).join(', ') || '(ninguno)'}`); process.exit(2); }

let plan = objetivo.map(d => ({ dir: d, cmds: comandosDe(d, d === root) })).filter(p => p.cmds.size);
if (!plan.length && !esMonorepo) {
    // Sin manifiesto de build no hay build que hacer: es otro tipo de proyecto (scripts, hooks, documentación…).
    // Se comprueba con lo que el propio repo trae (sus suites) y, de lo cambiado, la sintaxis y los enlaces.
    const sb = comprobacionesSinBuild();
    if (!sb.cmds.size) {
        console.log(`[verify-build] ${sb.resumen} Nada que comprobar automáticamente.`);
        if (!sb.hayCambiosDeCodigo) { constancia(); process.exit(0); }
        console.log('Hay código cambiado sin forma de comprobarlo aquí: verifícalo a mano y di cómo en tu respuesta.');
        process.exit(2);
    }
    console.log(`[verify-build] ${sb.resumen}`);
    plan = [{ dir: root, cmds: sb.cmds }];
}
if (!plan.length) {
    console.log(`[verify-build] No hay comandos que ejecutar${esMonorepo ? ` en ${objetivo.map(rel).join(', ')}` : ''} (sin config.json ni scripts de lint/types/test/build reconocibles).`);
    process.exit(2);
}
if (esMonorepo) console.log(`[verify-build] Monorepo: ${plan.map(p => rel(p.dir)).join(', ')}${!todos && !soloPaquete ? ' (los paquetes con cambios; --todos para todos)' : ''}`);
if (args.includes('--plan')) {   // solo enseña qué ejecutaría
    for (const { dir, cmds } of plan) for (const [k, c] of cmds) console.log(`  ${rel(dir)} · ${k}: ${typeof c === 'string' ? c : c.desc}`);
    process.exit(0);
}

// ---------------------------------------------------------------- ejecutar
// Herramienta no instalada o script que no existe = SKIP con motivo (no es un fallo del código).
const NO_CONFIGURADO = /Missing script|no test specified|command not found|no se reconoce|is not recognized|ERR_PNPM_NO_SCRIPT|Couldn't find a script|No module named '?(ruff|mypy|pytest)\b|Failed to spawn: `(ruff|mypy|pytest)`|executable file not found|no tests ran|collected 0 items|no such command: `?clippy|No rule to make target|Could not find command "?bundle|could not find Gemfile/i;
const results = [];
let fails = 0;
for (const { dir, cmds } of plan) {
    const pre = esMonorepo ? `${rel(dir)} · ` : '';
    for (const [k, c] of cmds) {
        console.log(`== ${pre}${k}: ${typeof c === 'string' ? c : c.desc}`);
        let out = '', code = 0;
        if (typeof c !== 'string') ({ code, out } = c.fn());   // comprobación interna (sintaxis, enlaces)
        else try {
            out = execSync(c, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
        } catch (e) {
            code = e.status == null ? 1 : e.status;
            out = (e.stdout || '') + (e.stderr || '');
        }
        // pytest sale con 5 cuando no hay tests: no es un fallo
        if (code !== 0 && (NO_CONFIGURADO.test(out) || (code === 5 && /pytest/.test(c)))) {
            const motivo = out.split(/\r?\n/).find(l => NO_CONFIGURADO.test(l)) || out.split(/\r?\n/).find(l => l.trim()) || '';
            results.push(`SKIP  ${pre}${k}  (no configurado: ${motivo.trim().slice(0, 110)})`);
            continue;
        }
        if (code !== 0) {
            fails++;
            results.push(`FAIL  ${pre}${k}  (exit ${code})`);
            console.log(out.split(/\r?\n/).filter(l => l).slice(-15).join('\n'));
        } else results.push(`PASS  ${pre}${k}`);
    }
}

console.log('\n== Resumen ==');
for (const r of results) console.log(`  ${r}`);
if (fails) {
    console.log(`\n[verify-build] ${fails} comando(s) en FALLO: corrige y re-ejecuta hasta 0. No des la tarea por hecha en rojo.`);
    process.exit(1);
}
constancia();
console.log('\n[verify-build] Todo en verde. Constancia registrada. Si tocaste UI, ademas ui-verify (movil primero).');
process.exit(0);

// ---------------------------------------------------------------- sin manifiesto: no es un build
// Repos de scripts, hooks, plugins o documentación. La comprobación buena es la que el propio repo trae (sus
// suites: tools/test-*, tools/check-*, scripts/test*…) más, de lo cambiado, que el código se pueda cargar
// (sintaxis) y que los documentos no enlacen a archivos que no existen. --rapido se salta las suites.
function hayEjecutable(exe) { try { execFileSync(exe, ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } }
function comprobacionesSinBuild() {
    const cmds = new Map();
    const rapido = args.includes('--rapido');
    const suites = [];
    for (const d of ['tools', 'scripts', 'test', 'tests', 'bin']) {
        let ents = [];
        try { ents = fs.readdirSync(path.join(root, d), { withFileTypes: true }); } catch { continue; }
        for (const e of ents.filter(x => x.isFile()).map(x => x.name).sort()) if (/^(test|check)[-_.][\w.-]*\.(mjs|cjs|js|sh|ps1|py)$/i.test(e)) suites.push(`${d}/${e}`);
    }
    const ejecutor = f => {
        const q = `"${path.join(root, f)}"`, ext = path.extname(f).toLowerCase();
        if (['.mjs', '.cjs', '.js'].includes(ext)) return `node ${q}`;
        if (ext === '.ps1') return process.platform === 'win32' ? `powershell -NoProfile -ExecutionPolicy Bypass -File ${q}` : (hayEjecutable('pwsh') ? `pwsh -NoProfile -File ${q}` : null);
        if (ext === '.sh') return hayEjecutable('bash') ? `bash ${q}` : null;
        if (ext === '.py') return python() ? `${python()} ${q}` : null;
        return null;
    };
    if (!rapido) for (const s of suites) { const c = ejecutor(s); if (c) cmds.set(`suite ${s}`, c); }
    const cam = (cambiados() || []).filter(f => { try { return fs.statSync(f).isFile(); } catch { return false; } })
        .filter(f => !/(^|[\\/])(node_modules|vendor|\.git)[\\/]/.test(f));
    const codigo = cam.filter(f => /\.(mjs|cjs|js|json|py|ps1|sh)$/i.test(f));
    const docs = cam.filter(f => /\.md$/i.test(f));
    if (codigo.length) cmds.set('sintaxis', { desc: `que cargue el código cambiado (${codigo.length}: JS con node --check, Python, PowerShell, shell y JSON)`, fn: () => sintaxis(codigo) });
    if (docs.length) cmds.set('enlaces', { desc: `enlaces relativos de los documentos cambiados (${docs.length})`, fn: () => enlaces(docs) });
    const partes = [suites.length ? `sus ${suites.length} suite(s) propias${rapido ? ' (saltadas con --rapido)' : ''}` : null,
        codigo.length ? `la sintaxis de ${codigo.length} archivo(s) cambiado(s)` : null, docs.length ? `los enlaces de ${docs.length} documento(s) cambiado(s)` : null].filter(Boolean);
    const resumen = 'Sin manifiesto de build (package.json, composer.json, pyproject.toml, Cargo.toml, go.mod…): no es un build, es un repo de scripts o documentación. '
        + (partes.length ? `Se comprueba con ${partes.join(', ')}.` : 'No tiene suites propias ni cambios de código o documentos.');
    return { cmds, resumen, hayCambiosDeCodigo: cam.some(f => /\.(rs|go|rb|java|kt|cs|php|ts|tsx|jsx|vue|svelte|astro)$/i.test(f)) };
}
function sintaxis(archivos) {
    const errores = [], ps1 = [];
    const primera = e => String((e.stderr && e.stderr.toString()) || e.message || '').split(/\r?\n/).map(l => l.trim()).find(l => l && !/^at |^Node\.js v/.test(l)) || 'error de sintaxis';
    for (const f of archivos) {
        const r = rel(f), ext = path.extname(f).toLowerCase();
        try {
            if (['.mjs', '.cjs', '.js'].includes(ext)) execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'pipe', 'pipe'] });
            else if (ext === '.json') {   // tsconfig, jsconfig y los de editores admiten comentarios: no son JSON estricto
                if (!/(^|\/)(tsconfig[\w.-]*|jsconfig[\w.-]*|devcontainer)\.json$|(^|\/)\.vscode\//i.test(r)) { let s = fs.readFileSync(f, 'utf8'); if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1); JSON.parse(s); }
            } else if (ext === '.py') { if (python()) execSync(`${python()} -c "import ast,sys; ast.parse(open(sys.argv[1], encoding='utf-8').read(), sys.argv[1])" "${f}"`, { stdio: ['ignore', 'pipe', 'pipe'] }); }
            else if (ext === '.sh') { if (hayEjecutable('bash')) execFileSync('bash', ['-n', f], { stdio: ['ignore', 'pipe', 'pipe'] }); }
            else if (ext === '.ps1') ps1.push(f);
        } catch (e) { errores.push(`${r}: ${primera(e)}`); }
    }
    if (ps1.length) {   // el analizador de PowerShell, en una sola llamada para todos
        const exe = process.platform === 'win32' ? 'powershell' : 'pwsh';
        // salida en UTF-8 (si no, Windows usa la página de códigos de la consola y los acentos llegan rotos)
        const script = '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;' + ps1.map(f => `$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${f.replace(/'/g, "''")}',[ref]$null,[ref]$e);if($e){$e|ForEach-Object{'${rel(f)}|'+$_.Extent.StartLineNumber+'|'+$_.Message}}`).join(';');
        try {
            errores.push(...execFileSync(exe, ['-NoProfile', '-Command', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
                .split(/\r?\n/).filter(l => l.trim()).map(l => { const [a, n, ...m] = l.split('|'); return `${a}: línea ${n}: ${m.join('|')}`; }));
        } catch { }
    }
    return errores.length ? { code: 1, out: errores.join('\n') } : { code: 0, out: '' };
}
function enlaces(docs) {
    const rotos = [];
    for (const f of docs) {
        const txt = readText(f).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');   // lo que va en código no es un enlace
        for (const m of txt.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
            if (/^([a-z][a-z0-9+.-]*:|#|\/|\{|\$|<)/i.test(m[1])) continue;   // web, correo, ancla, absoluta o plantilla
            let dest = m[1].split('#')[0].split('?')[0];
            try { dest = decodeURI(dest); } catch { }
            if (dest && !fs.existsSync(path.resolve(path.dirname(f), dest))) rotos.push(`${rel(f)}: enlace roto → ${m[1]}`);
        }
    }
    return rotos.length ? { code: 1, out: rotos.join('\n') } : { code: 0, out: '' };
}

function constancia() {   // flag para el stop-guard (mismo esquema de hash que core/hooks/lib.mjs)
    const hash = crypto.createHash('md5').update(root.toLowerCase(), 'utf8').digest('hex').slice(0, 12);
    fs.writeFileSync(path.join(os.tmpdir(), `dev-standards-verified-${hash}.flag`), '');   // compat-dev-standards (nombre interno compartido con lib.mjs)
}
