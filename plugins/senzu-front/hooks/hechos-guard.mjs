// Hook de la memoria de hechos que OBLIGA a revisarla (plan de Hemispheric, F3), en cualquier idioma: no busca
// frases (eso depende del idioma); comprueba si el agente revisó la memoria. Quien entiende si el usuario dijo algo
// estable es el agente.
//   PostToolUse (Bash|PowerShell): `memoria.mjs --guardar | --olvidar | --nada` (sobre el comando SIN texto citado:
//      un echo que lo menciona no cuenta) → la sesión queda revisada; se apuntan los ids guardados.
//   PostToolUse (Edit|Write…): tocar MEMORIA.md o la memoria personal del usuario (lo que hace /recordar) → revisada.
//   Stop (F3-T2): con conversación real y sin revisión, bloquea una vez.

import fs from 'node:fs';
import path from 'node:path';
import { readHookInput, projectRoot, sessionFlag, sinTextoCitado, relDelProyecto, rutaNativa, ruta, rutaRel, rutaMemoriaUsuario, testOnce, rutaBuscador, editadosSesion } from './lib.mjs';
import { palabras, palabraConPeso, todosLosHechos } from './hechos.mjs';

const p = readHookInput() || {};
const sid = p.session_id ? String(p.session_id) : 'default';
const evento = String(p.hook_event_name || (p.tool_name ? 'PostToolUse' : 'Stop'));
const flag = sessionFlag(sid, 'memoria-revisada');
export const leerRevision = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return { revisada: false, guardados: [] }; } };
const marcar = (extra = {}) => {
    const r = leerRevision(flag);
    r.revisada = true; r.ultima = new Date().toISOString();
    r.guardados = [...new Set([...(r.guardados || []), ...(extra.guardados || [])])];
    if (extra.via) r.via = [...new Set([...(r.via || []), extra.via])];
    try { fs.writeFileSync(flag, JSON.stringify(r)); } catch { }
};

if (evento === 'PostToolUse') {
    const root = projectRoot();
    if (['Bash', 'PowerShell'].includes(p.tool_name)) {
        const cmd = sinTextoCitado(String((p.tool_input && p.tool_input.command) || ''));
        const m = /\bmemoria\.mjs\b[^|;&\n]*?--(guardar|olvidar|nada|resolver|abandonar|en-curso)\b/.exec(cmd);
        if (!m) process.exit(0);
        const r = p.tool_response || {};
        const salida = typeof r === 'string' ? r : [r.stdout, r.stderr, r.output].filter(Boolean).join('\n');
        // solo si funcionó: guardar → «Guardado…» o «Ya estaba…»; olvidar → «Olvidado…»; nada → «Revisado…»
        const funciono = { guardar: /^(Guardado|Ya estaba)/m, olvidar: /^Olvidado/m, nada: /^Revisado/m, resolver: /^Resuelto/m, abandonar: /^Abandonado/m, 'en-curso': /^En curso/m }[m[1]].test(salida);
        if (!funciono) process.exit(0);
        marcar({ guardados: m[1] === 'guardar' ? [...salida.matchAll(/\b(h-[0-9a-f]{8})\b/g)].map(x => x[1]) : [], via: m[1] });
        process.exit(0);
    }
    const file = p.tool_input && p.tool_input.file_path ? String(p.tool_input.file_path) : '';
    if (!file) process.exit(0);
    const memoriaProyecto = relDelProyecto(root, path.join(ruta(root, 'devlog'), 'MEMORIA.md'));
    const esMemoria = (relDelProyecto(root, file) || '').toLowerCase() === String(memoriaProyecto || '').toLowerCase()
        || rutaNativa(file).toLowerCase() === rutaNativa(rutaMemoriaUsuario()).toLowerCase();
    if (esMemoria) marcar({ via: 'memoria.md' });
    process.exit(0);
}

// ---------------- Stop: dos comprobaciones, cada una UNA vez por sesión, en un solo mensaje
const root = projectRoot();
const rev = leerRevision(flag);
const cli = rutaBuscador(root).replace(/buscar\.mjs$/, 'memoria.mjs');
const motivos = [];
// 1. Revisar: con conversación de verdad (sin mirar el idioma: 2+ mensajes del usuario con 2+ palabras con peso, que
//    apunta memoria-viva) y sin revisión. Sin ese registro no se inventa una conversación.
let peticiones = null;
try { peticiones = JSON.parse(fs.readFileSync(sessionFlag(sid, 'peticiones'), 'utf8')); } catch { }
const conversacion = Array.isArray(peticiones) && peticiones.filter(x => palabras(x && x.texto).filter(palabraConPeso).length >= 2).length >= 2;
if (conversacion && !rev.revisada && testOnce(sid, 'hechos-guard')) {
    motivos.push('Revisa la memoria (en el idioma en que haya hablado el usuario): ¿ha dicho en esta sesión algo ESTABLE de sí o '
        + 'del proyecto (dónde vive, su stack, una preferencia, un límite, un cliente, un objetivo o un pendiente)? '
        + `Si sí: node ${cli} --guardar --dimension familia.tema --valor "…" --claves "…" (familia: identidad, preferencia, proyecto, objetivo, pendiente, restriccion, nota o aprendizaje; tema en castellano, sea cual sea el idioma de la conversación; claves también en inglés y en su idioma; que se entienda solo: nombres y fechas absolutas, no «mañana» ni «él»; con «creo que…», --duda; lo que deduces tú y no dijo, --fuente agente). `
        + `Si no: node ${cli} --nada. Las decisiones y reglas del proyecto van a MEMORIA.md (/recordar). No inventes hechos que el usuario no dijo.`);
}
// 2. Consolidar (F6-T3): si la sesión TRABAJÓ (3+ archivos tocados, sin contar la memoria ni el plan) y no guardó ningún
//    aprendizaje.*, lo aprendido pasa a conocimiento duradero, enlazado solo con la entrada del devlog de hoy.
const PROPIA = new RegExp(`^(${[rutaRel(root, 'devlog'), rutaRel(root, 'plan'), rutaRel(root, 'memoria'), '\\.estado', 'senzu/\\.estado'].map(d => d.replace(/[.]/g, '\\.')).join('|')})/`, 'i');
const trabajo = editadosSesion(sid).filter(r => !PROPIA.test(String(r).replace(/\\/g, '/')));
const guardados = new Set(rev.guardados || []);
const aprendio = guardados.size && todosLosHechos(root).some(h => guardados.has(h.id) && /^aprendizaje(\.|$)/.test(h.dimension));
if (new Set(trabajo).size >= 3 && !aprendio && testOnce(sid, 'consolidar')) {
    motivos.push(`Consolida lo aprendido: esta sesión tocó ${new Set(trabajo).size} archivos. ¿Qué aprendiste que valga para la próxima vez `
        + '(una causa que encontraste, algo que no funcionó y por qué, cómo se hace algo en este proyecto)? Como mucho 3: '
        + `node ${cli} --guardar --dimension aprendizaje.<tema> --valor "…" --claves "…" (se enlaza solo con la entrada del devlog de hoy). `
        + `Si no hay nada que valga: node ${cli} --nada --motivo "sin aprendizajes".`);
}
if (!motivos.length) process.exit(0);
process.stdout.write(JSON.stringify({ decision: 'block', reason: '[senzu] Antes de cerrar:\n' + motivos.map((m, i) => `${i + 1}. ${m}`).join('\n') }) + '\n');
process.exit(0);
