---
description: Verifica el proyecto tras los cambios — build, lint, types, tests y (si hay UI) móvil
---

Ejecuta la verificación completa del proyecto y NO des nada por hecho en rojo:

1. `node <skills-dir>/code-quality/scripts/verify-build.mjs`
   desde la raíz (usa los comandos del stack: lint, types, tests, build). Si algo FALLA: corrige y
   re-ejecuta hasta 0 fallos, pegando la salida final.
2. Si en la sesión se tocó UI: además `ui-verify` — `node <skills-dir>/ui-verify/scripts/verify-ui.mjs
   <url-local>` con la app en dev, MÓVIL 375 primero (o la pasada con navegador).
3. Si existe `senzu/arquitectura/capas.json`: `node <skills-dir>/code-quality/scripts/arquitectura.mjs --comprobar`.
   Lo que introdujo esta sesión tiene que salir limpio; lo heredado que ya estaba se apunta, no se arregla aquí.
4. Resume el veredicto (qué pasó, qué se corrigió) y déjalo en el devlog de hoy.

## Al terminar
En verde: si hay tarjeta en curso, ciérrala y `/siguiente`; con el plan terminado, `/lanzar` (con interfaz) o `/desplegar`. En rojo: `/depurar` con el primer fallo.
