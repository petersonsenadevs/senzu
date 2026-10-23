---
name: playcanvas-engine
description: "PlayCanvas WebGL/WebGPU engine: 3D browser games, ECS, pc.createScript scripts, Ammo.js physics, glTF loading, Editor export. Not for low-level 3D (threejs-webgl), R3F (react-three-fiber) or declarative VR (aframe-webxr)."
origen: core/skills-overlay/playcanvas-engine/SKILL.md
huella: 0b43c4004ee7
---

# playcanvas-engine (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (1062 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: 3D browser games or apps with an ECS architecture (entities + model/camera/light/rigidbody components).
- Use: projects that start from the PlayCanvas Editor (export, `config.json`, `loadSceneHierarchy`) or need Ammo.js physics, keyboard/mouse/touch input and skeletal animation.
- Use: performance-critical 3D experiences where Three.js requires too much boilerplate.
- Do NOT use: low-level WebGL control or "web" 3D scenes (landing page, product) → `threejs-webgl`; declarative React → `react-three-fiber`.
- Do NOT use: heavy physics simulations or a more complete editor → `babylonjs-engine`; declarative VR/AR in HTML → `aframe-webxr`.

## Minimal reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L30-167 (§Core Concepts) + L171-230 (§Pattern 1) + `assets/starter_playcanvas/` |
| Load glTF models and PBR materials | L232-346 (§Pattern 2 and 3) |
| Physics, custom scripts and input | L348-560 (§Pattern 4, 5 and 6) |
| Skeletal animation and tweens | L562-628 (§Pattern 7) |
| Integrate in React or load an Editor export | L630-730 (§Integration Patterns) |
| Debugging / performance | L732-850 (§Performance Optimization) + L852-1014 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 10-28 | When to Use This Skill | Triggers and comparison with Three.js, Babylon.js and A-Frame |
| 30-167 | Core Concepts | Application, ECS, `update(dt)` loop and basic components |
| 169-628 | Common Patterns | Base scene, glTF, materials, physics, scripts, input, animation |
| 416-498 | Pattern 5: Custom Scripts | `pc.createScript`, editor attributes and lifecycle |
| 630-730 | Integration Patterns | React wrapper with `useEffect`/`app.destroy()` and Editor export |
| 732-850 | Performance Optimization | Object pooling, manual LOD, batching, compressed textures |
| 852-1014 | Common Pitfalls | Forgetting `app.start()`, mutating in update, asset leaks, hierarchy, Ammo, canvas |
| 1016-1025 | Resources | Official links (API, docs, examples, forum) |
| 1027-1060 | Quick Reference | Minimal snippets: app, entity, update, assets |

## Resources
- `references/api_reference.md` — PlayCanvas API reference (classes, components, constants).
- `references/editor_workflow.md` — Workflow with the online Editor and its export to code.
- `references/optimization_guide.md` — Extended optimization guide (draw calls, memory, mobile).
- `scripts/project_generator.py` — Generates a project HTML by type: `py -3 scripts/project_generator.py --list` / `--type <tipo> --output out.html` (or `python3`).
- `scripts/component_builder.py` — Generates component scripts (basic, interactive, animation, physics, character, camera, ui): `py -3 scripts/component_builder.py -n Nombre -t tipo -o ./scripts/`.
- `assets/starter_playcanvas/` — Starter with `index.html`, `styles.css` and a `scripts/` folder; `assets/examples/README.md` — index of examples.

## Hard rules
- Always call `app.start()` after creating the scene; without it there is no render loop.
- Responsive canvas: `setCanvasFillMode(FILLMODE_FILL_WINDOW)`, `setCanvasResolution(RESOLUTION_AUTO)` and `app.resizeCanvas()` on `resize`.
- Never destroy entities inside `update`: mark them and remove them in `postUpdate`.
- Clean up assets (`app.assets.remove` + `asset.unload()`) and call `app.destroy()` on unmount (React `useEffect` cleanup).
- Load Ammo.js before adding `rigidbody`/`collision`; in spawn loops use pooling instead of creating/destroying.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). Vanilla library (`import * as pc from 'playcanvas'`), valid in React (pattern L632-690), Vue or Astro with `client:only`; the canvas requires `window`, so initialize on the client only (SSR-safe).
