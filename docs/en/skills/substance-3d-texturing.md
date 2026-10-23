---
name: substance-3d-texturing
description: "PBR texturing with Adobe Substance 3D Painter and web export: metallic/roughness presets, glTF, Three.js, Babylon.js, ORM packing, Painter's Python API. Not for loading/modeling in the engine (threejs-webgl, blender-web-pipeline)."
origen: core/skills-overlay/substance-3d-texturing/SKILL.md
huella: c698e1ac82ed
---

# substance-3d-texturing (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (506 lines). **Do not read it whole**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: exporting PBR textures (baseColor, normal, metallicRoughness, AO) from Substance Painter for Three.js, Babylon.js or glTF.
- Use: automating exports with Painter's Python API (batch, per-asset resolution, custom presets, plugin on save).
- Use: reducing texture weight for web/mobile (ORM channels, JPEG for baseColor, memory budget).
- Do NOT use: modeling, LOD or mesh export → blender-web-pipeline; materials and loading in the engine → threejs-webgl / react-three-fiber / babylonjs-engine.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L58-93 (§1. Basic Web Export) + `assets/export_templates/` |
| Batch export with Python | L95-166 (§2-3) + `scripts/batch_export.py` + `references/python_api_reference.md` |
| Custom preset / ORM channels | L168-216 (§4) + L396-416 (§Channel Packing) + `scripts/generate_export_preset.py` |
| Use textures in R3F, Babylon or glTF | L314-376 (§Integration Patterns) |
| Debugging / performance | L377-428 (§Performance Optimization) + L429-488 (§Common Pitfalls) + `scripts/web_optimizer.py` |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-17 | Overview | Scope: PBR authoring, web export, Python automation |
| 18-55 | Core Concepts | Metallic/roughness PBR channels, built-in presets, recommended resolutions |
| 58-94 | 1. Basic Web Export (Three.js/Babylon.js) | Manual export and `MeshStandardMaterial` with the maps |
| 95-142 | 2. Batch Export with Python API | `export_project_textures` with a JSON config for all texture sets |
| 143-167 | 3. Resolution Override per Asset | Different `sizeLog2` per texture set via `filter` |
| 168-217 | 4. Custom Export Preset (Separate Channels) | Define `exportPresets` with your own maps and channels |
| 218-244 | 5. Mobile-Optimized Export | JPEG for baseColor, PNG for data maps, 512 px |
| 245-279 | 6. glTF/GLB Integration | Config for glTF 2.0 and reference in the material JSON |
| 280-313 | 7. Event-Driven Export Plugin | Auto-export on save with `event.DISPATCHER` |
| 314-376 | Integration Patterns | `useTexture` in R3F, `PBRMaterial` in Babylon, glTF + Draco pipeline |
| 377-428 | Performance Optimization | Memory budget, compression, ORM packing, mipmaps |
| 429-488 | Common Pitfalls | Color space, Y+/Y- normals, channel order, padding, AO with uv2 |
| 489-506 | Resources / Related Skills | Resource index and related skills |

## Resources
- `references/python_api_reference.md` — complete Substance Painter Python API (export, textureset, resource, event).
- `references/export_presets.md` — catalog of built-in and custom presets.
- `references/pbr_channel_guide.md` — meaning and ranges of each PBR channel.
- `scripts/batch_export.py` — exports all texture sets with the PBR Metallic Roughness preset; runs INSIDE Painter (File → Python → Execute Script, or as a plugin).
- `scripts/generate_export_preset.py` — generates a custom preset JSON: `py -3 scripts/generate_export_preset.py` (interactive or with flags; `python3` on Linux/macOS).
- `scripts/web_optimizer.py` — resizes and converts exported textures (baseColor to JPEG, savings report): `py -3 scripts/web_optimizer.py --help`.
- `assets/export_templates/` — ready-made JSON presets: `gltf_standard`, `threejs_optimized`, `babylonjs_pbr`, `web_orm_packed`, `mobile_webgl`.

## Hard rules
- Default 1024×1024 for web; 2048 only for hero assets; never 4K on the web. Budget: ~100-150 MB desktop, ~30-50 MB mobile.
- Always `paddingAlgorithm: "infinite"` to avoid lines on UV seams.
- baseColor in sRGB (`texture.colorSpace = THREE.SRGBColorSpace`); data maps (normal, metallic, roughness) in lossless PNG and in linear space.
- glTF channel order: G = roughness, B = metallic (R free, or AO in ORM). Normals in OpenGL format (Y+), same as glTF.
- AO in Three.js requires `uv2`; in Babylon enable `useAmbientOcclusionFromMetallicTextureRed`.

## Integration with the project's stack
- Detect the stack as described in the `front-activation`/`skill-router` skill (senzu/senzu.json → package.json). This skill is framework-agnostic (it produces texture files); consumption depends on the engine: React → react-three-fiber (`useTexture`), vanilla/Vue/Astro → threejs-webgl or babylonjs-engine.
