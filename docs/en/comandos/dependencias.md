---
description: Audit the supply chain — packages with malware or typosquatting and malicious third-party skills
origen: core/commands/dependencias.md
huella: f531122017f0
---

Usage: `/dependencies` — with no argument, it reviews the whole project.

Run Senzu's supply chain scanner (supply-scan) over the project and explain whatever it finds. This is the in-depth review ON REQUEST; the supply-guard wall already watches on its own when a package is installed and when committing.

1. Locate the scanner: in an installed project it is at `.claude/hooks/supply-scan.mjs` (or `.agents/hooks/supply-scan.mjs`); in the Senzu repo, at `core/hooks/supply-scan.mjs`.
2. Run it and read the output: `node RUTA/supply-scan.mjs --root . --json` (same in PowerShell). RUTA is the path from step 1.
3. Summarize by severity:
   - high (serious): packages on the known-malware denylist, install scripts with network or shell access (postinstall with curl/bash), third-party skills with prompt injection, exfiltration, obfuscation or hidden unicode characters, and MCP servers that download and execute.
   - med (warning): typosquatting (a name almost identical to a famous one) and URLs with a literal IP or shortened.
4. For each finding say WHAT it is and HOW it is fixed: confirm the package is the real one (not a near-identical one), pin a safe version, remove the install script, or review and remove the skill. If it truly is a false positive and the user approves it, the wall lets it through with SENZU_ALLOW_SUPPLY=1.
5. Don't install, update or delete anything yourself: propose the changes and let the user decide.

## When finished
If there were high findings, don't continue with the deploy or close the session until they are resolved or the user approves them. After that, the next step of the method is given by /next, or /verify before closing.
