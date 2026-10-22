---
description: Safe refactor — characterization tests first, small verified steps and the same behavior proven
origen: core/commands/refactor.md
huella: c8e2015b4317
---

Usage: `/refactor <goal, e.g. "move the pricing logic out of OrderController">` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `backend-audit §references/refactor-seguro.md` for: whatever the user wrote after the command

1. **Goal in one sentence** and why (if it comes from `/audit`, link the finding). Its own branch.
2. **Suite green before starting** (`/verify`). If it is red, say so and stop: that gets fixed first.
3. **Characterization tests** that freeze the current behavior of the code to be touched. Break something on
   purpose to check that the tests detect it, and undo the change.
4. **Small steps**: one structural change per step, tests green after each one, a
   `refactor(...)` commit per step or small group. If a step breaks something, it is undone; it is not fixed forward.
5. If a real bug shows up: note it, finish the current step green and fix it separately with its own test.
6. **Close**: `/verify` green, devlog with the before and after (size, complexity or
   dependencies if there are metrics) and the plan card marked as done.

Refactor = same behavior, different structure. If the behavior has to change, it is another task.

## When finished
`/next` for the next card (from the audit or the plan).
