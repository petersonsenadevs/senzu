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
