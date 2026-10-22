---
name: barba-js
description: "Page transitions with Barba.js (@barba/core, router, prefetch, head) on multi-page sites: wrapper/container/namespace, hooks, views, animation with GSAP. Not for React/Vue routers, Astro View Transitions or general DOM animation."
origen: core/skills-overlay/barba-js/SKILL.md
huella: 7ea1a9a4aacf
---

# barba-js (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (871 lines). **Do not read all of it**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: multi-page site (static HTML, Astro without View Transitions, WordPress, Eleventy) that needs smooth transitions between pages without a full reload.
- Use: conditional transitions by namespace/route, loading indicator, re-initializing scripts or analytics after each navigation.
- Do NOT use: React/Next apps with their own router → motion-framer (AnimatePresence); Astro with native View Transitions.
- Do NOT use: animations within a single page or on scroll → gsap-scrolltrigger.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L25-67 (§Wrapper, Container, and Namespace) + L151-183 (§Basic Setup) or `scripts/project_setup.py` |
| Create a transition (fade/slide/crossfade) | L185-274 (§2-4 Common Patterns) + `references/transition_patterns.md` |
| Different transitions per page or route | L276-387 (§Transition Rules + §Router Plugin) |
| Per-page logic / re-init of scripts | L121-147 (§Views) + L490-565 (§View-Specific… §Third-Party…) |
| Debugging / performance | L567-669 (§Performance Optimization) + L671-844 (§Common Pitfalls) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 10-22 | Overview | What Barba is (7 kb, framework-agnostic) |
| 23-147 | Core Concepts | DOM structure, async/sync cycle, the 11 hooks, views |
| 25-67 | 1. Wrapper, Container, and Namespace | Required `data-barba` attributes |
| 69-93 | 2. Transition Lifecycle | Order of steps in async mode vs `sync: true` |
| 94-120 | 3. Hooks | Execution order and typical use of each hook |
| 149-422 | Common Patterns | Minimal setup, fade, crossfade, slide, rules, router, loader |
| 424-565 | Integration Patterns | GSAP timelines, per-view init, analytics, third-party widgets |
| 567-669 | Performance Optimization | Prefetch, avoiding layout shift, GPU properties, cleaning up listeners, lazy images |
| 671-844 | Common Pitfalls | Promises not returned, external links, CSS across pages, title/meta, flicker, sync without position absolute |
| 846-871 | Resources / Related Skills | Index of scripts, references and related skills |

## Resources
- `references/api_reference.md` — Full API: init, hooks, transitions, views, router.
- `references/hooks_guide.md` — The 11 hooks with execution order and use cases.
- `references/gsap_integration.md` — GSAP animation patterns for leave/enter.
- `references/transition_patterns.md` — Ready-to-copy transition implementations.
- `scripts/transition_generator.py` — Generates the code for a transition: `py -3 scripts/transition_generator.py --type slide --sync` (or `python3 …`).
- `scripts/project_setup.py` — Creates a Barba + GSAP project structure: `py -3 scripts/project_setup.py --name mi-proyecto --transition fade`.
- `assets/README.md` — Only describes starters; upstream mentions `starter_barba/` and `examples/` but they do NOT exist in the package.

## Hard rules
- The `leave`/`enter` hooks must return a promise (return the tween or `async/await`); otherwise the transition ends instantly.
- With `sync: true`, position the containers with `position: absolute` (wrapper `relative`) to avoid layout jumps.
- Animate only `opacity`/`transform` (x, scale, rotation); never width/height/top.
- Clean up listeners and instances (sliders, lightbox, Locomotive) in `beforeLeave`; reset scroll and global state in `beforeEnter`.
- Update `<title>` and meta with `@barba/head` or manually in `barba.hooks.after`; use `prevent` to let external links through.
- Respect `prefers-reduced-motion`: if it is on, use instant transitions or very short opacity ones.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). Barba is vanilla JS: it fits static HTML, Astro (without View Transitions), Vue/Nuxt only in MPA mode. For React/Next use motion-framer; combine with locomotive-scroll (destroy/recreate the instance on each transition) and gsap-scrolltrigger (`ScrollTrigger.refresh()` in `afterEnter`).
