---
name: babylonjs-engine
description: "Babylon.js 7 3D engine: WebGL/WebGPU scenes, cameras, lights, PBR, glTF, Havok physics, shadows, GUI, WebXR, browser games. Triggers: Babylon, @babylonjs/core, Havok. Not for Three.js/R3F or lightweight 3D effects."
origen: core/skills-overlay/babylonjs-engine/SKILL.md
huella: 0b4c13839a16
---

# babylonjs-engine (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (1233 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: the project already uses `@babylonjs/core` or asks for a 3D game/visualization with physics (Havok), integrated 2D GUI, WebXR or Node Material.
- Use: load glTF/GLB models with PBR, shadows and post-processing in your own canvas.
- Do NOT use: if the project uses Three.js or React Three Fiber → `threejs-webgl` / `react-three-fiber`; lightweight 3D decoration (tilt, Zdog, Vanta) → `lightweight-3d-effects`.
- Do NOT use: scenes exported from Spline or PlayCanvas → `spline-interactive` / `playcanvas-engine`.

## Minimal reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L16-84 (§1 Engine and Scene Initialization) + `assets/starter_babylon/` (Vite) |
| Cameras, lights, materials, loading glTF | L85-188, L299-367, L368-424 |
| Havok physics / animations | L425-493 (§7 Physics), L494-569 (§8 Animations) |
| Post-processing, GUI, shadows, particles | L652-768 (Patterns 4-7) |
| Integrate in React / WebXR | L771-825, L826-863 |
| Debugging / performance | L884-997 (§Performance), L998-1134 (§Pitfalls), L1200-1222 (§Debugging) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-13 | Related Skills | Alternatives (threejs, r3f, gsap, motion) |
| 16-84 | 1. Engine and Scene Initialization (§Core Concepts 14-569) | Engine, Scene, render loop, resize, ES6/TS setup |
| 85-132 | 2. Camera Systems | FreeCamera, ArcRotateCamera (orbit + limits), UniversalCamera |
| 133-188 | 3. Lighting Systems | Hemispheric, Directional, Point, Spot, includedOnlyMeshes |
| 189-298 | 4. Mesh Creation | MeshBuilder, transformations, properties |
| 299-367 | 5. Materials | StandardMaterial, PBRMaterial, MultiMaterial |
| 368-424 | 6. Model Loading | SceneLoader (Append/ImportMeshAsync), AssetsManager |
| 425-493 | 7. Physics Engine | Havok, PhysicsAggregate, shapes, forces |
| 494-569 | 8. Animations | Animation, keyframes, AnimationGroup, skeletons |
| 570-768 | Common Patterns | Default environment, async loading, picking, post-processing, GUI, shadows, particles |
| 769-883 | Integration Patterns | React (useEffect + dispose), WebXR, Node Material |
| 884-997 | Performance Optimization | Merge/instances/thin instances, SceneOptimizer, hardware scaling, KTX2 textures |
| 998-1134 | Common Pitfalls | Leaks, draw calls, blocking the thread, attachControl, async, physics not enabled |
| 1135-1199 | Advanced Topics | Custom shaders, compute shaders (WebGPU), procedural textures |
| 1200-1233 | Debugging / Resources / Version Notes | Inspector, bounding boxes, FPS, SceneInstrumentation; links; based on Babylon.js 7.x |

## Resources
- `references/api_reference.md` — reference of Babylon.js 7.x classes, methods and properties.
- `scripts/scene_generator.py` — generates a base scene: `py -3 scripts/scene_generator.py --type basic|physics --camera arc-rotate --typescript --output scene.js` (or `--interactive`).
- `scripts/mesh_builder.py` — generates mesh code: `py -3 scripts/mesh_builder.py --shape sphere --params '{"size":2}' --output meshes.js`.
- `assets/starter_babylon/` — Vite starter (index.html, src/main.js, style.css, package.json); `assets/examples/README.md` — examples by topic (loading, PBR, physics, GUI, XR, performance).

## Hard rules
- Always release resources: `mesh.dispose()`, `scene.dispose()`, `engine.dispose()`; in React, in the `useEffect` cleanup together with the resize listener.
- Many copies of the same mesh → `createInstance` or thin instances, never one mesh per copy (one draw call each).
- Model loading and physics are async: use `ImportMeshAsync`/`await HavokPhysics()` and enable `scene.enablePhysics` before creating `PhysicsAggregate`.
- Call `camera.attachControl(canvas, true)`; without it the camera doesn't respond.
- Client only: Babylon touches `window`/canvas; in Next.js/Astro use client-only components or `dynamic(..., { ssr: false })`.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). Framework-agnostic library: vanilla/Vite (use the starter), React (pattern L771-825 with refs), Vue/Astro (same pattern in `onMounted`/`client:only`).
- If package.json already includes `three` or `@react-three/fiber`, don't introduce Babylon: use `threejs-webgl` / `react-three-fiber`.
