---
description: Install or update Senzu in this project (web, backend, front, AI agent, library or custom)
origen: core/commands/instalar.md
huella: 361832e7d5df
---

Usage: `/install [optional stack, e.g. "laravel"]` — the argument is optional; if none is given, it detects the stack.

Apply the `instalar-proyecto` skill step by step: locate or clone the package, detect the stack,
confirm with the user (stack, tools and language of the notices: English by default or Spanish),
ask what the project is (web, backend, front, AI agent, library or custom choice), run the
installer and ask for a new session. If the user specified a stack after the command, use it.

## When finished
Ask to open a new session: the session start will say the next step (usually `/adopt` if there is code, or `/plan` and `/brief` in a new project).
