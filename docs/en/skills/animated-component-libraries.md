---
name: animated-component-libraries
description: "Prebuilt animated React components: Magic UI (Tailwind + Motion + shadcn/ui) and React Bits (BlurText, CountUp, Dock, Particles, Aurora). For landings, hero, marquee, stats, backgrounds. Not for custom animation, Vue/vanilla or 3D."
origen: core/skills-overlay/animated-component-libraries/SKILL.md
huella: 131fa9096aa6
---

# animated-component-libraries (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (824 lines). **Do not read all of it**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: landing/marketing in React or Next.js that needs a hero with an animated background, revealed text, counters, a testimonials marquee, buttons with shimmer/border beam, a macOS-style dock.
- Use: the project already has shadcn/ui + Tailwind and wants to add animated components via `npx shadcn@latest add https://magicui.design/r/<comp>`.
- Use: choosing between Magic UI and React Bits or combining them on the same page.
- Do NOT use: custom DOM animation, scroll-driven or timelines → `gsap-scrolltrigger` / `motion-framer`; spring physics → `react-spring-physics`.
- Do NOT use: Vue projects, Astro without React islands or vanilla (both libraries are React only); real 3D backgrounds → `threejs-webgl`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L18-91 (§Core Concepts: installation and structure) + `assets/README.md` |
| Hero with animated background (grid, particles, plasma, aurora) | L94-136 (§1 Magic UI backgrounds) and L358-427 (§7 React Bits WebGL) |
| Animated text, counters, dock, marquee | L137-171, L212-311, L312-357 |
| Integrate with shadcn/ui, Framer Motion, React Router | L429-567 (§Integration Patterns) |
| Debugging / performance | L568-642 (§Performance) and L643-797 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-17 | Overview | What each library is (150+ Magic UI, 90+ React Bits) |
| 18-91 | Core Concepts | Architecture, installation and component categories |
| 92-428 | Common Patterns | 7 patterns: GridPattern, BlurText, ShimmerButton/BorderBeam, Dock, CountUp, Marquee, Particles/Plasma/Aurora |
| 429-567 | Integration Patterns | shadcn/ui (`cn()`), Framer Motion, React Router, combining both libraries |
| 568-642 | Performance Optimization | CSS masks, fewer particles on mobile, lazy load, reduced motion |
| 643-797 | Common Pitfalls | Dependencies, CSS keyframes in globals.css, z-index, TS types, Tailwind content paths |
| 798-818 | Resources | Official links, scripts, references and assets |
| 819-824 | Related Skills | Alternative skills |

## Resources
- `references/magic_ui_components.md` — Magic UI catalog with props and usage examples.
- `references/react_bits_components.md` — React Bits catalog (text, interactive, backgrounds, layouts).
- `references/customization_guide.md` — customization through props, styles and composition in both libraries.
- `scripts/component_importer.py` — imports and adapts a component: `py -3 scripts/component_importer.py --library magicui --component grid-pattern` (or `--library reactbits`).
- `scripts/props_generator.py` — generates props configuration: `py -3 scripts/props_generator.py --component shimmer-button --format typescript`.
- `assets/README.md` — starter templates (Next.js + shadcn + Magic UI; Vite + React Bits) and section examples.

## Hard rules
- Install the real dependencies: Magic UI requires `motion clsx tailwind-merge` and the `cn()` helper in `lib/utils.ts`; React Bits WebGL components require `ogl`.
- After a manual Magic UI install, add the `@keyframes` (ripple, shimmer-slide, marquee) to `globals.css` or the animations are not applied.
- Respect `prefers-reduced-motion`: disable reveals and reduce particles; on mobile/low-end devices lower `numSquares`/`particleCount` or replace with a static background.
- Backgrounds always `absolute inset-0 -z-10` and content `relative z-10`; do not stack several WebGL effects in the same view.
- Load heavy components with `React.lazy` and client-only (`"use client"` / `dynamic(..., { ssr: false })` in Next.js): they use `window` and WebGL.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). It only applies to React/Next.js with Tailwind (Magic UI also requires shadcn/ui).
- If the stack is Vue, Astro without React or vanilla, do not use this skill: use `gsap-scrolltrigger`, `scroll-reveal-libraries` or `lightweight-3d-effects` to achieve equivalent effects.
