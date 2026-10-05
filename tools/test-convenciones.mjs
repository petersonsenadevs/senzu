#!/usr/bin/env node
// Suite de las CONVENCIONES SELLADAS (/adoptar): no se pueden alterar por ningún camino.
//   1. conventions-guard y protect-files bloquean llegue la ruta como llegue (C:\, C:/, c:\, /c/ de Git Bash,
//      relativa, raíz con barra final). Antes comparaban texto y con formatos distintos no bloqueaban nada (092).
//   2. Codex (apply_patch): actualizar, borrar o meter código prohibido, igual.
//   3. Ni apagando los hooks en el marcador.
//   4. Desde la terminal (guard): sed -i, >, rm, mv, Set-Content, git checkout… bloqueados; leer, no.
//   5. Commit (githook pre-commit): ningún commit cambia ni borra lo sellado sin la llave del usuario.
//   node tools/test-convenciones.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');   // SENZU_HOOKS_DIR: probar otra versión de los hooks
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const RUN = Date.now().toString(36);
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-convenciones-'));

// Regla que depende de la ruta RELATIVA (^src/): con la ruta mal calculada no se aplicaría
const CONV_JSON = JSON.stringify({ _sello: 'senzu:inmutable', rules: [{ files: '^src/.*\\.(ts|tsx)$', forbid: ':\\s*any\\b', why: 'en este proyecto no se usa any' }] }, null, 2);
const CONV_MD = '<!-- senzu:inmutable -->\n# Convenciones del proyecto\n- Sin any.\n';
function proyecto(nombre, { sellado = true, marker = { stack: 'next' } } = {}) {
    const d = path.join(base, nombre);
    fs.mkdirSync(path.join(d, 'senzu'), { recursive: true });
    fs.mkdirSync(path.join(d, 'src'), { recursive: true });
    fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), JSON.stringify(marker));
    fs.writeFileSync(path.join(d, 'senzu', 'conventions.json'), sellado ? CONV_JSON : CONV_JSON.replace('senzu:inmutable', 'borrador'));
    fs.writeFileSync(path.join(d, 'senzu', 'conventions.md'), sellado ? CONV_MD : CONV_MD.replace('senzu:inmutable', 'borrador'));
    fs.writeFileSync(path.join(d, 'src', 'a.ts'), 'export const a = 1;\n');
    return d;
}
const hook = (nombre, root, entrada, cwd) => spawnSync(process.execPath, [path.join(HOOKS, nombre)], {
    input: JSON.stringify({ session_id: `cv-${RUN}`, ...entrada }), encoding: 'utf8', cwd: cwd || base, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
});

// 1. formatos de ruta
const p1 = proyecto('rutas');
const win = path.resolve(p1), slash = win.replace(/\\/g, '/');
const formatos = process.platform === 'win32'
    ? { 'C:\\': win, 'C:/': slash, 'c:\\': win[0].toLowerCase() + win.slice(1), '/c/ (Git Bash)': '/' + win[0].toLowerCase() + slash.slice(2), 'con / final': slash + '/' }
    : { nativa: win, 'con / final': win + '/' };
for (const [nr, raiz] of Object.entries(formatos)) {
    for (const [na, prefijo] of Object.entries({ ...formatos, relativa: '' })) {
        if (na === 'con / final') continue;
        const f = rel => (prefijo ? prefijo.replace(/[\\/]$/, '') + (prefijo.includes('\\') ? '\\' : '/') : '') + (prefijo.includes('\\') ? rel.replace(/\//g, '\\') : rel);
        const conv = hook('conventions-guard.mjs', raiz, { tool_name: 'Write', tool_input: { file_path: f('src/b.ts'), content: 'export const b: any = 1;\n' } }, p1);
        ok(conv.status === 2, `conventions-guard bloquea any · raíz ${nr} · archivo ${na}`, `exit ${conv.status}`);
        for (const n of ['conventions.md', 'conventions.json']) {
            const pr = hook('protect-files.mjs', raiz, { tool_name: 'Edit', tool_input: { file_path: f('senzu/' + n), old_string: 'any', new_string: 'cualquier' } }, p1);
            ok(pr.status === 2, `protect-files bloquea ${n} · raíz ${nr} · archivo ${na}`, `exit ${pr.status}`);
        }
    }
}
// lo permitido sigue pasando
ok(hook('conventions-guard.mjs', win, { tool_name: 'Write', tool_input: { file_path: path.join(win, 'src', 'b.ts'), content: 'export const b: number = 1;\n' } }).status === 0, 'código que cumple la convención pasa');
ok(hook('conventions-guard.mjs', win, { tool_name: 'Write', tool_input: { file_path: path.join(win, 'scripts', 'x.ts'), content: 'const x: any = 1;\n' } }).status === 0, 'fuera de los archivos de la regla (^src/) pasa');
const p1b = proyecto('sin-sello', { sellado: false });
ok(hook('protect-files.mjs', p1b, { tool_name: 'Edit', tool_input: { file_path: path.join(p1b, 'senzu', 'conventions.md'), old_string: 'a', new_string: 'b' } }).status === 0, 'unas convenciones SIN sellar se pueden editar (aún se están pactando)');

// 2. Codex: apply_patch con rutas relativas a cwd
const parche = cuerpo => ({ tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n${cuerpo}\n*** End Patch\n` }, cwd: p1 });
ok(hook('protect-files.mjs', '', parche('*** Update File: senzu/conventions.md\n@@\n-- Sin any.\n+- Con any.')).status === 2, 'Codex: actualizar conventions.md');
ok(hook('protect-files.mjs', '', parche('*** Delete File: senzu/conventions.json')).status === 2, 'Codex: borrar conventions.json');
ok(hook('conventions-guard.mjs', '', parche('*** Add File: src/c.ts\n+export const c: any = 1;')).status === 2, 'Codex: código con any');

// 3. apagarlos en el marcador no sirve
const p3 = proyecto('apagados', { marker: { stack: 'next', hooksApagados: ['conventions-guard', 'protect-files'] } });
ok(hook('conventions-guard.mjs', p3, { tool_name: 'Write', tool_input: { file_path: path.join(p3, 'src', 'b.ts'), content: 'let b: any;\n' } }).status === 2, 'conventions-guard no se puede apagar');
ok(hook('protect-files.mjs', p3, { tool_name: 'Write', tool_input: { file_path: path.join(p3, 'senzu', 'conventions.md'), content: 'nada' } }).status === 2, 'protect-files no se puede apagar');

// 4. la terminal
const sh = (cmd, root = p1, tool = 'Bash') => hook('guard.mjs', root, { tool_name: tool, tool_input: { command: cmd } }, root).status;
for (const cmd of [
    "sed -i 's/Sin any/Con any/' senzu/conventions.md",
    'echo "{}" > senzu/conventions.json',
    'printf x >> senzu/conventions.md',
    'rm senzu/conventions.md',
    'mv senzu/conventions.json /tmp/c.json',
    'cp otro.md senzu/conventions.md',
    'git checkout -- senzu/conventions.md',
    'git restore senzu/conventions.json',
    `node -e "require('fs').writeFileSync('senzu/conventions.json','{}')"`,
]) ok(sh(cmd) === 2, `terminal bloquea: ${cmd}`);
for (const cmd of ["Set-Content senzu/conventions.md 'x'", 'Remove-Item senzu/conventions.json', "Out-File -FilePath senzu/conventions.md -InputObject 'x'"])
    ok(sh(cmd, p1, 'PowerShell') === 2, `PowerShell bloquea: ${cmd}`);
for (const cmd of ['cat senzu/conventions.md', 'grep -n any senzu/conventions.json', 'git diff senzu/conventions.md 2>&1'])
    ok(sh(cmd) === 0, `leer está permitido: ${cmd}`);
ok(sh("sed -i 's/a/b/' senzu/conventions.md", p1b) === 0, 'sin sellar, la terminal no las protege');
ok(sh('SENZU_ALLOW_CONVENCIONES=1 git commit -m x') === 2, 'el agente no usa la llave del usuario');

// 5. el commit (githook pre-commit de verdad, con git)
const repo = proyecto('repo');
const env0 = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
const git = (args, env = {}) => spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: { ...env0, ...env } });
git(['init', '-q', '-b', 'feat/x']);
git(['add', '-A']); git(['commit', '-q', '-m', 'inicio']);
fs.mkdirSync(path.join(repo, '.githooks'));
fs.copyFileSync(path.join(ROOT, 'core', 'githooks', 'pre-commit'), path.join(repo, '.githooks', 'pre-commit'));
git(['config', 'core.hooksPath', '.githooks']);
const commit = (env = {}) => git(['commit', '-q', '-m', 'cambio'], env).status;
fs.appendFileSync(path.join(repo, 'senzu', 'conventions.md'), '- Con any.\n'); git(['add', '-A']);
ok(commit() !== 0, 'pre-commit: no se commitea un cambio de conventions.md sellado');
ok(commit({ SENZU_ALLOW_CONVENCIONES: '1' }) === 0, 'pre-commit: con la llave del usuario, sí');
git(['rm', '-q', 'senzu/conventions.json']);
ok(commit() !== 0, 'pre-commit: tampoco se commitea borrarlo');
git(['reset', '-q', 'HEAD', '--', 'senzu/conventions.json']); git(['checkout', '--', 'senzu/conventions.json']);
fs.writeFileSync(path.join(repo, 'src', 'a.ts'), 'export const a = 2;\n'); git(['add', '-A']);
ok(commit() === 0, 'pre-commit: el resto de cambios se commitean normal', git(['status', '--short']).stdout);

fs.rmSync(base, { recursive: true, force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) { try { fs.rmSync(path.join(os.tmpdir(), f), { force: true }); } catch { } }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
