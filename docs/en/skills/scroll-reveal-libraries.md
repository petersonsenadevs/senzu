---
name: scroll-reveal-libraries
description: "Scroll reveals with AOS (Animate On Scroll): data-aos, fade/slide/zoom/flip on landings, marketing and blogs, with React/Vue/Next. Not for timelines, scrub or parallax (gsap-scrolltrigger, locomotive-scroll) or physics."
origen: core/skills-overlay/scroll-reveal-libraries/SKILL.md
huella: c212a7d5c6d6
---

# scroll-reveal-libraries (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (820 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT to
- Use: landings, marketing pages or content sites that only need elements to appear/slide/zoom when entering the viewport.
- Use: when someone asks for "AOS", "data-aos", "animate on scroll", "reveal on scroll" or a quick prototype without animation JS.
- Use: card grids, testimonials or alternating sections with a staggered delay via `data-aos-delay`.
- Do NOT use: timelines, pin, scrub or scroll-synced animation → `gsap-scrolltrigger`; smooth scroll and parallax → `locomotive-scroll`.
- Do NOT use: physics- or gesture-based animation in React → `motion-framer` / `react-spring-physics`; ready-made animated React components → `animated-component-libraries`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L31-120 (§Core Concepts) + `assets/README.md` (CDN/React/Next/Vue templates) |
| Build hero, cards, alternating sections, gallery | L122-348 (§Common Patterns) + L697-732 (§Built-in Animations) |
| Integrate into React, Vue or Next.js | L350-529 (§Integration Patterns) |
| Create a custom animation | L734-768 (§Custom Animations) |
| Debugging / performance | L531-591 (§Performance Optimization) + L593-695 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-30 | Overview | What AOS is, when to use it and when not |
| 31-120 | Core Concepts | CDN/npm install, `data-aos`, `AOS.init` and per-element overrides |
| 122-348 | Common Patterns | Hero, features grid, alternating sections, testimonials, anchor, chain, gallery |
| 350-529 | Integration Patterns | React (init, refresh on routes, wrapper), Vue (`mounted`/`updated`), Next.js `_app` |
| 531-591 | Performance Optimization | `disable` on mobile, `once`, throttle/debounce, MutationObserver, `requestIdleCallback` |
| 593-695 | Common Pitfalls | `refresh()` after DOM changes, React, jank, CSS conflicts, anchor placement, 3000 ms limit |
| 697-732 | Built-in Animations | List of fade, slide, zoom and flip |
| 734-768 | Custom Animations | Define `[data-aos="x"]` and `.aos-animate` in CSS |
| 770-794 | Comparison with Alternatives | AOS vs GSAP ScrollTrigger table |
| 796-820 | Resources / Related Skills | Official links and related skills |

## Resources
- `references/aos_api.md` — Full reference: `AOS.init` options, methods (`refresh`, `refreshHard`), `data-aos-*` attributes and events.
- `references/animation_catalog.md` — Catalog of the 50+ built-in animations with a description of each.
- `scripts/aos_generator.py` — Generates boilerplate HTML with AOS: `py -3 scripts/aos_generator.py --list` / `--template <nombre> --output out.html` (or `python3`).
- `scripts/config_builder.py` — Generates the `AOS.init` configuration: `py -3 scripts/config_builder.py --list-presets` / `--preset <p> --format modern|cdn|react [--once true ...]`.
- `assets/README.md` — Ready-made templates (minimal CDN, React, Next.js, Vue), patterns, performance and accessibility. `assets/starter_aos/` and `references/integration_patterns.md` do not exist, even though upstream cites them.

## Hard rules
- Call `AOS.refresh()` (or `refreshHard()`) after adding elements to the DOM or changing route; in React initialize in `useEffect`, never in render.
- Use `once: true` and `disable` on mobile (`< 768px`) on pages with many elements; avoid `mirror` unless really needed.
- Respect `prefers-reduced-motion`: use `disable: () => matchMedia('(prefers-reduced-motion: reduce)').matches` (see `assets/README.md`, accessibility section).
- Don't put `opacity`/`transform` with `!important` on `[data-aos]` elements; it breaks the animation.
- `duration`/`delay` max 3000 ms; for more, your own CSS (L678-695). Prefer fades over flips for performance.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill says (senzu/senzu.json → package.json). Framework-agnostic library: vanilla (CDN or npm), React/Next (init in `useEffect`, L352-455 and L497-529), Vue (`mounted` + `updated`, L457-495), Astro (client script or `client:load`). It touches `window`, so initialize only on the client (SSR-safe).
