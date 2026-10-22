---
name: ui-verify
description: "MANDATORY UI verification before considering a view done: Playwright script (scripts/verify-ui.mjs) or Chrome MCP browser at 375/768/1440, MOBILE FIRST, dark mode, console and accessibility. Also when asked to verify the responsive layout."
origen: core/skills/ui-verify/SKILL.md
huella: 8022b4a74f76
---

# ui-verify (Senzu)

Closes the `ui-ux-pro-max` loop: its checklist requires checking 375/768/1440, dark mode and accessibility — this skill
actually does it instead of taking it for granted. It is used when finishing a view, in `/review-ui` and in the «Verificar» (Verify) field of
the plan's UI cards. **Mobile (375 px) is checked FIRST: it's where everything breaks and where people look the least.**

## Path 1 (preferred): automatic script `scripts/verify-ui.mjs`
With the app running locally (`dev` command from `config.json`/`stack.json`):
```bash
node <skills-dir>/ui-verify/scripts/verify-ui.mjs http://localhost:PUERTO/ruta
# required once per project:  npm i -D playwright && npx playwright install chromium
```
It checks per viewport: **horizontal scroll (with the offending elements)**, console errors, meta viewport,
number of h1, images without `alt`/dimensions, tap targets < 44px (mobile), text < 12px, fields without a label, and
**GEOMETRY in pixels** (`scripts/geometria.mjs`): real centering of what the container centers, loaders and their
group centered in their layer, loader and bar on the same axis, spinners that drift while spinning, SVG drawings
off-center in their box and siblings that are "almost" aligned (1-8 px: a leftover margin or top), with the probable
cause. On **MOBILE** (`scripts/movil.mjs`): content that only appears on hover, fields < 16 px (zoom on
iPhone), fixed elements that cover content, fixed backgrounds, custom cursor, h1 that eats the screen, navigation that doesn't fit
or disappears, and **the menu actually used**: it taps it, measures the open panel (links ≥ 44 px, inside the
screen, not covered), captures it and tests Escape; it prints the real sizes (h1, paragraph, header, CTA).
Screenshots in `senzu/ui-verify/`: `<ancho>.png`, `<ancho>-anotada.png` (each warning `[g1]`/`[m2]` boxed
over its element) and `375-menu.png`. It exits with code 1 if there are problems: **fix them and run it again
until 0**. An INTENTIONAL offset (optical adjustment): `data-geometria="ignorar"` on the
element and the reason in the devlog. `--tolerancia <px>` (default 1).
Then OPEN the screenshots (Read), the ANNOTATED one first: each warning is confirmed or dismissed by LOOKING AT IT, and
whatever looks crooked to the eye is measured before touching it. Review what the script doesn't see: hierarchy, spacing,
dark mode. How to think about the mobile version: `ui-ux-pro-max/references/es/movil.md`.

## Path 2: Chrome MCP browser (step-by-step reference: `references/browser-checks.md`)
1. Open the URL in a new tab and resize to **375 first**, then 768 and 1440; take a full-page screenshot at each.
2. **Dark mode**: toggle the theme and capture 375 and 1440.
3. **Console and network**: errors/warnings and failed requests (4xx/5xx, 404 assets).
4. **Accessibility**: inject axe-core; violations by impact. By hand: one H1, visible focus when tabbing, `Esc` closes modals.
5. **Minimal interaction**: hover/focus on CTAs; forms show the error next to the field; mobile menu opens/closes.

## Fallback without a browser or Node
Ask the user to open the URL and report against the checklist: DevTools responsive at the 3 widths (mobile first),
dark toggle, clean console, Tab through the page. State explicitly in the devlog that the verification was manual.

## Build well before verifying (reading per task)
| Task | Read only |
|---|---|
| Build accessible UI (ARIA, keyboard, forms, modals) | `references/a11y-build.md` — what axe doesn't see |
| Core Web Vitals: LCP/CLS/INP, Lighthouse, JS budget | `references/web-performance.md` (backend → `code-quality/references/performance.md`) |

## Visual critique (MANDATORY for the APTA verdict)
After the technical pass, OPEN the screenshots (Read) and evaluate them with `references/visual-critique.md`:
9 axes 1-5 (hierarchy, whitespace, alignment, perceived contrast, consistency, mobile density, photos,
cover test, AI smell). A score of 1-2 on any = fix before delivering. Before publishing the website:
`/launch` → `references/launch-checklist.md` (SEO, PageSpeed, measurement, legal, domain).

## Report (goes to the devlog and the plan card)
Width×theme table with OK/issues + console errors + verdict `APTA` / `APTA con menores` / `NO APTA` (pass / pass with minor issues / fail)
(with concrete actions). On mobile, state explicitly: no horizontal scroll, tappable CTAs, readable text, usable menu.

## Hard rules
- A UI is not "done" without this documented pass. Saying "it should look fine" is NOT verifying.
- If the script returns problems, they are fixed and it is re-run: nothing is delivered with the verifier in red.
- Don't fix things unrelated to your task on the fly: report them (or an `X-Tn` card if there is a plan) and wait for a decision.
- Screenshots ALWAYS in the project's `senzu/ui-verify/`, never in the scratchpad or temporary folders. Browser (MCP) screenshots aren't saved to disk: if the user wants to keep them, use the script.
- Don't navigate outside the target URL or submit forms with real data.
