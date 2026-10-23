---
name: gsap-scrolltrigger
description: "Web animation with GSAP 3 + ScrollTrigger + Lenis: scroll-in entrances, pin/scrub, parallax, horizontal scroll, reveals, page transitions, sync with 3D. Vue/Inertia, Next, Astro, vanilla. Not for CSS hovers or simple states."
origen: core/skills-overlay/gsap-scrolltrigger/SKILL.md
huella: 492663a302ba
---

# gsap-scrolltrigger (Senzu layer)

Upstream skill (English): `SKILL.upstream.md` (full API, patterns, integration with Three.js and React),
`references/api_reference.md`, `references/common_patterns.md`, `references/easing_guide.md`,
`assets/starter_scroll/`, `assets/easings/easing_visualizer.html`, `scripts/generate_animation.py`, `scripts/timeline_builder.py`.
Senzu's own layer: `references/es/` and `templates/`.

Motion **reinforces hierarchy and feedback**; it is never gratuitous decoration. Durations, easing and "what gets animated"
come from the project's `senzu/design-system/*/MASTER.md` (skill `ui-ux-pro-max`); if it does not exist, use 150/250/400 ms,
`power2.out` for entrances and `power1.inOut` for scrubs.

## 1. Detect the stack and integrate
| Stack (Senzu profile) | Reference | Templates | Critical points |
|---|---|---|---|
| Vue 3 (SPA or with Laravel + Inertia) | `references/es/vue.md` | `templates/useGsap.ts`, `ScrollReveal.vue`, `HorizontalScroll.vue`, `useLenis.ts` | `gsap.context` in `onMounted` + `revert()` in `onBeforeUnmount`; with Inertia: `router.on('finish')` → `ScrollTrigger.refresh()`, kill triggers on navigation, persistent layouts, SSR-safe. |
| Next.js / React | `references/es/next.md` | `templates/useGsapReact.tsx` | `@gsap/react` `useGSAP({ scope })`, `"use client"`, `contextSafe`, refresh on `pathname`, StrictMode. |
| Astro | `references/es/astro.md` | `templates/gsap-astro.ts` | GSAP in a vanilla `<script>`, NO island (React islands only for Motion/R3F/state); `astro:page-load` / `astro:before-swap` (View Transitions), deduplicated scripts. |
| Vanilla / others | `SKILL.upstream.md` | `assets/starter_scroll/` | `gsap.matchMedia`, `ScrollTrigger.refresh()` after images/fonts load. |

Detect the stack as described in `ui-ux-pro-max/SKILL.md` §1 (`senzu/senzu.json` → `composer.json`/`package.json`).

## 1b. Minimum reading per task
| Task | Read only |
|---|---|
| Reveal on scroll / stagger | `references/es/scrolltrigger-patterns.md` §batch/fade-up + `templates/ScrollReveal.vue` (or the React/Astro equivalent) |
| Pinned section with scrub / scroll-story | `scrolltrigger-patterns.md` §pin + `references/es/api-cheatsheet.md` §timelines |
| Horizontal scroll | `scrolltrigger-patterns.md` §horizontal + `templates/HorizontalScroll.vue` |
| Smooth scroll (Lenis) | `references/es/vue.md`/`next.md`/`astro.md` §Lenis + `templates/useLenis.ts` |
| Page transition | your stack's reference §transitions |
| Text that reveals (SplitText) | `api-cheatsheet.md` §plugins + SplitText pattern |
| Specific effect (marquee, cursor, skew, magnifier, before/after, stacking, gallery…) | `references/es/effects-pro.md` (the effect's section) |
| Pattern documented only in English (stacked cards §2.4, scramble §7.2, typewriter §7.3, curtain §8.1) | `references/common_patterns.md` (Grep for the title) |
| Something does not work | `references/es/pitfalls.md` (Grep for the symptom) |
| Specific GSAP API | upstream `references/api_reference.md` (Grep for the method) |

Full effects catalog with pointers: `front-activation/references/effects-catalog.md`.

## 2. Flow
1. Read the design system (§7 motion) and pick the pattern in `references/es/scrolltrigger-patterns.md` (15 complete
   patterns) or `references/common_patterns.md`; do not invent from scratch.
2. Register plugins **once** in a shared module (`lib/gsap.ts`): `gsap.registerPlugin(ScrollTrigger, …)`.
3. Integrate according to the table in §1 (guaranteed cleanup on unmount/navigation).
4. Wrap in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`; under `reduce` leave the final state visible.
5. Performance (`references/es/performance-a11y.md`): only `transform`/`opacity`/`clip-path`; `will-change` with judgment;
   no animated `height:auto`, `top/left` or `box-shadow`; `markers` only in dev.
6. Verify in the browser (375 and 1440): no jumps on refresh, no blocked scroll on mobile, no invisible elements
   after navigating, clean console. Document in the devlog.

## 3. Hard rules
- Everything created in a component is **reverted** on unmount (`ctx.revert()`); in SPA/Inertia/Next/Astro, ScrollTriggers
  are cleaned up on page change.
- `from({ opacity: 0 })` → use `autoAlpha` and an initial CSS `visibility:hidden` (no first-render flash).
- `ScrollTrigger.refresh()` after images (`decode()`), fonts (`document.fonts.ready`) and layout changes.
- No `overflow:hidden` on `html/body` with ScrollTrigger without an explicit `scroller`.
- No scroll-jacking (Lenis, snap) in forms, checkout or dashboards; only in narrative landings, and disabled with reduced-motion.
- Entrances ≤ 800 ms; intros > 1.2 s must be skippable. GSAP only on the client (SSR-safe).
- Frequent errors and their fix: `references/es/pitfalls.md` (27 cases).

## 4. Most used patterns
| Need | Pattern | Notes |
|---|---|---|
| Elements appear on scroll | `ScrollTrigger.batch` + fade-up 16-24 px, stagger 0.06-0.1 | `once: true`, `start: 'top 85%'` |
| Pinned section that tells a story | pin + timeline `scrub: 1` | `end: '+=200%'`, `anticipatePin: 1` |
| Horizontal carousel with vertical scroll | pin + `xPercent: -100 * (n-1)` | `invalidateOnRefresh`, optional snap |
| Depth | layered parallax `yPercent` + `scrub` | max. 3 layers; disable on mobile |
| Headline that reveals | SplitText by lines + `yPercent: 100` + `mask: 'lines'` | wait for `document.fonts.ready` |
| Counting numbers | `gsap.to(obj, { val, snap: { val: 1 }, onUpdate })` | `once`; `Intl.NumberFormat` |
| Page-to-page transition | timeline on mount + overlay at navigation start | ≤ 600 ms; not in forms |
| Header that hides on scroll down | `ScrollTrigger.create({ onUpdate: self => self.direction })` | `yPercent: -100`, 300 ms |
| Infinite marquee | tween `xPercent: -50` + `repeat: -1`, pause/direction with `timeScale` | `effects-pro.md` §Marquee infinito |
| Skew by scroll velocity | `getVelocity()` + `quickTo` with clamp ±8 | `effects-pro.md` §Scroll velocity skew |
| Cards that stack on scroll | sticky + scale/rotation/blur of the previous ones | `effects-pro.md` §Stacking cards completo |
| Cursor that follows the pointer | `quickTo` x/y + states via `data-cursor` | `effects-pro.md` §Cursor personalizado |

## 5. Expected output
Before the code: pattern, where plugins are registered, how it is cleaned up, behavior under reduced-motion.
After: code + real verification in the browser.
