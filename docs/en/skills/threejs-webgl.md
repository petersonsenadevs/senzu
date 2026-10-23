---
name: threejs-webgl
description: "3D/WebGL with Three.js: GLB models, 3D heroes, configurators, particles, shaders, 3D scroll. TresJS (Vue/Inertia), R3F (Next), vanilla (Astro); assets, mobile performance, dispose, fallback. Not for charts, 2D or DOM animation (gsap)."
origen: core/skills-overlay/threejs-webgl/SKILL.md
huella: 0ab17cc107ef
---

# threejs-webgl (Senzu layer)

Upstream skill (English): `SKILL.upstream.md` (fundamentals, WebGPU, materials, post-processing, patterns),
`references/api_reference.md`, `references/materials_guide.md`, `references/optimization_checklist.md`,
`assets/starter_scene/`, `scripts/setup_scene.py`. Senzu layer (Senzu's own): `references/es/` and `templates/`.
For declarative React there is also the `react-three-fiber` skill; to combine 3D + GSAP + Motion, `web3d-integration-patterns`.

You build 3D that is **useful and fast**: it reinforces the product, loads in < 2 s, doesn't break LCP, works on mobile and degrades
gracefully without WebGL or with `prefers-reduced-motion`. Aesthetics and tone come from `senzu/design-system/*/MASTER.md`
(skill `ui-ux-pro-max`); scroll-bound motion is coordinated with `gsap-scrolltrigger`.

## 1. Detect the stack and integrate
| Stack (Senzu profile) | Integration | Reference | Templates |
|---|---|---|---|
| Vue 3 (SPA or Laravel + Inertia) | TresJS (`@tresjs/core` + `@tresjs/cientos`) | `references/es/tresjs-vue.md` | `templates/HeroScene.vue`, `HeroContent.vue`, `useWebGLSupport.ts` |
| Next.js / React | React Three Fiber + drei, `next/dynamic` `ssr:false` | `references/es/r3f-next.md` (+ skill `react-three-fiber`) | `templates/HeroScene.tsx` |
| Astro | vanilla class + `<script>` with View Transitions | `references/es/vanilla-astro.md` | `templates/scene.ts`, `scene-astro.ts`, `loading-overlay.html` |
| Vanilla / others | `Scene` class (init/resize/loop/dispose) | `SKILL.upstream.md`, `references/es/fundamentals.md` | `templates/scene.ts` |

Check the installed versions (`@tresjs/cientos` changed the `useGLTF` API; the names in `@tresjs/post-processing`
depend on the release): read `node_modules/@tresjs/*/dist/*.d.ts` if in doubt. Don't invent APIs.

## 1b. Minimum reading per task
| Task | Read only |
|---|---|
| 3D hero with a GLB model | your stack's Senzu-layer reference (§setup + §GLTF) + template `HeroScene.*` + `references/es/assets-loaders.md` §optimize |
| Product configurator | your stack's Senzu-layer reference + `references/es/fundamentals.md` §materials/lights |
| Particles / shader / image distortion | `references/es/shaders-basics.md` (the effect's section) |
| Scroll-driven 3D | `references/es/gsap-three.md` |
| It's slow / uses too much memory | `references/es/performance.md` §budget + §dispose |
| It looks washed out, black or doesn't show | `references/es/pitfalls.md` (Grep for the symptom) |
| A specific Three.js API | upstream `references/api_reference.md` (Grep) or `SKILL.upstream.md` by section |

## 2. Flow
1. **Goal and budget**: what the 3D adds, target device, asset weight (hero ≤ 2 MB, textures ≤ 2048 px,
   draw calls < 100 on mobile), acceptable load time.
2. **Asset** (`references/es/assets-loaders.md`): GLB with transforms applied, `gltf-transform optimize in.glb out.glb
   --texture-compress webp` (+ Draco/Meshopt), checked in a viewer; in `public/models/`.
3. **Correct renderer**: `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`,
   `setPixelRatio(Math.min(devicePixelRatio, 2))`, shadows only if they add something.
4. **Progressive loading**: lazy canvas (`defineAsyncComponent` / `next/dynamic` / `client:visible`), accessible progress
   overlay, static placeholder that keeps the LCP.
5. **Interaction**: `Raycaster` or TresJS/R3F events; `OrbitControls` with damping and limits; no wheel zoom on heroes.
6. **Performance and cleanup** (`references/es/performance.md`): pause outside the viewport and when the tab is hidden;
   `dispose()` geometries/materials/textures/renderer on unmount (SPAs navigate without reloading).
7. **Fallbacks**: no WebGL → image/video; reduced-motion → static scene; `webglcontextlost` handled.
8. **Verify**: FPS ≥ 50 on a mid-range phone (4x CPU), stable memory after navigating 5 times, clean console, Lighthouse ≥ 85.

## 3. Hard rules
- No Three.js in SSR: import only on the client. A single `WebGLRenderer` per page.
- Always `dispose` on unmount. Pixel ratio ≤ 2 (1.5 on mobile if needed).
- Correct color space (`texture.colorSpace = SRGBColorSpace` only on color maps).
- No models > 5 MB without approval; KTX2/WebP textures, Draco/Meshopt geometry.
- 3D doesn't block content: text and CTA are accessible HTML on top of the canvas.
- No `Stats`, Leva, helpers or `markers` in production.
- Frequent errors and their fix: `references/es/pitfalls.md` (40 cases).

## 4. Quick decisions
| Need | Solution |
|---|---|
| Hero with a model that rotates and follows the mouse | TresJS/R3F + `useGLTF` + loop with lerp towards the pointer |
| Configurable product | One GLB, `material.color.set(token)`, `Environment` HDRI, `ContactShadows` |
| Scroll-driven 3D (camera by sections) | GSAP timeline with labels + ScrollTrigger `scrub` (`references/es/gsap-three.md`) |
| Lightweight particle background | `Points` + shader (`references/es/shaders-basics.md`), ≤ 20k points on mobile |
| Image distortion on hover | plane + `ShaderMaterial` with `uHover`/`uTime` |
| Scene made in Spline | export GLB and integrate it here (avoids the Spline runtime) — see skill `spline-interactive` |
| Many copies of the same object | `InstancedMesh` |
| Realistic glass/reflections | `MeshPhysicalMaterial` + `transmission` + `Environment` (desktop only) |

## 5. Expected output
Before the code: goal, budget, chosen integration, fallback and cleanup. Then: code + asset
optimization steps + verification (FPS, memory, console).
