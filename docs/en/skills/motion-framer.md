---
name: motion-framer
description: "Animation in React with Motion (formerly Framer Motion): variants, gestures, layout, AnimatePresence, springs, useScroll. USE IT in Next.js/React and in Astro inside a React island. Not for Vue or complex scroll (use gsap)."
origen: core/skills-overlay/motion-framer/SKILL.md
huella: ec315e16a1eb
---

# motion-framer (Senzu layer)

Upstream skill (English): `SKILL.upstream.md` (concepts, patterns, hooks, GSAP/R3F integration, performance, pitfalls),
`references/api_reference.md` (full API, 1077 lines), `assets/starter_motion/`, `assets/examples/`,
`scripts/animation_generator.py`, `scripts/variant_builder.py`. Senzu's own layer: `references/es/next.md`.

Motion is the tool for **state animation in React**: component enter/exit, gestures, lists that
reorder, modals, tabs with a shared indicator. Durations, easing and "what gets animated" come from
`senzu/design-system/*/MASTER.md` (skill `ui-ux-pro-max`); without it, 150/250/400 ms and `ease: [0.2, 0.8, 0.2, 1]`.

## 1. When yes / when no
| Situation | Skill |
|---|---|
| React/Next components: states, gestures, AnimatePresence, `layout`, `layoutId`, list stagger | **motion-framer** |
| Narrative scroll, pin, scrub, multi-layer parallax, SplitText, long timelines | `gsap-scrolltrigger` |
| Vue 3 (SPA or Laravel + Inertia), Astro without React islands | `gsap-scrolltrigger` (or vanilla `motion`: `import { animate } from "motion"`) |
| 3D: moving camera/mesh | `react-three-fiber` (Motion only provides `useMotionValue` as a bridge, see upstream 656-686) |
| Trivial hover/focus on a button | CSS `transition` (do not load Motion for this) |

## 2. Minimum reading per task (`SKILL.upstream.md`)
| Task | Lines |
|---|---|
| First component: `motion.*`, `animate`, `initial`, `transition` | 31-107 |
| Variants and propagation to children (stagger) | 108-150, 860-879 |
| Hover / tap / drag | 152-281, 506-542 |
| Modals, toasts, lists with exit (AnimatePresence) | 283-357, 790-824 |
| Layout animations and `layoutId` (tabs, expanding card) | 359-424, 767-786, 840-858 |
| Appear on scroll (`whileInView`, `useInView`) | 426-465, 606-623 |
| Springs and presets | 467-504 |
| Imperative control (`useAnimate`, `stagger`) | 544-604 |
| Performance and reduced motion | 722-786 |
| Common mistakes (6 cases) | 788-902 |
| Detailed API: `useScroll`/`useTransform`/`useSpring` | `references/api_reference.md` 619-718 |
| `AnimatePresence` modes (`wait`, `popLayout`) and `usePresence` | `references/api_reference.md` 779-886 |

## 3. Integration with Senzu profiles
| Profile | How | Critical points |
|---|---|---|
| Next.js App Router + React | `npm i motion` → `import { motion, AnimatePresence } from "motion/react"` (upstream still imports `framer-motion`; equivalent) | Every component with Motion has `"use client"`; the parent Server Component passes data as props. `useReducedMotion()` in every pattern; `LazyMotion` + `m` + `domAnimation` to reduce the bundle on public pages. Details: `references/es/next.md`. |
| Vue 3 / Laravel + Inertia | Do not use Motion for React | `gsap-scrolltrigger` (`gsap-scrolltrigger/references/es/vue.md`) or vanilla `motion` (`animate()`, `inView()`, `scroll()`) for one-off cases. |
| Astro | Only inside React islands (`client:visible`) | If the page has no React, `gsap-scrolltrigger/references/es/astro.md`. |
| shadcn/ui | Wrap: `<motion.div>` around the component or `asChild` + `motion.button` | Do not rewrite the components in `components/ui/*`; animate containers. |

## 4. Hard rules
- `useReducedMotion()` in every pattern with movement, scale or stagger: with `reduce`, only opacity or `duration: 0`;
  the final state always visible (never content hidden by `initial` in SSR/without JS: use `initial={false}` or
  `whileInView` with `viewport={{ once: true }}`).
- Animate only `x/y/scale/rotate/opacity/clipPath`; no animated `width/height/top/left/boxShadow` (upstream 724-746).
- `layout` / `layoutId` only where the layout change is visible and on few elements (< 20); in long lists,
  `opacity` + `exit` without `layout`. `layout="position"` when the size does not change.
- Every exit requires `AnimatePresence` with a stable `key` (id, not index) and the `motion.*` as a direct child.
- Gesture transitions go inside the `whileHover`/`whileTap` itself (upstream 881-902).
- Cleanup: `useAnimate`/`animate()` are cancelled in the effect's cleanup; `useScroll` with `target` referencing
  a mounted element; no manual scroll listeners.
- Durations: micro ≤ 200 ms, entrances ≤ 500 ms, page transitions ≤ 400 ms; no blocking intros.
- A single system per interaction: do not mix GSAP and Motion on the same node/property.

## 5. Quick decisions
| Need | Pattern |
|---|---|
| List that appears staggered | container variants `staggerChildren: 0.06` + children `hidden/visible` (upstream 127-150) |
| Modal / drawer with exit | `AnimatePresence` + `motion.div` overlay and panel, fixed `key`; focus handled by Radix/shadcn |
| Tabs with a sliding underline | `motion.span layoutId="tab-indicator"` inside the active tab (upstream 395-408) |
| Card that expands into detail | shared `layoutId` + `AnimatePresence`; in Next, same route (not across pages) |
| Button with feedback | `whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}`, 150 ms transition |
| Section that appears on scroll | `whileInView` + `viewport={{ once: true, amount: 0.3 }}` |
| Reading progress / soft parallax | `useScroll` + `useTransform` + `useSpring` (`references/es/next.md` §5) |
| Transition between Next routes | `template.tsx` with an entrance `motion.div`; exit only if worth it (`references/es/next.md` §2) |

## 6. Expected output
Before the code: chosen pattern, where `"use client"` goes, behavior with reduced-motion, what gets cleaned up.
After: code + browser verification (375 and 1440, clean console, no hydration flicker).
