<!-- GENERADO por tools/build-docs.ps1 desde core/skills-registry.json, core/commands/, core/hooks/ y stacks/. NO editar a mano. -->

# Senzu full reference

The whole catalog on one page. By topic: [skills](docs/skills.en.md) · [commands](docs/comandos.en.md) · [hooks](docs/hooks.en.md) · [stacks](docs/stacks.en.md) · [architecture](docs/arquitectura.en.md). Guides: [README](README.en.md) · [INSTALL](INSTALL.en.md) · [USO](USO.en.md).

## 1. Skills and routing

The agent decides on its own, in three automatic layers:
1. **When the session starts** (SessionStart hook): project state (stack, versions+EOL, whether it is new or
   existing, design system, plan, devlog, conventions) + entry points: UI → `ui-ux-pro-max` ·
   logic → `code-quality` · new project → `project-planner` · in doubt → `skill-router`.
2. **On every request** (UserPromptSubmit hook): the *signals* in the tables below suggest the skill
   (max. 2, once per skill and session), in English or Spanish. *Entrypoints* go first; on an equal match the higher priority wins.
3. **Activation tables** (`skill-router` and `front-activation`, generated from the registry): the agent
   checks them when in doubt; `references/decision-trees.md` has the full decision trees.

Total: **45 skills**. Single source: `core/skills-registry.json` (group, when, signals, priority, dependencies).
The skills themselves are written for the agent, which answers in your language: only this catalog is translated.

### Planning (group `planning`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| **`project-planner`** (entry) | 20 | Starting a project or feature, planning, "what do we do now?", next task; and ALWAYS when plan/PLAN.md exists (the plan is followed) | …next task, let's start, new project, scope, budget, estimate, how many hours, how much does it cost |

### Routing (group `routing`, 3 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| **`skill-router`** (entry) | 0 | Starting any non-trivial task: decides which skill and section to read (activation table + loading protocol) | que stack, elegir stack, con que lo hago, que skill, which stack, choose a stack, what do I use, which skill |
| `front-activation` | 8 | Starting a UI, animation or 3D task: detects the front-end profile and the minimum reading per task; specific effects from the catalog (modern CSS, shapes and SVG, kinetic typography, microinteractions, advanced WebGL, physics and impact: falling objects, broken screen, intros and loaders) | …matter js, loader que se rompe, full.screen menu, animated hamburger, breaks the screen, falling object, logo falls, broken screen |
| `instalar-proyecto` | 8 | Installing or updating the full Senzu in the project (/install): everything, by category or custom | …actualizar dev.standards, reinstala dev.standards, instalar el paquete, instalacion de dev.standards, install dev.standards, update senzu, reinstall senzu, install the package |

### Code quality (group `quality`, 3 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `backend-audit` | 8 | Auditing backend and architecture with proof (tools per stack, evidence per finding, report), technical debt, legacy code, circular dependencies and safe refactoring with characterization tests | …tests de arquitectura, technical debt, legacy code, circular dependencies, code smells, safe refactor, characterization tests, audit the backend |
| `depurar` | 8 | Something fails or does not work (failing tests, exception, 500 error, wrong result): method to reproduce, write a failing test, form hypotheses, narrow it down and fix the root cause | …tests en rojo, no pasan el tests, doesn't work, not working, crashes, hangs, throws an error, tests are red |
| `code-quality` | 5 | Writing or refactoring logic, writing tests, handling errors/logs, security, performance, designing endpoints/APIs, reviewing or opening a PR | …subscription, time zone, translation, file uploads, project map, explain the project, where is the code, how is the project built |

### Architecture (group `architecture`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `ddd-hexagonal` | 5 | Module with rich business rules, several contexts, architecture refactor away from MVC, "how do I structure this?" (start with its "do I need it?" checklist) | …repository, cqrs, event storming, modulo nuevo, modular, how do I structure, new module, rich domain |

### Documentation (group `docs`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `devlog` | 8 | Finishing a relevant step or committing (always); questions about the project's past (memory and search) | …when did we change, what did we decide, where did we leave off, where were we, remember this, save this to memory, project memory, user memory |

### Front end and design (group `front`, 7 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| **`ui-ux-pro-max`** (entry) | 15 | Creating, laying out or redesigning pages, views, layouts, components, forms, dashboards, themes, colors, typography, icons, responsive design, accessibility; .vue .tsx .jsx .astro .blade.php .html .css files | …page, component, form, style, theme, redesign, improve the page, new round |
| `design-system` | 10 | Design tokens (primitive → semantic → component), CSS variables, token validation | design tokens, tokens de diseño, tokens semanticos, primitivos, css variables, sistema de diseño |
| `tanstack` | 10 | Server state (fetching, caching, invalidation, infinite queries), tables with sorting/filtering/pagination (client or server side), virtualization of large lists; dashboards and data tables (React, Vue, Svelte, Solid) | …useQuery, estado del servidor, server.state, tabla de datos, data.grid, grid de datos, virtualiza de listas, paginacion en servidor |
| `ui-styling` | 10 | shadcn/ui components (React or Vue) and Tailwind utilities/theme | shadcn-vue, radix, reka, componentes de ui, tailwind config, cva |
| `image-gen` | 8 | Generating AI images that match the website: floating product, heroes, backgrounds, 3D, mockups, textures (gpt-image in Codex, Nano Banana in Antigravity, multi-provider script) | …ideogram, render 3d de producto, mockup del producto, generate an image, ai[- ]generated image, product photo, background image, 3d product render |
| `ui-verify` | 8 | Verifying a finished UI in a real browser: responsive 375/768/1440, dark mode, console and accessibility (axe); required before a view is considered done | …navegacion por teclado, verify, check the ui, launch the web, going to production, publish the web, launch checklist, keyboard navigation |
| `modern-web-design` | 5 | Modern web design trends and principles | tendencias, bento, glassmorphism, neo-brutalis, estilo moderno, inspiracion, awwwards |

### Animation (group `motion`, 9 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `motion-framer` | 10 | Declarative animation in React/Next with Motion (variants, gestures, layout animations) | framer motion, motion/react, animatepresence, variants, layout animation, usescroll, usetransform |
| `animated-component-libraries` | 8 | Ready-made animated components (Magic UI, React Bits) | …marquee react, shimmer, border beam, bento grid, blur text, count up react, dock, blob cursor |
| `animejs` | 8 | Lightweight JS animations (anime.js) for DOM/SVG | anime js, anime |
| `barba-js` | 8 | Page transitions with Barba.js (multi-page sites) | barba js, mpa, crossfade, wipe entre paginas, multipagina |
| `locomotive-scroll` | 8 | Smooth scroll with Locomotive Scroll | locomotive |
| `lottie-animations` | 8 | Lottie animations (After Effects JSON) | lottie, after effects, bodymovin, dotlottie |
| `react-spring-physics` | 8 | Physics-based animation in React (react-spring) | react-spring, popmotion, animacion fisica, spring physics |
| `scroll-reveal-libraries` | 8 | Simple scroll reveals (AOS) on landing pages | aos, animate on scroll, reveal simple, fade in al hacer scroll |
| `gsap-scrolltrigger` | 5 | Animation, scroll-driven effects, parallax, pin/scrub, timelines, page transitions, smooth scroll (Lenis) | …video scrubbing, countup, count up, progress de lectura, scrollspy, snap, page transition, wipe |

### 3D / WebGL (group `3d`, 12 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `pixijs-2d` | 10 | 2D graphics/particles on canvas with PixiJS | …sprites, displacement, filtro 2d, pixelate, chromatic aberration, glow, liquid, distorsion 2d |
| `react-three-fiber` | 10 | Declarative 3D in React/Next (R3F + drei) | r3f, react three fiber, drei, fiber |
| `lightweight-3d-effects` | 8 | Lightweight decorative 3D effects (Zdog, Vanta, tilt) | …glare, waves, globe, birds, fog, vanilla-tilt, mouse parallax, parallax del raton |
| `aframe-webxr` | 5 | VR/AR in the browser (A-Frame, WebXR) | a-frame, webxr, realidad virtual |
| `babylonjs-engine` | 5 | 3D with Babylon.js (games, complex scenes) | babylon js |
| `blender-web-pipeline` | 5 | Exporting/optimizing Blender models to glTF for the web | blender, exportar gltf, draco, ktx2 |
| `playcanvas-engine` | 5 | Games/experiences with PlayCanvas | playcanvas |
| `rive-interactive` | 5 | Interactive Rive animations (state machines) | rive, state machine de animacion |
| `spline-interactive` | 5 | Scenes built in Spline and their integration into the web | spline |
| `substance-3d-texturing` | 5 | PBR texturing with Substance 3D for the web | substance, texturiz, pbr |
| `threejs-webgl` | 5 | 3D, WebGL/WebGPU, GLB/GLTF models, shaders, particles, configurators, 3D heroes | …distorsion, displacement, hover distortion, uniforms, glsl, noise, blob, fondo animado 3d |
| `web3d-integration-patterns` | 5 | Combining Three.js + GSAP + R3F + Motion in complex 3D experiences | integrar 3d, 3d gsap, three motion, experiencia 3d compleja |

### Graphic design and branding (group `design`, 4 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `banner-design` | 5 | Banners for social media, ads and heroes | banners, creatividades, anuncios, ads |
| `brand` | 5 | Brand voice, visual identity, brand guidelines | marca, branding, voz de marca, guia de marca, brand |
| `graphic-design` | 5 | Logos, icons, corporate identity, mockups (AI generation) | logo, logotipo, iconos, identidad corporativa, mockups, cip |
| `slides` | 5 | HTML presentations | presentacion, slides, diapositivas, deck |

### Marketing and SEO (group `growth`, 2 skills)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `email-html` | 8 | Building or fixing HTML emails (transactional and newsletters): react-email/MJML/framework templates, Gmail/Outlook compatibility, dark mode, plain text and testing before sending | …email html, maqueta el email, se ve roto en outlook, mailable, transactional email, welcome email, email template, broken in outlook |
| `marketing-seo` | 8 | Ranking and measuring the website: on-page and local SEO, keywords, Search Console, GA4, Google Tag Manager (container, dataLayer, Consent Mode) and analytics MCPs for agents to operate | …meta ads, posthog, matomo, informe de visitas, positioning, rank on google, traffic report, tracking pixel |

### Operations and deployment (group `ops`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `deploy-ops` | 8 | Deploying and running any stack in production: Netlify/Vercel/Forge/VPS, Docker, CI/CD with GitHub Actions, per-environment secrets, queues and cron in prod, backups with tested restores, monitoring and incidents | …traspaso al cliente, servicios y accesos, push to production, the web is down, deliver to the client, handoff, user manual, rollback |

### Security (group `security`, 1 skill)

| Skill | Prio | When to use it | Signals that trigger it (sample) |
|---|---|---|---|
| `security` | 8 | Reviewing or auditing the project's security, hardening auth / an API / an AI agent, hardening, authorized pentesting, OWASP, prompt injection, XSS/CSRF/SSRF/IDOR, security headers | …cabeceras de seguridad, security headers, secure the, hardening, es seguro, is it secure, agente de ia seguro, seguridad del agente |

## 2. Slash commands

Optional shortcuts: asking in plain words triggers the same thing through the router. `/plan`/`/next`/`/verify`/`/deploy`/`/adopt`
are ALWAYS installed; the rest only in stacks with a front profile. Each command also has a Spanish name
(last column): the one it has in a Spanish install.

| Command | Argument | What it does | In Spanish |
|---|---|---|---|
| `/plan` | [description of the project or feature] | Create or resume the project plan (senzu/plan/PLAN.md) with the project-planner skill | `/plan` |
| `/next` | [optional task id, e.g. F1-T3] | Run the next task in the plan (project-planner task-protocol) | `/siguiente` |
| `/verify` |  | Verify the project after changes — build, lint, types, tests and (if there is UI) mobile | `/verificar` |
| `/deploy` | [environment or target, e.g. "production" or "staging"] | Deploy with a safety net — PRE/DEPLOY/POST/ROLLBACK checklist with evidence and explicit approval | `/desplegar` |
| `/adopt` | [optional notes, e.g. "backend only" or "the official language is English"] | Adopt the conventions of an existing project and seal them as an immutable rule | `/adoptar` |
| `/audit` | [optional area, e.g. "payments", "public API" or "before production"] | Backend and architecture audit with proof — real tools, evidence per finding, report and plan | `/auditar` |
| `/brief` | [type of business if already known, e.g. "restaurant"] | Plain-language discovery interview — for clients who don't know the technical jargon | `/brief` |
| `/dependencies` |  | Audit the supply chain — packages with malware or typosquatting and malicious third-party skills | `/dependencias` |
| `/debug` | [symptom or error, e.g. "checkout returns 500 with coupons"] | Methodical debugging — reproduce, failing test, hypothesis, narrow down, fix the cause and verify | `/depurar` |
| `/design-system` | [product/industry, e.g. "invoicing saas for freelancers"] | Generate (or review) the project's design system with ui-ux-pro-max | `/design-system` |
| `/effect` | <effect name> [where, e.g. "marquee in the logos footer"] | Apply a pro frontend effect from the catalog (parallax, marquee, cursor, stacking…) | `/efecto` |
| `/handoff` | [project or client] | Handoff to the client — user manual, services and access, maintenance, how to request changes and training | `/entregar` |
| `/estimate` | [what to estimate, e.g. "the restaurant website" or "phase 2"] | Estimate and budget — hours per task, forgotten items, risks and a final range for the client | `/estimar` |
| `/install` | [optional stack, e.g. "laravel"] | Install or update Senzu in this project (web, backend, front, AI agent, library or custom) | `/instalar` |
| `/launch` | [preview/production url] | Launch checklist — everything checked before publishing the website | `/lanzar` |
| `/map` | [optional area, e.g. "payments"] | Project map — what it is, how to run it, structure, critical flows and where to touch for each thing | `/mapa` |
| `/proposals` | [page, e.g. "home" or "landing"] | Proposal mode — an approvable blueprint + 2 visual A/B mockups before building | `/propuestas` |
| `/remember` | [what, e.g. "commits always without co-author"] | Note something in memory — for this project (decision, rule, what didn't work, pending) or for the user (all their projects) | `/recordar` |
| `/refactor` | <goal, e.g. "move the pricing logic out of OrderController"> | Safe refactor — characterization tests first, small verified steps and the same behavior proven | `/refactor` |
| `/walkthrough` | [url or page, e.g. "http://localhost:4321" or "the home page"] | Conversational review session — we go over the website together, section by section | `/repaso` |
| `/resume` |  | Resume where the previous session left off — what was asked, what was touched, what was left half-done and the next step | `/retomar` |
| `/review-ui` | [url or path of the view, e.g. http://localhost:5173 or Pages/Home.vue] | Audit the UI (rubric + browser verification if Chrome is available) | `/revisar-ui` |
| `/round` | [your opinion of the previous round, or the text the mockups panel copies] | New round of mockups — keep what you liked, drop what you didn't and propose something new | `/ronda` |
| `/security` | [optional area, e.g. "auth" or "the checkout"] | Security review with evidence — surface map, OWASP pass, report and fix plan | `/seguridad` |

### Typical flows
- **New project with a website**: `/brief` (plain-language interview) → `/proposals` (blueprint + A/B mockups) →
  `/design-system` → build with checkpoints → `/review-ui` → `/launch` → `/deploy`.
- **Any feature**: `/plan` → `/next` (one card at a time) → `/verify` before closing.
- **New project without a UI** (API, backend, agent): `/plan` straight away; `/brief` is for things with screens.
- **Inherited project**: `/adopt` in the first session (it analyzes and seals its conventions), then business as usual.
- `/install` and `/adopt` are required by the `arranque-guard` wall before the first line of code; plan and brief are not imposed: if it is not clear what is being done, the agent asks.
- **A specific effect** ("I want a parallax/marquee/cursor"): `/effect` `<name>` goes straight to the catalog with its recipe and mobile cost.

## 3. Walls and hooks

Hooks in Node (`.mjs`, OS-agnostic: they work the same on Windows/macOS/Linux). The ones that BLOCK exit
with code 2 and the reason; the rest only inform. Only Claude Code runs hooks: in Codex/Cursor/Windsurf the
job is done by the activation tables of the generated rules and the githooks (`sync.ps1 -GitHooks`).
Their messages come out in English, or in Spanish with `--lang es` (see [INSTALL](../INSTALL.en.md#language)).

| Hook | Event | What it does |
|---|---|---|
| `session-start.mjs` | SessionStart | Injects the state: whether Senzu is OUTDATED (what to do and what you lose, from core/novedades.json), stack/profile, the NEXT STEP of the method that is missing (/install, /adopt; without a plan, knowing what is being done or asking about it), language, own diary detected, versions with an EOL warning, adopted conventions, git, design system, plan, devlog and the skills protocol. |
| `prompt-router.mjs` | UserPromptSubmit | Suggests the skill that fits the request, in English or Spanish (signals from docs/skills.md), once per skill and session. |
| `guard.mjs` | PreToolUse Bash/PowerShell | Looks at what is EXECUTED, not what is quoted (commit messages, heredocs to a file, echo, grep). BLOCKS: git push to a main branch, forced or without seeing which branch it goes to (to working branches, yes), writing, moving, deleting or restoring the sealed conventions from the terminal (no escape for the agent), destructive DB/git commands, rm -rf, deploy to prod without approval (escape `SENZU_ALLOW_DEPLOY=1`), logo generators once a logo is chosen (`SENZU_ALLOW_LOGO=1`), jQuery/Bootstrap (`SENZU_ALLOW_LIB=1`), dangerous devops (curl\|bash, chmod 777, dd, mkfs, docker prune, stopping services, flushing the firewall, crontab -r); commits: protected branch, Conventional ≤72, no co-authors. |
| `supply-guard.mjs` | PreToolUse Bash/PowerShell | Supply-chain wall. On an install command (npm/pip/composer…) it checks the package NAMES (typosquatting, known-malware denylist) before they land; on `git commit` it scans what is staged (dependency manifests, skill/plugin files and `.mcp.json`) for install scripts with network/shell, prompt injection, exfiltration (reads secrets and opens the network), obfuscation (eval/base64/hex), hidden unicode characters and MCP servers that download and execute. BLOCKS the serious ones, WARNS about the rest. "Quoting is not doing": it looks at what is executed, not quoted text, and also INSIDE a script the command runs (bash x.sh, python x.py…). Offline and deterministic (lists in `core/hooks/data/`). Cannot be turned off. Escape after verifying: `SENZU_ALLOW_SUPPLY=1`. |
| `pentest-guard.mjs` | PreToolUse Bash/PowerShell | Pentesting SCOPE wall. BLOCKS running offensive-security tools: network scanning (nmap, masscan, hping3), web discovery and fuzzing (gobuster, ffuf, nikto, wpscan, nuclei, wfuzz), injection and exploitation (sqlmap, commix, metasploit/msfconsole/msfvenom), credential brute force (hydra, medusa, ncrack), cracking (hashcat, john) and network or AD enumeration and post-exploitation (enum4linux, crackmapexec, responder, evil-winrm, wifi). "Quoting is not doing": it looks at what is executed, not quoted text, and also INSIDE a script the command runs (bash x.sh, ./x.sh…). Senzu helps with AUTHORIZED pentesting: with written permission and scope recorded in the devlog, escape `SENZU_ALLOW_PENTEST=1`. Cannot be turned off. |
| `protect-files.mjs` | PreToolUse Edit/Write | BLOCKS editing: files generated by Senzu, secrets (.env, *.pem, credentials), dependencies/build artifacts, versioned migrations, sealed conventions.md/json (cannot be turned off), masters of the chosen logo (logos/final/) and the project's `protectedPaths`. |
| `secrets-guard.mjs` | PreToolUse Edit/Write | BLOCKS writing real credentials (AWS, GitHub, Stripe, OpenAI/Anthropic, PEM, JWT, strings with a password); ignores placeholders. |
| `code-hygiene.mjs` | PreToolUse Edit/Write | BLOCKS introducing (except in scripts in the agent's temp folder): console.log/debugger/dd()/var_dump/ray, terms banned in `gustos.md` §No, git conflict markers, `.only`/`.skip`/xit in tests, and the anti-AI blacklist (availability badges, numbered sections). One-off escape: a `senzu-allow` comment. |
| `conventions-guard.mjs` | PreToolUse Edit/Write | BLOCKS code that breaks the executable rules in `conventions.json` (/adopt): the project's convention wins. Cannot be turned off. The path is normalized (C:\, C:/, Git Bash /c/, relative) before the rules apply. |
| `arquitectura-guard.mjs` | PreToolUse Edit/Write | Only if the project DECLARES its architecture (senzu/arquitectura/capas.json, from /adopt or /plan). BLOCKS what it introduces: a layer that uses one it may not (domain with framework or ORM, application with HTTP), a DDD context that reaches inside another, and the controller that talks to the database. WARNS about the request array passed instead of a DTO and new code outside the declared folders. Real imports: use + PSR-4, import + tsconfig aliases, Python modules. Cannot be turned off. |
| `backend-guard.mjs` | PreToolUse Edit/Write | BLOCKS introducing: destructive migrations in the part that gets applied (dropping or renaming columns or tables: expand → contract pattern), `env()` outside `config/` in Laravel, personal data in logs (whole request, bodies, passwords or tokens), migrations without an honest down(), mass assignment (the whole request into the model) and swallowed errors (empty catch, except: pass). WARNS about several writes in the same function without a transaction and about a query inside a loop (N+1). Escape: `senzu-allow` with the reason. |
| `security-guard.mjs` | PreToolUse Edit/Write | WARNS (does not block; once per file and session) about injection sinks introduced into the code: XSS (dangerouslySetInnerHTML, v-html, set:html, {@html}, Blade `{!! $x !!}`, innerHTML/insertAdjacentHTML/document.write with a variable), SQL injection (Prisma `$queryRawUnsafe`, Laravel `DB::raw`/`whereRaw` with `$`, `execute` with an f-string or concatenation in Python) and command injection or dynamic execution (exec/execSync/shell_exec/os.system with a variable, `shell=True`, `eval`). It only looks at what is introduced and at code without comments. Per-line escape: `senzu-allow`. |
| `pool-guard.mjs` | PreToolUse Edit/Write | WARNS (does not block; once per file and session) about what exhausts the database connection pool in Node/TS and Python: `new PrismaClient()` without a global singleton (in serverless it opens one connection per invocation), and creating a pool/client/engine inside per-request code (routes, controllers, endpoints). PHP-FPM is out of scope. Recipe: `code-quality/references/database-design.md` (§Conexiones y pool). |
| `back-skill-reminder.mjs` | PreToolUse Edit/Write (backend) | First backend edit in the session: reminds of the stack recipe, the sealed conventions and the real framework version. Does not block. |
| `depurar-coach.mjs` | PostToolUse Bash/PowerShell | If a test, build or check that is EXECUTED fails (not when reading a test file), it switches on the method of the depurar skill (reproduce, failing test, hypothesis, narrow down, fix the cause). At most once every 20 minutes. |
| `front-skill-reminder.mjs` | PreToolUse Edit/Write (front) | First UI edit: BLOCKS once if there is no design system NOR brief (it forces asking); afterwards it reminds of ui-ux-pro-max, the MASTER icon set and the hard UI rules. |
| `format-on-save.mjs` | PostToolUse | Formats the saved file with the stack's tool (Pint/Prettier/ruff) if it exists. Never blocks. |
| `edit-tracker.mjs` | PostToolUse | Records every file the session touches (for cierre-limpio) and marks that code was edited (stop-guard then requires verification). |
| `memoria-viva.mjs` | UserPromptSubmit | If you state a rule or a correction ("never again…", "I told you…", "from now on…"), it asks the agent to note it in the project memory or in yours (all your projects). Keeps your last requests for /resume. |
| `memoria-archivo.mjs` | PreToolUse Edit/Write | The first time a file is about to be touched, it gives the agent what the memory and the devlog say about it (decisions, what did not work). Does not block. |
| `estado-sesion.mjs` | Stop · PreCompact | Saves where the session left off (requests, files, what was left uncommitted, task in progress) for the next session and for /resume. On close, BLOCKS once if you gave a rule or a correction and it was not noted in the memory. |
| `arranque-guard.mjs` | PreToolUse Edit/Write (code and manifests) | BLOCKS, once per step and session, the first code edit if Senzu is not installed or /adopt is missing (a project with code and no conventions). Without a plan it does NOT block: it reminds that you need to know what is going to be done and, if it is not clear, to talk it over with the user; /plan or /brief only if it is big. Never for senzu/, CLAUDE.md, AGENTS.md or the documentation. The user can drop a step with init.mjs --omitir-paso. |
| `tarjeta-guard.mjs` | PreToolUse Edit/Write (senzu/plan/PLAN.md) | BLOCKS moving a card to [done] without «Verificado:» (verified: the real evidence), «Cumple:» (meets: how it meets its «Para qué», the user's goal or the audit finding it solves) and a «Devlog:» that exists. The same for plan cards and /audit cards. |
| `feature-guard.mjs` | Stop · PostToolUse Bash | Backend. BLOCKS closing (once per set of files) if the session touched backend code and no test, if it created or touched migrations without running them or without testing their rollback (it records the migrate commands that run), or if the code uses new environment variables that are not in .env.example. |
| `cierre-limpio.mjs` | Stop | BLOCKS closing (once) if you leave uncommitted files you touched in this session: either finish and commit (on a branch), or commit and say what is missing. Changes you did NOT touch (another agent such as Codex, another session or the user) are only reported: they are neither committed nor discarded without asking. |
| `stop-guard.mjs` | Stop | BLOCKS closing (once) if something is missing: the day's devlog, verify-build after editing code, or mobile ui-verify after touching UI. It also warns about heavy assets added in the last 24 h (images over 500 KB, fonts without woff2, large videos). |
| `pre-compact.mjs` | PreCompact | Re-injects the essentials (stack, versions, design system, plan, rules) to survive context compaction. |
| `session-end.mjs` | SessionEnd | Cleans up the session markers. |

### Escapes (always with the user's explicit approval, recorded in the devlog)
The `SENZU_ALLOW_*` keys go **as a prefix of the command** (`SENZU_ALLOW_PENTEST=1 nmap …`): they authorize only THAT command, not the whole session. Exporting the variable no longer opens the door.
- `SENZU_ALLOW_DEPLOY=1` — deploy to production after the `/deploy` checklist is approved.
- `SENZU_ALLOW_LIB=1` — install a banned library (jQuery/Bootstrap) if the user asks for it.
- A `senzu-allow` comment on the line — a one-off exception to code-hygiene (CLI script with console.log, justified test .skip, anti-AI pattern requested by name).
- Sealed conventions: they are changed by deleting `conventions.*` and running `/adopt` again (the user's decision).

## 4. Stacks and bundles

Each stack defines an evolving system prompt, best practices, prohibitions, verification commands,
formatters, permissions and (in the front ones) the profile for the design search. `init-project.ps1 -Stack <n>`.

| Stack | What it is | Front profile |
|---|---|---|
| `astro` | Astro | Astro + React islands + Tailwind |
| `laravel` | PHP / Laravel | Laravel + Inertia + Vue 3 + Tailwind |
| `next` | Next.js + TypeScript | Next.js (App Router) + React + Tailwind |
| `node-api` | Node API (Express / NestJS) | — (backend) |
| `nuxt` | Nuxt 3/4 + Vue 3 | Nuxt 3 + Vue 3 + Tailwind |
| `python-langgraph` | Python + LangGraph / LangChain | — (backend) |
| `sveltekit` | SvelteKit + Svelte 5 | SvelteKit + Svelte 5 + Tailwind |
| `vue-ts` | Vue 3 + TypeScript | Vue 3 + TypeScript + Tailwind |
| `wordpress` | WordPress / classic PHP | WordPress + custom theme (child theme) + own CSS |

Languages without their own stack (`code-quality` references; the router routes them all the same): **Go** (`go.md`),
**Java/Spring** (`java.md`), **C#/.NET** (`csharp.md`).

### Optional bundles (`init.mjs --bundle <name>` or `sync.ps1 -Bundle <name>`)

| Bundle | Skills |
|---|---|
| `3d-authoring` | blender-web-pipeline, spline-interactive, rive-interactive, substance-3d-texturing |
| `3d-web` | threejs-webgl, react-three-fiber, gsap-scrolltrigger, web3d-integration-patterns |
| `animation-components` | react-spring-physics, animated-component-libraries, scroll-reveal-libraries, animejs, lottie-animations |
| `architecture` | ddd-hexagonal, code-quality |
| `core-3d-animation` | threejs-webgl, gsap-scrolltrigger, react-three-fiber, motion-framer, babylonjs-engine |
| `design-extras` | ui-ux-pro-max, ui-styling, design-system, graphic-design, slides, brand, banner-design, tanstack |
| `extended-3d-scroll` | aframe-webxr, lightweight-3d-effects, playcanvas-engine, pixijs-2d, locomotive-scroll, barba-js |
| `motion-web` | gsap-scrolltrigger, motion-framer, scroll-reveal-libraries |
| `web-design-meta` | web3d-integration-patterns, modern-web-design |