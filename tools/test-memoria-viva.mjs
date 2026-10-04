#!/usr/bin/env node
// Suite de la memoria «viva» (tanda 2, devlog 089) en un proyecto git temporal:
//   - memoria-viva: detecta reglas y correcciones del usuario (y no las frases normales) y guarda sus peticiones;
//   - estado-sesion: guarda en qué se quedó la sesión y bloquea el cierre una vez si la corrección no se apuntó;
//   - session-start: cuenta la sesión anterior, inyecta la memoria del usuario y los avisos de la memoria;
//   - memoria-archivo: lo que el devlog dice del archivo que se va a tocar, una vez por archivo;
//   - memoria-check: detecta lo que estropea la memoria con el tiempo;
//   - RECUERDO: preguntas en lenguaje natural (con erratas y sinónimos) y si el buscador devuelve la entrada correcta
//     entre las 3 primeras. «Casi perfecta» es un número: tiene que pasar del 90 %.
//   node tools/test-memoria-viva.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = path.join(ROOT, 'core', 'hooks');
const SCRIPTS = path.join(ROOT, 'core', 'skills', 'devlog', 'scripts');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };

const RUN = crypto.randomUUID();
const sesion = n => `mv-${RUN}-${n}`;
const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-memviva-'));
const memUsuario = path.join(proj, '..', `senzu-memusuario-${RUN}.md`);
const env = { ...process.env, CLAUDE_PROJECT_DIR: proj, SENZU_MEMORIA_USUARIO: memUsuario, SENZU_TEST_ISOLATED: '1' };
const g = (...a) => execFileSync('git', ['-C', proj, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const escribir = (rel, t) => { const f = path.join(proj, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); return f; };
const hook = (nombre, entrada) => {
    const r = spawnSync(process.execPath, [path.join(HOOKS, nombre)], { input: JSON.stringify(entrada), encoding: 'utf8', env });
    const t = (r.stdout || '').trim();
    try { return t ? JSON.parse(t) : null; } catch { return { crudo: t }; }
};
const contexto = r => (r && r.hookSpecificOutput && r.hookSpecificOutput.additionalContext) || '';
const hace = dias => new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);

// ---------------------------------------------------------------- proyecto de prueba
g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
const entrada = (num, fecha, titulo, cuerpo) => escribir(`senzu/devlog/${fecha}/${num}-${titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 24)}.md`, `# ${num} — ${titulo}\n\n- **Tipo:** feature\n\n${cuerpo}\n`);
entrada('001', '2026-08-01', 'Pagos con Stripe Checkout', '## Qué se hizo\n- `src/pagos/checkout.ts` crea la sesión de Checkout; nada de Elements.\n\n## Decisiones (resumen)\n- Checkout alojado (D-002).');
entrada('002', '2026-08-03', 'Correos por cola', '## Qué se hizo\n- `app/Mail/Pedido.php` sale por la cola de Horizon, nunca síncrono.');
entrada('003', '2026-08-05', 'Índice de la home', '## Qué se hizo\n- Ajustes en `src/index.ts` del arranque.');
escribir('senzu/devlog/MEMORIA.md', [
    '# Memoria del proyecto', '', '## Decisiones vigentes',
    '- D-002 · Pagos con Checkout alojado en `src/pagos/checkout.ts`, no Elements · ver 001',
    '- D-003 · Correos siempre por cola · ver 002', '',
    '## Pendientes abiertos',
    `- [desde ${hace(12)}] Textos legales del cliente`, `- [desde ${hace(1)}] Accesos al hosting`, '',
].join('\n'));
escribir('src/pagos/checkout.ts', 'export {}\n'); escribir('src/otro.ts', 'export {}\n'); escribir('src/index.ts', 'export {}\n');
escribir('.gitignore', 'node_modules\n');
g('add', '-A'); g('commit', '-q', '-m', 'init'); g('switch', '-q', '-c', 'feat/pagos');

// ---------------------------------------------------------------- memoria-viva
let r = hook('memoria-viva.mjs', { session_id: sesion('a'), prompt: 'No vuelvas a usar Stripe Elements, te lo dije' });
ok(/MEMORIA\.md/.test(contexto(r)) && contexto(r).includes(memUsuario.replace(/\\/g, '/')), 'una corrección («no vuelvas a…») pide apuntarla en la memoria del proyecto o la del usuario', contexto(r).slice(0, 160));
ok(hook('memoria-viva.mjs', { session_id: sesion('b'), prompt: '¿Siempre se despliega los viernes o nunca?' }) === null, 'una pregunta con «siempre» y «nunca» sueltos no cuenta como regla');
ok(contexto(hook('memoria-viva.mjs', { session_id: sesion('c'), prompt: 'a partir de ahora siempre usa pnpm' })).length > 0, '«a partir de ahora…» cuenta como regla');
ok(hook('memoria-viva.mjs', { session_id: sesion('c'), prompt: 'haz el formulario de contacto' }) === null, 'una petición normal: silencio');

// ---------------------------------------------------------------- estado-sesion: la corrección sin apuntar bloquea una vez
hook('edit-tracker.mjs', { session_id: sesion('a'), tool_name: 'Write', tool_input: { file_path: escribir('src/pagos/checkout.ts', 'export const v = 2\n') } });
r = hook('estado-sesion.mjs', { session_id: sesion('a'), hook_event_name: 'Stop' });
ok(r && r.decision === 'block' && /no está en la memoria/.test(r.reason), 'cerrar sin apuntar la corrección del usuario: bloquea', JSON.stringify(r));
r = hook('estado-sesion.mjs', { session_id: sesion('a'), hook_event_name: 'Stop', stop_hook_active: true });
ok(r && !r.decision, 'segundo intento: solo recuerda (sin bucles)', JSON.stringify(r));
// otra sesión con corrección que SÍ se apunta (en la memoria del usuario) -> no bloquea
hook('memoria-viva.mjs', { session_id: sesion('d'), prompt: 'nunca commitees con co-autor' });
await new Promise(res => setTimeout(res, 30));
fs.writeFileSync(memUsuario, '# Mi memoria\n- Commits sin Co-Authored-By.\n- Respuestas en castellano.\n');
r = hook('estado-sesion.mjs', { session_id: sesion('d'), hook_event_name: 'Stop' });
ok(!r || !r.decision, 'corrección apuntada en la memoria del usuario: no bloquea', JSON.stringify(r));

// ---------------------------------------------------------------- estado guardado y la siguiente sesión
const estadoF = path.join(proj, 'senzu', '.estado', 'ultima-sesion.json');
const estado = fs.existsSync(estadoF) ? JSON.parse(fs.readFileSync(estadoF, 'utf8')) : {};
ok(estado.peticiones && estado.peticiones.some(x => /Elements/.test(x)) || estado.sesion === sesion('d'), 'guarda las peticiones de la sesión', JSON.stringify(estado).slice(0, 200));
hook('estado-sesion.mjs', { session_id: sesion('a'), hook_event_name: 'PreCompact' });   // la sesión a vuelve a guardar su estado
const est2 = JSON.parse(fs.readFileSync(estadoF, 'utf8'));
ok(est2.sinCommitear.includes('src/pagos/checkout.ts') && est2.rama === 'feat/pagos', 'guarda lo que dejó sin commitear y la rama', JSON.stringify(est2));
ok(!g('status', '--porcelain').includes('.estado'), 'el estado no ensucia git (se ignora solo)', g('status', '--porcelain'));
let ss = contexto(hook('session-start.mjs', { session_id: sesion('nueva') }));
ok(/Sesión anterior/.test(ss) && /DEJÓ SIN COMMITEAR src\/pagos\/checkout\.ts/.test(ss) && /Elements/.test(ss), 'la siguiente sesión arranca sabiendo qué se pidió y qué quedó a medias', ss.split('\n').find(l => /Sesión anterior/.test(l)));
ok(!/Sesión anterior/.test(contexto(hook('session-start.mjs', { session_id: sesion('a') }))), 'la misma sesión no se cuenta a sí misma como «anterior»');
ok(/MEMORIA DEL USUARIO/.test(ss) && /Commits sin Co-Authored-By/.test(ss), 'inyecta la memoria del usuario (todos sus proyectos)');
ok(/Textos legales del cliente \(12 días\)/.test(ss) && !/Accesos al hosting/.test(ss.split('\n').find(l => /Pendientes abiertos hace tiempo/.test(l)) || ''), 'avisa del pendiente caducado (12 días) y no del reciente', ss.split('\n').find(l => /Pendientes/.test(l)));

// ---------------------------------------------------------------- memoria-archivo
r = hook('memoria-archivo.mjs', { session_id: sesion('e'), tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'src', 'pagos', 'checkout.ts') } });
ok(/D-002/.test(contexto(r)) && /Pagos con Stripe Checkout/.test(contexto(r)), 'al ir a tocar un archivo: la decisión de la memoria y la entrada del devlog que hablan de él', contexto(r));
ok(hook('memoria-archivo.mjs', { session_id: sesion('e'), tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'src', 'pagos', 'checkout.ts') } }) === null, 'una vez por archivo y sesión');
ok(hook('memoria-archivo.mjs', { session_id: sesion('e'), tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'src', 'otro.ts') } }) === null, 'archivo del que no se dice nada: silencio');
ok(/Índice de la home/.test(contexto(hook('memoria-archivo.mjs', { session_id: sesion('e'), tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'src', 'index.ts') } }))), 'nombre genérico (index.ts): solo por su ruta completa, y la encuentra');
ok(hook('memoria-archivo.mjs', { session_id: sesion('e'), tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'senzu', 'devlog', 'MEMORIA.md') } }) === null, 'editar la propia memoria no se comenta a sí mismo');

// ---------------------------------------------------------------- memoria-check
const check = () => spawnSync(process.execPath, [path.join(SCRIPTS, 'memoria-check.mjs')], { cwd: proj, encoding: 'utf8' });
let c = check();
ok(c.status === 1 && /hace más de 7 días/.test(c.stdout) && /Textos legales/.test(c.stdout), 'memoria-check: pendiente caducado', c.stdout);
escribir('senzu/devlog/MEMORIA.md', [
    '# Memoria', '## Decisiones vigentes', '- D-002 · Checkout · ver 001', '- D-002 · Repetida · ver 999', '- D-004 · Usa `src/ya-no-existe.ts` · ver 002',
    '## Pendientes abiertos', '- Algo sin fecha', ...Array.from({ length: 60 }, (_, i) => `- relleno ${i}`), '',
].join('\n'));
c = check();
ok(/ver 999/.test(c.stdout) && /D-002/.test(c.stdout) && /src\/ya-no-existe\.ts/.test(c.stdout) && /sin fecha/.test(c.stdout) && /máximo 60/.test(c.stdout), 'memoria-check: entrada inexistente, D repetido, ruta perdida, pendiente sin fecha y demasiado larga', c.stdout);
escribir('senzu/devlog/MEMORIA.md', '# Memoria\n## Decisiones vigentes\n- D-002 · Checkout en `src/pagos/checkout.ts` · ver 001\n## Pendientes abiertos\n');
c = check();
ok(c.status === 0 && /sana/.test(c.stdout), 'memoria-check: memoria sana sale con 0', c.stdout);

// ---------------------------------------------------------------- RECUERDO: ¿encuentra la entrada correcta?
const temas = [
    ['Autenticación con Sanctum', 'Login con Sanctum, verificación de email y throttle de 5 intentos. Passport descartado: no hay terceros.'],
    ['Webhook de Stripe duplicaba pedidos', 'El webhook llegaba dos veces; idempotencia por event.id en stripe_events.'],
    ['Cola de correos con Horizon', 'Los emails salen por la cola mail con Horizon y Redis; supervisor reinicia el worker.'],
    ['Rendimiento de la ficha de producto', 'N+1 en variantes; eager loading y caché de 10 minutos. LCP de 4,1 s a 1,6 s.'],
    ['Despliegue en Forge sin cortes', 'Zero-downtime con migrate --force y queue:restart en el script de deploy.'],
    ['Copias de seguridad diarias', 'spatie/laravel-backup a R2 cada noche; restauración probada.'],
    ['Recuperar contraseña', 'El enlace caducaba en un minuto; ahora 60.'],
    ['Buscador con Scout', 'Búsqueda de productos con Scout y filtros por categoría.'],
    ['Exportar pedidos a Excel', 'Exportación CSV/XLSX de pedidos con Laravel Excel en segundo plano.'],
    ['Subida de imágenes a R2', 'Las fotos de producto van a Cloudflare R2 con URLs firmadas.'],
    ['Multidioma español e inglés', 'Traducciones con archivos JSON y selector de idioma en la cabecera.'],
    ['Cupones de descuento', 'Cupones por porcentaje o importe fijo, con fecha de caducidad y un uso por cliente.'],
    ['Notificaciones push', 'Avisos al móvil con Firebase Cloud Messaging cuando cambia el estado del pedido.'],
    ['Panel de administración con Filament', 'Backoffice en Filament para pedidos, productos y clientes.'],
    ['Facturas en PDF', 'Generación de facturas en PDF con numeración correlativa por año.'],
    ['Límite de peticiones a la API', 'Rate limiting de 60 peticiones por minuto por token.'],
    ['Modo oscuro', 'Tema oscuro con tokens semánticos y preferencia del sistema.'],
    ['Cookies y consentimiento', 'Banner de cookies con Consent Mode v2 y analítica solo tras aceptar.'],
    ['Tests end to end con Playwright', 'Flujo de compra completo probado en Chromium y WebKit.'],
    ['Errores en producción con Sentry', 'Sentry captura excepciones con el usuario y la versión desplegada.'],
];
const recuerdo = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-recuerdo-'));
temas.forEach(([t, c2], i) => {
    const n = String(i + 1).padStart(3, '0');
    const f = path.join(recuerdo, 'senzu', 'devlog', `2026-09-${String(i + 1).padStart(2, '0')}`, `${n}-tema.md`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `# ${n} — ${t}\n\n- **Tipo:** feature\n\n## Qué se hizo\n- ${c2}\n`);
});
// preguntas como las haría alguien días después: otras palabras, erratas, sin acentos
const preguntas = [
    ['¿por qué usamos sanctum y no passport?', '001'], ['se duplicaban los pedidos por el webhok', '002'],
    ['los correos van sincronos?', '003'], ['la ficha de producto iba lenta', '004'], ['como desplegamos sin caidas', '005'],
    ['donde se guardan las copias de seguridad', '006'], ['el enlace para restablecer la contrasena', '007'],
    ['busqueda de productos', '008'], ['exportar pedidos a excel', '009'], ['donde se suben las fotos', '010'],
    ['traducciones al ingles', '011'], ['codigos de descuento caducados', '012'], ['avisos push al movil', '013'],
    ['backoffice de administracion', '014'], ['numeracion de las facturas', '015'], ['rate limit de la api', '016'],
    ['tema oscuro', '017'], ['consentimiento de cookies', '018'], ['pruebas e2e de la compra', '019'], ['errores en produccion', '020'],
];
let aciertos = 0; const fallidas = [];
for (const [q, esperada] of preguntas) {
    const b = spawnSync(process.execPath, [path.join(SCRIPTS, 'buscar.mjs'), q, '--json', '--max', '3'], { cwd: recuerdo, encoding: 'utf8' });
    let res = []; try { res = JSON.parse(b.stdout).resultados || []; } catch {}
    if (res.some(x => x.num === esperada)) aciertos++; else fallidas.push(`«${q}» → ${res.map(x => x.num).join(',') || 'nada'} (esperada ${esperada})`);
}
const tasa = aciertos / preguntas.length;
process.stdout.write(`  recuerdo: ${aciertos}/${preguntas.length} (${Math.round(tasa * 100)} %) entre las 3 primeras${fallidas.length ? ` · sin encontrar: ${fallidas.join(' | ')}` : ''}\n`);
ok(tasa >= 0.9, 'el buscador recuerda al menos el 90 % de las preguntas (entrada correcta entre las 3 primeras)', fallidas.join(' | '));

// ---------------------------------------------------------------- limpieza (repos temporales y marcas de esta ejecución)
for (const d of [proj, recuerdo]) fs.rmSync(d, { recursive: true, force: true });
fs.rmSync(memUsuario, { force: true });
for (const f of fs.readdirSync(os.tmpdir())) if (f.includes(RUN)) fs.rmSync(path.join(os.tmpdir(), f), { force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
