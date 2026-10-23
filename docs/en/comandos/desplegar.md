---
description: Deploy with a safety net — PRE/DEPLOY/POST/ROLLBACK checklist with evidence and explicit approval
origen: core/commands/desplegar.md
huella: 8ad3388982a3
---

Usage: `/deploy [environment or target, e.g. "production" or "staging"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `deploy-ops §references/deploy-checklist.md` to whatever the user wrote after the command, with evidence for each point:

1. **PRE**: suites green (verify-build), `/launch` at READY if applicable, **fresh verified backup**,
   rollback plan written in one line, migrations reviewed (expansive?), and — for production —
   **ask for the user's explicit approval NOW** (without it, the guard blocks and nothing is deployed).
2. **DEPLOY**: through the stack's reproducible path (`references/deploy-by-stack.md`): pipeline/hook/
   script, never improvised commands. `SENZU_ALLOW_DEPLOY=1` only after the approval.
3. **POST** (10 min): smoke test (home + /health + 1 critical flow), clean logs, Sentry with no new errors,
   devlog with SHA/time/result.
4. If POST fails → **ROLLBACK first** (the plan from PRE), verify, investigate locally afterwards.

First deploy of a project: before that, review `references/envs-secrets.md` (secrets on the platform,
APP_DEBUG=false) and `references/backups-monitoring.md` (backups + uptime + Sentry set up).

## When finished
After the deploy and the 10 minutes of monitoring: `/handoff` if it is the delivery to the client; if not, version and time to the devlog and `/next` if there are cards left.
