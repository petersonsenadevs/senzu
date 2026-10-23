// Hook PreToolUse (Edit|Write|MultiEdit|NotebookEdit): bloquea la edición de archivos protegidos.
// Bloquea (exit 2 + motivo en STDERR):
//   - archivos GENERADOS por Senzu (CLAUDE.md, AGENTS.md, .cursor/rules, .windsurf/rules, .claude/skills/**, ...)
//   - secretos y config sensible: .env, .env.*, *.pem, *.key, id_rsa*, credentials*, secrets*
//   - dependencias y artefactos: vendor/**, node_modules/**, .git/**, dist/**, build/**, storage/framework/**, __pycache__/**
//   - migraciones ya ejecutadas/compartidas: que existan en git (no nuevas)
//   - rutas extra definidas en .claude/hooks/config.json -> protectedPaths (glob simples con * y **)
// Permite todo lo demás. Nunca bloquea la creación de archivos nuevos salvo secretos.

import fs from 'node:fs';
import path from 'node:path';
import { readHookInput, projectRoot, hookConfig, git, readText, relDelProyecto, rutaNativa, localeUI, msg } from './lib.mjs';

const p = readHookInput();
if (!p || !['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(p.tool_name)) process.exit(0);

let file = p.tool_input && p.tool_input.file_path ? String(p.tool_input.file_path) : '';
if (!file && p.tool_input && p.tool_input.notebook_path) file = String(p.tool_input.notebook_path);
if (!file) process.exit(0);

const root = projectRoot();
// Relativa a la raíz con «/», llegue la ruta como llegue (C:\, C:/, /c/…); fuera del proyecto, la absoluta
let rel = relDelProyecto(root, file);
if (rel === null) rel = rutaNativa(file, root).replace(/\\/g, '/');
const exists = fs.existsSync(file);

const lang = localeUI(root);
function deny(id, vars) {
    process.stderr.write(msg('guard.prefix', lang) + ' ' + msg(id, lang, vars) + '\n');
    process.stderr.write(msg('protect.fileLine', lang, { rel }) + '\n');
    process.exit(2);
}

// 1) Generados por Senzu (antes dev-standards: se reconocen las dos marcas)
if (/^(CLAUDE\.md|AGENTS\.md)$/i.test(rel) && exists) {
    const head = (readText(file) || '').split(/\r?\n/).slice(0, 2).join(' ');
    if (/GENERADO por (Senzu|dev-standards)/i.test(head))   // compat-dev-standards
        deny('protect.genGuide');
}
if (/^(\.claude\/skills|\.agents\/skills|\.cursor\/skills|\.windsurf\/skills|\.cursor\/rules|\.windsurf\/rules|\.claude\/hooks)\//i.test(rel)
    || /^(\.claude\/settings\.json|\.mcp\.json|\.dev-standards\.json|senzu\/senzu\.json)$/i.test(rel)) {   // compat-dev-standards
    deny('protect.genConfig');
}
if (/^(plugins|core\/skills-vendor)\//i.test(rel) && fs.existsSync(path.join(root, 'tools', 'vendor.ps1'))) {
    deny('protect.genPlugins');
}

// 1a) Maestros del logo elegido (design-system/<slug>/logos/final/): no se sobrescriben ni se borran. Añadir
//     archivos nuevos (otro tamaño, otro formato) sí se permite.
if (/(^|\/)design-system\/[^/]+\/logos\/final\//i.test(rel) && exists) {
    deny('protect.logoMaster');
}

// 1b) Convenciones adoptadas (/adoptar) selladas como inmutables
if (/^(senzu\/)?conventions\.(md|json)$/i.test(rel) && exists && /(senzu|dev-standards):inmutable/.test(readText(file) || '')) {   // compat-dev-standards
    deny('protect.conventions');
}
// 1c) Arquitectura declarada sellada (senzu/arquitectura/capas.json): relajarla para que pase un cambio no es arreglarlo
if (/^(senzu\/)?arquitectura\/capas\.json$/i.test(rel) && exists && /senzu:inmutable/.test(readText(file) || '')) {
    deny('protect.arquitectura');
}

// 2) Secretos
// (.env.example y parecidos NO: son la documentación de las claves, sin valores reales; feature-guard pide tenerlos al día)
if ((/(^|\/)\.env(\.|$)/i.test(rel) && !/(^|\/)\.env\.(example|sample|dist|template)$/i.test(rel)) ||/\.(pem|key|p12|pfx)$/i.test(rel) || /(^|\/)(id_rsa|id_ed25519)/i.test(rel) || /(^|\/)(credentials|secrets?)(\.|\/|$)/i.test(rel)) {
    deny('protect.secrets');
}

// 3) Dependencias y artefactos
if (/(^|\/)(vendor|node_modules|\.git|dist|build|\.next|\.nuxt|\.astro|__pycache__|\.venv|venv)\//i.test(rel) || /(^|\/)storage\/framework\//i.test(rel)) {
    deny('protect.deps');
}

// 4) Migraciones ya versionadas (Laravel/Prisma/Alembic): solo bloquea si el archivo ya esta en git
if (exists && /(^|\/)(database\/migrations|prisma\/migrations|alembic\/versions|migrations)\/[^/]+/i.test(rel)) {
    if (git(root, ['ls-files', '--error-unmatch', '--', rel])) deny('protect.migration');
}

// 5) Rutas extra del proyecto (config.json -> protectedPaths)
const cfg = hookConfig(root);
if (cfg && cfg.protectedPaths) {
    try {
        for (const g of [].concat(cfg.protectedPaths)) {
            if (!g) continue;
            const esc = String(g).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp('^' + esc.replace(/\\\*\\\*\//g, '(.*/)?').replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^/]*') + '$', 'i');
            if (rx.test(rel)) deny('protect.projectPath', { g });
        }
    } catch {}
}
process.exit(0);
