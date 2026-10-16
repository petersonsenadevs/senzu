# Day-to-day usage guide (for the user)

Installation: [`INSTALL.en.md`](INSTALL.en.md). This is what you do AFTER, day to day.
Golden rule: **you do not have to activate anything**. With the project synced and a new session,
the agent finds out on its own (router, hooks and skills). Slash commands are shortcuts, not requirements.

## 1. The only things you run yourself (maintenance)

| When | Command |
|---|---|
| Once per project | `/install` in an agent session inside the project (or `node $HOME/.senzu/tools/init.mjs`, see [`INSTALL.en.md`](INSTALL.en.md)). It asks you what the project is: web, backend, front, AI agent or library |
| Change what is installed (e.g. remove the front) | `node $HOME/.senzu/tools/init.mjs --path <path> --perfil backend` (or `/install` and choose another profile) |
| Available stacks | `laravel` · `next` · `astro` · `vue-ts` · `nuxt` · `sveltekit` · `wordpress` · `node-api` · `python-langgraph` (Go/Java/C# as code-quality references) |
| After each new Senzu version | update the plugin and type `/install` again in the project **+ a new agent session** |
| Full catalog (skills, routing, commands, walls) | [`REFERENCIA.md`](REFERENCIA.md) (generated, always up to date) |

## 2. What happens on its own (no commands) in Claude Code

- **Router**: each plain-language request you make suggests the right skill to the agent ("improve the page" →
  ui-ux-pro-max; "stripe webhook" → code-quality; "generate an image" → image-gen).
- **Forced brief**: if it is about to design without a brief or a design system, the hook makes it ask you first
  (brand, 2-3 websites you like, goal). It does not invent the visual direction.
- **Blocked close**: it cannot mark anything as finished without (a) build/lint/types/tests green if it touched
  code, (b) mobile-first verification if it touched UI, (c) the day's devlog written.
- **Clean close**: it also does not leave with its own files uncommitted. Either it finishes the task and commits it (on a
  branch), or it commits it anyway and tells you what is missing. If the user asked it not to commit, it says so and closes.
- **Main branches are off limits**: no commit or push to `main`, `master`, `develop`, `staging`, `production`,
  `release/…` and the other main branches (a push to staging or production also deploys). Add
  yours in `"ramasProtegidas"` in `senzu/senzu.json`; only you can open them (`--permitir push-main,commit-main`).
- **Cards with proof**: multi-step work goes to `senzu/plan/PLAN.md` as cards, including what
  comes out of `/audit` (phase AU). Each one says **what it is for** (your goal, or the finding it
  solves), and it cannot be marked as done without **the proof** (the command and its result), **how it meets** that
  purpose and its devlog entry. They are worked through with `/next`, one at a time.
- **Everything inside `senzu/`**: devlog, plan, audits, architecture, map, handoff, reports, design system and
  screenshots. What used to go to `docs/` moves on its own when you update; your own `docs/` are not touched.
- **Two agents at once** (Claude and Codex in the same repository): each session knows which files it touched. What
  is half done and is not its own (from Codex, from another session or yours) it neither commits nor discards: it names it to you at
  session start and at close. That way you can ask Claude about what Codex did without them getting mixed up.
- **Guard**: nothing destructive (push, resets, DROP) without your approval; secrets and protected files are vetoed;
  dangerous devops commands are blocked (`curl|bash`, `chmod 777`, `dd` to disks, `mkfs`, `docker prune`,
  stopping services, flushing the firewall, `crontab -r`). The hooks are Node (`.mjs`): they work the same on
  Windows, macOS and Linux.
- **New walls**: jQuery/Bootstrap blocked at install time (unless explicitly approved); `console.log`/`dd()`/
  `debugger` blocked when introduced into source code; `.only`/`.skip`/`xit` introduced into tests
  blocked (they disable the suite in CI without anyone noticing); git conflict markers (`<<<<<<<`)
  blocked when saved; the backtick-quoted terms in the "No" section
  of `gustos.md` are really blocked; first UI edit without a brief or design system → wall (once per session); production deploy
  (`--prod`) blocked until your explicit approval.
- **Taste memory**: your design opinions go to `senzu/design-system/<slug>/gustos.md`; a veto is not proposed again.
- **Version-aware**: at session start it detects the real versions (PHP/Laravel/Node/framework)
  and warns if something is unsupported (EOL); the agent applies the practices of THAT version, not the latest.
- **It warns you if Senzu is out of date**: at session start, in one sentence, with what to do (open a
  new session if you already installed the new one, `/plugin update`, or update the marketplace) and what you are missing
  (`core/novedades.json`: important fixes first). It first looks at what is already on your machine; GitHub,
  at most once a day and for 1.5 s. `SENZU_SIN_RED=1` keeps it offline. With the hooks copied into the project,
  it compares them with the repo they were installed from and suggests `/install`.
- **Commands chain together**: each command ends by saying the next step (`/plan` → `/next` → … →
  `/verify` → `/launch` → `/deploy` → `/handoff`), and the session announces it at start: the card that is next,
  `/plan` in a project with code and no plan, or the close when the plan is finished.
- **A backend feature is not marked done halfway**: at close, `feature-guard` asks for the test if you touched
  backend and no test, for you to run the migration and test its rollback, and for new environment variables
  to be in `.env.example`. While you write, `backend-guard` stops migrations without `down()`, mass
  assignment (`create($request->all())`, `req.body` into the ORM) and swallowed errors (`catch {}`), and warns if several
  writes run without a transaction.
- **The architecture you choose, enforced**: with `/adopt` (inherited project) or `/plan` (new) it is declared in
  `senzu/arquitectura/capas.json`: MVC with services and DTOs, hexagonal or DDD + hexagonal, with templates for
  Laravel, Node/TS and Python. From there `arquitectura-guard` blocks whatever breaks it (the domain using the
  framework or the ORM, the application using HTTP, one context using another's internals, the controller querying
  the database) and warns about a missing DTO and about code outside its folder. Inherited code does not block: only
  new code. `arquitectura.mjs --comprobar` checks the whole project (`/verify` uses it). If you do not declare one, none
  is imposed.
- **It verifies according to what the project is**: with a manifest (Node, PHP, Python, Go, Rust, Ruby, Java, .NET,
  Deno, Makefile) lint, types, tests and build with their tools; without a manifest there is no build: it runs the repo's
  own suites, checks that the changed code loads (JS, Python, PowerShell, shell, JSON) and that the
  changed documents do not link to files that do not exist. And it records this for the close.
- **The method before the code**: at session start it tells you the **next step** that is missing and why:
  `/install` if Senzu is not in the project; `/adopt` if there is existing code without sealed conventions. The
  `arranque-guard` wall enforces them: the first time the agent is about to write code without them, it stops it and suggests
  the step to you (once per step and session; if you tell it to continue, it continues). **The plan and the brief are not imposed**: not every
  project needs them. What is mandatory is that the agent knows what is going to be done; if you have not told it clearly, it
  asks you before coding, and suggests `/plan` (or `/brief`, if there is an interface) only if it is something big or you want it. If you do not want a
  step in a project, remove it yourself: `init.mjs --omitir-paso adoptar|plan|brief` (and `--sin-omitir` to undo). It answers in
  the language you write in, also in an empty project. If the project already has its own log (CHANGELOG, ADRs) or its own CLAUDE.md, **it asks before
  adapting**. You can leave your CLAUDE.md untouched (the rules go to `CLAUDE.dev-standards.md`).
- **Adopted conventions** (`/adopt`): in inherited projects, the conventions are analyzed, agreed
  with you and sealed as immutable; the `conventions-guard` hook blocks code that violates them. Once sealed,
  **they cannot be changed by any route**: not by editing them (`protect-files`), not from the terminal (`guard`: `sed -i`,
  `>`, `rm`, `mv`, `Set-Content`, `git checkout`…), not with a commit (`pre-commit` githook, if you installed the
  githooks), and not by turning those hooks off (they cannot be turned off). If you want to change them, you do it yourself: delete
  `conventions.md` and `conventions.json` and run `/adopt` again (to commit the change by hand:
  `SENZU_ALLOW_CONVENCIONES=1 git commit …`, a key the agent cannot use).
- **Backend walls**: it blocks migrations that drop or rename columns and tables in the `up` part
  (destructive changes need your approval), Laravel's `env('…')` outside `config/` (with the config cache it
  returns null) and logs with personal data (`$request->all()`, `req.body`, passwords or tokens). The
  first time it touches backend in the session it reminds the agent of its stack's recipe.
- **Debugging with a method**: when a test, build or lint fails, the agent receives the `/debug` method
  (reproduce → isolate → hypothesis → one change at a time) instead of trying blindly. After three failed
  attempts it stops and tells you.
- **Project memory** (`senzu/devlog/MEMORIA.md`): current decisions, client rules, what did not
  work and what is pending, one line each with its devlog entry. It arrives on its own at the start of each
  session; if the day brings a new decision and it was not written to memory, it does not let the session close. Before contradicting
  you on something already decided, the agent has to cite it and ask you. The devlog is still
  written the same way: for what is not in memory it searches back with
  `node .claude/skills/devlog/scripts/buscar.mjs "words"` (accents, plurals, typos and synonyms)
  and cites the entry. In a project with history and no memory, it creates it in the first session and
  shows it to you to confirm.
- **Your personal memory** (`.config/senzu/memoria.md` in your user folder): what applies to ALL your
  projects (language, how you want commits, the tone). It arrives in every session of every project; you do not have to
  repeat it in each `MEMORIA.md`.
- **Your corrections are not lost**: if you say «never again…», «I told you…» or «from now on…», the agent
  has to write it down (in the project or in your personal memory) and cannot close if it did not. Also with
  `/remember`.
- **Per-file memory**: before touching a file, the agent receives what the memory and the devlog say about
  it, so it does not redo what was decided or repeat what did not work.
- **Resume**: each session writes down where it stopped (what you asked for, what it touched, what was left
  uncommitted). The next one starts knowing it; say «continue» or `/resume`.
- **The memory does not decay**: at start it warns about pending items older than 7 days (they are written with a
  date: `- [desde 2026-10-04] …`), about cited entries that do not exist and about repeated decisions.
- **Per-project permissions** (you decide them, in the installer menu or with `--permitir`): by default the
  agent does not push or commit to main. In a project you can give it `push` (branches that are not main),
  `push-main` (main too) or `commit-main`. Force push, destructive actions and secrets stay
  blocked always. You can turn off specific hooks with `--apagar-hooks format-on-save,front-skill-reminder`
  (guard, secrets and protected files cannot be turned off). It is saved in `senzu/senzu.json`, which the agent
  cannot touch: not by editing it, not from the terminal, and not by launching the installer itself with those flags or
  answering the menu itself. It applies to Claude and to Codex. It is a barrier against mistakes and shortcuts, not a
  safe: the guard reads the text of the commands, so a determined agent could get around it with its own
  script. That is why the rules also forbid it and any change stays in git.
- **Heavy assets**: when closing the task it warns (without blocking) about images over 500 KB, SVGs over
  150 KB, TTF/OTF fonts not converted to WOFF2 and videos over 5 MB added in the last 24 hours.
- **Saving mode** (optional, `--ahorro` at install): compact CLAUDE.md (about 7,000 fewer characters per
  session) and technical answers in telegraphic style. Texts for the client, `/brief`, `/proposals`,
  `/estimate` and `/handoff` stay in full language. Removed with `--sin-ahorro`.

## 3. Slash commands (Claude Code): shortcuts

| Command | What for | When to use it |
|---|---|---|
| `/plan` | Creates/resumes `senzu/plan/PLAN.md` with cards | New project or feature |
| `/next` | Takes the next card from the plan | Every time you want to move forward |
| `/brief` | Plain-language interview (no technical jargon) | Before designing anything new |
| `/proposals [page]` | Approvable blueprint + 2 A/B mockups you can SEE | New project, redesign, or "I don't know what I want" |
| `/design-system [keywords]` | Generates/reviews the persisted design system | When setting the visual direction |
| `/effect [name]` | A specific effect via the catalog (recipe + mobile cost) | "I want a parallax/marquee/whatever" |
| `/verify` | Build+lint+types+tests, and mobile if there was UI | Before marking something as finished (or let the block ask for it) |
| `/deploy [environment]` | Deploy with a safety net: PRE (backup+rollback+approval) → deploy → POST smoke test | Every release to production |
| `/adopt [notes]` | Analyzes an existing project and seals its conventions as an immutable rule (+ hook that enforces them) | When joining an inherited project |
| `/round [your opinion]` | Next round of mockups: what you liked is kept, what you did not is vetoed, and each mockup brings something new | After seeing the `/proposals` mockups |
| `/review-ui [url]` | UI pass in the browser (375/768/1440, dark, console, axe) | "Check how it looks" |
| `/debug [symptom]` | Debugging with a method: reproduce, isolate, hypothesis, fix and a test that covers it | "It doesn't work", error 500, red tests (activates on its own when a test fails) |
| `/estimate [scope]` | Estimate in hours with a range (minimum, expected, maximum) and what usually gets forgotten | Before giving a quote |
| `/handoff` | Client handoff package in `docs/entrega/`: manual, access (no passwords), maintenance | When closing a project |
| `/map` | `docs/MAPA.md`: how the project is built and where to touch for each thing | When inheriting a project or onboarding someone new |

## 4. Plain-language phrases that trigger each thing (no slash)

- "build the website / landing / page for …" → full design with the brief first.
- "show me two proposals first" → proposal mode (A/B mockups).
- "make it look modern / bento style / with an aurora background" → modern look recipe book.
- "add [effect]: parallax, marquee, before/after, cursor, text that falls apart…" → catalog → recipe.
- "an intro where the logo falls and the screen breaks / a loader that cracks / the product dropping
  onto the website / the page crumbling" → physics and impact (recipes with working demos).
- "generate an image of the product floating for the hero" → image-gen (native or script).
- "which framework should I use for …?" → A0 stack choice tree.
- "it looks bad on mobile / the menu doesn't work on mobile" → ui-verify (measures, opens the menu and annotates the screenshot).
- "how will this look on mobile? / does this effect work on touch?" → mobile plan per section (`movil.md`).
- "the loader is not centered / this is crooked" → ui-verify measures the geometry in pixels and gives the cause.
- "add login / the stripe webhook / orders are duplicated / it is slow" → backend recipes by symptom.
- "I don't like X / never give me Y" → it is vetoed in gustos.md.
- "make me more mockups with what I liked / another round" → mockup rounds (keeps, vetoes and proposes something new).
- "why did we…? / when did we change…? / what did we agree on…?" → searches the devlog and cites the entry.
- "it doesn't work / it gives error 500 / the tests are red" → debugging.
- "how many hours is this? / prepare the quote" → estimate.
- "prepare the client handoff / the user manual" → handoff package.
- "explain this project to me / make a map of the project" → project map.
- "text that wraps around a shape / headline that refits to the width" → Pretext recipes.

## 5. Typical flows from start to finish

**New website**: `/brief` → `/proposals home` (you approve the blueprint; round 1 with mockups A and B) → you open the
mockups, click «Your opinion» and vote Yes / No on each piece (font, buttons, color, layout…) → «Copy» and
paste it into the chat (or say it in your own words) → `/round` → new round: what you liked is kept in all of them, what was
vetoed is out and there is something new in each one → you repeat until you say «this one» → the agent builds → `/verify`
(+ mobile) → devlog → commit (it will ask you, never a push without your ok). All the rounds stay in
`senzu/design-system/<slug>/propuestas/index.html` and the decisions in `gustos.md`.
Mobile is there from the start: the blueprint has an «On mobile» column and each mockup brings at least one
**V** piece (mobile version: the menu, the order, the effect that changes on touch) that you also vote on.

**What UI verification leaves** (`/verify`, `/review-ui`): in `senzu/ui-verify/` the screenshot for each
width, the **annotated** one (each warning `[g1]`, `[m2]`, `[menú]` boxed over its element) and the one with the **menu
open** on mobile; in the console, the warnings with their measurement and cause and the real sizes (headline, text,
header, main button). An intentional optical adjustment is marked with `data-geometria="ignorar"`.

**Redesign of something existing**: "I want to refresh page X" → short brief + `/proposals X` →
build on the chosen one.

**Just an effect**: `/effect logo marquee` (or ask for it in plain language) → recipe + mobile cost → implement →
mandatory mobile verification.

**Images for the website**: ask for the image describing where it goes ("for the hero, the product floating");
the palette comes from the design system on its own. In the ChatGPT/Codex app it is generated natively; in the CLI it uses your API key.

**Backend bug/feature**: describe it in your own words ("users are duplicating orders") → exact recipe
→ fix → `/verify` blocks the close until the tests are green.

## 6. In Codex (honest differences)

Codex can use Senzu in two ways, and it is worth knowing what comes with each one.

**a) With the Codex plugin marketplace** (the same repo: Codex adds it as a git marketplace and
downloads the `senzu-*` plugins):

| Piece | Does it work in Codex? |
|---|---|
| Skills | **Yes**, all the ones in the plugin. They are discovered on their own by their description or with `$skill-name`. |
| Commands | **Yes, since version 1.1.0.** Codex has no slash commands of its own: it turns each Claude command into a skill called `source-command-<name>` (for example `source-command-brief`). You use them by asking in plain language ("do the brief", "run the plan command") or by mentioning that skill. |
| Hooks (walls) | **Yes, since 1.5.0, with the plugin.** Codex runs the plugin's `hooks.json`. Its edits arrive as patches (`apply_patch`) and the hooks translate them, so the walls for files, secrets, hygiene, conventions and backend work the same as in Claude, also with multi-file patches. After updating the plugin, Codex asks you to **approve the hooks again** (it keeps a fingerprint of each one): approve them or they will not run. With the per-project install without the plugin (only `AGENTS.md` and `.agents/skills`) Codex gets no hooks. |

**Why only `/verify` used to show up**: Codex only converts the commands that **do not use
arguments**. Up to 1.0.x, 14 of the 15 commands had `$ARGUMENTS` or `argument-hint` and Codex
dropped them silently; `verificar` was the only one without arguments. Note: Codex also counts any `$NAME` written in the text as an argument (`$HOME`, `$env:X`); that is why `/install` still did not show up until 1.1.2. Since 1.1.2 no command uses either of the two
(the usage hint goes in a "Usage:" line in the command itself) and `check-skills` fails if someone adds
them back. In Claude nothing changes: whatever you type after the command reaches it the same way.
After updating the marketplace in Codex, **reinstall or update the plugin from the app** so that it
converts the commands again. **Do not update it with the CLI** (`codex plugin marketplace upgrade`):
the CLI downloads the new version but does not convert the commands, and the app, seeing it already downloaded, does not
convert them afterwards (the plugin shows up with no commands). If that happens to you: uninstall and reinstall
the plugin from the app.

**b) With the global skills** (`install.ps1` → `~/.agents/skills` and `~/.codex/skills`): skills only, no
commands or hooks. Since 1.1.0 it also installs by default `backend-audit`, `deploy-ops`,
`marketing-seo`, `email-html` and `devlog`, which were missing before (`SENZU_ALL=1` installs all of them).

With the global skills (no plugin) there are no hooks: there, be a bit more explicit in Codex: "use the image-gen
skill", `$ui-ux-pro-max`, or "verify the build" (`node .agents/skills/code-quality/scripts/verify-build.mjs`).

## 7. Map of where each thing lives (in case you want to look)

`senzu/design-system/<slug>/` → BRAND.md (brand) · gustos.md (your vetoes) · blueprint.md · propuestas/ (mockups) ·
MASTER.md (tokens) · prompts.md (images). `senzu/plan/` → PLAN.md and brief.md. `senzu/devlog/` → the project's log.
In Senzu: `core/effects-vendor/INDEX.md` (124 effect folders) · `front-activation/references/`
(catalog and sources) · `code-quality/references/backend-catalog.md` (backend by symptom).
