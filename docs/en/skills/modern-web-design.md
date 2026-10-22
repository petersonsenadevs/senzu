---
name: modern-web-design
description: "Web design trends and principles 2024-25 (bento, glassmorphism, neobrutalism) as occasional inspiration. Use it AFTER ui-ux-pro-max and only to explore styles; the design system and the pattern are decided by ui-ux-pro-max. Not for coding."
origen: core/skills-overlay/modern-web-design/SKILL.md
huella: fe2455380ad2
---

# modern-web-design (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (990 lines). **Do not read all of it**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: deciding the visual/interactive direction of a landing or portfolio (immersive hero, horizontal gallery, reveals, custom cursor, glass).
- Use: defining design tokens (OKLCH, fluid typography with clamp, elevations, timing) or auditing a page's accessibility and performance.
- Use: choosing which animation/3D skill to apply to each pattern (this skill is the router).
- Do NOT use: to write the code for a specific library → `gsap-scrolltrigger`, `motion-framer`, `react-three-fiber`, `barba-js`, etc.
- Do NOT use: for UI components/system styling → `ui-styling`, `design-system`, `animated-component-libraries`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a project/starter | `SKILL.upstream.md` L14-33 (§Performance-First) + L903-946 (§Design System Architecture); there is no starter in `assets/` (only README) |
| Choose a section pattern (hero, gallery, 3D viewer, transitions) | L252-510 (§Common Design Patterns) and the skill each pattern cites |
| Micro-interactions, cursor, glass | L67-222 (§3, §5, §6) + `references/interaction_patterns.md` |
| Accessibility | L586-687 (§Accessibility Best Practices) + `references/accessibility_guide.md` |
| Debugging / performance | L689-790 (§Performance Optimization) + L791-901 (§Common Pitfalls) + `references/performance_checklist.md` |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 8-13 | Overview | What the meta-skill covers |
| 14-251 | Core Design Principles (2024-2025) | 7 principles: Performance-First (16), Bold Minimalism (34), Micro-Interactions (67), Scrollytelling (105), Cursor UX (145), Glassmorphism & Depth (194), AI Personalization (224) |
| 252-511 | Common Design Patterns | 7 patterns with code: Hero (254), Horizontal Gallery (290), 3D Product Viewer (316), Data Viz (349), Page Transitions (402), Cursor Effects (434), Staggered Reveals (470) |
| 512-585 | Integration with Other Skills | Which skill to use for animation (514), 3D (546) and components (572) |
| 586-688 | Accessibility Best Practices | reduced-motion (588), contrast (615), keyboard (634), screen reader (657), touch targets (673) |
| 689-790 | Performance Optimization | 60 FPS animation (691), loading (713), images (733), 3D (759), bundle (775) |
| 791-902 | Common Pitfalls | Over-animation, mobile, fallbacks, a11y, loading states, scroll hijacking |
| 903-947 | Design System Architecture | CSS tokens (905) and atomic architecture (937) |
| 948-990 | Resources | List of related skills, references, scripts, assets |

## Resources
- `references/design_trends_2024.md` — design trends and forecasts 2024-25.
- `references/interaction_patterns.md` — catalog of micro-interactions.
- `references/accessibility_guide.md` — WCAG AAA patterns and how to test them.
- `references/performance_checklist.md` — optimization checklist and metrics.
- `scripts/pattern_generator.py` — generates HTML boilerplate for a pattern: `py -3 scripts/pattern_generator.py --pattern hero --output hero.html`.
- `scripts/design_audit.py` — audits an HTML file (a11y, performance, patterns): `py -3 scripts/design_audit.py --file index.html --report audit.txt`.
- `assets/README.md` — only describes planned tokens/templates; there are no real starter files.

## Hard rules
- Always respect `prefers-reduced-motion` (CSS L592-601 and JS L606-612); animation must be possible to turn off.
- Animate only `transform` and `opacity`; never top/left/width/height; `will-change` only during the animation.
- Core Web Vitals targets: LCP < 2.5 s, CLS < 0.1, INP < 200 ms; defer non-critical animations and lazy-load images/3D.
- AAA contrast 7:1 (4.5:1 for large text); visible `:focus-visible`; touch targets ≥ 44x44 px.
- Never hijack native scroll or disable scrolling; enhance, do not replace (L890-901).
- Progressive enhancement: essential content must be visible without JS; detect features before using them.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). This skill is framework-agnostic: the principles and CSS tokens apply to vanilla, Vue, Astro and React.
- The examples with `motion`/Framer and R3F are React-only; in Vue/vanilla/Astro use `gsap-scrolltrigger`, `animejs`, `scroll-reveal-libraries` or `barba-js` depending on the pattern.
