---
description: Security review with evidence — surface map, OWASP pass, report and fix plan
origen: core/commands/seguridad.md
huella: ac24a246cce0
---

Usage: `/security` — with no argument, it reviews the whole project; with an area (e.g. `/security auth` or `/security the checkout`), focus on it.

Apply the `security` skill (read `references/metodo-revision.md`). It is a DEFENSIVE review of the user's own application, with one proof per finding. It is not pentesting: third-party systems and infrastructure are not touched (that needs authorization, `references/pentesting.md`).

1. Context and scope: ask what it handles (personal data, payments, public or internal, roles) to know what weighs most. Access control is usually first.
2. Surface map: list inputs (endpoints, Server/Astro Actions, forms, webhooks, uploads, headers, queues), authentication and roles, sensitive data, dangerous outputs (HTML/SQL/shell with input, URLs the server requests, AI tools) and dependencies.
3. Automated (defensive, not offensive): run what applies and paste the output — `semgrep --config auto`, `gitleaks detect`, `composer audit` / `npm audit --audit-level=high` / `pip-audit`, `osv-scanner -r .`. For the supply chain, the `dependencias` skill.
4. OWASP pass over the map (detail in `code-quality references/security-owasp.md` and `auth-patterns.md`): access control and IDOR, injection, auth and sessions, secrets and config, SSRF, uploads, PII logging, and if there is AI, `references/agentes-ia.md`. Each finding with WHAT, WHERE (file:line or request), WHY it is exploitable and HOW it is fixed.
5. Severity (critical/high/medium/low) and a report in the project (`senzu/informes/seguridad-<fecha>.md`, never in temp): plain-language summary, findings table and prioritized plan.
6. Don't fix things recklessly or touch production or data: first the complete map, then the fixes by priority, each with its test. A finding is not closed without re-verifying it.

## When finished
If there are critical or high findings, don't continue with the deploy or close without resolving them or the user approving them; leave the decision and the fix in the devlog. After that, the next step of the method is given by /next, or /verify before closing.
