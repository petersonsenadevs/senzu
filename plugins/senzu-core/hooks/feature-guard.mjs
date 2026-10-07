// Hook de backend en dos eventos: que una feature no se dé por hecha a medias.
//   PostToolUse (Bash|PowerShell): apunta en la sesión si se ejecutó una migración y si se probó su rollback.
//   Stop: BLOQUEA el cierre (una vez por cada conjunto de archivos) si en esta sesión…
//     1. se tocó código de backend y NINGÚN test (la feature no demuestra que funciona);
//     2. se creó o tocó una migración y no se ejecutó, o no se probó su vuelta atrás (rollback / downgrade);
//     3. el código usa variables de entorno NUEVAS que no están en .env.example (el siguiente que instale no sabrá
//        que existen y fallará en producción).
// Qué es backend, test y migración: lib.mjs (esCodigoBackend, esTest, esMigracion). Mismo JSON en Claude y Codex.

import fs from 'node:fs';
import crypto from 'node:crypto';
import {
    readHookInput, projectRoot, sessionFlag, testOnce, editadosSesion, esCodigoBackend, esTest, esMigracion,
    lineasAnadidas, clavesDeEntorno, envEjemplo, readText, relDelProyecto,
} from './lib.mjs';

const p = readHookInput() || {};
const sid = p.session_id ? String(p.session_id) : 'default';
const evento = String(p.hook_event_name || (p.tool_name ? 'PostToolUse' : 'Stop'));

const MIGRA = /(\bartisan\s+migrate\b|\bprisma\s+migrate\s+(dev|deploy|reset)\b|\balembic\s+(upgrade|downgrade)\b|\bmanage\.py\s+migrate\b|\bknex\s+migrate:(latest|rollback|up|down)\b|\bsequelize(-cli)?\s+db:migrate\b|\btypeorm\s+migration:(run|revert)\b|\bdrizzle-kit\s+(migrate|push)\b|\b(npm|pnpm|yarn|bun)\s+(run\s+)?(db:)?migrat\w*|\brails\s+db:(migrate|rollback)\b|\bgoose\s+(up|down)\b)/i;
const VUELTA = /(\bmigrate:(rollback|refresh|reset|fresh)\b|\bprisma\s+migrate\s+reset\b|\balembic\s+downgrade\b|\bknex\s+migrate:(rollback|down)\b|\bdb:migrate:undo\b|\bmigration:revert\b|\bdb:rollback\b|\bgoose\s+down\b|\b(npm|pnpm|yarn|bun)\s+(run\s+)?(db:)?(migrate:)?(rollback|down)\w*)/i;
const flagMigra = sessionFlag(sid, 'migraciones');
const leerMigra = () => { try { return JSON.parse(fs.readFileSync(flagMigra, 'utf8')); } catch { return { ejecutada: false, vuelta: false }; } };

if (evento === 'PostToolUse') {
    if (!['Bash', 'PowerShell'].includes(p.tool_name)) process.exit(0);
    const cmd = String((p.tool_input && p.tool_input.command) || '');
    if (!MIGRA.test(cmd) && !VUELTA.test(cmd)) process.exit(0);
    const r = p.tool_response || {};
    const salida = typeof r === 'string' ? r : [r.stdout, r.stderr, r.output].filter(Boolean).join('\n');
    if (/(SQLSTATE|\bError\b|Exception|Traceback|failed|FAILED)/.test(salida) && !/\bNothing to (migrate|rollback)\b/i.test(salida)) process.exit(0);   // falló: no cuenta
    const m = leerMigra();
    if (MIGRA.test(cmd)) m.ejecutada = true;
    if (VUELTA.test(cmd)) { m.vuelta = true; m.ejecutada = true; }
    try { fs.writeFileSync(flagMigra, JSON.stringify(m)); } catch { }
    process.exit(0);
}

// ---------------- Stop
const root = projectRoot();
const editados = editadosSesion(sid).map(r => relDelProyecto(root, r) ?? r.replace(/\\/g, '/')).filter(r => fs.existsSync(`${root}/${r}`));
if (!editados.length) process.exit(0);
const huella = l => crypto.createHash('md5').update([...l].sort().join('|').toLowerCase()).digest('hex').slice(0, 10);
const lista = (l, n = 5) => l.slice(0, n).join(', ') + (l.length > n ? ` y ${l.length - n} más` : '');
const motivos = [];

// 1. Feature de backend sin test
const back = editados.filter(esCodigoBackend);
const tests = editados.filter(esTest);
if (back.length && !tests.length && testOnce(sid, 'feature-test-' + huella(back))) {
    motivos.push(`Has tocado código de backend (${lista(back)}) y ningún test. Una feature sin test no demuestra que funciona ni avisa cuando se rompa: `
        + 'escribe el test que la cubre (camino feliz + el error que más importa; code-quality, testing) y ejecútalo. '
        + 'Si de verdad no aplica (configuración, renombrado, código ya cubierto por un test existente), dilo en tu respuesta con el motivo.');
}

// 2. Migraciones sin ejecutar o sin probar la vuelta atrás
const migs = editados.filter(r => esMigracion(r) && !esTest(r));
if (migs.length) {
    const m = leerMigra();
    const sinDown = migs.every(r => /prisma\/|\.sql$/i.test(r));   // Prisma/Drizzle: migraciones SQL sin down
    const falta = !m.ejecutada ? 'no la has ejecutado' : (!m.vuelta && !sinDown ? 'no has probado su vuelta atrás' : '');
    if (falta && testOnce(sid, 'feature-migra-' + huella(migs.concat(falta)))) {   // el motivo en la clave: tras migrar, aún avisa del rollback
        motivos.push(`Has creado o tocado migraciones (${lista(migs)}) y ${falta}. Ejecútala en local (php artisan migrate, prisma migrate dev, alembic upgrade head…)`
            + (sinDown ? '' : ', prueba el rollback (migrate:rollback, alembic downgrade -1…) y vuelve a migrar')
            + ': así se ve antes de producción si rompe o si no se puede deshacer. Si aquí no hay base de datos, dilo en tu respuesta y deja el paso al usuario.');
    }
}

// 3. Variables de entorno nuevas sin documentar en .env.example
const sinDoc = new Map();   // clave -> .env.example que debería tenerla (o null si no hay)
for (const r of editados.filter(r => (esCodigoBackend(r) || /(^|\/)config\//.test(r)) && !esTest(r))) {
    const claves = clavesDeEntorno(lineasAnadidas(root, r));
    if (!claves.length) continue;
    const ej = envEjemplo(root, r);
    const txt = ej ? (readText(ej) || '') : '';
    for (const k of claves) if (!new RegExp(`^\\s*(export\\s+)?${k}\\s*=`, 'm').test(txt)) sinDoc.set(k, ej);
}
if (sinDoc.size && testOnce(sid, 'feature-env-' + huella([...sinDoc.keys()]))) {
    const ej = [...sinDoc.values()].find(Boolean);
    motivos.push(`El código usa variables de entorno nuevas que no están documentadas: ${[...sinDoc.keys()].join(', ')}. `
        + (ej ? `Añádelas a ${relDelProyecto(root, ej) || ej} con un valor de ejemplo (nunca el real)` : 'No hay .env.example: créalo con esas claves y valores de ejemplo (nunca los reales)')
        + ', y en Laravel léelas desde config/. Quien instale el proyecto (o el servidor de producción) no sabrá que existen y fallará.');
}

if (!motivos.length) process.exit(0);
const razon = '[senzu] Antes de dar la feature por hecha:\n' + motivos.map((m, i) => `${i + 1}. ${m}`).join('\n');
process.stdout.write(JSON.stringify({ decision: 'block', reason: razon }) + '\n');
process.exit(0);
