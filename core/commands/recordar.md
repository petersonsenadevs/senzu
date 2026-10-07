---
description: Apunta algo en la memoria — de este proyecto (decisión, regla, lo que no funcionó, pendiente) o del usuario (todos sus proyectos)
---

Uso: `/recordar [qué, p. ej. "los commits siempre sin co-autor"]` — el texto es opcional; si no llega, apunta lo último que el usuario corrigió o decidió en esta conversación.

Aplica la skill `devlog` (references/memoria.md, sección «Memoria del usuario» y «Formato»):

1. **Decide dónde va** (si no está claro, pregunta en UNA línea con las dos opciones):
   - **De este proyecto** → `senzu/devlog/MEMORIA.md`: una decisión (`D-xxx · qué y por qué · ver NNN`), una regla
     del cliente o del proyecto, algo que no funcionó, o un pendiente (`- [desde AAAA-MM-DD] qué espera y a quién`).
   - **De todos sus proyectos** → la memoria del usuario (la ruta la da el aviso de inicio de sesión; por defecto
     `.config/senzu/memoria.md` en su carpeta de usuario): sus reglas de siempre (idioma, git, estilo, cómo quiere
     que le hables). Créala si no existe, con una línea por regla.
2. **Una línea por punto**, en sus palabras, sin adornos. Si contradice algo que ya está, no lo dupliques: cita lo
   anterior y pregunta si lo sustituye (lo sustituido va al histórico, no se borra).
3. Una decisión de proyecto va también en la sección «Decisiones» de la entrada del devlog de hoy.
4. Confirma en una línea qué apuntaste y dónde.

## Al terminar
Vuelve a lo que se estaba haciendo (o `/siguiente` si hay plan).
