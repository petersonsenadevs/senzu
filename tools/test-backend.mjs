#!/usr/bin/env node
// Suite de los muros de BACKEND para que una feature no falle (devlog 095):
//   backend-guard (PreToolUse): migración sin down(), asignación masiva, errores tragados y aviso de transacción.
//   feature-guard (Stop + PostToolUse Bash): feature sin test, migraciones sin ejecutar o sin rollback probado,
//   variables de entorno nuevas sin .env.example. Con proyectos temporales con git de verdad.
//   node tools/test-backend.mjs

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
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-backend-'));

function proyecto(nombre, archivos = {}) {
    const d = path.join(base, nombre);
    fs.mkdirSync(path.join(d, 'senzu'), { recursive: true });
    fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), '{"stack":"laravel"}');
    for (const [rel, txt] of Object.entries(archivos)) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), txt); }
    const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
    spawnSync('git', ['init', '-q', '-b', 'feat/x'], { cwd: d }); spawnSync('git', ['add', '-A'], { cwd: d }); spawnSync('git', ['commit', '-q', '-m', 'inicio'], { cwd: d, env });
    return d;
}
const hook = (nombre, d, entrada) => spawnSync(process.execPath, [path.join(HOOKS, nombre)], { input: JSON.stringify(entrada), encoding: 'utf8', cwd: d, env: { ...process.env, CLAUDE_PROJECT_DIR: d } });
const bg = (d, rel, content, extra = {}) => hook('backend-guard.mjs', d, { session_id: extra.sid || `bg-${RUN}`, tool_name: 'Write', tool_input: { file_path: path.join(d, rel), content } });
const bloquea = (r, n, re) => ok(r.status === 2 && (!re || re.test(r.stderr)), `bloquea: ${n}`, `exit ${r.status} ${String(r.stderr).slice(0, 160)}`);
const deja = (r, n) => ok(r.status === 0, `deja: ${n}`, `exit ${r.status} ${String(r.stderr).slice(0, 200)}`);

const P = proyecto('guard');
// ---- 4. migraciones sin vuelta atrás
const MIG = 'database/migrations/2026_10_07_000000_crear_pedidos.php';
const lar = down => `<?php\nreturn new class extends Migration {\n    public function up(): void { Schema::create('pedidos', function (Blueprint $t) { $t->id(); }); }\n${down}\n};\n`;
bloquea(bg(P, MIG, lar('')), 'Laravel: up() sin down()', /sin vuelta atrás[\s\S]*up\(\) sin down\(\)/);
bloquea(bg(P, MIG, lar('    public function down(): void { }')), 'Laravel: down() vacío', /down\(\) vacío/);
bloquea(bg(P, MIG, lar('    public function down(): void { /* ya veremos */ }')), 'Laravel: down() con solo un comentario');
deja(bg(P, MIG, lar("    public function down(): void { Schema::dropIfExists('pedidos'); }")), 'Laravel: down() que deshace el up()');
deja(bg(P, MIG, lar('    // senzu-allow: irreversible porque borra datos personales caducados (RGPD)\n    public function down(): void { }')), 'Laravel: irreversible a propósito con senzu-allow');
bloquea(bg(P, 'migrations/20261007_pedidos.js', "exports.up = knex => knex.schema.createTable('pedidos', t => t.increments());\n"), 'Knex: exports.up sin exports.down');
deja(bg(P, 'migrations/20261007_pedidos.js', "exports.up = knex => knex.schema.createTable('pedidos', t => t.increments());\nexports.down = knex => knex.schema.dropTable('pedidos');\n"), 'Knex: con exports.down');
bloquea(bg(P, 'migrations/20261007-pedidos.js', "module.exports = {\n  up: async (q, S) => { await q.createTable('pedidos', {}); },\n  down: async () => {},\n};\n"), 'Sequelize: down vacío');
bloquea(bg(P, 'alembic/versions/a1_pedidos.py', "def upgrade():\n    op.create_table('pedidos')\n\ndef downgrade():\n    pass\n"), 'Alembic: downgrade con solo pass');
deja(bg(P, 'alembic/versions/a1_pedidos.py', "def upgrade():\n    op.create_table('pedidos')\n\ndef downgrade():\n    op.drop_table('pedidos')\n"), 'Alembic: downgrade que deshace');
deja(bg(P, 'prisma/migrations/20261007_pedidos/migration.sql', 'CREATE TABLE "Pedido" (id SERIAL PRIMARY KEY);\n'), 'Prisma: SQL sin down por diseño');

// ---- 5. asignación masiva
bloquea(bg(P, 'app/Http/Controllers/PedidoController.php', "<?php\nclass PedidoController { public function store(Request $request) { return Pedido::create($request->all()); } }\n"), 'Laravel: create($request->all())', /Asignación masiva/);
bloquea(bg(P, 'app/Http/Controllers/PedidoController.php', "<?php\nclass PedidoController { public function update(Request $r, Pedido $p) { $p->update(request()->all()); } }\n"), 'Laravel: update(request()->all())');
deja(bg(P, 'app/Http/Controllers/PedidoController.php', "<?php\nclass PedidoController { public function store(StorePedido $request) { return Pedido::create($request->validated()); } }\n"), 'Laravel: create($request->validated())');
bloquea(bg(P, 'src/pedidos/pedidos.service.ts', 'export async function crear(req) { return prisma.pedido.create({ data: req.body }); }\n'), 'Prisma: create({ data: req.body })');
bloquea(bg(P, 'src/routes/pedidos.ts', 'router.post("/", async (req, res) => { Object.assign(pedido, req.body); });\n'), 'Express: Object.assign(x, req.body)');
deja(bg(P, 'src/pedidos/pedidos.service.ts', 'export async function crear(req) { const datos = PedidoSchema.parse(req.body); return prisma.pedido.create({ data: datos }); }\n'), 'Prisma con lo validado por zod');
bloquea(bg(P, 'app/services/pedidos.py', 'def crear(request):\n    return Pedido(**request.json())\n'), 'Python: Modelo(**request.json())');
deja(bg(P, 'app/Http/Controllers/PedidoController.php', "<?php\n// nunca Pedido::create($request->all())\nclass PedidoController {}\n"), 'citarlo en un comentario no es usarlo');

// ---- 6. errores tragados
bloquea(bg(P, 'src/pedidos/pedidos.service.ts', 'export async function pagar() { try { await cobrar(); } catch (e) {} }\n'), 'TS: catch vacío', /Error tragado/);
bloquea(bg(P, 'app/Services/Pago.php', "<?php\nclass Pago { public function cobrar() { try { $this->x(); } catch (\\Throwable $e) { } } }\n"), 'PHP: catch vacío');
bloquea(bg(P, 'app/services/pagos.py', 'def cobrar():\n    try:\n        x()\n    except Exception:\n        pass\n'), 'Python: except: pass');
bloquea(bg(P, 'internal/pagos/pagos.go', 'func Cobrar() { err := x(); if err != nil { } }\n'), 'Go: if err != nil {} vacío');
deja(bg(P, 'src/pedidos/pedidos.service.ts', 'export async function pagar() { try { await cobrar(); } catch (e) { logger.error({ e }, "cobro"); throw new PagoFallido(e); } }\n'), 'catch que registra y relanza');
deja(bg(P, 'src/pedidos/pedidos.service.ts', 'export function leer() { try { return x(); } catch { /* x */ } // senzu-allow: la caché es opcional\n}\n'), 'catch vacío justificado con senzu-allow');
deja(bg(P, 'tools/limpiar.mjs', 'try { fs.unlinkSync(f); } catch {}\n'), 'scripts de herramientas: no son backend de la app');

// ---- 7. aviso de transacción (no bloquea; una vez por archivo y sesión)
const dosEscrituras = "<?php\nclass Checkout {\n    public function pagar($u, $c) {\n        $pedido = Pedido::create(['user_id' => $u->id]);\n        $c->update(['estado' => 'pagado']);\n    }\n}\n";
const r1 = bg(P, 'app/Services/Checkout.php', dosEscrituras, { sid: `tx-${RUN}` });
ok(r1.status === 0 && /sin transacción/.test(r1.stdout), 'avisa: dos escrituras sin transacción', r1.stdout.slice(0, 200));
ok(!/sin transacción/.test(bg(P, 'app/Services/Checkout.php', dosEscrituras, { sid: `tx-${RUN}` }).stdout), 'el aviso sale una vez por archivo y sesión');
ok(!/sin transacción/.test(bg(P, 'app/Services/Checkout.php', dosEscrituras.replace('$pedido = ', 'DB::transaction(function () use ($u, $c) { $pedido = ').replace("'pagado']);", "'pagado']); });"), { sid: `tx2-${RUN}` }).stdout), 'con DB::transaction no avisa');
ok(!/sin transacción/.test(bg(P, 'app/Services/Checkout.php', "<?php\nclass C {\n    public function a() { Pedido::create([]); }\n    public function b() { Linea::create([]); }\n}\n", { sid: `tx3-${RUN}` }).stdout), 'una escritura por función no avisa');
ok(!/sin transacción/.test(bg(P, 'src/pedidos/pedidos.service.ts', 'export async function pagar(tx) { await tx.pedido.create({ data: d }); await tx.linea.create({ data: l }); }\n', { sid: `tx4-${RUN}` }).stdout), 'escrituras con tx. (ya dentro de una transacción) no avisa');

// ---- feature-guard (Stop)
const stop = (d, sid) => hook('feature-guard.mjs', d, { session_id: sid, hook_event_name: 'Stop' });
const bash = (d, sid, cmd, salida = 'ok') => hook('feature-guard.mjs', d, { session_id: sid, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: cmd }, tool_response: { stdout: salida } });
const toca = (d, sid, rel, txt) => {   // como el agente: escribe el archivo y edit-tracker lo apunta
    fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), txt);
    hook('edit-tracker.mjs', d, { session_id: sid, tool_name: 'Write', tool_input: { file_path: path.join(d, rel), content: txt } });
};
const bloqueo = r => { try { const j = JSON.parse(r.stdout); return j.decision === 'block' ? j.reason : ''; } catch { return ''; } };

// 1. feature sin test
const F = proyecto('feature', { '.env.example': 'APP_KEY=\n' });
let s = `f1-${RUN}`;
toca(F, s, 'app/Services/Pedidos.php', "<?php\nclass Pedidos { public function total() { return 1; } }\n");
ok(/ningún test/.test(bloqueo(stop(F, s))), 'Stop: backend sin test → bloquea');
ok(!bloqueo(stop(F, s)), 'Stop: el mismo conjunto no bloquea dos veces');
s = `f2-${RUN}`;
toca(F, s, 'app/Services/Pedidos.php', "<?php\nclass Pedidos { public function total() { return 2; } }\n");
toca(F, s, 'tests/Unit/PedidosTest.php', "<?php\nclass PedidosTest { public function test_total() {} }\n");
ok(!/ningún test/.test(bloqueo(stop(F, s))), 'Stop: backend con su test → no pide test');
s = `f3-${RUN}`;
toca(F, s, 'README.md', '# hola\n');
toca(F, s, 'resources/js/Boton.vue', '<template><b/></template>\n');
ok(!bloqueo(stop(F, s)), 'Stop: sin backend no pide nada');

// 2. migraciones
s = `m1-${RUN}`;
toca(F, s, 'database/migrations/2026_10_07_000001_x.php', lar("    public function down(): void { Schema::dropIfExists('x'); }"));
toca(F, s, 'tests/Feature/XTest.php', '<?php\n');
ok(/no la has ejecutado/.test(bloqueo(stop(F, s))), 'Stop: migración sin ejecutar → bloquea');
bash(F, s, 'php artisan migrate', '   INFO  Running migrations.\n  2026_10_07_000001_x ...... DONE');
ok(/no has probado su vuelta atrás/.test(bloqueo(stop(F, s))), 'Stop: migrada sin probar el rollback → bloquea (aunque ya avisara antes)');
bash(F, s, 'php artisan migrate:rollback && php artisan migrate', 'DONE');
ok(!/migraci/i.test(bloqueo(stop(F, s))), 'Stop: migrada y con rollback probado → nada');
s = `m2-${RUN}`;
toca(F, s, 'database/migrations/2026_10_07_000002_y.php', lar("    public function down(): void { Schema::dropIfExists('y'); }"));
toca(F, s, 'tests/Feature/YTest.php', '<?php\n');
bash(F, s, 'php artisan migrate', 'SQLSTATE[42S01]: Base table or view already exists');
ok(/no la has ejecutado/.test(bloqueo(stop(F, s))), 'Stop: una migración que FALLÓ no cuenta como ejecutada');
s = `m3-${RUN}`;
toca(F, s, 'prisma/migrations/20261007_z/migration.sql', 'CREATE TABLE z (id int);\n');
bash(F, s, 'npx prisma migrate dev', 'Your database is now in sync with your schema.');
ok(!/migraci/i.test(bloqueo(stop(F, s))), 'Stop: Prisma migrado (sin down por diseño) → nada');

// 3. variables de entorno sin .env.example
s = `e1-${RUN}`;
toca(F, s, 'config/services.php', "<?php\nreturn ['stripe' => ['key' => env('STRIPE_KEY'), 'app' => env('APP_KEY')]];\n");
let b = bloqueo(stop(F, s));
ok(/STRIPE_KEY/.test(b) && !/APP_KEY/.test(b) && /\.env\.example/.test(b), 'Stop: clave nueva sin .env.example → bloquea (la que ya está no)', b.slice(0, 200));
s = `e2-${RUN}`;
fs.appendFileSync(path.join(F, '.env.example'), 'STRIPE_KEY=sk_test_xxx\n');
toca(F, s, 'config/services.php', "<?php\nreturn ['stripe' => ['key' => env('STRIPE_KEY')]];\n");
ok(!/STRIPE_KEY/.test(bloqueo(stop(F, s))), 'Stop: con la clave en .env.example → nada');
const N = proyecto('node-sin-ejemplo');
s = `e3-${RUN}`;
toca(N, s, 'src/pagos/pagos.service.ts', 'export const url = process.env.PAYMENTS_URL; const modo = process.env.NODE_ENV;\n');
toca(N, s, 'src/pagos/pagos.service.test.ts', 'test("x", () => {});\n');
b = bloqueo(stop(N, s));
ok(/PAYMENTS_URL/.test(b) && !/NODE_ENV/.test(b) && /No hay \.env\.example/.test(b), 'Stop: sin .env.example pide crearlo (NODE_ENV no cuenta)', b.slice(0, 200));

// .env.example se puede editar (protect-files); .env no
const pf = rel => hook('protect-files.mjs', F, { tool_name: 'Edit', tool_input: { file_path: path.join(F, rel), old_string: 'a', new_string: 'b' } });
deja(pf('.env.example'), 'protect-files deja editar .env.example');
bloquea(pf('.env'), 'protect-files sigue protegiendo .env');
bloquea(pf('.env.production'), 'protect-files sigue protegiendo .env.production');

// ---- pool-guard (PreToolUse): avisa de lo que agota el pool de conexiones (no bloquea; una vez por archivo y sesión)
const pgd = (d, rel, content, sid) => hook('pool-guard.mjs', d, { session_id: sid, tool_name: 'Write', tool_input: { file_path: path.join(d, rel), content } });
const avisa = r => /AVISO de conexiones/.test(r.stdout || '');
ok(avisa(pgd(N, 'src/lib/prisma.ts', "import { PrismaClient } from '@prisma/client';\nexport const prisma = new PrismaClient();\n", `pg1-${RUN}`)), 'Prisma sin singleton global → avisa');
ok(!avisa(pgd(N, 'src/lib/prisma.ts', "import { PrismaClient } from '@prisma/client';\nconst prisma = globalThis.prisma ?? new PrismaClient();\nif (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;\nexport { prisma };\n", `pg2-${RUN}`)), 'Prisma con singleton globalThis → no avisa');
ok(avisa(pgd(N, 'src/routes/pedidos.ts', "import { Pool } from 'pg';\nrouter.get('/', (req, res) => { const pool = new Pool(); res.end(); });\n", `pg3-${RUN}`)), 'pool nuevo en una ruta → avisa');
ok(!avisa(pgd(N, 'src/lib/db.ts', "import { Pool } from 'pg';\nexport const pool = new Pool();\n", `pg4-${RUN}`)), 'pool en módulo compartido (no enrutado) → no avisa');
ok(avisa(pgd(N, 'app/api/users/route.ts', "import { Pool } from 'pg';\nexport async function GET() { const pool = new Pool(); return Response.json({}); }\n", `pg5-${RUN}`)), 'pool en app/api/route → avisa');
ok(avisa(pgd(N, 'app/routers/users.py', 'from sqlalchemy.ext.asyncio import create_async_engine\n@router.get("/")\ndef x():\n    engine = create_async_engine(url)\n    return engine\n', `pg6-${RUN}`)), 'Python create_async_engine en un router → avisa');
ok(!avisa(pgd(N, 'app/db.py', 'from sqlalchemy.ext.asyncio import create_async_engine\nengine = create_async_engine(url)\n', `pg7-${RUN}`)), 'Python engine en el arranque (no enrutado) → no avisa');
ok(!avisa(pgd(N, 'app/Http/Controllers/C.php', "<?php\nnew PrismaClient();\n", `pg8-${RUN}`)), 'PHP queda fuera del pool-guard (PHP-FPM lo lleva solo)');
const sidPG = `pg9-${RUN}`;
pgd(N, 'src/lib/prisma.ts', "import { PrismaClient } from '@prisma/client';\nexport const prisma = new PrismaClient();\n", sidPG);
ok(!avisa(pgd(N, 'src/lib/prisma.ts', "import { PrismaClient } from '@prisma/client';\nexport const prisma = new PrismaClient();\n", sidPG)), 'avisa una sola vez por archivo y sesión');

fs.rmSync(base, { recursive: true, force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) { try { fs.rmSync(path.join(os.tmpdir(), f), { force: true }); } catch { } }
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
