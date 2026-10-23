---
name: react-spring-physics
description: "Spring physics in React with @react-spring/web (useSpring, useTrail, useTransition, useScroll, useInView) and Popmotion (inertia). Gestures, drag with momentum, enter/exit lists. React only; not for vanilla/Vue or timelines."
origen: core/skills-overlay/react-spring-physics/SKILL.md
huella: b922900bf004
---

# react-spring-physics (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (464 lines). **Do not read it whole**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: natural, interruptible motion in React (mass/tension/friction), drag/swipe with velocity preservation, inertia and snap to grid.
- Use: list transitions (`useTransition`), cascades (`useTrail`), reveal by viewport (`useInView`) or scroll (`useScroll`), animating react-three-fiber props with `@react-spring/three`.
- Do NOT use: vanilla, Vue or Astro project without React → `animejs` (easing `spring(...)`) or `gsap-scrolltrigger`; timeline/scrub choreography → `gsap-scrolltrigger`; declarative variants with gestures → `motion-framer`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L26-97 (§Core Concepts) + `assets/README.md` (Vite react + `npm i @react-spring/web`) |
| Click / hover / trail / lists | L100-176 (§1-3) or `scripts/spring_generator.py --type transition` |
| Scroll / viewport / async chains | L177-236 (§4-6) |
| Drag with momentum / Popmotion inertia | L237-259 (§7) + L290-312 + `references/popmotion_api.md` |
| Tune the feel of the spring | L75-97 (presets) + `scripts/physics_calculator.py --feel bouncy` + `references/physics_guide.md` |
| Integrate with react-three-fiber / forms | L262-330 (§Integration Patterns) |
| Debugging / performance | L331-367 (§Performance) + L368-441 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 10-25 | Overview | When to use; packages `@react-spring/web`, `/three`, `popmotion` |
| 26-97 | Core Concepts | Spring physics (28), `useSpring` patterns object vs function+api (50), `config.*` presets (75) |
| 98-259 | Common Patterns | Click (100), trail (131), list transitions (155), scroll (177), inView (198), async chains (216), preserved velocity (237) |
| 260-330 | Integration Patterns | react-three-fiber (262), Popmotion `inertia` (290), shake on form validation (313) |
| 331-367 | Performance Optimization | `precision`, batched `useSprings`, `Globals.skipAnimation` |
| 368-441 | Common Pitfalls | `useSpring` deps, mutating values, precision, velocity, mixing patterns, non-numeric strings |
| 442-464 | Resources / Related Skills | Scripts, references, physics vs timeline |

## Resources
- `references/react_spring_api.md` — hooks, `animated`, `.to()` interpolation, `api.start/stop`, events.
- `references/popmotion_api.md` — Popmotion `spring`, `inertia`, `decay`, keyframes and streams.
- `references/physics_guide.md` — mass/tension/friction, critical damping, tuning table.
- `scripts/spring_generator.py` — click/scroll/trail/transition/inview/chain/gesture boilerplate: `py -3 scripts/spring_generator.py --type gesture` (Linux/mac: `python3 …`).
- `scripts/physics_calculator.py` — computes parameters by feel or by critical damping: `py -3 scripts/physics_calculator.py --feel bouncy` / `--critical-damping --tension 170`.
- `assets/README.md` — only Vite starter instructions and official links (there is no real `starter_spring/` folder despite what upstream says).

## Hard rules
- `useSpring(() => ({...}), [])` with a deps array, and use `api.start()`; never `springs.x.set()` nor recreate the spring on every render.
- Animate individual numeric values (`x`, `rotation`) and compose the `transform` with `.to()`; do not pass composite strings.
- When interrupting an animation, pass `velocity: springs.x.getVelocity()` so momentum is not cut.
- Set `config.precision` (e.g. 0.01) and group with `useSprings`/`useTrail` to avoid unnecessary renders.
- Respect `prefers-reduced-motion` with `Globals.assign({ skipAnimation: true })` (L356-367).

## Integration with the project's stack
- Detect the stack as described in the `front-activation`/`skill-router` skill (senzu/senzu.json → package.json). **React-only** library (also Next/Remix/Astro with React islands); hooks run on the client and `useScroll`/`useInView` require `window`, so under SSR wrap them in client-only components.
- If the project is Vue, Svelte or vanilla, do not install it: use `animejs` (spring easing) or `gsap-scrolltrigger`; for 3D in React combine with `react-three-fiber` via `@react-spring/three`.
