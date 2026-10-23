---
name: code-quality
description: "Coding best practices (Laravel/PHP, TypeScript, React/Next, Vue, Astro, Python): typing, tests, errors/logs, security, performance, APIs, PRs. Use it when writing or refactoring logic, testing, reviewing a PR or designing endpoints."
origen: core/skills/code-quality/SKILL.md
huella: eba81c1f1fe9
---

# code-quality (Senzu)

Topic references in `references/`. **Don't read them all**: each one starts with an index; read only
the section you need (Read with offset/limit or Grep). One reference per task unless the task spans topics.

Not sure which reference to open? Quick: tree B2 in `skill-router/references/decision-trees.md`.
Full: **`references/backend-catalog.md`** (task/symptom → recipe §section, like the effects catalog).

## Minimum reading per task
| Task | Read only |
|---|---|
| Write/refactor Laravel code | `references/php-laravel.md` (section for the topic: Eloquent, queues, validation…) |
| TS logic code (Next server, Node, utilities) | `references/typescript.md` |
| Next.js components/routes | `references/react-next.md` (+ `ui-ux-pro-max` if there is UI) |
| Vue components/composables | `references/vue.md` |
| Astro (islands, collections, endpoints) | `references/astro.md` |
| Python / FastAPI / LangGraph | `references/python.md` |
| WordPress / WooCommerce (custom theme or plugin) | `references/wordpress.md` |
| Node API (Express / NestJS) | `references/node-api.md` (+ `references/typescript.md`) |
| Nuxt (pages, server routes, useFetch) | `references/nuxt.md` (+ `references/vue.md`) |
| SvelteKit / Svelte 5 (runes, load, form actions) | `references/sveltekit.md` |
| Go (services, CLIs, concurrency) | `references/go.md` |
| Java / Spring Boot | `references/java.md` |
| C# / .NET / ASP.NET Core | `references/csharp.md` |
| Auth: login, sign-up, reset, OAuth, 2FA, API keys | `references/auth-patterns.md` |
| Queues, jobs, background emails, cron | `references/jobs-and-queues.md` |
| Cache (what, keys, invalidation, stampede) | `references/caching.md` |
| DB schema, indexes, safe migrations, full-text | `references/database-design.md` |
| Real time: websockets, SSE, broadcasting, presence | `references/realtime.md` |
| Uploads, S3/R2, server-side images, signed URLs | `references/files-media.md` |
| Chat/AI in the product: RAG, streaming, costs, evals | `references/llm-apps.md` |
| Money, dates/time zones, race conditions, uniques, soft delete | `references/data-integrity.md` |
| External APIs, webhooks, payments, transactional email | `references/integrations.md` |
| Create or fix tests | `references/testing.md` §pyramid + §matching stack |
| Error handling, logs, retries | `references/errors-logging.md` |
| Auth, external inputs, uploads, secrets, LLM | `references/security-owasp.md` (final checklist) |
| "It's slow" / queries / cache | `references/performance.md` §measure + §affected layer |
| Design or change an endpoint/API | `references/api-design.md` |
| Multilingual site (ES/CA/EN), hreflang, locales | `references/i18n.md` |
| Open or review a PR, commits | `references/git-and-reviews.md` §checklist |
| Which API/syntax the stack version allows, upgrades, EOL | `references/stack-versions.md` (the REAL version rules) |
| Inherited project: adopt its conventions (/adopt) | `references/adopt-conventions.md` |
| Architecture: layers, services, DTOs, folders, declared hexagonal or DDD (`senzu/arquitectura/capas.json`) | `references/arquitectura-declarada.md` + `scripts/arquitectura.mjs` (`--detectar`, `--plantilla`, `--comprobar`) |
| Audit the backend, technical debt, big refactor (/audit, /refactor) | skill `backend-audit` (finds with evidence; the recipes here fix it) |
| Explain a project to a newcomer: structure, flows, where to touch (/map) | `references/mapa-proyecto.md` |
| Something fails or doesn't work while you build | skill `depurar` (method: reproduce, failing test, hypothesis, narrow down) |
| Verify the project after YOUR changes | `scripts/verify-build.mjs` from the root (lint+types+tests+build; fix until 0 failures). In monorepos it verifies each changed package in its folder and language (JS with its package manager, Python with uv/poetry, PHP, Go); `--plan` shows what it would run, `--paquete apps/web`, `--todos`, `--sin-build`. It also understands Rust, Ruby, Maven/Gradle, .NET, Deno, Python with requirements.txt and Makefile/justfile. **No manifest means no build**: run the repo's own suites (`tools/test-*`, `check-*`), the syntax of what changed and the links of the changed `.md` files (`--rapido` without suites) |

## Cross-cutting principles (always apply, without reading anything else)
1. **Read before you write**: mimic the naming, structure and style of the surrounding code; don't introduce new patterns without a reason. If `senzu/conventions.md` exists (adopted with `/adopt`), it is law.
2. **Strict typing** in every language (`declare(strict_types=1)`, `strict: true`, strict mypy/pyright). No unjustified `any`/`mixed`.
3. **Validate at the edge, trust inside**: external input (HTTP, queues, LLM, files) is validated and converted to types; the core assumes valid data.
4. **Small functions, one responsibility, names that say what they do**. No comments that repeat the code; yes to "why" comments.
5. **Explicit errors**: domain exceptions with an actionable message; never an empty `catch`; never log secrets/PII.
6. **Tests that protect behavior**, not implementation: happy path + errors + edge cases; fast in the domain, scoped integration.
7. **Secure by default**: authorization on every sensitive action, parameterized queries, secrets in the environment, audited dependencies.
8. **Measured performance**: no blind optimization; N+1, indexes, pagination and cache are the first things to check.
9. **Small, reversible changes**: PR < 400 lines, Conventional Commits, no co-authors, push only to the working branch (never to a main branch, never forced).
10. **Verify before you claim**: the stack's lint + tests + types (`commands` in `stack.json`) before saying "done"; paste the output.

## PR checklist (blocking)
- [ ] The stack's lint/format, types and tests green (output pasted in the devlog).
- [ ] New behavior covered by tests; old tests not deleted without justification.
- [ ] No `any`/`mixed`, no debug `dd()`/`console.log`/`print`, no TODOs without an issue.
- [ ] External input validated; authorization checked; no secrets in code or logs.
- [ ] Queries without N+1; pagination on listings; indexes for new filters.
- [ ] Errors with actionable messages; logs with context and the right level.
- [ ] Devlog updated (skill `devlog`); commit with Conventional Commits.

## Learned rules (extensible)
If you detect a GENERAL rule of the stack or language (a mistake repeated across projects, a team convention),
don't let it die in the devlog: propose adding it to Senzu and, with the user's ok, write it in
`stacks/<stack>/rules/<tema>.md` (it is appended to the projects' CLAUDE.md/AGENTS.md when running `sync.ps1`)
or as a new section of the language reference (`references/<lenguaje>.md`). Rule + why + minimal example.

## Relationship with other skills
- UI, styles, visual accessibility → `ui-ux-pro-max`. Complex domain, modules, ports/adapters → `ddd-hexagonal`.
- Documenting the step → `devlog`. If the project has `stacks/<x>/best-practices.md` in `CLAUDE.md`, the project-specific guidance prevails.
