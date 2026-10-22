---
name: security
description: "App security: review and hardening with evidence (OWASP), access control, auth, secrets and headers, security of AI/LLM agents (prompt injection, tools) and authorized-only pentesting. For auditing or hardening an API or an agent."
origen: core/skills/security/SKILL.md
huella: 450a2769df78
---

# security (Senzu)

Make the application withstand whoever attacks it: review it, find the holes with PROOF and close them. It does not
replace `code-quality` (which already carries the per-vulnerability detail); this skill is the security GATEWAY:
the review method, the pentesting policy and the hardening of AI agents. The command is `/security`.

## Minimum reading per task
| Task | Read only |
|---|---|
| Review/audit the project's security (the WHAT that `/security` runs) | `references/metodo-revision.md` |
| Pentesting, scanning or exploitation (scope, authorization, the wall) | `references/pentesting.md` |
| Harden an AI agent / LLM app (prompt injection, tools) | `references/agentes-ia.md` |
| Per-vulnerability detail (injection, XSS, CSRF, SSRF, uploads…) | `code-quality §references/security-owasp.md` |
| Login, sessions, JWT, OAuth, 2FA, password reset | `code-quality §references/auth-patterns.md` |
| Architecture of an LLM app (RAG, streaming, costs, evals) | `code-quality §references/llm-apps.md` |
| Secrets, environments, leaks and rotation in deployment | `deploy-ops §references/envs-secrets.md` |
| Supply chain (packages/ skills with malware or typosquatting) | skill `dependencias` + supply-guard wall |

## Hard principles (always apply)
1. **Authorize on the server, on every operation, on the specific resource.** Access control is the number 1
   failure (OWASP A01). A menu hidden in the UI is not authorization.
2. **Validate all input on the server** with an allowlist (schema), fail closed, least privilege and minimal
   surface. Client-side validation is UX only.
3. **Secrets never in the repo, in logs, in the client bundle or in a prompt.** Leaked secret = rotate it NOW
   (then clean the history). `.env.example` without real values.
4. **Every finding with EVIDENCE**: where it is (file:line or request), why it is exploitable and how it is
   fixed. Without proof it is not a finding, it is a hunch. When it is closed, it is re-verified.
5. **User input and what an LLM retrieves are DATA, not instructions.** Real privileges live
   outside the model: tools with an allowlist and the real user's authorization; human confirmation for anything
   irreversible (see `references/agentes-ia.md`).
6. **Pentesting ONLY with written authorization and a defined scope.** The `pentest-guard` wall stops
   offensive tools (nmap, sqlmap, hydra, metasploit…); the `SENZU_ALLOW_PENTEST=1` escape is for an
   authorized engagement documented in the devlog (`references/pentesting.md`).
7. **Defensive security by default.** You build to resist attacks and test your own systems with permission;
   no malware, no exploits for third parties, no detection evasion with malicious intent.

## Relationship with other skills and walls
`code-quality` carries the per-vulnerability detail (OWASP, auth, LLM) · `backend-audit` audits architecture and
debt · the `dependencias` skill + the `supply-guard` wall cover the supply chain · `deploy-ops` deployment
security (secrets, access) · walls that already protect: `secrets-guard` (secrets in code),
`backend-guard` (mass-assignment, PII in logs), `pentest-guard` (pentesting scope).
