---
name: rive-interactive
description: "Rive animations (.riv) with state machines, inputs (boolean/number/trigger), ViewModel data binding and events in React (rive-react): buttons, toggles, loaders, interactive UI. Not for simple timelines (use lottie-animations)."
origen: core/skills-overlay/rive-interactive/SKILL.md
huella: 89b049d3c6d2
---

# rive-interactive (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (586 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: animated components with state logic (hover/pressed/loading) controlled from code through state machine inputs.
- Use: bind app data (text, numbers, colors, enums) to the animation with ViewModels, or react to events emitted from Rive.
- Use: integrate a `.riv` file delivered by design into React, with preloading and control through refs.
- Do NOT use: timeline animations without interactivity (simple loaders, icons) → lottie-animations.
- Do NOT use: layout/gesture animation in React → motion-framer; scroll → gsap-scrolltrigger; 3D → spline-interactive.

## Minimal reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L34-101 (§Core Concepts + Pattern 1) + `assets/README.md` |
| Control states with inputs (hover, click, progress) | L102-150 (§Pattern 2) |
| Data binding with ViewModels | L151-213 (§Pattern 3) + L343-381 (§Pattern 7) + `references/api_reference.md` |
| Events from the animation / control through refs / preloading | L214-342 (§Pattern 4, 5, 6) |
| Combine with Framer Motion or ScrollTrigger | L382-448 (§Integration Patterns) |
| Debugging / performance | L449-483 (§Performance Optimization) + L484-546 (§Common Pitfalls and Solutions) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-33 | Overview | What Rive offers compared to Lottie/Framer/GSAP and when to use it |
| 34-66 | Core Concepts | State Machines (36), Inputs (44), ViewModels (51), Events (61) |
| 67-381 | Common Patterns | Basic (69), inputs (102), ViewModel (151), events (214), useRiveFile preloading (262), refs/useImperativeHandle (294), multi-property (343) |
| 382-448 | Integration Patterns | With Framer Motion (384) and with GSAP ScrollTrigger (409) |
| 449-483 | Performance Optimization | useOffscreenRenderer, optimizing .riv, preloading, automaticallyHandleEvents |
| 484-546 | Common Pitfalls and Solutions | Null input (486), ViewModel not updating because of autoBind (504), events not firing (525) |
| 547-569 | Resources / Related Skills | Official docs, editor, tutorials and related skills |
| 570-586 | Scripts / Assets | Index of scripts and assets (note: `starter_rive/` and `examples/` don't exist in this copy) |

## Resources
- `references/api_reference.md` — rive-react API: useRive, useStateMachineInput, ViewModel hooks, events, layout and props.
- `scripts/component_generator.py` — Prints a Rive React component template (interactive mode): `py -3 scripts/component_generator.py`.
- `scripts/viewmodel_builder.py` — Prints a ViewModel bindings template (interactive mode): `py -3 scripts/viewmodel_builder.py`.
- `assets/README.md` — Quick start and basic usage examples with `rive-react` (the only asset present).

## Hard rules
- State machine and input names must match the Rive editor exactly; check `if (input)` before using them (they can be null until loaded).
- For manual ViewModels use `autoBind: false` in `useRive`; to receive events, `automaticallyHandleEvents: true` and clean up with `rive.off(...)` in the cleanup.
- ViewModel colors as a number (`parseInt(hex.substring(1), 16)`), not a string.
- Performance: `useOffscreenRenderer`, preload with `useRiveFile`, artboards < 2 MB, vectors instead of raster, few bones and simple state machines.
- Respect `prefers-reduced-motion`: pause or show a static final state (project rule, not upstream).

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json).
- The upstream is React only (`rive-react`). For Vue, Astro or vanilla use `@rive-app/canvas` (same concepts: `new Rive({ src, stateMachines, autoplay })`, `stateMachineInputs()`), always client only (SSR-safe: `useEffect` / `client:only`).
