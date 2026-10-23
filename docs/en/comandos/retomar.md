---
description: Resume where the previous session left off — what was asked, what was touched, what was left half-done and the next step
origen: core/commands/retomar.md
huella: 588e87e9942f
---

Usage: `/resume` — no arguments.

Reconstruct where the work left off WITHOUT asking the user to tell you, and propose the next step:

1. **The previous session**: the session start notice («Sesión anterior: pidió…, tocó…, dejó sin commitear…» (previous session: asked…, touched…, left uncommitted…)) and,
   if the detail is needed, `senzu/.estado/ultima-sesion.json`.
2. **What git says**: `git status` (what is half-done; whatever the previous session didn't touch may belong to another
   agent, don't assume it is yours) and `git log --oneline -5` (the last thing that was closed).
3. **The plan and the devlog**: the `doing` task in `senzu/plan/PLAN.md` and the «Próximos pasos» (next steps) of the last devlog
   entry.
4. **Summarize in 3-5 lines**: what was being done, what is done, what is missing and what was left uncommitted.
   Then propose the concrete next step and ask whether to continue that way. Don't start changing anything until
   the user confirms, unless they said «sigue» (continue).

## When finished
Propose the step the session indicates (usually `/next`) and wait for their OK.
