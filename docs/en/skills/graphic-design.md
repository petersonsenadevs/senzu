---
name: graphic-design
description: "Umbrella design skill: SVG logos and icons with Gemini, CIP (stationery mockups), HTML slides with Chart.js, banners and social photos. Triggers: logo, icon, CIP, mockup, pitch deck, banner, social photo. Not for UI/CSS or tokens."
origen: core/skills-overlay/graphic-design/SKILL.md
huella: e0c2d9401aaf
---

# graphic-design (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (313 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT to
- Use: generating a logo or an icon set with AI (Python scripts + `GEMINI_API_KEY`), or a corporate identity program (CIP) with mockups.
- Use: HTML presentations, banners or social media images exported via screenshot; or as the router for a "complete brand package".
- Do NOT use: brand voice/guidelines → `brand`; tokens → `design-system`; Tailwind/shadcn → `ui-styling`; banners only → `banner-design`; slides only → `slides`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Start / decide which sub-skill applies | `SKILL.upstream.md` L26-38 (§Sub-skill Routing) + `references/design-routing.md` |
| Logo | `SKILL.upstream.md` L40-69 (§Logo Design) + `references/logo-design.md` |
| CIP / mockups | `SKILL.upstream.md` L71-114 (§CIP Design) + `references/cip-design.md` |
| Slides | `SKILL.upstream.md` L116-130 (§Slides) + `references/slides-create.md` |
| Banner or social photos | L132-177 (§Banner Design) / L217-241 (§Social Photos) + its reference |
| SVG icons | `SKILL.upstream.md` L179-215 (§Icon Design) + `references/icon-design.md` |
| Debug scripts / environment | `SKILL.upstream.md` L279-308 (§Scripts, §Prerequisites, §Setup) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 15-24 | When to Use | Use cases |
| 26-38 | Sub-skill Routing | Task → sub-skill table (external or built-in) |
| 40-69 | Logo Design (Built-in) | Brief (L44), style/color/industry search (L50), AI generation (L58) |
| 71-114 | CIP Design (Built-in) | Brief (L75), search (L81), mockups with/without logo and pro model (L90), HTML render (L108) |
| 116-130 | Slides (Built-in) | Creation flow and table of slides-* references |
| 132-177 | Banner Design (Built-in) | Workflow (L138), sizes (L146), styles (L159), rules (L171) |
| 179-215 | Icon Design (Built-in) | Single icon (L183), batch (L191), multi-size (L197), styles (L203) |
| 217-241 | Social Photos (Built-in) | 8-step workflow (L223) and sizes per platform (L234) |
| 243-255 | Workflows | Complete brand package and new design system |
| 257-277 | References | Full table of references |
| 279-290 | Scripts | Purpose of each script |
| 292-308 | Prerequisites / Setup | Python (`python` on Windows), `GEMINI_API_KEY`, `pip install google-genai pillow` |
| 310-313 | Integration | External and related sub-skills |

## Resources
- `references/design-routing.md` — routing by task/question type and multi-skill flows.
- Logo: `references/logo-design.md`, `logo-style-guide.md`, `logo-color-psychology.md`, `logo-prompt-engineering.md`.
- CIP: `references/cip-design.md`, `cip-deliverable-guide.md`, `cip-style-guide.md`, `cip-prompt-engineering.md`.
- Slides: `references/slides.md`, `slides-create.md`, `slides-layout-patterns.md`, `slides-html-template.md`, `slides-copywriting-formulas.md`, `slides-strategies.md` (they duplicate `slides/references/`).
- Banner / Social / Icon: `references/banner-sizes-and-styles.md`, `social-photos-design.md`, `icon-design.md`.
- `scripts/logo/{search,generate,core}.py` and `scripts/cip/{search,generate,render-html,core}.py` — BM25 search over `data/` and generation with Gemini; `scripts/icon/generate.py` — SVG with Gemini 3.1 Pro. Run `py -3 scripts/logo/search.py "…" --domain style` (Windows) or `python3 …`.
- `data/logo/{styles,colors,industries}.csv`, `data/cip/{deliverables,industries,styles,mockup-contexts}.csv`, `data/icon/styles.csv` — catalogs that feed the search. There is no `assets/`.

## Hard rules
- Logos always on a white background; after generating, ask whether an HTML gallery is wanted (`ui-ux-pro-max`).
- Logos in `senzu/design-system/<slug>/logos/`: drafts in `generados/<tipo>/`, the CHOSEN ones in `final/<tipo>/`. With a
  final logo of that type, NO drafts or variants are generated unless the user asks (the wall blocks the scripts).
  When one is chosen: a row in «Fijado» (pinned) in `gustos.md` with its path, and the decision in the devlog memory (the session close requires it).
- CIP: generate mockups passing `--logo`; if there is no logo, create one first with the Logo section.
- Requires `GEMINI_API_KEY` and `google-genai pillow`; if a script fails, try to fix it directly.
- Banners and social photos: safe zones 70-80 %, one CTA, at most 2 fonts, text < 20 % in ads, export at exact px (2x deviceScaleFactor).
- Visually check the exported PNGs and fix them before delivering; organize output by campaign.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill says (senzu/senzu.json → package.json). The outputs are framework-agnostic static assets (PNG, SVG, HTML); in React/Vue/Astro SVG icons are imported as components or from `public/`. Inject the `brand` context first if the project has it.
