---
description: Note something in memory — for this project (decision, rule, what didn't work, pending) or for the user (all their projects)
origen: core/commands/recordar.md
huella: 3870101d2986
---

Usage: `/remember [what, e.g. "commits always without co-author"]` — the text is optional; if none is given, it notes the last thing the user corrected or decided in this conversation.

Apply the `devlog` skill (references/memoria.md, sections «Memoria del usuario» (user memory) and «Formato» (format)):

1. **Decide where it goes** (if it isn't clear, ask in ONE line with the two options):
   - **For this project** → `senzu/devlog/MEMORIA.md`: a decision (`D-xxx · qué y por qué · ver NNN`), a rule
     of the client or the project, something that didn't work, or a pending item (`- [desde AAAA-MM-DD] qué espera y a quién`).
   - **For all their projects** → the user's memory (the path is given by the session start notice; by default
     `.config/senzu/memoria.md` in their user folder): their standing rules (language, git, style, how they want
     to be spoken to). Create it if it doesn't exist, with one line per rule.
2. **One line per point**, in their words, without embellishment. If it contradicts something already there, don't duplicate it: quote
   the previous one and ask whether it replaces it (what is replaced goes to the history, it is not deleted).
3. A project decision also goes in the «Decisiones» (decisions) section of today's devlog entry.
4. Confirm in one line what you noted and where.

## When finished
Go back to what was being done (or `/next` if there is a plan).
