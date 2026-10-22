---
description: Handoff to the client — user manual, services and access, maintenance, how to request changes and training
origen: core/commands/entregar.md
huella: 90277e30b48c
---

Usage: `/handoff [project or client]` — the argument is optional.

Apply `deploy-ops §references/entrega-cliente.md` to the current project:

1. Check the prerequisites: `/launch` at READY, last deploy verified and backups with a tested restore.
   If something is missing, say so and stop.
2. Ask the user which tasks the client will do in the admin panel (publish, change prices, view
   forms…) and who manages each service.
3. Write in `senzu/entrega/`: user manual (only their tasks, step by step), services and access (table
   with provider, owner, renewal and cost; never passwords, only where they are), maintenance
   (updates, renewals, backups and warranty) and how to request changes.
4. Summarize on one page what the client receives and what is still pending, and note it in the devlog.

## When finished
End of the chain: summarize what was delivered and where each thing is. If there are cards left (maintenance, improvements), `/next`.
