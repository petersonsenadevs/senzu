---
description: Methodical debugging — reproduce, failing test, hypothesis, narrow down, fix the cause and verify
origen: core/commands/depurar.md
huella: 152d5963624d
---

Usage: `/debug [symptom or error, e.g. "checkout returns 500 with coupons"]` — the argument is optional; if none is given, it debugs the last failure of the session.

Apply the `depurar` skill in full to whatever the user wrote after the command (or to the last
error or red test of the session):

1. **Reproduce** the failure and show the exact error (message and trace from your own code).
2. Write the **smallest failing test** for that reason and check that it fails.
3. Look at `references/sintomas-frecuentes.md` in case the symptom is known and write **one hypothesis**.
4. **Narrow it down** with the techniques in `references/tecnicas-por-stack.md` until you isolate where it originates.
5. **Fix the cause** with the minimal change; after three failed attempts, stop and rethink the hypothesis.
6. **Verify**: the test green, `/verify` green and the real case working. Remove the temporary logs.
7. Summarize for the user in three lines: cause, fix and how it was checked; and record it in the devlog.

## When finished
If the failure came from a plan card, close it (Verificado (verified), Cumple (meets), devlog) and propose `/next`. If not, say which test covers it now and go back to what was being done.
