---
name: depurar
description: "Method for fixing bugs without shooting in the dark: reproduce, failing test, hypothesis, narrow down, fix and verify. Use it when something fails or doesn't work while you build (red tests, exception, 500 error, wrong result)."
origen: core/skills/depurar/SKILL.md
huella: 5203d79362b7
---

# depurar (Senzu)

A bug is fixed by **understanding it**, not by trying changes until it stops failing. Changing things at
random fixes the symptom, hides the cause and breaks something else. This skill is used at two moments:
- **While you build** (a function, an endpoint, a component): as soon as a test goes red or
  something doesn't do what you expect, stop and apply the method before the next change.
- **For a reported bug** (`/debug <symptom>`): the same method from step 1.

## The method (in order, without skipping steps)
1. **Reproduce**: the exact error (message, trace, input that triggers it). Without reliable reproduction nothing
   gets fixed: if it doesn't reproduce, the first thing is to make it reproduce (data, steps, environment).
2. **Failing test**: write the smallest test that reproduces the bug and check that it fails for the
   right reason. It will be the proof of the fix and the safety net against regressions.
3. **Actually read the error**: the full trace, from the first line of your own code. The message
   usually states the cause; read it before forming theories.
4. **Explicit hypothesis**: "it fails because X". Just one, written down, with what would confirm or rule it out.
5. **Narrow down**: split the problem in half (input, layer, commit) until you isolate where it originates. Tools
   and techniques per stack: `references/tecnicas-por-stack.md`.
6. **Fix the cause**, not the symptom: the minimal change that resolves it. If the fix is a `try/catch`
   that silences the error, an `if` that dodges the case or a `sleep`, it is almost certainly not the cause.
7. **Verify**: the test from step 2 green, the full suite green (`/verify`) and the real case
   reproduced in step 1 working.
8. **Document**: cause in one sentence, fix and test in the devlog. If the same kind of bug can come back
   in other places, look for it now (same pattern in the rest of the code).

## Minimal reading per task
| Task | Read only |
|---|---|
| Debuggers, temporary logs and bisection per stack | `references/tecnicas-por-stack.md` |
| Typical symptoms and their usual cause (don't reinvent) | `references/sintomas-frecuentes.md` |

## Hard rules
- **Three failed attempts = stop.** If after three changes it still fails, the hypothesis is wrong: go back
  to steps 3 and 4 with what you learned, or ask the user for context. Don't keep changing things.
- **One change at a time**, running the test afterwards. Several changes together = you don't know which one fixed it.
- **Temporary logs**: allowed during debugging with the `senzu-allow` comment
  (the hygiene hook requires it) and **removed before closing**.
- **Don't touch the test to make it pass.** If the test was wrong, say so and explain why; otherwise, what is
  wrong is the code.
- **Don't disable validation, security or tests** to "see if it works that way".
- If the bug is in a dependency: confirm it with a minimal reproduction outside the project before
  blaming it, and check whether it is already reported or fixed in a later version.

## Relationship with other skills
- Tests → `code-quality/references/testing.md`. Errors and logs → `code-quality/references/errors-logging.md`.
- Performance bug → `code-quality/references/performance.md` (measure before changing).
- Bug that uncovers a design problem → note it down for `/audit` or `/refactor`; don't fix it in passing.
