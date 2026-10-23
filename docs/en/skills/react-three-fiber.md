---
name: react-three-fiber
description: "Declarative 3D in React with React Three Fiber + drei: Canvas, useFrame, useGLTF, Environment, ScrollControls. USE IT in Next.js/React for 3D heroes, configurators, scenes. Not for Vue (TresJS in threejs-webgl) or Astro without React."
origen: core/skills-overlay/react-three-fiber/SKILL.md
huella: 434798b34bbb
---

# react-three-fiber (Senzu layer)

Upstream skill (English): `SKILL.upstream.md` (concepts, 7 patterns, drei, integrations, performance, pitfalls),
`references/api_reference.md` (Canvas, hooks, events, drei, 928 lines), `assets/starter_r3f/`, `assets/examples/`,
`scripts/component_generator.py`, `scripts/scene_setup.py`. Senzu's own layer: `references/es/next.md`.
Three.js fundamentals, assets, shaders and performance: skill `threejs-webgl` (`references/es/*`); 3D scroll with GSAP:
`threejs-webgl/references/es/gsap-three.md`.

R3F turns Three.js into components: `<mesh>`, `<boxGeometry>`, `<meshStandardMaterial>` are Three classes
instantiated by the reconciler. Aesthetics and budget (weight, FPS, LCP) come from `senzu/design-system/*/MASTER.md`
(skill `ui-ux-pro-max`) and from §2 of `threejs-webgl/SKILL.md`.

## 1. When to use / when not
| Situation | Skill |
|---|---|
| Next.js / React / Astro with a React island: 3D scene with state, events, hooks | **react-three-fiber** |
| Vue 3 (SPA or Laravel + Inertia) | `threejs-webgl` → TresJS (`threejs-webgl/references/es/tresjs-vue.md`) |
| Astro without React, vanilla, Laravel Blade | `threejs-webgl` → `Scene` class (`threejs-webgl/references/es/vanilla-astro.md`) |
| Light 2D effect (tilt, CSS particles, image distortion) | `lightweight-3d-effects` |
| Scene exported from Spline | `spline-interactive` (or export GLB and load it here) |

## 2. Minimum reading per task (`SKILL.upstream.md`)
| Task | Lines |
|---|---|
| First scene: `<Canvas>`, declarative objects, lights | 33-89, 226-255, 345-377 |
| Per-frame animation (`useFrame`, delta, refs) | 90-126, 279-305 |
| Access to camera/gl/viewport (`useThree`) | 127-158 |
| Load GLB/textures (`useLoader`, `useGLTF`, `Suspense`) | 159-223, 306-344, 546-560 |
| Click/hover on objects | 256-278 |
| Many copies (instancing) and groups | 378-472, 739-771 |
| drei: OrbitControls, Environment, Text, Html, Center/Bounds | 473-597 |
| Scroll inside the canvas (`ScrollControls`) | 598-633 |
| GSAP, Motion, Zustand with R3F | 634-716 |
| Performance: `frameloop="demand"`, culling, LOD, `PerformanceMonitor` | 717-839 |
| Common mistakes (setState in useFrame, dispose, objects in render…) | 840-976 |
| `<Canvas>` props and events (`ThreeEvent`) | `references/api_reference.md` 17-115, 450-562 |
| drei performance helpers (`AdaptiveDpr`, `Preload`) | `references/api_reference.md` 875-922 |

## 3. Integration with Senzu profiles
| Profile | How | Critical points |
|---|---|---|
| Next.js App Router | `npm i three @react-three/fiber @react-three/drei` (+ `@types/three`); scene in `components/three/*.tsx` with `"use client"`; mounted with `next/dynamic(() => import(...), { ssr: false, loading })` from a Client Component | `Suspense` with an accessible fallback; `useGLTF.preload('/models/x.glb')`; models in `public/models/` optimized with `gltf-transform`; text and CTA in HTML on top of the canvas. Details: `references/es/next.md`. |
| Astro + React island | R3F component with `client:visible` or `client:only="react"` | A single React runtime; View Transitions unmount → automatic R3F dispose. |
| Vue / Inertia | Does not apply | `threejs-webgl/references/es/tresjs-vue.md` (same declarative philosophy with TresJS + cientos). |
| GSAP / Motion | `useGSAP` on Three refs (`ref.current.rotation`) or `useMotionValue` read in `useFrame` | Never two systems animating the same property. |

## 4. Hard rules
- R3F **disposes automatically** of geometries/materials when the JSX unmounts; whatever is created by hand (`new THREE.*` in
  `useMemo`, render targets, shared `useLoader` textures) is released in the effect cleanup or with `dispose={null}` if intentional.
- No DOM or `setState` inside `useFrame`: mutate refs; React state only for discrete changes (upstream 842-861).
- Do not create objects or vectors in render: `useMemo` / reused refs (upstream 862-879).
- `dpr={[1, 2]}` always (1.5 max on mobile if FPS drops; drei's `AdaptiveDpr` to degrade automatically).
- `frameloop="demand"` + `invalidate()` when the scene is static or only changes through interaction (configurators,
  viewers); `"always"` only with continuous animation; pause outside the viewport (`useInView` / `IntersectionObserver`).
- Mandatory fallback: no WebGL → static image/video that keeps the LCP; `prefers-reduced-motion` → still
  scene without auto-rotation; `webglcontextlost` handled.
- A single `<Canvas>` per page (several views → drei `View`). No `Stats`, Leva or `r3f-perf` in production.
- Color and tone: `gl={{ toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}`; color textures
  with `colorSpace = SRGBColorSpace`, the rest linear. Hero ≤ 2 MB, textures ≤ 2048 px, < 100 draw calls on mobile.

## 5. Quick decisions
| Need | Solution |
|---|---|
| Hero with a model that follows the mouse | `useGLTF` + `useFrame` with lerp towards `state.pointer`; `Environment preset` + `ContactShadows` |
| Product configurator | State in Zustand; `material.color.set()` in an effect; `frameloop="demand"` + `invalidate()` |
| 3D gallery/carousel with scroll | drei `ScrollControls` + `useScroll` if the scroll lives in the canvas; GSAP ScrollTrigger if it is page scroll |
| Thousands of particles/objects | `<instancedMesh>` + temporary `Object3D` for matrices, or `Points` + shader |
| 3D text | drei `Text` (SDF, light) or `Text3D` only with an optimized JSON font |
| Anchored HTML labels | drei `Html` with `occlude` and `distanceFactor` |
| Glow/bloom | `@react-three/postprocessing` `EffectComposer` + `Bloom`; disable on mobile |
| Load while showing a placeholder | `Suspense` + drei `useProgress` in an accessible overlay (`role="status"`) |

## 6. Expected output
Before the code: goal, budget (weight/FPS), how it mounts in Next (dynamic/Suspense), fallback and cleanup.
After: code + asset optimization steps + verification (FPS ≥ 50 on an average phone, stable memory, clean console).
