---
description: New round of mockups — keep what you liked, drop what you didn't and propose something new
origen: core/commands/ronda.md
huella: aaa54ee4ad98
---

Usage: `/round [your opinion of the previous round, or the text the mockups panel copies]` — the argument is optional; if none is given, it asks what you liked and didn't like about the last round.

Apply `ui-ux-pro-max §references/es/rondas.md` step by step:

1. If there is no round yet, start with `/proposals` (blueprint and round 1 A/B with the labeled-pieces
   template).
2. **Collect the opinion** on the previous round: whatever the user wrote after the command, what they pasted from the
   «Tu opinión» (your opinion) panel or, if there is nothing, ask in plain words. Translate it into pieces (`B·T1`, `A·B2`…) and
   confirm it in one line before recording.
3. **Record in `gustos.md`**: what was approved under «Fijado» (fixed) (with its exact value in backticks), what was
   rejected under «No» (with its blocked terms) and what is doubtful under «Dudas / abierto» (doubts / open).
4. **Generate the next round** in `propuestas/ronda-N/` (2 or 3 mockups from the template): what is fixed
   identical in all of them, nothing of what was vetoed, only what is open is explored and each mockup brings something new.
5. **Verify** with `ronda-check.mjs senzu/design-system/<slug> --indice` until «Ronda lista para enseñar» (round ready to show).
6. Show the paths (or `propuestas/index.html`) with one line per mockup: what is fixed, what it tests and
   what is new. Ask for their opinion with the panel or in the chat.
7. If nothing is left open or the user picks one: move the chosen one and what is fixed to `MASTER.md` and
   propose building the real page (checkpoint per section).

## When finished
When nothing is left open: build section by section with checkpoints, `/verify` and `/launch`.
