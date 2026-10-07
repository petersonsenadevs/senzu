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

// 3b. palabras vacías en cualquier idioma (sin listas por idioma): solas no bastan para que un hecho cuente
const S = proyecto('vacias');
m.guardarHecho(S, { dimension: 'restriccion.presupuesto', valor: 'máximo 3000 € para el cliente de la tienda' }, { ahora: T(S, 0) });
m.guardarHecho(S, { dimension: 'identidad.ubicacion', valor: 'أعيش في القاهرة' }, { ahora: T(S, 1) });
m.guardarHecho(S, { dimension: 'identidad.ciudad', valor: '私は東京に住んでいます' }, { ahora: T(S, 2) });
ok(m.buscarHechos(S, 'cambia el color de la cabecera a gris').length === 0, 'español: «el», «de», «la» no hacen coincidir nada', JSON.stringify(m.buscarHechos(S, 'cambia el color de la cabecera a gris').map(x => x.motivo)));
ok(m.buscarHechos(S, 'what is in the box of the page').length === 0, 'inglés: «is», «in», «of», «the» tampoco');
ok(m.buscarHechos(S, 'ما في الصندوق').length === 0, 'árabe: «في» sola no basta');
ok(m.buscarHechos(S, '猫は可愛いです').every(x => x.hecho.dimension !== 'identidad.ciudad'), 'japonés: la partícula «は» no basta');
ok(primero(S, 'القاهرة').dimension === 'identidad.ubicacion' && primero(S, '東京').dimension === 'identidad.ciudad' && primero(S, '3000').dimension === 'restriccion.presupuesto', 'pero una palabra con peso (en cualquier escritura) o un número sí');

// 3c. relación débil: si la pregunta tiene 3+ palabras con peso y solo coincide una, sale marcada (no se esconde)
{
    const D = proyecto('debil');
    m.guardarHecho(D, { dimension: 'proyecto.hosting', valor: 'Forge sobre un VPS de Hetzner', claves: ['servidor', 'server', 'hosting'] }, { ahora: T(D, 0) });
    const roce = m.buscarHechos(D, 'qué versión de PHP hay en el servidor de staging');
    ok(roce.length === 1 && roce[0].debil === true && /relación débil \(solo coincide «servidor»/.test(roce[0].motivo), 'un roce de una sola palabra sale marcado como relación débil', JSON.stringify(roce.map(x => x.motivo)));
    const solido = m.buscarHechos(D, 'en qué servidor está el hosting');
    ok(solido.length === 1 && !solido[0].debil, 'con dos palabras que coinciden ya no es débil');
    // (límite medido: «dónde» y «está» también tienen peso, así que «¿dónde está el servidor?» sale débil; la marca no
    //  descarta nada, solo avisa. Sin listas por idioma no se distinguen las palabras de pregunta.)
    ok(!m.buscarHechos(D, '¿y el servidor?')[0].debil, 'una pregunta con UNA sola palabra con peso no es débil (es todo lo que pregunta)');
}

// 3d. enlaces entre hechos y expansión de un salto (F6-T1)
{
    const L = proyecto('enlaces');
    m.guardarHecho(L, { dimension: 'proyecto.pasarela-pago', valor: 'Stripe en modo test', claves: ['pagos', 'pasarela', 'payments'] }, { ahora: T(L, 0) });
    m.guardarHecho(L, { dimension: 'restriccion.pci', valor: 'no guardamos números de tarjeta: todo en el checkout alojado', enlaces: ['proyecto.pasarela-pago'] }, { ahora: T(L, 1) });
    m.guardarHecho(L, { dimension: 'proyecto.cliente', valor: 'Cerámicas Sol', claves: ['cliente'] }, { ahora: T(L, 2) });
    m.guardarHecho(L, { dimension: 'proyecto.contacto-cliente', valor: 'Lucía Martín (marketing)' }, { ahora: T(L, 3) });
    let r = m.buscarHechos(L, '¿qué pasarela de pagos usamos?');
    ok(r[0].hecho.dimension === 'proyecto.pasarela-pago' && r.some(x => x.hecho.dimension === 'restriccion.pci' && /vía enlace con proyecto\.pasarela-pago/.test(x.motivo)), 'al buscar la pasarela llega lo enlazado (sentido inverso), marcado «vía enlace»', JSON.stringify(r.map(x => x.motivo)));
    ok(!r.some(x => x.hecho.dimension === 'proyecto.contacto-cliente'), 'lo NO enlazado no llega por expansión');
    ok(m.enlazarHechos(L, 'proyecto.cliente', 'proyecto.contacto-cliente') && m.buscarHechos(L, 'Cerámicas Sol').some(x => x.hecho.dimension === 'proyecto.contacto-cliente'), '--enlazar después: al recordar el cliente llega su contacto');
    m.guardarHecho(L, { dimension: 'proyecto.contacto-cliente', valor: 'Pedro Gil (gerente)' }, { ahora: T(L, 4) });
    r = m.buscarHechos(L, 'Cerámicas Sol');
    ok(r.some(x => x.hecho.valor === 'Pedro Gil (gerente)') && !r.some(x => x.hecho.valor.startsWith('Lucía')), 'el enlace es a la DIMENSIÓN: si cambia el contacto, llega el vigente', JSON.stringify(r.map(x => x.hecho.valor)));
    m.guardarHecho(L, { dimension: 'proyecto.pasarela-pago', valor: 'Redsys' }, { ahora: T(L, 5) });
    ok(m.todosLosHechos(L).find(h => h.valor === 'Redsys').claves.includes('pagos'), 'al sustituir sin claves propias, el nuevo hereda claves (y enlaces) del anterior');
    for (let i = 0; i < 5; i++) m.guardarHecho(L, { dimension: `nota.pago-${i}`, valor: `detalle ${i}`, enlaces: ['proyecto.pasarela-pago'] }, { ahora: T(L, 10 + i) });
    ok(m.buscarHechos(L, 'pasarela de pagos', { limite: 10 }).filter(x => x.via).length <= 2, 'la expansión tiene presupuesto: como mucho 2 por consulta');
    ok(m.enlazarHechos(L, 'no.existe', 'proyecto.cliente') === null && m.enlazarHechos(L, 'proyecto.cliente', 'proyecto.cliente') === null, 'enlazar algo que no existe o a sí mismo: nada');
}

// 3e. objetivos y pendientes con ciclo de vida (F6-T2)
{
    const C = proyecto('ciclo');
    const fotos = m.guardarHecho(C, { dimension: 'pendiente.fotos', valor: 'faltan las fotos de otoño', claves: ['fotos'] }, { ahora: T(C, 0) }).hecho;
    m.guardarHecho(C, { dimension: 'objetivo.ventas', valor: 'vender 200 piezas al mes', claves: ['ventas'] }, { ahora: T(C, 5) });
    m.guardarHecho(C, { dimension: 'proyecto.cliente', valor: 'Cerámicas Sol' }, { ahora: T(C, 6) });
    ok(m.abiertos(C).map(h => h.dimension).join(',') === 'pendiente.fotos,objetivo.ventas', 'abiertos: solo objetivos y pendientes, los más antiguos primero');
    let h = m.cambiarProgreso(C, 'objetivo.ventas', 'en-curso');
    ok(h && h.progreso === 'en-curso' && m.abiertos(C).length === 2 && /en curso/.test(m.buscarHechos(C, 'ventas')[0].motivo), 'en curso: sigue abierto y se marca');
    h = m.cambiarProgreso(C, fotos.id, 'resuelto', 'el fotógrafo las entregó el lunes');
    ok(h && h.estado === 'cerrado' && h.progreso === 'resuelto' && m.abiertos(C).length === 1, 'resolver por id: deja de estar abierto');
    ok(m.buscarHechos(C, 'fotos').length === 0, 'lo resuelto ya no se encuentra como vigente');
    const hist = m.buscarHechos(C, 'fotos', { historico: true });
    ok(hist.length === 1 && /cerrado \(resuelto el .*: el fotógrafo las entregó el lunes\)/.test(hist[0].motivo), 'pero sí en el histórico, con cuándo y cómo se cerró', JSON.stringify(hist.map(x => x.motivo)));
    ok(m.cambiarProgreso(C, 'objetivo.ventas', 'abandonado', 'el cliente cambió de estrategia').progreso === 'abandonado' && m.abiertos(C).length === 0, 'abandonar por dimensión');
    ok(m.cambiarProgreso(C, 'proyecto.cliente', 'resuelto') === null, 'un hecho normal (no objetivo ni pendiente) no tiene ciclo de vida');
    ok(m.cambiarProgreso(C, fotos.id, 'resuelto') === null, 'lo ya cerrado no se vuelve a cerrar');
    let err = ''; try { m.cambiarProgreso(C, 'objetivo.ventas', 'hecho'); } catch (e) { err = e.message; }
    ok(/en-curso, resuelto o abandonado/.test(err), 'un progreso desconocido se rechaza');
    const cli = (...a) => spawnSync(process.execPath, [CLI, '--path', C, ...a], { encoding: 'utf8', env: process.env }).stdout;
    m.guardarHecho(C, { dimension: 'pendiente.logo', valor: 'revisar el logo con el cliente' }, { ahora: T(C, 20) });
    ok(/abierto desde/.test(cli('--abiertos')) && /^Resuelto: .*pendiente\.logo.* — aprobado/m.test(cli('--resolver', 'pendiente.logo', '--como', 'aprobado')), 'CLI: --abiertos y --resolver con nota');
}

// 3f. procedencia, confianza y casi-duplicados (F6-T4)
{
    const F = proyecto('fuente');
    // misma forma y longitud; el del usuario es el MÁS ANTIGUO (el desempate por fecha favorecería al del agente)
    m.guardarHecho(F, { dimension: 'proyecto.hosting-web', valor: 'Netlify' }, { ahora: T(F, 0) });
    const ded = m.guardarHecho(F, { dimension: 'proyecto.hosting-api', valor: 'Vercel', fuente: 'agente' }, { ahora: T(F, 50) }).hecho;
    let hits = m.buscarHechos(F, 'hosting');
    ok(hits.length === 2 && hits[0].hecho.valor === 'Netlify', 'lo que afirmó el usuario va antes que lo que dedujo el agente', hits.map(x => x.hecho.valor + ' ' + x.puntuacion).join(' | '));
    ok(/lo dedujo el agente/.test(hits[1].motivo) && !/agente/.test(hits[0].motivo), 'y se dice quién lo dedujo', hits[1].motivo);
    ok(hits[1].puntuacion >= hits[0].puntuacion * 0.85, 'pesa poco: desempata, no lo esconde');
    let r = m.guardarHecho(F, { dimension: 'proyecto.hosting-api', valor: 'vercel' }, { ahora: T(F, 60) });
    ok(r.accion === 'ya-estaba' && r.hecho.fuente === 'usuario' && r.hecho.confirmado && m.todosLosHechos(F).length === 2, 'si luego lo afirma el usuario, sube a «usuario» sin duplicar');
    ok(m.guardarHecho(F, { dimension: 'proyecto.cdn', valor: 'Bunny', fuente: 'inventada' }, { ahora: T(F, 61) }).hecho.fuente === 'usuario', 'una fuente desconocida cuenta como usuario');
    ok(ded.id === r.hecho.id, '(es el mismo hecho)');

    // la duda frente a lo afirmado
    m.guardarHecho(F, { dimension: 'identidad.ciudad', valor: 'Málaga' }, { ahora: T(F, 100) });
    r = m.guardarHecho(F, { dimension: 'identidad.ciudad', valor: 'Valencia', duda: true }, { ahora: T(F, 110) });
    ok(r.accion === 'dudoso' && r.avisos.length === 1 && r.avisos[0].tipo === 'contradice' && r.avisos[0].hecho.valor === 'Málaga' && /la duda no lo sustituye/.test(r.avisos[0].motivo), 'guardar una duda que contradice lo afirmado: avisa', JSON.stringify(r.avisos));
    hits = m.buscarHechos(F, 'ciudad');
    ok(hits[0].hecho.valor === 'Málaga' && hits[1].hecho.valor === 'Valencia', 'lo afirmado va antes que la duda');
    r = m.guardarHecho(F, { dimension: 'identidad.ciudad', valor: 'VALENCIA' }, { ahora: T(F, 120) });
    const ciudad = m.todosLosHechos(F).filter(h => h.dimension === 'identidad.ciudad');
    ok(r.accion === 'sustituye' && r.hecho.estado === 'activo' && ciudad.length === 2 && ciudad.find(h => h.valor === 'Málaga').estado === 'sustituido', 'afirmar lo que era duda: se confirma y sustituye a lo anterior', JSON.stringify(ciudad.map(h => [h.valor, h.estado])));
    m.guardarHecho(F, { dimension: 'identidad.barrio', valor: 'El Palo', duda: true }, { ahora: T(F, 130) });
    m.guardarHecho(F, { dimension: 'identidad.barrio', valor: 'Pedregalejo' }, { ahora: T(F, 140) });
    ok(m.buscarHechos(F, 'barrio').map(x => x.hecho.valor).join() === 'Pedregalejo', 'lo afirmado sustituye también a una duda distinta (no quedan dos vigentes)');

    // casi-duplicados: misma familia, dicho de otra manera, en cualquier escritura
    m.guardarHecho(F, { dimension: 'aprendizaje.webhooks', valor: 'los webhooks de Stripe llegan duplicados: guardar event.id' }, { ahora: T(F, 200) });
    r = m.guardarHecho(F, { dimension: 'aprendizaje.stripe', valor: 'Los webhooks de stripe llegan DUPLICADOS, guarda el event id' }, { ahora: T(F, 210) });
    ok(r.avisos.length === 1 && r.avisos[0].tipo === 'casi-duplicado' && r.avisos[0].hecho.dimension === 'aprendizaje.webhooks' && r.avisos[0].parecido >= 0.6, 'avisa de un casi duplicado en la familia', JSON.stringify(r.avisos));
    r = m.guardarHecho(F, { dimension: 'nota.stripe', valor: 'los webhooks de Stripe llegan duplicados: guardar event.id' }, { ahora: T(F, 220) });
    ok(r.avisos.length === 0, 'en otra familia no es un duplicado (nota no es aprendizaje)');
    r = m.guardarHecho(F, { dimension: 'aprendizaje.colas', valor: 'las colas de Horizon necesitan reiniciarse tras desplegar' }, { ahora: T(F, 230) });
    ok(r.avisos.length === 0, 'lo que no se parece no avisa');
    r = m.guardarHecho(F, { dimension: 'preferencia.gestor', valor: 'pnpm' }, { ahora: T(F, 240) });
    r = m.guardarHecho(F, { dimension: 'preferencia.runtime', valor: 'npm' }, { ahora: T(F, 241) });
    ok(r.avisos.length === 0, 'valores cortos parecidos pero distintos (npm / pnpm) no son duplicados', JSON.stringify(r.avisos));
    m.guardarHecho(F, { dimension: 'aprendizaje.deploy', valor: 'ステージングはNetlifyにデプロイする' }, { ahora: T(F, 250) });
    r = m.guardarHecho(F, { dimension: 'aprendizaje.staging', valor: 'ステージングはNetlifyへデプロイする' }, { ahora: T(F, 251) });
    ok(r.avisos.some(a => a.tipo === 'casi-duplicado' && a.hecho.dimension === 'aprendizaje.deploy'), 'también en japonés (trigramas de caracteres)', JSON.stringify(r.avisos));
    const olv = m.guardarHecho(F, { dimension: 'aprendizaje.cache', valor: 'limpiar la caché de config tras cambiar el .env' }, { ahora: T(F, 260) }).hecho;
    m.olvidarHecho(F, olv.id);
    r = m.guardarHecho(F, { dimension: 'aprendizaje.config', valor: 'limpiar la caché de config tras cambiar el .env.' }, { ahora: T(F, 270) });
    ok(r.avisos.length === 0, 'lo olvidado no cuenta como duplicado');
    ok(m.parecido('Málaga', 'MALAGA') === 1 && m.parecido('', 'x') === 0, 'parecido: normalizado y sin dividir por cero');

    // otro alcance con otro valor de la misma dimensión
    const u = m.guardarHecho(F, { dimension: 'preferencia.tabulacion-f6t4', valor: 'tabuladores', alcance: 'usuario' }, { ahora: T(F, 300) }).hecho;
    r = m.guardarHecho(F, { dimension: 'preferencia.tabulacion-f6t4', valor: '2 espacios' }, { ahora: T(F, 310) });
    ok(r.accion === 'nuevo' && r.avisos.some(a => a.tipo === 'contradice' && /alcance usuario/.test(a.motivo)), 'el proyecto contradice lo del usuario en todos sus proyectos: avisa (y no lo sustituye)', JSON.stringify(r.avisos));
    m.olvidarHecho(F, u.id);

    // CLI
    const cliF = (...a) => spawnSync(process.execPath, [CLI, '--path', F, ...a], { encoding: 'utf8', env: process.env }).stdout;
    let o = cliF('--guardar', '--dimension', 'aprendizaje.colas-2', '--valor', 'las colas de Horizon necesitan reiniciarse tras desplegar!', '--fuente', 'agente');
    ok(/ojo, casi duplicado \(se parece un \d+ %\).*aprendizaje\.colas\b.*--olvidar/.test(o), 'CLI: avisa del casi duplicado y de qué hacer', o);
    ok(m.todosLosHechos(F).find(h => h.dimension === 'aprendizaje.colas-2').fuente === 'agente', 'CLI: --fuente agente se guarda');
    o = cliF('--guardar', '--dimension', 'identidad.ciudad', '--valor', 'Sevilla', '--duda');
    ok(/ojo, contradice .*Valencia.*pregunta al usuario/.test(o), 'CLI: avisa de la contradicción y pide preguntar', o);
}

// 3g. relevancia por uso y enfriamiento (F6-T5), con la fecha inyectada: determinista
{
    const U = proyecto('uso');
    const D = n => new Date(Date.UTC(2026, 9, 7) + n * 864e5).toISOString();   // día n desde el 7-10-2026
    const pu = (h, dia) => +m.pesoUso(h, D(dia)).toFixed(3);
    ok(pu({ creado: D(0) }, 0) === 1 && pu({ creado: D(0) }, 90) === 1, 'sin usos y templado (≤90 días): ×1');
    ok(pu({ creado: D(0) }, 455) === 0.9 && pu({ creado: D(0) }, 3000) === 0.9, 'un año más sin usarse: ×0,9 y no baja de ahí');
    ok(pu({ creado: D(0), usos: 7 }, 0) === 1.12 && pu({ creado: D(0), usos: 1000 }, 0) === 1.12 && pu({ creado: D(0), usos: 1 }, 0) === 1.04, 'el uso sube poco y con techo (×1,04 … ×1,12)');
    ok(pu({ creado: D(0), ultimo_uso: D(400) }, 420) === 1, 'usado hace poco: no se enfría aunque sea viejo');
    ok(pu({ creado: D(0), usos: 'x' }, 0) === 1, 'un contador estropeado no rompe nada');

    // desempate por uso: misma forma; el usado es el MÁS ANTIGUO (el desempate por fecha favorecería al otro)
    const a = m.guardarHecho(U, { dimension: 'proyecto.pasarela-web', valor: 'Stripe' }, { ahora: D(0) }).hecho;
    m.guardarHecho(U, { dimension: 'proyecto.pasarela-tpv', valor: 'Redsys' }, { ahora: D(1) });
    ok(m.buscarHechos(U, 'pasarela', { ahora: D(2) })[0].hecho.valor === 'Redsys', '(sin usos: el más reciente delante)');
    ok(m.anotarUso(U, [a.id, a.id, 'h-noexiste'], { ahora: D(2) }) === 1, 'anotarUso: una vez por llamada aunque se repita; lo que no existe se ignora');
    m.anotarUso(U, [a.id], { ahora: D(3) });
    const ga = m.todosLosHechos(U).find(h => h.id === a.id);
    ok(ga.usos === 2 && ga.ultimo_uso === D(3), 'apunta cuántas veces y cuándo', JSON.stringify(ga));
    ok(m.buscarHechos(U, 'pasarela', { ahora: D(4) })[0].hecho.valor === 'Stripe', 'lo usado sube en un empate');

    // enfriamiento: lo que nadie usa en meses cede ante lo igual de relevante y reciente; sin esconderse
    const V = proyecto('enfria');
    m.guardarHecho(V, { dimension: 'proyecto.hosting-viejo', valor: 'Hetzner' }, { ahora: D(0) });
    m.guardarHecho(V, { dimension: 'proyecto.hosting-nuevo', valor: 'Fly' }, { ahora: D(500) });
    let hits = m.buscarHechos(V, 'hosting', { ahora: D(501) });
    ok(hits.length === 2 && hits[0].hecho.valor === 'Fly' && hits[1].puntuacion >= hits[0].puntuacion * 0.89, 'lo frío cede, pero sigue ahí (×0,9 como mucho)', hits.map(x => x.hecho.valor + ' ' + x.puntuacion).join(' | '));
    const solo = proyecto('enfria-solo');
    m.guardarHecho(solo, { dimension: 'identidad.nombre', valor: 'Lucía Ferrer', claves: ['nombre', 'name', 'llama'] }, { ahora: D(0) });
    const h1 = m.buscarHechos(solo, '¿cómo se llama el usuario? nombre', { ahora: D(2000) })[0];
    ok(h1 && h1.puntuacion >= m.UMBRAL_RECUERDO, 'un hecho viejo y sin usar que viene al caso sigue pasando el umbral de inyección', String(h1 && h1.puntuacion));
    const sinFecha = m.buscarHechos(V, 'hosting', { ahora: D(501) }).map(x => x.puntuacion).join();
    ok(sinFecha === hits.map(x => x.puntuacion).join(), 'misma entrada y misma fecha: misma salida');

    // contexto al iniciar: por actividad (creado o usado)
    const W = proyecto('actividad');
    const viejo = m.guardarHecho(W, { dimension: 'preferencia.tests', valor: 'Pest' }, { ahora: D(0) }).hecho;
    m.guardarHecho(W, { dimension: 'preferencia.css', valor: 'Tailwind' }, { ahora: D(10) });
    ok(m.contextoHechos(W, { ahora: D(11) })[0].valor === 'Tailwind', '(contexto: lo más reciente primero)');
    m.anotarUso(W, [viejo.id], { ahora: D(20) });
    ok(m.contextoHechos(W, { ahora: D(21) })[0].valor === 'Pest', 'lo que se sigue usando no se cae del contexto al iniciar');

    // cerrojo ocupado: anotar un uso no espera ni rompe (los hooks no pueden quedarse colgados)
    const lock = m.rutaHechos(W) + '.lock';
    fs.writeFileSync(lock, '999');
    const t0 = Date.now(); let n = -1, err = null;
    try { n = m.anotarUso(W, [viejo.id], { ahora: D(30) }); } catch (e) { err = e; }
    ok(!err && n === 0 && Date.now() - t0 < 3000, 'con el almacén ocupado, el uso se pierde sin esperar ni fallar', `${n} ${Date.now() - t0}ms ${err}`);
    fs.rmSync(lock, { force: true });

    // la CLI apunta lo que entrega
    const cliU = (...x) => spawnSync(process.execPath, [CLI, '--path', U, ...x], { encoding: 'utf8', env: process.env }).stdout;
    cliU('--buscar', 'Redsys');
    ok(m.todosLosHechos(U).find(h => h.valor === 'Redsys').usos === 1, 'CLI: --buscar apunta un uso de lo que enseña');
    cliU('--recordar', 'Redsys');
    ok(m.todosLosHechos(U).find(h => h.valor === 'Redsys').usos === 2, 'CLI: --recordar también');
}

// 3h. saber que no sabe (X-T2): la pregunta nombra algo que la memoria no conoce y solo roza una palabra
{
    const S = proyecto('no-sabe');
    m.guardarHecho(S, { dimension: 'proyecto.tests', valor: 'pruebas unitarias con Pest', claves: ['tests', 'testing'] }, { ahora: T(S, 0) });
    m.guardarHecho(S, { dimension: 'proyecto.hosting', valor: 'servidor de producción en Hetzner', claves: ['hosting', 'servidor'] }, { ahora: T(S, 1) });
    m.guardarHecho(S, { dimension: 'proyecto.pagos', valor: 'Stripe con webhooks firmados', claves: ['pagos', 'payments'] }, { ahora: T(S, 2) });
    const v = new Set(['api', 'stripe', 'pagos']);
    ok(m.nombresDesconocidos('¿usamos PHP 8 en GitHub con la API y php8?', v).join() === 'PHP,GitHub,php8', 'nombres: siglas, mayúsculas por dentro y letras con cifras; lo que ya se conoce (API), no', m.nombresDesconocidos('¿usamos PHP 8 en GitHub con la API y php8?', v).join());
    ok(m.nombresDesconocidos('¿tenemos pruebas end to end con Playwright?', v).join() === 'Playwright', 'nombres: mayúscula inicial que no abre la frase');
    ok(m.nombresDesconocidos('Wie heißt der Kunde des Projekts?', new Set()).length === 0, 'en alemán (todos los sustantivos en mayúscula) no se toma la mayúscula inicial como nombre');
    ok(m.nombresDesconocidos('東京に住んでいます', new Set()).length === 0 && m.nombresDesconocidos('', v).length === 0, 'sin mayúsculas (o sin pregunta) no se inventa nada');
    ok(m.nombresDesconocidos('¿usamos Markdown?', new Set(['market'])).join() === 'Markdown', 'para nombres no vale la raíz común («markdown» no es «market»)');
    const sobre = q => m.buscarHechos(S, q).filter(x => x.puntuacion >= m.UMBRAL_RECUERDO);
    ok(sobre('¿tenemos pruebas end to end con Playwright?').length === 0, 'pregunta por Playwright, que no conoce: no inyecta «pruebas con Pest»');
    ok(sobre('¿qué versión de PHP hay en el servidor de staging?').length === 0, 'pregunta por PHP: no inyecta el servidor de Hetzner');
    const todos = m.buscarHechos(S, '¿tenemos pruebas end to end con Playwright?');
    ok(todos.length && /nombra «Playwright», que la memoria no conoce/.test(todos[0].motivo), 'pero --buscar sigue enseñándolo, con el motivo', todos[0] && todos[0].motivo);
    ok(sobre('¿cómo cobramos los pagos con Stripe?').length === 1, 'si el nombre SÍ lo conoce, responde');
    ok(sobre('¿qué tests corren con Pest?')[0]?.hecho.dimension === 'proyecto.tests', 'si coincide más de una palabra, el nombre desconocido no importa');
    ok(sobre('¿dónde está el servidor?')[0]?.hecho.dimension === 'proyecto.hosting', 'una pregunta corta sin nombres sigue respondiendo');
}

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

// 7b. recuerdo UNIFICADO: hechos + MEMORIA.md + devlog (F1-T1)
const R = proyecto('recuerdo');
fs.mkdirSync(path.join(R, 'senzu', 'devlog', '2026-10-01'), { recursive: true });
fs.writeFileSync(path.join(R, 'senzu', 'devlog', 'MEMORIA.md'), '# Memoria del proyecto\n\n## Decisiones vigentes\n- D-001 · Pagos con Stripe y webhooks idempotentes (una clave por evento) · ver 001\n');
fs.writeFileSync(path.join(R, 'senzu', 'devlog', '2026-10-01', '001-pagos-stripe.md'), '# 001 — Pagos con Stripe\n\n- **Fecha/hora:** 2026-10-01\n- **Tipo:** feature\n\n## Qué se hizo\n- Checkout de Stripe y webhook con idempotencia por event.id.\n\n## Decisiones (resumen)\n- D-001 · Pagos con Stripe y webhooks idempotentes (una clave por evento) · ver 001\n');
m.guardarHecho(R, { dimension: 'proyecto.pasarela-pago', valor: 'Stripe', texto: 'cobramos con Stripe en modo test', claves: ['pagos', 'payments', 'pasarela'] }, { ahora: T(R, 0) });
let rec = m.recuerdo(R, 'pagos stripe webhooks');
ok(rec.some(x => x.fuente === 'hecho' && x.hecho.valor === 'Stripe') && rec.some(x => x.fuente === 'memoria') && rec.some(x => x.fuente === 'devlog'), 'recuerdo: las tres fuentes en una consulta', JSON.stringify(rec.map(x => x.fuente)));
ok(rec.filter(x => /D-001/.test(x.texto)).length === 1 && rec.find(x => /D-001/.test(x.texto)).fuente === 'memoria', 'recuerdo: una decisión que sale en MEMORIA y en su entrada cuenta una vez (la vigente)', JSON.stringify(rec.map(x => [x.fuente, x.texto.slice(0, 30)])));
ok(rec[0].fuente === 'hecho' && rec.every(x => x.motivo), 'recuerdo: reparto por turnos entre fuentes y cada uno con su motivo');
ok(m.recuerdo(R, 'which payment gateway?').some(x => x.fuente === 'hecho' && x.hecho.valor === 'Stripe'), 'recuerdo: en inglés encuentra el hecho (claves), aunque el devlog esté en español');
ok(m.recuerdo(R, 'zzzz qwerty').length === 0, 'recuerdo: sin coincidencias en ninguna fuente, vacío');
ok(m.recuerdo(proyecto('vacio'), 'pagos').length === 0, 'recuerdo: proyecto sin devlog ni hechos, vacío y sin error');
fs.writeFileSync(path.join(base, 'buscador-roto.mjs'), 'process.stdout.write("esto no es JSON")\n');
process.env.SENZU_BUSCADOR = path.join(base, 'buscador-roto.mjs');
rec = m.recuerdo(R, 'pagos stripe');
ok(rec.length >= 1 && rec.every(x => x.fuente === 'hecho'), 'recuerdo: si el buscador del devlog falla, quedan los hechos (no se cae)', JSON.stringify(rec.map(x => x.fuente)));
delete process.env.SENZU_BUSCADOR;
const rc = spawnSync(process.execPath, [CLI, '--path', R, '--recordar', 'pagos stripe webhooks'], { encoding: 'utf8', env: process.env }).stdout;
ok(/\[hecho\] \[proyecto\.pasarela-pago\] Stripe/.test(rc) && /\[memoria\] D-001/.test(rc) && !/ver 001 · ver 001/.test(rc), 'CLI: --recordar con fuentes y sin «ver» repetido', rc);

// 7c. enlace con la entrada del devlog del día (F1-T2)
const E = proyecto('enlace');
const diaLocal = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
fs.mkdirSync(path.join(E, 'senzu', 'devlog', diaLocal(T(E, 0))), { recursive: true });
for (const n of ['005-uno.md', '012-dos.md', 'DECISIONES.md', 'notas.txt']) fs.writeFileSync(path.join(E, 'senzu', 'devlog', diaLocal(T(E, 0)), n), '# x\n');
fs.mkdirSync(path.join(E, 'senzu', 'devlog', '2020-01-01'), { recursive: true });
fs.writeFileSync(path.join(E, 'senzu', 'devlog', '2020-01-01', '099-viejo.md'), '# viejo\n');
let en = m.guardarHecho(E, { dimension: 'proyecto.cliente', valor: 'Cerámicas Sol' }, { ahora: T(E, 0) });
ok(en.hecho.devlog === '012', 'el hecho apunta a la entrada de ese día con el número más alto (no a otro día ni a DECISIONES.md)', en.hecho.devlog);
en = m.guardarHecho(E, { dimension: 'proyecto.dominio', valor: 'ceramicassol.es', devlog: '005' }, { ahora: T(E, 1) });
ok(en.hecho.devlog === '005', 'se puede indicar la entrada a mano');
const sinDia = m.guardarHecho(E, { dimension: 'proyecto.hosting', valor: 'Netlify' }, { ahora: '2019-05-05T10:00:00.000Z' });
ok(sinDia.hecho.devlog === undefined, 'sin entrada ese día, sin enlace (no inventa uno)');
ok((m.recuerdo(E, 'cliente Cerámicas').find(x => x.fuente === 'hecho') || {}).ver === '012', 'el recuerdo enseña «ver NNN» del hecho');
ok(/ver 012/.test(spawnSync(process.execPath, [CLI, '--path', E, '--lista'], { encoding: 'utf8', env: process.env }).stdout), 'CLI: --lista enseña el enlace');

// 7d. coherencia: decisiones de MEMORIA.md que citan un valor ya sustituido (F1-T3)
const O = proyecto('obsoletas');
fs.mkdirSync(path.join(O, 'senzu', 'devlog'), { recursive: true });
fs.writeFileSync(path.join(O, 'senzu', 'devlog', 'MEMORIA.md'), [
    '# Memoria del proyecto', '', '## Decisiones vigentes',
    '- D-001 · Stack: Laravel 10 con Inertia y Vue; nada de Livewire',
    '- D-002 · Front en Vue con Pinia para el estado global',
    '- D-003 · Hosting en Forge sobre un VPS de Hetzner',
    '- D-004 · Respuestas en español, sí o sí',
    '- D-005 · Ya migrado: Laravel 11 en producción y Laravel 10 retirado',
    '', '## Lo que no funcionó (no repetir)', '- Laravel 10 con PHP 8.4 en local: no arranca', ''].join('\r\n'));   // CRLF a propósito
const sus = (dim, a, b, extra = {}) => { m.guardarHecho(O, { dimension: dim, valor: a, ...extra }, { ahora: T(O, 0) }); m.guardarHecho(O, { dimension: dim, valor: b, ...extra }, { ahora: T(O, 1) }); };
sus('proyecto.stack', 'Laravel 10', 'Laravel 11');
sus('proyecto.front', 'Vue', 'React');
sus('preferencia.confirmacion', 'sí', 'no');
sus('proyecto.hosting', 'Hetzner', 'Hetzner Cloud');
const obs = m.decisionesObsoletas(O);
const ids = obs.map(o => o.decision).sort().join(',');
ok(obs.some(o => o.decision === 'D-001' && o.valorViejo === 'Laravel 10' && o.valorNuevo === 'Laravel 11'), 'avisa: D-001 cita «Laravel 10» y el stack ya es «Laravel 11»', JSON.stringify(obs));
ok(obs.some(o => o.decision === 'D-002') && obs.some(o => o.decision === 'D-001' && o.valorViejo === 'Vue'), 'un nombre propio corto («Vue») también cuenta', ids);
ok(!obs.some(o => o.decision === 'D-004'), 'una palabra corta y común («sí») no da avisos falsos', ids);
ok(!obs.some(o => o.decision === 'D-005'), 'si la decisión ya cita también el valor nuevo, no avisa', ids);
ok(!obs.some(o => o.decision === 'D-003'), 'un valor nuevo que PRECISA al viejo («Hetzner» → «Hetzner Cloud») no deja obsoleta la decisión', ids);
ok(obs.every(o => /^D-00[12]$/.test(o.decision)), 'solo mira «Decisiones vigentes» (no «Lo que no funcionó»)', ids);
const mc = spawnSync(process.execPath, [path.join(ROOT, 'core', 'skills', 'devlog', 'scripts', 'memoria-check.mjs')], { cwd: O, encoding: 'utf8', env: process.env });
ok(mc.status === 1 && /D-001 cita «Laravel 10», pero el hecho proyecto\.stack ahora es «Laravel 11»/.test(mc.stdout), 'memoria-check lo enseña como aviso', mc.stdout);

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
