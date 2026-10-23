[← Back to README](../README.md)

# Architecture: how it works inside

The core idea: **you write the rules ONCE** (in `core/` + `stacks/<language>/`) and a renderer
translates them to the format of each tool (Claude Code, Codex, Cursor, Windsurf, Antigravity). You never
maintain the same prompt in 5 places.

## Repo structure

```
senzu/
├── core/                     # Rules COMMON to all languages
│   ├── methodology/          # devlog, git-flow, prohibited actions
│   ├── prompts/              # base systemprompt (inherited by every stack)
│   ├── hooks/                # Node hooks (.mjs, OS-agnostic) — see docs/hooks.md
│   ├── skills/               # own skills (devlog, project-planner, code-quality, deploy-ops, email-html…)
│   ├── skills-vendor/        # third-party skills COPIED by tools/vendor.ps1 (English, DO NOT edit)
│   ├── skills-overlay/       # OUR Spanish layer, copied ON TOP of the vendor at render time
│   ├── skills-plugin/        # routers (skill-router, front-activation): tables GENERATED from the registry
│   ├── skills-registry.json  # SINGLE routing source: group, when, keywords, priority, requires
│   ├── commands/             # slash commands — see docs/comandos.md
│   ├── effects-vendor/       # effect repos with verified license (not in git: vendor-effects.ps1)
│   ├── githooks/             # commit-msg, pre-commit, pre-push (hard layer for ANY tool)
│   ├── perfiles.json         # install profiles: web, backend, front, agente-ia, librería → groups
│   └── bundles.json          # optional skill bundles
├── plugins/                  # GENERATED: the Claude Code and Codex plugins (senzu-all, -front, -backend, -core)
├── .claude-plugin/           # marketplace.json (GENERATED)
├── assets/                   # logos and the article images
├── docs/                     # almost all GENERATED (the website publishes them): skills, hooks, commands, stacks and
│                             # efectos.md + efectos.json (effects and demos catalog, the contract with the website)
├── stacks/                   # ONE folder per stack — see docs/stacks.md
│   └── <stack>/              # stack.json, systemprompt.md (EVOLVING), best-practices.md,
│                             # prohibited.md, mcp.json, rules/ (extensible), settings.partial.json
├── tools/
│   ├── init.mjs              # THE INSTALLER (Node: Windows, WSL, Linux, macOS): menu, profiles, selection
│   ├── init-project.ps1      # The same installer in PowerShell (identical result: test-init-parity)
│   ├── sync.ps1              # Re-renders the config to a project, respecting what was chosen (PowerShell)
│   ├── vendor.ps1            # Updates the upstream skills · vendor-effects.ps1: effects collection
│   ├── build-routers.ps1     # Regenerates the skill-router/front-activation tables from the registry
│   ├── build-plugins.ps1     # Generates plugins/ + marketplace.json
│   ├── build-docs.ps1        # Generates docs/, REFERENCIA.md, CHANGELOG.md and the README badges
│   ├── build-creditos.mjs    # CREDITOS.md from the third-party manifests (and checks licenses)
│   ├── build-efectos.mjs     # docs/efectos.md and efectos.json from the catalog and the demo sheets
│   ├── trafico.mjs           # clones, visits and stars accumulated per day (daily workflow → stats branch)
│   ├── check-skills.ps1      # Checker: fails if something gets disconnected
│   ├── test-router.ps1       # golden cases prompt → skill
│   ├── test-hooks.ps1        # the walls (exit 2 = blocks)
│   ├── test-*.mjs            # the other suites (memory, permissions, close, rounds, geometry, mobile…)
│   ├── install-skills.ps1    # Global skills for Codex/Cursor/Windsurf/Claude
│   └── renderers/            # claude.ps1 · codex.ps1 · cursor.ps1 · windsurf.ps1 · antigravity.ps1
└── templates/                # Templates (devlog, plan, decisions)
```

## What Senzu leaves in each project: everything in `senzu/`
```
<project>/
├── CLAUDE.md · AGENTS.md          # where the agents require them (root)
├── .claude/ · .agents/            # skills, walls (hooks), commands and config of each agent
└── senzu/
    ├── senzu.json                 # marker: stack, profile, selection, permissions, disabled hooks, ramasProtegidas
    ├── conventions.md · .json     # conventions sealed with /adopt
    ├── devlog/                    # MEMORIA.md, INDEX.md, YYYY-MM-DD/NNN-slug.md
    ├── plan/                      # PLAN.md (cards), brief.md, estimacion.md
    ├── auditoria/                 # YYYY-MM-DD-<area>.md (/audit); its cards go to the plan (phase AU)
    ├── arquitectura/              # adr/, contextos/, glosario/, event-storming/, context-map.md (DDD)
    ├── entrega/                   # manual, services and access for the client (/handoff)
    ├── informes/                  # comparisons and reports
    ├── mapa.md                    # project map (/map)
    ├── design-system/<slug>/      # MASTER, gustos, blueprint, brand-guidelines, propuestas/, logos/
    ├── ui-verify/                 # verification screenshots (outside git)
    └── .estado/                   # where the session stopped, for /resume (outside git)
```
If the project already has ITS own folder for something (`docs/adr`, `docs/architecture`, a CHANGELOG), Senzu uses it and
does not duplicate it. What Senzu used to leave in `docs/` (`docs/auditoria`, `docs/entrega`, `docs/MAPA.md`) is moved by the
installers to `senzu/` with `git mv` on update.

## Cards are closed with evidence
All work with several steps goes to `senzu/plan/PLAN.md` as cards (the plan cards and the ones that come from an
audit, phase `AU`). Each card has a **«Para qué»** (what for): the user's goal, or the finding it fixes.
The `tarjeta-guard` wall does not let it move to `[done]` without **«Verificado»** (the real evidence; in an audit card,
the same evidence that showed the failure), **«Cumple»** (how it meets its «Para qué») and a **«Devlog»** that exists.

## Main branches
No direct commit and no agent push to a main branch: `main`, `master`, `trunk`, `develop`, `dev`,
`staging`, `stage`, `preprod`, `production`, `prod`, `live`, `qa`, `uat`, `release` and `release/…`,
`production/…`, `staging/…` (a push to staging or production also deploys), plus the ones the user adds
in `"ramasProtegidas"` of the marker. One single list (`ramaProtegida()` in `lib.mjs`) for guard, cierre-limpio and
session-start, the same one in the githooks. Only the user opens it, with `pushMain` / `commitEnMain`.

Outside `main` lives the **`stats`** branch: data only (the traffic history and the badges). The
`trafico.yml` workflow writes it every day, and the README and the website read it from there.

## Guided start: the next step of the method
`siguientePaso()` in `lib.mjs` answers «what stage is this project at?». It is shared by `session-start` (which
announces it first) and the `arranque-guard` wall (which does not let code be written without it). Order: **install** (there is no
`senzu/senzu.json`) → **adopt** (there is code or history, ≥5 commits, and no sealed convention) → **brief**
(new project with a front profile and no real brief) → **plan** (new project with no real cards) →
**next** (there are cards: it is only announced). The templates the installer leaves do not count: a card
«X-T1 …» or «<Verbo + objeto>» is not a plan, and a brief with «…» in the Objective is not a brief.

Two levels. **install** and **adopt** block: the wall stops once per step and session, only code and
manifests (never `senzu/`, `CLAUDE.md`, `AGENTS.md`, `.claude/` or the documentation). This forces the agent to propose the
step without leaving the user stuck. **brief** and **plan** do not block (not every project needs them): the session and
the first code edit remind the agent that it has to know what is going to be done and, if the user has not
said it clearly, talk it through before coding; `/plan` only if it is something big or the user wants it. The steps the
user does not want in a project go in `"omitirPasos"` of the marker (`init.mjs --omitir-paso`); the guard does not
let the agent skip it, and both installers keep it on reinstall (like `ramasProtegidas`).

## Sealed conventions: immutable by any path
What `/adopt` seals (`conventions.md` and `conventions.json` with `senzu:inmutable`) has four layers:
`protect-files` (editing, also Codex's `apply_patch`), `conventions-guard` (code that breaks a rule),
`guard` (the terminal: write, move, delete or restore) and the `pre-commit` githook (no commit changes or
deletes what is sealed without `SENZU_ALLOW_CONVENCIONES=1`, the user's key that the guard does not let the agent use).
`protect-files` and `conventions-guard` cannot be turned off from the marker.

**Paths**: every path a hook compares goes through `rutaNativa()` / `relDelProyecto()` from `lib.mjs` (and
`readHookInput()` already delivers a normalized `file_path`). On Windows they arrive mixed (`C:\`, `C:/`, `c:\`, `/c/`
from Git Bash, with trailing slash); comparing them as text made these two walls block nothing (092).
`test-convenciones` tests every combination.

## Up-to-date version and walls without false positives
`estadoVersion()` (lib.mjs) compares the version the session runs (the `plugin.json` next to the hooks) with, in
order: the one registered in `installed_plugins.json` (→ open a new session), the one in the downloaded marketplace
(→ `/plugin update`) and the one on GitHub (→ update the marketplace; 24 h cache in `~/.config/senzu/`, 1.5 s,
`SENZU_SIN_RED=1`). The news it shows are the ones in `core/novedades.json` between the current version and the
offered one; `test-version` requires one line per published version.

A wall that stops without reason teaches the agent to go around it. `test-falsos-positivos` keeps every unfair block
seen (and the attack the fix must not open): the guard looks at the TARGET of each command (reading the marker is not
writing it), the installer menu is recognized within the same line, the permission flags are accepted only
in test projects in the temp folder, depurar-coach only fires when RUNNING a verification and
code-hygiene does not check the agent's temporary scripts.

**Quoting is not doing.** The guard looks at the command without the text that is only data (`sinTextoCitado()` in lib.mjs):
messages of `-m`/`--body`/`--title`, heredocs that go to `cat`/`tee`, arguments of `echo`, `printf`, `grep` or
`git log`, and PowerShell here-strings used as a message. Everything that is executed is kept: heredocs and
`echo` that feed an interpreter (bash, node, python, psql…), `bash -c`, `eval`, strings with `$(…)` or
backticks, and the path after a redirection. The commit message (format and Co-Authored-By) is validated
against the original command. In files, `testIntroduced(…, codigo)` searches the code without comments
(`soloCodigo()`): code-hygiene also without strings (but with the code of `${…}` in templates);
conventions-guard and backend-guard keep the strings, because their rules can be about them (raw SQL,
`env('X')`). secrets-guard does not change: a real key in a comment is still a leak.

## The method chain and the backend walls
`siguientePaso()` has three levels: **block** (install, adopt), **talk** (new project without a plan:
know what is being done or ask) and **announce** (`/next` with the card, `/plan` in an existing project
without a plan, and with the plan finished `/verify → /launch → /deploy → /handoff`, without `/launch` if there is no
interface). Each command ends with «## Al terminar» (the next step) and check-skills (12b) requires it. The
verdict of `/launch` is LISTA everywhere; APTA is the verdict of the ui-verify visual critique.

What counts as backend, test and migration has a single definition (`esCodigoBackend`, `esTest`, `esMigracion` in
lib.mjs) shared by back-skill-reminder, backend-guard and feature-guard; the scripts in `tools/` and `scripts/` are not
app backend. **backend-guard** (on write) blocks migrations without an honest `down()` (Laravel, Knex,
Sequelize, TypeORM, Alembic; Prisma and SQL have no down), mass assignment and swallowed errors, and warns about
several writes without a transaction (once per file). **feature-guard** (on close, once per set of
files) requires a test if backend was touched, the migration run and its rollback tested (it records the `migrate` commands that
run and does not count the ones that fail) and the new keys in the nearest `.env.example` (`lineasAnadidas()`
with git: only what is new). protect-files already allows editing `.env.example`. Subagent reports are not routed
and not recorded as user corrections (`esMensajeDelUsuario`).

## Declared architecture
`senzu/arquitectura/capas.json` says which architecture the project has: layers (paths with `*` and `**`), what each
one can use (`puede_usar`), which packages are forbidden to it (`prohibido`), the controllers (regex for the ORM and
the DTO), the DDD bounded contexts (`rutas`, `publico` layer, `compartido` core) and the `excepciones`. Nine
templates in `code-quality/arquitectura/` (mvc-servicios, hexagonal, ddd-hexagonal × laravel, node, python).
The logic is in lib.mjs (`importsDe`, `resolverImport` with PSR-4, tsconfig aliases and Python modules,
`infraccionesArquitectura`) and it is shared by `arquitectura-guard` (what each change introduces; cannot be turned off) and
`code-quality/scripts/arquitectura.mjs` (`--detectar`, `--plantilla`, `--comprobar` for the whole project,
`--sellar`). Once sealed, it is protected by protect-files, the guard and the pre-commit, like the conventions. Without
`capas.json` nothing is applied: no architecture is imposed on someone who has not chosen one.

## Install profiles
`core/perfiles.json` answers «what is the project?» with a set of skill groups. A profile is a
named selection by categories: it is saved in `senzu/senzu.json` and every update respects it, with
`init.mjs` or with `sync.ps1`. The rule that matters: **if the selection has no front groups, nothing
front-related is installed** even if the stack brings it (Laravel or Next with a backend profile): not the skills, not the design wall,
not the design commands, not the front sections of `CLAUDE.md`/`AGENTS.md`. Both installers do it
the same way (`seleccionSinFront` / `Test-SeleccionSinFront`) and the parity test checks it.

## Two agents in the same repository
`edit-tracker` records which files each session touches (in Codex, by translating `apply_patch`). With that:
- `cierre-limpio` does not let you close with **own** files uncommitted (or what was done is committed and what is
  missing is stated), and warns about **other** files without touching them: they may be from Codex, another Claude session or the user.
- `session-start` names at the start what is half-done, so nobody works blindly on top of it.

## Single registry and checker (everything connected)

- **`core/skills-registry.json`** is the single source of "which skill is used": per skill, `group`, `when`,
  `keywords` (prompt-router regex), `priority` (the specific one wins), `requires` and `installedBy`.
  From it come: the activation tables of `CLAUDE.md`/`AGENTS.md`, the router rules
  (`config.json → router`), the generated tables of `skill-router`/`front-activation` and `docs/skills.md`.
- **`tools/check-skills.ps1`** (11 checks) fails if: a skill is not in the registry (or the other way round); a
  `SKILL.md` goes over 100 lines or its `description` over 250; a cited reference does not exist; a
  `skill §section` citation does not resolve; the generated tables are out of date; a plugin/bundle does not
  satisfy `requires`; the card examples are not parsed by the real regex of the hooks.
- **Single contracts**: task card (one regex in `core/hooks/lib.mjs`), devlog
  (`senzu/devlog/<date>/NNN-slug.md`), design system (`senzu/design-system/<slug>/MASTER.md`), `hooks/config.json`
  (same keys for project and plugin).
- **The repo protects itself**: `.githooks/` with commit-msg (Conventional ≤72, no co-authors) and
  pre-commit that regenerates plugins+docs and runs the 3 suites before accepting the commit.

## The plan rules: `project-planner`

With dozens of skills and walls, something has to decide **what is done, in what order and with which skill**:

- `senzu/plan/PLAN.md` with **deliverable phases** (walking skeleton first) and **small tasks**
  (`F1-T2 · title [S] [todo]`), each with the skill+section to read, "done when" and verification.
  Only one `doing` task at a time.
- The hooks read it: `session-start` shows progress and what comes next, `stop-guard` requires closing the
  task with a devlog, `pre-compact` keeps the state when the context is compacted.
- The "soul" is three pieces: **principles** (`core/prompts/base-systemprompt.md`), **`skill-router`**
  (what to read) and **`project-planner`** (what to do and in what order).

## Context discipline (why it does not eat the agent's window)

What is **always** loaded is small; the big stuff is read **on demand and by sections**:

| Layer | Size | When it is loaded |
|---|---|---|
| Generated rules (`CLAUDE.md`/`AGENTS.md`) with the activation tables | ~300 lines | always |
| `description` of each installed skill | ≤ 250 characters | always |
| Effective `SKILL.md` (own or ES overlay) with its "Minimum reading per task" table | ≤ 100 lines | only when the task fits |
| `SKILL.upstream.md` and `references/` | large | only the indicated section (offset/limit or Grep) |

Protocol: one skill per task, only its minimum section, nothing is read whole, nothing is re-read.

## Vendor + overlay layers (third-party skills without losing upstream)

The front skills are the real repos [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
and [Claude Design Skillstack](https://github.com/freshtechbro/claudedesignskills) (MIT), vendored:

| Layer | What it contains | Who edits it |
|---|---|---|
| `core/skills-vendor/<skill>/` | Full upstream copy + `LICENSE.upstream`; `VENDOR.json` records repo/commit | Nobody: `tools/vendor.ps1` |
| `core/skills-overlay/<skill>/` | `SKILL.md` in Spanish, `references/es/` (brief, proposals, tastes, anti-AI, fonts/icons, inspiration, copywriting…), own templates and CSVs | Us |

At render time they are merged (overlay ON TOP of the vendor). Updating upstream (`vendor.ps1`) never overwrites
our own layer. The same pattern applies to the effects catalog (`core/effects-vendor/`, 124 MIT repos
with the code downloaded and indexed).

## How each tool detects the front

1. **SKILL.md description** with explicit triggers: Claude/Codex/Cursor use it to auto-invoke.
2. **Generated "Front y diseño" block** in the rules: stack profile + activation table —
   the guarantee for tools without hooks.
3. **Claude Code hooks**: reminder on the first UI edit + wall if there is no brief or design
   system + mandatory mobile verification on close (see [docs/hooks.md](hooks.en.md)).

Design search inside a project:
```bash
py -3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech dashboard" --design-system -p "Mi App" --persist -o .
# macOS/Linux: python3 …
```

## Parity between tools

| | Claude Code | Codex / Cursor / Windsurf / Antigravity |
|---|---|---|
| Rules + activation tables | CLAUDE.md | AGENTS.md / .cursor/rules / .windsurf/rules |
| Skills | .claude/skills/ | .agents/skills/ · .cursor/skills/ · .windsurf/skills/ |
| Live walls (hooks) | ✔ | — (covered by the githooks + the rules) |
| Slash commands | ✔ | — (equivalent plain-language phrases: USO.md §4) |
| Project's own guide | CLAUDE.project.md imported | AGENTS.project.md referenced |

## Versions

One numbering for everything: the version you see in Claude and in Codex is the git tag.

| Type of change | Version | How it is published |
|---|---|---|
| Batch of features | bumps the second number (1.1.0 → 1.2.0) | `SENZU_RELEASE=1.2.0 git commit …` and then `git tag -a v1.2.0` |
| Fixes | bumps the third (1.1.0 → 1.1.1) | same, with `SENZU_RELEASE=1.1.1` and tag `v1.1.1` |
| Breaking change (forces a reinstall) | bumps the first (2.0.0) | same |

Between two releases, each commit bumps only the third number (last tag + commits since it), so
`/plugin marketplace update` always detects that there is a new version. The `CHANGELOG.md` is generated from the
devlog; on GitHub, each tag can have its Release with that part of the changelog.
