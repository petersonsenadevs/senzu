#!/usr/bin/env node
// Arquitectura declarada del proyecto (senzu/arquitectura/capas.json): elegir, ver y comprobar.
//   node arquitectura.mjs --plantillas                         lista las plantillas (estilo × stack)
//   node arquitectura.mjs --detectar                           propone estilo y stack mirando las carpetas
//   node arquitectura.mjs --plantilla <estilo> --stack <s>     escribe senzu/arquitectura/capas.json (sin sellar)
//   node arquitectura.mjs --comprobar [--json]                 revisa TODO el proyecto (no solo lo nuevo)
//   node arquitectura.mjs --sellar                             la marca como inmutable (solo con el OK del usuario)
// --comprobar sale con código 1 si hay infracciones que bloquean (para /verificar y la CI). La misma lógica que el
// muro arquitectura-guard (lib.mjs de los hooks de Senzu).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PLANTILLAS = path.join(AQUI, '..', 'arquitectura');
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const root = path.resolve(opt('--path') || process.cwd());
const out = s => process.stdout.write(s + '\n');

// lib.mjs de los hooks: junto a la skill (plugin o .claude), o en el paquete de Senzu (marcador o SENZU_HOME)
async function cargarLib() {
    const marcador = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'senzu', 'senzu.json'), 'utf8')); } catch { return {}; } })();
    const candidatas = [path.join(AQUI, '..', '..', '..', 'hooks', 'lib.mjs'), path.join(root, '.claude', 'hooks', 'lib.mjs'),
        marcador.standardsRoot && path.join(marcador.standardsRoot, 'core', 'hooks', 'lib.mjs'), process.env.SENZU_HOME && path.join(process.env.SENZU_HOME, 'core', 'hooks', 'lib.mjs')].filter(Boolean);
    for (const c of candidatas) if (fs.existsSync(c)) return import(pathToFileURL(c).href);
    out('No encuentro lib.mjs de los hooks de Senzu (¿está instalado? /instalar). Rutas probadas: ' + candidatas.join(', '));
    process.exit(2);
}
const plantillas = () => fs.readdirSync(PLANTILLAS).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));

if (opt('--plantillas')) {
    for (const p of plantillas()) { const a = JSON.parse(fs.readFileSync(path.join(PLANTILLAS, p + '.json'), 'utf8')); out(`${p.padEnd(26)} ${a.descripcion}`); }
    process.exit(0);
}

if (opt('--detectar')) {
    const hay = r => fs.existsSync(path.join(root, r));
    const stack = hay('composer.json') ? 'laravel' : (hay('pyproject.toml') || hay('requirements.txt')) ? 'python' : hay('package.json') ? 'node' : null;
    const dirs = d => { try { return fs.readdirSync(path.join(root, d), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch { return []; } };
    const capasEn = d => dirs(d).filter(n => /^(domain|application|infrastructure)$/i.test(n)).length;
    const contextos = ['src', 'src/modules', 'src/contexts', 'app/contexts'].flatMap(b => dirs(b).filter(n => capasEn(`${b}/${n}`) >= 2).map(n => `${b}/${n}`));
    const estilo = contextos.length >= 2 ? 'ddd-hexagonal' : (capasEn('app') >= 2 || capasEn('src') >= 2 || contextos.length === 1) ? 'hexagonal' : 'mvc-servicios';
    out(JSON.stringify({ estilo, stack, contextos, motivo: contextos.length >= 2 ? 'hay varios contextos con dominio/aplicación/infraestructura'
        : estilo === 'hexagonal' ? 'hay carpetas de dominio, aplicación e infraestructura' : 'no hay capas hexagonales: MVC con servicios es lo más cercano' }, null, 2));
    process.exit(0);
}

if (opt('--plantilla')) {
    const estilo = opt('--plantilla'), stack = opt('--stack');
    const nombre = `${estilo}.${stack}`;
    if (!plantillas().includes(nombre)) { out(`No existe la plantilla ${nombre}. Hay: ${plantillas().join(', ')}`); process.exit(2); }
    const destino = path.join(root, 'senzu', 'arquitectura', 'capas.json');
    if (fs.existsSync(destino) && /senzu:inmutable/.test(fs.readFileSync(destino, 'utf8'))) { out(`${path.relative(root, destino)} está SELLADO: solo lo cambia el usuario.`); process.exit(2); }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(path.join(PLANTILLAS, nombre + '.json'), destino);
    out(`Escrito ${path.relative(root, destino).replace(/\\/g, '/')} (${nombre}). Ajusta las rutas a las reales, ejecuta --comprobar y séllalo con el OK del usuario (--sellar).`);
    process.exit(0);
}

if (opt('--sellar')) {
    const f = path.join(root, 'senzu', 'arquitectura', 'capas.json');
    const a = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (a._sello === 'senzu:inmutable') { out('Ya estaba sellada.'); process.exit(0); }
    fs.writeFileSync(f, JSON.stringify({ _sello: 'senzu:inmutable', ...a }, null, 2) + '\n');
    out('Sellada: desde ahora la protegen protect-files, el guard y el pre-commit, y arquitectura-guard la hace cumplir.');
    process.exit(0);
}

if (opt('--comprobar')) {
    const lib = await cargarLib();
    const arq = lib.leerArquitectura(root);
    if (!arq) { out('Este proyecto no tiene arquitectura declarada (senzu/arquitectura/capas.json): no hay nada que comprobar.'); process.exit(0); }
    const NO = new Set(['node_modules', 'vendor', '.git', 'dist', 'build', '.next', 'senzu', '.claude', '.agents', 'storage', '__pycache__', '.venv', 'venv']);
    const archivos = [];
    (function recorre(d) {
        for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) {
            const r = d ? `${d}/${e.name}` : e.name;
            if (e.isDirectory()) { if (!NO.has(e.name) && !e.name.startsWith('.')) recorre(r); }
            else if (/\.(php|ts|tsx|js|jsx|mjs|cjs|py)$/i.test(e.name)) archivos.push(r);
        }
    })('');
    const todas = [];
    for (const r of archivos) for (const i of lib.infraccionesArquitectura(root, arq, r, '', fs.readFileSync(path.join(root, r), 'utf8'), { nuevo: true })) todas.push({ archivo: r, ...i });
    const bloquean = todas.filter(i => i.tipo === 'bloquea');
    if (opt('--json')) { out(JSON.stringify({ estilo: arq.estilo, archivos: archivos.length, infracciones: todas }, null, 2)); process.exit(bloquean.length ? 1 : 0); }
    out(`Arquitectura ${arq.estilo} (${arq.stack || 'stack sin indicar'}): ${archivos.length} archivos revisados.`);
    const porRegla = {};
    for (const i of todas) (porRegla[`${i.tipo} · ${i.regla}`] = porRegla[`${i.tipo} · ${i.regla}`] || []).push(i);
    for (const [k, l] of Object.entries(porRegla)) {
        out(`\n${k}: ${l.length}`);
        for (const i of l.slice(0, 15)) out(`  ${i.archivo}: ${i.msg}${i.regla === 'carpetas' ? '' : `\n      ${i.linea}`}`);
        if (l.length > 15) out(`  … y ${l.length - 15} más (--json para verlas todas)`);
    }
    out(bloquean.length ? `\n${bloquean.length} infracciones que bloquean. En un proyecto heredado: no se arreglan de golpe; van a tarjetas (fase AU) o, si son correctas, a "excepciones".`
        : '\nSin infracciones que bloqueen.');
    process.exit(bloquean.length ? 1 : 0);
}

out('Uso: --plantillas | --detectar | --plantilla <estilo> --stack <laravel|node|python> | --comprobar [--json] | --sellar   [--path <proyecto>]');
process.exit(2);
