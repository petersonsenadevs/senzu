---
name: animejs
description: "DOM/CSS/SVG animations with Anime.js: timelines with offsets, stagger (grid, from center), SVG path drawing and morphing, keyframes, spring/steps easings. Not for complex scroll-driven animation (gsap-scrolltrigger) or React (motion-framer)."
origen: core/skills-overlay/animejs/SKILL.md
huella: d2980211772a
---

# animejs (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (525 lines). **Do not read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: choreographed sequences with `anime.timeline()`, staggered reveals with `anime.stagger()`, SVG path animation (line drawing, morphing, motion path).
- Use: vanilla/Vue/Astro projects where bundle size matters (~9 KB) and you do not want a React dependency.
- Do NOT use: scroll-driven experiences, pin, scrub → `gsap-scrolltrigger`; declarative animation with gestures in React → `motion-framer`; spring physics in React → `react-spring-physics`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L30-135 (§Core Concepts) + `assets/README.md` (Vite vanilla + `npm i animejs`) |
| Stagger / grid reveal | L138-165 (§1-2) + `references/stagger_guide.md` |
| SVG (line, morph, follow path) | L166-193, L293-308 + `scripts/animation_generator.py --type svg-morph` |
| Hero/modal/menu timeline | L194-218, L111-135 + `references/timeline_guide.md` or `scripts/timeline_builder.py --preset hero` |
| Advanced easings and playback control | L309-371 (§Advanced Techniques) |
| Integrate in React/Vue | L253-292 (§Integration Patterns) |
| Debug / performance | L372-424 (§Performance) + L425-500 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 10-29 | Overview | When to use and key features |
| 30-135 | Core Concepts | Basic `anime()` (32), targets (48), animatable CSS/SVG/object properties (67), timeline (111) |
| 136-252 | Common Patterns | Stagger (138), stagger from center (151), SVG line (166), morph (178), timeline (194), keyframes (219), manual scroll (236) |
| 253-308 | Integration Patterns | React with cleanup (255), Vue `mounted` (279), motion path (293) |
| 309-371 | Advanced Techniques | Spring/steps/bezier easing, direction/loop, play/pause/seek |
| 372-424 | Performance Optimization | Only transform/opacity, batching targets, `will-change`, `autoplay:false` |
| 425-500 | Common Pitfalls | Units, `transform` as a string, cleanup, too many elements, timeline offsets, infinite loops |
| 501-525 | Resources / Related Skills | Scripts, references and comparison with GSAP/Framer |

## Resources
- `references/api_reference.md` — full Anime.js v3 API (parameters, callbacks, helpers).
- `references/stagger_guide.md` — `anime.stagger()`: grid, from, axis, easing, ranges.
- `references/timeline_guide.md` — sequences, relative/absolute offsets, timeline control.
- `scripts/animation_generator.py` — boilerplate for 8 types (basic, stagger, grid-stagger, svg-line, svg-morph, timeline, keyframe, scroll): `py -3 scripts/animation_generator.py --type stagger` (Linux/mac: `python3 …`).
- `scripts/timeline_builder.py` — presets hero/modal/cards/loader/page/toast/menu: `py -3 scripts/timeline_builder.py --preset modal`.
- `assets/README.md` — only starter instructions with Vite and links to official examples (there is no real `starter_animejs/` folder despite what upstream says).

## Hard rules
- Animate only `translateX/Y`, `scale`, `rotate`, `opacity`; never `left/top/width` or the `transform` string.
- One `anime()` call with several targets, not a loop of calls; for more than 200 elements use CSS animations.
- In React/Vue keep the instance and call `pause()` in the effect cleanup/`unmounted`.
- Timeline offsets always with `'-=500'`/`'+=200'`; a number without an operator is absolute time.
- No infinite `loop: true` by default; respect `prefers-reduced-motion` (jump to the final state with `seek(duration)` or do not animate).

## Integration with the project's stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). It is framework-agnostic: vanilla and Astro (in a client `<script>` or `client:*`), Vue (`onMounted`/`onUnmounted`), React (`useEffect` with cleanup, L255-278).
- SSR-safe only if imported and executed on the client; in Next/Nuxt/Astro do not call `anime()` in server modules.
