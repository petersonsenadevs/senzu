---
name: locomotive-scroll
description: "Smooth scroll and parallax with Locomotive Scroll: data-scroll-*, sticky, horizontal scroll, scroll/call events, sync with GSAP ScrollTrigger (scrollerProxy). Not for simple reveals (scroll-reveal-libraries) or scroll without smoothing (gsap)."
origen: core/skills-overlay/locomotive-scroll/SKILL.md
huella: 9d7ff7c6b450
---

# locomotive-scroll (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (480 lines). **Do not read it whole**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: Apple-style immersive landings with smoothed scroll (lerp), parallax layers by speed and sticky elements inside sections.
- Use: horizontal scroll or long storytelling that needs per-element progress (`data-scroll-id`) or `data-scroll-call` triggers.
- Do NOT use: just a fade-in on entering the viewport → scroll-reveal-libraries (AOS) or IntersectionObserver.
- Do NOT use: scrubbed/pin animations without smooth scroll → gsap-scrolltrigger (ScrollSmoother if smoothing is wanted); in React → motion-framer.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L33-116 (§Installation + §Core Concepts) + `assets/starter_locomotive/` |
| Parallax, sticky, horizontal scroll | L139-161 (§2. Parallax), L193-209 (§4. Sticky), L236-254 (§6. Horizontal) |
| Events, progress and scrollTo | L163-191 (§3. Viewport Detection) + L211-234 (§5. Programmatic Scrolling) + L333-353 (§Instance Methods) |
| Combine with GSAP ScrollTrigger | L277-331 (§Integration with GSAP ScrollTrigger) + `references/gsap_integration.md` |
| Debugging / performance | L355-383 (§Performance Optimization) + L385-466 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 10-32 | Overview | Capabilities and trade-offs (accessibility, mobile, position fixed) |
| 33-47 | Installation | npm + mandatory CSS, or CDN |
| 49-116 | Core Concepts | `data-scroll-container`/`-section` structure, `new LocomotiveScroll` options, attribute table |
| 118-275 | Common Patterns | Basic smooth, parallax, events, sticky, scrollTo, horizontal, tablet/smartphone breakpoints |
| 277-331 | Integration with GSAP ScrollTrigger | `scrollerProxy`, `scroller`, mutual refresh/update |
| 333-353 | Instance Methods | init/update/destroy/start/stop, scrollTo, on/off |
| 355-383 | Performance Optimization | Sections, limit parallax, disable on mobile, update on resize, destroy |
| 385-466 | Common Pitfalls | Broken fixed, lazy images, stale positions, accessibility, memory leaks, z-index |
| 468-480 | Related Skills / Resources | Related skills and index of scripts, references and assets |

## Resources
- `references/api_reference.md` — Full API: options, attributes, methods, events.
- `references/gsap_integration.md` — ScrollTrigger + Locomotive patterns (scrollerProxy, pin, scrub).
- `scripts/generate_config.py` — Generates the initial configuration: `py -3 scripts/generate_config.py --smooth` / `--horizontal` (or `python3 …`).
- `scripts/integration_helper.py` — Generates GSAP integration code by pattern/framework: `py -3 scripts/integration_helper.py --pattern fade-in --framework react`.
- `assets/starter_locomotive/` — Complete starter (index.html, main.js, style.css, package.json, README.md).

## Hard rules
- Always import `locomotive-scroll/dist/locomotive-scroll.css`; wrap the content in `data-scroll-container` and segment it with `data-scroll-section`.
- Respect `prefers-reduced-motion`: `smooth: !matchMedia('(prefers-reduced-motion: reduce)').matches`; consider `smartphone: { smooth: false }`.
- Call `scroll.update()` after inserting dynamic content, loading images or on resize; call `scroll.destroy()` on unmount or route change.
- `position: fixed` elements go outside the container (or use `data-scroll-sticky`); parallax layers need an explicit z-index.
- With GSAP: register `scrollerProxy`, pass `scroller: '[data-scroll-container]'` to every ScrollTrigger and chain `ScrollTrigger.refresh()` → `locoScroll.update()`.
- SSR-safe: instantiate only on the client (`useEffect`/`onMounted`/`client:only`), never at the module's top level.

## Integration with the project's stack
- Detect the stack as described in the `front-activation`/`skill-router` skill (senzu/senzu.json → package.json). It is vanilla JS and works in static HTML, Astro, Vue (instantiate in `onMounted`, destroy in `onUnmounted`) and React (`useEffect` with cleanup). In React projects with GSAP, consider ScrollSmoother (gsap-scrolltrigger) to avoid two scroll systems; with barba-js, destroy and recreate the instance on every transition.
