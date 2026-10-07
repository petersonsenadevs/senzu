#!/usr/bin/env node
// Memoria de HECHOS (determinista, en cualquier idioma, sin red): lo que el usuario afirma de forma estable.
// El agente entiende la frase (en el idioma que sea) y la guarda estructurada; el motor la sustituye, la fecha y la
// recupera siempre igual. Para buscar entre idiomas, añade --claves en otros idiomas (p. ej. en inglés y en el del usuario).
//   node memoria.mjs --guardar --dimension identidad.ubicacion --valor "Málaga" [--texto "vivo en Málaga"]
//        [--claves "ciudad,city,vive,lives"] [--idioma es] [--alcance proyecto|usuario] [--duda] [--desde AAAA-MM-DD] [--hasta AAAA-MM-DD]
//   node memoria.mjs --buscar "dónde vive" [--historico] [--limite 8] [--json]
//   node memoria.mjs --contexto [--presupuesto 12]      lo vigente, repartido por familias (lo usa el inicio de sesión)
//   node memoria.mjs --lista [--todo] | --olvidar <id>
//   node memoria.mjs --nada [--motivo "…"]              revisado: nada estable que guardar en esta sesión
// Dimensiones: «familia.tema» libre (identidad.nombre, proyecto.stack, preferencia.gestor-paquetes, restriccion.presupuesto…).
// Un valor nuevo en la misma dimensión SUSTITUYE al anterior (queda en el histórico); objetivo.*, pendiente.*, nota.*,
// hecho.* y aprendizaje.* acumulan. --duda: el usuario no lo afirmó del todo («creo que…»): se guarda sin sustituir.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? (args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const root = path.resolve(opt('--path') || process.env.CLAUDE_PROJECT_DIR || process.cwd());
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
const fecha = s => String(s || '').slice(0, 10);
const linea = h => `- [${h.dimension}] ${h.valor}${h.estado !== 'activo' ? ` (${h.estado}${h.hasta ? ' ' + fecha(h.hasta) : ''})` : ''}${h.desde ? ` · desde ${fecha(h.desde)}` : ''}${h.devlog ? ` · ver ${h.devlog}` : ''} · ${h.alcance} · ${h.id}`;

if (opt('--guardar')) {
    const r = m.guardarHecho(root, {
        dimension: opt('--dimension'), valor: opt('--valor'), texto: opt('--texto') === true ? undefined : opt('--texto'),
        claves: opt('--claves') && opt('--claves') !== true ? String(opt('--claves')).split(',') : [], idioma: opt('--idioma') || undefined,
        devlog: opt('--devlog') && opt('--devlog') !== true ? String(opt('--devlog')) : undefined,   // por defecto, la entrada de hoy
        alcance: opt('--alcance') || 'proyecto', duda: !!opt('--duda'),
        desde: opt('--desde') && opt('--desde') !== true ? new Date(opt('--desde')).toISOString() : undefined,
        hasta: opt('--hasta') && opt('--hasta') !== true ? new Date(opt('--hasta')).toISOString() : undefined,
    });
    if (opt('--json')) { out(JSON.stringify(r, null, 2)); process.exit(0); }
    const que = { nuevo: 'Guardado', 'ya-estaba': 'Ya estaba (no se duplica)', sustituye: 'Guardado y sustituye a lo anterior', dudoso: 'Guardado como dudoso (no sustituye nada)' }[r.accion];
    out(`${que}: ${linea(r.hecho)}`);
    for (const s of r.sustituidos) out(`  sustituido: ${linea(s)}`);
    process.exit(0);
}
if (opt('--buscar')) {
    const hits = m.buscarHechos(root, String(opt('--buscar')), { historico: !!opt('--historico'), limite: Number(opt('--limite')) || 8 });
    if (opt('--json')) { out(JSON.stringify(hits, null, 2)); process.exit(0); }
    if (!hits.length) { out('Nada en la memoria de hechos para eso. Dilo así: no lo supongas.'); process.exit(0); }
    for (const x of hits) out(`${linea(x.hecho)}\n    ${x.motivo}`);
    process.exit(0);
}
if (opt('--recordar')) {   // las tres memorias a la vez: hechos, MEMORIA.md y devlog
    const l = m.recuerdo(root, String(opt('--recordar')), { historico: !!opt('--historico'), limite: Number(opt('--limite')) || 6 });
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
if (opt('--nada')) {   // revisado: el usuario no dijo nada estable que guardar (cuenta como revisión para el cierre)
    out('Revisado: nada nuevo que guardar en la memoria' + (opt('--motivo') && opt('--motivo') !== true ? ` (${opt('--motivo')})` : '') + '.');
    process.exit(0);
}
if (opt('--olvidar')) {
    const h = m.olvidarHecho(root, String(opt('--olvidar')));
    out(h ? `Olvidado (queda en el archivo como invalidado): ${linea(h)}` : 'No existe ese id.');
    process.exit(h ? 0 : 2);
}
out('Uso: --guardar --dimension <familia.tema> --valor <texto> [--claves a,b] [--alcance usuario] [--duda] | --buscar <consulta> [--historico] | --contexto | --lista [--todo] | --olvidar <id>');
process.exit(2);
