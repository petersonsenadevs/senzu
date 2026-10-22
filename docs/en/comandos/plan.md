---
description: Create or resume the project plan (senzu/plan/PLAN.md) with the project-planner skill
origen: core/commands/plan.md
huella: 20f4b8a54c91
---

Usage: `/plan [description of the project or feature]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply the `project-planner` skill:

1. If `senzu/plan/PLAN.md` exists, read it (header + active phase) and summarize: progress, `doing` task and next ones; propose continuing.
2. If it doesn't exist (or what the user wrote after the command describes something new): brief discovery of the project, brief with IN/OUT scope in
   `senzu/plan/brief.md`, and full plan in `senzu/plan/PLAN.md` (deliverable phases; cards `### F1-T1 · título  [S] [todo]` with
   skill+section, "hecho cuando" (done when) and "verificar" (verify)). Present the plan and wait for my OK before executing.
3. New project with a backend and without `senzu/arquitectura/capas.json`: choose the architecture with the user
   (`code-quality §references/arquitectura-declarada.md`: MVC with services for most, hexagonal with
   integrations or rules that are tested without a DB, DDD + hexagonal only with a complex domain) and the first
   card declares it: `node <skills-dir>/code-quality/scripts/arquitectura.mjs --plantilla <estilo> --stack <s>`,
   folders for each layer, ADR in `senzu/arquitectura/adr/` and `--sellar` with their OK.

Request: whatever the user wrote after the command

## When finished
With the user's OK: `/next` for the first card. With a UI and no design system, `/design-system` first.
