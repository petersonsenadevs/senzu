---
description: Adopt the conventions of an existing project and seal them as an immutable rule
origen: core/commands/adoptar.md
huella: 0c5d59780752
---

Usage: `/adopt [optional notes, e.g. "backend only" or "the official language is English"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `code-quality §references/adopt-conventions.md` step by step (whatever the user wrote after the command):

0. **Check whether there is anything to analyze**: if the project is empty or freshly created (no real source code),
   do NOT invent evidence — switch to **interview mode** (§7 of the reference): 5–7 questions with a default
   proposal (code language, naming, validation, CSS, tests) and the same sealed result. The rest
   of the steps apply the same from step 3 on.
1. **Analyze with evidence**: configs (.editorconfig, linters, tsconfig, pint), 3–5 files per layer
   (the most recent ones), tests and `git log --oneline -30`. Notes with literal file:line examples.
2. **Short interview** (max. 5 questions, only what is ambiguous, each with a default proposal). **Always** ask
   about **language per axis** (§3 of the reference): identifiers in English (recommended), domain terms
   in the business language, and comments + devlog/memory at the user's choice.
3. **Write `senzu/conventions.md`** (for humans: rule + real example per section) and **`senzu/conventions.json`**
   (3–8 executable rules without false positives for the conventions-guard hook), both at the root and
   with the `senzu:inmutable` seal (§4 of the reference has the exact schema).
3b. **Architecture rules** (backend): propose 3-5 layer rules adapted to the REAL structure
   (`backend-audit §references/reglas-arquitectura.md`) as architecture tests (Pest, ArchUnit,
   NetArchTest) or Deptrac / dependency-cruiser / import-linter configuration. With the user's ok
   they are created, and `/verify` checks them every time a task is closed.
3c. **Declared architecture** (backend; `code-quality §references/arquitectura-declarada.md`):
   `node <skills-dir>/code-quality/scripts/arquitectura.mjs --detectar` proposes the style (MVC with services,
   hexagonal or DDD + hexagonal) and `--plantilla <estilo> --stack <laravel|node|python>` writes
   `senzu/arquitectura/capas.json`. Adjust its paths to the REAL folders (code is not moved to fit),
   and `--comprobar` says how many violations there are today: they go to AU phase cards or, if they are correct here,
   to "exceptions". With the user's ok, `--sellar`: from then on the arquitectura-guard wall enforces it
   on whatever is written (inherited code does not block).
4. Show the user the summary of what was adopted and the executable rules BEFORE sealing; with their ok,
   save and note in the devlog what was adopted and what is still pending a decision.

From that moment on: the conventions WIN over your preferences (the security walls still apply),
the hook blocks introduced violations, and the files are protected. Changing them = an explicit
decision by the user → delete both and re-run `/adopt`.

## When finished
Say what is sealed and propose the next step: if multi-part work is coming, `/plan`; if the user came for a specific fix, do it now following the conventions.
