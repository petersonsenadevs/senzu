---
description: Launch checklist — everything checked before publishing the website
origen: core/commands/lanzar.md
huella: 6e53f480fd17
---

Usage: `/launch [preview/production url]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Go through ALL of `ui-verify §references/launch-checklist.md` on whatever the user wrote after the command, with evidence for each point
(command, screenshot or URL — nothing "from memory"):

1. Technical (blocking): `verify-build.mjs` + `verify-ui.mjs` at 0 + visual critique
   (`references/visual-critique.md`) + forms actually tested + 404.
2. SEO: titles/descriptions, OG validated, JSON-LD validated, sitemap/robots, canonicals (+ hreflang if there are languages).
3. Performance: mobile PageSpeed (LCP < 2.5 s, CLS < 0.1).
4. Measurement: analytics after consent + the plan's conversions (`measurement.md`) firing in real time.
5. GDPR/LSSI legal pages, domain/SSL/redirects, favicon/manifest, SPF/DKIM/DMARC if there are emails.
6. Final content: no lorem or placeholders; NAP = Google Business; gustos.md respected.

Verdict (READY / READY with minor issues / NO) + evidence to the devlog; the "minor issues" become
X-Tn cards. Remember: the deploy itself NEVER without the user's explicit approval.

## When finished
READY → `/deploy` (with explicit approval). READY with minor issues → `/deploy` and then the X-Tn cards with `/next`. NO → `/next` with the cards created and `/launch` again.
