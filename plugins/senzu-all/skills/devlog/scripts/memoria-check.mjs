#!/usr/bin/env node
// Revisa la memoria del proyecto (senzu/devlog/MEMORIA.md) y avisa de lo que la estropea con el tiempo:
//   - más de 60 líneas (lo sustituido y lo cerrado va a MEMORIA-historico.md);
//   - «ver NNN» que no existe en el devlog; D-xxx repetidos; huecos en la numeración (aviso suave);
//   - pendientes con fecha «[desde AAAA-MM-DD]» abiertos hace más de N días (--dias, 7 por defecto);
//   - pendientes SIN fecha (no se puede saber si caducaron);
//   - rutas entre acentos graves que ya no existen en el proyecto.
// Ejecutar desde la RAÍZ del proyecto:  node <skills-dir>/devlog/scripts/memoria-check.mjs [--dias 7]
// Sale con 1 si hay algo que arreglar (0 si está sana).

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dias = parseInt(args[args.indexOf('--dias') + 1], 10) || 7;
const root = process.cwd();
const dl = ['senzu/devlog', 'devlog'].map(d => path.join(root, d)).find(d => fs.existsSync(d));
const out = s => process.stdout.write(s + '\n');
if (!dl) { out('[memoria] No hay devlog en este proyecto (senzu/devlog).'); process.exit(0); }
const memF = path.join(dl, 'MEMORIA.md');
if (!fs.existsSync(memF)) { out(`[memoria] No hay ${path.relative(root, memF)}: créala con la skill devlog (references/memoria.md).`); process.exit(1); }

const txt = fs.readFileSync(memF, 'utf8').replace(/^﻿/, '').replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '');
const lineas = txt.split('\n').filter(l => l.trim());
const avisos = [];
const cuerpo = lineas.filter(l => !/^#/.test(l.trim()));
if (cuerpo.length > 60) avisos.push(`tiene ${cuerpo.length} líneas (máximo 60): mueve lo sustituido y lo cerrado a MEMORIA-historico.md`);

const nums = new Set();
for (const d of fs.readdirSync(dl)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    for (const f of fs.readdirSync(path.join(dl, d))) { const m = /^(\d{3,})-/.exec(f); if (m) nums.add(m[1]); }
}
const rotas = [...new Set(lineas.flatMap(l => [...l.matchAll(/\bver\s+(\d{3,})\b/gi)].map(m => m[1])))].filter(n => !nums.has(n));
if (rotas.length) avisos.push(`cita entradas que no existen: ${rotas.map(n => 'ver ' + n).join(', ')}`);

const ids = lineas.map(l => (/^\s*[-*]\s+D-(\d+)\s*·/.exec(l) || [])[1]).filter(Boolean).map(Number);
const repes = [...new Set(ids.filter((d, i) => ids.indexOf(d) !== i))];
if (repes.length) avisos.push(`números de decisión repetidos: ${repes.map(n => 'D-' + String(n).padStart(3, '0')).join(', ')}`);

const pend = (/^##\s+Pendientes[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(txt) || [])[1] || '';
const hoy = Date.now();
const viejos = [], sinFecha = [];
for (const l of pend.split('\n').filter(x => /^\s*[-*]\s+\S/.test(x))) {
    const m = /\[desde (\d{4}-\d{2}-\d{2})\]/.exec(l);
    const corto = l.replace(/^\s*[-*]\s*/, '').replace(/\[desde [^\]]+\]\s*/, '').slice(0, 80);
    if (!m) { sinFecha.push(corto); continue; }
    const d = Math.floor((hoy - Date.parse(m[1] + 'T00:00:00')) / 864e5);
    if (d >= dias) viejos.push(`${corto} (${d} días)`);
}
if (viejos.length) avisos.push(`pendientes abiertos hace más de ${dias} días (¿siguen vigentes?): ${viejos.join(' · ')}`);
if (sinFecha.length) avisos.push(`pendientes sin fecha (escríbelos «- [desde AAAA-MM-DD] …»): ${sinFecha.join(' · ')}`);

const rutas = [...new Set(lineas.flatMap(l => [...l.matchAll(/`([\w./-]+\/[\w.-]+\.[a-z0-9]{1,5})`/gi)].map(m => m[1])))];
const perdidas = rutas.filter(r => !/[<>*]/.test(r) && !fs.existsSync(path.join(root, r)));
if (perdidas.length) avisos.push(`rutas que ya no existen en el proyecto: ${perdidas.join(', ')} (¿se movieron? actualiza la línea o pásala al histórico)`);

if (!avisos.length) { out(`[memoria] ${path.relative(root, memF)}: sana (${cuerpo.length} líneas, ${ids.length} decisiones).`); process.exit(0); }
out(`[memoria] ${path.relative(root, memF)}: ${avisos.length} aviso(s)`);
for (const a of avisos) out(`  - ${a}`);
process.exit(1);
