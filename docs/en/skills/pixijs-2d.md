---
name: pixijs-2d
description: "PixiJS v8: 2D WebGL/WebGPU rendering for sprites, sprite sheets, particles (ParticleContainer), vector Graphics, filters/shaders, BitmapText, 2D games and HUDs over Three.js. Not for 3D (threejs-webgl) or DOM (gsap-scrolltrigger)."
origen: core/skills-overlay/pixijs-2d/SKILL.md
huella: 525d0678feaf
---

# pixijs-2d (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (935 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT to
- Use: high-performance interactive 2D canvas (thousands of sprites at 60 FPS), particle systems, 2D games, sprite sheet animation.
- Use: programmatic vector drawing (Graphics), per-pixel filters (blur, displacement, custom shaders) or a 2D HUD layer over a 3D scene.
- Do NOT use: 3D graphics → `threejs-webgl` / `react-three-fiber`; animating DOM/UI elements → `gsap-scrolltrigger`, `motion-framer`, `animejs`.
- Do NOT use: lightweight background effects without their own canvas → `lightweight-3d-effects`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L32-58 (§Application & Renderer) + L221-263 (§Pattern 1) + `assets/starter_pixijs/` |
| Particles | L122-156 (§ParticleContainer) + L319-388 (§Pattern 3) or `scripts/particle_builder.py` |
| Filters and custom shaders | L158-187 (§Filters) + L390-494 (§Pattern 4-5) + `references/filters_effects.md` |
| Sprite sheet / AnimatedSprite | L496-530 (§Pattern 6) + `references/api_reference.md` |
| Integrate into React or over Three.js | L603-689 (§Integration Patterns) |
| Debugging / performance | L691-797 (§Performance Best Practices) + L798-903 (§Common Pitfalls) + `references/performance_guide.md` |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 12-28 | When to Use This Skill | Triggers and when not to use Pixi |
| 30-217 | Core Concepts | Application (32), Sprites & Textures (60), Graphics API (89), ParticleContainer (122), Filters (158), Text/BitmapText (189) |
| 219-601 | Common Patterns | Interactive sprite (221), Graphics (265), particles (319), filters (390), custom shader (431), sprite sheet (496), object pooling (532) |
| 603-689 | Integration Patterns | React component with destroy (605); 2D overlay over Three.js (647) |
| 691-797 | Performance Best Practices | ParticleContainer, filterArea, texture memory, culling, cacheAsBitmap, renderer settings, BitmapText |
| 798-903 | Common Pitfalls | Not destroying objects, static dynamicProperties, too many filters, dynamic Text, clear() without redrawing, Sprite.from without Assets |
| 905-935 | Resources / Related Skills / Summary | Official links and related skills |

## Resources
- `references/api_reference.md` — reference of PixiJS v8 classes and methods.
- `references/filters_effects.md` — guide to built-in filters and custom shaders.
- `references/performance_guide.md` — detailed optimization for 60 FPS.
- `scripts/particle_builder.py` — generates a JS particle system: `py -3 scripts/particle_builder.py --type fountain --count 5000 --output ./` (interactive without args).
- `scripts/sprite_generator.py` — generates basic/interactive/animated sprite code: `py -3 scripts/sprite_generator.py --type interactive --output ./`.
- `assets/starter_pixijs/` — vanilla starter (index.html, main.js, styles.css, README.md).
- `assets/examples/README.md` — catalog of examples (games, UI, particles, shaders).

## Hard rules
- v8 API: `await app.init({...})` and `app.canvas`; load textures with `await Assets.load()`, never `Sprite.from(url)` without preloading.
- Mandatory cleanup: `app.destroy(true, { children: true })` on unmount (React useEffect cleanup) and `sprite.destroy({ texture: true })` to free GPU memory.
- Thousands of sprites → `ParticleContainer` with `dynamicProperties` only on what changes; use object pooling for spawn/despawn.
- Filters: at most 1-2 per object, define `filterArea`, bake filters into textures when static; `BitmapText` for text that changes every frame.
- On mobile/low-end: `antialias: false`, `resolution: 1`, `cullable = true`; the canvas must be created only on the client (SSR-safe: `useEffect`/`onMounted`).

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill says (senzu/senzu.json → package.json). PixiJS is framework-agnostic: in vanilla/Astro instantiate it in a client `<script>`; in React follow L605-643; in Vue replicate the same pattern in `onMounted`/`onBeforeUnmount`.
- To animate Pixi properties on scroll use `gsap-scrolltrigger`; to combine it with 3D, `threejs-webgl` (overlay L647-687).
