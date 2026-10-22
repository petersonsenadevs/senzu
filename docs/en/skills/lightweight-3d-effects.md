---
name: lightweight-3d-effects
description: "Lightweight, decorative 3D effects with Zdog (pseudo-3D), Vanta.js (animated WebGL backgrounds) and Vanilla-Tilt (tilt parallax on cards). For heros, landings, 3D icons, tilt cards. Not for real 3D scenes, glTF models or WebXR."
origen: core/skills-overlay/lightweight-3d-effects/SKILL.md
huella: e43d6f9971ae
---

# lightweight-3d-effects (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (1091 lines). **Do not read all of it**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: animated hero/section background (Vanta WAVES, NET, FOG, CLOUDS, BIRDS...) without setting up Three.js by hand.
- Use: vector pseudo-3D illustrations or icons with Zdog (canvas/SVG, ~28 kB, dragRotate).
- Use: cards with tilt parallax, glare and `translateZ` layers with Vanilla-Tilt (data-attributes or API).
- Do NOT use: 3D scenes with models, lights or physics → threejs-webgl / react-three-fiber; Spline scenes → spline-interactive.
- Do NOT use: general DOM or scroll animation → gsap-scrolltrigger; declarative React animations → motion-framer.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L716-926 (§Common Patterns) + `assets/starter_lightweight/` |
| Vanta animated background (choose effect, options, React) | L270-516 (§Vanta.js) + `references/vantajs_effects.md` |
| Zdog illustration/icon (shapes, groups, animation) | L22-268 (§Zdog) + `references/zdog_api.md` |
| Tilt on cards (options, glare, layers, React) | L518-714 (§Vanilla-Tilt.js) + `references/tilt_patterns.md` |
| Debugging / performance | L928-1068 (§Performance Best Practices + §Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-21 | Overview / When to Use This Skill | What each library covers and use cases |
| 22-268 | Zdog - Pseudo-3D Illustrations | Setup (35), Shapes (96), Groups (170), Animation (229) |
| 270-516 | Vanta.js - Animated 3D Backgrounds | Setup (283), Available Effects (338), Config (429), Methods destroy/setOptions (454), React (476) |
| 518-714 | Vanilla-Tilt.js - Parallax Tilt Effects | Setup (531), Config Options (567), Advanced glare/layers/API (607), React (676) |
| 716-926 | Common Patterns | Vanta hero (718), Zdog icon grid (761), tilt gallery (826), Vanta + tilt combined (877) |
| 928-971 | Performance Best Practices | Limits per library, mobile fallback, `will-change` |
| 973-1068 | Common Pitfalls | Multiple Vanta (975), leaks in SPA (997), blank Zdog (1014), mobile tilt (1040), Vanta colors (1054) |
| 1070-1091 | Resources / Related Skills | Official links and related skills |

## Resources
- `references/zdog_api.md` — Full Zdog API: Illustration, Anchor, shapes, properties, animation.
- `references/vantajs_effects.md` — Catalog of Vanta effects with all their options and dependencies (Three.js / p5.js).
- `references/tilt_patterns.md` — Patterns and advanced options for Vanilla-Tilt (gyroscope, glare, layers).
- `scripts/generate_zdog.py` — Generates Zdog illustrations by type: `py -3 scripts/generate_zdog.py --type cube` (`--list` to see types; no args = interactive).
- `scripts/setup_vanta.py` — Generates the HTML/JS for a Vanta background: `py -3 scripts/setup_vanta.py --effect waves` (`--list` for effects).
- `assets/starter_lightweight/` — Vanilla starter (index.html, main.js, style.css, README) with the three libraries.
- `assets/examples/README.md` — Production examples: heros, product cards, portfolios, dashboards.

## Hard rules
- At most 1-2 Vanta instances per page; lazy load with IntersectionObserver and fall back to a static gradient on mobile.
- In SPA/React always call `vantaEffect.destroy()` and `element.vanillaTilt.destroy()` in the effect's cleanup.
- Vanta takes colors as a hex number (`0x23153c`), never strings `"#23153c"`.
- Zdog: call `illo.updateRenderGraph()` after every change; canvas with explicit width/height; < 100 shapes for 60 fps; canvas for animation, SVG for static.
- Respect `prefers-reduced-motion`: disable animated backgrounds and tilt (upstream does not cover this; it is a project rule).

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json).
- The three libraries are vanilla (they work in Vue, Astro, plain HTML); upstream includes React wrappers for Vanta (L476) and Tilt (L676). In SSR (Next/Astro) initialize only on the client (`useEffect` / `client:only`); Vanta needs `window`.
