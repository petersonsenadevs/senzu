---
description: Plain-language discovery interview — for clients who don't know the technical jargon
origen: core/commands/brief.md
huella: 89343d9128bb
---

Usage: `/brief [type of business if already known, e.g. "restaurant"]` — the argument is optional unless stated otherwise; if none is given, the default behavior below applies.

Apply `ui-ux-pro-max §references/es/brief-discovery.md` (discovery mode §2b) to find out what
the user wants WITHOUT technical jargon:

0. **Check what already exists**: if `senzu/plan/brief.md` has real content (not the template), or
   `senzu/design-system/*/BRAND.md` or `MASTER.md` or `gustos.md` exists, do NOT start from scratch: summarize in 3 lines what
   is already decided and ask "shall we review/update it or redo the brief?". **Never re-ask what
   is already written**. At most 5 questions per round, always with a proposal so they can just say "ok".
1. Identify the type of business (whatever the user wrote after the command, or ask it first) and read its block in
   `references/es/business-playbooks.md` + the common base.
2. Ask the questions in §2 ONE at a time, in plain language, offering 2-3 closed options (use AskUserQuestion
   if available). Always ask for 2-3 websites they like. Never ask using technical terms: translate them yourself
   with the glossary in §3.
3. Propose the playbook's section structure adapted to their answers, and two visual directions A/B
   described in plain language (§2b.3) backed by `references/es/industry-rules.md`.
4. With their choices: write `senzu/plan/brief.md` (goal, audience, chosen direction, "Pide:" (ask for) checklist of
   content still pending from the client) and confirm the summary in their words.
5. Close by offering to generate the design system (`/design-system "<producto industria keywords>"`).

## When finished
With a UI: `/design-system` and then `/proposals`; and `/plan` to turn the brief into cards. Without a UI: `/plan`.
