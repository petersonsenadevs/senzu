---
description: Retoma donde se quedó la sesión anterior — qué se pidió, qué se tocó, qué quedó a medias y el siguiente paso
---

Uso: `/retomar` — sin argumentos.

Reconstruye dónde se quedó el trabajo SIN pedirle al usuario que lo cuente, y propón el siguiente paso:

1. **La sesión anterior**: el aviso de inicio de sesión («Sesión anterior: pidió…, tocó…, dejó sin commitear…») y,
   si hace falta el detalle, `senzu/.estado/ultima-sesion.json`.
2. **Lo que dice git**: `git status` (lo que está a medias; lo que no tocó la sesión anterior puede ser de otro
   agente, no lo des por tuyo) y `git log --oneline -5` (lo último que se cerró).
3. **El plan y el devlog**: la tarea `doing` de `senzu/plan/PLAN.md` y los «Próximos pasos» de la última entrada
   del devlog.
4. **Resume en 3-5 líneas**: qué se estaba haciendo, qué está hecho, qué falta y qué quedó sin commitear.
   Después propón el siguiente paso concreto y pregunta si sigues por ahí. No empieces a cambiar nada hasta que
   el usuario lo confirme, salvo que haya dicho «sigue».
