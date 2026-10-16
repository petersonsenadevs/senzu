# Install Senzu (Claude Code and Codex)

> After installing, the day-to-day guide (what is automatic, commands, flows) is in [`USO.en.md`](USO.en.md).

Senzu installs at two levels:

1. **In your agent** (once per machine): the Claude Code or Codex plugin. With that you already have the
   skills and the `/install` command.
2. **In each project**: `/install` puts the rules (`CLAUDE.md` / `AGENTS.md`), the walls
   (hooks), the commands and the `senzu/` folder with the plan, the devlog and the memory into the project. The walls only act
   in installed projects.

**Requirements:** Node 18 or later and Git. Python 3 is optional (the ui-ux-pro-max design search
uses it). Works on Windows, WSL, Linux and macOS.

## 1. Recommended: plugin + `/install` (no cloning)

### Claude Code
Inside Claude Code:
```
/plugin marketplace add petersonsenadevs/senzu
/plugin install senzu-all@senzu
```
`senzu-all` is the full package (recommended). There are lighter versions: `senzu-front`, `senzu-backend`
and `senzu-core` (the minimum: devlog, router and walls).

**Where does it install? (the scope).** When installing, Claude Code asks who the plugin is for:

| Scope | Where it goes | For whom |
|---|---|---|
| `user` (recommended) | your user folder (`~/.claude`) | You, in all your projects |
| `project` | the repository's `.claude/settings.json` (goes into git) | The whole team that clones the repository |
| `local` | `.claude/settings.local.json` (not in git) | Only you and only in that repository |

From the terminal you choose it with `--scope`: `claude plugin install senzu-all@senzu --scope project`.
The usual choice is `user` and then `/install` in each project; `project` makes sense if you want your whole
team to have Senzu when they open the repository, without installing anything. Uninstall: `claude plugin uninstall
senzu-all@senzu` (with `--scope` if it was not `user`).

### Codex
In the Codex app: add the `petersonsenadevs/senzu` marketplace, install `senzu-all` and **approve the
hooks** when asked (if you do not approve them, the walls do not act).

### In each project
Open an agent session **inside the project folder** and type:
```
/install
```
The agent:
1. Downloads Senzu to `~/.senzu` (the `.senzu` folder in your user folder) if it is not there, or updates it.
2. Detects the stack (Laravel, Next, Astro, Vue, Nuxt, SvelteKit, WordPress, Node API, Python), or you
   tell it: `/install laravel`.
3. Asks you, in a single question, for the stack, the tools (Claude, Claude + Codex or Codex only)
   and what to do with your `CLAUDE.md`, `AGENTS.md` or log if they already exist (by default they are backed up).
4. Asks you **what the project is**, and based on that installs what makes sense:

   | Profile | For | What it installs |
   |---|---|---|
   | **Full web** | websites and apps with an interface | everything for the stack |
   | **Backend** | APIs, services, workers, server tools (a pentesting agent, a scraper) | quality, architecture and deployment; **no front at all**: no design skills, walls or commands |
   | **Front** | landings, marketing sites, interfaces on top of someone else's API | design, animation, brand, SEO and deployment (3D separately: `--bundle core-3d-animation`) |
   | **AI agent** | agents and LLM apps (LangGraph, tools, RAG) without their own web interface | same as backend |
   | **Library or CLI** | packages you publish and terminal tools | quality and deployment |

   Or **you choose**: everything, **by category** (front, animation, 3D, quality, architecture, marketing and SEO,
   operations, graphic design) or **custom** (skills, walls and commands one by one). The core (plan,
   devlog, quality and routing) always goes in, with any option. No front means no front, even if the
   stack has it (a Laravel project with the backend profile gets neither the design wall nor `/proposals`).
5. Installs it and tells you what it added. **Open a new session** when it finishes: the walls and the skills
   load at startup.

### What it adds to the project

| Tool | Files |
|---|---|
| Claude Code | `CLAUDE.md` + `.claude/skills/` + `.claude/hooks/` (the walls) + `.claude/commands/` (`/plan`, `/verify`, `/brief`, `/proposals`…) + `.claude/settings.json` |
| Codex | `AGENTS.md` (the same rules) + `.agents/skills/` (Codex discovers them on its own) |
| Both | `senzu/plan/`, `senzu/devlog/`, `senzu/senzu.json` (what you chose, for later updates) |

> If the project already had its own `CLAUDE.md` or `AGENTS.md`, it is backed up to `CLAUDE.project.md`.
> Review it and merge what you want to keep.

## 2. With the terminal installer (no agent)

Useful for installing in several projects in a row or if you prefer a menu. Download Senzu once, into the same
folder that `/install` uses:
```
git clone https://github.com/petersonsenadevs/senzu.git ~/.senzu
```
(In PowerShell, `~` also works: `git clone https://github.com/petersonsenadevs/senzu.git $HOME\.senzu`.)

And run the installer:
```
node $HOME/.senzu/tools/init.mjs
```
With no arguments it opens a menu that checks the requirements and asks for the project folder, the stack
(it detects it; you confirm with Enter), the tools and what the project is (the profiles above, or
choosing yourself).

Without the menu, with the same results:
```
node $HOME/.senzu/tools/init.mjs --stack astro --path ./my-project --tools claude,codex
node $HOME/.senzu/tools/init.mjs --path ./my-project --perfil backend
node $HOME/.senzu/tools/init.mjs --path ./my-project --seleccion categorias --grupos front,motion
node $HOME/.senzu/tools/init.mjs --help        # all options
```
- `--stack`: `laravel` · `next` · `astro` · `vue-ts` · `nuxt` · `sveltekit` · `wordpress` · `node-api` · `python-langgraph`.
- `--tools`: `claude`, `codex`, `cursor`, `windsurf`, `antigravity` (the ones you use, comma-separated).
- `--bundle core-3d-animation` adds the animation and 3D package (Three.js, GSAP, R3F, Motion).
- `--lang es` switches Senzu's messages in that project to Spanish (what the walls, the startup and the
  close say). Without it, they are in English. See [Language](#language).

### Language

Senzu speaks English by default and Spanish if you ask for it. The language is saved in
`senzu/senzu.json` (`"lang": "es"`) and is kept when you update:
```
node $HOME/.senzu/tools/init.mjs --path ./my-project --lang es
```
- It affects **Senzu's messages**: why a wall blocks, the status at session start, the close
  warnings. The `SENZU_LANG=es` (or `en`) variable overrides the saved value, for a single session.
- Each **command** has an English and a Spanish name (`/install` is `/instalar`, `/next` is
  `/siguiente`…); the equivalence table is in [commands](docs/comandos.en.md). `--lang` does not rename them.
- The **router** understands requests in both languages.
- It **does not change** the language the agent answers you in (it answers in yours) nor the language of the skills, which are
  instructions for the agent.

**Token saving mode** (optional; the menu asks at the end): `--ahorro` makes `CLAUDE.md`
compact (without the skills list, which Claude already loads on its own, and with the devlog and the git flow in
one line, because the walls enforce them). It saves around 30 % of `CLAUDE.md`; `AGENTS.md` does not
change. `--sin-ahorro` removes it.

## 3. Update

- **The plugin**: in Claude Code, `/plugin marketplace update senzu` and update the plugin from `/plugin`.
  In Codex, from the app.
- **Each project**: type `/install` again in a project session, or in the terminal
  `node $HOME/.senzu/tools/init.mjs --path ./my-project`. `~/.senzu` is updated and everything is reinstalled respecting
  what you chose (saved in `senzu/senzu.json`); if you reduce the selection, what you no longer chose
  is removed (your own skills are not touched). Open a new session afterwards.

**Front profile**: it is detected from the real `package.json` (an Astro project without React or Tailwind ends up as
«Astro + CSS propio»). To set it by hand, edit `senzu/senzu.json` and update again; the manual value wins:
```json
"frontProfile": { "label": "Astro + CSS propio + GSAP + Three.js", "stacks": ["astro"] },
"frontProfileSource": "manual"
```

## 4. Skills only, no project (Codex, Cursor, Windsurf)

To have the skills in all your projects without installing the walls in any of them (in PowerShell):
```
irm https://raw.githubusercontent.com/petersonsenadevs/senzu/main/tools/install.ps1 | iex
```
It installs the default set into `~/.codex/skills` and `~/.agents/skills` (`project-planner`, `skill-router`,
`front-activation`, `ui-ux-pro-max`, `ui-verify`, `image-gen`, `gsap-scrolltrigger`, `threejs-webgl`,
`code-quality`). Running the command again updates them. In Codex you can also invoke them by hand with `$ui-ux-pro-max`.

## 5. Check that it works

- **Claude Code** (new session in the project): type «build the landing page for X»: the router hint should
  suggest `ui-ux-pro-max`, and `/plan` and `/brief` should show up as commands.
- **Codex** (new session): ask «generate an image of the product floating for the hero»: it should use
  `image-gen` (in the app it generates the image directly; in the CLI it uses your `OPENAI_API_KEY`).
- **Interface verification**: install Playwright in the project (`npm i -D playwright && npx playwright
  install chromium`) and try `/verify` with the site running. It leaves in `senzu/ui-verify/` the screenshots
  for each width, the annotated one with numbered warnings and, on mobile, the one with the menu open (outside git).

## 6. Coming from dev-standards (version 1.x)

Senzu is dev-standards with another name and a tidier house. Once per machine and once per project:

1. **Claude Code**: remove the old plugin and marketplace and add the new ones:
   ```
   /plugin uninstall dev-standards-all@dev-standards
   /plugin marketplace remove dev-standards
   /plugin marketplace add petersonsenadevs/senzu
   /plugin install senzu-all@senzu
   ```
2. **Codex**: in the app, uninstall `dev-standards-all`, add the `senzu` marketplace, install `senzu-all`
   and **approve the hooks** again (Codex asks again because of the new name).
3. **Each project**: new session and `/install`. It moves `devlog/`, `plan/`, `design-system/`,
   `conventions.*`, `.ui-verify/` and `.dev-standards.json` to `senzu/` with `git mv` (the history is
   kept). Afterwards, check your own documents in case they referenced those paths. To move nothing:
   `--sin-migrar` (everything keeps working).

The old names keep working: `DEV_STANDARDS_*` (now `SENZU_*`) and the
`dev-standards-allow` comment (now `senzu-allow`).

## Cheat sheet

| I want to… | How |
|---|---|
| Install the plugin in Claude Code | `/plugin marketplace add petersonsenadevs/senzu` → `/plugin install senzu-all@senzu` |
| Install or update Senzu in a project | `/install` in a project session (or `node $HOME/.senzu/tools/init.mjs --path <path>`) |
| Install backend only (no front at all) | `node $HOME/.senzu/tools/init.mjs --path <path> --perfil backend` (also `agente-ia`, `libreria`, `front`, `web`) |
| Plugin for the whole repository team | `claude plugin install senzu-all@senzu --scope project` |
| Let the agent push (not to main) in this project | `node $HOME/.senzu/tools/init.mjs --path <path> --permitir push` (`push-main` and `commit-main` for main) |
| Turn off a wall in this project | `node $HOME/.senzu/tools/init.mjs --path <path> --apagar-hooks format-on-save` (`--encender-hooks` turns them back on) |
| Compact `CLAUDE.md` (saving mode) | `node $HOME/.senzu/tools/init.mjs --path <path> --ahorro` |
| Senzu messages in Spanish | `node $HOME/.senzu/tools/init.mjs --path <path> --lang es` (or `SENZU_LANG=es` for one session) |
| Add animation and 3D later | `node $HOME/.senzu/tools/init.mjs --path <path> --bundle core-3d-animation` |
| Skills only, no project | `irm https://raw.githubusercontent.com/petersonsenadevs/senzu/main/tools/install.ps1 \| iex` |
| Use your own copy of Senzu (to develop it) | set `SENZU_HOME` to its path: `/install` will use it instead of `~/.senzu` |

### If you maintain Senzu (contributing)
Clone the repo wherever you want and set `SENZU_HOME` to that path. Maintenance scripts:
`tools/check-skills.ps1` and `tools/test-router.ps1` (the package is healthy), `tools/vendor-effects.ps1 -Missing`
(downloads the effects collection, which is not in git) and, on Windows, the PowerShell versions of the installer
(`tools/init-project.ps1`, `tools/sync.ps1`), which give the same result as `init.mjs`.
