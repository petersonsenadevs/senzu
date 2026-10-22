---
name: lottie-animations
description: "Lottie/dotLottie animations (After Effects JSON) on the web, React, Vue and Svelte: lottie-web, @lottiefiles/dotlottie-*, lottie-react, animated icons, loaders, scroll/hover. Not for animations with states (use rive-interactive)."
origen: core/skills-overlay/lottie-animations/SKILL.md
huella: fe1e132855b8
---

# lottie-animations (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (692 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: play animations designed in After Effects (.json / .lottie) faithfully: animated icons, loaders, onboarding, marketing.
- Use: control play/pause/seek/segments, events, themes and multi-animation from code (dotLottie), or sync with scroll/hover.
- Use: optimize size and performance (dotLottie, canvas, DotLottieWorker, lazy load).
- Do NOT use: animations with state machines, inputs and two-way data binding → rive-interactive.
- Do NOT use: general DOM/layout animation or complex scroll → gsap-scrolltrigger / motion-framer; 3D → threejs-webgl.

## Minimal reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L28-109 (§Core Concepts: formats and libraries) + `assets/starter_lottie/README.md` |
| React component with controls and events | L142-219 (§2 and §3) + `references/api_reference.md` |
| Scroll / hover / segments | L221-289 (§4, §5) and L373-416 (§With GSAP ScrollTrigger) |
| Vue 3 / Svelte / vanilla HTML | L112-140 (§1 HTML) and L442-481 (§Vue 3, §Svelte) |
| Export from After Effects | L652-667 (§6 compatibility) + `references/after_effects_export.md` |
| Debugging / performance | L483-570 (§Performance Optimization) + L572-667 (§Common Pitfalls) + `references/performance_guide.md` |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-27 | Overview | What Lottie is, when to use it, advantages over GIF/video |
| 28-109 | Core Concepts | JSON vs dotLottie formats (30), libraries lottie-web / dotlottie-web / dotlottie-react / lottie-react (46), data sources (93) |
| 110-369 | Common Patterns | HTML dotLottie (112), React with controls (142), events (177), scroll (221), hover by segments (259), multi-animation and themes (291), Web Worker (347) |
| 371-481 | Integration Patterns | GSAP ScrollTrigger (373), Framer Motion (418), Vue 3 (442), Svelte (459) |
| 483-570 | Performance Optimization | File size and lazy load (485), renderer, workers and mobile (523) |
| 572-667 | Common Pitfalls | Memory leaks (574), listeners (594), large files (613), stutter (624), paths/CORS (635), unsupported AE features (652) |
| 669-692 | Resources / Related Skills | Index of scripts, references, assets and related skills |

## Resources
- `references/api_reference.md` — Full API of lottie-web, lottie-react and dotlottie-web (methods, props, events).
- `references/after_effects_export.md` — Export guide with Bodymovin and settings to reduce size.
- `references/performance_guide.md` — Detailed performance strategies (renderer, workers, DPR, lazy load).
- `scripts/generate_lottie_component.py` — Generates a React/Vue/Svelte component: `py -3 scripts/generate_lottie_component.py --framework react --type interactive --name Loader --src /animations/x.lottie --output src/Loader.tsx`.
- `scripts/optimize_lottie.py` — Shrinks the JSON (numeric precision, metadata): `py -3 scripts/optimize_lottie.py anim.json -o anim.min.json -p 2`.
- `assets/starter_lottie/README.md` — Description of the React + Vite + DotLottieReact starter (README only, no source code).

## Hard rules
- Prefer `.lottie` (dotLottie) over `.json` in production: up to 90 % less weight; run it through `optimize_lottie.py` if it is still JSON.
- Always destroy the instance (`dotLottie.destroy()`) and remove every `addEventListener` in the component cleanup.
- Complex animations: canvas renderer (not SVG), `DotLottieWorker` to offload the main thread and `devicePixelRatio: 1` on mobile.
- Lazy loading with IntersectionObserver; in Next.js put the files in `public/` and use absolute paths; external URLs require CORS.
- Respect `prefers-reduced-motion`: no autoplay/loop, show the first frame or a static image (project rule, not upstream).

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json).
- React → `@lottiefiles/dotlottie-react` (or `lottie-react` if you need `interactivity` scroll/cursor); Vue → `@lottiefiles/dotlottie-vue`; Svelte → `@lottiefiles/dotlottie-svelte`; Astro/vanilla → `@lottiefiles/dotlottie-web` on `<canvas>` (client only, needs `window`).
