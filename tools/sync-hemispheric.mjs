#!/usr/bin/env node
// Sincroniza el núcleo de memoria desde el repo CANÓNICO Hemispheric (F10-T4): Senzu "consume" Hemispheric, no lo
// edita a mano. Dirección ÚNICA: Hemispheric → Senzu. Edita el cerebro en D:/hemispheric, corre esto, y Senzu queda
// al día; el guard tools/test-sync-hemispheric.mjs rompe el build si divergen. Si Hemispheric no está presente, usa
// la copia vendorizada de Senzu (degrada sin romper). Sin red.
//   node tools/sync-hemispheric.mjs            copia lo que haya cambiado (Hemispheric → Senzu)
//   node tools/sync-hemispheric.mjs --check     no copia; sale 1 si hay deriva (lo usa el guard)
//   node tools/sync-hemispheric.mjs --repo <dir>  ruta del repo Hemispheric (por defecto ../hemispheric o $HEMISPHERIC_REPO)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null; };
const CHECK = args.includes('--check');
const REPO = path.resolve(opt('--repo') || process.env.HEMISPHERIC_REPO || path.join(ROOT, '..', 'hemispheric'));

// Mapa canónico: fichero en Hemispheric → su copia en Senzu. Son los 16 del cerebro (frontera F9-T1).
const NUCLEO = ['hechos', 'host', 'lib', 'messages', 'session-end', 'recuerdo-vivo', 'session-start', 'estado-sesion', 'memoria-viva', 'memoria-archivo', 'hechos-guard'];
const MAP = [
    ...NUCLEO.map(f => [`src/${f}.mjs`, `core/hooks/${f}.mjs`]),
    ['cli/memoria.mjs', 'core/skills/devlog/scripts/memoria.mjs'],
    ['cli/buscar.mjs', 'core/skills/devlog/scripts/buscar.mjs'],
    ['cli/memoria-check.mjs', 'core/skills/devlog/scripts/memoria-check.mjs'],
    ['cortex/cortex.mjs', 'core/skills/devlog/scripts/cortex.mjs'],
    ['cortex/cortex-textos.mjs', 'core/skills/devlog/scripts/cortex-textos.mjs'],
];

const out = s => process.stdout.write(s + '\n');

if (!fs.existsSync(path.join(REPO, 'src', 'hechos.mjs'))) {
    out(`Hemispheric no está en ${REPO}: Senzu usa su copia vendorizada del cerebro (no hay nada que sincronizar).`);
    process.exit(0);   // degrada sin romper (p. ej. un clon de dev-standards sin el repo hermano)
}

let derivados = 0, copiados = 0;
for (const [rel, dst] of MAP) {
    const a = path.join(REPO, rel), b = path.join(ROOT, dst);
    const srcTxt = fs.readFileSync(a, 'utf8');
    const dstTxt = fs.existsSync(b) ? fs.readFileSync(b, 'utf8') : null;
    if (srcTxt === dstTxt) continue;
    derivados++;
    if (CHECK) { out(`DERIVA: ${dst} ≠ ${rel}`); continue; }
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.writeFileSync(b, srcTxt);
    copiados++;
    out(`sync: ${rel} → ${dst}`);
}

if (CHECK) {
    out(derivados ? `\nHay ${derivados} fichero(s) con deriva. Corre: node tools/sync-hemispheric.mjs` : 'Sin deriva: Senzu y Hemispheric coinciden.');
    process.exit(derivados ? 1 : 0);
}
out(derivados ? `Sincronizados ${copiados} fichero(s) desde Hemispheric.` : 'Ya estaba todo al día (0 cambios).');
process.exit(0);
