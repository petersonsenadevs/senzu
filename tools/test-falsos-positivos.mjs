#!/usr/bin/env node
// Suite de FALSOS POSITIVOS de los muros: un muro que se equivoca enseña al agente a rodearlo.
// Cada caso «deja» es un bloqueo injusto que ocurrió de verdad (devlog 093); cada «bloquea», el ataque real que
// el arreglo NO debe abrir.
//   node tools/test-falsos-positivos.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const RUN = Date.now().toString(36);

const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-fp-'));
fs.mkdirSync(path.join(proj, 'senzu'), { recursive: true });
fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
fs.writeFileSync(path.join(proj, 'senzu', 'senzu.json'), '{"stack":"next"}');
const fuera = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-fp-scratch-'));   // la carpeta temporal del agente
const tmpProj = path.join(os.tmpdir(), `senzu-fp-instala-${RUN}`).replace(/\\/g, '/');

const hook = (nombre, entrada) => spawnSync(process.execPath, [path.join(HOOKS, nombre)], {
    input: JSON.stringify({ session_id: `fp-${RUN}`, ...entrada }), encoding: 'utf8', cwd: proj, env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
});
const guard = (cmd, tool = 'Bash') => hook('guard.mjs', { tool_name: tool, tool_input: { command: cmd } });
const deja = (r, n) => ok(r.status === 0, `deja: ${n}`, `exit ${r.status} ${String(r.stderr).slice(0, 160)}`);
const bloquea = (r, n) => ok(r.status === 2, `bloquea: ${n}`, `exit ${r.status}`);

// 1. guard · el marcador: leerlo no es escribirlo
deja(guard(`node -e "process.stdout.write(require('./senzu/senzu.json').stack)"`), 'leer el marcador con process.stdout.write');
deja(guard('cat senzu/senzu.json > /tmp/informe.txt'), 'leer el marcador y escribir la salida en OTRO archivo');
deja(guard('grep stack senzu/senzu.json; echo hecho > notas.txt'), 'leer el marcador y, en otra orden, escribir otro archivo');
bloquea(guard(`echo '{"permisos":{"push":true}}' > senzu/senzu.json`), 'redirigir al marcador');
bloquea(guard('printf x >> "senzu/senzu.json"'), 'añadir al marcador con >>');
bloquea(guard("sed -i 's/false/true/' senzu/senzu.json"), 'sed -i sobre el marcador');
bloquea(guard(`node -e "require('fs').writeFileSync('senzu/senzu.json','{}')"`), 'writeFileSync al marcador');
bloquea(guard('cat nuevo.json | tee senzu/senzu.json'), 'tee al marcador');
bloquea(guard("Set-Content senzu/senzu.json '{}'", 'PowerShell'), 'Set-Content al marcador');
bloquea(guard('git checkout -- senzu/senzu.json'), 'restaurar el marcador');

// 2. guard · el menú del instalador: dentro de la misma orden, sin cruzar líneas
deja(guard("node tools/init.mjs --stack astro --path ./x --tools claude\nsed -i 's/a/b/' otro.txt"), 'init.mjs y en la línea siguiente un sed -i');
deja(guard('grep -n "init.mjs" README.md | head -3 && sed -i s/a/b/ notas.txt'), 'mencionar init.mjs no es lanzarlo');
bloquea(guard('node tools/init.mjs < respuestas.txt'), 'responder al menú por redirección');
bloquea(guard('echo 1 | node tools/init.mjs'), 'responder al menú por tubería');
bloquea(guard('node tools/init.mjs -i'), 'abrir el menú interactivo');

// 3. guard · flags del usuario: en un proyecto de prueba en temp, sí; en uno de verdad, no
deja(guard(`node tools/init.mjs --stack node-api --path ${tmpProj} --tools claude --omitir-paso adoptar`), 'omitir-paso en un proyecto de prueba en temp');
deja(guard(`node tools/init.mjs --stack laravel --path "${tmpProj}" --permitir push`), 'permitir en un proyecto de prueba en temp (con comillas)');
bloquea(guard('node tools/init.mjs --stack laravel --path . --omitir-paso adoptar'), 'omitir-paso en el proyecto actual');
bloquea(guard('node tools/init.mjs --stack laravel --path D:/proyectos/app --permitir push'), 'permitir en un proyecto de verdad');
bloquea(guard('node tools/init.mjs --stack laravel --permitir push'), 'permitir sin --path (el directorio actual)');
bloquea(guard('node tools/init.mjs --path $HOME/app --apagar-hooks guard'), 'una ruta con variables no se da por temporal');
bloquea(guard(`node tools/init.mjs --path ${tmpProj} --permitir push && node tools/init.mjs --path . --permitir push`), 'una temporal y otra de verdad en el mismo comando');

// 4. depurar-coach · leer un test no es ejecutarlo
const coach = (cmd, salida) => hook('depurar-coach.mjs', { session_id: `fp-coach-${RUN}-${casos}`, tool_name: 'Bash', tool_input: { command: cmd }, tool_response: { stdout: salida } });
const avisa = r => /skill depurar/.test(r.stdout);
ok(!avisa(coach('sed -n 1,60p tools/test-tarjetas.mjs', "process.stdout.write(`FAIL ${n}`)")), 'deja: leer un archivo de test que contiene «FAIL»');
ok(!avisa(coach('cat tests/Feature/PagoTest.php', 'AssertionError esperado')), 'deja: cat de un test');
ok(!avisa(coach('git log --oneline -3', 'abc fix: test que fallaba con Error: x')), 'deja: git log con «Error:» en un mensaje');
ok(avisa(coach('node tools/test-arranque.mjs', 'FAIL bloquea: algo\nCasos: 3  Fallos: 1')), 'avisa: un script de test que falla');
ok(avisa(coach('npm test', 'Tests: 2 failed, 10 passed')), 'avisa: npm test que falla');
ok(avisa(coach('cd app && php artisan test', 'FAILED  Tests\\Feature\\PagoTest')), 'avisa: artisan test que falla');
ok(avisa(coach('powershell -NoProfile -File tools\\test-hooks.ps1', 'Casos: 43  Fallos: 2\nFAIL x')), 'avisa: suite de PowerShell que falla');
ok(!avisa(coach('npm test', 'Tests: 12 passed')), 'deja: npm test en verde');

// 5. code-hygiene · solo el código del proyecto
const hyg = file => hook('code-hygiene.mjs', { tool_name: 'Write', tool_input: { file_path: file, content: "console.log('depurando');\n" } });
deja(hyg(path.join(fuera, 'script.mjs')), 'console.log en un script de la carpeta temporal del agente');
bloquea(hyg(path.join(proj, 'src', 'app.ts')), 'console.log en el código del proyecto');
bloquea(hyg(path.resolve(path.parse(os.tmpdir()).root, 'monorepo', 'paquete-hermano', 'src', 'app.ts')), 'console.log en código de fuera del proyecto que no es temporal (monorepo)');

fs.rmSync(proj, { recursive: true, force: true });
fs.rmSync(fuera, { recursive: true, force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) { try { fs.rmSync(path.join(os.tmpdir(), f), { recursive: true, force: true }); } catch { } }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
