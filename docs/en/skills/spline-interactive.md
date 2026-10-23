---
name: spline-interactive
description: "Integrates Spline scenes (no-code visual 3D editor) into React/Next.js: @splinetool/react-spline, onSpline* events, emitEvent, findObjectByName, lazy load, SSR. Not for code-built 3D (threejs-webgl, react-three-fiber) or games."
origen: core/skills-overlay/spline-interactive/SKILL.md
huella: c5872dd6031e
---

# spline-interactive (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (756 lines). **Do not read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: embed a `.splinecode` scene designed in Spline in React/Next.js (3D hero, configurator, product showcase).
- Use: react to clicks/hover on Spline objects, trigger state-based animations from code (`emitEvent`) or move objects (`findObjectByName`).
- Use: export from Spline to GLTF/GLB to reuse in Three.js.
- Do NOT use: 3D scenes built in code or with full control of the render → threejs-webgl / react-three-fiber; games with physics → babylonjs-engine.
- Do NOT use: general DOM or UI animation → gsap-scrolltrigger / motion-framer.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L79-105 (§Pattern 1) + `scripts/project_generator.py` |
| Events and object control from React | L107-280 (§Pattern 2-4) + `references/api_reference.md` |
| Next.js / SSR / hydration | L282-306 (§Pattern 5) + L686-705 (§Pitfall 6) |
| Scroll or animated UI around the scene | L444-502 (§With GSAP, §With Framer Motion) |
| Debug / performance | L504-566 (§Performance Optimization) + L568-705 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-33 | Overview | What Spline is, when to use it and alternatives |
| 34-76 | Core Concepts | Scene, components, states, events, export options |
| 77-105 | Pattern 1: Basic React Integration | Installation and the `<Spline scene=...>` component |
| 107-155 | Pattern 2: Event Handling and Object Interaction | `onSplineMouseDown/Hover/...` props and full list of handlers |
| 156-225 | Pattern 3: Programmatic Object Control | `onLoad`, `findObjectByName/ById`, position/rotation/scale/material |
| 226-281 | Pattern 4: Triggering Spline Animations | `emitEvent` / `emitEventReverse` and event types |
| 282-307 | Pattern 5: Next.js Integration with SSR | Import `@splinetool/react-spline/next` |
| 308-341 | Pattern 6: Lazy Loading for Performance | `React.lazy` + `Suspense` |
| 342-423 | Pattern 7: Responsive Spline Scenes | Alternative mobile scene or `setZoom` + camera |
| 424-503 | Integration Patterns | GLTF to Three.js, ScrollTrigger with `emitEvent`, container with Motion |
| 504-567 | Performance Optimization | `renderOnDemand`, optimizing in the editor, prefetch, mobile |
| 568-706 | Common Pitfalls and Solutions | Scene does not load, lost refs, events, Next.js hydration |
| 707-739 | Resources / Related Skills | Official links, export formats, related skills |
| 740-756 | Scripts / Assets | Description of the package's scripts and assets |

## Resources
- `references/api_reference.md` — runtime and React component API (props, events, app and object methods).
- `scripts/project_generator.py` — generates a React (or Next.js with `--nextjs`) project with Spline: `py -3 scripts/project_generator.py --name mi-app` (`python3` on Linux/macOS).
- `scripts/component_builder.py` — generates Spline component wrappers with events: `py -3 scripts/component_builder.py --name ProductViewer`.
- `assets/README.md` — explains how to use the generator; there is no real `starter_spline/` folder despite what upstream says.

## Hard rules
- The `scene` prop must be the full export URL (`https://prod.spline.design/.../scene.splinecode`) and the scene must be published.
- Keep the instance and the objects in `useRef`; call `emitEvent` only after `onLoad` (check an `isLoaded` state).
- Use the `onSpline*` handlers (not `onMouseDown`), and also configure the event in the editor's Events panel.
- In Next.js import from `@splinetool/react-spline/next` or use `dynamic(..., { ssr: false })` to avoid hydration errors.
- Keep `renderOnDemand`, lazy loading for heavy scenes and a mobile version (< 50k triangles, textures ≤ 512, no shadows).
- Respect `prefers-reduced-motion`: do not trigger automatic animations if the user asks for it.

## Integration with the project's stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). `@splinetool/react-spline` is React/Next.js only; in Vue, Astro or vanilla use `@splinetool/runtime` directly (`new Application(canvas).load(url)`) or the embedded Spline Viewer, with the same object and event API.
