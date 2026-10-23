---
name: backend-audit
description: "Backend and architecture audit with EVIDENCE: real tools per stack, every finding backed by proof (output, file:line, failing test), report and safe refactor plan. Use it to audit, for technical debt, legacy code or before refactoring."
origen: core/skills/backend-audit/SKILL.md
huella: cc3d29639458
---

# backend-audit (Senzu)

Diagnoses the backend like a doctor: **tests first, diagnosis second**. Nothing gets reported that
cannot be proven. This skill FINDS; the fixes live where they already were:
`code-quality` (recipes by topic), `ddd-hexagonal` (structure) and `deploy-ops` (infrastructure).
Each finding type in the catalog points to its recipe: diagnosis and treatment in harmony.

## Minimum reading per task
| Task | Read only |
|---|---|
| Audit the backend or an area (`/audit`) | `references/protocolo.md` → then whatever it points to |
| Which tools to use in THIS stack | `references/herramientas-por-stack.md` §the project's stack |
| What to look for, what evidence each item requires and which recipe fixes it | `references/catalogo-hallazgos.md` |
| Write the report | `references/informe.md` (report and finding template) |
| Refactor without breaking anything (`/refactor`) | `references/refactor-seguro.md` |
| Architecture rules that check themselves | `references/reglas-arquitectura.md` |
| Where risk concentrates (code that changes a lot and is complex) | `scripts/hotspots.mjs` |

## Hard rules
1. **No proof, no finding.** Every finding carries at least one verifiable piece of evidence: output
   from a tool, `file:line` with the snippet, a **failing test** that reproduces it, or a
   measurement. "It seems", "it could" or "it smells like" without evidence go to a separate list of suspicions.
2. **Tools before reading.** First run what measures (static analysis, dependency
   audit, layer rules, coverage, hotspots); then read the flagged code. Reading 200
   files "to see what I find" is not an audit.
3. **Verify each finding before reporting it**: open the code, confirm it is not a false
   positive from the tool and note the confidence level (confirmed or probable).
4. **The real version rules** (`code-quality/references/stack-versions.md`): what is fine in Laravel 13 may not
   exist in 10. Do not report as a defect what the project's version does not allow.
5. **The project's conventions are not findings.** If `senzu/conventions.md` sets something, following it is not
   technical debt, even if it is not your preference.
6. **Read-only.** The audit does not change code (it only creates the report and, if needed, reproduction
   tests on a branch). Fixes go to the plan and are done with `/refactor` or `/next`.
7. **Prioritize by real risk**: severity × likelihood × surface (hotspots). A security flaw
   in a public endpoint comes before 40 long functions in a script nobody touches.
8. Tools missing from the project: propose them, but **do not install them without asking** (they are
   new dependencies). If they are not installed, state it in the report as a limit of the audit.

## Output
- `senzu/auditoria/<YYYY-MM-DD>-<area>.md`: executive summary, risk map, findings with evidence,
  unconfirmed suspicions, limits of the audit and proposed plan.
- Cards in `senzu/plan/PLAN.md` (skill `project-planner`) for whatever the user approves fixing.
- Entry in `senzu/devlog/` with the summary and the tools that were run.

## Relationship with other skills
- Fix a finding → the recipe the catalog points to (`code-quality`, `ddd-hexagonal`, `deploy-ops`).
- In-depth security → `code-quality/references/security-owasp.md`.
- The project's own style → `/adopt` (and its architecture rules, `references/reglas-arquitectura.md`).
