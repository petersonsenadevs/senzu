# Memoria del proyecto (`senzu/devlog/MEMORIA.md`) y búsqueda en el pasado

## Índice
1. Tres niveles: memoria, índice, entradas
2. Qué entra en la memoria y qué no
3. Formato y ciclo de vida de una decisión
4. Crear la memoria desde un devlog existente
5. Buscar en el pasado con `buscar.mjs`
6. Qué obliga y qué no
7. Memoria del usuario (todos sus proyectos)
8. Memoria viva: correcciones, archivos y retomar

## 1. Tres niveles: memoria, índice, entradas
| Nivel | Archivo | Cuándo se lee |
|---|---|---|
| Memoria | `senzu/devlog/MEMORIA.md` | Siempre: el hook session-start la inyecta al empezar y pre-compact al compactar |
| Índice | `senzu/devlog/INDEX.md` | Para ubicar una entrada por número, fecha o título |
| Entradas | `senzu/devlog/<fecha>/NNN-slug.md` y `DECISIONES.md` | Solo la que haga falta, por su sección |

El devlog se sigue escribiendo igual: la memoria es el resumen de lo vigente con enlaces a las entradas.
Nada se borra del devlog; viajar atrás siempre es posible.

## 2. Qué entra en la memoria y qué no
**Entra** (una línea por punto, con la entrada que lo explica):
- **Decisiones vigentes**: qué se eligió y por qué en media frase (`Sanctum, no Passport: sin terceros`).
- **Reglas del cliente y del proyecto**: lo que el cliente pidió o vetó, convenciones no escritas.
- **Lo que no funcionó**: intentos fallidos que nadie debe repetir, con el motivo.
- **Pendientes abiertos**: lo que está esperando a alguien (textos legales, accesos, una respuesta), CON
  FECHA: `- [desde 2026-10-04] Textos legales del cliente`. A los 7 días, session-start pregunta si siguen
  vigentes; cuando se resuelven, se borran de aquí (o pasan al histórico) en la entrada que los cierra.

**No entra**: el detalle de cómo se hizo (va en la entrada), commits, salidas de comandos, lo que ya
dicen `senzu/conventions.md`, `senzu/design-system/*/gustos.md` o `senzu/plan/PLAN.md` (se enlaza, no se copia).

Máximo **60 líneas**. Lo sustituido y lo cerrado se mueve a `senzu/devlog/MEMORIA-historico.md` (el buscador
también lo lee). Si la memoria no cabe en 60 líneas, el proyecto necesita resumir, no ampliar el límite.

## 3. Formato y ciclo de vida de una decisión
```markdown
## Decisiones vigentes
- D-020 · Pagos con Stripe Checkout alojado, no Elements (3DS y facturas sin código propio) · ver 041
- D-007 · Correos siempre por cola (Horizon + Redis), nunca síncronos · ver 012

## Lo que no funcionó (no repetir)
- D-012 · Stripe Elements: sustituida por D-020 (demasiado código propio para 3DS) · ver 034
```
- **Numeración `D-xxx`** correlativa en todo el proyecto; nunca se reutiliza un número.
- **Cambiar una decisión**: no se edita ni se borra la antigua. Se añade la nueva y la antigua pasa a
  «Lo que no funcionó» (o al histórico) con `sustituida por D-yyy`. El buscador pone por delante la vigente.
- **Contradecir una decisión vigente**: el agente la cita (`D-007 dice…`) y pregunta antes de actuar.
  Si el usuario la cambia, se registra como arriba en la entrada del día.
- Cada decisión nueva va también en la sección «Decisiones» de la entrada del día (o en `DECISIONES.md`):
  así el stop-guard detecta que hay algo que llevar a la memoria.

## 4. Crear la memoria desde un devlog existente
Cuando session-start avisa de que no hay memoria y ya hay historial:
1. Lee `senzu/devlog/INDEX.md` entero (es corto) y todos los `DECISIONES.md`.
2. Abre solo la sección «Decisiones» de las entradas de tipo `decisión`, `feature` o `infra`
   (`buscar.mjs "decision" --max 20` ayuda a localizarlas).
3. Escribe una línea por decisión que siga vigente, con su `ver NNN`. Las que se cambiaron después
   van a «Lo que no funcionó» marcadas como sustituidas.
4. Añade las reglas del cliente que aparezcan en el devlog o en `senzu/plan/brief.md`.
5. Enséñale la memoria al usuario en una lista corta y pídele que confirme o corrija antes de darla
   por buena: es la fuente de verdad a partir de ahora.
6. Regístralo en el devlog del día (tipo `docs`).

## 5. Buscar en el pasado con `buscar.mjs`
```
node <skills-dir>/devlog/scripts/buscar.mjs "webhook stripe"
node <skills-dir>/devlog/scripts/buscar.mjs "cola correos" --desde 2026-09 --max 10
node <skills-dir>/devlog/scripts/buscar.mjs "login" --tipo decision
```
- Sin dependencias, en Claude y en Codex. `<skills-dir>` es `.claude/skills` o `.agents/skills`.
- Lee `senzu/devlog/` y, si existen, el diario y las decisiones propios del proyecto: `docs/devlog`, `docs/adr`,
  `docs/decisions`… (entradas sueltas `0137-x.md` o en carpetas por día; los ADR cuentan como decisión).
  La cabecera dice qué fuentes leyó. `--solo-devlog` mira solo `senzu/devlog/`.
- Tolera acentos y mayúsculas, plurales y conjugaciones («pagar» → pagos), erratas de una letra
  («stirpe»), palabras cortadas («migr») y sinónimos técnicos (login = auth = Sanctum…).
- Sinónimos propios del proyecto en `senzu/devlog/sinonimos.json`: `[["datafono", "tpv", "cobro"]]`. Si un
  grupo comparte una palabra con uno de base (aquí «cobro» con pagos), lo amplía.
- Ranking: las palabras del título y las decisiones pesan más; gana quien cubre todas las palabras; a
  igualdad, lo más reciente. Las decisiones sustituidas salen marcadas y por detrás.
- Devuelve 5 resultados con su frase clave y la ruta (unos 300 tokens). Abre solo la entrada útil y
  solo la sección indicada.
- Sin resultados: prueba con un sinónimo; si sigue sin aparecer, di que no hay registro.
- No busca por significado («cobrar a los clientes» no encuentra «Stripe» si no está en los sinónimos).

## 6. Qué obliga y qué no
| Momento | Mecanismo | Obliga |
|---|---|---|
| Inicio de sesión | session-start inyecta la memoria, los próximos pasos de la última entrada y cómo buscar | Sí (llega siempre) |
| Compactación | pre-compact la re-inyecta | Sí |
| Cierre con decisiones nuevas | stop-guard bloquea una vez si MEMORIA.md no se actualizó después | Sí |
| Memoria de más de 60 líneas | stop-guard recuerda pasar lo viejo al histórico | Aviso |
| Preguntas sobre el pasado | prompt-router sugiere la skill devlog | Aviso |
| El usuario da una regla o corrige | memoria-viva pide apuntarla; estado-sesion bloquea el cierre una vez si no se apuntó | Sí |
| Antes de tocar un archivo | memoria-archivo pasa lo que la memoria y el devlog dicen de él | Aviso |
| Empezar la siguiente sesión | estado-sesion guardó en qué se quedó; session-start lo cuenta (y `/retomar`) | Sí (llega siempre) |
| Memoria que se estropea | session-start avisa de pendientes caducados, «ver NNN» rotos y D-xxx repetidos; `memoria-check.mjs` lo revisa todo | Aviso |
| No contradecir una decisión | Regla del CLAUDE.md/AGENTS.md + memoria en contexto + memoria-archivo al tocar el archivo | Aviso |

## 7. Memoria del usuario (todos sus proyectos)
Lo que vale en TODOS los proyectos del usuario (idioma, cómo quiere los commits, el tono, «nunca hagas push
sin preguntar») va en su memoria personal, no repetido en cada `MEMORIA.md`: por defecto
`.config/senzu/memoria.md` en su carpeta de usuario (`SENZU_MEMORIA_USUARIO` la cambia). Una línea por regla.
session-start y pre-compact la inyectan en cualquier proyecto. Si choca con la memoria de un proyecto, manda
la del proyecto. Se escribe con `/recordar` (que pregunta si va al proyecto o al usuario cuando no está claro).

## 8. Memoria viva: correcciones, archivos y retomar
- **Correcciones del usuario**: cuando dice «no vuelvas a…», «te dije…», «a partir de ahora…» o «siempre
  usa…», el hook memoria-viva pide apuntarlo antes de seguir. Si solo era una corrección del momento, no se
  apunta y se dice al cerrar. Si era una regla y no se apuntó, el cierre se bloquea una vez.
- **Por archivo**: la primera vez que se va a tocar un archivo en la sesión, memoria-archivo enseña las
  decisiones y entradas que lo nombran (por su ruta, o por su nombre si no es genérico como `index.ts`). Por
  eso conviene nombrar los archivos entre acentos graves en las entradas y en la memoria.
- **Retomar**: al cerrar o compactar, estado-sesion guarda en `senzu/.estado/ultima-sesion.json` (fuera de git)
  las últimas peticiones, los archivos tocados, lo que quedó sin commitear y la tarea en curso. La siguiente
  sesión arranca sabiéndolo; `/retomar` lo resume y propone el siguiente paso.
- **Revisión**: `node <skills-dir>/devlog/scripts/memoria-check.mjs` (desde la raíz) avisa de memoria de más de
  60 líneas, `ver NNN` que no existe, D-xxx repetidos, pendientes caducados o sin fecha y rutas que ya no
  existen. Pásalo al cerrar una tanda grande o cuando session-start avise.

En Codex con el plugin, los mismos hooks hacen lo mismo. Sin plugin (solo `.agents/skills`) no hay hooks:
AGENTS.md pide leer `senzu/devlog/MEMORIA.md` al empezar y usar el buscador.
