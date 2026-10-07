#!/usr/bin/env node
// Suite del motor de HECHOS (core/hooks/hechos.mjs + devlog/scripts/memoria.mjs), devlog 098:
// memoria determinista en CUALQUIER idioma y sin red: guardar, no duplicar, sustituir por dimensión, dudas,
// validez en el tiempo, histórico, buscar con erratas y entre idiomas (claves), cupos por familia, alcance del
// usuario, olvidar, y que la misma entrada dé siempre la misma salida.
//   node tools/test-hechos.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-hechos-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');   // la memoria del usuario, aislada
const m = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'hechos.mjs')).href);
const CLI = path.join(ROOT, 'core', 'skills', 'devlog', 'scripts', 'memoria.mjs');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const proyecto = n => { const d = path.join(base, n); fs.mkdirSync(path.join(d, 'senzu'), { recursive: true }); fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), '{}'); return d; };
const T = (d, offset = 0) => new Date(Date.UTC(2026, 9, 7, 10, 0, 0) + offset * 1000).toISOString();
const primero = (d, q, o) => (m.buscarHechos(d, q, o)[0] || {}).hecho || {};

// 0. palabras en cualquier idioma (Intl.Segmenter), sin tildes ni mayúsculas
ok(m.palabras('¿Dónde VIVES? Vivo en Málaga').join(' ') === 'donde vives vivo en malaga', 'español: sin tildes, mayúsculas ni signos', m.palabras('¿Dónde VIVES? Vivo en Málaga').join(' '));
ok(m.palabras('私は東京に住んでいます').includes('東京'), 'japonés: separa palabras sin espacios', m.palabras('私は東京に住んでいます').join('|'));
ok(m.palabras('أعيش في القاهرة').includes('القاهرة'), 'árabe');
ok(m.palabras('Я живу в Москве').includes('москве'), 'ruso (cirílico, minúsculas)');
ok(m.palabras('Ich wohne in München').includes('munchen'), 'alemán (sin diéresis)');
ok(m.claveDimension(' Preferencia / Gestor de Paquetes ') === 'preferencia-gestor-de-paquetes' && m.claveDimension('Identidad.Ubicación') === 'identidad.ubicacion', 'dimensiones normalizadas');

// 1. guardar, no duplicar, sustituir
const P = proyecto('p1');
let r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Málaga', texto: 'vivo en Málaga', claves: ['ciudad', 'city', 'vive'] }, { ahora: T(P, 0) });
ok(r.accion === 'nuevo' && fs.existsSync(path.join(P, 'senzu', 'memoria', 'hechos.jsonl')), 'guarda en senzu/memoria/hechos.jsonl');
r = m.guardarHecho(P, { dimension: 'Identidad.Ubicación', valor: 'MALAGA', claves: ['residencia'] }, { ahora: T(P, 10) });
ok(r.accion === 'ya-estaba' && r.hecho.claves.includes('residencia') && m.todosLosHechos(P).length === 1, 'el mismo valor no se duplica (y suma las claves nuevas)');
r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Valencia', texto: 'me he mudado a Valencia', claves: ['ciudad', 'city'] }, { ahora: T(P, 100) });
ok(r.accion === 'sustituye' && r.sustituidos.length === 1 && r.sustituidos[0].valor === 'Málaga', 'un valor nuevo en la misma dimensión SUSTITUYE al anterior');
ok(primero(P, 'en qué ciudad vive').valor === 'Valencia', 'lo vigente es lo nuevo');
const H = proyecto('herencia');
m.guardarHecho(H, { dimension: 'preferencia.idioma-codigo', valor: 'inglés', claves: ['language', 'idioma'] }, { ahora: T(H, 0) });
m.guardarHecho(H, { dimension: 'preferencia.idioma-codigo', valor: 'español' }, { ahora: T(H, 1) });
ok(primero(H, 'code language').valor === 'español', 'sin claves propias, el valor nuevo hereda las del que sustituye (se sigue encontrando desde otro idioma)');
const hist = m.buscarHechos(P, 'ciudad', { historico: true });
ok(hist.length === 2 && hist.some(x => x.hecho.valor === 'Málaga' && /ya no vigente/.test(x.motivo)), 'con --historico aparece lo sustituido, marcado como no vigente', JSON.stringify(hist.map(x => x.motivo)));
r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Madrid', duda: true }, { ahora: T(P, 200) });
ok(r.accion === 'dudoso' && primero(P, 'ciudad city').valor !== 'Madrid' && m.todosLosHechos(P).find(h => h.valor === 'Valencia').estado === 'activo', 'una duda («creo que…») no sustituye lo afirmado');

// 2. varios valores a la vez en las familias que acumulan
const V = proyecto('varios');
m.guardarHecho(V, { dimension: 'pendiente.web', valor: 'revisar el formulario de contacto' }, { ahora: T(V, 0) });
r = m.guardarHecho(V, { dimension: 'pendiente.web', valor: 'subir las fotos nuevas' }, { ahora: T(V, 5) });
ok(r.accion === 'nuevo' && m.contextoHechos(V).length === 2, 'pendiente.* acumula (no sustituye)');

// 3. buscar: erratas, entre idiomas con claves, cualquier alfabeto
const B = proyecto('buscar');
m.guardarHecho(B, { dimension: 'preferencia.gestor-paquetes', valor: 'pnpm', texto: 'usamos pnpm, nunca npm', claves: ['package manager', 'gestor de paquetes'] }, { ahora: T(B, 0) });
m.guardarHecho(B, { dimension: 'proyecto.stack', valor: 'Laravel 11 con Inertia y Vue', claves: ['framework', 'backend'] }, { ahora: T(B, 1) });
m.guardarHecho(B, { dimension: 'identidad.ubicacion', valor: '東京', texto: '私は東京に住んでいます', idioma: 'ja', claves: ['Tokio', 'Tokyo', 'ciudad'] }, { ahora: T(B, 2) });
m.guardarHecho(B, { dimension: 'restriccion.presupuesto', valor: 'máximo 3000 €', texto: 'el cliente no pasa de 3000 euros', claves: ['budget', 'presupuesto'] }, { ahora: T(B, 3) });
ok(primero(B, 'which package manager do we use?').valor === 'pnpm', 'pregunta en inglés, hecho en español (por las claves)');
ok(primero(B, 'framwork del proyecto').valor === 'Laravel 11 con Inertia y Vue', 'con erratas («framwork»)', JSON.stringify(m.buscarHechos(B, 'framwork del proyecto').map(x => x.motivo)));
ok(primero(B, '東京').valor === '東京' && primero(B, 'where in Tokyo').valor === '東京', 'japonés: por la palabra y por la clave en inglés');
ok(primero(B, 'presupuesto del cliente').dimension === 'restriccion.presupuesto', 'por la dimensión y el texto');
ok(m.buscarHechos(B, 'xyzzy').length === 0, 'sin coincidencias: vacío (no inventa)');
const cerca = m.buscarHechos(B, 'pnpm');
ok(/coincide: pnpm/.test(cerca[0].motivo), 'cada resultado trae su motivo', cerca[0].motivo);

// 4. cupos por familia: que una familia no se coma el espacio
const C = proyecto('cupos');
for (let i = 0; i < 6; i++) m.guardarHecho(C, { dimension: `nota.${i}`, valor: `nota de diseño ${i}`, claves: ['diseño'] }, { ahora: T(C, i) });
m.guardarHecho(C, { dimension: 'preferencia.tipografia', valor: 'Inter', claves: ['diseño'] }, { ahora: T(C, 0) });
const cupo = m.buscarHechos(C, 'diseño', { limite: 3 });
ok(cupo.length === 3 && cupo.some(x => x.hecho.dimension === 'preferencia.tipografia'), 'cupos: con 3 sitios entra también la otra familia', cupo.map(x => x.hecho.dimension).join(','));

// 5. validez en el tiempo
const F = proyecto('fechas');
m.guardarHecho(F, { dimension: 'proyecto.entrega', valor: 'fase 2', desde: '2030-01-01T00:00:00.000Z' }, { ahora: T(F, 0) });
m.guardarHecho(F, { dimension: 'restriccion.congelacion', valor: 'sin despliegues en agosto', hasta: '2020-09-01T00:00:00.000Z' }, { ahora: T(F, 1) });
ok(m.contextoHechos(F).length === 0, 'un hecho futuro o ya caducado no está vigente');
ok(m.buscarHechos(F, 'despliegues agosto', { historico: true }).length === 1, 'pero sí en el histórico');

// 6. alcance del usuario (todos sus proyectos) y olvidar
const U1 = proyecto('u1'), U2 = proyecto('u2');
r = m.guardarHecho(U1, { dimension: 'identidad.nombre', valor: 'Peterson', alcance: 'usuario', claves: ['name', 'nombre'] }, { ahora: T(U1, 0) });
ok(primero(U2, 'cómo se llama el usuario nombre').valor === 'Peterson', 'lo del usuario se ve desde otro proyecto');
ok(m.olvidarHecho(U2, r.hecho.id) && m.buscarHechos(U1, 'nombre').length === 0, 'olvidar lo saca de la búsqueda (queda como invalidado)');

// 7. determinista: misma entrada, misma salida
const D1 = proyecto('d1'), D2 = proyecto('d2');
for (const d of [D1, D2]) { m.guardarHecho(d, { dimension: 'proyecto.stack', valor: 'Astro', claves: ['framework'] }, { ahora: T(d, 0) }); m.guardarHecho(d, { dimension: 'preferencia.estilo', valor: 'minimalista' }, { ahora: T(d, 1) }); }
ok(fs.readFileSync(path.join(D1, 'senzu/memoria/hechos.jsonl'), 'utf8') === fs.readFileSync(path.join(D2, 'senzu/memoria/hechos.jsonl'), 'utf8')
    && JSON.stringify(m.buscarHechos(D1, 'framework estilo')) === JSON.stringify(m.buscarHechos(D2, 'framework estilo')), 'misma entrada → mismo archivo y misma búsqueda');

// 8. la línea de comandos
const cli = (d, ...a) => spawnSync(process.execPath, [CLI, '--path', d, ...a], { encoding: 'utf8', env: process.env });
const L = proyecto('cli');
let c = cli(L, '--guardar', '--dimension', 'preferencia.idioma-codigo', '--valor', 'inglés', '--claves', 'language,idioma', '--texto', 'el código en inglés');
ok(c.status === 0 && /^Guardado: - \[preferencia\.idioma-codigo\] inglés/.test(c.stdout), 'CLI: --guardar', c.stdout + c.stderr);
c = cli(L, '--guardar', '--dimension', 'preferencia.idioma-codigo', '--valor', 'español');
ok(/sustituye/.test(c.stdout) && /sustituido: .*inglés/.test(c.stdout), 'CLI: avisa de lo que sustituye', c.stdout);
c = cli(L, '--buscar', 'code language');
ok(/español/.test(c.stdout) && !/inglés \(/.test(c.stdout) && /coincide/.test(c.stdout), 'CLI: --buscar trae lo vigente con el motivo', c.stdout);
ok(/inglés \(sustituido/.test(cli(L, '--buscar', 'idioma', '--historico').stdout), 'CLI: --historico');
ok(/Nada en la memoria/.test(cli(L, '--buscar', 'qwerty').stdout), 'CLI: sin resultados lo dice');
ok(/preferencia\.idioma-codigo/.test(cli(L, '--contexto').stdout), 'CLI: --contexto');
ok(cli(L, '--guardar', '--dimension', 'x').status !== 0, 'CLI: sin valor no guarda');

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
