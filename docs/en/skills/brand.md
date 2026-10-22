---
name: brand
description: "Brand identity: voice and tone, visual identity, messaging, palette, typography, logo, asset validation; syncs brand-guidelines.md to design tokens. Triggers: brand, tone, style guide, compliance. Not for UI/CSS."
origen: core/skills-overlay/brand/SKILL.md
huella: fadd50626f72
---

# brand (Senzu index)

Full upstream documentation (English): `SKILL.upstream.md` (97 lines). **Do not read it all**: use the map and read only the section you need (Read with offset/limit or Grep).

## When to use / when NOT
- Use: define or update the brand's voice, messaging and style guide (`senzu/design-system/<slug>/brand-guidelines.md`).
- Use: audit consistency, validate asset naming/size/format, compare an image's colors with the palette.
- Use: inject brand context into other skills' prompts (banners, slides, social) or sync the guide to tokens.
- Do NOT use: semantic tokens and CSS vars of a design system → `design-system`; Tailwind/shadcn components → `ui-styling`.
- Do NOT use: generating logos or mockups with AI → `design` (Logo/CIP).

## Minimum reading per task
| Task | Read only |
|---|---|
| Start a new brand | `SKILL.upstream.md` L23-40 (§Quick Start) + `templates/brand-guidelines-starter.md` |
| Update the brand and sync tokens | `SKILL.upstream.md` L42-61 (§Brand Sync Workflow, §Subcommands) + `references/update.md` |
| Define voice or messaging | `references/voice-framework.md` + `references/messaging-framework.md` |
| Review consistency / approve assets | `references/consistency-checklist.md` + `references/approval-checklist.md` |
| Debug a script | `SKILL.upstream.md` L78-85 (§Scripts) and the corresponding `.cjs` |

## Map of `SKILL.upstream.md`
| Lines | Section | What for |
|---|---|---|
| 14-21 | When to Use | Use cases of the skill |
| 23-40 | Quick Start | `node` commands to inject context, validate assets and extract colors |
| 42-55 | Brand Sync Workflow | Flow guide → `design-tokens.json`/`.css` and files involved |
| 57-61 | Subcommands | `update` subcommand → `references/update.md` |
| 63-76 | References | Table topic → reference file |
| 78-85 | Scripts | Purpose of each script |
| 87-91 | Templates | Starter template |
| 93-97 | Routing | How the subcommand is resolved from `$ARGUMENTS` |

## Resources
- `references/voice-framework.md` — voice and tone. `references/messaging-framework.md` — messaging pillars.
- `references/visual-identity.md` — visual identity. `references/logo-usage-rules.md` — correct logo use.
- `references/color-palette-management.md` — palette. `references/typography-specifications.md` — typography.
- `references/asset-organization.md` — naming and folders. `references/approval-checklist.md` and `references/consistency-checklist.md` — audit.
- `references/brand-guideline-template.md` — structure of the guide. `references/update.md` — flow of the `update` subcommand.
- `scripts/inject-brand-context.cjs` — extracts brand context for prompts (`node scripts/inject-brand-context.cjs senzu/design-system/<slug>/brand-guidelines.md [--json]`).
- **`scripts/sync-senzu.mjs` (Senzu)** — guide → `design-tokens.json` and `.css` **next to the guide**, in Claude and in Codex (`node <skills-dir>/brand/scripts/sync-senzu.mjs [--slug x] [--dry-run]`). ALWAYS use it instead of `sync-brand-to-tokens.cjs`: the original has hardcoded paths (`docs/`, `assets/`, `.claude/skills`) and in Codex it does not generate the CSS.
- `scripts/validate-asset.cjs` — validates naming, size and format (`node scripts/validate-asset.cjs <path>`).
- `scripts/extract-colors.cjs` — extracts/compares colors (`node scripts/extract-colors.cjs --brand-file senzu/design-system/<slug>/brand-guidelines.md --palette | <image>`); `scripts/tests/` — regression test (`py -3 -m pytest`).
- `templates/brand-guidelines-starter.md` — full template for new brands. There is no `assets/`.

## Hard rules
- `senzu/design-system/<slug>/brand-guidelines.md` (next to MASTER.md and gustos.md) is the single source of truth; tokens are regenerated with `sync-senzu.mjs`, never by hand. A project with the guide in `docs/` (the skill's old location): it works, but move it.
- Logo already chosen (`senzu/design-system/<slug>/logos/final/`): the guide cites it by its path; no new logos are proposed unless the user asks.
- After editing the guide, run `sync-brand-to-tokens.cjs` and verify with `inject-brand-context.cjs --json`.
- Every new asset goes through `validate-asset.cjs` before being approved; off-palette colors are detected with `extract-colors.cjs`.
- Any creative piece from another skill (banner, slides, social) must inject brand context before designing.

## Integration with the project's stack
- Detect the stack as the `front-activation`/`skill-router` skill indicates (senzu/senzu.json → package.json). Framework-agnostic skill (Node scripts); the generated CSS tokens are consumed the same way in React, Vue, Astro or vanilla. Requires Node in the environment.
