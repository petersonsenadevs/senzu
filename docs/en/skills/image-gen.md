---
name: image-gen
description: "Generate AI images consistent with the website: floating product, heros, backgrounds, 3D, mockups. FIRST the host's native generation (ChatGPT/Codex app, Antigravity); scripts/generate.mjs via API only if there is none. Palette and style from the design system."
origen: core/skills/image-gen/SKILL.md
huella: 96b6c67d7d61
---

# image-gen (Senzu)

Generates images **that match the website** (never generic): the palette, mood and style come from
`senzu/design-system/<slug>/MASTER.md` (or BRAND.md) and go into the prompt. Recipes per image type in
`references/prompt-recipes.md`; which tool depending on your agent in `references/tools-by-agent.md`.

## 1. RULE 0 — does your environment already generate images? Use it directly, no script
Check FIRST whether the host has native generation; if it does, give it the recipe's prompt as is
and skip the script (faster, no keys, no extra processing):

| Environment | How it generates |
|---|---|
| **ChatGPT/Codex app** (Windows/Mac: agent + chat + images) | **NATIVE**: generates the image directly with the recipe's prompt. Do NOT look for the API or the script |
| **Antigravity** | **NATIVE**: Nano Banana Pro (Gemini 3 Pro Image) built into the IDE; recipe prompt directly |
| Codex CLI / Claude Code / Cursor / Windsurf (no native generation) | `node <skills-dir>/image-gen/scripts/generate.mjs "<prompt>"` — `--provider openai` (default, `OPENAI_API_KEY`) \| `gemini` \| `fal` |

Native or script, the rest of the skill applies EQUALLY: recipe + design system tokens + post-processing.
No native generation and no key → tell the user which one to export (`OPENAI_API_KEY`/`GEMINI_API_KEY`/`FAL_KEY`)
and do NOT improvise stock images as if they were generated.

## 2. Mandatory flow
1. **Image brief** (1 line each): which section it is for, type (floating product, hero bg, mockup,
   3D, texture, illustration), what it must convey, and where it goes (size/aspect of the REAL slot in the layout).
2. **Tokens → words**: turn the design system palette into prompt language
   ("deep green #046a53 and mint accents, dark charcoal background") + the MASTER.md mood
   ("clean, industrial, trustworthy"). The image must look like it belongs to the SAME site as everything else.
3. **Recipe**: open ONLY the type's section in `references/prompt-recipes.md` and fill in its template.
4. **Generate** (2-3 variants): `node scripts/generate.mjs "<prompt>" --size 1536x1024 --n 2 --out hero.png`.
5. **Post-processing**: crop/cleanup, **compressed WebP/AVIF** (squoosh/sharp), exact dimensions of the
   slot, descriptive `alt`. Transparent backgrounds: `--background transparent` (openai) or remove.bg.
6. **Verify consistency**: put it ON the page alongside everything else (do not judge it on its own) and run `ui-verify`.

## 3. Which model for what (if you can choose the provider)
| You need | Use |
|---|---|
| Follow fine style/palette instructions, edit an existing image | gpt-image (openai) — the script's default |
| Pure photorealism (product, "real photos") | FLUX (`--provider fal`) or Imagen/Nano Banana |
| Legible text INSIDE the image (banners with a claim) | Ideogram (via fal) or Nano Banana Pro |
| Icons, vector illustration, brand system | Recraft V3 (via its own API/fal) — consistent style |
| UI mockups to show the client | Antigravity + Nano Banana Pro (makes them natively) |

## 4. Hard rules
1. **No AI images pretending to be the client's real ones**: their work, their team or their premises are photographed,
   not generated. An AI image of a "team at work" is used as a generic resource and noted in the devlog.
2. Generated people: no faces of real/famous people; be careful with hands and text (always review).
3. No third-party logos or brands inside the image; the client's logo is composed afterwards, in HTML/SVG.
4. Series consistency: same recipe + same lighting/palette descriptors for all the website's images;
   save the prompts used in `senzu/design-system/<slug>/prompts.md` to reuse them.
5. Every image goes through compression and carries dimensions + `alt`; the hero also gets `fetchpriority="high"`.
6. Cost: gpt-image ~$0.02-0.19/image depending on quality — generate 2-3 variants, not 20.

## 5. Resources
- `scripts/generate.mjs` — multi-provider generator (openai by default; gemini, fal). `--help` for options.
- `references/prompt-recipes.md` — recipes per type with templates (floating product, hero, 3D, mockup…).
- `references/tools-by-agent.md` — details per agent, models, prices and post-processing.
