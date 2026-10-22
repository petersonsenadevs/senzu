---
name: deploy-ops
description: "Deployment and operations for ALL stacks: deploy by platform (Netlify/Vercel/Forge/VPS), Docker, CI/CD with GitHub Actions, per-environment secrets, queues and cron in prod, backups with tested restore and monitoring. NEVER deploy without approval."
origen: core/skills/deploy-ops/SKILL.md
huella: fe3e87384f55
---

# deploy-ops (Senzu)

Putting things in production and KEEPING them there, for any stack. Building and verifying belongs to the other skills
(`/verify`, `/launch`); this one starts where the "READY" of /launch ends: publish, operate and keep it from going down —
and if it goes down, roll back in minutes.

## Minimum reading per task
| Task | Read only |
|---|---|
| Deploy a project (where and how, by stack) | `references/deploy-by-stack.md` |
| Dockerize (Dockerfile, dev compose, prod image) | `references/docker.md` |
| CI/CD: GitHub Actions pipeline, previews, deploy with approval | `references/ci-cd.md` |
| Hand over the project to the client: manual, access, maintenance (/handoff) | `references/entrega-cliente.md` |
| Environments and secrets (.env, staging, rotation, leaks) | `references/envs-secrets.md` |
| Queues, cron, workers, storage and logs IN production | `references/production-runtime.md` |
| Backups (with tested restore), uptime, Sentry, /health, incidents | `references/backups-monitoring.md` |
| Run a specific deploy (checklist with evidence) | `references/deploy-checklist.md` (command `/deploy`) |
| Verify the WEBSITE before publishing (SEO, legal, measurement) | `ui-verify §references/launch-checklist.md` (/launch) |
| Comply with a website's legal side (cookies, privacy, legal notice, banner, GDPR in depth, AI/AI Act) | `references/legal-web.md` |
| Queue/job design (the WHAT; here only running it in prod) | `code-quality §references/jobs-and-queues.md` |

## Hard principles (always apply)
1. **Deploy to production NEVER without explicit approval from the user** at that moment (the guard blocks
   a direct `--prod`; the `SENZU_ALLOW_DEPLOY=1` escape only after approval, documented in the devlog).
2. **Before touching prod**: a fresh VERIFIED backup + a written rollback plan. Without that, there is no deploy.
3. **Secrets never in the repo or in logs**: they live in the platform (Netlify/Vercel/Forge/GH Environments);
   `.env.example` kept up to date; committed secret = rotate it NOW (protocol in envs-secrets §leak).
4. **Reproducible or it does not count**: the deploy is a script/pipeline, not a list of steps in someone's
   head. If it only works "when X does it by hand", it is broken.
5. **After the deploy you WATCH**: smoke test (home + /health + 1 critical flow) and logs for ~10 min.
   Deploying and closing the laptop is not finishing.
6. Staging if the project has it; never "test in prod" risky changes (destructive migrations,
   payments, auth).
7. Infra changes are documented in the devlog like any code (what, why, how to revert it).
8. **Public website = legal pages, no exceptions**: legal notice, privacy and cookies reachable from the footer
   + a real consent banner (visible reject button, non-essential cookies blocked until
   accepted). The guard blocks the deploy to prod if there is NO legal page at all in the repo; the
   `SENZU_ALLOW_SIN_LEGAL=1` escape only if the legal side is managed outside the repo (CMS, external template). WHAT
   each page must contain and how to set up the banner, in `references/legal-web.md`; the checklist, in `/launch`.

## Default recommendations (agency, no over-engineering)
- Static website/Astro/SPA → **Netlify or Cloudflare Pages** (deploy via git, free previews, zero servers).
- Next.js → **Vercel** unless there is a reason (cost/data) to self-host.
- Laravel → **VPS + Forge/Ploi** (or Docker if the team already masters it). Shared hosting without SSH: no.
- Python/agents → **Docker** on a VPS or Fly.io/Railway.
- CI: **GitHub Actions** mirroring `verify-build` on every PR; prod only from main with approval.

## Relationship with other skills
`/launch` verifies the website → `deploy-ops` publishes and maintains it · queues: design in code-quality, prod here ·
app security in `security-owasp`; here, deployment security (secrets, surfaces, access).
