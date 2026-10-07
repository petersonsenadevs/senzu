// Cortex (F7-T3/T4): la memoria del proyecto como un HTML local, autocontenido y sin red, con el diseño elegido en las
// rondas (plan/design-system/cortex/MASTER.md: «Nocturno» + 2D «Neón de línea» + 3D de puntos con giro libre).
// Lo usa `memoria.mjs --cortex [--cliente] [--idioma xx]`; los datos salen de hechos.mjs → datosCortex() (con --cliente,
// lo privado ni siquiera entra en el archivo). Todo texto de la memoria se pinta con textContent: nunca como HTML.
// La interfaz habla el idioma del navegador (o el de --idioma, o el que se elija): textos en cortex-textos.mjs.
import { TEXTOS } from './cortex-textos.mjs';

// ---------------------------------------------------------------- 2D: vista lateral (delante a la izquierda)
// Frontal y parietal separados por el surco central; el temporal, por debajo de la cisura de Silvio (con aire); el
// hipocampo, dentro del temporal; cerebelo con sus láminas y tronco del encéfalo.
const ZONAS = [
    ['frontal', 'M62,178 C40,150 42,100 78,68 C104,45 140,34 176,34 L188,36 C186,70 182,104 176,132 C150,138 118,146 96,160 C84,168 72,174 62,178Z'],
    ['parietal', 'M188,36 C236,34 282,48 312,74 C300,98 286,114 268,124 C238,126 206,128 176,132 C182,104 186,70 188,36Z'],
    ['occipital', 'M312,74 C338,96 352,126 350,154 C348,172 340,184 328,190 C312,170 292,146 268,124 C286,114 300,98 312,74Z'],
    ['temporal', 'M102,172 C122,158 150,148 180,144 C214,140 246,138 272,140 C292,152 310,170 322,193 C298,210 262,220 222,222 C176,224 136,218 114,204 C102,196 98,184 102,172Z'],
    ['hipocampo', 'M157,196 C173,175 210,169 241,173 C265,176 277,190 273,204 C265,217 241,219 222,213 C206,209 192,212 180,219 C164,224 155,212 157,196Z'],
];
const SURCOS = {
    frontal: ['M70,140 C80,120 96,124 104,108 C112,92 128,96 136,80', 'M92,70 C104,82 120,76 132,64 C142,54 156,58 166,48', 'M118,130 C128,118 142,124 150,110 C158,96 170,100 174,86', 'M56,160 C68,150 82,154 92,144'],
    parietal: ['M200,52 C212,64 226,58 238,68 C250,78 262,72 276,80', 'M196,98 C210,88 224,96 238,88 C252,80 266,88 282,84', 'M202,120 C218,112 234,118 252,112'],
    occipital: ['M316,96 C326,108 324,122 334,132', 'M298,128 C310,136 312,152 324,160', 'M330,160 C336,170 334,178 340,184'],
    temporal: ['M116,190 C130,180 142,188 154,178', 'M276,160 C288,168 294,180 306,186', 'M188,156 C208,152 228,158 250,152'],
    hipocampo: ['M172,200 C190,188 214,184 240,188 C256,190 262,198 254,204'],
};
const NEUTRO = '<path class="cerebelo" d="M300,206 C326,198 356,206 360,226 C358,246 328,256 300,248 C284,240 284,214 300,206Z"/>'
    + '<path class="laminas" d="M292,220 C312,214 336,216 354,222 M290,232 C312,228 336,230 356,236 M296,244 C314,242 332,244 348,246"/>'
    + '<path d="M238,222 C246,246 250,268 248,292 L230,292 C230,270 226,248 220,224Z"/>'
    + '<path class="cisura" d="M188,36 C186,70 182,104 176,132 M96,160 C130,148 170,140 210,136 C236,134 256,134 270,138"/>';
const ETIQUETAS = [['frontal', 78, 112], ['parietal', 214, 100], ['occipital', 296, 150], ['temporal', 190, 168], ['hipocampo', 192, 201]];

const cerebro = () => `<svg class="cerebro neon" viewBox="20 20 360 285" role="group" data-t-aria="ariaCerebro">
  <g class="neutro" aria-hidden="true">${NEUTRO}</g>
  ${ZONAS.map(([r, d]) => `<path class="respira" data-region="${r}" data-t-aria="zonas.${r}" d="${d}"/>`).join('\n  ')}
  <g aria-hidden="true">${Object.entries(SURCOS).map(([r, l]) => l.map(d => `<path class="surco-neon surco-${r}${r === 'hipocampo' ? ' fluye' : ''}" style="stroke:var(--r-${r})" d="${d}"/>`).join('')).join('')}</g>
  <g class="etiquetas" aria-hidden="true">${ETIQUETAS.map(([r, x, y]) => `<g class="etq-neon etq-${r}"><circle cx="${x - 7}" cy="${y - 4}" r="3" style="fill:var(--r-${r})"/><text x="${x}" y="${y}" data-t="etq.${r}"></text></g>`).join('')}</g>
</svg>`;

const CSS = `
:root {
  --fondo: #0C0F13; --papel: #141920; --texto: #E8ECF1; --suave: #8B96A5; --linea: #232B36; --foco: #F2C14E;
  --r-frontal: #FF7A59; --r-parietal: #3DD6C4; --r-occipital: #F2C14E; --r-temporal: #FF5C8A; --r-hipocampo: #9BE15D;
  --fuente-titulos: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif; --fuente-texto: 'Manrope', 'Segoe UI', system-ui, sans-serif; --radio: 999px;
  --halo: rgba(12, 15, 19, .85); --tinte: 10%;
  color-scheme: dark;
}
/* Claro: no es el oscuro invertido. Papel frío, colores más hondos para que contrasten, sin brillo (en claro, el brillo
   ensucia) y tinta oscura en los textos de color */
[data-theme="light"] {
  --fondo: #EEF1F5; --papel: #FFFFFF; --texto: #0F1722; --suave: #4D5868; --linea: #D5DBE3; --foco: #0B6E66;
  --r-frontal: #D9481F; --r-parietal: #00897B; --r-occipital: #B7791F; --r-temporal: #D61F69; --r-hipocampo: #3F8F12;
  --halo: rgba(255, 255, 255, .92); --tinte: 7%;
  color-scheme: light;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--texto); font: 16px/1.55 var(--fuente-texto); -webkit-font-smoothing: antialiased; }
h1, h2, h3 { font-family: var(--fuente-titulos); margin: 0; letter-spacing: -.02em; }
button, select { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible, select:focus-visible, input:focus-visible, .hecho:focus-visible, canvas:focus-visible, [data-region]:focus-visible { outline: 3px solid var(--foco); outline-offset: 2px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.escena { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(340px, 1fr); min-height: 100vh; }
.lienzo { position: relative; padding: 28px 32px; display: grid; grid-template-rows: auto 1fr auto; gap: 12px;
  background: radial-gradient(60% 55% at 45% 52%, color-mix(in srgb, var(--r-parietal) var(--tinte), transparent), transparent 70%), var(--fondo); }
.arriba { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.marca { font: 700 12px/1 var(--fuente-titulos); letter-spacing: .2em; text-transform: uppercase; color: var(--suave); }
.marca b { color: var(--r-temporal); font-weight: 700; }
h1 { font-size: clamp(30px, 4.4vw, 54px); font-weight: 700; line-height: 1.02; margin-top: 10px; overflow-wrap: anywhere; }
.cifras { margin: 8px 0 0; color: var(--suave); font-size: 15px; } .cifras b { color: var(--texto); }
.mandos { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.mandos button, .mandos select { border: 1px solid var(--linea); background: var(--papel); border-radius: var(--radio); padding: 9px 16px; min-height: 44px; font-weight: 700; font-size: 14px; }
.mandos select { padding-right: 12px; }
.mandos button[aria-pressed="true"] { background: var(--texto); color: var(--fondo); border-color: var(--texto); }
.escenario { display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; min-height: 340px; }
.escenario .v2d { width: min(100%, 680px); display: grid; align-content: center; justify-items: center; }
.escenario .v3d { width: 100%; max-width: 760px; display: grid; justify-items: center; }
.v3d canvas { width: 100%; height: 460px; display: block; touch-action: none; cursor: grab; }
.v3d canvas:active { cursor: grabbing; }
[data-vista="2d"] .v3d, [data-vista="3d"] .v2d { display: none !important; }
.dibujo { width: 100%; }
.pista { margin: 6px 0 0; text-align: center; color: var(--suave); font-size: 14px; max-width: 60ch; }
.cerebro { width: 100%; height: auto; display: block; overflow: visible; }
.cerebro [data-region] { cursor: pointer; opacity: var(--brillo, 1); transition: opacity .25s, fill-opacity .25s; outline: none;
  fill-opacity: .16; stroke-width: 2.4; stroke-linejoin: round; filter: drop-shadow(0 0 calc(var(--brillo, 1) * 9px) currentColor); }
${ZONAS.map(([r]) => `.cerebro [data-region="${r}"] { fill: var(--r-${r}); stroke: var(--r-${r}); color: var(--r-${r}); }`).join('\n')}
.cerebro [data-region="hipocampo"] { fill-opacity: .3; stroke-width: 3; }
.cerebro [data-region="hipocampo"]:not(.apagada) { opacity: 1 !important; animation: none; }
.cerebro [data-region]:hover { fill-opacity: .3; }
.cerebro [data-region][aria-pressed="true"] { fill-opacity: .42; }
.cerebro .vacia:not(.apagada) { opacity: .38 !important; }
.cerebro .apagada, .apagada { opacity: .14 !important; }
.cerebro [data-region]:focus-visible { stroke-width: 4; }
.cerebro .neutro path { fill: none; stroke: var(--linea); stroke-width: 2; stroke-linejoin: round; }
.cerebro .neutro .cerebelo { fill: color-mix(in srgb, var(--suave) 8%, transparent); }
.cerebro .neutro .laminas { stroke-width: 1.4; stroke-linecap: round; }
.cerebro .neutro .cisura { stroke: var(--suave); stroke-width: 1.2; stroke-dasharray: 2 4; stroke-linecap: round; opacity: .55; }
.cerebro .etiquetas { pointer-events: none; }
.etq-neon text { font: 700 12px var(--fuente-titulos); letter-spacing: .05em; fill: var(--texto); paint-order: stroke; stroke: var(--halo); stroke-width: 3.5px; stroke-linejoin: round; }
.surco-neon { fill: none; stroke-width: 1.7; stroke-linecap: round; opacity: .8; pointer-events: none; filter: drop-shadow(0 0 4px currentColor); }
.surco-neon.fluye, .surco-neon.activa { stroke-dasharray: 6 8; animation: fluye 1.6s linear infinite; opacity: 1; }
.surco-neon.fluye { stroke-width: 2.2; }
.cerebro .respira { animation: respira 4s ease-in-out infinite; }
@keyframes respira { 50% { opacity: calc(var(--brillo, 1) * .8); } }
@keyframes fluye { to { stroke-dashoffset: -28; } }
[data-theme="light"] .cerebro [data-region] { fill-opacity: .2; stroke-width: 2.4; filter: none; }
[data-theme="light"] .cerebro [data-region="hipocampo"] { fill-opacity: .32; }
[data-theme="light"] .cerebro [data-region][aria-pressed="true"] { fill-opacity: .4; }
[data-theme="light"] .surco-neon { filter: none; opacity: .9; }
[data-theme="light"] .cerebro .neutro .cisura { opacity: .7; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chips button { border: 1px solid var(--linea); background: var(--papel); border-radius: var(--radio); padding: 7px 12px 7px 10px; min-height: 44px; display: inline-flex; gap: 8px; align-items: center; font-size: 14px; transition: border-color .2s, box-shadow .2s; }
.chips button i { width: 10px; height: 10px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; }
.chips button span { color: var(--texto); }
.chips button[aria-pressed="true"] { border-color: currentColor; box-shadow: 0 0 0 1px currentColor inset; }
.chips b { color: var(--suave); font-weight: 600; font-variant-numeric: tabular-nums; }
[data-theme="light"] .chips button i { box-shadow: none; }
[data-cliente] .solo-dueno, [data-cliente] .chips [data-region="temporal"], [data-cliente] .etq-temporal { display: none !important; }
[data-cliente] .surco-temporal { opacity: .12; }
.panel { background: var(--papel); border-left: 1px solid var(--linea); padding: 24px; display: grid; gap: 24px; align-content: start; max-height: 100vh; overflow: auto; position: sticky; top: 0; }
.busca input { width: 100%; font: inherit; padding: 13px 18px; border-radius: var(--radio); border: 1px solid var(--linea); background: var(--fondo); color: var(--texto); }
.busca input::placeholder { color: var(--suave); }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .16em; color: var(--suave); font-weight: 700; margin-bottom: 10px; }
.cambios, .abiertos { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.cambios li, .abiertos li { display: grid; grid-template-columns: 14px 1fr; gap: 10px; font-size: 15px; }
.cambios li::before, .abiertos li::before { content: ""; width: 8px; height: 8px; margin-top: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c); }
.cambios small, .abiertos small { display: block; color: var(--suave); font-size: 12px; }
.vacio { color: var(--suave); font-size: 14px; margin: 0; }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.hecho { padding: 12px 16px 12px 18px; border-radius: 16px; background: var(--fondo); border: 1px solid var(--linea); display: grid; gap: 2px; cursor: pointer; position: relative; transition: border-color .2s, transform .2s; }
.hecho::before { content: ""; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: var(--c); box-shadow: 0 0 12px var(--c); }
.hecho:hover { border-color: var(--c); transform: translateX(2px); }
.h-tema { font: 700 12px var(--fuente-titulos); letter-spacing: .08em; text-transform: uppercase; color: var(--c); }
.h-valor { overflow-wrap: anywhere; }
.h-meta { font-size: 12px; color: var(--suave); }
[data-theme="light"] .h-tema, [data-theme="light"] .d-region { color: color-mix(in srgb, var(--c) 70%, #000); }
[data-theme="light"] .hecho::before, [data-theme="light"] .cambios li::before, [data-theme="light"] .abiertos li::before { box-shadow: none; }
.mas { border: 1px solid var(--linea); background: none; border-radius: var(--radio); padding: 8px 14px; min-height: 44px; }
.detalle { border-radius: 20px; padding: 18px; background: var(--fondo); border: 1px solid var(--c); box-shadow: 0 0 0 1px var(--c), 0 0 40px color-mix(in srgb, var(--c) 25%, transparent); }
[data-theme="light"] .detalle { box-shadow: 0 0 0 1px var(--c), 0 10px 30px rgba(15, 23, 34, .08); }
.detalle .cerrar { float: right; border: 0; background: none; color: var(--suave); min-width: 44px; min-height: 44px; font-size: 22px; margin: -10px -10px 0 0; }
.d-region { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--c); }
.detalle h3 { font-size: 24px; margin: 2px 0; } .d-valor { margin: 0 0 10px; font-size: 17px; overflow-wrap: anywhere; }
.d-dicho { margin: 0 0 10px; color: var(--suave); font-style: italic; }
.detalle dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 14px; margin: 0 0 8px; } .detalle dt { color: var(--suave); } .detalle dd { margin: 0; }
.detalle h4 { margin: 10px 0 4px; font-size: 12px; color: var(--suave); text-transform: uppercase; letter-spacing: .12em; }
.historia, .enlaces { margin: 0; padding-left: 18px; font-size: 14px; } .historia .viejo { color: var(--suave); text-decoration: line-through; }
.cmd { font-size: 13px; color: var(--suave); } .cmd code { display: block; margin-top: 4px; padding: 8px 12px; border-radius: 12px; background: var(--papel); color: var(--texto); overflow-wrap: anywhere; white-space: pre-wrap; }
.pie { font-size: 12px; color: var(--suave); margin: 0; }
@media (max-width: 860px) {
  .escena { grid-template-columns: 1fr; min-height: 0; }
  .lienzo { padding: 18px 16px; grid-template-rows: auto auto auto; }
  .escenario { min-height: 220px; } .v3d canvas { height: 340px; }
  .chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; }
  .chips button { flex: none; scroll-snap-align: start; }
  .mandos select, .busca input { font-size: 16px; }
  .panel { position: static; max-height: none; border-left: 0; border-top: 1px solid var(--linea); padding: 18px 16px 40px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

// El programa de la página (sin dependencias). Lee los datos y los textos de los <script type="application/json">.
const APP = String.raw`
(function () {
  var D = JSON.parse(document.getElementById('datos-cortex').textContent);
  var TX = JSON.parse(document.getElementById('textos-cortex').textContent);
  var ZONAS = ['frontal', 'parietal', 'occipital', 'temporal', 'hipocampo'];
  var raiz = document.documentElement, region = null, previa = !!D.cliente, filtro = '', PAGINA = innerWidth < 860 ? 12 : 40, limite = PAGINA;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var css = function (v) { return getComputedStyle(raiz).getPropertyValue(v).trim(); };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  // ---------------- idioma: el elegido (guardado), el de --idioma, el del navegador, o castellano
  var guardado = null; try { guardado = localStorage.getItem('cortex-idioma'); } catch (e) {}
  var delNavegador = (navigator.languages || [navigator.language || 'es']).map(function (l) { return String(l).slice(0, 2).toLowerCase(); }).filter(function (l) { return TX[l]; })[0];
  var L = [guardado, D.idioma, delNavegador, 'es'].filter(function (l) { return l && TX[l]; })[0];
  function t(clave, vars) {
    var ir = function (o) { return clave.split('.').reduce(function (a, k) { return a && a[k]; }, o); };
    var s = ir(TX[L]); if (s == null) s = ir(TX.en); if (s == null) s = ir(TX.es); if (s == null) s = clave;
    if (vars) Object.keys(vars).forEach(function (k) { s = String(s).split('{' + k + '}').join(vars[k]); });
    return s;
  }
  var nombreZona = function (z) { return t('zonas.' + z); };
  var fecha = function (iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? String(iso).slice(0, 10) : d.toLocaleDateString(L, { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); };
  function traducir() {
    raiz.lang = L;
    $$('[data-t]').forEach(function (e) { e.textContent = t(e.getAttribute('data-t')); });
    $$('[data-t-aria]').forEach(function (e) { e.setAttribute('aria-label', t(e.getAttribute('data-t-aria'))); });
    $$('[data-t-ph]').forEach(function (e) { e.setAttribute('placeholder', t(e.getAttribute('data-t-ph'))); });
    $$('[data-t-title]').forEach(function (e) { e.setAttribute('title', t(e.getAttribute('data-t-title'))); });
    $('#tema').textContent = raiz.getAttribute('data-theme') === 'light' ? t('oscuro') : t('claro');
    $('#pie').textContent = t('pie', { f: new Date(D.generado).toLocaleString(L) }) + ' ' + (D.cliente ? t('pieCliente') : t('pieDueno'));
  }
  var sel = $('#idioma');
  Object.keys(TX).forEach(function (k) { var o = el('option', '', TX[k].nombre); o.value = k; sel.appendChild(o); });
  sel.value = L;
  sel.addEventListener('change', function () { L = sel.value; try { localStorage.setItem('cortex-idioma', L); } catch (e) {} traducir(); todo(); var d = $('#detalle'); if (!d.hidden && ultimo) detalle(ultimo[0], ultimo[1]); });

  var visible = function (it) { return !previa || !it.privado; };
  var zonaVisible = function (z) { return !(previa && z === 'temporal'); };
  var items = function (z) { return (D.zonas[z] || []).filter(visible); };
  var peso = function (z) { return items(z).reduce(function (s, it) { return s + (it.usos || 0) + 1; }, 0); };
  var temaDe = function (it) { return it.tipo === 'entrada' ? t('entrada', { n: it.devlog }) : it.tipo === 'regla' ? t('regla') : it.tema; };

  function cabecera() {
    var total = ZONAS.reduce(function (s, z) { return s + items(z).length; }, 0);
    $('#titulo').textContent = t('titulo', { p: D.proyecto });
    var c = $('#cifras'); c.textContent = '';
    c.append(t('recuerda') + ' ', el('b', '', total + ' ' + (total === 1 ? t('cosa') : t('cosas'))), ' · ', el('b', '', D.cambios.filter(visible).length + ' ' + t('cambiosN')), ' ' + t('en7') + ' · ', el('b', '', D.abiertos.filter(visible).length + ' ' + t('abiertosN')));
  }
  function regiones() {
    var max = Math.max.apply(null, ZONAS.map(peso).concat([1]));
    $$('[data-region]').forEach(function (e) {
      var z = e.getAttribute('data-region');
      e.style.setProperty('--brillo', (0.5 + 0.5 * peso(z) / max).toFixed(2));
      e.classList.toggle('apagada', !zonaVisible(z) || (region !== null && region !== z));
      e.classList.toggle('vacia', items(z).length === 0);
      e.setAttribute('aria-pressed', region === z ? 'true' : 'false');
    });
    // los surcos de la zona elegida «fluyen»: la actividad de esa parte de la memoria
    $$('.surco-neon').forEach(function (s) { s.classList.toggle('activa', region !== null && s.classList.contains('surco-' + region)); });
    $$('[data-cuenta]').forEach(function (e) { e.textContent = items(e.getAttribute('data-cuenta')).length; });
  }
  function meta(it) {
    var m = [];
    if (it.tipo === 'decision') m.push(t('mDecision'));
    if (it.tipo === 'entrada') m.push(fecha(it.creado));
    if (it.fuente && it.fuente !== 'usuario' && it.tipo === 'hecho') m.push(it.fuente === 'agente' ? t('mAgente') : t('mDevlog'));
    if (it.estado === 'dudoso') m.push(t('dudoso'));
    if (it.progreso === 'en-curso') m.push(t('enCurso'));
    if (!previa && it.usos) m.push(it.usos + ' ' + (it.usos === 1 ? t('uso') : t('usos')));
    if (!previa && it.devlog && it.tipo !== 'entrada') m.push(t('ver') + ' ' + it.devlog);
    return m.join(' · ');
  }
  function lista() {
    var ul = $('#lista'); ul.textContent = '';
    var q = filtro, todos = [];
    (region ? [region] : ZONAS).filter(zonaVisible).forEach(function (z) {
      items(z).forEach(function (it) {
        if (q && [temaDe(it), it.valor, it.texto, it.dimension].join(' ').toLowerCase().indexOf(q) < 0) return;
        todos.push([z, it]);
      });
    });
    todos.slice(0, limite).forEach(function (p) {
      var z = p[0], it = p[1], li = el('li', 'hecho'); li.tabIndex = 0;
      li.style.setProperty('--c', 'var(--r-' + z + ')');
      li.append(el('span', 'h-tema', temaDe(it)), el('span', 'h-valor', it.valor), el('span', 'h-meta', meta(it)));
      li.onclick = function () { detalle(it, z); };
      li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detalle(it, z); } };
      ul.appendChild(li);
    });
    $('#lista-titulo').textContent = region ? nombreZona(region) : (q ? t('coincide') : t('todo'));
    var v = $('#lista-vacia');
    v.hidden = todos.length > 0;
    v.textContent = q ? t('sinRes', { q: filtro }) : region ? t('zonaVacia') : t('vacia');
    var mas = $('#mas'); mas.hidden = todos.length <= limite; mas.textContent = t('verMas', { n: todos.length - limite });
  }
  var ultimo = null;
  function detalle(it, z) {
    ultimo = [it, z];
    var d = $('#detalle'); d.hidden = false; d.style.setProperty('--c', 'var(--r-' + z + ')');
    $('#d-region').textContent = nombreZona(z);
    $('#d-tema').textContent = temaDe(it);
    $('#d-valor').textContent = it.valor;
    $('#d-dicho').hidden = !it.texto; $('#d-dicho').textContent = it.texto ? '«' + it.texto + '»' : '';
    var dl = $('#d-datos'); dl.textContent = '';
    var fila = function (k, v, priv) { if (!v) return; dl.append(el('dt', priv ? 'solo-dueno' : '', k), el('dd', priv ? 'solo-dueno' : '', v)); };
    fila(t('quien'), it.tipo === 'decision' ? t('fDecision') : it.tipo === 'regla' ? t('fRegla') : it.tipo === 'entrada' ? t('fEntrada') : (it.fuente === 'usuario' ? t('fUsuario') : it.fuente === 'agente' ? t('fAgente') : t('fDevlog')) + (it.estado === 'dudoso' ? t('fDudoso') : ''));
    fila(t('desde'), fecha(it.desde || it.creado));
    if (it.usos != null) fila(t('usado'), it.usos ? it.usos + ' ' + (it.usos === 1 ? t('vez') : t('veces')) + (it.ultimo_uso ? ' · ' + t('ultima', { f: fecha(it.ultimo_uso) }) : '') : t('todavia'), true);
    if (it.devlog) fila(t('enDevlog'), t('entradaN', { n: it.devlog }), true);
    var hi = $('#d-historia'), hh = (it.historia || []).filter(function (x) { return x.valor; });
    hi.textContent = ''; $('#d-historia-t').hidden = hh.length < 2; hi.hidden = hh.length < 2;
    hh.forEach(function (x) {
      var li = el('li', x.estado === 'activo' || x.estado === 'dudoso' ? '' : 'viejo');
      li.textContent = x.valor + ' · ' + fecha(x.desde) + ' → ' + (x.hasta ? fecha(x.hasta) : t('hoy')) + (x.estado === 'cerrado' ? ' (' + t('cerrado') + (x.nota ? ': ' + x.nota : '') + ')' : '');
      hi.appendChild(li);
    });
    var en = $('#d-enlaces'), ee = it.enlaces || []; en.textContent = ''; $('#d-enlaces-t').hidden = !ee.length; en.hidden = !ee.length;
    ee.forEach(function (x) { en.appendChild(el('li', '', x.tema + ': ' + x.valor)); });
    var cmd = $('#d-cmd'), linea = '';
    if (D.cli && it.tipo === 'hecho') linea = (/^(objetivo|pendiente)\./.test(it.dimension) && it.estado === 'activo' ? 'node "' + D.cli + '" --resolver ' + it.id + ' --como "…"' + '\n' : '') + 'node "' + D.cli + '" --olvidar ' + it.id;
    if (it.tipo === 'decision' || it.tipo === 'regla') linea = t('cmdDecision');
    cmd.textContent = linea; $('#d-cmd-p').hidden = !linea;
    if (innerWidth < 860 && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cambios() {
    var ul = $('#cambios-l'); ul.textContent = '';
    var l = D.cambios.filter(visible);
    $('#cambios-v').hidden = l.length > 0;
    l.forEach(function (c) {
      var li = el('li'); li.style.setProperty('--c', 'var(--r-' + c.zona + ')');
      var s = el('span', '', c.tema + ': ' + (c.antes ? c.antes + ' → ' : '') + (c.ahora || ''));
      s.appendChild(el('small', '', fecha(c.fecha) + ' · ' + t('tipos.' + c.tipo) + (c.nota ? ' · ' + c.nota : '')));
      li.appendChild(s); ul.appendChild(li);
    });
    var ua = $('#abiertos-l'); ua.textContent = '';
    var a = D.abiertos.filter(visible); $('#abiertos-s').hidden = !a.length;
    a.forEach(function (x) {
      var li = el('li'); li.style.setProperty('--c', 'var(--r-' + x.zona + ')');
      var s = el('span', '', x.valor); s.appendChild(el('small', '', (x.dias === 0 ? t('desdeHoy') : t('abiertoHace', { n: x.dias, d: x.dias === 1 ? t('dia') : t('dias') })) + (x.progreso === 'en-curso' ? ' · ' + t('enCurso') : '')));
      li.appendChild(s); ua.appendChild(li);
    });
  }
  function todo() { cabecera(); regiones(); lista(); cambios(); if (tresD) tresD.dibujar(); }

  $$('[data-region]').forEach(function (e) {
    if (e.tagName.toLowerCase() === 'path') { e.setAttribute('role', 'button'); e.setAttribute('tabindex', '0'); }
    var ir = function () { var z = e.getAttribute('data-region'); if (!zonaVisible(z)) return; region = region === z ? null : z; limite = PAGINA; todo(); };
    e.addEventListener('click', ir);
    e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ir(); } });
  });
  $('#buscar').addEventListener('input', function (e) { filtro = e.target.value.trim().toLowerCase(); limite = PAGINA; lista(); });
  $('#mas').addEventListener('click', function () { limite += PAGINA * 3; lista(); });
  $('#cerrar').addEventListener('click', function () { $('#detalle').hidden = true; });
  var tema = $('#tema');
  tema.addEventListener('click', function () {
    var oscuro = raiz.getAttribute('data-theme') === 'light';
    raiz.setAttribute('data-theme', oscuro ? 'dark' : 'light');
    tema.textContent = oscuro ? t('claro') : t('oscuro'); todo();
  });
  var cli = $('#cliente');
  if (cli) cli.addEventListener('click', function () {
    previa = !previa; if (previa && region === 'temporal') region = null;
    if (previa) raiz.setAttribute('data-cliente', ''); else raiz.removeAttribute('data-cliente');
    cli.setAttribute('aria-pressed', String(previa)); $('#detalle').hidden = true; todo();
  });

  // ---------------- 3D: un cerebro de verdad hecho de puntos, con neuronas que se encienden
  // Cada hemisferio es la UNIÓN de elipsoides (cuerpo, polo frontal, polo occipital, lóbulo temporal y cerebelo); de
  // cada uno se toman puntos de su superficie que no caen dentro de otro: queda la piel del cerebro. Entre hemisferios,
  // la cisura longitudinal; sobre el temporal, la de Silvio (una franja sin puntos). Las circunvoluciones salen de un
  // ruido determinista: donde vale casi cero hay surco (puntos más oscuros). Encima, una red de neuronas por zona:
  // impulsos que viajan por sus conexiones (más cuanto más se usa la zona, y más aún si está elegida) y se encienden
  // al llegar. Giro libre de 360° (arrastre con inercia, flechas, doble clic) y etiquetas de cada zona.
  var tresD = null;
  function cerebro3D(cv) {
    var ctx = cv.getContext('2d'), pts = [], nodos = [], enl = [], pulsos = [], destellos = [];
    var ang = 0.38, cab = 0.12, vx = 0, vy = 0, vivo = false, arr = null;
    var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var s = 7, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    var gauss = function () { return Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd()); };
    // [cx, cy, cz, rx, ry, rz, parte]   (x: delante -1 → atrás 1; y: hacia abajo; z: hemisferio)
    var PIEZAS = [
      [0.02, -0.14, 0.24, 0.92, 0.5, 0.34, 'c'],
      [-0.52, 0.02, 0.22, 0.44, 0.44, 0.31, 'c'],
      [0.58, -0.02, 0.2, 0.4, 0.42, 0.27, 'c'],
      [0.04, 0.24, 0.3, 0.56, 0.2, 0.25, 't'],
      [0.66, 0.44, 0.15, 0.27, 0.15, 0.2, 'b']
    ];
    var CUANTOS = { c: [9000, 2800, 2600], t: 4200, b: 2600 };
    var dist = function (k, sg, x, y, z) { var p = PIEZAS[k]; var a = (x - p[0]) / p[3], b = (y - p[1]) / p[4], c = (z - sg * p[2]) / p[5]; return Math.sqrt(a * a + b * b + c * c); };
    var surcoDe = function (x, y, z) { return Math.sin(9 * x + 2 * Math.sin(6 * y)) * Math.sin(8 * y + 2 * Math.sin(7 * z)) * Math.sin(9 * z + 2 * Math.sin(5 * x)); };
    [1, -1].forEach(function (sg) {
      PIEZAS.forEach(function (p, k) {
        var n = p[6] === 'c' ? CUANTOS.c[k] : CUANTOS[p[6]];
        for (var i = 0; i < n; i++) {
          var a = gauss(), b = gauss(), c = gauss(), m = Math.sqrt(a * a + b * b + c * c) || 1;
          // reparto por SUPERFICIE (no por dirección): si no, la cara lateral, la grande, quedaba rala
          var ux = a / m, uy = b / m, uz = c / m;
          if (rnd() > Math.min(p[3], p[4], p[5]) * Math.sqrt(ux * ux / (p[3] * p[3]) + uy * uy / (p[4] * p[4]) + uz * uz / (p[5] * p[5]))) continue;
          var x = p[0] + p[3] * ux, y = p[1] + p[4] * uy, z = sg * p[2] + p[5] * uz;
          var dentro = false;
          for (var j = 0; j < PIEZAS.length && !dentro; j++) {
            if (j !== k && dist(j, sg, x, y, z) < 1) dentro = true;
            if (p[6] !== 'b' && PIEZAS[j][6] !== 'b' && dist(j, -sg, x, y, z) < 1) dentro = true;   // la cara interna, tapada por el otro hemisferio
          }
          if (dentro) continue;
          if (p[6] !== 'b' && Math.abs(z) < 0.035) continue;                    // cisura longitudinal
          if (p[6] === 'c' && dist(3, sg, x, y, z) < 1.14) continue;            // cisura de Silvio, sobre el temporal
          if (p[6] === 'c' && y > 0.22 && x > -0.2 && x < 0.5) continue;         // la base del cerebro, tapada por el temporal
          var zona = p[6] === 't' ? 'temporal' : p[6] === 'b' ? 'neutro' : x < -0.3 ? 'frontal' : x > 0.45 ? 'occipital' : 'parietal';
          var surco = p[6] === 'b' ? Math.abs(Math.sin(38 * (y - 0.44) + 3 * x)) < 0.3 : Math.abs(surcoDe(x, y, z)) < 0.11;
          // la normal de la superficie: con ella se tapa lo de detrás y se ilumina lo de delante (se lee como un sólido)
          var nx = (x - p[0]) / (p[3] * p[3]), ny = (y - p[1]) / (p[4] * p[4]), nz = (z - sg * p[2]) / (p[5] * p[5]), nn = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          pts.push({ x: x, y: y, z: z, r: zona, s: surco, h: sg, nx: nx / nn, ny: ny / nn, nz: nz / nn });
        }
      });
      for (var i = 0; i < 260; i++) {   // tronco del encéfalo
        var tt = rnd(), a2 = rnd() * Math.PI * 2;
        if (sg < 0) break;
        pts.push({ x: 0.36 + tt * 0.06 + Math.cos(a2) * 0.09, y: 0.3 + tt * 0.62, z: Math.sin(a2) * 0.09, r: 'neutro', s: false, h: 1, nx: Math.cos(a2), ny: 0, nz: Math.sin(a2) });
      }
      for (var k2 = 0; k2 < 260; k2++) {   // hipocampo: un caballito de mar por dentro de cada temporal
        var u = rnd();
        pts.push({ x: -0.18 + u * 0.56, y: 0.22 - Math.sin(u * Math.PI) * 0.08 + (rnd() - 0.5) * 0.035, z: sg * (0.22 + (rnd() - 0.5) * 0.05), r: 'hipocampo', s: false, h: sg, hipo: true });
      }
    });
    // ---- neuronas: nodos por zona, cada uno unido a sus dos vecinos; y de cada zona al hipocampo (consolidar)
    ZONAS.forEach(function (z) {
      var cand = pts.filter(function (p) { return p.r === z && !p.s; });
      for (var i = 0; i < (z === 'hipocampo' ? 14 : 26) && cand.length; i++) nodos.push(cand[Math.floor(rnd() * cand.length)]);
    });
    nodos.forEach(function (a, i) {
      var cerca = nodos.map(function (b, j) { return [j, (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z)]; })
        .filter(function (q) { return q[0] !== i && nodos[q[0]].r === a.r; }).sort(function (p, q) { return p[1] - q[1]; }).slice(0, 2);
      cerca.forEach(function (q) { enl.push([i, q[0]]); });
    });
    var hipos = nodos.map(function (n, i) { return n.r === 'hipocampo' ? i : -1; }).filter(function (i) { return i >= 0; });
    nodos.forEach(function (n, i) { if (n.r !== 'hipocampo' && hipos.length && rnd() < 0.14) enl.push([i, hipos[Math.floor(rnd() * hipos.length)]]); });
    // ---- etiquetas: el centro de cada zona en cada hemisferio (se usa el que mira a la cámara)
    var centros = {};
    ZONAS.forEach(function (z) {
      centros[z] = [1, -1].map(function (sg) {
        var l = pts.filter(function (p) { return p.r === z && p.h === sg && !p.hipo; });
        if (z === 'hipocampo') l = pts.filter(function (p) { return p.hipo && p.h === sg; });
        var c = l.reduce(function (a, p) { return [a[0] + p.x, a[1] + p.y, a[2] + p.z]; }, [0, 0, 0]);
        return l.length ? { x: c[0] / l.length, y: c[1] / l.length + (z === 'temporal' ? 0.06 : 0), z: c[2] / l.length * (z === 'hipocampo' ? 1 : 1.25) } : null;
      });
    });
    var actividad = function (z) { var max = Math.max.apply(null, ZONAS.map(peso).concat([1])); return 0.25 + 0.75 * peso(z) / max; };
    function proyectar(p, w, h, esc, c, sn, cp, sp) {
      var y0 = p.y - 0.12, x1 = p.x * c - p.z * sn, z1 = p.x * sn + p.z * c, y2 = y0 * cp - z1 * sp, z2 = y0 * sp + z1 * cp, f = 3 / (3 + z2);
      return { x: w / 2 + x1 * esc * f, y: h * 0.48 + y2 * esc * f, z: z2, f: f };
    }
    function dibujar() {
      var w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      var claro = raiz.getAttribute('data-theme') === 'light';
      var col = { neutro: css('--suave') }; ZONAS.forEach(function (k) { col[k] = css('--r-' + k); });
      var c = Math.cos(ang), sn = Math.sin(ang), cp = Math.cos(cab), sp = Math.sin(cab), esc = Math.min(w * 0.42, h * 0.56);
      var fuera = function (z) { return z !== 'neutro' && (!zonaVisible(z) || (region !== null && region !== z)); };
      // luz desde arriba, a la izquierda y por delante; lo que mira hacia atrás apenas se ve (tres pasadas: detrás,
      // delante y, encima, el hipocampo, que brilla «a través» del temporal)
      var LX = -0.38, LY = -0.62, LZ = -0.69, atras = [], delante = [], hipo = [];
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], q = proyectar(p, w, h, esc, c, sn, cp, sp); q.p = p;
        if (p.hipo) { hipo.push(q); continue; }
        var nx1 = p.nx * c - p.nz * sn, nz1 = p.nx * sn + p.nz * c, ny2 = p.ny * cp - nz1 * sp, nz2 = p.ny * sp + nz1 * cp;
        q.luz = Math.max(0, nx1 * LX + ny2 * LY + nz2 * LZ);
        (nz2 < 0 ? delante : atras).push(q);
      }
      var punto = function (q, a, r) { ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = col[q.p.r]; ctx.fillRect(q.x - r / 2, q.y - r / 2, r, r); };
      var zonaA = function (p) { return fuera(p.r) ? 0.07 : p.r === 'neutro' ? (claro ? 0.3 : 0.42) : region !== null && p.r === region ? 1.2 : 1; };
      for (var k = 0; k < atras.length; k += 4) punto(atras[k], (claro ? 0.1 : 0.07) * zonaA(atras[k].p), 1.2 * atras[k].f);   // detrás, solo una muestra
      delante.forEach(function (q) {
        var a = (0.4 + 0.6 * q.luz) * (q.p.s ? 0.3 : 1) * zonaA(q.p);
        punto(q, a, (q.p.s ? 1.5 : 2.5) * q.f);
      });
      hipo.forEach(function (q) { punto(q, (claro ? 0.85 : 0.9) * zonaA(q.p), 2.2 * q.f); });
      // conexiones, impulsos y destellos: luz que se suma en oscuro; en claro, tinta
      ctx.globalCompositeOperation = claro ? 'source-over' : 'lighter';
      var pn = nodos.map(function (n) { return proyectar(n, w, h, esc, c, sn, cp, sp); });
      enl.forEach(function (e) {
        var a = nodos[e[0]], b = nodos[e[1]];
        if (fuera(a.r) && fuera(b.r)) return;
        ctx.globalAlpha = (claro ? 0.16 : 0.1) * (region !== null && (a.r === region || b.r === region) ? 2.2 : 1);
        ctx.strokeStyle = col[a.r]; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(pn[e[0]].x, pn[e[0]].y); ctx.lineTo(pn[e[1]].x, pn[e[1]].y); ctx.stroke();
      });
      pulsos.forEach(function (u) {
        var e = enl[u.e], A = pn[e[0]], B = pn[e[1]], x = A.x + (B.x - A.x) * u.t, y = A.y + (B.y - A.y) * u.t, z = nodos[e[0]].r;
        if (fuera(z)) return;
        ctx.fillStyle = col[z];
        ctx.globalAlpha = claro ? 0.25 : 0.22; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, claro ? 2.2 : 1.8, 0, 7); ctx.fill();
      });
      destellos.forEach(function (d) {
        var P = pn[d.n], z = nodos[d.n].r;
        if (fuera(z)) return;
        ctx.fillStyle = col[z]; ctx.globalAlpha = d.v * (claro ? 0.45 : 0.6);
        ctx.beginPath(); ctx.arc(P.x, P.y, 3 + (1 - d.v) * 9, 0, 7); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      // etiquetas de las zonas (en el idioma elegido), en el lado que mira a la cámara
      ctx.font = '700 12px ' + css('--fuente-titulos'); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ZONAS.forEach(function (z) {
        if (!zonaVisible(z)) return;
        var cc = centros[z].filter(Boolean).map(function (p) { return proyectar(p, w, h, esc, c, sn, cp, sp); }).sort(function (a, b) { return a.z - b.z; })[0];
        if (!cc) return;
        var txt = t('etq.' + z);
        ctx.globalAlpha = region === null || region === z ? 1 : 0.35;
        ctx.fillStyle = col[z]; ctx.beginPath(); ctx.arc(cc.x, cc.y, 3.5, 0, 7); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = css('--halo'); ctx.strokeText(txt, cc.x + 8, cc.y);
        ctx.fillStyle = css('--texto'); ctx.fillText(txt, cc.x + 8, cc.y);
      });
      ctx.globalAlpha = 1;
    }
    function latir() {   // nacen impulsos según la actividad de cada zona; avanzan; al llegar, destello
      if (quieto) return;
      ZONAS.forEach(function (z) {
        if (!zonaVisible(z)) return;
        var prob = 0.05 * actividad(z) * (region === z ? 3.5 : region !== null ? 0.4 : 1);
        if (rnd() < prob) {
          var cand = enl.map(function (e, i) { return nodos[e[0]].r === z ? i : -1; }).filter(function (i) { return i >= 0; });
          if (cand.length) pulsos.push({ e: cand[Math.floor(rnd() * cand.length)], t: 0, v: 0.018 + rnd() * 0.02 });
        }
      });
      pulsos = pulsos.filter(function (u) { u.t += u.v; if (u.t >= 1) { destellos.push({ n: enl[u.e][1], v: 1 }); return false; } return true; });
      destellos = destellos.filter(function (d) { d.v -= 0.04; return d.v > 0; });
    }
    function paso() {
      if (!vivo) return;
      if (!arr) { ang += vx; cab += vy; vx *= 0.94; vy *= 0.94; if (!quieto && Math.abs(vx) < 0.003) ang += 0.003; }
      latir(); dibujar(); requestAnimationFrame(paso);
    }
    cv.tabIndex = 0;
    cv.addEventListener('pointerdown', function (e) { arr = { x: e.clientX, y: e.clientY }; vx = vy = 0; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) {
      if (!arr) return;
      var dx = (e.clientX - arr.x) * 0.01, dy = (e.clientY - arr.y) * 0.01;
      ang += dx; cab += dy; vx = dx; vy = dy; arr = { x: e.clientX, y: e.clientY };
      if (quieto) dibujar();
    });
    cv.addEventListener('pointerup', function () { arr = null; if (quieto) vx = vy = 0; });
    cv.addEventListener('dblclick', function () { ang = 0; cab = 0; vx = vy = 0; dibujar(); });
    cv.addEventListener('keydown', function (e) {
      var k = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.2], ArrowDown: [0, 0.2] }[e.key];
      if (!k) return; e.preventDefault(); ang += k[0]; cab += k[1]; dibujar();
    });
    return { dibujar: dibujar, empezar: function () { vivo = true; paso(); }, parar: function () { vivo = false; } };
  }
  var cv = $('#lienzo3d'), caja = $('[data-vista]');
  $$('[data-ir]').forEach(function (bt) {
    bt.addEventListener('click', function () {
      var v = bt.getAttribute('data-ir'); caja.setAttribute('data-vista', v);
      $$('[data-ir]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === bt)); });
      if (v === '3d') { tresD = tresD || cerebro3D(cv); tresD.empezar(); } else if (tresD) tresD.parar();
    });
  });
  traducir();
  todo();
})();
`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// JSON dentro de <script type="application/json">: «<» escapado, así ningún valor puede cerrar la etiqueta
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

export function htmlCortex(datos, { cli = null, idioma = null } = {}) {
    const cliente = !!datos.cliente;
    const D = { ...datos, cli: cliente ? null : cli, idioma: idioma && TEXTOS[idioma] ? idioma : null };
    const es = TEXTOS.es;   // el HTML trae el castellano escrito (sin JavaScript también se lee); el programa lo traduce
    return `<!doctype html>
<html lang="es" data-theme="dark"${cliente ? ' data-cliente' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Cortex · ${esc(datos.proyecto)}${cliente ? ' (cliente)' : ''}</title>
<style>${CSS}</style>
</head>
<body>
<div class="escena">
  <section class="lienzo">
    <div class="arriba">
      <div>
        <div class="marca">Cortex${cliente ? ` · <b data-t="vistaParaCliente">${es.vistaParaCliente}</b>` : ''}</div>
        <h1 id="titulo">${esc(es.titulo.replace('{p}', datos.proyecto))}</h1>
        <p class="cifras" id="cifras"></p>
      </div>
      <div class="mandos">
        <span role="group" data-t-aria="vista"><button type="button" data-ir="2d" aria-pressed="true">2D</button> <button type="button" data-ir="3d" aria-pressed="false">3D</button></span>
        ${cliente ? '' : `<button type="button" id="cliente" aria-pressed="false" data-t="vistaCliente" data-t-title="vistaClienteT">${es.vistaCliente}</button>`}
        <button type="button" id="tema">${es.claro}</button>
        <label><span class="sr" data-t="idioma">${es.idioma}</span><select id="idioma"></select></label>
      </div>
    </div>
    <div class="escenario" data-vista="2d">
      <div class="v2d">
        <div class="dibujo">${cerebro()}</div>
        <p class="pista" data-t="pista">${es.pista}</p>
      </div>
      <div class="v3d"><canvas id="lienzo3d" data-t-aria="aria3d"></canvas><p class="pista" data-t="pista3d">${es.pista3d}</p></div>
    </div>
    <div class="chips" role="group" data-t-aria="ariaZonas">
      ${ZONAS.filter(([r]) => !(cliente && r === 'temporal')).map(([r]) => `<button type="button" data-region="${r}" style="color:var(--r-${r})"><i></i><span data-t="zonas.${r}">${es.zonas[r]}</span> <b data-cuenta="${r}"></b></button>`).join('\n      ')}
    </div>
  </section>
  <aside class="panel">
    <label class="busca"><span class="sr" data-t="buscarL">${es.buscarL}</span><input id="buscar" type="search" data-t-ph="buscar" placeholder="${es.buscar}" autocomplete="off"></label>
    <section><h2 data-t="semana">${es.semana}</h2><ul class="cambios" id="cambios-l"></ul><p class="vacio" id="cambios-v" data-t="nadaSemana">${es.nadaSemana}</p></section>
    <section id="abiertos-s"><h2 data-t="sigueAbierto">${es.sigueAbierto}</h2><ul class="abiertos" id="abiertos-l"></ul></section>
    <section>
      <h2 id="lista-titulo" aria-live="polite">${es.todo}</h2>
      <ul id="lista" class="lista"></ul>
      <p class="vacio" id="lista-vacia" hidden></p>
      <button type="button" class="mas" id="mas" hidden></button>
    </section>
    <article id="detalle" class="detalle" hidden aria-live="polite">
      <button type="button" class="cerrar" id="cerrar" data-t-aria="cerrar">×</button>
      <p class="d-region" id="d-region"></p>
      <h3 id="d-tema"></h3>
      <p class="d-valor" id="d-valor"></p>
      <p class="d-dicho" id="d-dicho" hidden></p>
      <dl id="d-datos"></dl>
      <h4 id="d-historia-t" data-t="historia">${es.historia}</h4><ol id="d-historia" class="historia"></ol>
      <h4 id="d-enlaces-t" data-t="relacionado">${es.relacionado}</h4><ul id="d-enlaces" class="enlaces"></ul>
      <p class="solo-dueno cmd" id="d-cmd-p"><span data-t="cambiar">${es.cambiar}</span> <code id="d-cmd"></code></p>
    </article>
    <p class="pie" id="pie"></p>
  </aside>
</div>
<script type="application/json" id="datos-cortex">${json(D)}</script>
<script type="application/json" id="textos-cortex">${json(TEXTOS)}</script>
<script>${APP}</script>
</body>
</html>
`;
}
