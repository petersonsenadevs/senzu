---
description: Apply a pro frontend effect from the catalog (parallax, marquee, cursor, stacking…)
origen: core/commands/efecto.md
huella: dd4bb67fc30a
---

Usage: `/effect <effect name> [where, e.g. "marquee in the logos footer"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

1. Look up the effect the user wrote after the command in `front-activation/references/effects-catalog.md` and open ONLY the file §section that
   the row indicates (if it isn't there, use the section "Si el efecto no está aquí" (if the effect isn't here)).
2. Before implementing, go through the F4 tree (can I afford the effect?): reduced-motion with a fallback, LCP, touch mobile,
   no scroll-jacking on forms. If `senzu/design-system/*/MASTER.md` doesn't exist, warn me: the effect inherits tokens/easing
   from the design system.
3. Implement with my stack's integration (cleanup on unmount included) and say how to verify it in the browser.

## When finished
`/verify` (mobile first: the effect is checked at 375) and, if it came from a card, close it and `/next`.
