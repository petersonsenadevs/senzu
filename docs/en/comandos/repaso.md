---
description: Conversational review session — we go over the website together, section by section
origen: core/commands/repaso.md
huella: 870fcad9a156
---

Usage: `/walkthrough [url or page, e.g. "http://localhost:4321" or "the home page"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `ui-ux-pro-max §references/es/review-session.md` to whatever the user wrote after the command:

1. Prepare: app running, `gustos.md` and the brief at hand; if there is a browser (Chrome MCP) open the URL yourself,
   if not, sync up section by section. Mobile first if it is a local business.
2. Section by section: state the goal in one sentence, ask in plain words ("what does it convey to you?") and STAY QUIET;
   translate the feedback with the glossary and confirm it in their words; at most 2 alternatives per point.
3. Classify out loud: NOW / LATER (X-Tn card) / VETOED (gustos.md). Don't fix things in the middle
   of the walkthrough except trivial ones.
4. Close: spoken summary, persist tastes and cards, apply the NOW items, `/verify`, and show the
   result in the same session if possible.

## When finished
The X-Tn cards that came up are done with `/next`; when nothing is left open, `/launch`.
