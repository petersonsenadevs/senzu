// Hook PreToolUse (Edit|Write|MultiEdit; en Codex, apply_patch traducido por lib.mjs) sobre senzu/plan/PLAN.md:
// una tarjeta NO pasa a [done] sin demostrar que está bien y que cumple lo que se quería.
// Simula cómo quedaría PLAN.md tras la edición y, para cada tarjeta que pasa a [done], exige en su cuerpo:
//   - «Verificado:» con la evidencia (comando → resultado; o «no aplica: <motivo>»);
//   - «Cumple:» que diga cómo cumple el «Para qué:» de la tarjeta (el objetivo del usuario o el hallazgo
//     de la auditoría que resuelve), si la tarjeta lo tiene;
//   - «Devlog:» con la entrada de cierre, que tiene que existir.
// Vale igual para las tarjetas del plan y las que salen de una auditoría (/auditar).

import fs from 'node:fs';
import path from 'node:path';
import { readHookInput, projectRoot, ruta, readText } from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit'].includes(p.tool_name)) process.exit(0);
const ti = p.tool_input || {};
const file = ti.file_path ? String(ti.file_path) : '';
if (!file) process.exit(0);
const root = projectRoot();
const plan = path.join(ruta(root, 'plan'), 'PLAN.md');
if (path.resolve(root, file).toLowerCase() !== path.resolve(plan).toLowerCase()) process.exit(0);

// cómo queda el archivo después de la edición
const antes = (readText(plan) || '').replace(/\r\n/g, '\n');
let despues = antes;
const aplicar = (txt, viejo, nuevo, todas) => {
    viejo = String(viejo || '').replace(/\r\n/g, '\n'); nuevo = String(nuevo || '').replace(/\r\n/g, '\n');
    if (!viejo) return txt;
    return todas ? txt.split(viejo).join(nuevo) : txt.replace(viejo, () => nuevo);
};
if (p.tool_name === 'Write') despues = String(ti.content || '').replace(/\r\n/g, '\n');
else if (p.tool_name === 'Edit') despues = aplicar(antes, ti.old_string, ti.new_string, ti.replace_all);
else for (const e of [].concat(ti.edits || [])) despues = aplicar(despues, e.old_string, e.new_string, e.replace_all);

// tarjetas: «### ID · Título [S|M|L] [estado]» y su cuerpo hasta la siguiente cabecera
// id: mayúscula inicial + letras/números/./- (F1-T3a, X-T2 y variantes del planner como A-H01, A-H0608);
// espacio antes del separador para no partir el guion interno del id (ver planStatus en lib.mjs).
const CAB = /^###\s+([A-Z][\w.-]*?)\s+[·-]\s*(.+?)\s*\[(?:S|M|L)\]\s*\[(todo|doing|blocked|done)\]/;
function tarjetas(txt) {
    const out = {}; let actual = null;
    for (const l of txt.split('\n')) {
        const m = CAB.exec(l);
        if (m) { actual = { id: m[1], titulo: m[2], estado: m[3], cuerpo: [] }; out[m[1]] = actual; continue; }
        if (/^#{1,3}\s/.test(l)) { actual = null; continue; }
        if (actual) actual.cuerpo.push(l);
    }
    return out;
}
const previas = tarjetas(antes), nuevas = tarjetas(despues);
const campo = (t, nombre) => {
    const l = t.cuerpo.find(x => new RegExp(`^\\s*[-*]\\s*${nombre}\\s*:`, 'i').test(x));
    if (!l) return null;
    const v = l.replace(new RegExp(`^\\s*[-*]\\s*${nombre}\\s*:\\s*`, 'i'), '').trim();
    return /^(—|-|…|\.\.\.|<.*>|pendiente|tbd)?$/i.test(v) || /se rellena al cerrar/i.test(v) ? '' : v;
};

const problemas = [];
for (const t of Object.values(nuevas)) {
    if (t.estado !== 'done' || (previas[t.id] && previas[t.id].estado === 'done')) continue;
    const falta = [];
    if (!campo(t, 'Verificado')) falta.push('«Verificado:» con la evidencia (comando → resultado real, o «no aplica: <motivo>»)');
    const paraQue = campo(t, 'Para qu[eé]');
    if (paraQue && !campo(t, 'Cumple')) falta.push(`«Cumple:» que diga cómo cumple su «Para qué» (${paraQue.slice(0, 80)})`);
    const devlog = campo(t, 'Devlog');
    if (!devlog) falta.push('«Devlog:» con la entrada de cierre');
    else {
        const r = (/`?([^`\s]+\.md)`?/.exec(devlog) || [])[1];
        if (r && !fs.existsSync(path.resolve(root, r))) falta.push(`«Devlog:» apunta a ${r}, que no existe: escribe antes la entrada`);
    }
    if (falta.length) problemas.push(`${t.id} · ${t.titulo}: falta ${falta.join('; ')}`);
}
if (!problemas.length) process.exit(0);
process.stderr.write(`[BLOQUEADO por Senzu] Una tarjeta no pasa a [done] sin demostrar que está bien y que cumple lo que se quería.\n`
    + problemas.map(x => `  - ${x}`).join('\n') + '\n'
    + 'Formato (en la tarjeta, antes de marcarla):\n'
    + '  - Verificado: php artisan test --filter=Pagos → 12 passed\n'
    + '  - Cumple: el webhook repetido ya no crea pedidos (era el «Para qué»: H-03 de la auditoría)\n'
    + '  - Devlog: senzu/devlog/2026-10-04/090-idempotencia-webhook.md\n'
    + 'Si la tarea no está terminada, déjala en [doing] y di qué falta; si no se puede hacer, [blocked] con el motivo.\n');
process.exit(2);
