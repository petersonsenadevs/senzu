#!/usr/bin/env node
// Memoria de HECHOS (determinista, en cualquier idioma, sin red): lo que el usuario afirma de forma estable.
// El agente entiende la frase (en el idioma que sea) y la guarda estructurada; el motor la sustituye, la fecha y la
// recupera siempre igual. Para buscar entre idiomas, añade --claves en otros idiomas (p. ej. en inglés y en el del usuario).
//   node memoria.mjs --guardar --dimension identidad.ubicacion --valor "Málaga" [--texto "vivo en Málaga"]
//        [--claves "ciudad,city,vive,lives"] [--idioma es] [--alcance proyecto|usuario] [--duda] [--fuente usuario|agente|devlog] [--desde AAAA-MM-DD] [--hasta AAAA-MM-DD]
//   node memoria.mjs --buscar "dónde vive" [--historico] [--limite 8] [--json]
//   node memoria.mjs --contexto [--presupuesto 12]      lo vigente, repartido por familias (lo usa el inicio de sesión)
//   node memoria.mjs --lista [--todo] | --olvidar <id>
//   node memoria.mjs --nada [--motivo "…"]              revisado: nada estable que guardar en esta sesión
//   node memoria.mjs --enlazar <dimensión A> <dimensión B>  (o --enlaces A,B al guardar): al recordar uno, llega el otro
//   node memoria.mjs --informe [--dias 30] [--json]     el uso REAL: qué se inyectó, si sirvió, el ruido y los silencios
//   node memoria.mjs --cortex [--cliente] [--salida <carpeta>] [--idioma es|en|pt|fr|de|it]   la memoria en un HTML local, sin red
// Dimensiones: «familia.tema» libre (identidad.nombre, proyecto.stack, preferencia.gestor-paquetes, restriccion.presupuesto…).
// Un valor nuevo en la misma dimensión SUSTITUYE al anterior (queda en el histórico); objetivo.*, pendiente.*, nota.*,
// hecho.* y aprendizaje.* acumulan. --duda: el usuario no lo afirmó del todo («creo que…»): se guarda sin sustituir.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const rutaPedida = String(opt('--path') && opt('--path') !== true ? opt('--path') : process.env.CLAUDE_PROJECT_DIR || process.cwd());
let root = path.resolve(rutaPedida);   // provisional: para encontrar el motor; abajo, normalizada como en los hooks
const out = s => process.stdout.write(s + '\n');

async function motor() {   // hechos.mjs de los hooks: junto a la skill (plugin o .claude), o en el paquete de Senzu
    const marcador = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'senzu', 'senzu.json'), 'utf8')); } catch { return {}; } })();
    const c = [path.join(AQUI, '..', '..', '..', 'hooks', 'hechos.mjs'), path.join(root, '.claude', 'hooks', 'hechos.mjs'),
        marcador.standardsRoot && path.join(marcador.standardsRoot, 'core', 'hooks', 'hechos.mjs'), process.env.SENZU_HOME && path.join(process.env.SENZU_HOME, 'core', 'hooks', 'hechos.mjs')].filter(Boolean);
    for (const f of c) if (fs.existsSync(f)) return import(pathToFileURL(f).href);
    out('No encuentro el motor de hechos de Senzu (hooks/hechos.mjs). ¿Está instalado? /instalar');
    process.exit(2);
}
const m = await motor();
root = m.rutaNativa ? m.rutaNativa(rutaPedida) : root;   // /c/… de Git Bash, C:/ o barra final → la misma carpeta
const fecha = s => String(s || '').slice(0, 10);
const linea = h => `- [${h.dimension}] ${h.valor}${h.estado !== 'activo' ? ` (${h.estado}${h.hasta ? ' ' + fecha(h.hasta) : ''})` : ''}${h.desde ? ` · desde ${fecha(h.desde)}` : ''}${h.devlog ? ` · ver ${h.devlog}` : ''} · ${h.alcance} · ${h.id}`;

if (opt('--guardar')) {
    let r;
    try { r = m.guardarHecho(root, {
        dimension: opt('--dimension'), valor: opt('--valor'), texto: opt('--texto') === true ? undefined : opt('--texto'),
        claves: opt('--claves') && opt('--claves') !== true ? String(opt('--claves')).split(',') : [], idioma: opt('--idioma') || undefined,
        devlog: opt('--devlog') && opt('--devlog') !== true ? String(opt('--devlog')) : undefined,   // por defecto, la entrada de hoy
        enlaces: opt('--enlaces') && opt('--enlaces') !== true ? String(opt('--enlaces')).split(',') : [],   // dimensiones relacionadas
        alcance: opt('--alcance') || 'proyecto', duda: !!opt('--duda'),
        fuente: opt('--fuente') && opt('--fuente') !== true ? String(opt('--fuente')) : 'usuario',   // usuario | agente | devlog
        desde: opt('--desde') && opt('--desde') !== true ? new Date(opt('--desde')).toISOString() : undefined,
        hasta: opt('--hasta') && opt('--hasta') !== true ? new Date(opt('--hasta')).toISOString() : undefined,
    }); } catch (e) { out(`No guardado: ${e.message}`); process.exit(2); }   // p. ej. una familia fuera de la convención
    if (opt('--json')) { out(JSON.stringify(r, null, 2)); process.exit(0); }
    const que = { nuevo: 'Guardado', 'ya-estaba': 'Ya estaba (no se duplica)', sustituye: 'Guardado y sustituye a lo anterior', dudoso: 'Guardado como dudoso (no sustituye nada)' }[r.accion];
    out(`${que}: ${linea(r.hecho)}`);
    for (const s of r.sustituidos) out(`  sustituido: ${linea(s)}`);
    for (const a of r.avisos || []) out(a.tipo === 'casi-duplicado'
        ? `  ojo, casi duplicado (${a.motivo}): ${linea(a.hecho)} → si es lo mismo, --olvidar uno de los dos`
        : a.tipo === 'contradice' ? `  ojo, contradice (${a.motivo}): ${linea(a.hecho)} → pregunta al usuario cuál vale`
        : a.tipo === 'autocontenido' ? `  ojo, ¿se entiende solo? ${a.motivo}`
        : a.tipo === 'misma-dimension' ? `  ojo, ¿misma dimensión? ${a.motivo}: ${linea(a.hecho)}`
        : `  convención: ${a.motivo}`);
    process.exit(0);
}
if (opt('--buscar')) {
    const hits = m.buscarHechos(root, String(opt('--buscar')), { historico: !!opt('--historico'), limite: Number(opt('--limite')) || 8 });
    if (m.anotarUso) m.anotarUso(root, hits.map(x => x.hecho.id));
    // X-T11: lo que busca el propio agente se apunta (sin sesión: al cerrar, se asigna al turno por la hora) y, si lo
    // usa, el hecho aprende las palabras con que preguntó el usuario
    if (m.apuntarInyeccion) m.apuntarInyeccion(root, { sid: 'cli', origen: 'consulta', consulta: String(opt('--buscar')), items: hits.map(x => ({ fuente: 'hecho', id: x.hecho.id, texto: `[${x.hecho.dimension}] ${x.hecho.valor}`, puntuacion: x.puntuacion })) });
    if (opt('--json')) { out(JSON.stringify(hits, null, 2)); process.exit(0); }
    if (!hits.length) { out('Nada en la memoria de hechos para eso. Dilo así: no lo supongas.'); process.exit(0); }
    for (const x of hits) out(`${linea(x.hecho)}\n    ${x.motivo}`);
    process.exit(0);
}
if (opt('--recordar')) {   // las tres memorias a la vez: hechos, MEMORIA.md y devlog
    const l = m.recuerdo(root, String(opt('--recordar')), { historico: !!opt('--historico'), limite: Number(opt('--limite')) || 6 });
    if (m.anotarUso) m.anotarUso(root, l.filter(x => x.fuente === 'hecho').map(x => x.id));
    if (m.apuntarInyeccion) m.apuntarInyeccion(root, { sid: 'cli', origen: 'consulta', consulta: String(opt('--recordar')), items: l });
    if (opt('--json')) { out(JSON.stringify(l, null, 2)); process.exit(0); }
    if (!l.length) { out('Nada en hechos, memoria ni devlog para eso. Dilo así: no lo supongas.'); process.exit(0); }
    for (const x of l) out(`[${x.fuente}] ${x.texto}${x.ver && !new RegExp(`\\bver ${x.ver}\\b`).test(x.texto) ? ` · ver ${x.ver}` : ''}\n    ${x.motivo}`);
    process.exit(0);
}
if (opt('--contexto')) {
    const l = m.contextoHechos(root, { presupuesto: Number(opt('--presupuesto')) || 12 });
    if (opt('--json')) { out(JSON.stringify(l, null, 2)); process.exit(0); }
    out(l.length ? l.map(linea).join('\n') : 'Sin hechos guardados.');
    process.exit(0);
}
if (opt('--lista')) {
    const l = m.todosLosHechos(root).filter(h => opt('--todo') || h.estado === 'activo' || h.estado === 'dudoso');
    out(l.length ? l.map(linea).join('\n') : 'Sin hechos guardados.');
    process.exit(0);
}
// objetivos y pendientes: --en-curso <id|dimensión> · --resolver <id|dimensión> [--como "…"] · --abandonar <id|dimensión> [--motivo "…"]
for (const [flag, progreso, titulo] of [['--en-curso', 'en-curso', 'En curso'], ['--resolver', 'resuelto', 'Resuelto'], ['--abandonar', 'abandonado', 'Abandonado']]) {
    if (!opt(flag)) continue;
    const ref = String(opt(flag)), nota = [opt('--como'), opt('--motivo')].find(x => x && x !== true);
    let h = null;
    try { h = ref !== 'true' ? m.cambiarProgreso(root, ref, progreso, nota) : null; } catch (e) { out(e.message); process.exit(2); }
    out(h ? `${titulo}: ${linea(h)}${nota ? ` — ${nota}` : ''}` : 'No hay un objetivo o pendiente ABIERTO con ese id o dimensión (solo objetivo.* y pendiente.* tienen ciclo de vida).');
    process.exit(h ? 0 : 2);
}
if (opt('--abiertos')) {   // objetivos y pendientes abiertos, los más antiguos primero
    const l = m.abiertos(root);
    out(l.length ? l.map(h => `${linea(h)} · abierto desde ${fecha(h.creado)}${h.progreso === 'en-curso' ? ' (en curso)' : ''}`).join('\n') : 'No hay objetivos ni pendientes abiertos.');
    process.exit(0);
}
if (opt('--enlazar')) {   // --enlazar <dimensión A> <dimensión B>: al recordar A, llega también lo vigente de B (y al revés)
    const i = args.indexOf('--enlazar'), a = args[i + 1], b = args[i + 2];
    const h = a && b && !a.startsWith('--') && !b.startsWith('--') ? m.enlazarHechos(root, a, b) : null;
    out(h ? `Enlazado: ${linea(h)} → [${m.claveDimension(b)}]` : 'No hay un hecho vigente en esa dimensión (o faltan las dos dimensiones).');
    process.exit(h ? 0 : 2);
}
if (opt('--nada')) {   // revisado: el usuario no dijo nada estable que guardar (cuenta como revisión para el cierre)
    out('Revisado: nada nuevo que guardar en la memoria' + (opt('--motivo') && opt('--motivo') !== true ? ` (${opt('--motivo')})` : '') + '.');
    process.exit(0);
}
if (opt('--olvidar')) {
    const h = m.olvidarHecho(root, String(opt('--olvidar')));
    out(h ? `Olvidado (queda en el archivo como invalidado): ${linea(h)}` : 'No existe ese id.');
    process.exit(h ? 0 : 2);
}
if (opt('--informe')) {   // X-T4: el uso REAL (lo que se inyectó en las sesiones y si el agente lo usó)
    if (!m.informeUso) { out('Este Senzu no trae el informe de uso todavía: actualízalo.'); process.exit(2); }
    const dias = Number(opt('--dias')) || 30;
    const r = m.informeUso(root, { dias });
    if (opt('--json')) { out(JSON.stringify(r, null, 2)); process.exit(0); }
    if (!r.mensajes) { out(`Sin registro de uso en los últimos ${dias} días: se llena solo al hablar con el agente (senzu/.estado/recuerdo-uso.jsonl).`); process.exit(0); }
    out(`Uso real de la memoria (últimos ${dias} días)`);
    out(`  Mensajes con recuerdo: ${r.conRecuerdo} · silencios (nada que decir): ${r.silencios}`);
    out(`  Recuerdos inyectados: ${r.inyectados} · usados: ${r.usados} · ignorados: ${r.ignorados} · sin datos: ${r.sinDatos}`
        + (r.precision != null ? ` · precisión real: ${r.precision} %` : ''));
    if (r.debiles.usados + r.debiles.ignorados) out(`  Relaciones débiles: usadas ${r.debiles.usados} · ignoradas ${r.debiles.ignorados}`);
    if (r.ruido.length) { out('  Lo que más se ignora (posible ruido):'); for (const x of r.ruido) out(`    - [${x.fuente}] ${x.texto} (ignorado ${x.ignorado}, usado ${x.usado})`); }
    if (r.ignoradosRecientes.length) { out('  Ignorados recientes:'); for (const x of r.ignoradosRecientes) out(`    - «${x.consulta}» → ${x.texto}`); }
    if (r.silenciosRecientes.length) { out('  Silencios recientes (¿había algo que recordar?):'); for (const x of r.silenciosRecientes) out(`    - «${x.consulta}»`); }
    if (r.busquedas) out(`  Búsquedas del propio agente (--recordar/--buscar): ${r.busquedas}`);
    if (r.aprendido && r.aprendido.length) {
        out('  Aprendido del uso (palabras del usuario que ya traen el hecho; ×2 o más, confirmadas):');
        for (const x of r.aprendido) out(`    - [${x.dimension}] ${x.valor}: ${Object.entries(x.palabras).map(([w, n]) => n > 1 ? `${w} ×${n}` : w).join(', ')}`);
    }
    process.exit(0);
}
if (opt('--cortex')) {   // Cortex: la memoria en un HTML local, sin red; --cliente: sin nada privado, para enseñarlo
    if (!m.datosCortex) { out('Este Senzu no trae Cortex todavía: actualízalo.'); process.exit(2); }
    const cliente = !!opt('--cliente');
    const { htmlCortex } = await import(pathToFileURL(path.join(AQUI, 'cortex.mjs')).href);
    const datos = m.datosCortex(root, { cliente });
    const dir = opt('--salida') && opt('--salida') !== true ? path.resolve(String(opt('--salida'))) : m.ruta(root, 'cortex');
    fs.mkdirSync(dir, { recursive: true });
    // la memoria es privada: la carpeta se ignora a sí misma en git (nadie la commitea por descuido)
    const gi = path.join(dir, '.gitignore');
    if (!fs.existsSync(gi)) fs.writeFileSync(gi, '# Cortex: memoria privada del proyecto, generada. No se versiona.\n*\n');
    const file = path.join(dir, cliente ? 'cliente.html' : 'index.html');
    fs.writeFileSync(file, htmlCortex(datos, { cli: fileURLToPath(import.meta.url), idioma: opt('--idioma') && opt('--idioma') !== true ? String(opt('--idioma')).slice(0, 2).toLowerCase() : null }));
    const n = Object.values(datos.zonas).reduce((s, l) => s + l.length, 0);
    out(`Cortex${cliente ? ' (vista para el cliente)' : ''}: ${file}`);
    out(`  ${n} recuerdos · ${datos.cambios.length} cambios en 7 días · ${datos.abiertos.length} abiertos. Ábrelo en el navegador (funciona sin red).`);
    if (!cliente) out('  Tiene datos privados: para enseñarlo, genera la vista para el cliente con --cortex --cliente.');
    process.exit(0);
}
out('Uso: --guardar --dimension <familia.tema> --valor <texto> [--claves a,b] [--alcance usuario] [--duda] | --buscar <consulta> [--historico] | --contexto | --lista [--todo] | --olvidar <id> | --cortex [--cliente] [--salida <carpeta>]');
process.exit(2);
