#!/usr/bin/env node
// Cortex (plan de Hemispheric, F7-T3): la memoria del proyecto en un HTML local.
// Lo que se prueba: que cada recuerdo cae en su zona; la historia, los enlaces y los cambios de la semana; que la
// vista para el CLIENTE no contiene nada privado (se busca en el ARCHIVO, no en la pantalla: el archivo se manda);
// que ningún valor puede romper la página (</script>); la CLI y su .gitignore; y, si hay Playwright
// (PLAYWRIGHT=<ruta>/playwright, CHROMIUM=<exe> opcional), que la página funciona en un navegador de verdad.
//   node tools/test-cortex.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-cortex-'));
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario', 'memoria.md');
const m = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'hechos.mjs')).href);
const { htmlCortex } = await import(pathToFileURL(path.join(ROOT, 'core', 'skills', 'devlog', 'scripts', 'cortex.mjs')).href);
const CLI = path.join(ROOT, 'core', 'skills', 'devlog', 'scripts', 'memoria.mjs');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FALLO ${n}${d ? ' -> ' + d : ''}\n`); } };
const proyecto = n => { const d = path.join(base, n); fs.mkdirSync(path.join(d, 'senzu', 'devlog'), { recursive: true }); fs.writeFileSync(path.join(d, 'senzu', 'senzu.json'), '{}'); return d; };
const AHORA = '2026-10-07T12:00:00.000Z';
const T = dias => new Date(Date.parse(AHORA) - dias * 864e5).toISOString();
const g = (P, e, dias) => m.guardarHecho(P, e, { ahora: T(dias) }).hecho;
const datosDe = html => JSON.parse(/<script type="application\/json" id="datos-cortex">([\s\S]*?)<\/script>/.exec(html)[1]);

// ---------------------------------------------------------------- un proyecto con de todo
const P = proyecto('ceramicas');
fs.writeFileSync(path.join(P, 'senzu', 'devlog', 'MEMORIA.md'), [
    '# Memoria', '', '## Decisiones vigentes', '- D-004 · Los pagos, solo por Stripe · ver 031', '- D-007 · Código y commits en español', '',
    '## Reglas del cliente y del proyecto', '- Nada de carruseles en la home.', '', '## Lo que no funcionó (no repetir)', '- Lo de PayPal: comisiones.', ''].join('\n'));
fs.writeFileSync(path.join(P, 'senzu', 'devlog', 'INDEX.md'), ['| Nº | Fecha | Título | Tipo |', '|---|---|---|---|',
    ...Array.from({ length: 15 }, (_, i) => `| ${String(i + 1).padStart(3, '0')} | 2026-09-${String(10 + i).padStart(2, '0')} | Entrada interna número ${i + 1} | feature |`)].join('\n'));
const objetivo = g(P, { dimension: 'objetivo.ventas', valor: 'Vender 200 piezas al mes' }, 20);
g(P, { dimension: 'pendiente.fotos', valor: 'Faltan las fotos de otoño' }, 21);
g(P, { dimension: 'pendiente.logo', valor: 'Revisar el logo con el cliente' }, 30);
m.cambiarProgreso(P, 'pendiente.logo', 'resuelto', 'aprobado el lunes', { ahora: T(2) });
g(P, { dimension: 'proyecto.hosting', valor: 'Netlify' }, 40);
const forge = g(P, { dimension: 'proyecto.hosting', valor: 'Laravel Forge', texto: 'nos pasamos a Forge', enlaces: ['proyecto.pagos'] }, 3);
g(P, { dimension: 'proyecto.pagos', valor: 'Stripe con webhooks firmados' }, 15);
g(P, { dimension: 'identidad.nombre', valor: 'Lucía Ferrer' }, 30);
g(P, { dimension: 'preferencia.gestor', valor: 'pnpm-secreto' }, 30);
g(P, { dimension: 'proyecto.tests', valor: 'Pest-deducido', fuente: 'agente' }, 10);
g(P, { dimension: 'proyecto.region', valor: 'Valencia-dudosa', duda: true }, 9);
g(P, { dimension: 'aprendizaje.webhooks', valor: 'Webhooks-duplicados-interno' }, 1);
g(P, { dimension: 'preferencia.editor', valor: 'vim-del-usuario', alcance: 'usuario' }, 30);
const olvidado = g(P, { dimension: 'proyecto.antiguo', valor: 'Olvidado-no-debe-salir' }, 30);
m.olvidarHecho(P, olvidado.id);
m.anotarUso(P, [forge.id, forge.id], { ahora: T(1) });

// ---------------------------------------------------------------- 1. zonas
const d = m.datosCortex(P, { ahora: AHORA });
const valores = z => d.zonas[z].map(x => x.valor);
ok(valores('frontal').includes('Vender 200 piezas al mes') && valores('frontal').includes('Faltan las fotos de otoño'), 'objetivos y pendientes → Lo que queremos conseguir', JSON.stringify(valores('frontal')));
ok(!valores('frontal').includes('Revisar el logo con el cliente'), 'lo resuelto ya no está entre lo vigente');
ok(valores('parietal').includes('Laravel Forge') && !valores('parietal').includes('Netlify'), 'el proyecto: solo el valor vigente (el viejo va en la historia)');
ok(valores('temporal').includes('Lucía Ferrer') && valores('temporal').includes('pnpm-secreto') && valores('temporal').includes('vim-del-usuario'), 'identidad, preferencias y el alcance usuario → Quién eres');
ok(valores('hipocampo').includes('Webhooks-duplicados-interno'), 'aprendizajes → Lo vivido');
ok(d.zonas.hipocampo.filter(x => x.tipo === 'entrada').length === 12 && d.zonas.hipocampo.find(x => x.tipo === 'entrada').devlog === '015', 'las 12 entradas más recientes del devlog → Lo vivido', d.zonas.hipocampo.filter(x => x.tipo === 'entrada').map(x => x.devlog).join());
ok(d.zonas.occipital.some(x => x.id === 'D-004' && x.devlog === '031') && d.zonas.occipital.some(x => x.id === 'D-007' && !x.devlog), 'decisiones vigentes de MEMORIA.md → Normas y decisiones (con su «ver»)');
ok(d.zonas.occipital.some(x => x.tipo === 'regla' && /carruseles/.test(x.valor)) && !d.zonas.occipital.some(x => /PayPal/.test(x.valor)), 'las reglas también; «lo que no funcionó» no es una norma');
ok(!JSON.stringify(d).includes('Olvidado-no-debe-salir'), 'lo olvidado no sale en ninguna parte');

// ---------------------------------------------------------------- 2. detalle: historia, enlaces, procedencia, usos
const h = d.zonas.parietal.find(x => x.valor === 'Laravel Forge');
ok(h.historia.map(x => x.valor).join(' → ') === 'Netlify → Laravel Forge' && h.historia[0].hasta, 'historia de la dimensión, de lo viejo a lo nuevo y con fechas', JSON.stringify(h.historia));
ok(h.texto === 'nos pasamos a Forge', 'cómo lo dijo');
ok(h.enlaces.length === 1 && h.enlaces[0].valor === 'Stripe con webhooks firmados', 'enlaces con el valor vigente del otro lado');
ok(d.zonas.parietal.find(x => x.valor === 'Stripe con webhooks firmados').enlaces.some(x => x.valor === 'Laravel Forge'), 'y en los dos sentidos');
ok(h.usos === 1 && h.ultimo_uso === T(1), 'usos (una vez por llamada) y último uso', `${h.usos} ${h.ultimo_uso}`);
const ded = d.zonas.parietal.find(x => x.valor === 'Pest-deducido'), dud = d.zonas.parietal.find(x => x.valor === 'Valencia-dudosa');
ok(ded.fuente === 'agente' && ded.privado && dud.estado === 'dudoso' && dud.privado, 'lo deducido y lo dudoso se marcan (y son privados para la vista de cliente)');
ok(!d.zonas.occipital.some(x => x.privado) && d.zonas.temporal.every(x => x.privado), 'las decisiones no son privadas; todo «Quién eres», sí');

// ---------------------------------------------------------------- 3. esta semana y lo abierto
const c = d.cambios;
ok(c.some(x => x.tipo === 'sustituido' && x.antes === 'Netlify' && x.ahora === 'Laravel Forge'), 'cambios: lo sustituido, con antes y ahora', JSON.stringify(c.map(x => x.tipo + ':' + x.ahora)));
ok(c.some(x => x.tipo === 'resuelto' && x.nota === 'aprobado el lunes'), 'cambios: lo resuelto, con su nota');
ok(c.some(x => x.tipo === 'aprendido' && x.ahora === 'Webhooks-duplicados-interno'), 'cambios: lo aprendido');
ok(!c.some(x => x.ahora === 'Stripe con webhooks firmados' || x.ahora === 'Vender 200 piezas al mes'), 'lo de hace más de 7 días no es un cambio de esta semana');
ok(c.every((x, i) => !i || c[i - 1].fecha >= x.fecha), 'lo más reciente primero');
ok(d.abiertos.map(x => x.valor).join('|') === 'Faltan las fotos de otoño|Vender 200 piezas al mes' && d.abiertos[0].dias === 21, 'abiertos: lo más antiguo primero, con sus días', JSON.stringify(d.abiertos));
ok(JSON.stringify(m.datosCortex(P, { ahora: AHORA })) === JSON.stringify(d), 'misma memoria y misma fecha: mismos datos');

// ---------------------------------------------------------------- 4. la vista para el CLIENTE no lleva NADA privado
// lo privado no está en ninguna parte del archivo; los nombres de campo y comandos, en ninguna parte salvo el CÓDIGO de la
// página (que es el mismo para todos y no lleva datos)
const PRIVADO = ['Lucía Ferrer', 'pnpm-secreto', 'vim-del-usuario', 'Pest-deducido', 'Valencia-dudosa', 'Webhooks-duplicados-interno', 'Entrada interna', 'memoria.mjs'];
const INTERNO = ['--olvidar', '--resolver', '"ultimo_uso"', '"usos"', '"devlog":'];
const dc = m.datosCortex(P, { ahora: AHORA, cliente: true });
const htmlC = htmlCortex(dc, { cli: CLI });
for (const s of PRIVADO) ok(!htmlC.includes(s), `cliente: el ARCHIVO no contiene «${s}»`);
// (los textos de la interfaz son públicos e iguales para todos: lo interno se busca en los DATOS y en el HTML visible)
const sinCodigo = htmlC.replace(/<script[^>]*id="textos-cortex"[^>]*>[^<]*<\/script>/, '').replace(/<script>[\s\S]*?<\/script>/, '');
for (const s of INTERNO) ok(!sinCodigo.includes(s), `cliente: ni los datos ni el HTML llevan «${s}»`);
ok(htmlC.includes('Laravel Forge') && htmlC.includes('Vender 200 piezas al mes') && htmlC.includes('Los pagos, solo por Stripe'), 'cliente: sí lleva el proyecto, los objetivos y las decisiones');
ok(datosDe(htmlC).cli === null && /<html[^>]*data-cliente/.test(htmlC) && !htmlC.includes('id="cliente"'), 'cliente: sin comandos, en modo cliente y sin el interruptor');
ok(!dc.zonas.temporal.length && !dc.zonas.hipocampo.length, 'cliente: Quién eres y Lo vivido, vacíos');
ok(dc.cambios.some(x => x.antes === 'Netlify') && !dc.cambios.some(x => x.tipo === 'aprendido'), 'cliente: los cambios del proyecto sí; lo aprendido, no');
const htmlD = htmlCortex(d, { cli: CLI });
ok(htmlD.includes('Lucía Ferrer') && datosDe(htmlD).cli === CLI && htmlD.includes('id="cliente"'), 'dueño: lo lleva todo, el comando y la vista previa de cliente');

const N = proyecto('con-nombre');
g(N, { dimension: 'proyecto.nombre', valor: 'Cerámicas Sol' }, 5);
ok(m.datosCortex(N, { ahora: AHORA }).proyecto === 'Cerámicas Sol' && d.proyecto === 'ceramicas', 'el título usa proyecto.nombre si la memoria lo sabe (si no, la carpeta)');

// ---------------------------------------------------------------- 5. ningún valor rompe la página
const X = proyecto('xss');
const malo = '</script><img src=x onerror=alert(1)><!--';
g(X, { dimension: 'proyecto.nombre', valor: malo, texto: '<b>negrita</b> & "comillas"' }, 1);
const hx = htmlCortex(m.datosCortex(X, { ahora: AHORA }), { cli: CLI });
ok(!hx.includes('</script><img') && !hx.includes('<img src=x'), 'un valor con </script> no cierra la etiqueta de datos');
ok(datosDe(hx).zonas.parietal[0].valor === malo && datosDe(hx).zonas.parietal[0].texto === '<b>negrita</b> & "comillas"', 'y el valor llega intacto (se pinta como texto)');
ok(!/innerHTML/.test(hx), 'la página no usa innerHTML para nada');
// (en Windows una carpeta no puede llamarse así; en Linux y macOS, sí)
ok(htmlCortex({ ...m.datosCortex(X, { ahora: AHORA }), proyecto: 'a<b>"c' }).includes('<title>Cortex · a&lt;b&gt;&quot;c</title>'), 'el nombre del proyecto se escapa en el título');

// ---------------------------------------------------------------- 6. vacío y CLI
const V = proyecto('vacio');
const antes = process.env.SENZU_MEMORIA_USUARIO;
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'usuario-vacio', 'memoria.md');   // la del usuario vale en TODOS sus proyectos
const dv = m.datosCortex(V, { ahora: AHORA });
process.env.SENZU_MEMORIA_USUARIO = antes;
ok(Object.values(dv.zonas).every(l => !l.length) && !dv.cambios.length && !dv.abiertos.length, 'una memoria vacía no rompe nada');
ok(/La memoria está vacía/.test(htmlCortex(dv)), 'y la página lo dice en llano');
const cli = (...a) => spawnSync(process.execPath, [CLI, '--path', P, ...a], { encoding: 'utf8', env: process.env });
let r = cli('--cortex', '--idioma', 'es');
const dir = path.join(P, 'senzu', 'cortex');
ok(r.status === 0 && fs.existsSync(path.join(dir, 'index.html')) && /Cortex: .*index\.html/.test(r.stdout) && /--cortex --cliente/.test(r.stdout), 'CLI --cortex: senzu/cortex/index.html y aviso de que es privado', r.stdout + r.stderr);
ok(/^\*$/m.test(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8')), 'la carpeta se ignora a sí misma en git (la memoria es privada)');
const git = spawnSync('git', ['init', '-q'], { cwd: P });
if (git.status === 0) {
    const st = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: P, encoding: 'utf8' }).stdout;
    ok(!/cortex\//.test(st), 'git status no enseña nada de senzu/cortex', st);
}
r = cli('--cortex', '--cliente');
ok(r.status === 0 && fs.existsSync(path.join(dir, 'cliente.html')) && !fs.readFileSync(path.join(dir, 'cliente.html'), 'utf8').includes('Lucía Ferrer'), 'CLI --cortex --cliente: cliente.html sin lo privado');
const sal = path.join(base, 'fuera');
r = cli('--cortex', '--salida', sal);
ok(r.status === 0 && fs.existsSync(path.join(sal, 'index.html')), 'CLI --salida');

// ---------------------------------------------------------------- 7. en un navegador de verdad (si hay Playwright)
if (process.env.PLAYWRIGHT) {
    const { chromium } = await import(pathToFileURL(path.join(process.env.PLAYWRIGHT, 'index.mjs')).href);
    const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
    for (const [ancho, alto] of [[1440, 900], [375, 812]]) {
        const p = await nav.newPage({ viewport: { width: ancho, height: alto } });
        const errores = []; p.on('pageerror', e => errores.push(e.message)); p.on('console', x => { if (x.type() === 'error') errores.push(x.text()); });
        await p.goto(pathToFileURL(path.join(dir, 'index.html')).href);
        const n = () => p.locator('#lista .hecho').count();
        ok(/Memoria de ceramicas/.test(await p.locator('h1').innerText()), `${ancho}: título con el proyecto`);
        const semana = await p.locator('#cambios-l').innerText();
        ok(/Netlify → Laravel Forge/.test(semana) && !/Webhooks: Webhooks/i.test(semana), `${ancho}: esta semana, sin repetir el tema que ya dice el texto`, semana);
        await p.locator('.chips [data-region="parietal"]').click();
        ok(await n() === 4, `${ancho}: la zona «El proyecto» filtra (4 vigentes: Forge, Stripe, lo deducido y lo dudoso)`, String(await n()));
        await p.locator('#lista .hecho').filter({ hasText: 'Laravel Forge' }).click();
        const det = await p.locator('#detalle').innerText();
        ok(/Netlify/.test(det) && /Stripe con webhooks firmados/.test(det) && /--olvidar/.test(det) && /nos pasamos a Forge/.test(det), `${ancho}: el detalle trae historia, enlaces, cómo se dijo y el comando`, det.slice(0, 300));
        await p.locator('.chips [data-region="parietal"]').click();
        await p.locator('#buscar').fill('stripe');
        ok(await n() >= 2, `${ancho}: el buscador filtra (hecho + decisión)`);
        await p.locator('#buscar').fill('qwertyzz');
        ok(await p.locator('#lista-vacia').isVisible() && /no lo sabe/.test(await p.locator('#lista-vacia').innerText()), `${ancho}: sin resultados lo dice, sin inventar`);
        await p.locator('#buscar').fill('');
        await p.locator('#cliente').click();
        ok(!/Lucía Ferrer|Pest-deducido|Webhooks-duplicados/.test(await p.locator('body').innerText()), `${ancho}: la vista previa de cliente oculta lo privado`);
        await p.locator('#cliente').click();
        await p.locator('#tema').click();
        ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light' && (await p.locator('#tema').innerText()) === 'Oscuro', `${ancho}: el primer toque cambia a claro`);
        await p.locator('[data-ir="3d"]').click(); await p.waitForTimeout(300);
        const pinta = await p.evaluate(() => { const c = document.getElementById('lienzo3d'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) k++; return k; });
        ok(pinta > 2000, `${ancho}: el 3D pinta`, String(pinta));
        // la interfaz en otro idioma (los datos, como se guardaron)
        await p.locator('#idioma').selectOption('en');
        ok(/Memory of ceramicas/.test(await p.locator('h1').innerText()) && (await p.locator('.chips [data-region="parietal"] span').innerText()) === 'The project' && (await p.locator('html').getAttribute('lang')) === 'en', `${ancho}: la interfaz cambia a inglés (título, zonas y lang)`);
        ok(/Laravel Forge/.test(await p.locator('#lista').innerText()), `${ancho}: los datos no se traducen`);
        await p.reload();
        ok((await p.locator('#idioma').inputValue()) === 'en', `${ancho}: el idioma elegido se recuerda`);
        await p.locator('#idioma').selectOption('es');
        ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${ancho}: sin desborde horizontal`);
        ok(!errores.length, `${ancho}: sin errores en la consola`, errores.join(' | '));
        await p.close();
    }
    const p = await nav.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(pathToFileURL(path.join(dir, 'cliente.html')).href);
    ok(!(await p.locator('.chips [data-region="temporal"]').isVisible()) && !(await p.locator('#cliente').count()), 'cliente.html: sin la zona «Quién eres» en los chips ni el interruptor');
    await p.locator('#lista .hecho').first().click();
    ok(!(await p.locator('#d-cmd-p').isVisible()), 'cliente.html: el detalle no enseña comandos');
    await nav.close();
} else process.stdout.write('(navegador omitido: define PLAYWRIGHT para probar la página en Chromium)\n');

fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
