#!/usr/bin/env node
// Hard recall determinista SIN LLM (X-T19) — gate de CI del motor de memoria (core/hooks/hechos.mjs).
// Barato y sin Ollama (aparte del cara a cara end-to-end de F8-T9, que sí necesita modelos). Fija los invariantes
// de recall que importan en la vida real, triados POR CAPA:
//   · EXTRACCIÓN / almacenamiento — el motor Node NO extrae hechos de texto libre (eso lo hace el agente/hook); la
//     capa de extracción aquí son los invariantes de guardado: no duplicar, no borrar lo bueno con un matiz (X-T18),
//     y que un dato de 3ª persona en SU dimensión no toque la identidad del usuario.
//   · SELECCIÓN — distractor de 3ª persona NO promovido a la identidad; recall entre idiomas; diversidad bajo cupo.
//   · TEMPORAL — consultas elípticas presente/pasado («ahora», «antes») sobre la línea de tiempo.
// Idea del hard-recall del SDK Python (tests/test_hard_recall_benchmark.py), adaptada al motor Node. Reglas: nada
// de LLM, nada de red, determinista (fechas fijas con T()); si un caso falla se arregla en la CAPA correcta del
// motor, nunca con heurísticas del caller ni relajando la aserción.
//   node tools/test-hard-recall.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = process.env.SENZU_HOOKS_DIR || path.join(ROOT, 'core', 'hooks');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-hardrecall-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const m = await import(pathToFileURL(path.join(HOOKS, 'hechos.mjs')).href);

let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };
const proyecto = n => { const d = path.join(base, n); fs.mkdirSync(path.join(d, 'senzu'), { recursive: true }); fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), '{}'); return d; };
const T = s => new Date(Date.UTC(2026, 0, 1) + s * 1000).toISOString();   // fechas fijas: determinista
const dim0 = (r) => (r[0] || {}).hecho?.dimension;                        // dimensión del primer resultado
const val0 = (r) => (r[0] || {}).hecho?.valor;                           // valor del primer resultado
const familias = hs => [...new Set(hs.map(h => h.dimension.split('.')[0]))];

// ==================================================================== CAPA EXTRACCIÓN (almacenamiento)
{
    const P = proyecto('extraccion');
    let r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Valencia', texto: 'vivo en Valencia', claves: ['ciudad', 'city', 'vivo', 'live'] }, { ahora: T(0) });
    ok(r.accion === 'nuevo', 'extracción: el primer hecho se guarda como nuevo', r.accion);
    r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'VALENCIA' }, { ahora: T(5) });
    ok(r.accion === 'ya-estaba' && m.todosLosHechos(P).filter(h => h.dimension === 'identidad.ubicacion').length === 1, 'extracción: el mismo valor no se duplica (conservador)', r.accion);

    // un dato de 3ª persona en SU dimensión no debe tocar la identidad del usuario (no sustituye)
    r = m.guardarHecho(P, { dimension: 'nota.pareja', valor: 'Rebeca es mi pareja y vive en Sevilla', claves: ['rebeca', 'pareja'] }, { ahora: T(10) });
    const ubic = m.todosLosHechos(P).find(h => h.dimension === 'identidad.ubicacion');
    ok(r.accion === 'nuevo' && ubic.estado === 'activo' && ubic.valor === 'Valencia', 'extracción: un dato de 3ª persona (nota.pareja) NO altera la identidad del usuario', JSON.stringify([ubic.valor, ubic.estado]));

    // X-T18: un valor con matiz no borra el vigente bueno (frontera extracción/sustitución)
    r = m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'a veces en Barcelona', claves: ['ciudad', 'city'] }, { ahora: T(20) });
    ok(r.accion === 'nuevo' && m.todosLosHechos(P).filter(h => h.dimension === 'identidad.ubicacion' && h.estado === 'activo').length === 2, 'extracción: un valor con matiz no borra el vigente bueno (X-T18)');
}

// ==================================================================== CAPA SELECCIÓN
{
    // distractor de 3ª persona: «¿dónde vivo?» trae la MÍA, no la de mi pareja
    const P = proyecto('seleccion-distractor');
    m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Valencia', texto: 'vivo en Valencia', claves: ['ciudad', 'city', 'vivo', 'live'] }, { ahora: T(0) });
    m.guardarHecho(P, { dimension: 'nota.pareja', valor: 'Rebeca es mi pareja y vive en Sevilla', claves: ['rebeca', 'pareja', 'sevilla'] }, { ahora: T(10) });
    const mia = m.buscarHechos(P, 'en que ciudad vivo yo');
    ok(dim0(mia) === 'identidad.ubicacion' && val0(mia) === 'Valencia', 'selección: «¿dónde vivo?» → mi ubicación (Valencia) la primera', JSON.stringify([dim0(mia), val0(mia)]));
    ok(!mia.some(x => /Sevilla/.test(x.hecho?.valor || '')), 'selección: el distractor de 3ª persona (Sevilla) NO se cuela en «¿dónde vivo?»', JSON.stringify(mia.map(x => x.hecho?.valor)));
    const suya = m.buscarHechos(P, 'donde vive Rebeca mi pareja');
    ok(dim0(suya) === 'nota.pareja', 'selección: y preguntando por Rebeca sí sale su nota la primera', dim0(suya));

    // recall entre idiomas: guardado en español, consulta en inglés (mismo hecho, no «relación débil»)
    const B = proyecto('seleccion-multi');
    m.guardarHecho(B, { dimension: 'preferencia.gestor-paquetes', valor: 'pnpm', texto: 'usamos pnpm', claves: ['package manager', 'gestor de paquetes'] }, { ahora: T(0) });
    const en = m.buscarHechos(B, 'which package manager do we use');
    ok(val0(en) === 'pnpm' && !/d[eé]bil/.test((en[0] || {}).motivo || ''), 'selección: consulta en inglés encuentra el hecho guardado en español, con fuerza (no débil)', JSON.stringify([val0(en), (en[0] || {}).motivo]));

    // diversidad bajo cupo pequeño: el contexto del inicio no es solo identidad
    const D = proyecto('seleccion-diversidad');
    m.guardarHecho(D, { dimension: 'identidad.nombre', valor: 'Peter', claves: ['nombre', 'name'] }, { ahora: T(0) });
    m.guardarHecho(D, { dimension: 'proyecto.nombre', valor: 'Macota', claves: ['proyecto', 'project'] }, { ahora: T(1) });
    m.guardarHecho(D, { dimension: 'proyecto.stack', valor: 'PHP Laravel', claves: ['stack'] }, { ahora: T(2) });
    m.guardarHecho(D, { dimension: 'restriccion.local', valor: 'debe ser local', claves: ['local', 'restriccion'] }, { ahora: T(3) });
    m.guardarHecho(D, { dimension: 'preferencia.cambios', valor: 'prefiero cambios reversibles', claves: ['reversible', 'preferencia'] }, { ahora: T(4) });
    const ctx = m.contextoHechos(D);
    ok(familias(ctx).length >= 3 && familias(ctx).includes('proyecto') && familias(ctx).includes('restriccion'), 'selección: el contexto reparte por familias (no solo identidad) bajo cupo', familias(ctx).join(','));
}

// ==================================================================== CAPA TEMPORAL
{
    const P = proyecto('temporal');
    m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Madrid', texto: 'vivía en Madrid', claves: ['ciudad', 'city'] }, { ahora: T(0) });
    m.guardarHecho(P, { dimension: 'identidad.ubicacion', valor: 'Valencia', texto: 'ahora vivo en Valencia', claves: ['ciudad', 'city'] }, { ahora: T(100) });

    // presente: «¿y ahora?» trae lo vigente
    const ahora = m.buscarHechos(P, 'donde vivo ahora en que ciudad');
    ok(val0(ahora) === 'Valencia' && (ahora[0] || {}).hecho?.estado === 'activo', 'temporal: «¿y ahora?» → el valor vigente (Valencia, activo)', JSON.stringify([val0(ahora), (ahora[0] || {}).hecho?.estado]));

    // pasado: «¿y antes?» con histórico trae lo sustituido, marcado como no vigente, por delante
    const antes = m.buscarHechos(P, 'donde vivia antes en que ciudad', { historico: true });
    ok(val0(antes) === 'Madrid' && (antes[0] || {}).hecho?.estado === 'sustituido', 'temporal: «¿y antes?» (--histórico) → el valor anterior (Madrid, sustituido) el primero', JSON.stringify([val0(antes), (antes[0] || {}).hecho?.estado]));
    ok(antes.some(x => x.hecho?.valor === 'Valencia'), 'temporal: y el histórico sigue incluyendo también el vigente');
}

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
