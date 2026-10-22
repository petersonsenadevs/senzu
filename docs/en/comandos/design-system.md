---
description: Generate (or review) the project's design system with ui-ux-pro-max
origen: core/commands/design-system.md
huella: 02e76a319b72
---

Usage: `/design-system [product/industry, e.g. "invoicing saas for freelancers"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `ui-ux-pro-max` §2:

1. If `senzu/design-system/*/MASTER.md` exists, summarize it (style, palette, typography, pattern) and ask what to adjust.
2. If it doesn't exist: detect the stack (§1), run the search tool with whatever the user wrote after the command (or infer it from the project) and persist:
   `py -3 <skills-dir>/ui-ux-pro-max/scripts/search.py "<producto e industria que indicó el usuario>" --design-system -p "<Proyecto>" --persist -o senzu`
   (outside Windows: `python3`). Adjust primary/typefaces to the existing brand if there is one and present the result
   (pattern, style, palette with tokens, typography, things to avoid) before mocking up anything.

## When finished
`/proposals <page>` to see mockups with this design system (or `/round` if there are already proposals); `/plan` if there are no cards yet.
