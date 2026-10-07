// Hook UserPromptSubmit: la memoria se alimenta de lo que dice el usuario, no de que el agente se acuerde.
// 1. Guarda las últimas peticiones de la sesión (las lee estado-sesion para /retomar).
// 2. Si la petición trae una REGLA o una CORRECCIÓN clara («no vuelvas a…», «te dije…», «a partir de ahora…»,
//    «siempre usa…»), pide al agente apuntarla antes de seguir (memoria del proyecto o del usuario) y deja una
//    marca: estado-sesion bloquea el cierre una vez si al final no está apuntada.
// Solo señales fuertes: «siempre» o «nunca» sueltos no cuentan (salen en cualquier frase).

import fs from 'node:fs';
import { readHookInput, sessionFlag, outHookJson, rutaMemoriaUsuario, projectRoot, rutaRel, esMensajeDelUsuario } from './lib.mjs';

const p = readHookInput();
const texto = p && typeof p.prompt === 'string' ? p.prompt.trim() : '';
if (!texto || !esMensajeDelUsuario(texto)) process.exit(0);   // lo de un subagente no es una corrección del usuario
const sid = p.session_id ? String(p.session_id) : 'default';
const corto = texto.replace(/\s+/g, ' ').slice(0, 200);

// 1. últimas peticiones (las 5 últimas bastan para saber de qué iba la sesión)
try {
    const f = sessionFlag(sid, 'peticiones');
    let previas = [];
    try { previas = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
    previas.push({ t: new Date().toISOString(), texto: corto });
    fs.writeFileSync(f, JSON.stringify(previas.slice(-5)));
} catch {}

// 2. reglas y correcciones
const REGLA = new RegExp([
    'no vuelvas a', 'nunca m[aá]s', 'ya te (lo )?(he )?dicho', 'te (lo )?(he )?dicho', 'te dije', 'a partir de ahora',
    'de ahora en adelante', 'para la pr[oó]xima', 'recuerda que', 'acu[eé]rdate de', 'cada vez que', 'no me gusta que',
    'prefiero que', 'no quiero que', 'eso no era (para|lo)', 'otra vez lo mismo', 'siempre (usa|haz|pon|escribe|responde|commitea|crea|pregunta)',
    'nunca (uses|hagas|pongas|commitees|subas|toques|borres|escribas)', 'no (lo|me) (vuelvas|repitas)',
].join('|'), 'i');
const m = REGLA.exec(texto);
if (!m) process.exit(0);
try { fs.writeFileSync(sessionFlag(sid, 'memoria-pendiente'), corto); } catch {}
const root = projectRoot();
outHookJson('UserPromptSubmit', {
    additionalContext: `[senzu] Esto parece una regla o una corrección del usuario («${m[0]}…»). Si es duradera, apúntala ANTES de seguir: `
        + `de este proyecto → ${rutaRel(root, 'devlog')}/MEMORIA.md («Reglas del cliente y del proyecto» o «Lo que no funcionó»); `
        + `de todos sus proyectos → ${rutaMemoriaUsuario().replace(/\\/g, '/')} (memoria del usuario). Si dudas cuál, pregúntale en una línea. `
        + 'Si solo era una corrección de este momento (no una regla), sigue sin apuntar nada y dilo al cerrar.',
});
process.exit(0);
