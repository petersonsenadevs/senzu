---
description: Apunta algo en la memoria — de este proyecto (decisión, regla, lo que no funcionó, pendiente) o del usuario (todos sus proyectos)
---

Uso: `/recordar [qué, p. ej. "los commits siempre sin co-autor"]` — el texto es opcional; si no llega, apunta lo último que el usuario corrigió o decidió en esta conversación.

Aplica la skill `devlog` (references/memoria.md, sección «Memoria del usuario» y «Formato»):

1. **Decide dónde va** (si no está claro, pregunta en UNA línea con las opciones). La pregunta clave: ¿es una
   DECISIÓN o REGLA (cómo se trabaja y por qué) o es un DATO que puede cambiar (dónde, quién, cuánto, cuál)?
   - **Decisión o regla de este proyecto** → `senzu/devlog/MEMORIA.md`: una decisión (`D-xxx · qué y por qué · ver
     NNN`), una regla del cliente o del proyecto, algo que no funcionó, o un pendiente (`- [desde AAAA-MM-DD] qué
     espera y a quién`). «Los pagos van siempre con webhooks idempotentes», «no se usa Livewire».
   - **Regla del usuario para todos sus proyectos** → su memoria personal (la ruta la da el aviso de inicio de
     sesión; por defecto `.config/senzu/memoria.md` en su carpeta de usuario): idioma, git, estilo, cómo quiere que
     le hables. «Commits sin co-autor», «háblame de tú».
   - **Un dato estable** (del usuario o del proyecto, en el idioma que sea) → la memoria de hechos:
     `node <skills-dir>/devlog/scripts/memoria.mjs --guardar --dimension familia.tema --valor "…" --claves "…"`
     (`--alcance usuario` si vale para todos sus proyectos). «Vivo en Valencia» → `identidad.ubicacion`;
     «el cliente es Cerámicas Sol» → `proyecto.cliente`; «max budget 3000 €» → `restriccion.presupuesto`;
     «東京に住んでいます» → `identidad.ubicacion` con claves en japonés, inglés y su idioma. Un dato nuevo de la
     misma dimensión sustituye solo al anterior (no hay que borrar nada); con «creo que…», `--duda`.
   - Si es las dos cosas (una decisión que fija un dato), la decisión a MEMORIA.md y el dato como hecho: no se
     duplica el texto, se enlazan (el hecho lleva «ver NNN» de la entrada del día).
2. **Una línea por punto**, en sus palabras, sin adornos. Si contradice algo que ya está, no lo dupliques: cita lo
   anterior y pregunta si lo sustituye (lo sustituido va al histórico, no se borra).
3. Una decisión de proyecto va también en la sección «Decisiones» de la entrada del devlog de hoy.
4. Confirma en una línea qué apuntaste y dónde.

## Al terminar
Vuelve a lo que se estaba haciendo (o `/siguiente` si hay plan).
