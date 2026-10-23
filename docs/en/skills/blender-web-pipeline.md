---
name: blender-web-pipeline
description: "Export Blender models to glTF/GLB for the web: bpy, Draco, decimation, baking, LODs, textures, CLI batches (blender --background). Not for rendering 3D in the browser (threejs-webgl, babylonjs-engine) or painting PBR (substance-3d-texturing)."
origen: core/skills-overlay/blender-web-pipeline/SKILL.md
huella: 9352abca45c0
---

# blender-web-pipeline (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (613 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT to
- Use: exporting .blend to .glb with Draco compression and reduced textures for Three.js, R3F, Babylon or PlayCanvas.
- Use: automating with `blender --background --python`, processing batches, generating LODs, baking complex materials.
- Use: a .glb is too heavy, textures are missing, the animation doesn't play or materials look different on the web.
- Do NOT use: loading/rendering the model in the browser → threejs-webgl, react-three-fiber, babylonjs-engine, playcanvas-engine.
- Do NOT use: painting PBR textures → substance-3d-texturing; 3D integration patterns on the web → web3d-integration-patterns.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter (first export) | `SKILL.upstream.md` L80-110 (§1. Basic glTF Export) + L572-588 (§Export Settings) |
| Batch / CLI export | L112-168 (§2. Python Script for Batch Export) + L324-359 (§7. Command-Line Automation) or `scripts/batch_export.py` |
| Reduce weight (polygons, textures, LOD) | L170-195 (§3. Decimation), L253-322 (§5-6 LOD and compression) + `references/optimization_strategies.md` |
| Load the .glb in Three/R3F/Babylon | L361-419 (§Integration Patterns) |
| Debugging / performance | L489-551 (§Common Pitfalls) + L553-570 (§Pre-Export Checklist) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-27 | Overview | Scope and capabilities of the pipeline |
| 28-77 | Core Concepts | glTF vs GLB, `bpy` basics, target metrics (<5 MB, <50k tris, 2048 px max) |
| 78-359 | Common Patterns | Basic export, batch, decimation, baking, LODs, texture compression, CLI |
| 197-251 | 4. Texture Baking for Web | Bake materials into a single texture with Cycles |
| 361-419 | Integration Patterns | Loading with GLTFLoader+DRACOLoader, `useGLTF`, `SceneLoader.ImportMesh` |
| 421-487 | Optimization Techniques | Remove doubles, triangulate, JPEG, UV atlas, Principled BSDF |
| 489-551 | Common Pitfalls | Huge files, missing textures, animations, materials, slow export, lag |
| 553-588 | Best Practices | Pre-export checklist and recommended `export_scene.gltf` parameters |
| 590-613 | Resources / Related Skills | Index of scripts, references and related skills |

## Resources
- `references/gltf_export_guide.md` — Full reference of glTF export options.
- `references/bpy_api_reference.md` — Blender Python API cheat sheet.
- `references/optimization_strategies.md` — Detailed optimization techniques (geometry, textures, materials).
- `scripts/batch_export.py` — Exports every .blend in a folder to .glb: `blender --background --python scripts/batch_export.py -- /entrada /salida`.
- `scripts/optimize_model.py` — Decimates and downsizes the textures of a model: `blender --background modelo.blend --python scripts/optimize_model.py`.
- `scripts/generate_lods.py` — Generates LOD0-2 copies: `blender --background modelo.blend --python scripts/generate_lods.py`.
- `assets/README.md` — Description only; upstream cites `export_template.blend` and `shader_library/` but they do NOT exist in the package.

## Hard rules
- Always export binary GLB with `export_apply=True` and Draco enabled (level 6; 8 if size matters most); target <5 MB (ideally <1 MB) and <50k triangles.
- Textures at most 2048 px (1024 preferred), JPEG at quality 85 unless alpha is needed; no exported lights or cameras (recreate them in code).
- Only Principled BSDF materials with supported channels (Base Color, Metallic, Roughness, Normal, Emission); custom nodes are not exported.
- Before exporting: apply modifiers and transforms, merge by distance, clean orphan data, animations on the timeline with assigned actions.
- If you use Draco, the website must register the decoder (`DRACOLoader.setDecoderPath`), or the model won't load.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill says (senzu/senzu.json → package.json). This skill runs outside the front end (Blender + Python); its .glb output is consumed from threejs-webgl (vanilla/Vue/Astro), react-three-fiber (React) or babylonjs-engine. Put the .glb files in `public/models/` and the Draco decoder in `public/draco/`.
