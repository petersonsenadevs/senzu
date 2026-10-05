// Hook SessionStart: inyecta el estado del proyecto (stack, perfil de front, rama, cambios pendientes,
// design system, devlog de hoy, skills instaladas) y el protocolo de carga de skills. No bloquea.

import fs from 'node:fs';
import path from 'node:path';
import {
    readHookInput, projectRoot, getMarker, gitBranch, gitDirty, gitCambios, designSystemMaster, planStatus, todayDevlog, devlogNextNumber, hookConfig, outHookJson, todayStr, pad3, detectVersions, eolWarnings, projectMaturity, bloqueMemoria, proximosPasos, ruta, rutaRel, textoLogos, logosSinRegistrar, bloqueMemoriaUsuario, revisarMemoria, leerUltimaSesion, ramaProtegida, siguientePaso,
} from './lib.mjs';

const p = readHookInput() || {};
const root = projectRoot();
const DL = rutaRel(root, 'devlog'), PL = rutaRel(root, 'plan'), DS = rutaRel(root, 'design-system'), CV = rutaRel(root, 'conventions.md');   // rutas reales (senzu/ o antiguas)
const marker = getMarker(root);
const L = [];
L.push('[senzu] Estado del proyecto al iniciar la sesion:');
L.push('- Idioma: responde en castellano (o en el idioma en que te escriba el usuario), también en un proyecto vacío. Y trabaja con el método de Senzu, no a tu manera: skills, comandos y muros se apoyan entre sí.');
// El paso del método que falta va lo primero: es lo que el usuario tiene que ver antes de nada (arranque-guard lo hace cumplir)
const paso = siguientePaso(root);
if (paso && paso.bloquea) {
    L.push(`- SIGUIENTE PASO DEL MÉTODO: ${paso.comando} — ${paso.motivo}. Propónselo al usuario ANTES de escribir código; el muro arranque-guard te parará la primera vez que lo intentes sin él.`);
} else if (paso && paso.conversar) {
    L.push(`- ${paso.motivo[0].toUpperCase() + paso.motivo.slice(1)}: no todo necesita un plan, pero tienes que saber qué se va a hacer. Si el usuario no te lo ha dicho claro, háblalo con él antes de programar (objetivo, alcance, qué entra y qué no); propón ${paso.comando} solo si es algo grande o él lo quiere.`);
}
if (marker) {
    L.push(`- Stack: ${marker.stack}` + (marker.frontProfile ? ` | Perfil de front: ${marker.frontProfile.label} (stacks del buscador: ${[].concat(marker.frontProfile.stacks || []).join(', ')})` : ''));
    const inst = [].concat(marker.extraSkills || []).concat([].concat(marker.bundles || []).map(b => `bundle:${b}`));
    if (inst.length) L.push(`- Skills/bundles opcionales instalados: ${inst.join(', ')}`);
} else {
    L.push('- Senzu no está instalado en este proyecto (no hay senzu/senzu.json): propón /instalar; mientras, detecta el stack (composer.json / package.json / pyproject.toml) antes de asumir nada.');
}
const mat = projectMaturity(root);
if (mat.existing && !mat.hasConventions) {
    L.push('- Proyecto EXISTENTE' + (mat.commits ? ` (${mat.commits} commits)` : '') + ': hay codigo previo con su propio estilo y SIN convenciones selladas. Antes de escribir codigo nuevo, propon /adoptar (analiza el estilo real y lo sella); mientras tanto imita el codigo vecino, no tu preferencia.'
        + (mat.ownGuide ? ' Lee CLAUDE.project.md (guia propia del proyecto: manda sobre lo generico).' : ''));
} else if (!mat.existing) {
    L.push('- Proyecto NUEVO/vacio: no asumas nada del usuario; si no sabes qué se va a hacer, pregúntaselo. Si es algo grande: '
        + (marker && marker.frontProfile ? '/brief (qué quiere, en llano: marca, referencias, objetivo) y después /plan' : '/plan (objetivo, alcance y tarjetas, con su OK); /brief es para proyectos con interfaz')
        + '; si quiere fijar convenciones desde el principio, /adoptar en modo entrevista.');
}
if (mat.ownDiary) {
    L.push(`- Diario propio del proyecto detectado (${mat.ownDiary}): antes de usar el devlog de Senzu, pregunta UNA vez al usuario que prefiere (su formato, devlog, o ambos) y respeta su decision el resto del proyecto.`);
}
const versions = detectVersions(root);
if (versions.length) {
    L.push(`- Versiones detectadas: ${versions.map(v => `${v.name} ${v.spec}`).join(', ')}. Aplica las practicas de ESAS versiones (code-quality references/stack-versions.md dice que cambia entre majors): no propongas API de una version que el proyecto no tiene.`);
    for (const w of eolWarnings(versions)) L.push(`- AVISO de soporte: ${w}.`);
}
if (fs.existsSync(ruta(root, 'conventions.md'))) {
    L.push(`- Convenciones ADOPTADAS del proyecto: ${rutaRel(root, 'conventions.md')} (INMUTABLES, ganan a tus preferencias; conventions.json las hace cumplir el hook conventions-guard). Leelas antes de escribir codigo.`);
}
const branch = gitBranch(root);
if (branch) {
    const dirty = gitDirty(root);
    const warn = ramaProtegida(root, branch) ? ' -> rama PRINCIPAL: ni commit ni push aqui; crea una rama primero.' : '';
    L.push(`- Git: rama '${branch}', ${dirty} archivo(s) con cambios sin commitear.${warn}`);
    // Al empezar, nada de lo que hay a medias es de esta sesión: puede ser de otro agente (Codex o Claude) o del
    // usuario. Se nombra para no trabajar a ciegas encima, ni commitearlo o descartarlo sin preguntar.
    if (dirty) {
        const cambios = gitCambios(root);
        L.push(`  A MEDIAS (no es trabajo de esta sesión: otro agente o el usuario): ${cambios.slice(0, 10).join(', ')}${cambios.length > 10 ? ` y ${cambios.length - 10} más` : ''}. Pregunta antes de tocarlos, commitearlos o descartarlos; si tu tarea toca esos archivos, dilo.`);
    }
}
const ds = designSystemMaster(root);
if (ds) L.push(`- Design system del proyecto: ${ds} (fuente de verdad de UI).`);
const logos = textoLogos(root); if (logos) L.push('- ' + logos);
const sinRegistrar = logosSinRegistrar(root);
if (sinRegistrar.length) L.push(`- Hay logo final sin registrar (${sinRegistrar.map(l => l.maestro).join(', ')}): anótalo en «Fijado» de gustos.md (con su ruta) y como decisión en la memoria del devlog, para que cualquier agente lo sepa.`);
else if (marker && marker.frontProfile) L.push(`- No hay ${DS}/*/MASTER.md: genera uno con ui-ux-pro-max antes de maquetar.`);
const plan = planStatus(root);
if (plan.exists && !plan.total) {
    L.push(`- ${PL}/PLAN.md es todavía la plantilla, sin tarjetas reales: el plan está por hacer (/plan).`);
} else if (plan.exists) {
    L.push(`- Plan del proyecto: ${PL}/PLAN.md (${plan.done}/${plan.total} tareas hechas).`
        + (plan.doing.length ? ` EN CURSO: ${plan.doing.join('; ')}.` : '')
        + (plan.next.length ? ` Siguientes: ${plan.next.join('; ')}.` : '')
        + ' Sigue el plan (skill project-planner, task-protocol) antes de hacer otra cosa.');
} else if (marker) {
    L.push(`- No hay ${PL}/PLAN.md: si la tarea es un proyecto o feature (no un arreglo puntual), usa la skill project-planner para crear el plan antes de codificar.`);
}
const today = todayDevlog(root);
const next = devlogNextNumber(root);
L.push(today.length
    ? `- Devlog de hoy: ${today.join(', ')} (siguiente numero global: ${pad3(next)})`
    : `- Devlog de hoy: ninguno todavia; la siguiente entrada es ${DL}/${todayStr()}/${pad3(next)}-<slug>.md (crea la entrada antes de cerrar la tarea o commitear).`);
const pasos = proximosPasos(root);
if (pasos) L.push(`- Donde se quedo la ultima entrada: ${pasos}`);
L.push(...bloqueMemoria(root));
L.push(...bloqueMemoriaUsuario());
for (const a of revisarMemoria(root)) L.push(`- Memoria: ${a}`);
// En qué se quedó la sesión anterior (estado-sesion): para seguir sin que el usuario tenga que contarlo
const ant = leerUltimaSesion(root);
const sidActual = p && p.session_id ? String(p.session_id) : '';
if (ant && ant.sesion !== sidActual) {
    const partes = [];
    if (ant.peticiones && ant.peticiones.length) partes.push(`pidió «${ant.peticiones.join('» → «')}»`);
    if (ant.editados && ant.editados.length) partes.push(`tocó ${ant.editados.slice(-8).join(', ')}`);
    if (ant.sinCommitear && ant.sinCommitear.length) partes.push(`DEJÓ SIN COMMITEAR ${ant.sinCommitear.join(', ')}`);
    if (ant.planEnCurso && ant.planEnCurso.length) partes.push(`tarea en curso: ${ant.planEnCurso.join('; ')}`);
    if (ant.ultimaEntrada) partes.push(`última entrada del devlog: ${ant.ultimaEntrada}`);
    if (partes.length) L.push(`- Sesión anterior (${String(ant.actualizado).slice(0, 16).replace('T', ' ')}): ${partes.join(' · ')}. Si el usuario dice «sigue» o /retomar, continúa desde ahí; si no, no lo menciones.`);
}
const cfg = hookConfig(root);
if (cfg && cfg.commands) {
    const cm = Object.entries(cfg.commands).map(([k, v]) => `${k}: ${v}`);
    if (cm.length) L.push('- Comandos del stack para verificar antes de dar algo por hecho: ' + cm.join(' | '));
}
L.push('- Puertas de entrada (empieza SIEMPRE por ellas): tarea de UI/front -> skill ui-ux-pro-max (via front-activation si dudas del stack); logica/backend -> code-quality (dominio rico: ddd-hexagonal); proyecto o feature nueva -> project-planner; duda general -> skill-router y su references/decision-trees.md.');
L.push("- Protocolo: lee UNA skill por tarea y solo su seccion de 'Lectura minima'; SKILL.upstream.md y references/ por secciones, nunca enteros.");
outHookJson('SessionStart', { additionalContext: L.join('\n') });
process.exit(0);
