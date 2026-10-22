---
name: slides
description: "Creates strategic HTML presentations (pitch deck, sales, demo) with Chart.js, design tokens, responsive layouts and copywriting formulas. Triggers: slides, deck, presentation, pitch. Not for PPTX/Google Slides or standalone charts."
origen: core/skills-overlay/slides/SKILL.md
huella: 4fdf6cf989b9
---

# slides (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (40 lines). **Don't read it all**: use the map and read only the section you need (Read with offset/limit or Grep). All the real content is in `references/`.

## When to use / when NOT
- Use: pitch deck (YC seed, sales, product demo) in self-contained HTML with a narrative and slide structure.
- Use: slides with data (Chart.js) and predefined layouts (title, two columns, features grid, metrics dashboard).
- Use: write slide headlines and copy with formulas (AIDA, PAS, etc.).
- Do NOT use: charts or dashboards outside a presentation → `dataviz` skill; full brand package with logo/CIP → `design`.
- Do NOT use: exporting to PPTX/Keynote (the upstream only produces HTML).

## Minimal reading per task
| Task | Read only |
|---|---|
| Start a presentation | `SKILL.upstream.md` L21-25 (§Subcommands) + `references/create.md` + `references/slide-strategies.md` L5-24 |
| Choose the deck structure | `references/slide-strategies.md` L25-74 (§Common Structures, §Duarte Sparkline) |
| Lay out a slide | `references/layout-patterns.md` L5-23 (selection) and L24-98 (CSS) |
| Base template and Chart.js | `references/html-template.md` L5-203 (base) and L204-238 (§Chart.js Integration) |
| Write the copy | `references/copywriting-formulas.md` |
| Debugging / performance | `references/html-template.md` L239-295 (animations, backgrounds, CSS variables) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 14-19 | When to Use | Use cases |
| 21-25 | Subcommands | `create` → `references/create.md` |
| 27-34 | References (Knowledge Base) | Topic → file table |
| 36-40 | Routing | Resolving the subcommand from `$ARGUMENTS` |

## Resources
- `references/create.md` — prompt for the `create` subcommand (4 lines).
- `references/slide-strategies.md` — strategy selection, YC/sales/demo structures, Duarte's Sparkline pattern, how to match strategy and context.
- `references/layout-patterns.md` — layouts by use case, CSS structures, card/metric variants, visual treatments and decision tree.
- `references/html-template.md` — base HTML structure, Chart.js integration, animation classes, backgrounds, CSS variables.
- `references/copywriting-formulas.md` — headline and body formulas for slides.
- There are no `scripts/` or `assets/`.

## Hard rules
- One message per slide; choose the strategy (YC 10 slides, sales 9, demo 6) before laying out.
- Use the project's design tokens (CSS variables from `html-template.md`), not hardcoded colors.
- Chart.js only when the data adds something; every chart with a title and readable labels, with no more than one highlighted series.
- Responsive layouts with the structures in `layout-patterns.md`; animations only with the provided classes and respecting `prefers-reduced-motion`.
- Copy with an explicit formula (`copywriting-formulas.md`): short headline + one supporting idea.

## Integration with the project stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). The output is a static HTML independent of the framework; if the project has `assets/design-tokens.css` (`brand`/`design-system` skill), link it instead of redefining variables.
