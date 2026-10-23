---
name: banner-design
description: "Designs banners (cover, header, display ad, web hero, print) in HTML/CSS + AI visual and exports PNG at exact size. Triggers: banner, header, social cover, Google Ads, hero. Not for video, full websites or print shops."
origen: core/skills-overlay/banner-design/SKILL.md
huella: 00487d13b543
---

# banner-design (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (196 lines). **Do not read it whole**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: social media covers and headers (Facebook, X, LinkedIn, YouTube, Instagram) at official sizes.
- Use: display ads (300x250, 728x90), web hero or event/print banner with several art directions.
- Use: generating 2-3 style options (minimalist, gradient, bold typography, neon, glassmorphism...) and exporting them to PNG.
- Do NOT use: generic post/story images for social media → `design` (Social Photos); full brand identity → `brand`.
- Do NOT use: video editing or full website design (explicitly out of the upstream's scope).

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a banner from scratch | `SKILL.upstream.md` L28-50 (§Workflow, Step 1-2) + `references/banner-sizes-and-styles.md` |
| Design and generate visuals with AI | `SKILL.upstream.md` L51-100 (§Step 3: Design & Generate Options) |
| Export to PNG and name files | `SKILL.upstream.md` L102-136 (§Step 4: Export Banners to Images) |
| Pick a size or a quick style | `SKILL.upstream.md` L148-179 (§Banner Size Quick Reference, §Art Direction Styles) |
| Review / debug a banner | `SKILL.upstream.md` L181-188 (§Design Rules) |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 15-22 | When to Activate | List of the skill's triggers |
| 24-26 | Prerequisites | On Windows use `python` instead of `python3` |
| 28-146 | Workflow | Full 5-step flow |
| 30-38 | Step 1: Gather Requirements (AskUserQuestion) | Purpose, platform, content, brand, style, quantity |
| 40-49 | Step 2: Research & Art Direction | Pinterest references and choice of 2-3 styles |
| 51-100 | Step 3: Design & Generate Options | HTML/CSS + image generation (Flash vs Pro, aspect ratios, prompts) |
| 102-136 | Step 4: Export Banners to Images | Screenshot with chrome-devtools, compression, path convention |
| 138-146 | Step 5: Present Options & Iterate | How to present the options and iterate |
| 148-162 | Banner Size Quick Reference | Table of sizes per platform |
| 164-179 | Art Direction Styles (Top 10) | Styles and which sector they suit |
| 181-188 | Design Rules | Safe zones, CTA, typography, text ratio, print |
| 190-196 | Security | Scope limits of the skill |

## Resources
- `references/banner-sizes-and-styles.md` — full table of sizes per platform and the 22 art direction styles (118 lines).
- `scripts/` — none; the upstream invokes scripts from other skills (`ai-artist`, `ai-multimodal`, `chrome-devtools`, `brand/inject-brand-context.cjs`) that may not exist in this repo: check before citing them.
- `assets/` — none; output goes to `assets/banners/{campaña}/{estilo}-{ancho}x{alto}.png`.

## Hard rules
- Critical content inside the central 70-80 % of the canvas (safe zones); a single CTA, bottom-right, at least 44 px tall.
- Maximum 2 typefaces; body ≥ 16 px, headline ≥ 32 px; contrast 4.5:1.
- Text below 20 % of the area in ads (Meta penalizes it).
- Print: 300 DPI, CMYK, 3-5 mm bleed.
- The AI-generated visual carries no text ("no text, no letters"); text is overlaid in HTML/CSS.
- Export at the platform's exact dimensions; compress if it exceeds 5 MB.

## Integration with the project's stack
- Detect the stack as described in the `front-activation`/`skill-router` skill (senzu/senzu.json → package.json). The banner is static HTML/CSS independent of the framework; if the project has brand tokens (`assets/design-tokens.css`) use them instead of ad hoc colors, and for palette/voice refer to `brand`.
