// Cortex (F7-T3): la memoria del proyecto como un HTML local, autocontenido y sin red, con el diseño elegido en las
// rondas (plan/design-system/cortex/MASTER.md: «Nocturno» + 2D «Neón de línea» + 3D de puntos con giro libre).
// Lo usa `memoria.mjs --cortex [--cliente]`; los datos salen de hechos.mjs → datosCortex() (con --cliente, lo privado
// ni siquiera entra en el archivo). Todo texto de la memoria se pinta con textContent: nunca como HTML.

const ZONAS = [
    ['frontal', 'Lo que queremos conseguir', 'M70,170 C48,140 50,92 88,64 C116,44 150,38 178,40 C176,80 170,120 160,152 C130,158 98,166 70,170Z'],
    ['parietal', 'El proyecto', 'M178,40 C228,36 280,48 314,78 C300,100 286,118 270,130 C236,134 196,142 160,152 C170,120 176,80 178,40Z'],
    ['occipital', 'Normas y decisiones', 'M314,78 C340,100 356,132 350,166 C346,186 332,198 312,202 C300,180 288,152 270,130 C286,118 300,100 314,78Z'],
    ['temporal', 'Quién eres', 'M70,170 C98,166 130,158 160,152 C196,142 236,134 270,130 C288,152 300,180 312,202 C290,222 250,232 206,232 C150,232 104,214 82,192 C76,186 72,178 70,170Z'],
    ['hipocampo', 'Lo vivido', 'M154,195 C170,170 206,162 238,166 C264,169 278,184 276,201 C268,218 240,220 220,213 C204,208 192,211 180,218 C164,223 154,213 154,195Z'],
];
const SURCOS = {
    frontal: ['M86,92 C104,104 102,124 122,132', 'M72,132 C90,136 104,148 124,150', 'M120,58 C132,76 150,84 166,82'],
    parietal: ['M196,60 C212,80 236,86 258,82', 'M206,114 C228,106 252,110 274,102', 'M262,60 C270,76 284,84 298,86'],
    occipital: ['M318,108 C330,122 336,142 334,162', 'M296,148 C310,158 318,174 320,188'],
    temporal: ['M92,188 C112,182 128,180 146,176', 'M276,150 C286,164 292,178 296,192'],
    hipocampo: ['M166,198 C186,186 214,182 240,186 C254,188 260,196 252,202'],
};
const ETIQUETAS = [['conseguir', 'frontal', 84, 116], ['proyecto', 'parietal', 214, 94], ['normas', 'occipital', 300, 152], ['quién eres', 'temporal', 80, 200], ['lo vivido', 'hipocampo', 190, 203]];

const cerebro = () => `<svg class="cerebro neon" viewBox="20 20 360 285" role="group" aria-label="Cerebro de la memoria: cada zona es un tipo de recuerdo">
  <g class="neutro" aria-hidden="true"><path d="M300,206 C326,200 352,210 352,228 C348,248 316,256 292,246 C280,236 284,214 300,206Z"/><path d="M244,228 C252,250 254,270 252,292 L236,292 C236,272 232,252 226,232Z"/></g>
  ${ZONAS.map(([r, n, d]) => `<path class="respira" data-region="${r}" aria-label="${n}" d="${d}"/>`).join('\n  ')}
  <g aria-hidden="true">${Object.entries(SURCOS).map(([r, l]) => l.map(d => `<path class="surco-neon surco-${r}${r === 'hipocampo' ? ' fluye' : ''}" style="stroke:var(--r-${r})" d="${d}"/>`).join('')).join('')}</g>
  <g class="etiquetas" aria-hidden="true">${ETIQUETAS.map(([t, r, x, y]) => `<g class="etq-neon etq-${r}"><circle cx="${x - 7}" cy="${y - 4}" r="3" style="fill:var(--r-${r})"/><text x="${x}" y="${y}">${t}</text></g>`).join('')}</g>
</svg>`;

const CSS = `
:root {
  --fondo: #0C0F13; --papel: #141920; --texto: #E8ECF1; --suave: #8B96A5; --linea: #232B36; --foco: #F2C14E;
  --r-frontal: #FF7A59; --r-parietal: #3DD6C4; --r-occipital: #F2C14E; --r-temporal: #FF5C8A; --r-hipocampo: #9BE15D;
  --fuente-titulos: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif; --fuente-texto: 'Manrope', 'Segoe UI', system-ui, sans-serif; --radio: 999px;
  color-scheme: dark;
}
[data-theme="light"] {
  --fondo: #F2F4F7; --papel: #FFFFFF; --texto: #10151C; --suave: #5B6675; --linea: #DDE2E8; --foco: #0E7C70;
  --r-frontal: #E4572E; --r-parietal: #0E9F8F; --r-occipital: #C9930E; --r-temporal: #E0306A; --r-hipocampo: #4C9A1A;
  color-scheme: light;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--fondo); color: var(--texto); font: 16px/1.55 var(--fuente-texto); }
h1, h2, h3 { font-family: var(--fuente-titulos); margin: 0; letter-spacing: -.02em; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible, input:focus-visible, .hecho:focus-visible, canvas:focus-visible, [data-region]:focus-visible { outline: 3px solid var(--foco); outline-offset: 2px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.escena { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(340px, 1fr); min-height: 100vh; }
.lienzo { position: relative; padding: 28px 32px; display: grid; grid-template-rows: auto 1fr auto; gap: 12px;
  background: radial-gradient(60% 55% at 45% 52%, color-mix(in srgb, var(--r-parietal) 10%, transparent), transparent 70%), var(--fondo); }
.arriba { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.marca { font: 700 12px/1 var(--fuente-titulos); letter-spacing: .2em; text-transform: uppercase; color: var(--suave); }
.marca b { color: var(--r-temporal); font-weight: 700; }
h1 { font-size: clamp(30px, 4.4vw, 54px); font-weight: 700; line-height: 1.02; margin-top: 10px; overflow-wrap: anywhere; }
.cifras { margin: 8px 0 0; color: var(--suave); font-size: 15px; } .cifras b { color: var(--texto); }
.mandos { display: flex; gap: 8px; flex-wrap: wrap; }
.mandos button { border: 1px solid var(--linea); background: var(--papel); border-radius: var(--radio); padding: 9px 16px; min-height: 44px; font-weight: 700; font-size: 14px; }
.mandos button[aria-pressed="true"] { background: var(--texto); color: var(--fondo); border-color: var(--texto); }
.escenario { display: grid; grid-template-columns: minmax(0, 1fr); place-items: center; min-height: 340px; }
.escenario .v2d { width: min(100%, 640px); display: grid; align-content: center; justify-items: center; }
.escenario .v3d { width: min(100%, 640px); height: 420px; }
[data-vista="2d"] .v3d, [data-vista="3d"] .v2d { display: none !important; }
.v3d canvas { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
.dibujo { width: 100%; }
.pista { margin: 6px 0 0; text-align: center; color: var(--suave); font-size: 14px; }
.cerebro { width: 100%; height: auto; display: block; overflow: visible; }
.cerebro [data-region] { cursor: pointer; opacity: var(--brillo, 1); transition: opacity .25s, fill-opacity .25s; outline: none;
  fill-opacity: .16; stroke-width: 2.6; stroke-linejoin: round; filter: drop-shadow(0 0 calc(var(--brillo, 1) * 9px) currentColor); }
${ZONAS.map(([r]) => `.cerebro [data-region="${r}"] { fill: var(--r-${r}); stroke: var(--r-${r}); color: var(--r-${r}); }`).join('\n')}
.cerebro [data-region="hipocampo"] { fill-opacity: .3; stroke-width: 3.2; }
.cerebro [data-region="hipocampo"]:not(.apagada) { opacity: 1 !important; animation: none; }
.cerebro [data-region][aria-pressed="true"] { fill-opacity: .42; }
.cerebro .vacia:not(.apagada) { opacity: .38 !important; }
.cerebro .apagada, .apagada { opacity: .14 !important; }
[data-cliente] .surco-temporal { opacity: .12; }
.cerebro [data-region]:focus-visible { stroke-width: 4; }
.cerebro .neutro path { fill: none; stroke: var(--linea); stroke-width: 2; }
.cerebro .etiquetas { pointer-events: none; }
.etq-neon text { font: 700 12px var(--fuente-titulos); letter-spacing: .06em; fill: var(--texto); }
.surco-neon { fill: none; stroke-width: 1.6; stroke-linecap: round; opacity: .75; pointer-events: none; filter: drop-shadow(0 0 4px currentColor); }
.surco-neon.fluye { stroke-dasharray: 6 8; animation: fluye 1.6s linear infinite; stroke-width: 2.2; opacity: 1; }
.cerebro .respira { animation: respira 4s ease-in-out infinite; }
@keyframes respira { 50% { opacity: calc(var(--brillo, 1) * .78); } }
@keyframes fluye { to { stroke-dashoffset: -28; } }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chips button { border: 1px solid var(--linea); background: transparent; border-radius: var(--radio); padding: 7px 12px 7px 10px; min-height: 44px; display: inline-flex; gap: 8px; align-items: center; font-size: 14px; }
.chips button i { width: 10px; height: 10px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; }
.chips button span { color: var(--texto); }
.chips button[aria-pressed="true"] { border-color: var(--texto); }
.chips b { color: var(--suave); font-weight: 500; }
[data-cliente] .solo-dueno, [data-cliente] .chips [data-region="temporal"], [data-cliente] .etq-temporal { display: none !important; }
.panel { background: var(--papel); border-left: 1px solid var(--linea); padding: 24px; display: grid; gap: 22px; align-content: start; max-height: 100vh; overflow: auto; position: sticky; top: 0; }
.busca input { width: 100%; font: inherit; padding: 13px 18px; border-radius: var(--radio); border: 1px solid var(--linea); background: var(--fondo); color: var(--texto); }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .16em; color: var(--suave); font-weight: 700; margin-bottom: 10px; }
.cambios, .abiertos { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.cambios li, .abiertos li { display: grid; grid-template-columns: 14px 1fr; gap: 10px; font-size: 15px; }
.cambios li::before, .abiertos li::before { content: ""; width: 8px; height: 8px; margin-top: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c); }
.cambios small, .abiertos small { display: block; color: var(--suave); font-size: 12px; }
.vacio { color: var(--suave); font-size: 14px; margin: 0; }
.lista { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.hecho { padding: 12px 16px 12px 18px; border-radius: 16px; background: var(--fondo); border: 1px solid var(--linea); display: grid; gap: 2px; cursor: pointer; position: relative; }
.hecho::before { content: ""; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: var(--c); box-shadow: 0 0 12px var(--c); }
.hecho:hover { border-color: var(--c); }
.h-tema { font: 700 12px var(--fuente-titulos); letter-spacing: .08em; text-transform: uppercase; color: var(--c); }
.h-valor { overflow-wrap: anywhere; }
.h-meta { font-size: 12px; color: var(--suave); }
.mas { border: 1px solid var(--linea); background: none; border-radius: var(--radio); padding: 8px 14px; min-height: 44px; }
.detalle { border-radius: 20px; padding: 18px; background: var(--fondo); border: 1px solid var(--c); box-shadow: 0 0 0 1px var(--c), 0 0 40px color-mix(in srgb, var(--c) 25%, transparent); }
.detalle .cerrar { float: right; border: 0; background: none; color: var(--suave); min-width: 44px; min-height: 44px; font-size: 22px; margin: -10px -10px 0 0; }
.d-region { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--c); }
.detalle h3 { font-size: 24px; margin: 2px 0; } .d-valor { margin: 0 0 10px; font-size: 17px; overflow-wrap: anywhere; }
.d-dicho { margin: 0 0 10px; color: var(--suave); font-style: italic; }
.detalle dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 14px; margin: 0 0 8px; } .detalle dt { color: var(--suave); } .detalle dd { margin: 0; }
.detalle h4 { margin: 10px 0 4px; font-size: 12px; color: var(--suave); text-transform: uppercase; letter-spacing: .12em; }
.historia, .enlaces { margin: 0; padding-left: 18px; font-size: 14px; } .historia .viejo { color: var(--suave); text-decoration: line-through; }
.cmd { font-size: 13px; color: var(--suave); } .cmd code { display: block; margin-top: 4px; padding: 8px 12px; border-radius: 12px; background: var(--papel); color: var(--texto); overflow-wrap: anywhere; }
.pie { font-size: 12px; color: var(--suave); margin: 0; }
@media (max-width: 860px) {
  .escena { grid-template-columns: 1fr; min-height: 0; }
  .lienzo { padding: 18px 16px; grid-template-rows: auto auto auto; }
  .escenario { min-height: 220px; } .escenario .v3d { height: 300px; }
  .chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x mandatory; }
  .chips button { flex: none; scroll-snap-align: start; }
  .panel { position: static; max-height: none; border-left: 0; border-top: 1px solid var(--linea); padding: 18px 16px 40px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

// El programa de la página (sin dependencias). DATOS y CLI los pone htmlCortex.
const APP = String.raw`
(function () {
  var D = JSON.parse(document.getElementById('datos-cortex').textContent);
  var NOMBRES = { frontal: 'Lo que queremos conseguir', parietal: 'El proyecto', occipital: 'Normas y decisiones', temporal: 'Quién eres', hipocampo: 'Lo vivido' };
  var ZONAS = Object.keys(NOMBRES);
  var raiz = document.documentElement, region = null, previa = !!D.cliente, filtro = '', PAGINA = innerWidth < 860 ? 12 : 40, limite = PAGINA;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var css = function (v) { return getComputedStyle(raiz).getPropertyValue(v).trim(); };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var fecha = function (iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? String(iso).slice(0, 10) : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); };
  var visible = function (it) { return !previa || !it.privado; };
  var zonaVisible = function (z) { return !(previa && z === 'temporal'); };
  var items = function (z) { return (D.zonas[z] || []).filter(visible); };
  var peso = function (z) { return items(z).reduce(function (s, it) { return s + (it.usos || 0) + 1; }, 0); };
  var FUENTE = { usuario: 'lo dijiste tú', agente: 'lo dedujo el agente', devlog: 'del devlog' };

  function cabecera() {
    var total = ZONAS.reduce(function (s, z) { return s + items(z).length; }, 0);
    $('#titulo').textContent = 'Memoria de ' + D.proyecto;
    var c = $('#cifras'); c.textContent = '';
    c.append('Recuerda ', el('b', '', total + (total === 1 ? ' cosa' : ' cosas')), ' · ', el('b', '', D.cambios.filter(visible).length + ' cambios'), ' en 7 días · ', el('b', '', D.abiertos.filter(visible).length + ' abiertos'));
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
    $$('[data-cuenta]').forEach(function (e) { e.textContent = items(e.getAttribute('data-cuenta')).length; });
  }
  function meta(it) {
    var m = [];
    if (it.tipo === 'decision') m.push('decisión vigente');
    if (it.tipo === 'entrada') m.push(fecha(it.creado));
    if (it.fuente && it.fuente !== 'usuario' && it.tipo === 'hecho') m.push(FUENTE[it.fuente] || it.fuente);
    if (it.estado === 'dudoso') m.push('dudoso');
    if (it.progreso === 'en-curso') m.push('en curso');
    if (!previa && it.usos) m.push(it.usos + (it.usos === 1 ? ' uso' : ' usos'));
    if (!previa && it.devlog && it.tipo !== 'entrada') m.push('ver ' + it.devlog);
    return m.join(' · ');
  }
  function lista() {
    var ul = $('#lista'); ul.textContent = '';
    var q = filtro, todos = [];
    (region ? [region] : ZONAS).filter(zonaVisible).forEach(function (z) {
      items(z).forEach(function (it) {
        if (q && [it.tema, it.valor, it.texto, it.dimension].join(' ').toLowerCase().indexOf(q) < 0) return;
        todos.push([z, it]);
      });
    });
    todos.slice(0, limite).forEach(function (p) {
      var z = p[0], it = p[1], li = el('li', 'hecho'); li.tabIndex = 0;
      li.style.setProperty('--c', 'var(--r-' + z + ')');
      li.append(el('span', 'h-tema', it.tema), el('span', 'h-valor', it.valor), el('span', 'h-meta', meta(it)));
      li.onclick = function () { detalle(it, z); };
      li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detalle(it, z); } };
      ul.appendChild(li);
    });
    $('#lista-titulo').textContent = region ? NOMBRES[region] : (q ? 'Lo que coincide' : 'Todo lo que recuerda');
    var v = $('#lista-vacia');
    v.hidden = todos.length > 0;
    v.textContent = q ? 'Nada en la memoria para «' + filtro + '». Si no está aquí, la memoria no lo sabe.' : region ? 'Aún no hay nada en esta zona.' : 'La memoria está vacía. Se llena sola cuando hablas con el agente.';
    var mas = $('#mas'); mas.hidden = todos.length <= limite; mas.textContent = 'Ver ' + (todos.length - limite) + ' más';
  }
  function detalle(it, z) {
    var d = $('#detalle'); d.hidden = false; d.style.setProperty('--c', 'var(--r-' + z + ')');
    $('#d-region').textContent = NOMBRES[z];
    $('#d-tema').textContent = it.tema;
    $('#d-valor').textContent = it.valor;
    $('#d-dicho').hidden = !it.texto; $('#d-dicho').textContent = it.texto ? '«' + it.texto + '»' : '';
    var dl = $('#d-datos'); dl.textContent = '';
    var fila = function (k, v, priv) { if (!v) return; var dt = el('dt', priv ? 'solo-dueno' : '', k), dd = el('dd', priv ? 'solo-dueno' : '', v); dl.append(dt, dd); };
    fila('Quién lo dijo', it.tipo === 'decision' ? 'Decisión de MEMORIA.md' : it.tipo === 'regla' ? 'Regla de MEMORIA.md' : it.tipo === 'entrada' ? 'Entrada del devlog' : (it.fuente === 'usuario' ? 'Lo dijiste tú' : it.fuente === 'agente' ? 'Lo dedujo el agente (no lo dijiste tú)' : 'Sale del devlog') + (it.estado === 'dudoso' ? ' · dudoso, no lo afirmaste del todo' : ''));
    fila('Desde', fecha(it.desde || it.creado));
    if (it.usos != null) fila('Usado', it.usos ? it.usos + (it.usos === 1 ? ' vez' : ' veces') + (it.ultimo_uso ? ' · la última, ' + fecha(it.ultimo_uso) : '') : 'todavía no', true);
    if (it.devlog) fila('En el devlog', 'entrada ' + it.devlog, true);
    var hi = $('#d-historia'), hh = (it.historia || []).filter(function (x) { return x.valor; });
    hi.textContent = ''; $('#d-historia-t').hidden = hh.length < 2; hi.hidden = hh.length < 2;
    hh.forEach(function (x) {
      var li = el('li', x.estado === 'activo' || x.estado === 'dudoso' ? '' : 'viejo');
      li.textContent = x.valor + ' · ' + fecha(x.desde) + (x.hasta ? ' → ' + fecha(x.hasta) : ' → hoy') + (x.estado === 'cerrado' ? ' (cerrado' + (x.nota ? ': ' + x.nota : '') + ')' : '');
      hi.appendChild(li);
    });
    var en = $('#d-enlaces'), ee = it.enlaces || []; en.textContent = ''; $('#d-enlaces-t').hidden = !ee.length; en.hidden = !ee.length;
    ee.forEach(function (x) { en.appendChild(el('li', '', x.tema + ': ' + x.valor)); });
    var cmd = $('#d-cmd'), linea = '';
    if (D.cli && it.tipo === 'hecho') linea = (/^(objetivo|pendiente)\./.test(it.dimension) && it.estado === 'activo' ? 'node "' + D.cli + '" --resolver ' + it.id + ' --como "…"' + '\n' : '') + 'node "' + D.cli + '" --olvidar ' + it.id;
    if (it.tipo === 'decision' || it.tipo === 'regla') linea = 'Se cambia en MEMORIA.md (o con /recordar): no la contradigas sin citarla.';
    cmd.textContent = linea; $('#d-cmd-p').hidden = !linea;
    if (innerWidth < 860 && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function cambios() {
    var ul = $('#cambios-l'); ul.textContent = '';
    var l = D.cambios.filter(visible);
    $('#cambios-v').hidden = l.length > 0;
    var TIPO = { sustituido: 'cambió', nuevo: 'nuevo', aprendido: 'aprendido', resuelto: 'resuelto', abandonado: 'abandonado', cerrado: 'cerrado' };
    l.forEach(function (c) {
      var li = el('li'); li.style.setProperty('--c', 'var(--r-' + c.zona + ')');
      var s = el('span', '', c.tema + ': ' + (c.antes ? c.antes + ' → ' : '') + (c.ahora || ''));
      s.appendChild(el('small', '', fecha(c.fecha) + ' · ' + (TIPO[c.tipo] || c.tipo) + (c.nota ? ' · ' + c.nota : '')));
      li.appendChild(s); ul.appendChild(li);
    });
    var ua = $('#abiertos-l'); ua.textContent = '';
    var a = D.abiertos.filter(visible); $('#abiertos-s').hidden = !a.length;
    a.forEach(function (x) {
      var li = el('li'); li.style.setProperty('--c', 'var(--r-' + x.zona + ')');
      var s = el('span', '', x.valor); s.appendChild(el('small', '', (x.dias === 0 ? 'desde hoy' : 'abierto hace ' + x.dias + (x.dias === 1 ? ' día' : ' días')) + (x.progreso === 'en-curso' ? ' · en curso' : '')));
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
    tema.textContent = oscuro ? 'Claro' : 'Oscuro'; todo();
  });
  var cli = $('#cliente');
  if (cli) cli.addEventListener('click', function () {
    previa = !previa; if (previa && region === 'temporal') region = null;
    if (previa) raiz.setAttribute('data-cliente', ''); else raiz.removeAttribute('data-cliente');
    cli.setAttribute('aria-pressed', String(previa)); $('#detalle').hidden = true; todo();
  });

  // ---------------- 3D: cerebro de puntos, giro libre de 360° (arrastre con inercia, flechas, doble clic)
  var tresD = null;
  function cerebro3D(cv) {
    var ctx = cv.getContext('2d'), pts = [], ang = 0.7, cab = 0, vx = 0, vy = 0, vivo = false, arr = null;
    var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var s = 42, rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    var zona = function (x, y) { if (x < -0.38 && y < 0.2) return 'frontal'; if (x > 0.62) return 'occipital'; if (y > 0.08 && x > -0.55 && x < 0.62) return 'temporal'; return x < -0.2 ? 'frontal' : 'parietal'; };
    var i, x, y, z;
    for (i = 0; i < 2600; i++) {
      x = rnd() * 2 - 1; var phi = rnd() * Math.PI * 2, perfil = Math.sqrt(Math.max(0, 1 - x * x));
      var alto = 0.62 * Math.pow(perfil, 0.8) * (1 + 0.12 * x), ancho = 0.5 * Math.pow(perfil, 0.7);
      var surco = 1 + 0.045 * Math.sin(11 * x + 4 * phi) * Math.sin(6 * phi + 3 * x);
      y = -Math.cos(phi) * alto * surco; z = Math.sin(phi) * ancho * surco;
      var base = 0.22 + (x > -0.55 && x < 0.55 ? 0.2 * Math.sin((x + 0.55) / 1.1 * Math.PI) : 0);
      if (y > base) y = base + (y - base) * 0.25;
      pts.push({ x: x * 1.05, y: y, z: z + (z >= 0 ? 1 : -1) * 0.035, r: zona(x, y) });
    }
    for (i = 0; i < 420; i++) {
      var a = rnd() * Math.PI * 2, b = rnd() * Math.PI;
      if (i < 340) pts.push({ x: 0.66 + 0.24 * Math.sin(b) * Math.cos(a), y: 0.44 + 0.15 * Math.cos(b), z: 0.36 * Math.sin(b) * Math.sin(a), r: 'neutro' });
      else pts.push({ x: 0.32 + (rnd() - 0.5) * 0.12, y: 0.42 + rnd() * 0.4, z: (rnd() - 0.5) * 0.14, r: 'neutro' });
    }
    for (i = 0; i < 260; i++) {
      var t = rnd(), l = rnd() < 0.5 ? -1 : 1;
      pts.push({ x: -0.15 + t * 0.6, y: 0.2 - Math.sin(t * Math.PI) * 0.1 + (rnd() - 0.5) * 0.04, z: l * (0.2 + (rnd() - 0.5) * 0.05), r: 'hipocampo' });
    }
    function dibujar() {
      var w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      var col = { neutro: css('--suave') }; ZONAS.forEach(function (k) { col[k] = css('--r-' + k); });
      var c = Math.cos(ang), sn = Math.sin(ang), cp = Math.cos(cab), sp = Math.sin(cab), esc = Math.min(w * 0.4, h * 0.5);
      pts.map(function (p) {
        var y0 = p.y - 0.1, x1 = p.x * c - p.z * sn, z1 = p.x * sn + p.z * c, y2 = y0 * cp - z1 * sp, z2 = y0 * sp + z1 * cp, f = 3 / (3 + z2);
        return { x: w / 2 + x1 * esc * f, y: h * 0.5 + y2 * esc * f, z: z2, f: f, r: p.r };
      }).sort(function (a, b) { return b.z - a.z; }).forEach(function (p) {
        var fuera = p.r !== 'neutro' && (!zonaVisible(p.r) || (region !== null && region !== p.r));
        ctx.globalAlpha = Math.max(0.12, 0.95 - (p.z + 1) * 0.4) * (fuera ? 0.1 : p.r === 'neutro' ? 0.35 : 1);
        ctx.fillStyle = col[p.r]; ctx.beginPath(); ctx.arc(p.x, p.y, (p.r === 'hipocampo' ? 2.1 : 1.5) * p.f, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function paso() {
      if (!vivo) return;
      if (!arr) { ang += vx; cab += vy; vx *= 0.94; vy *= 0.94; if (!quieto && Math.abs(vx) < 0.004) ang += 0.004; }
      dibujar(); requestAnimationFrame(paso);
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
    cv.addEventListener('dblclick', function () { ang = 0.7; cab = 0; vx = vy = 0; dibujar(); });
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
  todo();
})();
`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// JSON dentro de <script type="application/json">: «<» escapado, así ningún valor puede cerrar la etiqueta
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

export function htmlCortex(datos, { cli = null } = {}) {
    const cliente = !!datos.cliente;
    const D = { ...datos, cli: cliente ? null : cli };
    return `<!doctype html>
<html lang="es" data-theme="dark"${cliente ? " data-cliente" : ""}>
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
        <div class="marca">Cortex${cliente ? ' · <b>vista para el cliente</b>' : ''}</div>
        <h1 id="titulo">Memoria</h1>
        <p class="cifras" id="cifras"></p>
      </div>
      <div class="mandos">
        <span role="group" aria-label="Vista"><button type="button" data-ir="2d" aria-pressed="true">2D</button> <button type="button" data-ir="3d" aria-pressed="false">3D</button></span>
        ${cliente ? '' : '<button type="button" id="cliente" aria-pressed="false" title="Así lo verá el cliente: sin lo tuyo, lo deducido ni los comandos">Vista cliente</button>'}
        <button type="button" id="tema">Claro</button>
      </div>
    </div>
    <div class="escenario" data-vista="2d">
      <div class="v2d">
        <div class="dibujo">${cerebro()}</div>
        <p class="pista">Toca una zona para ver lo que guarda</p>
      </div>
      <div class="v3d"><canvas id="lienzo3d" aria-label="Cerebro en 3D: arrástralo o usa las flechas para girarlo; doble clic para volver de lado"></canvas></div>
    </div>
    <div class="chips" role="group" aria-label="Zonas de la memoria">
      ${ZONAS.filter(([r]) => !(cliente && r === 'temporal')).map(([r, n]) => `<button type="button" data-region="${r}" style="color:var(--r-${r})"><i></i><span>${n}</span> <b data-cuenta="${r}"></b></button>`).join('\n      ')}
    </div>
  </section>
  <aside class="panel">
    <label class="busca"><span class="sr">Buscar en la memoria</span><input id="buscar" type="search" placeholder="Pregunta a la memoria…" autocomplete="off"></label>
    <section><h2>Esta semana</h2><ul class="cambios" id="cambios-l"></ul><p class="vacio" id="cambios-v">Nada nuevo en los últimos 7 días.</p></section>
    <section id="abiertos-s"><h2>Sigue abierto</h2><ul class="abiertos" id="abiertos-l"></ul></section>
    <section>
      <h2 id="lista-titulo" aria-live="polite">Todo lo que recuerda</h2>
      <ul id="lista" class="lista"></ul>
      <p class="vacio" id="lista-vacia" hidden></p>
      <button type="button" class="mas" id="mas" hidden>Ver más</button>
    </section>
    <article id="detalle" class="detalle" hidden aria-live="polite">
      <button type="button" class="cerrar" id="cerrar" aria-label="Cerrar el detalle">×</button>
      <p class="d-region" id="d-region"></p>
      <h3 id="d-tema"></h3>
      <p class="d-valor" id="d-valor"></p>
      <p class="d-dicho" id="d-dicho" hidden></p>
      <dl id="d-datos"></dl>
      <h4 id="d-historia-t">Historia</h4><ol id="d-historia" class="historia"></ol>
      <h4 id="d-enlaces-t">Relacionado</h4><ul id="d-enlaces" class="enlaces"></ul>
      <p class="solo-dueno cmd" id="d-cmd-p">Para cambiarlo: <code id="d-cmd"></code></p>
    </article>
    <p class="pie">Generado el ${esc(new Date(datos.generado).toLocaleString('es-ES'))} con Senzu. ${cliente ? 'Solo lectura.' : 'Archivo local con datos privados: no lo publiques (para el cliente, --cortex --cliente).'}</p>
  </aside>
</div>
<script type="application/json" id="datos-cortex">${json(D)}</script>
<script>${APP}</script>
</body>
</html>
`;
}
