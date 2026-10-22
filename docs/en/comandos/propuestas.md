---
description: Proposal mode — an approvable blueprint + 2 visual A/B mockups before building
origen: core/commands/propuestas.md
huella: 70cd85b6d8a2
---

Usage: `/proposals [page, e.g. "home" or "landing"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `ui-ux-pro-max §references/es/proposal-mode.md` in full to whatever the user wrote after the command (or the main page):

1. If there is no brief → `/brief` first (don't propose blindly).
2. **Blueprint**: write `senzu/design-system/<slug>/blueprint.md` (sections + REAL sketched content +
   who brings what) and ask for explicit approval. Iterate in text until APPROVED.
3. **Mockups (round 1)**: generate `senzu/design-system/<slug>/propuestas/ronda-1/a.html` and `b.html` from the
   template `references/es/plantilla-maqueta.html` (labeled pieces and «Tu opinión» (your opinion) panel)
   (self-contained, same sections, opposite visual directions within the brand, PROPOSAL
   banner). Verify with `ronda-check.mjs` and open both (or give the paths): the user votes on the pieces in the panel or
   says it in plain words. To keep refining, `/round` (what they like gets fixed, what they don't gets vetoed, always something new).
   References rotated by industry (§references of proposal-mode): no "like Stripe" out of
   inertia. ZERO patterns from the blacklist `references/es/anti-ia.md` (availability badges,
   section numbering, trusted-by, invented metrics...).
4. **Record**: chosen direction → MASTER.md (with traceability, including the chosen icon SET);
   opinions and vetoes → `gustos.md` (seeds the default anti-AI vetoes).
5. Only then build the real page, with a **checkpoint per section** (one section → show →
   one question → gustos.md → next), justifying each decision in the user's language.

## When finished
`/round` to iterate until one is chosen; with the chosen one, build section by section with checkpoints and when done `/verify`.
