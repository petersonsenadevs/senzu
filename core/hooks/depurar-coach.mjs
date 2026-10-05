// Hook PostToolUse (Bash|PowerShell): cuando un comando de tests, build o verificación FALLA mientras se
// construye algo, le recuerda al agente el método de la skill depurar (reproducir → test que falla →
// hipótesis → acotar → arreglar la causa) antes de que empiece a cambiar cosas al azar.
// Informa, no bloquea. Máximo una vez cada 20 minutos por sesión (no molesta en cada fallo del ciclo).

import fs from 'node:fs';
import { readHookInput, sessionFlag, outHookJson } from './lib.mjs';

const p = readHookInput();
if (!p || !['Bash', 'PowerShell'].includes(p.tool_name)) process.exit(0);
const cmd = String((p.tool_input && p.tool_input.command) || '');
// Solo cuando se EJECUTA una verificación (un runner, un script de test o de build), no cuando se lee un archivo
// que se llama test-algo: `sed -n 1,60p tools/test-x.mjs` imprimía «FAIL» del código fuente y saltaba el aviso.
const RUNNER = /(\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|lint|check|verify)\b|\b(npx\s+)?(pest|phpunit|vitest|jest|pytest|tsc|phpstan|mypy|ruff|eslint|playwright\s+test)\b|\b(go|cargo|dotnet)\s+test\b|\bartisan\s+test\b|\b(mvn|gradle)\w*\s|\b(node|deno|python3?|py|bash|sh)\s+(-\S+\s+)*\S*(test|spec|verify|check|build)[\w.-]*\.(m?js|cjs|ts|py|sh)\b|-File\s+\S*(test|verify|check|build)[\w.-]*\.ps1\b|verify-build)/i;
const segmentos = cmd.split(/&&|\|\||;|\n/);
if (!segmentos.some(s => RUNNER.test(s))) process.exit(0);

const r = p.tool_response || {};
const salida = typeof r === 'string' ? r : [r.stdout, r.stderr, r.output, r.error].filter(Boolean).join('\n');
const fallo = /(\bFAIL(ED|URES?)?\b|\b\d+\s+(failed|failing|errors?)\b|Tests?:\s+\d+\s+failed|AssertionError|Traceback \(most recent call last\)|\bError:\s|\bException\b|✗|×\s|exit code [1-9]|Build failed|ERR!)/i.test(salida);
if (!fallo) process.exit(0);

const flag = sessionFlag(p.session_id || 'default', 'depurar-coach');
try {
    const ultimo = fs.statSync(flag).mtimeMs;
    if (Date.now() - ultimo < 20 * 60 * 1000) process.exit(0);
} catch {}
try { fs.writeFileSync(flag, ''); } catch {}

outHookJson('PostToolUse', {
    additionalContext: '[senzu] Ha fallado una verificación. Antes del siguiente cambio aplica la skill depurar: '
        + '(1) lee el error completo desde la primera línea de código propio, (2) reprodúcelo con el test más pequeño que falle, '
        + '(3) escribe UNA hipótesis, (4) acota hasta aislar dónde nace, (5) arregla la causa con el cambio mínimo. '
        + 'Un cambio cada vez, test después de cada uno; tras tres intentos fallidos, para y replantea la hipótesis. '
        + 'No toques el test para que pase ni silencies el error.',
});
process.exit(0);
