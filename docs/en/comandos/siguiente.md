---
description: Run the next task in the plan (project-planner task-protocol)
origen: core/commands/siguiente.md
huella: ef39562a49cf
---

Usage: `/next [optional task id, e.g. F1-T3]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `project-planner` § task-protocol to `senzu/plan/PLAN.md`:

1. Target task: the one the user wrote after the command, if they gave one; if not, the current `doing` one or the first `todo` with no pending dependencies.
2. Mark it `doing`, read ONLY the skill and section its card indicates, implement it in full.
3. Verify exactly as the card says and paste the output; devlog + commit with `Tarea: <id>` in the body.
4. Mark it `done` with the link to the devlog and propose the next one. If there is no plan, say so and offer `/plan`.

## When finished
With the card closed, propose the next one with `/next`. If it was the last one in the plan: `/verify` and then `/launch` (if there is a UI), `/deploy` and `/handoff`.
