// Hook PreToolUse (Edit|Write|MultiEdit): muros de backend. Bloquea lo que se INTRODUCE (lo que ya estaba
// no cuenta) y admite el escape puntual 'senzu-allow' en la línea, con el motivo:
//   1. Migraciones destructivas en la parte "up" (borrar o renombrar columnas o tablas en un solo paso):
//      en producción se pierden datos o se rompe la app mientras se despliega. Patrón seguro: expandir → contraer.
//   2. env() de Laravel fuera de config/: con la configuración cacheada (producción) devuelve null.
//   3. Datos personales en logs: volcar la request entera, cuerpos de petición o contraseñas y tokens (RGPD).
//   4. Migración sin vuelta atrás: up() sin down() honesto (Laravel, Knex, Sequelize, TypeORM, Alembic).
//   5. Asignación masiva: guardar la request entera en el modelo (create($request->all()), req.body al ORM).
//   6. Errores tragados: catch vacío, except: pass, if err != nil {}.
//   7. (AVISO) Varias escrituras en la misma función sin transacción: si falla la segunda, queda a medias.
// Las reglas 5-7 solo en código de backend de la app (esCodigoBackend), no en scripts ni herramientas.

import fs from 'node:fs';
import crypto from 'node:crypto';
import {
    readHookInput, testIntroduced, soloCodigo, projectRoot, relDelProyecto, esCodigoBackend, esMigracion, testOnce, outHookJson, localeUI, msg,
} from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const ti = p.tool_input || {};
const file = String(ti.file_path || '').replace(/\\/g, '/');
if (!/\.(php|ts|js|mjs|cjs|py|sql|go|java|cs|rb)$/i.test(file)) process.exit(0);
if (/(^|\/)(vendor|node_modules)\//i.test(file)) process.exit(0);
const root = projectRoot();
const rel = relDelProyecto(root, file) || file;

// Contenido completo antes y después (para Edit se aplica el cambio sobre el archivo real)
let antes = '';
try { antes = fs.readFileSync(file, 'utf8'); } catch {}
let despues = antes;
if (p.tool_name === 'Write') despues = String(ti.content || '');
else if (p.tool_name === 'Edit') despues = antes.replace(String(ti.old_string || ''), () => String(ti.new_string || ''));
else for (const e of [].concat(ti.edits || [])) despues = despues.replace(String(e.old_string || ''), () => String(e.new_string || ''));

const lang = localeUI(root);
function bloquear(id, linea, vars) {
    process.stderr.write(msg('guard.prefix', lang) + ' ' + msg(id, lang, vars) + '\n'
        + msg('backend.lineLine', lang, { linea }) + '\n' + msg('backend.allowLine', lang) + '\n');
    process.exit(2);
}

// Se mira el CÓDIGO sin comentarios (citar «no usar env()» no lo usa); los strings se conservan: SQL crudo, env('X')
const COD = { strings: false, almohadilla: /\.(php|py|rb)$/i.test(file) };

// 1. Migraciones destructivas (solo la parte que se aplica al migrar)
if (esMigracion(rel) || /(database\/migrations|migrations|alembic\/versions|prisma\/migrations)\//i.test(file)) {
    const parteUp = t => t.split(/(function\s+down\s*\(|def\s+downgrade\s*\(|exports\.down\b|async\s+down\s*\(|public\s+async\s+down\s*\()/i)[0];
    const destructivo = /(->dropColumn\s*\(|->renameColumn\s*\(|Schema::(drop|dropIfExists|rename)\s*\(|->dropIfExists\s*\(|\bDROP\s+(TABLE|COLUMN)\b|\bRENAME\s+(COLUMN|TO)\b|op\.drop_(column|table)\s*\(|new_column_name\s*=|\.dropColumn\s*\(|\.dropTable\s*\(|\.renameColumn\s*\()/i;
    const hit = testIntroduced(destructivo, parteUp(despues), parteUp(antes), COD);
    if (hit) bloquear('backend.migDestructive', hit);

    // 4. Sin vuelta atrás: up() sin down() honesto. Solo si lo introduce este cambio (archivo nuevo o down que se vacía).
    const faltaDown = sinVueltaAtras(despues);
    if (faltaDown && !sinVueltaAtras(antes || 'x') && !/senzu-allow/i.test(despues)) {
        bloquear('backend.migNoDown', faltaDown, { faltaDown });
    }
}

// ¿A esta migración le falta el down()? Devuelve el motivo, o null si está bien o no es una migración con up/down
function sinVueltaAtras(txt) {
    if (!txt || /\.sql$/i.test(file) || /prisma\//i.test(file)) return null;   // SQL de Prisma/Drizzle: sin down por diseño
    const t = soloCodigo(txt, { strings: false, almohadilla: /\.(php|py|rb)$/i.test(file) });
    const cuerpo = (desde) => {   // cuerpo entre llaves a partir de la posición; null si es una expresión (=> algo)
        const flecha = t.slice(desde).match(/^[^{;]*?=>\s*(\S)/);
        if (flecha && flecha[1] !== '{') return 'expresión';
        const a = t.indexOf('{', desde); if (a < 0) return '';
        let prof = 0, i = a;
        for (; i < t.length; i++) { if (t[i] === '{') prof++; else if (t[i] === '}' && --prof === 0) break; }
        return t.slice(a + 1, i);
    };
    if (/\bdef\s+upgrade\s*\(/.test(t)) {   // Alembic
        const m = /\bdef\s+downgrade\s*\([^)]*\)[^:]*:([\s\S]*?)(?=\n\S|$)/.exec(t);
        if (!m) return 'def upgrade() sin def downgrade()';
        const b = m[1].replace(/("""|''')[\s\S]*?\1/g, '').trim();
        return (!b || /^pass$/.test(b)) ? 'downgrade() vacío (solo pass)' : null;
    }
    const up = /(function\s+up\s*\(|exports\.up\b|export\s+(async\s+)?function\s+up\b|\bup\s*:\s*(async\s*)?(function\s*)?\(|async\s+up\s*\()/.exec(t);
    if (!up) return null;
    const down = /(function\s+down\s*\(|exports\.down\b|export\s+(async\s+)?function\s+down\b|\bdown\s*:\s*(async\s*)?(function\s*)?\(|async\s+down\s*\()/.exec(t);
    if (!down) return 'up() sin down()';
    const b = cuerpo(down.index + down[0].length);
    if (b === 'expresión') return null;
    const limpio = b.replace(/\breturn\b\s*;?/g, '').replace(/[;\s]/g, '');
    return limpio ? null : 'down() vacío';
}

// 2. env() fuera de config/ (Laravel)
if (/\.php$/i.test(file) && !/(^|\/)config\//i.test(file)) {
    const hit = testIntroduced(/(?<![\w>$:])env\s*\(\s*['"]/, despues, antes, COD);
    if (hit) bloquear('backend.envOutsideConfig', hit);
}

// 3. Datos personales en logs
const pii = /((Log::\w+|logger\s*\(|->(info|debug|warning|error|notice)\s*\()[^\n]*\$request->(all|input)\s*\(\s*\)|(logger|log|console)\.(info|debug|warn|error|log)\s*\([^\n]*\breq\.(body|headers|query)\b|(logger|logging|log)\.\w+\s*\([^\n]*\brequest\.(json|body|form|headers|data)\b|(Log::\w+|logger\s*\(|\blog(ger)?\.\w+\s*\()[^\n]*(password|contrase[nñ]a|passwd|api[_-]?key|access[_-]?token|secret)\b)/i;
const hitPii = testIntroduced(pii, despues, antes, COD);
if (hitPii) bloquear('backend.pii', hitPii);

if (!esCodigoBackend(rel)) process.exit(0);

// 5. Asignación masiva: la request entera al modelo
const masiva = /((::|->)(create|update|fill|forceFill|forceCreate|updateOrCreate|firstOrCreate|firstOrNew|insert|upsert)\s*\(\s*(\$request->(all|input)\(\s*\)|request\(\)->all\(\s*\)|\$_(POST|REQUEST))|\.(create|update|insert|save|upsert|createMany|updateMany|insertOne|updateOne|findOneAndUpdate|findByIdAndUpdate|build|merge)\s*\(\s*(\{\s*data\s*:\s*)?(req|request|ctx\.request)\.body\s*[),}]|Object\.assign\(\s*[\w.]+\s*,\s*(req|request)\.body\s*\)|\w+\(\s*\*\*\s*(await\s+)?request\.(json\(\s*\)|data|POST|form|get_json\(\s*\)))/;
const hitMasiva = testIntroduced(masiva, despues, antes, COD);
if (hitMasiva) bloquear('backend.massAssign', hitMasiva);

// 6. Errores tragados
const tragado = /(catch\s*(\([^)]*\))?\s*\{\s*\}|\bexcept\b[^:\n]*:\s*pass\b|if\s+err\s*!=\s*nil\s*\{\s*\})/;
const hitTragado = testIntroduced(tragado, despues, antes, { strings: true, almohadilla: COD.almohadilla });
if (hitTragado) bloquear('backend.swallowed', hitTragado);

// 7. AVISO: varias escrituras en la misma función sin transacción
const ESCRIBE = /(->save\(|::create\(|->create\(|->update\(|->delete\(|::insert\(|->insert\(|::destroy\(|->attach\(|->detach\(|->sync\(|->increment\(|->decrement\(|::updateOrCreate\(|->forceDelete\(|\b(prisma|db|knex|em|manager|queryRunner|repo|repository|\w+Repo|\w+Repository|\w+Model|this\.\w+)(\.\w+)?\s*\.\s*(create|update|delete|insert|save|upsert|destroy|createMany|updateMany|deleteMany|insertOne|insertMany|updateOne|deleteOne|remove)\s*\(|\b[A-Z]\w*\.(create|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate)\s*\(|\.save\(\)|objects\.(create|bulk_create|update_or_create|get_or_create)\(|session\.(add|delete|merge)\()/g;
const TRANSACCION = /(DB::transaction|beginTransaction|\$transaction|\.transaction\s*\(|transaction\.atomic|@transaction|atomic\(|session\.begin|with_transaction|withTransaction|startTransaction|@Transactional|\bBEGIN\b|\btrx\b|\btx\s*\.)/i;
const nuevo = p.tool_name === 'Write' ? [despues] : p.tool_name === 'Edit' ? [String(ti.new_string || '')] : [].concat(ti.edits || []).map(e => String(e.new_string || ''));
const funciones = nuevo.flatMap(t => soloCodigo(t, { strings: true, almohadilla: COD.almohadilla })
    .split(/\n(?=[ \t]*(?:(?:public|private|protected|static|async|export|final)\s+)*(?:function\b|def\b|(?!(?:if|for|while|switch|catch|return|else|elseif)\b)[A-Za-z_]\w*\s*\([^)\n]*\)\s*(?::\s*[^{=\n]+)?\{))/));
const sinTx = funciones.find(f => (f.match(ESCRIBE) || []).length >= 2 && !TRANSACCION.test(f));
if (sinTx && testOnce(p.session_id || 'default', 'tx-' + crypto.createHash('md5').update(rel.toLowerCase()).digest('hex').slice(0, 10))) {
    const primera = (sinTx.split('\n').find(l => l.trim()) || '').trim().slice(0, 120);
    outHookJson('PreToolUse', {
        additionalContext: `[senzu] AVISO de backend en ${rel}: una función hace varias escrituras en la base de datos sin transacción (empieza por «${primera}»). `
            + 'Si falla la segunda, la primera queda hecha y los datos a medias. Si deben ir juntas, envuélvelas en una transacción '
            + '(DB::transaction, prisma.$transaction, transaction.atomic, session.begin) y lanza los eventos o correos DESPUÉS del commit. '
            + 'Si son independientes a propósito, sigue. Solo se avisa una vez por archivo y sesión.',
    });
    process.exit(0);
}

// 8. AVISO: consulta a la base de datos dentro de un bucle (N+1). Solo se mira lo que se INTRODUCE, en codigo
// de backend, y con senales de BD estrictas (DB::, Model::find/where, prisma.x.find, SELECT...FROM): un .find()
// o .map() sobre un array en memoria NO es una query, asi que no cuenta. Aviso una vez por archivo y sesion.
const nMas1 = nuevo.map(t => queryEnBucle(t)).find(Boolean);
if (nMas1 && testOnce(p.session_id || 'default', 'np1-' + crypto.createHash('md5').update(rel.toLowerCase()).digest('hex').slice(0, 10))) {
    outHookJson('PreToolUse', { additionalContext: msg('backend.nPlus1', lang, { rel, primera: nMas1 }) });
}
process.exit(0);

// Primera linea del bucle que hace una query dentro, o null. Lenguajes con llaves (PHP foreach, JS/TS for/of).
function queryEnBucle(txt) {
    if (!txt) return null;
    const t = soloCodigo(txt, { strings: true, almohadilla: COD.almohadilla });
    const QUERY = /(\bDB::(table|select|statement|raw)\b|\b[A-Z]\w*::(find|findOrFail|first|firstWhere|where|all|count|value|pluck)\s*\(|->firstWhere\s*\(|->firstOrFail\s*\(|\b(prisma|db)\.[A-Za-z_]\w*\.(find\w*|count|aggregate|groupBy)\s*\(|\bawait\s+[\w.]*(repo|repository|model|service|manager|em)\b[\w.]*\.(find\w*|get\w*|load\w*|query|count)\s*\(|\bSELECT\b[\s\S]{0,160}\bFROM\b)/;
    const loopHdr = /\b(for|foreach|while)\s*\(/g;
    let m;
    while ((m = loopHdr.exec(t))) {
        let i = m.index + m[0].length, depth = 1;          // saltar el (...) de la cabecera del bucle
        for (; i < t.length && depth > 0; i++) { if (t[i] === '(') depth++; else if (t[i] === ')') depth--; }
        const open = t.indexOf('{', i);
        let body;
        if (open >= 0 && /^\s*$/.test(t.slice(i, open))) {   // cuerpo con llaves justo tras la cabecera
            let d = 0, j = open;
            for (; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}' && --d === 0) break; }
            body = t.slice(open + 1, j);
        } else {
            body = t.slice(i, i + 200);                      // bucle de una linea sin llaves
        }
        if (QUERY.test(body)) {
            const linea = (t.slice(m.index).split('\n')[0] || '').trim().slice(0, 120);
            return linea;
        }
    }
    return null;
}
