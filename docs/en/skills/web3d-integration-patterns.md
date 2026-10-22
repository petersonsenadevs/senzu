---
name: web3d-integration-patterns
description: "Architecture meta-skill for combining Three.js, GSAP ScrollTrigger, React Three Fiber, Motion and React Spring: layers, state (Zustand), on-demand rendering, conflicts between libraries. Not for the API of a single library (use its skill)."
origen: core/skills-overlay/web3d-integration-patterns/SKILL.md
huella: d379d2721910
---

# web3d-integration-patterns (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (852 lines). **Do not read it whole**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: deciding which combination of 3D + animation libraries to use for a specific experience (decision matrix).
- Use: designing the architecture of an app that mixes Three.js/R3F with GSAP, Motion or React Spring, and sharing state between the 3D scene and the UI.
- Use: solving animation conflicts, memory leaks or unnecessary renders in multi-library stacks.
- Do NOT use: API questions about a single library → threejs-webgl, gsap-scrolltrigger, react-three-fiber, motion-framer, react-spring-physics.
- Do NOT use: no-code visual scenes → spline-interactive; game engines → babylonjs-engine / playcanvas-engine.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L792-806 (§Decision Matrix) and then the chosen pattern (L30-427) |
| Landing with scroll-driven 3D (vanilla + GSAP) | L30-208 (§Pattern 1) + L431-501 (§1. Scroll-Driven Camera Movement) |
| React app with declarative 3D and gestures | L210-327 (§Pattern 2) + L503-528 (§2. Gesture-Driven) |
| Shared scene/UI state | L530-598 (§3. State-Synchronized) + L601-653 (§State Management Strategies) |
| Debugging / performance | L655-724 (§Performance Optimization) + L726-790 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-27 | Overview | When it applies and the 5 library combinations covered |
| 30-208 | Pattern 1: Layered Separation (Three.js + GSAP + React UI) | 3D / animation / UI layers, full scene and ScrollTrigger code |
| 210-327 | Pattern 2: Unified React Component (React Three Fiber + Motion) | R3F Canvas + `framer-motion-3d` for declarative 3D |
| 329-376 | Pattern 3: Hybrid Approach (R3F + GSAP Timelines) | GSAP timelines over R3F refs with cleanup in `useEffect` |
| 378-427 | Pattern 4: Physics-Based 3D (R3F + React Spring) | `@react-spring/three`, `useSpring` + `animated('mesh')` |
| 429-598 | Common Integration Patterns | Scroll-driven camera (GSAP and Drei `ScrollControls`), drag with Motion 3D, Zustand + GSAP |
| 601-653 | State Management Strategies | Global Zustand store for camera, objects and selection |
| 655-724 | Performance Optimization | Conditional rendering in a custom loop; `frameloop="demand"` + `invalidate()` in R3F |
| 726-790 | Common Pitfalls | Animation conflicts, state desync, leaks from tweens without `kill()` |
| 792-806 | Decision Matrix | Table use case → recommended stack |
| 808-852 | Resources / Related Skills | Announced resources (not included) and base skills to refer to |

## Resources
- No additional resources; everything is in `SKILL.upstream.md`. The `references/`, `scripts/` and `assets/` mentioned in L808-824 do NOT exist in the installed package.

## Hard rules
- A single library per animated property: never GSAP and React Spring (or Motion) on the same `position`/`scale`.
- Every animation created in `useEffect` is cleaned up in the return (`tween.kill()`, `tl.kill()`, `ScrollTrigger.kill()`); dispose of the Three.js scene on unmount.
- On-demand rendering: `frameloop="demand"` + `invalidate()` in R3F, or a `needsRender` flag in a custom loop; `dpr` limited to `[1, 2]`.
- Shared scene/UI state in a store (Zustand) or refs; never mutate Three.js without reflecting it in React when the UI depends on it.
- Respect `prefers-reduced-motion`: disable scrubs and automatic camera animations if the user asks for it.

## Integration with the project's stack
- Detect the stack as described in the `front-activation`/`skill-router` skill (senzu/senzu.json → package.json). Patterns 2-4 require React (R3F, Motion 3D, React Spring); in vanilla, Vue or Astro use pattern 1 (Three.js + GSAP with the framework's UI layer) and refer to threejs-webgl and gsap-scrolltrigger.
