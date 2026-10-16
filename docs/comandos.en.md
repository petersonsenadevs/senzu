<!-- GENERADO por tools/build-docs.ps1 desde core/skills-registry.json, core/commands/, core/hooks/ y stacks/. NO editar a mano. -->

# Slash commands

[← Back to README](../README.md)

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

### Typical flows
- **New project with a website**: `/brief` (plain-language interview) → `/proposals` (blueprint + A/B mockups) →
  `/design-system` → build with checkpoints → `/review-ui` → `/launch` → `/deploy`.
- **Any feature**: `/plan` → `/next` (one card at a time) → `/verify` before closing.
- **New project without a UI** (API, backend, agent): `/plan` straight away; `/brief` is for things with screens.
- **Inherited project**: `/adopt` in the first session (it analyzes and seals its conventions), then business as usual.
- `/install` and `/adopt` are required by the `arranque-guard` wall before the first line of code; plan and brief are not imposed: if it is not clear what is being done, the agent asks.
- **A specific effect** ("I want a parallax/marquee/cursor"): `/effect` `<name>` goes straight to the catalog with its recipe and mobile cost.