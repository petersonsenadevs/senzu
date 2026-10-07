#!/usr/bin/env node
// Suite de la ARQUITECTURA DECLARADA (devlog 096): plantillas, el muro arquitectura-guard (capas, contextos de DDD,
// controlador sin ORM, DTO, carpetas), el script code-quality/scripts/arquitectura.mjs y la protección del sellado.
// Proyectos temporales de los tres stacks con sus mapas reales (PSR-4, alias de tsconfig, módulos de Python).
//   node tools/test-arquitectura.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const PLANT = path.join(ROOT, 'core', 'skills', 'code-quality', 'arquitectura');
const SCRIPT = path.join(ROOT, 'core', 'skills', 'code-quality', 'scripts', 'arquitectura.mjs');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const RUN = Date.now().toString(36);
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-arq-'));

// 0. plantillas: 3 estilos × 3 stacks, coherentes
const nombres = fs.readdirSync(PLANT).filter(f => f.endsWith('.json'));
ok(nombres.length === 9, '9 plantillas (3 estilos × 3 stacks)', nombres.join(', '));
for (const n of nombres) {
    const a = JSON.parse(fs.readFileSync(path.join(PLANT, n), 'utf8'));
    const capas = a.capas.map(c => c.nombre);
    ok(a.capas.every(c => [].concat(c.puede_usar).every(u => capas.includes(u))), `${n}: puede_usar solo nombra capas que existen`);
    let regexOk = true; try { new RegExp(a.controladores.orm); new RegExp(a.controladores.dto); } catch { regexOk = false; }
    ok(regexOk, `${n}: las regex del controlador compilan`);
    if (/hexagonal/.test(n)) ok(a.capas.find(c => c.nombre === 'dominio').puede_usar.length === 0 && a.capas.find(c => c.nombre === 'dominio').prohibido.length > 0, `${n}: el dominio no usa nada y prohíbe framework/ORM`);
    if (/^ddd/.test(n)) ok(a.contextos && a.contextos.rutas.length && a.contextos.publico.length, `${n}: declara contextos y su capa pública`);
}

function proyecto(nombre, plantilla, archivos = {}, marker = { stack: 'laravel' }) {
    const d = path.join(base, nombre);
    fs.mkdirSync(path.join(d, 'senzu', 'arquitectura'), { recursive: true });
    fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), JSON.stringify(marker));
    if (plantilla) fs.copyFileSync(path.join(PLANT, plantilla + '.json'), path.join(d, 'senzu', 'arquitectura', 'capas.json'));
    for (const [rel, txt] of Object.entries(archivos)) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), txt); }
    return d;
}
const hook = (d, rel, content, extra = {}) => spawnSync(process.execPath, [path.join(HOOKS, 'arquitectura-guard.mjs')], {
    input: JSON.stringify({ session_id: extra.sid || `arq-${RUN}-${casos}`, tool_name: extra.tool || 'Write', tool_input: extra.tool === 'Edit' ? { file_path: path.join(d, rel), old_string: extra.old, new_string: extra.new } : { file_path: path.join(d, rel), content } }),
    encoding: 'utf8', cwd: d, env: { ...process.env, CLAUDE_PROJECT_DIR: d },
});
const bloquea = (r, n, re) => ok(r.status === 2 && (!re || re.test(r.stderr)), `bloquea: ${n}`, `exit ${r.status} ${String(r.stderr).slice(0, 220)}`);
const deja = (r, n) => ok(r.status === 0, `deja: ${n}`, `exit ${r.status} ${String(r.stderr).slice(0, 220)}`);
const avisa = (r, n, re) => ok(r.status === 0 && re.test(r.stdout), `avisa: ${n}`, `exit ${r.status} ${String(r.stdout || r.stderr).slice(0, 220)}`);
const COMPOSER = JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'app/', 'Src\\': 'src/' } } });

// 1. Laravel hexagonal
const L = proyecto('laravel-hex', 'hexagonal.laravel', { 'composer.json': COMPOSER, 'app/Infrastructure/PedidoRepoEloquent.php': '<?php\n' });
bloquea(hook(L, 'app/Domain/Pedido.php', '<?php\nnamespace App\\Domain;\nuse Illuminate\\Support\\Facades\\DB;\nclass Pedido {}\n'), 'dominio usa el framework (Illuminate)', /no puede usar Illuminate/);
bloquea(hook(L, 'app/Domain/Pedido.php', '<?php\nnamespace App\\Domain;\nuse App\\Infrastructure\\PedidoRepoEloquent;\nclass Pedido {}\n'), 'dominio usa infraestructura', /«dominio» no puede usar la capa «infraestructura»/);
deja(hook(L, 'app/Application/CrearPedido.php', '<?php\nnamespace App\\Application;\nuse App\\Domain\\Pedido;\nuse App\\Domain\\PedidoRepositorio;\nclass CrearPedido {}\n'), 'aplicación usa el dominio (puerto)');
bloquea(hook(L, 'app/Application/CrearPedido.php', '<?php\nuse App\\Infrastructure\\PedidoRepoEloquent;\n'), 'aplicación usa un adaptador de infraestructura');
bloquea(hook(L, 'app/Application/CrearPedido.php', '<?php\nuse Illuminate\\Http\\Request;\n'), 'aplicación usa HTTP', /Illuminate\\Http/);
deja(hook(L, 'app/Infrastructure/PedidoRepoEloquent.php', '<?php\nuse App\\Domain\\Pedido;\nuse Illuminate\\Database\\Eloquent\\Model;\n'), 'infraestructura usa dominio y Eloquent');
deja(hook(L, 'app/Http/Controllers/PedidoController.php', '<?php\nuse App\\Application\\CrearPedido;\nclass PedidoController { public function store(CrearPedido $c) { return $c->ejecutar(); } }\n'), 'el controlador llama al caso de uso');
bloquea(hook(L, 'app/Http/Controllers/PedidoController.php', '<?php\nuse App\\Domain\\Pedido;\n'), 'la entrada usa el dominio por dentro');
bloquea(hook(L, 'app/Http/Controllers/PedidoController.php', '<?php\nclass PedidoController { public function index() { return Pedido::where("activo", 1)->get(); } }\n'), 'controlador gordo: consulta el ORM', /accede a la base de datos/);
avisa(hook(L, 'app/Http/Controllers/PedidoController.php', '<?php\nclass PedidoController { public function store(Req $request) { return $this->crear->ejecutar($request->validated()); } }\n'), 'el array validado sin DTO', /DTO/);
deja(hook(L, 'app/Domain/Pedido.php', '<?php\nuse App\\Infrastructure\\PedidoRepoEloquent; // senzu-allow: migración en curso, ver tarjeta AU-T3\n'), 'excepción puntual con senzu-allow');
fs.mkdirSync(path.join(L, 'app', 'Domain'), { recursive: true });
fs.writeFileSync(path.join(L, 'app', 'Domain', 'Legado.php'), '<?php\nuse App\\Infrastructure\\PedidoRepoEloquent;\nclass Legado { public $a = 1; }\n');
deja(hook(L, 'app/Domain/Legado.php', '', { tool: 'Edit', old: 'public $a = 1;', new: 'public $a = 2;' }), 'lo heredado no bloquea: solo lo que introduce el cambio');
fs.writeFileSync(path.join(L, 'app', 'Infrastructure', 'Otro.php'), '<?php\n');
bloquea(hook(L, 'app/Domain/Legado.php', '', { tool: 'Edit', old: 'class Legado', new: 'use App\\Infrastructure\\Otro;\nclass Legado' }), 'en un archivo heredado, un import prohibido NUEVO sí bloquea');
avisa(hook(L, 'app/Services/Calculadora.php', '<?php\nclass Calculadora {}\n'), 'código nuevo fuera de las carpetas declaradas', /no está en ninguna carpeta[\s\S]*dominio → app\/Domain/);
deja(hook(L, 'database/migrations/2026_x.php', '<?php\n'), 'excepciones de la plantilla (database/**)');
deja(hook(L, 'tests/Unit/PedidoTest.php', '<?php\nuse App\\Infrastructure\\PedidoRepoEloquent;\n'), 'los tests no se miran');
const sinArq = proyecto('sin-arquitectura', null, { 'composer.json': COMPOSER });
deja(hook(sinArq, 'app/Domain/Pedido.php', '<?php\nuse Illuminate\\Support\\Facades\\DB;\n'), 'sin capas.json no se impone nada');
const apagado = proyecto('apagado', 'hexagonal.laravel', { 'composer.json': COMPOSER }, { stack: 'laravel', hooksApagados: ['arquitectura-guard'] });
bloquea(hook(apagado, 'app/Domain/Pedido.php', '<?php\nuse Illuminate\\Support\\Facades\\DB;\n'), 'no se puede apagar en el marcador');

// 2. Laravel DDD: contextos
const D = proyecto('laravel-ddd', 'ddd-hexagonal.laravel', { 'composer.json': COMPOSER, 'src/Facturas/Domain/Factura.php': '<?php\n', 'src/Facturas/Application/EmitirFactura.php': '<?php\n', 'src/Shared/Domain/Dinero.php': '<?php\n' });
bloquea(hook(D, 'src/Pedidos/Domain/Pedido.php', '<?php\nuse Src\\Facturas\\Domain\\Factura;\n'), 'DDD: un contexto usa el dominio de otro', /contexto «Pedidos» usa por dentro el contexto «Facturas»/);
deja(hook(D, 'src/Pedidos/Application/CerrarPedido.php', '<?php\nuse Src\\Facturas\\Application\\EmitirFactura;\nuse Src\\Pedidos\\Domain\\Pedido;\n'), 'DDD: usa la capa pública (aplicación) del otro contexto');
deja(hook(D, 'src/Pedidos/Domain/Pedido.php', '<?php\nuse Src\\Shared\\Domain\\Dinero;\n'), 'DDD: el núcleo compartido (Shared) se puede usar');
bloquea(hook(D, 'src/Pedidos/Infrastructure/Repo.php', '<?php\nuse Src\\Facturas\\Domain\\Factura;\n'), 'DDD: infraestructura de un contexto usa el dominio de otro');

// 3. Laravel MVC con servicios
const M = proyecto('laravel-mvc', 'mvc-servicios.laravel', { 'composer.json': COMPOSER });
bloquea(hook(M, 'app/Http/Controllers/PedidoController.php', '<?php\nclass PedidoController { public function index() { return Pedido::where("a", 1)->paginate(); } }\n'), 'MVC: consulta en el controlador');
bloquea(hook(M, 'app/Http/Controllers/PedidoController.php', '<?php\nclass PedidoController { public function update(Pedido $pedido) { $pedido->update(["a" => 1]); } }\n'), 'MVC: actualizar el modelo desde el controlador');
deja(hook(M, 'app/Http/Controllers/PedidoController.php', '<?php\nclass PedidoController { public function update(Pedido $p, PedidoData $d) { $this->servicio->update($p, $d); return Carbon::create(2026); } }\n'), 'MVC: llamar al servicio (y Carbon::create no es el ORM)');
deja(hook(M, 'app/Services/PedidoServicio.php', '<?php\nuse App\\Models\\Pedido;\nuse App\\Data\\PedidoData;\n'), 'MVC: el servicio usa modelos y DTO');
bloquea(hook(M, 'app/Models/Pedido.php', '<?php\nuse App\\Services\\PedidoServicio;\n'), 'MVC: el modelo no usa servicios');

// 4. Node hexagonal y DDD
const NODE = { stack: 'node-api' };
const N = proyecto('node-hex', 'hexagonal.node', { 'tsconfig.json': '{ // alias\n "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }', 'src/infrastructure/db.ts': '' }, NODE);
bloquea(hook(N, 'src/domain/pedido.ts', 'import { PrismaClient } from "@prisma/client";\nexport class Pedido {}\n'), 'TS: el dominio usa Prisma', /@prisma\/client/);
bloquea(hook(N, 'src/domain/pedido.ts', 'import { db } from "../infrastructure/db";\n'), 'TS: el dominio usa infraestructura (import relativo)');
bloquea(hook(N, 'src/domain/pedido.ts', 'import { db } from "@/infrastructure/db";\n'), 'TS: el dominio usa infraestructura (alias @/ de tsconfig)');
deja(hook(N, 'src/application/crear-pedido.ts', 'import { Pedido } from "../domain/pedido";\nimport type { Repo } from "@/domain/repo";\n'), 'TS: aplicación usa el dominio');
bloquea(hook(N, 'src/application/crear-pedido.ts', 'import express from "express";\n'), 'TS: aplicación usa express');
bloquea(hook(N, 'src/http/pedidos.controller.ts', 'export async function listar() { return prisma.pedido.findMany(); }\n'), 'TS: controlador con Prisma');
deja(hook(N, 'src/domain/pedido.ts', 'import { z } from "zod";\nimport { randomUUID } from "node:crypto";\n'), 'TS: librerías que no son framework ni ORM');
const ND = proyecto('node-ddd', 'ddd-hexagonal.node', { 'src/modules/facturas/domain/factura.ts': '' }, NODE);
bloquea(hook(ND, 'src/modules/pedidos/domain/pedido.ts', 'import { Factura } from "../../facturas/domain/factura";\n'), 'TS DDD: un módulo usa el dominio de otro');

// 5. Python hexagonal
const PY = { stack: 'python-langgraph' };
const Y = proyecto('python-hex', 'hexagonal.python', { 'pyproject.toml': '', 'app/infrastructure/repo.py': '', 'app/domain/pedido.py': '' }, PY);
bloquea(hook(Y, 'app/domain/pedido.py', 'from sqlalchemy import Column\n\nclass Pedido: ...\n'), 'Python: el dominio usa SQLAlchemy');
bloquea(hook(Y, 'app/domain/pedido.py', 'from app.infrastructure.repo import RepoSQL\n'), 'Python: el dominio usa infraestructura');
deja(hook(Y, 'app/application/crear.py', 'from app.domain.pedido import Pedido\nfrom dataclasses import dataclass\n'), 'Python: aplicación usa el dominio');
bloquea(hook(Y, 'app/application/crear.py', 'from django.db import models\n'), 'Python: aplicación usa django.db');
bloquea(hook(Y, 'app/api/pedidos.py', 'def listar(db):\n    return db.query(Pedido).all()\n'), 'Python: router con consulta directa');

// 6. el script
const sh = (d, ...a) => spawnSync(process.execPath, [SCRIPT, ...a], { cwd: d, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: d } });
ok((sh(base, '--plantillas').stdout.match(/\n/g) || []).length === 9, 'script: lista las 9 plantillas');
ok(/"estilo": "hexagonal"/.test(sh(proyecto('det-hex', null, { 'composer.json': COMPOSER, 'app/Domain/a.php': '', 'app/Application/b.php': '', 'app/Infrastructure/c.php': '' }), '--detectar').stdout), 'script: detecta hexagonal');
ok(/"estilo": "ddd-hexagonal"/.test(sh(proyecto('det-ddd', null, { 'composer.json': COMPOSER, 'src/Pedidos/Domain/a.php': '', 'src/Pedidos/Application/b.php': '', 'src/Facturas/Domain/c.php': '', 'src/Facturas/Infrastructure/d.php': '' }), '--detectar').stdout), 'script: detecta DDD con varios contextos');
ok(/"estilo": "mvc-servicios"/.test(sh(proyecto('det-mvc', null, { 'composer.json': COMPOSER, 'app/Services/a.php': '' }), '--detectar').stdout), 'script: sin capas, MVC con servicios');
const E = proyecto('escribir', null, { 'composer.json': COMPOSER });
sh(E, '--plantilla', 'hexagonal', '--stack', 'laravel');
ok(fs.existsSync(path.join(E, 'senzu', 'arquitectura', 'capas.json')), 'script: --plantilla escribe capas.json');
const legado = proyecto('legado', 'hexagonal.laravel', { 'composer.json': COMPOSER, 'app/Infrastructure/Repo.php': '<?php\n',
    'app/Domain/Pedido.php': '<?php\nuse Illuminate\\Support\\Facades\\DB;\nuse App\\Infrastructure\\Repo;\n', 'app/Application/Ok.php': '<?php\nuse App\\Domain\\Pedido;\n' });
const comp = sh(legado, '--comprobar', '--json');
let j = {}; try { j = JSON.parse(comp.stdout); } catch { }
ok(comp.status === 1 && (j.infracciones || []).filter(i => i.tipo === 'bloquea').length === 2, 'script: --comprobar encuentra las 2 infracciones del proyecto heredado y sale con 1', comp.stdout.slice(0, 300));
ok(sh(L.replace('laravel-hex', 'laravel-mvc'), '--comprobar').status === 0, 'script: --comprobar en un proyecto limpio sale con 0');
sh(E, '--sellar');
ok(/senzu:inmutable/.test(fs.readFileSync(path.join(E, 'senzu', 'arquitectura', 'capas.json'), 'utf8')), 'script: --sellar la marca como inmutable');
ok(sh(E, '--plantilla', 'mvc-servicios', '--stack', 'laravel').status === 2, 'script: no reescribe una arquitectura sellada');

// 7. lo sellado no se toca: edición y terminal
const pf = rel => spawnSync(process.execPath, [path.join(HOOKS, 'protect-files.mjs')], { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: path.join(E, rel), old_string: 'a', new_string: 'b' } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: E } });
bloquea(pf('senzu/arquitectura/capas.json'), 'protect-files: capas.json sellado no se edita');
deja(spawnSync(process.execPath, [path.join(HOOKS, 'protect-files.mjs')], { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: path.join(L, 'senzu/arquitectura/capas.json'), old_string: 'a', new_string: 'b' } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: L } }), 'protect-files: sin sellar (aún se está ajustando) sí se edita');
const g = cmd => spawnSync(process.execPath, [path.join(HOOKS, 'guard.mjs')], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: cmd } }), encoding: 'utf8', cwd: E, env: { ...process.env, CLAUDE_PROJECT_DIR: E } });
bloquea(g("sed -i 's/dominio/x/' senzu/arquitectura/capas.json"), 'guard: sed -i sobre capas.json sellado');
deja(g('cat senzu/arquitectura/capas.json'), 'guard: leerla sí');

fs.rmSync(base, { recursive: true, force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) { try { fs.rmSync(path.join(os.tmpdir(), f), { force: true }); } catch { } }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
