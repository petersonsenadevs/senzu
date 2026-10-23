---
name: aframe-webxr
description: "Declarative 3D/VR/AR scenes in HTML with A-Frame (ECS on top of Three.js): WebXR, VR controllers, AR hit-test, 360 viewers, custom components. Not for fine-grained Three.js control (threejs-webgl) or React (react-three-fiber)."
origen: core/skills-overlay/aframe-webxr/SKILL.md
huella: d141ae33ee67
---

# aframe-webxr (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (1076 lines). **Do not read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: VR/AR experiences in the browser (WebXR) with little JavaScript, 3D prototypes with HTML primitives (`<a-box>`, `<a-sky>`).
- Use: 360 photo/video viewers, interaction with controllers/gaze/cursor, placing objects in AR with hit-test.
- Do NOT use: when you need imperative control of the renderer, shaders or post-processing → `threejs-webgl`; 3D scene inside a React tree → `react-three-fiber`.
- Do NOT use: full game engine with physics/editor → `babylonjs-engine` or `playcanvas-engine`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L17-78 (§Core Concepts: ECS and Scene Setup) + `assets/starter_aframe/` |
| VR controllers / grabbing objects | L277-341 (§Pattern 1) + `references/webxr_guide.md` |
| AR with hit-test | L403-457 (§Pattern 3) + `references/webxr_guide.md` |
| 360 gallery / skybox / GLTF models | L342-402, L576-671 (§Pattern 2, 6, 7) |
| Custom component / click-gaze interaction | L242-274 (§8) + L458-506 (§Pattern 4) or `scripts/component_builder.py` |
| Integrate with Three.js / GSAP / React | L672-770 (§Integration Patterns) |
| Debug / performance | L771-893 (§Performance) + L894-1061 (§Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-16 | When to Use This Skill | Use cases listed by the author |
| 17-274 | Core Concepts | ECS (19), scene (51), cameras/rig (79), lights (125), materials (151), animation (178), assets (211), custom components (242) |
| 275-671 | Common Patterns | VR controllers (277), 360 gallery (342), AR hit-test (403), mouse/gaze (458), dynamic scene (507), environment/skybox (576), GLTF (619) |
| 672-770 | Integration Patterns | Access to Three.js (674), GSAP (697), React with `useEffect` (731) |
| 771-893 | Performance Best Practices | `<a-assets>`, pooling, low-poly, draw calls, throttle `tick()`, `stats` |
| 894-1061 | Common Pitfalls and Solutions | Invisible entity, events without raycaster, FPS, z-fighting, mobile VR, CORS/loading |
| 1062-1076 | Resources / Related Skills | Official links and related skills |

## Resources
- `references/api_reference.md` — A-Frame 1.7 API: scene, entity, core components, primitives, systems.
- `references/components_library.md` — community components (environment, physics, locomotion, loaders, UI).
- `references/webxr_guide.md` — VR/AR setup, controllers, hand tracking, hit testing.
- `scripts/scene_generator.py` — generates a basic/vr/ar/360/networked scene: `py -3 scripts/scene_generator.py vr MiProyecto` (Linux/mac: `python3 …`).
- `scripts/component_builder.py` — boilerplate for a basic/interactive/animation/physics/networked component: `py -3 scripts/component_builder.py interactive mi-comp`.
- `assets/starter_aframe/` — ready-made index.html + main.js + style.css; `assets/examples/README.md` — advanced patterns (two-handed grab, networking, physics).

## Hard rules
- Preload everything in `<a-assets>` and wait for the scene's `loaded` event before adding entities dynamically; add `crossorigin="anonymous"` on external resources.
- Do not create/destroy entities every frame: use pooling; throttle `tick()` and limit lights (max. ambient + directional on mobile).
- Interaction requires a raycaster: `<a-cursor raycaster="objects: .interactive">` and the class on the targets; without it `click`/`mouseenter` never arrive.
- In mobile VR limit `renderer="maxCanvasWidth: 1920; maxCanvasHeight: 1920"`, use low-poly and consider `antialias: false`.
- Always offer a non-XR fallback (desktop/mobile with look-controls) and respect `prefers-reduced-motion` by disabling looping `animation__*`.

## Integration with the project's stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). A-Frame is vanilla/HTML-first: in Vue or Astro it works with the CDN script or `import 'aframe'` only on the client (no SSR).
- In React use `useEffect` + refs (L731-770) and register components before mounting `<a-scene>`; if the project is already React+Three, prefer `react-three-fiber`.
