// Hook Stop y PreCompact: guarda EN QUÉ ESTÁBAMOS para la siguiente sesión (/retomar), y al cerrar comprueba que
// las reglas y correcciones del usuario de esta sesión (las detecta memoria-viva) quedaron apuntadas.
// El estado va a senzu/.estado/ultima-sesion.json (ignorado por git): las últimas peticiones, los archivos que
// tocó la sesión, lo que dejó sin commitear, la tarea en curso del plan y la última entrada del devlog.
// session-start lo cuenta al empezar la siguiente sesión.

import fs from 'node:fs';
import path from 'node:path';
import {
    readHookInput, projectRoot, sessionFlag, testOnce, editadosSesion, gitCambios, gitBranch, planStatus,
    devlogEntradas, readText, rutaEstado, memoriaProyecto, rutaMemoriaUsuario, ruta, rutaRel,
} from './lib.mjs';

const p = readHookInput() || {};
const root = projectRoot();
const sid = p.session_id ? String(p.session_id) : 'default';
const evento = p.hook_event_name || 'Stop';

// 1. estado de la sesión (solo si la sesión hizo algo)
let peticiones = [];
try { peticiones = JSON.parse(fs.readFileSync(sessionFlag(sid, 'peticiones'), 'utf8')); } catch {}
const editados = editadosSesion(sid);
if (peticiones.length || editados.length) {
    const cambios = gitCambios(root);
    const clave = r => (process.platform === 'win32' ? r.toLowerCase() : r);
    const mios = new Set(editados.map(clave));
    const ultima = devlogEntradas(root).pop();
    const titulo = ultima ? ((/^#\s+(.+)/m.exec(readText(ultima.archivo) || '') || [])[1] || ultima.num).trim() : null;
    const estado = {
        actualizado: new Date().toISOString(), sesion: sid, evento, rama: gitBranch(root) || null,
        peticiones: peticiones.slice(-3).map(x => x.texto),
        editados: editados.slice(-15),
        sinCommitear: cambios.filter(r => mios.has(clave(r))).slice(0, 15),
        ajenosSinCommitear: cambios.filter(r => !mios.has(clave(r))).length,
        planEnCurso: planStatus(root).doing,
        ultimaEntrada: titulo,
    };
    try { fs.writeFileSync(rutaEstado(root), JSON.stringify(estado, null, 2) + '\n'); } catch {}
}

// 2. al cerrar: ¿quedó apuntada la regla o corrección del usuario?
if (evento !== 'Stop') process.exit(0);
const marca = sessionFlag(sid, 'memoria-pendiente');
if (!fs.existsSync(marca)) process.exit(0);
let desde = 0; try { desde = fs.statSync(marca).mtimeMs; } catch {}
const mtime = f => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };
const apuntada = Math.max(memoriaProyecto(root).mtime, mtime(path.join(ruta(root, 'devlog'), 'MEMORIA-historico.md')), mtime(rutaMemoriaUsuario())) >= desde;
if (apuntada) process.exit(0);
const dijo = (() => { try { return fs.readFileSync(marca, 'utf8'); } catch { return ''; } })();
const razon = `[senzu] El usuario dio una regla o una corrección en esta sesión («${dijo.slice(0, 120)}») y no está en la memoria. `
    + `Apúntala: de este proyecto → ${rutaRel(root, 'devlog')}/MEMORIA.md; de todos sus proyectos → ${rutaMemoriaUsuario().replace(/\\/g, '/')}. `
    + 'Si no era una regla duradera, dilo en una línea y cierra.';
if (p.stop_hook_active !== true && testOnce(sid, 'stop-recordar')) process.stdout.write(JSON.stringify({ decision: 'block', reason: razon }) + '\n');
else process.stdout.write(JSON.stringify({ systemMessage: razon }) + '\n');
process.exit(0);
