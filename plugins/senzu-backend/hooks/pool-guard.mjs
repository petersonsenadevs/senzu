// Hook PreToolUse (Edit|Write|MultiEdit): avisa de lo que agota el POOL de conexiones a la base de datos y tumba
// la app en producción. No bloquea (hay casos legítimos): avisa una vez por archivo y sesión, con la skill.
// Solo en Node/TS y Python: en Laravel/PHP-FPM es una conexión por request y el framework lo gestiona casi solo.
//   1. Prisma sin singleton: `new PrismaClient()` sin guardarlo en globalThis. En serverless (Vercel/Lambda) abre
//      una conexión nueva por invocación hasta agotar el pool; en dev, el hot-reload acumula clientes.
//   2. Crear un pool/cliente/engine DENTRO de código por petición (rutas, controladores, endpoints, api): cada
//      request abre su propia conexión. El pool/engine se crea UNA vez al arrancar y se reutiliza.
// Apunta a code-quality references/database-design.md (§Conexiones y pool).

import crypto from 'node:crypto';
import fs from 'node:fs';
import {
    readHookInput, testIntroduced, projectRoot, relDelProyecto, testOnce, outHookJson,
} from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const ti = p.tool_input || {};
const file = String(ti.file_path || '').replace(/\\/g, '/');
if (!/\.(ts|tsx|js|jsx|mjs|cjs|py)$/i.test(file)) process.exit(0);               // PHP fuera: PHP-FPM lo lleva solo
if (/(^|\/)(vendor|node_modules|dist|build|\.next)\//i.test(file)) process.exit(0);
const root = projectRoot();
const rel = relDelProyecto(root, file) || file;

let antes = '';
try { antes = fs.readFileSync(file, 'utf8'); } catch {}
let despues = antes;
if (p.tool_name === 'Write') despues = String(ti.content || '');
else if (p.tool_name === 'Edit') despues = antes.replace(String(ti.old_string || ''), () => String(ti.new_string || ''));
else for (const e of [].concat(ti.edits || [])) despues = despues.replace(String(e.old_string || ''), () => String(e.new_string || ''));

const esPy = /\.py$/i.test(file);
const COD = { strings: false, almohadilla: esPy };
// Código por petición: el pool/cliente creado aquí se abre en CADA request (debería crearse una vez al arrancar).
const ENRUTADO = /(^|\/)(pages\/api|app\/api|api|routes?|routers?|controllers?|handlers?|endpoints?|resolvers?|views)(\/|\.)/i;

const avisos = [];
if (!esPy) {
    // 1. Prisma sin singleton (el clásico que tumba Next + Prisma en Vercel)
    const hitPrisma = testIntroduced(/\bnew\s+PrismaClient\s*\(/, despues, antes, COD);
    if (hitPrisma && !/global(This)?\b/.test(despues)) {
        avisos.push('creas `new PrismaClient()` sin guardarlo en un singleton global. En serverless (Vercel/Lambda) '
            + 'cada invocación abre una conexión nueva hasta agotar el pool, y en desarrollo el hot-reload acumula clientes. '
            + 'Expórtalo con el patrón singleton: `const prisma = globalThis.prisma ?? new PrismaClient(); if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;`');
    }
    // 2. Pool/cliente creado en código por petición
    if (ENRUTADO.test(rel)) {
        const hitPool = testIntroduced(/\b(new\s+Pool\s*\(|createPool\s*\(|new\s+pg\.Client\s*\(|createConnection\s*\(|new\s+MongoClient\s*\(|mongoose\.connect\s*\(|new\s+Redis\s*\(|createClient\s*\()/, despues, antes, COD);
        if (hitPool) avisos.push('creas un pool o cliente de conexión dentro de código que corre por petición (ruta/controlador/endpoint): '
            + 'cada request abriría su propia conexión y el pool se agota. Crea el pool/cliente UNA vez al arrancar (módulo compartido) '
            + 'y reutilízalo; ciérralo en el apagado (SIGTERM).');
    }
} else {
    // Python: engine/conexión creados en una vista/endpoint/router (en FastAPI el engine va en el arranque, no por request)
    if (ENRUTADO.test(rel)) {
        const hitPy = testIntroduced(/\b(create_async_engine\s*\(|create_engine\s*\(|psycopg2?\.connect\s*\(|asyncpg\.connect\s*\(|asyncpg\.create_pool\s*\(|MongoClient\s*\()/, despues, antes, COD);
        if (hitPy) avisos.push('creas el engine o una conexión dentro de una vista/endpoint: se abre una conexión por petición y el '
            + 'pool se agota. Crea el engine/pool UNA vez al arrancar (en FastAPI, en el `lifespan`) y reutiliza la sesión por request.');
    }
}

if (avisos.length && testOnce(p.session_id || 'default', 'pool-' + crypto.createHash('md5').update(rel.toLowerCase()).digest('hex').slice(0, 10))) {
    outHookJson('PreToolUse', {
        additionalContext: `[senzu] AVISO de conexiones en ${rel}: ${avisos.join(' · ')} `
            + 'Dimensiona el pool (≤ max_connections / nº de instancias) y pon timeouts (code-quality references/database-design.md, §Conexiones y pool). '
            + 'Si es a propósito, sigue. Solo se avisa una vez por archivo y sesión.',
    });
}
process.exit(0);
