// Hook PreToolUse para Claude Code. Bloquea acciones prohibidas:
// git push, borrados/alteraciones destructivas de BD, resets destructivos, rm -rf peligrosos,
// comandos devops/linux peligrosos (curl|bash, chmod 777, dd a discos, mkfs, prune forzado...).
//
// Claude Code invoca este script pasando por STDIN un JSON con { tool_name, tool_input }.
// Si el comando coincide con un patrón prohibido, el hook lo DENIEGA:
//   - Escribe el motivo en STDERR
//   - Sale con código 2  (=> Claude Code bloquea la ejecución y muestra el motivo)
// Si no coincide, sale con 0 (permite continuar el flujo de permisos normal).
// Se usa como capa "inteligente" además de permissions.deny (capa simple) en settings.json.

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readHookInput, projectRoot, permisosProyecto, envSenzu, textoLogos, ramaProtegida, convencionesSelladas, relDelProyecto, rutaNativa, sinTextoCitado, localeUI, msg } from './lib.mjs';

const p = readHookInput();
if (!p) process.exit(0);
if (!['Bash', 'PowerShell'].includes(p.tool_name)) process.exit(0);

const cmd = p.tool_input && p.tool_input.command ? String(p.tool_input.command) : '';
if (!cmd.trim()) process.exit(0);
// Las reglas miran lo que se EJECUTA: el texto citado (mensajes de commit, heredocs a un archivo, echo, grep…) fuera.
// El mensaje del commit (formato, Co-Authored-By) se valida sobre el comando original, cmd.
const c = sinTextoCitado(cmd);
const root = projectRoot();
const lang = localeUI(root);   // idioma de la UI del proyecto (en por defecto); los mensajes salen por msg(id, lang)
const permisos = permisosProyecto(root);
// ramas principales (main, staging, production…): lista única en lib.mjs (ramaProtegida)
function ramaActual() {
    try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim(); } catch { return ''; }
}

// ¿Este git push lo permite el proyecto? (permisos en senzu/senzu.json; el forzado nunca)
// Mira CADA "git push" de la línea: destino explícito (main, HEAD:main, origin main) o, si no hay, la rama actual.
function pushPermitido() {
    if (!permisos.push) return false;
    const pushes = c.split(/&&|\|\||;|\n/).map(s => s.trim()).filter(s => /\bgit\s+push\b/i.test(s));
    for (const s of pushes) {
        // solo un «git push» escrito tal cual: dentro de bash -c, un heredoc, xargs o $( ) no se sabe con seguridad
        // a qué rama va, así que no se permite (sigue bloqueado)
        if (!/^git\s+push\b/i.test(s)) return false;
        const args = s.replace(/^.*?\bgit\s+push\b/i, '').trim().split(/\s+/).filter(Boolean);
        if (args.some(a => /^(-f|--force|--force-with-lease|--force-if-includes|--mirror|--delete|-d)(=|$)/i.test(a))) return false;
        const posicionales = args.filter(a => !a.startsWith('-'));
        const refspecs = posicionales.slice(1);   // el primero es el remoto
        if (refspecs.some(r => r.startsWith('+') || r.startsWith(':'))) return false;   // +rama = forzado; :rama = borrar en remoto
        const destinos = refspecs.length ? refspecs.map(r => r.split(':').pop().replace(/^refs\/heads\//, '')) : [ramaActual()];
        if (destinos.some(d => !d || ramaProtegida(root, d)) && !permisos.pushMain) return false;
    }
    return pushes.length > 0;
}

// --- Patrones prohibidos: { p: patrón; id: mensaje en el catálogo (messages.mjs) } ---
const rules = [
    { p: /\bgit\s+push\b/i, id: 'rule.gitPush' },
    { p: /\bgit\s+push\s+.*--force/i, id: 'rule.gitPushForce' },
    { p: /--force-with-lease/i, id: 'rule.forceWithLease' },
    { p: /\bdrop\s+(database|table|schema)\b/i, id: 'rule.dropDb' },
    { p: /\btruncate\s+table\b|\btruncate\s+\w/i, id: 'rule.truncate' },
    { p: /\bdelete\s+from\s+\w+\s*(;|$)/i, id: 'rule.deleteNoWhere' },
    { p: /\bupdate\s+\w+\s+set\b(?!.*\bwhere\b)/i, id: 'rule.updateNoWhere' },
    { p: /migrate:(fresh|refresh)/i, id: 'rule.migrateFresh' },
    { p: /\bdb:wipe\b/i, id: 'rule.dbWipe' },
    { p: /prisma\s+migrate\s+reset/i, id: 'rule.prismaReset' },
    { p: /drop_all\b|metadata\.drop_all/i, id: 'rule.dropAll' },
    { p: /\bgit\s+reset\s+--hard\b/i, id: 'rule.resetHard' },
    { p: /\bgit\s+clean\s+-\w*f/i, id: 'rule.gitClean' },
    { p: /rm\s+-\w*r\w*f|rm\s+-\w*f\w*r/i, id: 'rule.rmrf' },
    { p: /remove-item\s+.*-recurse.*-force|remove-item\s+.*-force.*-recurse/i, id: 'rule.removeItem' },
    { p: /\bnpm\s+publish\b|\bcomposer\s+.*publish\b/i, id: 'rule.publish' },
    // --- devops / linux peligrosos ---
    { p: /\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/i, id: 'rule.curlBash' },
    { p: /\bchmod\s+(-[a-z]+\s+)*0?777\b/i, id: 'rule.chmod777' },
    { p: /\bdd\b[^|;&]*\bof=\/dev\//i, id: 'rule.dd' },
    { p: /\bmkfs(\.\w+)?\b/i, id: 'rule.mkfs' },
    { p: /\bdocker\s+(system|volume|image|container)\s+prune\b/i, id: 'rule.dockerPrune' },
    { p: /\bsystemctl\s+(stop|disable|mask)\b/i, id: 'rule.systemctl' },
    { p: /\biptables\s+(-F\b|--flush)|\bnft\s+flush\s+ruleset\b/i, id: 'rule.iptables' },
    { p: /\bcrontab\s+-\w*r\b/i, id: 'rule.crontab' },
];

function deny(lines) {
    for (const l of lines) process.stderr.write(l + '\n');
    process.exit(2);
}

// --- Los permisos y los hooks apagados los decide SOLO el usuario ---
// El agente no puede escribir el marcador (senzu/senzu.json o el antiguo .dev-standards.json) desde la terminal (redirecciones, tee, sed -i, Set-Content, cp/mv…)
// ni lanzar el instalador con los flags que dan permisos o apagan hooks: eso lo ejecuta el usuario (menú o "!").
// ¿El comando ESCRIBE, mueve o borra ESE archivo? Se mira el destino, trozo a trozo (;, &&, ||, |, saltos de
// línea): leer el marcador y escribir en otro sitio en el mismo comando no es escribirlo. Antes bastaba con que
// el comando tuviera un «>» o un «.write(» en cualquier parte (process.stdout.write al leer el marcador → bloqueo).
const VERBOS_ESCRIBEN = /(\btee\b|\bsed\s+(-\w*\s+)*-i|\bperl\s+(-\w*\s+)*-i|\b(set|add|clear)-content\b|\bout-file\b|\bnew-item\b|\btruncate\b|\b(cp|mv|copy-item|move-item|rm|del|remove-item|ren|rename-item|unlink)\b|write(File|FileSync)\b|append(File|FileSync)\b|\b(rmSync|renameSync|copyFileSync|copyFile)\b|open\([^)]*['"][wa]|\bgit\s+(checkout|restore|stash|reset|rm|mv)\b)/i;
function escribeEn(cmdTxt, archivo) {
    const limpio = cmdTxt.replace(/\d?>&\d|\d?>\s*\/dev\/null|\d?>\s*\$null|\d?>\s*nul\b/gi, '');
    const redir = new RegExp(`>>?\\|?\\s*["']?[^\\s"'|;&<>]*(?:${archivo.source})`, 'i');   // > senzu.json, >> "x/senzu.json"
    if (redir.test(limpio)) return true;
    return limpio.split(/&&|\|\||;|\n|\|/).some(s => archivo.test(s) && VERBOS_ESCRIBEN.test(s));
}
if (escribeEn(c, /\.dev-standards\.json|\bsenzu\.json\b/i)) {
    deny([msg('marker.block', lang)]);
}
// --- Convenciones SELLADAS (/adoptar): tampoco desde la terminal ---
// protect-files para las ediciones; esto, para los comandos (sed -i, >, rm, mv, Set-Content, git checkout…).
// No hay escape para el agente: si el usuario decide cambiarlas, lo hace él (o las borra y re-ejecuta /adoptar).
if (/\bconventions\.(md|json)\b|\bcapas\.json\b/i.test(c) && convencionesSelladas(root) && escribeEn(c, /\bconventions\.(md|json)\b|\bcapas\.json\b/i)) {
    deny(msg('conventions.block', lang));
}
if (/\b(SENZU|DEV_STANDARDS)_ALLOW_CONVENCIONES\b/i.test(c)) {
    deny([msg('conventions.allowKey', lang)]);
}
// El menú del instalador es para el usuario: el agente no le pasa respuestas por tubería ni redirección
// (dentro de la MISMA orden: sin cruzar saltos de línea; el «-i» de un sed en la línea siguiente no es el menú)
if (/\|\s*(node|npx)\b[^|;&\n]*\binit\.mjs\b|\b(node|npx)\s[^|;&\n]*\binit\.mjs\b[^|;&\n]*<\s*\S|\b(node|npx)\s[^|;&\n]*\binit\.mjs\b[^|;&\n]*\s(-i|--interactivo)\b/i.test(c)) {
    deny([msg('installer.menu', lang)]);
}
// Instalar en la carpeta temporal (proyectos de prueba que se tiran) con esos flags no da permisos a nadie
const rutasDestino = [...c.matchAll(/(?:^|\s)-{1,2}path\s+("[^"]+"|'[^']+'|[^\s;&|]+)/gi)].map(m => m[1].replace(/^["']|["']$/g, ''));
// (en temp Y fuera del proyecto actual: «--path .» es este proyecto aunque él mismo viva en temp)
const soloEnTemporal = rutasDestino.length > 0 && rutasDestino.every(r => !/[$%]/.test(r)
    && relDelProyecto(os.tmpdir(), rutaNativa(r, root)) !== null && relDelProyecto(root, rutaNativa(r, root)) === null);
if (!soloEnTemporal && /(^|\s)(--permitir|-permitir|--apagar-hooks|-apagarhooks|--sin-permisos|-sinpermisos|--encender-hooks|-encenderhooks|--omitir-paso|--sin-omitir)\b/i.test(c)) {
    deny([msg('installer.permisos', lang)]);
}

// --- Reglas de git commit: rama protegida, Conventional Commits, sin co-autores ---
if (/\bgit\s+commit\b/i.test(c)) {
    const branch = ramaActual();
    if (ramaProtegida(root, branch) && !permisos.commitEnMain) {
        deny([msg('commit.protectedBranch', lang, { branch })]);
    }
    if (/co-authored-by/i.test(cmd)) {
        deny([msg('commit.coauthor', lang)]);
    }
    // Mensaje: -m "..." o -m '...'  (se valida solo el primer -m)
    let mensaje = null;
    let m = /-m\s+"([^"]*)"/is.exec(cmd);
    if (m) mensaje = m[1];
    else { m = /-m\s+'([^']*)'/is.exec(cmd); if (m) mensaje = m[1]; }
    if (mensaje) {
        const first = mensaje.split(/\r?\n/)[0].trim();
        if (!/^(feat|fix|refactor|docs|test|chore|perf|build|ci|style|revert)(\([\w\-\./ ]+\))?!?:\s\S/.test(first)) {
            deny([msg('commit.conventional', lang, { first })]);
        }
        if (first.length > 72) {
            deny([msg('commit.tooLong', lang, { length: first.length })]);
        }
    }
}

// --- Deploy a produccion: NUNCA sin aprobacion explicita del usuario ---
const deployProdPat = /(netlify\s+deploy(?=.*--prod))|(\bvercel\b(?=.*--prod))|(\bfly\s+deploy\b)|(\bwrangler\s+(deploy|publish)\b(?!.*--env[= ](dev|preview)))/i;
if (envSenzu('ALLOW_DEPLOY') !== '1') {
    if (deployProdPat.test(c)) {
        deny(msg('deploy.block', localeUI(root)));
    }
}

// --- Web publica sin NINGUNA pagina legal (privacidad/cookies): no se publica a produccion ---
// Solo se llega aqui con el deploy a prod ya aprobado (ALLOW_DEPLOY=1); si no, el bloque de arriba ya corto.
// Busca por nombre de archivo en el arbol del proyecto; con una sola pagina legal basta (el detalle lo cubre /lanzar).
function tieneLegales(dir) {
    const legalRe = /(privacidad|privacy|cookies?|aviso.?legal|datenschutz|rgpd|gdpr|lopd|t[eé]rminos|terms|pol[ií]tica.?(de.?)?(privacidad|cookies|datos))/i;
    const saltar = new Set(['node_modules', 'dist', 'build', 'out', 'vendor', 'coverage', 'senzu', 'storage', 'target', 'tmp']);
    const stack = [{ d: dir, depth: 0 }];
    let visto = 0;
    while (stack.length) {
        const { d, depth } = stack.pop();
        let ents;
        try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
        for (const e of ents) {
            if (visto++ > 20000) return true;   // repo enorme: no bloqueamos a ciegas (lado seguro)
            if (e.isDirectory()) {
                if (e.name.startsWith('.') || saltar.has(e.name)) continue;
                if (depth < 6) stack.push({ d: path.join(d, e.name), depth: depth + 1 });
            } else if (legalRe.test(e.name)) {
                return true;
            }
        }
    }
    return false;
}
if (deployProdPat.test(c) && envSenzu('ALLOW_SIN_LEGAL') !== '1' && !tieneLegales(root)) {
    deny(msg('legal.block', localeUI(root)));
}

// --- Logo ya elegido: los generadores de logos e iconos no se lanzan sin que el usuario lo pida ---
// (graphic-design scripts/logo|icon/generate.py, o image-gen con un prompt de logo). Escape tras pedirlo: SENZU_ALLOW_LOGO=1.
if (envSenzu('ALLOW_LOGO') !== '1' && (/scripts[\\/](logo|icon)[\\/]generate\.py/i.test(c) || (/image-gen[\\/]scripts[\\/]generate\.mjs/i.test(c) && /\b(logo|logotipo|isotipo|s[ií]mbolo|favicon)\b/i.test(c)))) {
    const elegido = textoLogos(root);
    if (elegido) deny([
        msg('guard.prefix', lang) + ' ' + elegido,
        msg('logo.retry', lang),
    ]);
}

// --- Librerias vetadas (regla dura: sin jQuery/Bootstrap ni segunda libreria de componentes sin aprobacion) ---
if (envSenzu('ALLOW_LIB') !== '1' && /\b(npm|pnpm|yarn|bun)\s+(install|add|i)\b/i.test(c)) {
    if (/\b(jquery|bootstrap)\b/i.test(c)) {
        deny(msg('lib.vetada', lang));
    }
}

const pushOk = pushPermitido();
for (const r of rules) {
    if (pushOk && r === rules[0]) continue;   // push normal permitido por el proyecto (las reglas de forzado siguen)
    if (r.p.test(c)) {
        deny([
            msg('guard.prefix', lang) + ' ' + msg(r.id, lang),
            msg('guard.cmdLine', lang, { cmd }),
            msg('guard.ruleAsk', lang),
        ]);
    }
}

process.exit(0);
