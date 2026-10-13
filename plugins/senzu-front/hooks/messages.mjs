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

    // --- stop-guard: avisos de cierre (fragmentos que se concatenan; empiezan por espacio) ---
    'stop.reminderPrefix': { en: 'reminder:', es: 'recordatorio:' },
    'stop.plan': {
        en: ' Also there are task(s) in progress in {pl}/PLAN.md ({doing}): if you finished it, mark it done (with Verified, Meets, and the link to the devlog) and suggest /next; if not, say what is missing.',
        es: ' Ademas hay tarea(s) en curso en {pl}/PLAN.md ({doing}): si la has terminado, márcala done (con Verificado, Cumple y el enlace al devlog) y propón /siguiente; si no, di qué falta.',
    },
    'stop.front': {
        en: " You edited UI files this session: do NOT call it done without verifying it (skill ui-verify): run 'node <skills-dir>/ui-verify/scripts/verify-ui.mjs <local-url>' (or the browser pass) STARTING WITH MOBILE 375px, fix until 0 problems and paste the result in the devlog.",
        es: " Has editado archivos de UI en esta sesion: NO la des por hecha sin verificarla (skill ui-verify): ejecuta 'node <skills-dir>/ui-verify/scripts/verify-ui.mjs <url-local>' (o la pasada con navegador) EMPEZANDO POR MOVIL 375px, corrige hasta 0 problemas y pega el resultado en el devlog.",
    },
    'stop.assetImg': { en: '{rel} ({kb} KB: compress it to WebP or AVIF, ideally < 300 KB)', es: '{rel} ({kb} KB: comprímela a WebP o AVIF, idealmente < 300 KB)' },
    'stop.assetSvg': { en: '{rel} ({kb} KB: optimize the SVG with SVGO)', es: '{rel} ({kb} KB: optimiza el SVG con SVGO)' },
    'stop.assetFont': { en: '{rel} (uncompressed font: use woff2)', es: '{rel} (fuente sin comprimir: usa woff2)' },
    'stop.assetVideo': { en: '{rel} ({mb} MB: heavy video, compress it and add a poster)', es: '{rel} ({mb} MB: vídeo pesado, comprímelo y añade poster)' },
    'stop.assets': {
        en: ' Heavy assets added today: {avisos}. Review them before closing (ui-verify references/web-performance.md).',
        es: ' Assets pesados añadidos hoy: {avisos}. Revísalos antes de cerrar (ui-verify references/web-performance.md).',
    },
    'stop.mem': {
        en: " There are new decisions in today's devlog ({dec}) and {dl}/MEMORIA.md is not updated: add them as current with their D-xxx and their entry (or mark as replaced the one they change), with the devlog skill (references/memoria.md).",
        es: ' Hay decisiones nuevas en el devlog de hoy ({dec}) y {dl}/MEMORIA.md sin actualizar: añádelas como vigentes con su D-xxx y su entrada (o marca como sustituida la que cambian), con la skill devlog (references/memoria.md).',
    },
    'stop.memLong': {
        en: " {dl}/MEMORIA.md has {lineas} lines (max 60): move what's replaced or closed to {dl}/MEMORIA-historico.md.",
        es: ' {dl}/MEMORIA.md tiene {lineas} líneas (máximo 60): pasa lo sustituido o cerrado a {dl}/MEMORIA-historico.md.',
    },
    'stop.notIndexed': {
        en: ' Missing from the index in {dl}/INDEX.md: {notidx}.',
        es: ' Falta indexar en {dl}/INDEX.md: {notidx}.',
    },
    'stop.uncommitted': {
        en: ' There are uncommitted changes: run the stack commands (lint/test/types from config.json) and paste the output before closing.',
        es: ' Hay cambios sin commitear: ejecuta los comandos del stack (lint/test/types de config.json) y pega la salida antes de cerrar.',
    },
    'stop.logo': {
        en: ' There is a final logo not recorded ({logos}): note it under «Fijado» in gustos.md with its path and as a decision in memory, so no agent makes drafts again.',
        es: ' Hay logo final sin registrar ({logos}): anótalo en «Fijado» de gustos.md con su ruta y como decisión en la memoria, para que ningún agente vuelva a hacer bocetos.',
    },
    'stop.noDevlog': {
        en: '[senzu] There are {dirty} file(s) with changes and no entry exists in {dl}/{date}/. Before finishing: create {dl}/{date}/NNN-<slug>.md (global sequential numbering) with what was done, verification and next steps, and update {dl}/INDEX.md (devlog skill). If the change is trivial and does not deserve a devlog, say so explicitly and finish.',
        es: '[senzu] Hay {dirty} archivo(s) con cambios y no existe ninguna entrada en {dl}/{date}/. Antes de terminar: crea {dl}/{date}/NNN-<slug>.md (numeracion global correlativa) con que se hizo, verificacion y proximos pasos, y actualiza {dl}/INDEX.md (skill devlog). Si el cambio es trivial y no merece devlog, dilo explicitamente y termina.',
    },
    'stop.noDevlogReminder': {
        en: "reminder: there's still no devlog entry for today ({date}). Document the progress in {dl}/{date}/ before closing.",
        es: 'recordatorio: aun no hay entrada de devlog para hoy ({date}). Documenta el avance en {dl}/{date}/ antes de cerrar.',
    },

    // --- siguientePaso (lib.mjs): el paso del método que toca; comando (nombre localizado) y motivo ---
    'step.instalar.cmd': { en: '/install', es: '/instalar' },
    'step.instalar.motivo': {
        en: 'Senzu is not installed in this project: without it there are only loose skills, not the method (profile, plan, devlog, memory and the project walls)',
        es: 'Senzu no está instalado en este proyecto: sin eso solo hay skills sueltas, no el método (perfil, plan, devlog, memoria y los muros del proyecto)',
    },
    'step.adoptar.cmd': { en: '/adopt', es: '/adoptar' },
    'step.adoptar.motivo': {
        en: "there is code with its own style and no sealed conventions: without /adopt you'd write your way, not the project's",
        es: 'hay código con su propio estilo y ninguna convención sellada: sin /adoptar escribirías a tu manera, no a la del proyecto',
    },
    'step.brief.cmd': { en: '/brief and then /plan', es: '/brief y después /plan' },
    'step.briefNuevo.motivo': { en: 'new project with an interface and no brief or plan', es: 'proyecto nuevo con interfaz y sin brief ni plan' },
    'step.plan.cmd': { en: '/plan', es: '/plan' },
    'step.planNuevo.motivo': { en: 'new project without a plan', es: 'proyecto nuevo sin plan' },
    'step.siguiente.cmd': { en: '/next', es: '/siguiente' },
    'step.siguiente.doing': { en: 'task in progress: {x}', es: 'tarea en curso: {x}' },
    'step.siguiente.next': { en: 'next card: {x}', es: 'siguiente tarjeta: {x}' },
    'step.cierre.cmdFront': { en: '/verify → /launch → /deploy → /handoff', es: '/verificar → /lanzar → /desplegar → /entregar' },
    'step.cierre.cmd': { en: '/verify → /deploy → /handoff', es: '/verificar → /desplegar → /entregar' },
    'step.cierre.motivo': {
        en: 'plan finished ({done}/{total} cards): time to check everything and take it to production, with the user OK at each step',
        es: 'plan terminado ({done}/{total} tarjetas): toca comprobarlo todo y llevarlo a producción, con el OK del usuario en cada paso',
    },
    'step.planExistente.motivo': {
        en: "project with code and no plan: for a multi-part feature, /plan (goal, scope and cards); for a one-off fix it's not needed",
        es: 'proyecto con código y sin plan: para una feature de varias partes, /plan (objetivo, alcance y tarjetas); para un arreglo puntual no hace falta',
    },

    // --- arranque-guard: el método antes que el código ---
    'arranque.conversar': {
        en: "[senzu] You're about to write code ({rel}) in a {motivo}. You don't need a plan for everything, but you do need to know what's going to be built: if the user has clearly told you what they want and why, go ahead. If you don't know (goal, scope, what's in and out), STOP and talk it through with them before coding, in plain language and with few questions; don't assume it. Suggest {comando} only if it's something big, multi-part, or if they want it.",
        es: '[senzu] Vas a escribir código ({rel}) en un {motivo}. No hace falta un plan para todo, pero sí saber qué se va a hacer: si el usuario te ha dicho con claridad qué quiere y para qué, sigue. Si no lo sabes (objetivo, alcance, qué entra y qué no), PARA y háblalo con él antes de programar, en llano y con pocas preguntas; no lo supongas. Propón {comando} solo si es algo grande, de varias partes, o si él lo quiere.',
    },
    'arranque.omitible': {
        en: "\nIf the user doesn't want this step in this project, let them remove it: node <senzu>/tools/init.mjs --path . --omitir-paso {paso} (you can't).",
        es: '\nSi el usuario no quiere este paso en este proyecto, que lo quite él: node <senzu>/tools/init.mjs --path . --omitir-paso {paso} (tú no puedes).',
    },
    'arranque.block': {
        en: '[BLOCKED by Senzu] Before writing code ({rel}) a method step is missing: {comando}.\nWhy: {motivo}.\nWhat to do: stop, tell the user in one sentence what is missing and why, and suggest {comando}. If they tell you to go on without it, go on: this wall only stops you once per step and session.',
        es: '[BLOQUEADO por Senzu] Antes de escribir código ({rel}) falta un paso del método: {comando}.\nPor qué: {motivo}.\nQué hacer: para, explícale al usuario en una frase qué falta y por qué, y proponle {comando}. Si te dice que sigas sin él, sigue: este muro solo te para una vez por paso y sesión.',
    },

    // --- protect-files: edicion de archivos protegidos ---
    'protect.fileLine': { en: 'File: {rel}', es: 'Archivo: {rel}' },
    'protect.genGuide': {
        en: 'File generated by Senzu. Edit stacks/<stack>/ or core/ in the Senzu package and update the project with /install.',
        es: 'Archivo generado por Senzu. Edita stacks/<stack>/ o core/ en el paquete Senzu y actualiza el proyecto con /instalar.',
    },
    'protect.genConfig': {
        en: 'File generated by Senzu (skills, rules, hooks, settings, mcp, marker with permissions). Edit the source in the Senzu package and update with /install; for local permissions use .claude/settings.local.json.',
        es: 'Archivo generado por Senzu (skills, reglas, hooks, settings, mcp, marcador con permisos). Edita el origen en el paquete Senzu y actualiza con /instalar; para permisos locales usa .claude/settings.local.json.',
    },
    'protect.genPlugins': {
        en: 'Generated Senzu folder (plugins/ or core/skills-vendor/). Edit core/skills-overlay or core/skills and regenerate with build-plugins.ps1 / vendor.ps1.',
        es: 'Carpeta generada de Senzu (plugins/ o core/skills-vendor/). Edita core/skills-overlay o core/skills y regenera con build-plugins.ps1 / vendor.ps1.',
    },
    'protect.logoMaster': {
        en: 'It is a master of the CHOSEN logo (logos/final/): it is not overwritten. If the user wants to change the logo, they must say so explicitly: the new one goes with a different name, «Fijado» in gustos.md and memory are updated, and the user retires the previous one.',
        es: 'Es un maestro del logo ELEGIDO (logos/final/): no se sobrescribe. Si el usuario quiere cambiar el logo, que lo diga explícitamente: el nuevo va con otro nombre, se actualiza «Fijado» en gustos.md y la memoria, y el anterior lo retira el usuario.',
    },
    'protect.conventions': {
        en: 'Project conventions SEALED as immutable (/adopt): not edited without an explicit user decision. With their approval: delete the conventions.json and conventions.md files and re-run /adopt, or let them edit it.',
        es: 'Convenciones del proyecto SELLADAS como inmutables (/adoptar): no se editan sin decision explicita del usuario. Con su aprobacion: borra los archivos conventions.json y conventions.md y re-ejecuta /adoptar, o que los edite el mismo.',
    },
    'protect.arquitectura': {
        en: 'Project architecture SEALED (capas.json): not edited to let a change through. Move the code to the layer it belongs to; if the user decides to change the architecture or add an exception, let them edit it (or remove the seal) and note it in the devlog.',
        es: 'Arquitectura del proyecto SELLADA (capas.json): no se edita para que pase un cambio. Mueve el código a la capa que le toca; si el usuario decide cambiar la arquitectura o añadir una excepción, que la edite él (o que quite el sello) y se anota en el devlog.',
    },
    'protect.secrets': {
        en: 'Secrets/credentials file. Not edited from the agent: do it by hand yourself.',
        es: 'Archivo de secretos/credenciales. No se edita desde el agente: hazlo tu a mano.',
    },
    'protect.deps': {
        en: 'Dependencies or generated artifacts: not edited by hand (change the source or the configuration).',
        es: 'Dependencias o artefactos generados: no se editan a mano (cambia la fuente o la configuracion).',
    },
    'protect.migration': {
        en: 'Migration already versioned/shared: not edited. Create a new migration.',
        es: 'Migracion ya versionada/compartida: no se edita. Crea una migracion nueva.',
    },
    'protect.projectPath': {
        en: 'Path protected by the project ({g}). Ask for explicit approval.',
        es: 'Ruta protegida por el proyecto ({g}). Pide aprobacion explicita.',
    },

    // --- conventions-guard: convenciones adoptadas (/adoptar) ---
    'conventions.whyFallback': { en: 'pattern forbidden by convention: {forbid}', es: 'patron prohibido por convencion: {forbid}' },
    'conventions.hit': {
        en: "[BLOCKED by Senzu] Project convention (conventions.json): {why}. Line: '{hit}'.",
        es: "[BLOQUEADO por Senzu] Convencion del proyecto (conventions.json): {why}. Linea: '{hit}'.",
    },
    'conventions.hit2': {
        en: 'The adopted conventions WIN over your preferences: write the code the way this project does ({cv}). If the user decides to change the convention, they must say so explicitly and /adopt is re-run.',
        es: 'Las convenciones adoptadas GANAN a tus preferencias: escribe el codigo como lo hace este proyecto ({cv}). Si el usuario decide cambiar la convencion, que lo diga explicitamente y se re-ejecuta /adoptar.',
    },

    // --- secrets-guard: secretos en el codigo ---
    'secrets.block': {
        en: '[BLOCKED by Senzu] It looks like you are about to write a real secret ({tipo}) in the code.',
        es: '[BLOQUEADO por Senzu] Parece que vas a escribir un secreto real ({tipo}) en el codigo.',
    },
    'secrets.hint': {
        en: 'Use environment variables (.env, config) and never commit credentials. If it is an example value, use a clear placeholder (xxx, your-key, <API_KEY>).',
        es: 'Usa variables de entorno (.env, config) y nunca commitees credenciales. Si es un valor de ejemplo, usa un placeholder claro (xxx, your-key, <API_KEY>).',
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
