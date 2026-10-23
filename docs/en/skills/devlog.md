---
name: devlog
description: "Project devlog as diary and memory: the day's entry and INDEX before closing or committing, current decisions in MEMORIA.md and search through the past (buscar.mjs). Use it when finishing a step, when deciding something or for «why did we…?»."
origen: core/skills/devlog/SKILL.md
huella: b602b8423b14
---

# Skill: devlog

Documents the work in `senzu/devlog/` at the project root following the team's methodology.

## When to use
- Before every `git commit`.
- When finishing a relevant step/feature/fix.
- When an entry corrects or improves a previous one.

## Project with its own diary
If the project already documents things its own way (CHANGELOG.md, `docs/decisions/`, ADRs) and no decision has
been made yet: ask the user ONCE what they prefer (their format, this devlog, or both with different roles),
write the decision in the first entry (or in their diary) and respect it for the rest of the project without asking again.

## Steps
1. Determine the real date: `Get-Date -Format 'yyyy-MM-dd HH:mm'`.
2. Make sure the day's folder exists: `senzu/devlog/<YYYY-MM-DD>/`.
3. Compute the next GLOBAL sequential number by reading the highest existing `NNN` in
   all of `senzu/devlog/**` and adding 1 (3-digit format: `001`, `002`…).
4. Create `senzu/devlog/<date>/NNN-<slug>.md` with the entry template.
5. If this entry improves/corrects another one, fill in `Mejora a: NNN` (improves).
6. Record the step's commits (short hash + message).
7. If there were decisions, add them to `senzu/devlog/<date>/DECISIONES.md` **and to `senzu/devlog/MEMORIA.md`** as current
   (`D-xxx · decision and why · ver NNN`); if they replace another one, mark it as replaced (references/memoria.md).
8. Update `senzu/devlog/INDEX.md` (table: no., date, title, type, improves, task).
9. If the entry closes a card in `senzu/plan/PLAN.md`, fill in `Tarea: <id>` (task) and put the entry's
   path in the card's `Devlog:` field when marking it `done`.

## Memory and searching the past
| I need… | Do |
|---|---|
| To know what is decided | `senzu/devlog/MEMORIA.md` (it reaches you at session start). Do not contradict it without citing it and asking. |
| Something that is not in the memory («why…?», «when did we change…?») | `node <skills-dir>/devlog/scripts/buscar.mjs "words"` → open ONLY the indicated entry, by section |
| To create the memory in a project with history | references/memoria.md § Crear la memoria desde un devlog existente (create the memory from an existing devlog) |
| Memory longer than 60 lines | Move what was replaced or closed to `senzu/devlog/MEMORIA-historico.md` |
| The user gives a rule or a correction («don't ever…», «from now on…») | `/remember`: to the project (MEMORIA.md) or to their personal memory if it applies to all their projects (references/memoria.md §7) |
| Resume the previous session | `/resume` (references/memoria.md §8) |
| Review the memory (expired, broken «ver NNN», repeated D) | `node <skills-dir>/devlog/scripts/memoria-check.mjs` |

When answering about the past, cite the entry (`according to 034…`). If the search finds nothing after
trying synonyms, say so: «nothing is recorded about this». Never assume it.

## Entry template
See this skill's `templates/devlog-day.md`. Minimum fields:
`# NNN — title`, Fecha/hora (date/time), Tipo (type), Mejora a (improves), Tarea (task: `F1-T2` | `X-T1` | `—`), Stack, Qué se hizo (what was done),
Commits, Decisiones (decisions), Verificación (verification), Próximos pasos (next steps).

## Phase summary
When a phase of `senzu/plan/PLAN.md` is closed, write a normal entry of type `docs` (same template
and numbering; `Tarea:` with the id of the closing card if there is one) with: what was delivered and how the
user verifies it step by step, links to the entries of each task in the phase, global
verification (suite, CI) and a short retro (what to keep, what to change). It is linked from the closing
card and from the phase's row in `## Fases`.

## Rules
- **Global** sequential numbering; it does not restart each day.
- Never invent the date; use the system's.
- At least one `.md` per day; if the day is very long, several `.md`.
