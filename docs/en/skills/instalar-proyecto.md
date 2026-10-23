---
name: instalar-proyecto
description: "Installs or updates Senzu in the current project (clones the package, detects the stack, asks what the project is: website, backend, front end, AI agent or library, or custom, and runs the installer). Use it with /install or when asked to install Senzu."
origen: core/skills/instalar-proyecto/SKILL.md
huella: 29f156733246
---

# instalar-proyecto (Senzu)

Turns the plugin installation into the FULL installation of the project: stack rules in
CLAUDE.md or AGENTS.md, skills, walls, commands, configuration, `senzu/devlog/` and `senzu/plan/`, all versioned with
the project. Project installed with the old version (devlog/, plan/, design-system/ and
`.dev-standards.json` at the root): the installer migrates it to `senzu/` on its own with git mv (keeping the
history). Warn the user beforehand, and afterwards tell them what was moved and that they should check their own documents if they cited
those paths; if they don't want to move it, `--sin-migrar`. If the project is already installed (`senzu/senzu.json` exists), the same process
updates it respecting the saved selection. Don't touch anything else in the project in this task.

## Steps, in order

1. **Locate the package** (the first one that exists): the folder in the SENZU_HOME environment variable
   (or the old DEV_STANDARDS_HOME), then `.senzu` inside the user's folder, then
   `.dev-standards` inside the user's folder (old installations).
   If none exists, clone it into `.senzu` inside the user's folder (absolute path):
   `git clone https://github.com/petersonsenadevs/senzu.git <carpeta-del-usuario>/.senzu`.
   If it exists, update it with `git -C <paquete> pull --ff-only` (if it fails due to network or permissions, carry on with
   the local copy and say so).
2. **Detect the stack** (unless the user has said it): `laravel/framework` in composer.json →
   `laravel` · wp-includes folder → `wordpress` · in package.json: next → `next`, nuxt → `nuxt`,
   @sveltejs/kit → `sveltekit`, astro → `astro`, vue without a meta-framework → `vue-ts`, express or @nestjs →
   `node-api` · pyproject.toml → `python-langgraph`. If torn between two, ask with a proposal.
3. **Confirm in a single question**: stack, tools (Claude, Claude + Codex or Codex only), **language of
   Senzu's notices** (walls, start, close: English by default or Spanish; if the user writes to you
   in Spanish, propose Spanish) and, if the project already has its own CLAUDE.md, AGENTS.md or journal, what
   to do with them (backing up and importing is the sensible default).
4. **Ask what the project is** (closed options, from the package's `core/perfiles.json`; if they already
   said it, don't ask; propose the one that fits what you see):
   - **Full website** (front end and backend): everything for the stack.
   - **Backend** (API, services, server tools without their own web interface, such as a pentesting
     agent or a scraper): no front-end anything, no design skills, walls or commands.
   - **Front end** (landing, marketing website, interface on top of someone else's API).
   - **AI agent** (LangGraph, tools, RAG) without its own web interface.
   - **Library, package or CLI**.
   - **Let me choose**: everything, by categories (front end, animation, 3D, quality, architecture, marketing and SEO,
     operations, graphic design) or custom (skills, walls and commands one by one; if they don't know the names,
     show them the package's `docs/skills.md`, `docs/hooks.md` and `docs/comandos.md`, one sentence per item).
   The core (plan, devlog, quality and routing) is always included. If they prefer a menu, they can run
   `node <paquete>/tools/init.mjs` without arguments themselves in a terminal.
5. **Run the installer** (Node, the same on Windows, WSL, Linux and macOS):
   `node "<paquete>/tools/init.mjs" --stack <stack> --path "<raíz-del-proyecto>" --tools claude`
   and, depending on the choice: `--perfil web|backend|front|agente-ia|libreria` · `--seleccion categorias --grupos
   front,motion` · `--seleccion a-medida --solo-skills a,b --hooks guard,stop-guard --comandos plan,verificar`.
   Add `,codex` to `--tools` if they use Codex. **Language**: `--lang es` if they asked for Spanish (English by default;
   don't pass it for English). To change a saved selection, pass the new one.
   Cursor and Windsurf only with the PowerShell version on Windows (`tools/sync.ps1`). Don't invent other
   paths or scripts.
   **Permissions and disabled hooks** (`--permitir`, `--apagar-hooks`): the user decides them and the wall
   blocks you from passing them. Give them the command to run themselves (in Claude Code, prefixed with `!`),
   e.g. `! node "<paquete>/tools/init.mjs" --path . --permitir push`, or have them use the menu.
6. **Close**: summarize what was installed (skills, walls, commands, backed-up guide if there was one) and ask to
   **open a new session** so it loads the project configuration.
