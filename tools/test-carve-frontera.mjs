#!/usr/bin/env node
// Frontera del núcleo (carve-out Hemispheric, F9-T1) — regla de dependencia que FALLA el build.
// Invariante: un hook de CEREBRO (motor + inyección/guarda de memoria, viaja a D:/hemispheric) nunca importa,
// ni directa ni transitivamente, un módulo EXCLUSIVO de método Senzu. Así el cerebro se puede sacar a su repo
// sin arrastrar el método. Dos gates más: todo .mjs de core/hooks tiene que estar clasificado (fail-on-uncovered,
// obliga a mantener la frontera al día) y el detector tiene que morder de verdad (autocomprobación).
// Mapa documentado en plan/carve-out-frontera.md. Sin LLM, sin red, determinista.
//   node tools/test-carve-frontera.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');

// --- La frontera (debe cuadrar con plan/carve-out-frontera.md) -------------------------------------------
const CEREBRO = ['hechos', 'recuerdo-vivo', 'session-start', 'estado-sesion', 'memoria-viva', 'memoria-archivo', 'hechos-guard'];
const BASE = ['lib', 'messages', 'session-end'];   // base común: el cerebro puede importarla; tampoco alcanza método
const SENZU = ['arquitectura-guard', 'arranque-guard', 'back-skill-reminder', 'backend-guard', 'cierre-limpio',
    'code-hygiene', 'conventions-guard', 'depurar-coach', 'edit-tracker', 'feature-guard', 'format-on-save',
    'front-skill-reminder', 'guard', 'pentest-guard', 'pool-guard', 'pre-compact', 'prompt-router',
    'protect-files', 'secret-patterns', 'secrets-guard', 'security-guard', 'stop-guard', 'supply-guard',
    'supply-scan', 'tarjeta-guard'];

const clase = n => CEREBRO.includes(n) ? 'CEREBRO' : BASE.includes(n) ? 'BASE' : SENZU.includes(n) ? 'SENZU' : '?';

// imports LOCALES de un contenido: import/export ... from '...', import('...'), import '...'
function importsLocales(contenido) {
    const specs = [];
    const re = /(?:import|export)\b[^'"\n]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(contenido))) specs.push(m[1] || m[2] || m[3]);
    return specs;
}
const baseNombre = spec => spec.replace(/^\.\//, '').replace(/\.(mjs|cjs|js)$/, '');

// cierre transitivo de imports locales desde un hook de cerebro; devuelve las violaciones encontradas
function violacionesDe(inicial) {
    const visto = new Set(), cola = [inicial], viol = [];
    while (cola.length) {
        const n = cola.shift();
        if (visto.has(n)) continue;
        visto.add(n);
        let cont = '';
        try { cont = fs.readFileSync(path.join(HOOKS, n + '.mjs'), 'utf8'); }
        catch { viol.push(`${n}: no existe el fichero`); continue; }
        for (const spec of importsLocales(cont)) {
            if (spec.startsWith('../')) { viol.push(`${n} importa ${spec} (sale de core/hooks)`); continue; }
            if (!spec.startsWith('./')) continue;   // builtin de node o paquete externo: no es la frontera
            const dep = baseNombre(spec), c = clase(dep);
            if (c === 'SENZU') viol.push(`${n} -> ${dep} (cerebro depende de método Senzu)`);
            else if (c === '?') viol.push(`${n} -> ${dep} (import sin clasificar en la frontera)`);
            else cola.push(dep);   // CEREBRO o BASE: seguir el rastro
        }
    }
    return viol;
}

let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };

// 1) fail-on-uncovered: cada .mjs de core/hooks está clasificado, y cada entrada del mapa existe
const enDisco = fs.readdirSync(HOOKS, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.mjs')).map(e => e.name.replace(/\.mjs$/, '')).sort();
for (const f of enDisco) ok(clase(f) !== '?', `clasificado: ${f}`, 'añádelo a CEREBRO/BASE/SENZU en plan/carve-out-frontera.md');
for (const n of [...CEREBRO, ...BASE, ...SENZU]) ok(enDisco.includes(n), `el mapa cita un fichero real: ${n}`, 'renombrado o borrado: actualiza la frontera');

// 2) autocomprobación: el detector ve de verdad un import de método Senzu (si no, el gate no mordería)
{
    const falso = "import { readHookInput } from './lib.mjs';\nimport { x } from './guard.mjs';";
    const deps = importsLocales(falso).filter(s => s.startsWith('./')).map(baseNombre);
    ok(deps.includes('guard') && clase('guard') === 'SENZU', 'autocomprobación: el detector marca un import de método', deps.join(','));
}

// 3) la regla dura: ningún hook de cerebro alcanza método Senzu (ni transitivamente)
for (const c of CEREBRO) {
    const v = violacionesDe(c);
    ok(v.length === 0, `frontera: ${c} no alcanza método Senzu`, v.join(' | '));
}

process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
