// Hook PreToolUse (Edit|Write|MultiEdit; en Codex, apply_patch traducido por lib.mjs): hace cumplir la
// ARQUITECTURA DECLARADA del proyecto (senzu/arquitectura/capas.json, la deja /adoptar o /plan). Sin ese archivo
// no hace nada: no se impone una arquitectura a quien no la ha elegido. Con él, sobre lo que INTRODUCE el cambio:
//   BLOQUEA  una capa que usa otra que no puede (el dominio usando infraestructura o el framework, la aplicación
//            usando HTTP o el ORM), un contexto de DDD que usa otro por dentro, y el controlador que habla con la
//            base de datos en vez de con el servicio o caso de uso.
//   AVISA    del controlador que pasa el array de la petición en vez de un DTO, y del código nuevo fuera de las
//            carpetas declaradas (con la carpeta donde iría). Una vez por archivo y sesión.
// Escape puntual: «senzu-allow» con el motivo en la línea. La lógica (imports por lenguaje, PSR-4, alias de
// tsconfig, módulos de Python) está en lib.mjs y la comparte code-quality/scripts/arquitectura.mjs --comprobar.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { readHookInput, projectRoot, relDelProyecto, leerArquitectura, infraccionesArquitectura, testOnce, outHookJson, rutaArquitectura } from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const ti = p.tool_input || {};
const file = String(ti.file_path || '');
if (!/\.(php|ts|tsx|js|jsx|mjs|cjs|py)$/i.test(file)) process.exit(0);
const root = projectRoot();
const rel = relDelProyecto(root, file);
if (!rel) process.exit(0);
const arq = leerArquitectura(root);
if (!arq) process.exit(0);

let antes = '', existe = true;
try { antes = fs.readFileSync(file, 'utf8'); } catch { existe = false; }
let despues = antes;
if (p.tool_name === 'Write') despues = String(ti.content || '');
else if (p.tool_name === 'Edit') despues = antes.replace(String(ti.old_string || ''), () => String(ti.new_string || ''));
else for (const e of [].concat(ti.edits || [])) despues = despues.replace(String(e.old_string || ''), () => String(e.new_string || ''));

const inf = infraccionesArquitectura(root, arq, rel, antes, despues, { nuevo: !existe });
const bloqueo = inf.find(i => i.tipo === 'bloquea');
const ARQ = relDelProyecto(root, rutaArquitectura(root)) || 'senzu/arquitectura/capas.json';
if (bloqueo) {
    process.stderr.write(`[BLOQUEADO por Senzu] Arquitectura del proyecto (${arq.estilo}, ${ARQ}): ${bloqueo.msg}.\n`
        + `Línea: '${bloqueo.linea}'\n`
        + 'Mueve la lógica a la capa que le toca (un puerto en el dominio o la aplicación y su adaptador en infraestructura; '
        + 'el controlador llama a un servicio o caso de uso). Si el usuario aprueba la excepción, «senzu-allow» con el motivo en esa línea, '
        + `o que él la añada a "excepciones" en ${ARQ}.\n`);
    process.exit(2);
}
const avisos = inf.filter(i => i.tipo === 'aviso');
const sid = p.session_id ? String(p.session_id) : 'default';
if (avisos.length && testOnce(sid, 'arq-' + crypto.createHash('md5').update(rel.toLowerCase()).digest('hex').slice(0, 10))) {
    outHookJson('PreToolUse', { additionalContext: `[senzu] Arquitectura del proyecto (${arq.estilo}): ` + avisos.map(a => a.msg).join(' · ') });
}
process.exit(0);
