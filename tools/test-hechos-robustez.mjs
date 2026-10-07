#!/usr/bin/env node
// Robustez de la memoria de hechos (plan de Hemispheric, F4-T2): lo que rompe una memoria en la vida real.
// Archivo dañado, dos procesos guardando a la vez (Claude y Codex), 10 000 hechos, Unicode raro (NFC/NFD, emoji,
// ancho cero, marcas de dirección), BOM y CRLF, y rutas en cualquier formato.
//   node tools/test-hechos-robustez.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-robustez-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const m = await import(pathToFileURL(path.join(HOOKS, 'hechos.mjs')).href);
const CLI = path.join(ROOT, 'core', 'skills', 'devlog', 'scripts', 'memoria.mjs');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const proyecto = n => { const d = path.join(base, n); fs.mkdirSync(path.join(d, 'senzu'), { recursive: true }); fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), '{}'); return d; };
const archivo = d => path.join(d, 'senzu', 'memoria', 'hechos.jsonl');

// 1. archivo dañado: lo que no se puede leer no tumba nada… y NO se pierde al reescribir
{
    const P = proyecto('danado');
    fs.mkdirSync(path.dirname(archivo(P)), { recursive: true });
    const bueno = JSON.stringify({ id: 'h-00000001', dimension: 'proyecto.cliente', valor: 'Cerámicas Sol', estado: 'activo', alcance: 'proyecto', creado: '2026-10-01T09:00:00.000Z' });
    const cortada = '{"id":"h-00000002","dimension":"proyecto.stack","valor":"Lara';   // cierre a mitad de escritura
    fs.writeFileSync(archivo(P), '\uFEFF' + bueno + '\r\n' + cortada + '\r\n\u0000\u0001\u0002basura\r\n');
    ok((m.buscarHechos(P, 'Cerámicas')[0] || {}).hecho?.valor === 'Cerámicas Sol', 'con BOM, CRLF, una línea cortada y basura: lo bueno se lee');
    m.guardarHecho(P, { dimension: 'proyecto.dominio', valor: 'ceramicassol.es' });
    const tras = fs.readFileSync(archivo(P), 'utf8');
    const respaldo = path.join(path.dirname(archivo(P)), 'hechos.danado.jsonl');
    ok(m.todosLosHechos(P).length === 2, 'al guardar después, siguen los buenos más el nuevo', String(m.todosLosHechos(P).length));
    ok(fs.existsSync(respaldo) && fs.readFileSync(respaldo, 'utf8').includes('"valor":"Lara'), 'las líneas ilegibles NO se pierden: van a hechos.danado.jsonl para recuperarlas a mano');
    ok(!tras.includes('\u0000') && !tras.includes('"valor":"Lara'), 'y el archivo principal queda limpio');
}

// 2. dos procesos a la vez (Claude y Codex en el mismo proyecto): ningún hecho se pierde
{
    const P = proyecto('concurrencia');
    const lanzar = (i) => new Promise(res => {
        const c = spawn(process.execPath, [CLI, '--path', P, '--guardar', '--dimension', `nota.n${i}`, '--valor', `nota número ${i}`], { env: process.env });
        c.on('exit', code => res(code));
    });
    const codigos = await Promise.all(Array.from({ length: 30 }, (_, i) => lanzar(i)));
    const guardados = m.todosLosHechos(P).map(h => h.dimension);
    ok(codigos.every(c => c === 0), '30 procesos guardando a la vez: todos terminan bien', codigos.join(','));
    ok(new Set(guardados).size === 30 && guardados.length === 30, '…y están los 30 hechos, sin perder ni duplicar ninguno', `${guardados.length} (${new Set(guardados).size} distintos)`);
    ok(!fs.readdirSync(path.dirname(archivo(P))).some(f => /\.(lock|tmp)$/.test(f)), 'no quedan cerrojos ni temporales');
}
{   // un cerrojo abandonado (proceso que murió) no bloquea para siempre
    const P = proyecto('cerrojo-viejo');
    fs.mkdirSync(path.dirname(archivo(P)), { recursive: true });
    const lock = archivo(P) + '.lock';
    fs.writeFileSync(lock, '99999');
    const viejo = new Date(Date.now() - 60 * 1000);
    fs.utimesSync(lock, viejo, viejo);
    const t = Date.now();
    m.guardarHecho(P, { dimension: 'proyecto.cliente', valor: 'Cerámicas Sol' });
    ok(m.todosLosHechos(P).length === 1 && Date.now() - t < 3000, 'un cerrojo de hace un minuto se considera abandonado y se recupera', `${Date.now() - t} ms`);
}

// 3. tamaño: 10 000 hechos se buscan rápido
{
    const P = proyecto('grande');
    fs.mkdirSync(path.dirname(archivo(P)), { recursive: true });
    const temas = ['pagos', 'envíos', 'diseño', 'clientes', 'stock', 'facturas', 'correo', 'móvil', 'seo', 'soporte'];
    const lineas = Array.from({ length: 10000 }, (_, i) => JSON.stringify({ id: 'h-' + String(i).padStart(8, '0'), dimension: `nota.${temas[i % 10]}-${i}`,
        valor: `${temas[i % 10]} detalle ${i} del proyecto número ${i % 97}`, estado: 'activo', alcance: 'proyecto', creado: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() }));
    fs.writeFileSync(archivo(P), lineas.join('\n') + '\n');
    m.guardarHecho(P, { dimension: 'proyecto.pasarela-pago', valor: 'Stripe en modo test', claves: ['pagos', 'payments'] });
    const t = process.hrtime.bigint();
    const r = m.buscarHechos(P, 'pasarela de pagos stripe');
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    ok(r[0] && r[0].hecho.valor === 'Stripe en modo test', 'con 10 000 hechos, el relevante sale el primero');
    ok(ms < 300, `con 10 000 hechos, buscar tarda menos de 300 ms (${Math.round(ms)} ms)`);
    const t2 = process.hrtime.bigint();
    m.contextoHechos(P);
    ok(Number(process.hrtime.bigint() - t2) / 1e6 < 300, 'y el contexto del inicio de sesión también');
}

// 4. Unicode raro: la misma palabra escrita de formas distintas se encuentra
{
    const P = proyecto('unicode');
    m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Ma\u0301laga'.normalize('NFD'), claves: ['ciudad'] });   // NFD
    m.guardarHecho(P, { dimension: 'preferencia.emoji', valor: 'el logo lleva 🏺 un ánfora 👍🏽', claves: ['logo'] });
    m.guardarHecho(P, { dimension: 'proyecto.cliente', valor: 'Cerámicas\u200B Sol', claves: ['cliente'] });   // espacio de ancho cero dentro
    m.guardarHecho(P, { dimension: 'proyecto.distribuidor', valor: '\u202Bالموزع في القاهرة\u202C', claves: ['distribuidor'] });   // marcas de dirección
    ok((m.buscarHechos(P, 'Málaga'.normalize('NFC'))[0] || {}).hecho?.dimension === 'identidad.ubicacion', 'NFD guardado, NFC buscado: se encuentra');
    ok((m.buscarHechos(P, 'ánfora')[0] || {}).hecho?.dimension === 'preferencia.emoji', 'con emoji en el valor, sus palabras se encuentran');
    ok((m.buscarHechos(P, 'Cerámicas Sol')[0] || {}).hecho?.dimension === 'proyecto.cliente', 'un espacio de ancho cero dentro no impide encontrarlo');
    ok((m.buscarHechos(P, 'Ceráimcas')[0] || {}).hecho?.dimension === 'proyecto.cliente', 'una transposición de letras («Ceráimcas») también');
    ok((m.buscarHechos(P, 'القاهرة')[0] || {}).hecho?.dimension === 'proyecto.distribuidor', 'marcas de dirección (RTL) alrededor: se encuentra');
    const r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Málaga'.normalize('NFC') });
    ok(r.accion === 'ya-estaba', 'NFC y NFD del mismo valor son el mismo hecho (no se duplica ni se sustituye)', r.accion);
    ok(m.claveDimension('Identidad\u200B.Ubicación') === 'identidad.ubicacion', 'la dimensión tampoco arrastra caracteres invisibles');
}

// 5. rutas en cualquier formato apuntan al mismo almacén
{
    const P = proyecto('rutas');
    const win = path.resolve(P), slash = win.replace(/\\/g, '/');
    const formatos = process.platform === 'win32' ? [win, slash, slash + '/', '/' + win[0].toLowerCase() + slash.slice(2)] : [win, win + '/'];
    for (const [i, f] of formatos.entries()) spawnSync(process.execPath, [CLI, '--path', f, '--guardar', '--dimension', `nota.r${i}`, '--valor', `ruta ${i}`], { encoding: 'utf8', env: process.env });
    ok(m.todosLosHechos(P).length === formatos.length, `${formatos.length} formatos de ruta (C:\\, C:/, barra final, /c/) → el mismo almacén`, String(m.todosLosHechos(P).length));
}

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
