---
description: Audit the UI (rubric + browser verification if Chrome is available)
origen: core/commands/revisar-ui.md
huella: 2839e465c698
---

Usage: `/review-ui [url or path of the view, e.g. http://localhost:5173 or Pages/Home.vue]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

1. If the `ui-verify` skill is available and there is a browser (Chrome MCP), follow it with the target the user wrote after the command:
   screenshots at 375/768/1440, dark mode, console and accessibility; attach the results.
2. Audit with `ui-ux-pro-max/references/es/review-rubric.md`: score the 10 dimensions (1-5) with evidence
   (file:line or screenshot) and propose the 3-5 highest-impact actions ordered by impact/effort.
3. Don't apply changes yet: deliver the report and wait for my decision.

## When finished
What the user approves → X-Tn cards in the plan and `/next`; if the design changes, `/round`.
