// Hook Stop: antes de que el agente termine, comprueba el cierre de la tarea.
// Si hay cambios de código sin commitear (git) y NO hay entrada de devlog de hoy, BLOQUEA la parada UNA vez por
// sesión pidiendo crear/actualizar el devlog (decision=block + reason). Si ya se bloqueó antes (stop_hook_active
// o marcador de sesión), deja parar y solo recuerda. Sin git o sin cambios: solo recordatorio si falta devlog.

import fs from 'node:fs';
import path from 'node:path';
import {
    readHookInput, projectRoot, planStatus, sessionFlag, projectFlag, testOnce, todayDevlog, devlogIndexed, hookConfig, gitBranch, gitDirty, todayStr, memoriaProyecto, seccionMd, tieneContenido, readText, ruta, rutaRel, logosSinRegistrar, localeUI, msg,
} from './lib.mjs';

const p = readHookInput();
// Recordatorio sin bloquear. Codex exige JSON en la salida del Stop (el texto plano es invalido); Claude
// muestra systemMessage al usuario. Mismo formato para los dos.
const recordar = texto => process.stdout.write(JSON.stringify({ systemMessage: texto }) + '\n');
const root = projectRoot();
const lang = localeUI(root);   // idioma de la UI (en por defecto); los avisos salen por msg(id, lang)
const DL = rutaRel(root, 'devlog'), PL = rutaRel(root, 'plan'), DS = rutaRel(root, 'design-system'), CV = rutaRel(root, 'conventions.md');   // rutas reales (senzu/ o antiguas)
const sid = p && p.session_id ? String(p.session_id) : 'default';
const plan = planStatus(root);
let planMsg = '';
if (plan.exists && plan.doing.length) planMsg = msg('stop.plan', lang, { pl: PL, doing: plan.doing.join('; ') });
// Si la sesión editó UI (marcador de front-skill-reminder), exigir la verificación con móvil primero (skill ui-verify).
let frontMsg = '';
if (fs.existsSync(sessionFlag(sid, 'frontedit'))) {
    frontMsg = msg('stop.front', lang);
}
const alreadyActive = !!(p && p.stop_hook_active === true);
// Código editado sin verificación posterior (flags por proyecto: edit-tracker vs verify-build).
let buildMsg = '';
const ceFlag = projectFlag(root, 'codeedit');
if (fs.existsSync(ceFlag)) {
    const vfFlag = projectFlag(root, 'verified');
    let stale = true;
    try { stale = !fs.existsSync(vfFlag) || fs.statSync(vfFlag).mtimeMs < fs.statSync(ceFlag).mtimeMs; } catch {}
    if (stale) {
        buildMsg = ' ' + msg('stop.verifyBuild', localeUI(root));
    }
}
// Guardia de assets: imágenes pesadas, fuentes sin woff2 y vídeos grandes añadidos en las últimas 24 h.
// Es la causa nº 1 de webs lentas. Solo avisa (va dentro del mensaje), no bloquea por sí sola.
function revisarAssets(base) {
    const dirs = ['public', 'static', 'assets', 'images', 'img', 'src/assets', 'src/images', 'resources/images', 'resources/img', 'resources/js/assets', 'wp-content/themes', 'wp-content/uploads'];
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    const avisos = [];
    const visitar = (d, prof) => {
        if (prof > 5 || avisos.length >= 8) return;
        let entradas = [];
        try { entradas = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
        for (const e of entradas) {
            const f = path.join(d, e.name);
            if (e.isDirectory()) { if (!/^(node_modules|vendor|build|dist|\.git|cache)$/i.test(e.name)) visitar(f, prof + 1); continue; }
            let st; try { st = fs.statSync(f); } catch { continue; }
            if (st.mtimeMs < limite) continue;
            const kb = Math.round(st.size / 1024), rel = path.relative(base, f).replace(/\\/g, '/');
            if (/\.(jpe?g|png|gif|webp|avif)$/i.test(e.name) && kb > 500) avisos.push(msg('stop.assetImg', lang, { rel, kb }));
            else if (/\.svg$/i.test(e.name) && kb > 150) avisos.push(msg('stop.assetSvg', lang, { rel, kb }));
            else if (/\.(ttf|otf)$/i.test(e.name)) avisos.push(msg('stop.assetFont', lang, { rel }));
            else if (/\.(mp4|mov|webm)$/i.test(e.name) && kb > 5 * 1024) avisos.push(msg('stop.assetVideo', lang, { rel, mb: Math.round(kb / 1024) }));
        }
    };
    for (const d of dirs) visitar(path.join(base, d), 0);
    return avisos.length ? msg('stop.assets', lang, { avisos: avisos.join('; ') }) : '';
}
planMsg += revisarAssets(root);

// Memoria del proyecto: si el devlog de hoy trae decisiones que devlog/MEMORIA.md (o su histórico) no recoge,
// se exige apuntarlas (bloquea una vez por sesión). Se mira el CONTENIDO, no la fecha de los archivos: una
// entrada está recogida si la memoria la cita ("ver 015", "dev-015", "#015") o menciona alguno de sus D-xxx.
// Así no salta cuando el agente apunta primero la memoria y escribe después la entrada.
let memMsg = '', memLarga = '';
{
    const dirDevlog = ruta(root, 'devlog');
    const dirHoy = path.join(dirDevlog, todayStr());
    const mem = memoriaProyecto(root);
    const textoMem = (readText(path.join(dirDevlog, 'MEMORIA.md')) || '') + '\n' + (readText(path.join(dirDevlog, 'MEMORIA-historico.md')) || '');
    const citadas = new Set();
    for (const m of textoMem.matchAll(/(?:\bver\b|\bentradas?\b|\bdevlog\b|\bdev-|#)\s*((?:\d{3,4}(?:\s*(?:,|y|e|\/)\s*)?)+)/gi)) {
        for (const n of m[1].match(/\d{3,4}/g) || []) citadas.add(String(parseInt(n, 10)));
    }
    const idsMem = new Set((textoMem.match(/\bD-\d{1,4}\b/g) || []).map(s => s.toUpperCase()));
    const recogida = (num, texto) => citadas.has(String(parseInt(num, 10))) || (texto.match(/\bD-\d{1,4}\b/g) || []).some(id => idsMem.has(id.toUpperCase()));
    const conDecision = [];
    for (const n of todayDevlog(root)) {
        const dec = seccionMd(readText(path.join(dirHoy, n)), 'Decisiones');
        const num = (/^(\d{3,4})/.exec(n) || [])[1];
        if (num && tieneContenido(dec) && !recogida(num, dec)) conDecision.push(num);
    }
    const fDec = path.join(dirHoy, 'DECISIONES.md');
    const txtDec = (readText(fDec) || '').replace(/^#\s.*$/gm, '');
    if (tieneContenido(txtDec)) {
        // DECISIONES.md: recogido si la memoria cita alguna de sus entradas (dev-NNN) o alguno de sus D-xxx
        const refs = (txtDec.match(/(?:dev-|#|devlog\s*|ver\s+)(\d{3,4})\b/gi) || []).map(r => r.match(/\d{3,4}/)[0]);
        if (!refs.some(r => recogida(r, '')) && !recogida('-1', txtDec)) conDecision.push('DECISIONES.md');
    }
    if (conDecision.length) {
        memMsg = msg('stop.mem', lang, { dec: conDecision.join(', '), dl: DL });
    }
    if (mem.existe && mem.lineas.length > 60) {
        memLarga = msg('stop.memLong', lang, { dl: DL, lineas: mem.lineas.length });
    }
}

const today = todayDevlog(root);
if (today.length) {
    const notIdx = today.filter(n => !devlogIndexed(root, n));
    let extra = '';
    if (notIdx.length) extra = msg('stop.notIndexed', lang, { dl: DL, notidx: notIdx.join(', ') });
    const cfg = hookConfig(root);
    if (cfg && cfg.commands && gitBranch(root) && gitDirty(root) > 0) {
        extra += msg('stop.uncommitted', lang);
    }
    extra += memLarga;
    const bloqueaUi = (frontMsg || buildMsg) && !alreadyActive && testOnce(sid, 'stop-ui');
    const bloqueaMem = memMsg && !alreadyActive && testOnce(sid, 'stop-memoria');
    const sinRegistrar = logosSinRegistrar(root);
    if (sinRegistrar.length) memMsg += msg('stop.logo', lang, { logos: sinRegistrar.map(l => l.maestro).join(', ') });
    const bloqueaLogos = sinRegistrar.length && !alreadyActive && testOnce(sid, 'stop-logos');
    if (bloqueaUi || bloqueaMem || bloqueaLogos) {
        process.stdout.write(JSON.stringify({ decision: 'block', reason: '[senzu]' + buildMsg + frontMsg + memMsg + planMsg + extra }) + '\n');
        process.exit(0);
    }
    if (planMsg || extra || frontMsg || buildMsg || memMsg) recordar(msg('stop.reminderPrefix', lang) + buildMsg + frontMsg + memMsg + planMsg + extra);
    process.exit(0);
}

let dirty = 0;
if (gitBranch(root)) dirty = gitDirty(root);
const date = todayStr();
const reason = msg('stop.noDevlog', lang, { dirty, dl: DL, date }) + buildMsg + frontMsg + planMsg;

if (dirty > 0 && !alreadyActive && testOnce(sid, 'stop-devlog')) {
    process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
    process.exit(0);
}
recordar(msg('stop.noDevlogReminder', lang, { dl: DL, date }) + buildMsg + frontMsg + planMsg);
process.exit(0);
