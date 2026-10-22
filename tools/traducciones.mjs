#!/usr/bin/env node
// Traducciones al inglés de skills y comandos PARA LA DOCUMENTACIÓN (la web y GitHub), no para el agente: viven en
// docs/en/skills/<skill>.md y docs/en/comandos/<comando>.md, fuera de las carpetas que se instalan, así que el agente
// sigue leyendo el original. Cada una lleva en su frontmatter `origen` (el archivo que traduce) y `huella` (sha256
// del original, LF, 12 caracteres): si el original cambia, la traducción queda «desfasada» y la web lo avisa.
//   node tools/traducciones.mjs                 estado: faltan, desfasadas, al día
//   node tools/traducciones.mjs --sellar a b    pone la huella actual del original en esas traducciones (o --sellar
//                                               todas): SOLO después de traducir o revisar contra el original
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS_SKILLS = ['core/skills', 'core/skills-plugin', 'core/skills-overlay', 'core/skills-vendor'];
const leer = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '');

export const huella = (texto) => crypto.createHash('sha256').update(texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n')).digest('hex').slice(0, 12);

/** Lo que debería estar traducido: cada skill del registro (su SKILL.md publicado) y cada comando. */
export function esperadas() {
    const reg = JSON.parse(leer('core/skills-registry.json'));
    const skills = reg.skills.map((s) => ({
        traduccion: `docs/en/skills/${s.name}.md`,
        origen: DIRS_SKILLS.map((d) => `${d}/${s.name}/SKILL.md`).find((f) => fs.existsSync(path.join(ROOT, f))),
    })).filter((x) => x.origen);
    const comandos = fs.readdirSync(path.join(ROOT, 'core/commands')).filter((f) => f.endsWith('.md'))
        .map((f) => ({ traduccion: `docs/en/comandos/${f}`, origen: `core/commands/${f}` }));
    return [...skills, ...comandos];
}

const campo = (texto, k) => (/^---\n([\s\S]*?)\n---/.exec(texto.replace(/\r\n?/g, '\n'))?.[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1] ?? '').trim();

export function estado() {
    return esperadas().map((e) => {
        if (!fs.existsSync(path.join(ROOT, e.traduccion))) return { ...e, estado: 'falta' };
        const t = leer(e.traduccion);
        return { ...e, estado: campo(t, 'huella') === huella(leer(e.origen)) ? 'al día' : 'desfasada' };
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const i = process.argv.indexOf('--sellar');
    if (i !== -1) {
        const pedidas = process.argv.slice(i + 1);
        const todas = pedidas.includes('todas');
        for (const e of esperadas()) {
            if (!fs.existsSync(path.join(ROOT, e.traduccion))) continue;
            if (!todas && !pedidas.some((p) => e.traduccion.endsWith(p) || e.traduccion.endsWith(`${p}.md`))) continue;
            const t = leer(e.traduccion).replace(/\r\n?/g, '\n');
            const m = /^---\n([\s\S]*?)\n---\n/.exec(t);
            if (!m) { console.error(`  ${e.traduccion}: sin frontmatter, no se sella`); process.exitCode = 1; continue; }
            const fm = m[1].split('\n').filter((l) => !/^(origen|huella):/.test(l));
            fm.push(`origen: ${e.origen}`, `huella: ${huella(leer(e.origen))}`);
            fs.writeFileSync(path.join(ROOT, e.traduccion), `---\n${fm.join('\n')}\n---\n${t.slice(m[0].length)}`);
            console.log(`  sellada ${e.traduccion}`);
        }
    } else {
        const est = estado();
        for (const k of ['falta', 'desfasada']) for (const e of est.filter((x) => x.estado === k)) console.log(`  ${k}: ${e.traduccion} (${e.origen})`);
        console.log(`Traducciones: ${est.filter((e) => e.estado === 'al día').length} al día, ${est.filter((e) => e.estado === 'desfasada').length} desfasadas, ${est.filter((e) => e.estado === 'falta').length} faltan (de ${est.length}).`);
    }
}
