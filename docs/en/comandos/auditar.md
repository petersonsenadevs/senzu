---
description: Backend and architecture audit with proof — real tools, evidence per finding, report and plan
origen: core/commands/auditar.md
huella: b31b4fb25f33
---

Usage: `/audit [optional area, e.g. "payments", "public API" or "before production"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `backend-audit §references/protocolo.md` in full to whatever the user wrote after the command (or the whole backend):

1. **Scope**: agree with the user, in one question, on the area and the goal (before refactoring,
   inheriting the project, an incident or going to production). If they don't know, propose starting with the hotspots.
2. **Measurement**: run `node <skills-dir>/backend-audit/scripts/hotspots.mjs` and the stack
   tools (`references/herramientas-por-stack.md`) the project already has. Propose the missing ones;
   don't install anything without asking.
3. **Targeted reading** of what the tools point to, going through `references/catalogo-hallazgos.md`.
4. **Verify each finding** before reporting it: without evidence (output, file:line, failing test
   or measurement) it goes under suspicions, not findings. This task does NOT modify application code.
5. **Report** with `references/informe.md` in `senzu/auditoria/<fecha>-<area>.md`. Show the summary and
   the top 3-5 findings and ask what gets fixed.
6. What is approved → cards in `senzu/plan/PLAN.md` (phase AU: «Para qué» (what for) = the finding, «Verificar» (verify) = the same
   evidence that proved it), worked through with `/next`; structural changes
   are made afterwards with `/refactor`. Devlog with the tools run and the result.

## When finished
With the AU cards approved in the plan: `/next` to work through them one by one (the structural ones, with `/refactor`).
