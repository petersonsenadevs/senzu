#!/usr/bin/env node
// Suite del muro tarjeta-guard (core/hooks/tarjeta-guard.mjs): una tarjeta de senzu/plan/PLAN.md no pasa a [done]
// sin «Verificado», «Cumple» (si tiene «Para qué») y un «Devlog» que exista. Plan y auditoría por igual.
//   node tools/test-tarjetas.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = path.join(ROOT, 'core', 'hooks', 'tarjeta-guard.mjs');
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } };

const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-tarjetas-'));
const plan = path.join(proj, 'senzu', 'plan', 'PLAN.md');
fs.mkdirSync(path.dirname(plan), { recursive: true });
fs.mkdirSync(path.join(proj, 'senzu', 'devlog', '2026-10-04'), { recursive: true });
fs.writeFileSync(path.join(proj, 'senzu', 'devlog', '2026-10-04', '014-pagos.md'), '# 014 — Pagos\n');
fs.writeFileSync(path.join(proj, 'senzu', 'senzu.json'), '{"stack":"laravel"}');

const BASE = `# Plan

## F1 · Pagos

### F1-T1 · Idempotencia del webhook  [S] [doing]
- Para qué: que un webhook repetido no cree dos pedidos (lo pidió el cliente)
- Skill: code-quality → references/webhooks.md
- Hecho cuando: un evento repetido no duplica el pedido
- Verificar: php artisan test --filter=Webhook
- Verificado: — (se rellena al cerrar: <comando> → <resultado real>)
- Cumple: — (se rellena al cerrar: cómo cumple el «Para qué»)
- Devlog: — (se rellena al cerrar: \`senzu/devlog/YYYY-MM-DD/NNN-slug.md\`)

### F1-T2 · Renombrar variable  [S] [doing]
- Skill: sin skill: cambio trivial
- Verificar: php artisan test

### F1-T3 · Ya cerrada  [S] [done]
- Para qué: algo antiguo
- Devlog: —

## AU · Auditoría de pagos

### AU-T1 · Autorizar el acceso a pedidos  [M] [doing]
- Para qué: H-03 de senzu/auditoria/2026-10-04-pagos.md: un cliente ve los pedidos de otro
- Verificar: php artisan test --filter=PedidoAjenoTest (el test de reproducción que fallaba)
`;
const reset = () => fs.writeFileSync(plan, BASE);
const hook = entrada => spawnSync(process.execPath, [HOOK], { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: proj } });
const edita = (viejo, nuevo, extra = {}) => hook({ tool_name: 'Edit', tool_input: { file_path: plan, old_string: viejo, new_string: nuevo, ...extra } });
const bloquea = (r, n, re) => ok(r.status === 2 && (!re || re.test(r.stderr)), `bloquea: ${n}`, `exit ${r.status} ${r.stderr.slice(0, 200)}`);
const deja = (r, n) => ok(r.status === 0, `deja: ${n}`, `exit ${r.status} ${r.stderr.slice(0, 200)}`);

reset();
// 1. marcar done sin rellenar nada
bloquea(edita('Idempotencia del webhook  [S] [doing]', 'Idempotencia del webhook  [S] [done]'), 'done con los marcadores sin rellenar', /F1-T1[\s\S]*Verificado[\s\S]*Cumple[\s\S]*Devlog/);

// 2. con Verificado pero sin Cumple (la tarjeta tiene «Para qué»)
const conVerificado = BASE.replace('- Verificado: — (se rellena al cerrar: <comando> → <resultado real>)', '- Verificado: php artisan test --filter=Webhook → 3 passed');
fs.writeFileSync(plan, conVerificado);
bloquea(edita('Idempotencia del webhook  [S] [doing]', 'Idempotencia del webhook  [S] [done]'), 'Verificado sin «Cumple» del «Para qué»', /Cumple/);

// 3. todo relleno pero el devlog no existe
let completo = conVerificado.replace('- Cumple: — (se rellena al cerrar: cómo cumple el «Para qué»)', '- Cumple: un evento repetido devuelve 200 y no crea pedido')
    .replace('- Devlog: — (se rellena al cerrar: `senzu/devlog/YYYY-MM-DD/NNN-slug.md`)', '- Devlog: senzu/devlog/2026-10-04/099-no-existe.md');
fs.writeFileSync(plan, completo);
bloquea(edita('Idempotencia del webhook  [S] [doing]', 'Idempotencia del webhook  [S] [done]'), 'el devlog citado no existe', /no existe/);

// 4. todo bien: pasa
completo = completo.replace('099-no-existe.md', '014-pagos.md');
fs.writeFileSync(plan, completo);
deja(edita('Idempotencia del webhook  [S] [doing]', 'Idempotencia del webhook  [S] [done]'), 'tarjeta con Verificado, Cumple y devlog existente');

// 5. marcar done y rellenar en la MISMA edición (es lo normal): se valida el resultado
reset();
deja(edita(
    '### F1-T1 · Idempotencia del webhook  [S] [doing]\n- Para qué: que un webhook repetido no cree dos pedidos (lo pidió el cliente)\n- Skill: code-quality → references/webhooks.md\n- Hecho cuando: un evento repetido no duplica el pedido\n- Verificar: php artisan test --filter=Webhook\n- Verificado: — (se rellena al cerrar: <comando> → <resultado real>)\n- Cumple: — (se rellena al cerrar: cómo cumple el «Para qué»)\n- Devlog: — (se rellena al cerrar: `senzu/devlog/YYYY-MM-DD/NNN-slug.md`)',
    '### F1-T1 · Idempotencia del webhook  [S] [done]\n- Para qué: que un webhook repetido no cree dos pedidos (lo pidió el cliente)\n- Skill: code-quality → references/webhooks.md\n- Hecho cuando: un evento repetido no duplica el pedido\n- Verificar: php artisan test --filter=Webhook\n- Verificado: php artisan test --filter=Webhook → 3 passed\n- Cumple: el evento repetido no crea pedido\n- Devlog: `senzu/devlog/2026-10-04/014-pagos.md`'),
    'marcar done y rellenar las pruebas en la misma edición');

// 6. tarjeta sin «Para qué»: basta Verificado y Devlog
reset();
bloquea(edita('Renombrar variable  [S] [doing]', 'Renombrar variable  [S] [done]'), 'tarjeta sin Para qué y sin Verificado', /Verificado/);
deja(edita('Renombrar variable  [S] [doing]\n- Skill: sin skill: cambio trivial\n- Verificar: php artisan test', 'Renombrar variable  [S] [done]\n- Skill: sin skill: cambio trivial\n- Verificar: php artisan test\n- Verificado: no aplica: solo cambia un nombre interno, tests en verde\n- Devlog: senzu/devlog/2026-10-04/014-pagos.md'), 'sin Para qué: Verificado («no aplica: motivo») y devlog bastan');

// 7. tocar una tarjeta que YA estaba done no se bloquea (no se reexamina el pasado)
reset();
deja(edita('### F1-T3 · Ya cerrada  [S] [done]\n- Para qué: algo antiguo', '### F1-T3 · Ya cerrada  [S] [done]\n- Para qué: algo antiguo (aclarado)'), 'editar una tarjeta que ya estaba done');

// 8. tarjeta de auditoría: igual de exigente
bloquea(edita('Autorizar el acceso a pedidos  [M] [doing]', 'Autorizar el acceso a pedidos  [M] [done]'), 'tarjeta de auditoría (AU-T1) sin pruebas', /AU-T1/);

// 9. Write (reescribir el plan entero) y MultiEdit también se miran
bloquea(hook({ tool_name: 'Write', tool_input: { file_path: plan, content: BASE.replace('Autorizar el acceso a pedidos  [M] [doing]', 'Autorizar el acceso a pedidos  [M] [done]') } }), 'Write del plan con una tarjeta pasada a done sin pruebas', /AU-T1/);
bloquea(hook({ tool_name: 'MultiEdit', tool_input: { file_path: plan, edits: [{ old_string: 'Renombrar variable  [S] [doing]', new_string: 'Renombrar variable  [S] [done]' }] } }), 'MultiEdit también', /F1-T2/);

// 10. otros archivos y otros estados: no se meten
deja(hook({ tool_name: 'Edit', tool_input: { file_path: path.join(proj, 'README.md'), old_string: '[doing]', new_string: '[done]' } }), 'otro archivo cualquiera');
deja(edita('Idempotencia del webhook  [S] [doing]', 'Idempotencia del webhook  [S] [blocked]'), 'pasar a blocked no exige pruebas');

// 11. Codex: el plan editado con apply_patch
reset();
const parche = '*** Begin Patch\n*** Update File: senzu/plan/PLAN.md\n@@\n-### F1-T2 · Renombrar variable  [S] [doing]\n+### F1-T2 · Renombrar variable  [S] [done]\n*** End Patch\n';
bloquea(hook({ tool_name: 'apply_patch', tool_input: { command: parche }, cwd: proj }), 'Codex (apply_patch) tampoco cierra sin pruebas', /F1-T2/);

// 12. ids que improvisa el planner (A-H01, A-H0608): el muro también los ve al pasarlos a done
reset();
fs.appendFileSync(plan, '\n### A-H0608 · Higiene y hardening  [S] [doing]\n- Para qué: ruff en el flujo y endurecer\n- Verificar: ruff check .\n');
bloquea(edita('Higiene y hardening  [S] [doing]', 'Higiene y hardening  [S] [done]'), 'tarjeta A-H0608 sin pruebas también se bloquea', /A-H0608/);

fs.rmSync(proj, { recursive: true, force: true });
process.stdout.write(`Casos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
