<!-- GENERADO por tools/build-docs.ps1 desde core/novedades.json (campo en). NO editar a mano. -->

# Changelog

What each version brings, in plain words (newest first). The entry-by-entry log, in Spanish, is in [CHANGELOG.md](CHANGELOG.md).

## v2.24.2

- Documentation fixes: the brand skill always regenerates the tokens with sync-senzu.mjs, and the security review points to the /dependencies command for the supply chain

## v2.24.1

- The whole documentation is also in English: besides the guides, every skill and every command has its translated page (the agent still reads the original)

## v2.24.0

- New walls: supply chain (malware/typosquatting), secrets in commits, injection/XSS when editing and pentesting scope; /security skill (OWASP and AI agents); N+1 warning and TanStack for tables and lists

## v2.23.0

- When installing (/install) Senzu asks which language you want its messages in (English by default, or Spanish) and saves it; before, the language could only be chosen with the --lang flag or the SENZU_LANG variable

## v2.22.0

- Bilingual Senzu: the UI is in English by default (the walls, the command names and descriptions, and the router, which understands what you write in English or Spanish); install with --lang es to keep it in Spanish

## v2.21.0

- When publishing a website, a wall stops the production deploy if the repo has no legal page at all (privacy, cookies or legal notice); and a guide explains how to set up a consent banner that complies with GDPR/LSSI

## v2.20.0

- New code is in English by default (domain terms in the business language, as in DDD); when adopting you choose the language of comments, devlog and commits, and /adopt can seal a different convention

## v2.19.4

- A new wall (pool-guard) warns about what exhausts the database connection pool in Node/Python and serverless (new PrismaClient() without a singleton, or one pool per request): the failure that takes the app down in production

## v2.19.3

- A half-finished plan no longer shows up as done: cards with any id (F1-T1, A-H01…) are counted correctly and, when closing, if cards remain and there is uncommitted code, you get a warning (plan and memory linked)

## v2.19.2

- The agent can now push to your working branch (feat/…, fix/…) with no setup; to main, develop, staging or production, it cannot. Before, every push was blocked: reinstall (/install) to clear it

## v2.19.1

- Memoria-check.mjs (the memory check) was missing from the published package: an overly broad .gitignore left out the new files of the devlog skill

## v2.19.0

- Verify-build understands the project type: more languages (Rust, Ruby, Java, .NET, Deno, Makefile) and, without a manifest, it runs the project's own suites, syntax and link checks instead of asking for a fake verification

## v2.18.0

- Declared architecture: you choose MVC with services, hexagonal or DDD (templates for Laravel, Node and Python) and a wall enforces it: layers, contexts, controllers without ORM, DTOs and folders

## v2.17.0

- A backend feature is not considered done without a test, with untested migrations (or without down) or with new keys missing from .env.example; and every command tells you the next step

## v2.16.0

- Quoting is not doing: the walls no longer trigger because a commit message, a heredoc, an echo, a grep, a string or a comment mentions something forbidden

## v2.15.0

- Outdated version warning at session start, and walls that no longer block without reason (reading the marker, temporary scripts, reading a test)

## v2.14.0

- SECURITY FIX: sealed conventions (/adopt) were not protected if the path came in another format (C:/ or /c/); now they also cannot be changed from the terminal or with a commit

## v2.13.0

- Guided start: the missing step of the method (install, adopt) before writing code; without a plan, the agent asks what is going to be done

## v2.12.0

- Everything Senzu generates goes inside senzu/, cards that cannot be closed without proof, and no commits or pushes to main branches

## v2.11.0

- Living memory: your corrections are recorded automatically, per-file memory and /resume

## v2.10.0

- Clean close: the agent does not leave uncommitted files behind or touch another agent's files (Claude and Codex at the same time)
