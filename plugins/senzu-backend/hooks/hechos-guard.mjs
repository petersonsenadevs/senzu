// Hook de la memoria de hechos que OBLIGA a revisarla (plan de Hemispheric, F3), en cualquier idioma: no busca
// frases (eso depende del idioma); comprueba si el agente revisó la memoria. Quien entiende si el usuario dijo algo
// estable es el agente.
//   PostToolUse (Bash|PowerShell): `memoria.mjs --guardar | --olvidar | --nada` (sobre el comando SIN texto citado:
//      un echo que lo menciona no cuenta) → la sesión queda revisada; se apuntan los ids guardados.
//   PostToolUse (Edit|Write…): tocar MEMORIA.md o la memoria personal del usuario (lo que hace /recordar) → revisada.
//   Stop (F3-T2): con conversación real y sin revisión, bloquea una vez.

import fs from 'node:fs';
import path from 'node:path';
import { readHookInput, projectRoot, sessionFlag, sinTextoCitado, relDelProyecto, rutaNativa, ruta, rutaMemoriaUsuario, testOnce, rutaBuscador } from './lib.mjs';
import { palabras, palabraConPeso } from './hechos.mjs';

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

// ---------------- Stop: con conversación de verdad y sin revisar la memoria, bloquea UNA vez
// «De verdad», sin mirar el idioma: 2+ mensajes del usuario con 2+ palabras con peso (los apunta memoria-viva).
// Sin ese registro (memoria-viva apagado) no bloquea: no se inventa una conversación.
if (leerRevision(flag).revisada) process.exit(0);
let peticiones = [];
try { peticiones = JSON.parse(fs.readFileSync(sessionFlag(sid, 'peticiones'), 'utf8')); } catch { process.exit(0); }
const sustantivas = peticiones.filter(x => palabras(x && x.texto).filter(palabraConPeso).length >= 2);
if (sustantivas.length < 2 || !testOnce(sid, 'hechos-guard')) process.exit(0);
const cli = rutaBuscador(projectRoot()).replace(/buscar\.mjs$/, 'memoria.mjs');
process.stdout.write(JSON.stringify({ decision: 'block', reason:
    '[senzu] Antes de cerrar, revisa la memoria (en el idioma en que haya hablado el usuario): ¿ha dicho en esta sesión algo ESTABLE de sí o '
    + 'del proyecto (dónde vive, su stack, una preferencia, un límite, un cliente, un objetivo o un pendiente)? '
    + `Si sí: node ${cli} --guardar --dimension familia.tema --valor "…" --claves "…" (claves también en inglés y en su idioma; con «creo que…», --duda). `
    + `Si no: node ${cli} --nada. Las decisiones y reglas del proyecto van a MEMORIA.md (/recordar). No inventes hechos que el usuario no dijo.` }) + '\n');
process.exit(0);
