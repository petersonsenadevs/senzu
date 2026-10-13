// Catalogo de los mensajes de la UI que ve el usuario (muros, avisos), por idioma. El CONTENIDO de las skills
// NO esta aqui: lo lee el agente, que responde en el idioma del usuario. Un id por mensaje; valor {en, es}.
// - El idioma lo resuelve localeUI(root) en lib.mjs (por defecto 'en').
// - El castellano (es) se mantiene BYTE A BYTE como estaba inline en los hooks: los tests en es no cambian.
// - Interpolacion: {var} se sustituye con el objeto vars de msg(id, lang, vars).
// Piloto (F0-T2): deploy (guard.mjs) y verify-build (stop-guard.mjs). El resto de mensajes migra en F1-T1.
export const CAT = {
    'deploy.block': {
        en: [
            "[BLOCKED by Senzu] Production deploy detected. It needs the user's explicit approval right now (/deploy checklist: fresh verified backup + rollback plan + post-deploy smoke test).",
            'Once approved: retry with SENZU_ALLOW_DEPLOY=1 and record the approval and the result in the devlog. Preview deploys (without --prod) pass with no wall.',
        ],
        es: [
            '[BLOQUEADO por Senzu] Deploy a PRODUCCION detectado. Requiere aprobacion explicita del usuario en este momento (checklist /desplegar: backup fresco verificado + plan de rollback + smoke posterior).',
            'Con la aprobacion recibida: reintenta con SENZU_ALLOW_DEPLOY=1 y documenta la aprobacion y el resultado en el devlog. Los deploys de preview (sin --prod) pasan sin muro.',
        ],
    },
    'stop.verifyBuild': {
        en: "You edited code and there is no verification afterward: run 'node <skills-dir>/code-quality/scripts/verify-build.mjs' (runs the stack's lint/types/tests/build and leaves a record) or the stack commands by hand, fix the failures and paste the result before closing.",
        es: "Has editado codigo y NO hay verificacion posterior: ejecuta 'node <skills-dir>/code-quality/scripts/verify-build.mjs' (corre lint/types/tests/build del stack y deja constancia) o los comandos del stack a mano, corrige los fallos y pega el resultado antes de cerrar.",
    },

    // --- guard: comandos prohibidos (array rules) + envoltura comun ---
    'guard.prefix': { en: '[BLOCKED by Senzu]', es: '[BLOQUEADO por Senzu]' },
    'guard.cmdLine': { en: 'Command: {cmd}', es: 'Comando: {cmd}' },
    'guard.ruleAsk': {
        en: 'If you really want to do it, ask me for explicit approval and run it yourself, or authorize it just this once.',
        es: 'Si de verdad quieres hacerlo, pídeme aprobación explícita y ejecútalo tú, o autorízalo para esta vez.',
    },
    'rule.gitPush': {
        en: 'git push is forbidden without explicit approval. (If the user wants to allow it in this project: "permisos": { "push": true } in senzu/senzu.json; to a main branch (main, develop, staging, production, release/…), also "pushMain": true. The user decides, not the agent.)',
        es: 'git push está prohibido sin aprobación explícita. (Si el usuario quiere permitirlo en este proyecto: "permisos": { "push": true } en senzu/senzu.json; a una rama principal (main, develop, staging, production, release/…), además "pushMain": true. Lo decide el usuario, no el agente.)',
    },
    'rule.gitPushForce': { en: 'git push --force is strictly forbidden.', es: 'git push --force está terminantemente prohibido.' },
    'rule.forceWithLease': { en: 'force push (--force-with-lease) forbidden.', es: 'push forzado (--force-with-lease) prohibido.' },
    'rule.dropDb': { en: 'DROP DATABASE/TABLE/SCHEMA on the DB requires explicit approval.', es: 'DROP DATABASE/TABLE/SCHEMA en BD requiere aprobación explícita.' },
    'rule.truncate': { en: 'TRUNCATE on the DB requires explicit approval.', es: 'TRUNCATE en BD requiere aprobación explícita.' },
    'rule.deleteNoWhere': { en: 'DELETE without WHERE requires explicit approval.', es: 'DELETE sin WHERE requiere aprobación explícita.' },
    'rule.updateNoWhere': { en: 'UPDATE without WHERE requires explicit approval.', es: 'UPDATE sin WHERE requiere aprobación explícita.' },
    'rule.migrateFresh': { en: 'migrate:fresh/refresh is destructive: requires approval.', es: 'migrate:fresh/refresh es destructivo: requiere aprobación.' },
    'rule.dbWipe': { en: 'db:wipe is destructive: requires approval.', es: 'db:wipe es destructivo: requiere aprobación.' },
    'rule.prismaReset': { en: 'prisma migrate reset is destructive: requires approval.', es: 'prisma migrate reset es destructivo: requiere aprobación.' },
    'rule.dropAll': { en: 'drop_all (SQLAlchemy) is destructive: requires approval.', es: 'drop_all (SQLAlchemy) es destructivo: requiere aprobación.' },
    'rule.resetHard': { en: 'git reset --hard discards work: requires approval.', es: 'git reset --hard descarta trabajo: requiere aprobación.' },
    'rule.gitClean': { en: 'git clean -f removes untracked files: requires approval.', es: 'git clean -f elimina archivos no versionados: requiere aprobación.' },
    'rule.rmrf': { en: 'rm -rf requires review: it can delete too much.', es: 'rm -rf requiere revisión: puede borrar de más.' },
    'rule.removeItem': { en: 'Remove-Item -Recurse -Force requires review.', es: 'Remove-Item -Recurse -Force requiere revisión.' },
    'rule.publish': { en: 'Publishing packages requires explicit approval.', es: 'Publicar paquetes requiere aprobación explícita.' },
    'rule.curlBash': { en: 'curl|bash runs remote code without reviewing it: download the script, review it and run it in two steps.', es: 'curl|bash ejecuta código remoto sin revisarlo: descarga el script, revísalo y ejecútalo en dos pasos.' },
    'rule.chmod777': { en: 'chmod 777 opens the file to everyone: use minimal permissions (644/755) or ask for approval.', es: 'chmod 777 abre el archivo a todo el mundo: usa permisos mínimos (644/755) o pide aprobación.' },
    'rule.dd': { en: 'dd on /dev/* can destroy an entire disk: requires explicit approval.', es: 'dd sobre /dev/* puede destruir un disco entero: requiere aprobación explícita.' },
    'rule.mkfs': { en: 'mkfs formats a device (erases EVERYTHING): requires explicit approval.', es: 'mkfs formatea un dispositivo (borra TODO): requiere aprobación explícita.' },
    'rule.dockerPrune': { en: 'docker prune deletes shared machine resources (volumes = data): requires approval.', es: 'docker prune borra recursos compartidos de la máquina (volúmenes = datos): requiere aprobación.' },
    'rule.systemctl': { en: 'Stopping/disabling system services can take down production: requires explicit approval.', es: 'Parar/deshabilitar servicios del sistema puede tumbar producción: requiere aprobación explícita.' },
    'rule.iptables': { en: 'Flushing the firewall leaves the server exposed: requires explicit approval.', es: 'Vaciar el firewall deja el servidor expuesto: requiere aprobación explícita.' },
    'rule.crontab': { en: "crontab -r deletes ALL the user's cron jobs (no undo): requires approval.", es: 'crontab -r borra TODOS los cron del usuario (sin deshacer): requiere aprobación.' },

    // --- guard: deny sueltos (marcador, convenciones, instalador, commit, logo, librerias) ---
    'marker.block': {
        en: '[BLOCKED by Senzu] The project marker (senzu/senzu.json) stores the project permissions and only the user changes it (or the installer launched by the user). Read it if you need to, but do not write it.',
        es: '[BLOQUEADO por Senzu] El marcador del proyecto (senzu/senzu.json) guarda los permisos del proyecto y solo lo cambia el usuario (o el instalador lanzado por el usuario). Léelo si lo necesitas, pero no lo escribas.',
    },
    'conventions.block': {
        en: [
            '[BLOCKED by Senzu] The project conventions are SEALED as immutable (/adopt): they are not written, moved, deleted or restored from the agent, by any path.',
            'Read them and write the code as they say. If the user wants to change them, let them do it: delete conventions.md and conventions.json and re-run /adopt.',
        ],
        es: [
            '[BLOQUEADO por Senzu] Las convenciones del proyecto están SELLADAS como inmutables (/adoptar): no se escriben, mueven, borran ni restauran desde el agente, por ningún camino.',
            'Léelas y escribe el código como dicen. Si el usuario quiere cambiarlas, que lo haga él: borra conventions.md y conventions.json y re-ejecuta /adoptar.',
        ],
    },
    'conventions.allowKey': {
        en: '[BLOCKED by Senzu] SENZU_ALLOW_CONVENCIONES is the user\'s key to commit a change to the sealed conventions: the agent does not use it.',
        es: '[BLOQUEADO por Senzu] SENZU_ALLOW_CONVENCIONES es la llave del usuario para commitear un cambio de las convenciones selladas: no la usa el agente.',
    },
    'installer.menu': {
        en: '[BLOCKED by Senzu] The installer menu is answered by the user (that is where permissions are granted and hooks turned off). To install without the menu use the selection flags (--seleccion, --grupos...); the menu, let them open it in their terminal.',
        es: '[BLOQUEADO por Senzu] El menú del instalador lo responde el usuario (ahí se dan permisos y se apagan hooks). Para instalar sin menú usa los flags de selección (--seleccion, --grupos...); el menú, que lo abra él en su terminal.',
    },
    'installer.permisos': {
        en: '[BLOCKED by Senzu] Granting permissions, turning off hooks or skipping method steps is the user\'s decision: let them run it (in Claude Code, typing "!" before the command) or from the installer menu.',
        es: '[BLOQUEADO por Senzu] Dar permisos, apagar hooks u omitir pasos del método lo decide el usuario: que lo ejecute él (en Claude Code, escribiendo "!" delante del comando) o desde el menú del instalador.',
    },
    'commit.protectedBranch': {
        en: "[BLOCKED by Senzu] No committing on '{branch}'. Create a branch (git switch -c feat/...) and commit there. (If the user wants to allow it in this project: \"permisos\": { \"commitEnMain\": true } in senzu/senzu.json.)",
        es: "[BLOQUEADO por Senzu] No se commitea en '{branch}'. Crea una rama (git switch -c feat/...) y commitea ahi. (Si el usuario lo quiere permitir en este proyecto: \"permisos\": { \"commitEnMain\": true } en senzu/senzu.json.)",
    },
    'commit.coauthor': {
        en: '[BLOCKED by Senzu] Commits do not carry Co-Authored-By (team rule).',
        es: '[BLOQUEADO por Senzu] Los commits no llevan Co-Authored-By (regla del equipo).',
    },
    'commit.conventional': {
        en: "[BLOCKED by Senzu] The message does not follow Conventional Commits: '{first}'. Format: type(scope): description  (feat|fix|refactor|docs|test|chore|perf|build|ci|style|revert).",
        es: "[BLOQUEADO por Senzu] El mensaje no sigue Conventional Commits: '{first}'. Formato: tipo(scope): descripcion  (feat|fix|refactor|docs|test|chore|perf|build|ci|style|revert).",
    },
    'commit.tooLong': {
        en: '[BLOCKED by Senzu] First commit line > 72 characters ({length}). Shorten it and move the detail to the body.',
        es: '[BLOQUEADO por Senzu] Primera linea del commit > 72 caracteres ({length}). Acortala y pasa el detalle al cuerpo.',
    },
    'logo.retry': {
        en: 'If the user EXPLICITLY asked for new variants or to replace the logo: retry with SENZU_ALLOW_LOGO=1 and note it in the devlog.',
        es: 'Si el usuario ha pedido EXPLÍCITAMENTE nuevas variantes o sustituir el logo: reintenta con SENZU_ALLOW_LOGO=1 y anótalo en el devlog.',
    },
    'lib.vetada': {
        en: [
            '[BLOCKED by Senzu] jQuery/Bootstrap are vetoed by default (hard rule 12: reuse what is already there; no second component libraries).',
            'If the user approves it explicitly: let them run it, or retry with SENZU_ALLOW_LIB=1 in the environment and document the approval in the devlog.',
        ],
        es: [
            '[BLOQUEADO por Senzu] jQuery/Bootstrap estan vetados por defecto (regla dura 12: se reutiliza lo que ya hay; nada de segundas librerias de componentes).',
            'Si el usuario lo aprueba explicitamente: que lo ejecute el, o reintenta con SENZU_ALLOW_LIB=1 en el entorno y documenta la aprobacion en el devlog.',
        ],
    },
};

// Devuelve el mensaje en el idioma pedido (si falta, cae a 'en' y luego a 'es'). Mantiene el tipo guardado:
// string para un mensaje de una linea, array para un deny() de varias. {var} se interpola con vars.
export function msg(id, lang, vars) {
    const e = CAT[id];
    if (!e) return `?${id}?`;
    const val = e[lang] || e.en || e.es;
    const interp = s => vars ? String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
    return Array.isArray(val) ? val.map(interp) : interp(val);
}
