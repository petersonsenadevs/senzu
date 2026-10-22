---
description: Project map — what it is, how to run it, structure, critical flows and where to touch for each thing
origen: core/commands/mapa.md
huella: 5086093b4bca
---

Usage: `/map [optional area, e.g. "payments"]` — the argument is optional; if none is given, it maps the whole project.

Apply `code-quality §references/mapa-proyecto.md` (read-only, it doesn't change code):

1. Read manifests, configuration and `.env.example` (never `.env`), the folder structure and the
   entry points (routes, commands, queues, scheduled tasks, webhooks).
2. Follow 3-5 critical flows from start to finish, noting the file and function at each step.
3. Run `node <skills-dir>/backend-audit/scripts/hotspots.mjs` for the risk areas.
4. Write `senzu/mapa.md` with the reference's structure: the essentials on the first screen and the
   "where to touch for…" table with the frequent tasks.
5. Propose linking it from `CLAUDE.md` or `CLAUDE.project.md` so the agent reads it when starting.

## When finished
If the user is going to work on something specific: `/plan` for a multi-part feature, or `/next` if there is already a plan.
