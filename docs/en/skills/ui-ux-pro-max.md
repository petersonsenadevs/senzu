---
name: ui-ux-pro-max
description: "DEFAULT front-end SKILL: for any landing, page, website, hero, component, form, dashboard, theme or redesign use it FIRST (it picks style, palette, typography and pattern; design system per stack). Then the specialist skill. Not for backend."
origen: core/skills-overlay/ui-ux-pro-max/SKILL.md
huella: 5db326fb2586
---

# ui-ux-pro-max (Senzu layer)

This skill is **UI UX Pro Max** (upstream, in English: `SKILL.upstream.md`, `references/pro-rules.md`,
`references/quick-reference.md`) plus Senzu's own layer with **front-end stack profiles**,
templates and guides (`references/es/`). You are the team's product designer: before writing UI you decide
style, palette, typography and pattern, persist them in `senzu/design-system/<slug>/MASTER.md` and then implement
with the stack guides. Never improvise colors, fonts or spacing in the middle of a component.

## 1. Detect the stack (mandatory, never assume)
1. `senzu/senzu.json` at the root → `frontProfile.stacks` (priority order for `--stack`).
2. If it doesn't exist: `composer.json` with `inertiajs/inertia-laravel` → Laravel+Inertia profile; `package.json` with
   `next` → Next.js; `astro` → Astro; `vue` without Inertia → Vue 3; `svelte`/`nuxt`/`angular` → their upstream stacks.
3. If it is still unclear, ask. Note the profile in the devlog.

| Profile (Senzu) | `--stack` (in order) | Specifics that ALWAYS apply |
|---|---|---|
| Laravel + Inertia + Vue 3 | `laravel`, `vue`, `html-tailwind`, `shadcn` | Persistent layouts, `<Head>`, `useForm` with `form.errors.campo` + `form.processing`, `preserveScroll`, partial reloads, flash messages, Ziggy, optional SSR; shadcn-vue/Reka UI components; dark mode with a class in `app.blade.php`. |
| Next.js (App Router) + React | `nextjs`, `react`, `shadcn`, `html-tailwind` | Server/Client Components (`"use client"` only where needed), `next/image`, `next/font`, `metadata`, `loading.tsx`/`error.tsx`, forms with server actions + `useActionState`, shadcn/ui. |
| Astro (+ React islands) | `astro`, `react`, `shadcn`, `html-tailwind` | HTML first; scroll/GSAP effects in a vanilla `<script>` (NO island); interactive UI with state or declarative animation (Motion, R3F, shadcn/ui) → React island with `client:visible`/`client:idle`; View Transitions, content collections, `<Image>`, SEO in `<head>`. |
| Vue 3 + TS (SPA) | `vue`, `html-tailwind`, `shadcn` | `<script setup lang="ts">`, composables, Pinia, VueUse, Reka UI/shadcn-vue, `<Transition>`, Teleport, router guards, lazy routes. |

The rows marked `(es)` in the stack guides come from Senzu (`data/stacks/*.extra.csv`).

## 1b. Minimum reading per task (don't load more; `SKILL.upstream.md` and references by sections)
| Task | Read only |
|---|---|
| New project/page, redesign or undecided client | `references/es/brief-discovery.md` (interview, glossary) + `references/es/business-playbooks.md` (THEIR business) + `references/es/proposal-mode.md` (approvable blueprint + A/B mockups BEFORE building) + `references/es/rondas.md` (more mockups: lock what they liked, veto what they didn't, something new; template and round check) |
| Fonts, icons, tools or references | `references/es/fonts-icons.md` · `references/es/resources-toolbox.md` · `references/es/inspiration.md` |
| Landing / marketing | §2 flow + `references/es/page-patterns.md` + `references/es/industry-rules.md` + `references/es/copywriting.md` (headlines/CTAs) |
| Dashboard / admin / table | `references/es/components-spec.md` §Table, §Empty state, §Skeleton + `--stack` guides |
| Form | `components-spec.md` §Input, §Form (your stack) + `references/es/accessibility.md` §Formularios (forms) |
| Single component | `components-spec.md` (only that component) + tokens from `senzu/design-system/*/MASTER.md` |
| Theme / tokens / dark mode | `references/es/tokens-tailwind.md` (your stack's section) |
| UI audit · walkthrough WITH the user | `references/es/review-rubric.md` · together: `references/es/review-session.md` |
| "Make it look modern" (hero, bento, aurora, glass, glow) | `references/es/modern-look.md` (recipes + native modern CSS §9) |
| Charts / GSAP presets · Delivery | `references/quick-reference.md` (specific section) · `references/pro-rules.md` (checklist) |

## 2. Mandatory flow
1. **Brief** (`references/es/brief-discovery.md`): checklist of what you need to know (brand/guideline, goal,
   audience, real content, constraints) + plain-language interview with a client→technical glossary;
   ALWAYS ask for 2-3 reference websites (protocol in `references/es/inspiration.md`). Brand manual →
   `senzu/design-system/<slug>/BRAND.md`. New project/redesign → **proposal mode** (`references/es/proposal-mode.md`):
   approved blueprint + 2 A/B mockups you can SEE, and only then build.
2. **Project design system**: if `senzu/design-system/*/MASTER.md` exists, it is the source of truth (and `pages/<página>.md`
   prevails for that page). If it doesn't exist, generate it and persist it from the project root:
   ```bash
   python3 <skills-dir>/ui-ux-pro-max/scripts/search.py "<producto industria keywords>" --design-system -p "<Proyecto>" --persist -o senzu
   # Windows:  py -3 <skills-dir>/ui-ux-pro-max/scripts/search.py "..." --design-system -p "<Proyecto>" --persist -o senzu
   # Specific page:  ... --design-system --page checkout -p "<Proyecto>" --persist -o senzu
   # Optional dials: --variance 1-10  --motion 1-10  --density 1-10
   ```
   `<skills-dir>` = `.claude/skills` (Claude Code) · `.agents/skills` (Codex/Antigravity/Cursor) · `.cursor/skills` · `.windsurf/skills` · `${CLAUDE_PLUGIN_ROOT}/skills` (installed as a plugin).
   Wrappers: `scripts/search.ps1` (Windows) and `scripts/search.sh` (bash) find the interpreter for you.
3. **Targeted searches** (2-5 terms): `--domain style|color|typography|ux|product|chart|gsap|accessibility|icons`.
4. **Stack guides**: `search.py "<tema>" --stack <first in the profile>`; repeat with the rest of the profile if it helps
   (e.g. `laravel` and then `vue`). If 0 results, rephrase once; never invent results.
5. **Tokens before markup**: turn the design system into tokens (`references/es/tokens-tailwind.md`, Tailwind 4
   `@theme` + semantic + dark). No repeated loose hex values.
6. **Implement** following the page pattern, `references/es/components-spec.md` (anatomy/states per stack) and the
   stack guides. Animation/3D → skills `gsap-scrolltrigger` / `threejs-webgl` if installed, respecting these tokens.
7. **Before delivering (blocking)**: checklist in `references/pro-rules.md` + `references/es/accessibility.md`.
   Check 375 (with `ui-verify`: measure and annotate the screenshot) / 768 / 1440 px and dark mode; document in the devlog what was verified and what is pending.

## 3. Hard rules (upstream + Senzu)
1. SVG icons (Phosphor/Lucide/Heroicons) with `aria-hidden` and accessible text — **never emojis as icons**.
2. Contrast 4.5:1 for normal text, 3:1 for large text/icons/borders; verified in light and dark.
3. Responsive 375–1440 px with no horizontal scroll; zoom not blocked. **Mobile THOUGHT THROUGH, not shrunk**: every section and effect is decided for touch (`references/es/movil.md`: effects, burger/bottom bar, sizes, hover).
4. All states: hover, focus-visible (2 px ring), active, disabled, loading, empty, error, success.
5. `prefers-reduced-motion` respected; micro-interactions 150–300 ms; nothing blocks interaction.
6. Semantic tokens (`background/surface/border/text/text-muted/primary/accent/success/warning/danger`) in light and dark.
7. Resilient text: short labels, ellipsis/`line-clamp` fallback, buttons that don't break onto 2 lines.
8. Forms: visible label, error next to the field with `aria-invalid`/`aria-describedby`, `autocomplete`, focus on the first error, button with a submitting state.
9. One H1 per view, semantic landmarks, full keyboard navigation, modals with trapped focus and `Esc`.
10. Images with dimensions/`aspect-ratio`, `alt`, lazy below the fold, WebP/AVIF.
11. Real copy (no lorem ipsum), CTAs with a verb, errors that say how to fix them.
12. No second component library or new fonts without approval; reuse what the project already has.

## 4. Priority of sources of truth
`senzu/design-system/<slug>/BRAND.md` (brand manual) → `gustos.md` (accumulated vetoes and preferences: ALWAYS read it; a veto is not proposed again) → `pages/<página>.md` → `MASTER.md` → the client's or agency's brand skill, if the project has one → existing tokens in the project →
`search.py` results → your judgment (documented in MASTER.md if you deviate).

## 5. Resources
- `SKILL.upstream.md` — full upstream documentation (domains, dials, output format, priority rules 1-10).
- `references/pro-rules.md` — canonical delivery checklist. `references/quick-reference.md` — icons, charts, GSAP.
- Senzu layer (all in `references/es/`): `brief-discovery.md` · `business-playbooks.md` · `proposal-mode.md` (blueprint+mockups+preferences) · `rondas.md` + `plantilla-maqueta.html` (rounds with votable pieces) · `movil.md` (a thought-through mobile version: plan per section, effects on touch, menu, sizes, hover) ·
  `fonts-icons.md` · `resources-toolbox.md` · `inspiration.md` · `modern-look.md` · `copywriting.md` · `measurement.md` · `review-session.md` · `workflow.md` · `tokens-tailwind.md` · `forms-ux.md` (forms people FINISH: fields, validation, multi-step — read it when building any form) · `anti-ia.md` (BLACKLIST of patterns that give away an AI-made website + rotation of references: read it BEFORE proposing or building mockups) · `composiciones.md` (the ways to arrange the page —bento, editorial, broken grid, split screen, storytelling— by type of business: choose the composition BEFORE the effects).
- `references/es/components-spec.md` — anatomy, states and a11y of the base components (forms per stack).
- `references/es/accessibility.md` — practical WCAG 2.2 AA. `references/es/review-rubric.md` — audit existing UI.
- `data/` — searchable CSVs (upstream) + Senzu `(es)` rows in `data/stacks/`.

## 6. Expected output when you design
First a short block: **Profile/stack**, **Pattern**, **Style**, **Palette (tokens)**, **Typography**, **Effects**,
**Avoid** — and every decision JUSTIFIED in the user's language against their brief or their gustos.md
("serif because you asked for premium"; whatever is your own judgment, say so). Then the code and the final checklist.
