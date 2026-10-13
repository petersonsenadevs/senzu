// Hook Stop: el agente no se va dejando archivos a medias.
// Compara lo que esta sesión ha tocado (lo apunta edit-tracker) con lo que git tiene sin commitear:
//  - Archivos TUYOS sin commitear -> BLOQUEA el cierre una vez: o terminas la tarea y la commiteas, o la
//    commiteas igualmente y dices qué falta (en la respuesta y en el devlog/plan). Siempre en una rama.
//  - Archivos que NO tocaste (de otro agente —Codex o Claude en otra sesión— o del usuario) -> solo AVISA:
//    no los commitees ni los descartes sin preguntar; menciónalos. Trabajar con dos agentes a la vez no debe
//    acabar con uno commiteando o borrando lo que el otro tiene a medias.
// Mismo formato JSON en Claude y Codex (decision/reason para bloquear, systemMessage para avisar).

import { readHookInput, projectRoot, gitCambios, gitBranch, editadosSesion, testOnce, permisosProyecto, ramaProtegida, localeUI, msg } from './lib.mjs';

const p = readHookInput() || {};
const root = projectRoot();
const lang = localeUI(root);
const cambios = gitCambios(root);
if (!cambios.length) process.exit(0);

const sid = p.session_id ? String(p.session_id) : 'default';
// Windows: rutas sin distinguir mayúsculas
const clave = r => (process.platform === 'win32' ? r.toLowerCase() : r);
const mios = new Set(editadosSesion(sid).map(clave));
const propios = cambios.filter(r => mios.has(clave(r)));
const ajenos = cambios.filter(r => !mios.has(clave(r)));
const lista = (l, n = 8) => l.slice(0, n).join(', ') + (l.length > n ? ` y ${l.length - n} más` : '');

const rama = gitBranch(root);
const protegida = ramaProtegida(root, rama) && !permisosProyecto(root).commitEnMain;
const avisoAjenos = ajenos.length ? msg('cierre.ajenos', lang, { n: ajenos.length, lista: lista(ajenos) }) : '';

if (propios.length) {
    const yaBloqueado = p.stop_hook_active === true || !testOnce(sid, 'cierre-limpio');
    const razon = msg('cierre.mine', lang, { n: propios.length, lista: lista(propios) })
        + msg('cierre.mineBody', lang)
        + (protegida ? msg('cierre.protegida', lang, { rama }) : '')
        + msg('cierre.mineTail', lang)
        + avisoAjenos;
    if (!yaBloqueado) process.stdout.write(JSON.stringify({ decision: 'block', reason: razon }) + '\n');
    else process.stdout.write(JSON.stringify({ systemMessage: razon }) + '\n');
    process.exit(0);
}
// Solo cambios ajenos: avisar una vez por sesión (no es tu trabajo, pero no lo pises)
if (ajenos.length && testOnce(sid, 'cierre-ajenos')) {
    process.stdout.write(JSON.stringify({ systemMessage: msg('cierre.ajenosSolo', lang, { n: ajenos.length, lista: lista(ajenos) }) }) + '\n');
}
process.exit(0);
