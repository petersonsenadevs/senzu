<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/senzu-horizontal-color-oscuro.svg">
    <img alt="Senzu" src="assets/logo/senzu-horizontal-color-claro.svg" width="360">
  </picture>
</p>

# Senzu

[Español](README.md) · **English**

*One seed and the project recovers.* (Formerly **dev-standards**.)

**The agency's working standard turned into an executable system for AI agents.**
You write the rules ONCE and they travel to Claude Code, Codex, Cursor, Windsurf and Antigravity — with
skills that activate on their own, walls that actually block and mandatory verification before anything
is considered done.

<!-- GEN:resumen -->
![Version](https://img.shields.io/badge/version-v2.24.2-black) ![Skills](https://img.shields.io/badge/skills-45-blue) ![Stacks](https://img.shields.io/badge/stacks-9-green) ![Plugins](https://img.shields.io/badge/plugins_Claude-4-purple) ![Walls](https://img.shields.io/badge/walls-28_hooks-red) ![Commands](https://img.shields.io/badge/commands-24-orange) ![Language](https://img.shields.io/badge/language-English%20%7C%20Espa%C3%B1ol-yellow) ![Clones](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fpetersonsenadevs%2Fsenzu%2Fstats%2Fbadge-clones.json)

| Group | Skills | Entry point |
|---|---|---|
| **Planning** (1) | project-planner | `project-planner` |
| **Routing** (3) | front-activation, instalar-proyecto, skill-router | `skill-router` |
| **Code quality** (3) | backend-audit, code-quality, depurar | router |
| **Architecture** (1) | ddd-hexagonal | router |
| **Documentation** (1) | devlog | router |
| **Front end and design** (7) | design-system, image-gen, modern-web-design, tanstack… | `ui-ux-pro-max` |
| **Animation** (9) | animated-component-libraries, animejs, barba-js, gsap-scrolltrigger… | router |
| **3D / WebGL** (12) | aframe-webxr, babylonjs-engine, blender-web-pipeline, lightweight-3d-effects… | router |
| **Graphic design and branding** (4) | banner-design, brand, graphic-design, slides | router |
| **Marketing and SEO** (2) | email-html, marketing-seo | router |
| **Operations and deployment** (1) | deploy-ops | router |
| **Security** (1) | security | router |
<!-- /GEN:resumen -->

## Quick install

```text
# 1) Claude Code — plugin from the marketplace (any machine/OS):
/plugin marketplace add petersonsenadevs/senzu
/plugin install senzu-all@senzu          # the WHOLE package (recommended)
#   lighter packs if you don't want everything: senzu-front, senzu-backend, senzu-core

# 2) ...and from the plugin, the project install in one command:
#    (open Claude or Codex in your project and type)
/install                     # detects the stack and asks what the project is: web, backend, front end,
                             # AI agent or library (a backend gets nothing front-end related)

# Global skills for Codex / Cursor / Windsurf (Windows PowerShell):
irm https://raw.githubusercontent.com/petersonsenadevs/senzu/main/tools/install.ps1 | iex

# From the terminal, without an agent (interactive menu or with options; Windows, WSL, Linux and macOS):
git clone https://github.com/petersonsenadevs/senzu.git $HOME/.senzu
node $HOME/.senzu/tools/init.mjs                                         # menu
node $HOME/.senzu/tools/init.mjs --path ./mi-api --perfil backend        # no menu
```

The plugin is installed for you across all your projects (scope `user`) or for the whole team of a repository
(`--scope project`).

Requirements, updating and every install route in detail: **[INSTALL.en.md](INSTALL.en.md)**.

---

## The walls actually block (they don't "recommend")

Dangerous things are not politely requested from the agent: a hook **denies** them, with the reason, before they happen.

```text
> git push origin main
[BLOCKED by Senzu] git push is forbidden without explicit approval.

> netlify deploy --prod
[BLOCKED] PRODUCTION deploy detected. Requires explicit user approval
(/deploy checklist: verified fresh backup + rollback plan + post-deploy smoke test).

> it.only('calcula el total', ...)
[BLOCKED] You are adding .only to a test: a focused test that reaches CI
silently disables the suite.

> <span class="badge">AGENDA ABIERTA ESTE MES</span>
[BLOCKED] Availability badge: fake urgency that gives away an AI-made website.
Blacklist: anti-ia.md (what to use instead).
```

And it doesn't leave work half-done, or step on another agent's work:

```text
[senzu] You are leaving 2 file(s) you touched in this session uncommitted: src/pago.ts, src/pago.test.ts.
Don't close with work half-done: either finish the task and commit it, or commit it anyway and say
WHAT IS MISSING. There is also 1 file(s) with changes you did NOT touch in this session (api/informe.py):
they may belong to another agent (Codex or Claude in another session). Don't commit or discard them without asking.
```

If you work with Claude and Codex at the same time in the same repository, each one knows which files are its own.

And it doesn't consider anything done without proof, nor does it touch the main branches:

```text
> (mark card AU-T1 as [done])
[BLOCKED by Senzu] A card does not move to [done] without proving it is correct and that it does what was intended.
  - AU-T1 · Authorize access to orders: missing «Verificado:» with the evidence; «Cumple:» saying how
    it meets its «Para qué» (H-03 from the audit: a customer sees another customer's orders); closing «Devlog:»

> git push origin staging        (in a project that DOES allow push to working branches)
[BLOCKED by Senzu] git push is forbidden without explicit approval. (… to a main branch
(main, develop, staging, production, release/…), additionally "pushMain": true. The user decides, not the agent.)
```

Also: secrets in code, new `console.log` calls, already-deployed migrations, generated files,
`rm -rf`, `chmod 777`, `curl|bash`, conflict markers, client vetoes in `gustos.md`…
**→ All the walls, one by one, with their escapes: [docs/hooks.en.md](docs/hooks.en.md)**

## You ask in plain language, the agent knows what to read

No invoking skills by hand: a router with every skill registered detects the task and loads ONLY the
section it needs (context discipline: nothing is read in full).

| You say… | The agent uses… |
|---|---|
| "build the clinic's landing page" | `ui-ux-pro-max` — and BEFORE that it interviews you (brief) and shows you 2 A/B mockups |
| "users create duplicate orders with a double click" | `code-quality` → idempotency and race conditions recipe |
| "set up the Stripe webhook" | `code-quality` → integrations (signature verification, retries, idempotency) |
| "dockerize the project and ship it" | `deploy-ops` → multi-stage Docker + deploy checklist (and the production wall) |
| "add a chatbot that answers with our docs" | `code-quality` → llm-apps (RAG, streaming, costs, evals) |
| "it looks broken on mobile" | `ui-verify` → 375px-first verification with Playwright: geometry in px, menu actually used, annotated screenshot + visual critique |

**→ All the skills by group, with the signals that trigger each one: [docs/skills.en.md](docs/skills.en.md)**

## It knows which project it is in

- **Real versions**: detects Laravel 11, React 19, Python 3.12… (in monorepos too) and applies the
  practices of THAT version — with a warning if something is unsupported (EOL).
- **New vs inherited**: empty project → brief (if it has an interface) + plan; project with code → `/adopt`
  analyzes its real style, agrees it with you and **seals it as immutable** (a hook blocks code that violates it).
  And it can't be skipped: a wall stops the first line of code if installing or adopting is missing. Plan and brief are not
  imposed: if the agent doesn't know what is going to be done, it asks you before coding.
- **Respects what's already there**: your `CLAUDE.md`/`AGENTS.md`, your journal, your plan — it asks before adapting.
- **Remembers**: the project's decisions reach every session; your usual rules, all your
  projects; if you correct it, it writes it down (or it can't close); before touching a file it knows what was decided
  about it; and the next session knows where the previous one left off (`/resume`). With a real devlog of 88 entries
  it finds the right decision among the top three in 20 out of 20 questions asked bluntly.

## Guided design (and no AI smell)

Jargon-free interview (`/brief`) → approvable blueprint → **2 A/B mockups** you can see →
build with a checkpoint per section → mobile-first verification → launch checklist.
The **mobile version is designed, not shrunk**: each section decides in the blueprint its order, its effects on
touch, its menu (burger, bottom bar; never kebab for navigation) and its sizes, and it is voted on like any other piece.
Verification **measures in pixels** (centering, loaders, icons, alignment) and on mobile **actually uses the
menu** (opens it, measures the links, tries Escape); each warning comes out numbered on an **annotated screenshot**,
so you can confirm it by looking at it.
Your opinions go into a taste memory with **executable vetoes**, and an **anti-AI blacklist**
(availability badges, section numbering, grey "trusted by", made-up metrics…) is
forbidden by default and watched by hook + visual critique.
And when the brand calls for impact, an **effects catalog** with recipes per stack, including **physics**: an
intro or a loader where your logo falls and the screen shatters into pieces of glass, an object that falls
onto the website and stays resting on it, or a page that crumbles; with working demos, skippable,
with no intro for those who ask for reduced motion, and tested on mobile.

**→ All the commands and the complete flows: [docs/comandos.en.md](docs/comandos.en.md)**

## Documentation

| Document | What you'll find |
|---|---|
| **[docs/guia-de-prueba.md](docs/guia-de-prueba.md)** | **Start here**: install and try everything in an afternoon, test by test |
| **[INSTALL.en.md](INSTALL.en.md)** | Step-by-step install: per project, as a plugin or as global skills; updating |
| **[USO.en.md](USO.en.md)** | Day to day: what is automatic, which phrases trigger each thing, walls and escapes |
| **[docs/skills.en.md](docs/skills.en.md)** | The skills by group: when each one kicks in and with which signals |
| **[docs/comandos.en.md](docs/comandos.en.md)** | The slash commands explained + typical flows |
| **[docs/hooks.en.md](docs/hooks.en.md)** | The hooks/walls: what each one blocks and its escapes |
| **[docs/efectos.en.md](docs/efectos.en.md)** | The effects catalog by category and the working demos (also in `docs/efectos.json`) |
| **[docs/stacks.en.md](docs/stacks.en.md)** | The stacks (+ Go/Java/C#) and the optional bundles |
| **[docs/arquitectura.en.md](docs/arquitectura.en.md)** | How it works inside: single registry, vendor/overlay, context discipline |
| **[REFERENCIA.en.md](REFERENCIA.en.md)** | The whole catalog on ONE page |
| **[CREDITOS.en.md](CREDITOS.en.md)** | The third-party repositories we use, with their author and license |
| **[CHANGELOG.en.md](CHANGELOG.en.md)** | What changed in each version (generated from the devlog) |
| **[ROADMAP.md](ROADMAP.md)** | What is done and what's coming |

> The badges, `docs/`, `REFERENCIA.md` and `CHANGELOG.md` **are regenerated on every commit from the sources
> of truth**: if you add a skill or a hook without documenting it, the build fails. The docs can't lie.

## How it stays healthy

Three suites run on every commit (the pre-commit lets nothing broken through):

- `check-skills.ps1` — connectivity: registry ↔ skills 1:1, size limits, citations that resolve, no figures
  written by hand and no private names in public content.
- `test-router.ps1` — golden cases of "user phrase → correct skill".
- `test-hooks.ps1` — the walls: what must be blocked is blocked; what is legitimate passes.

And on GitHub (CI, on every push), additionally: parity between the two installers (profiles included), the walls
in Codex, permissions, memory, mockup rounds, the clean close between two agents, traffic, and in a
real browser the pixel geometry, the mobile version and the physics effects.

## Philosophy in one sentence

The agent doesn't "try to remember" the rules: **the rules live in versioned files, they load
on their own when relevant, and what matters is blocked by a hook**. Every real error in a project comes back here
as a rule, wall or test case — the package learns from use.

## Credits and license

Senzu is MIT ([LICENSE](LICENSE)) © 2026 Peterson Sena. It builds on other people's work, above
all [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) and
[claudedesignskills](https://github.com/freshtechbro/claudedesignskills), plus 132 effects
repositories: the full list, with author and license, is in [CREDITOS.en.md](CREDITOS.en.md). Every week
we check whether those repositories have a new version (and that their license hasn't changed) and the
update is proposed in a pull request.
