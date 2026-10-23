---
description: Estimate and budget — hours per task, forgotten items, risks and a final range for the client
origen: core/commands/estimar.md
huella: 7d4e2b06523d
---

Usage: `/estimate [what to estimate, e.g. "the restaurant website" or "phase 2"]` — the argument is optional; if none is given, it estimates the current plan.

Apply `project-planner §references/estimacion.md` to whatever the user wrote after the command
(or to `senzu/plan/PLAN.md`):

1. If there is no plan or breakdown, first break it down into phases and S/M/L tasks; without a breakdown nothing is estimated.
2. Ask FIRST about what changes the size and is unknown (payments, languages, who provides the copy). Whatever
   remains unanswered becomes a written assumption.
3. Optimistic, likely and pessimistic hours per task; add the items that always get forgotten (meetings,
   QA, rounds of changes, content, deployment, handoff and management).
4. Concrete risks with their effect in hours and an uncertainty factor.
5. Final range (minimum, expected and maximum). If there is a rate, amount per phase; don't invent the rate.
6. Write `senzu/plan/estimacion.md` with a summary for the client, detail per phase, assumptions and exclusions,
   and show the summary to the user.

## When finished
If the user accepts the budget: `/plan` (or `/next` if the plan already exists).
