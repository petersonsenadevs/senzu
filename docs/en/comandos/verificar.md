---
description: Verify the project after changes — build, lint, types, tests and (if there is UI) mobile
origen: core/commands/verificar.md
huella: 45425e33a482
---

Run the full verification of the project and DON'T consider anything done while it is red:

1. `node <skills-dir>/code-quality/scripts/verify-build.mjs`
   from the root (it uses the stack's commands: lint, types, tests, build; without a build manifest, the repo's
   own suites, the syntax of what changed and the links in the documents). If something FAILS: fix it and
   re-run until 0 failures, pasting the final output.
2. If UI was touched in the session: also `ui-verify` — `node <skills-dir>/ui-verify/scripts/verify-ui.mjs
   <url-local>` with the app in dev, MOBILE 375 first (or the pass with a browser).
3. If `senzu/arquitectura/capas.json` exists: `node <skills-dir>/code-quality/scripts/arquitectura.mjs --comprobar`.
   What this session introduced has to come out clean; inherited issues that were already there are noted, not fixed here.
4. Summarize the verdict (what happened, what was fixed) and leave it in today's devlog.

## When finished
Green: if there is a card in progress, close it and `/next`; with the plan finished, `/launch` (with a UI) or `/deploy`. Red: `/debug` with the first failure.
