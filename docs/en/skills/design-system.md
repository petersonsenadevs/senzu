---
name: design-system
description: "Design tokens in 3 tiers (primitive, semantic, component) with generation and validation scripts. Use it AFTER ui-ux-pro-max to formalize the tokens of the already decided design system; in small projects @theme is enough. It does not choose the palette."
origen: core/skills-overlay/design-system/SKILL.md
huella: 930b461b2812
---

# design-system (Senzu layer)

Upstream skill (English): `SKILL.upstream.md` (architecture, scripts, specs, slides system),
`references/token-architecture.md`, `primitive-tokens.md`, `semantic-tokens.md`, `component-tokens.md`,
`component-specs.md`, `states-and-variants.md`, `tailwind-integration.md`, `templates/design-tokens-starter.json`,
`scripts/generate-tokens.cjs`, `scripts/validate-tokens.cjs`. Senzu's own layer: `references/es/tokens-por-stack.md`.
The upstream slides system (`search-slides.py`, `data/slide-*.csv`, Chart.js) is **outside** Senzu's scope.

This is where what `ui-ux-pro-max` decided gets **formalized**: the `senzu/design-system/<slug>/MASTER.md` (style, palette, typography)
becomes a versioned token JSON, generated CSS and verifiable rules. `ui-styling` consumes the tokens.

## 1. When yes / when no
| Situation | What to do |
|---|---|
| Product with several apps/themes, white label, dark mode + high contrast, front team > 3 | **design-system**: 3-tier JSON + generation + validation in CI |
| Landing page or small app with one theme | `@theme` + semantics in `app.css` following `ui-ux-pro-max/references/es/tokens-tailwind.md` is enough; don't set up a pipeline |
| Choosing colors/fonts/style | `ui-ux-pro-max` (`search.py --design-system`) |
| Implementing components | `ui-styling` |
| Presentations/slides | out of scope; ignore upstream section 108-235 |

## 2. Minimal reading per task
| Task | File and lines |
|---|---|
| Understand the 3 tiers and the naming | `SKILL.upstream.md` 25-49; `references/token-architecture.md` 5-27, 137-159 |
| Define primitives (color scales, spacing, typography, radius, shadow, motion, z-index) | `references/primitive-tokens.md` 5-203 |
| Define semantics (background/foreground, primary, muted, status, border/ring) and dark | `references/semantic-tokens.md` 5-101, 162-188 |
| Per-component tokens (button, input, card, badge, alert, dialog, table) | `references/component-tokens.md` |
| State specs (hover/focus/disabled/loading/error) and variants | `references/states-and-variants.md` 5-47, 48-161, 209-241 |
| Anatomy and measurements of base components | `references/component-specs.md` |
| Tailwind integration (CSS vars, HSL/oklch, shadcn) | `references/tailwind-integration.md` 5-58, 115-127, 232-251 |
| Migrating flat tokens and W3C DTCG alignment | `references/token-architecture.md` 186-224 |

## 3. The 3 tiers (dependency rule)
```
primitive  --color-blue-600: #2563eb          raw values; never used in components
semantic   --color-primary: var(--color-blue-600)   purpose; changes with the theme (light/dark/brand)
component  --button-bg: var(--color-primary)        only if the component needs to deviate or be configurable
```
A component consumes semantics (or its own tokens); a semantic references primitives; a primitive references
nothing. Dark mode and themes only redefine the semantic tier.

## 4. Upstream scripts (run with node, no dependencies)
```bash
SK=<skills-dir>/design-system            # .claude/skills · .agents/skills · .cursor/skills
cp $SK/templates/design-tokens-starter.json senzu/design-system/tokens.json    # DTCG starting point ($value/$type)
node $SK/scripts/generate-tokens.cjs --config senzu/design-system/tokens.json -o resources/css/tokens.css   # CSS vars
node $SK/scripts/generate-tokens.cjs --config senzu/design-system/tokens.json --format tailwind             # block for @theme
node $SK/scripts/validate-tokens.cjs --dir resources/js --ignore vendor   # loose hex/px/rem; --fix only suggests
```
- References in JSON with braces: `"$value": "{primitive.color.blue.600}"`; the generator resolves them.
- The validator ignores `node_modules`, `.git`, `dist`, `build`, `.next`; add `vendor`, `public/build`, `storage`.
- Add both commands to `package.json` (`tokens:build`, `tokens:check`) and the check to CI.

## 5. Integration with Tailwind 4 and ui-ux-pro-max
1. `MASTER.md` (color, typography, spacing, radius, shadow, motion sections) → `tokens.json` primitive tier.
2. Semantics with the names `ui-ux-pro-max` requires (`background/surface/border/text/text-muted/primary/accent/
   success/warning/danger`) and the shadcn ones if the project uses them (`--background`, `--foreground`, `--muted`…).
3. The generated `tokens.css` is imported in `app.css`; primitives go into `@theme`, semantics into `:root`/`.dark`
   and are exposed with `@theme inline` (utilities `bg-surface`, `text-text-muted`). Detail: `references/es/tokens-por-stack.md`.
4. Brand changes: edit `tokens.json`, regenerate, never touch components.

## 6. Hard rules
- No loose hex, `rgb()`, px or rem in components: every visual value goes through a token (validated by script/CI).
- Naming `--<category>-<concept>-<variant>-<state>` in kebab-case; no color names in semantics (`--color-primary`, not `--color-blue`).
- Colors in oklch (or HSL) to allow `color-mix()` and alpha; 4.5:1 / 3:1 contrast checked in every theme.
- Every scale has finite steps (4 px base spacing, modular typography, 3-4 radius steps); no ad hoc intermediate values are added.
- One token = one documented purpose (`$description`); orphan tokens are removed.
- Motion tokens (`--duration-fast/normal/slow`, `--ease-*`) shared with `gsap-scrolltrigger`/`motion-framer`.
- `tokens.json` is the source; `tokens.css` is a generated artifact (not edited by hand, but versioned anyway).

## 7. Expected output
Before: which tiers are needed, semantic names, planned themes, where the JSON lives. After: `tokens.json`,
generated CSS, `app.css` integrated, result of `validate-tokens.cjs` and list of migrated values.
