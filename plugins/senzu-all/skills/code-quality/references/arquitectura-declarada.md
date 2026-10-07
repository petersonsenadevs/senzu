# Arquitectura declarada (senzu/arquitectura/capas.json)

Índice: 1 Para qué · 2 Elegir el estilo · 3 Declararla (proyecto nuevo y heredado) · 4 Qué hace cumplir ·
5 Excepciones y cambios · 6 El formato

## 1. Para qué
Que la arquitectura no dependa de que el agente «se acuerde». El proyecto DICE qué capas tiene, en qué carpetas
vive cada una y quién puede usar a quién; el muro `arquitectura-guard` lo hace cumplir al escribir y
`scripts/arquitectura.mjs --comprobar` revisa el proyecto entero. **Sin `capas.json` no se aplica nada**: un
proyecto que no ha elegido arquitectura no recibe la de nadie.

## 2. Elegir el estilo (de menos a más estructura)
| Estilo | Cuándo | Capas |
|---|---|---|
| `mvc-servicios` | La mayoría de CRUD y webs de negocio | http → servicios → modelos (+ repositorios), dto, tipos |
| `hexagonal` | Integraciones externas, reglas que deben probarse sin BD, cambio de proveedor probable | entrada → aplicación → dominio ← infraestructura |
| `ddd-hexagonal` | Dominio complejo con varios subdominios y lenguaje propio | hexagonal POR contexto; entre contextos, solo su capa pública, eventos o ACL |

Antes de DDD: skill `ddd-hexagonal` §cuándo NO. Un CRUD con DDD es más código, no mejor código. Plantillas:
`node scripts/arquitectura.mjs --plantillas` (estilo × stack: laravel, node, python).

## 3. Declararla
- **Proyecto nuevo** (`/plan`): elige el estilo con el usuario según la tabla, `--plantilla <estilo> --stack <s>`,
  crea las carpetas vacías de cada capa y anota la decisión como ADR (`senzu/arquitectura/adr/`). Sellar con su OK.
- **Proyecto heredado** (`/adoptar`): `--detectar` propone el estilo real; `--plantilla` lo escribe; **ajusta las
  rutas a las carpetas reales** (no al revés: no se mueve código para encajar en la plantilla); `--comprobar` dice
  cuántas infracciones hay HOY. No se arreglan de golpe: van a tarjetas de la fase AU (`/siguiente`, `/refactor`) o,
  si son correctas para este proyecto, a `excepciones`. El muro solo mira lo que INTRODUCE cada cambio, así que lo
  heredado no bloquea el trabajo diario. Con el OK del usuario: `--sellar`.
- Sellada (`senzu:inmutable`) la protegen protect-files, el guard (terminal) y el pre-commit, como las convenciones.

## 4. Qué hace cumplir
- **Dependencias entre capas** (bloquea): cada capa solo usa las de su `puede_usar`. Se leen los imports reales:
  PHP `use` resuelto con el PSR-4 de composer.json; TS/JS `import`/`require` relativos y alias de tsconfig
  (`@/…`); Python `from x import` (módulos del proyecto y relativos).
- **Paquetes prohibidos por capa** (bloquea): el dominio sin framework, ORM ni HTTP (`Illuminate\`, `@prisma/client`,
  `express`, `sqlalchemy`, `fastapi`…); la aplicación sin HTTP ni base de datos directa.
- **Contextos de DDD** (bloquea): un contexto no usa el dominio ni la infraestructura de otro; sí su capa pública
  (`Application`) y el núcleo compartido (`Shared`).
- **Controlador gordo** (bloquea): el controlador no habla con el ORM (`Modelo::where`, `prisma.x.findMany`,
  `db.query`); la lógica va en el servicio o caso de uso.
- **DTO** (avisa): el array o el cuerpo de la petición pasado tal cual a la aplicación.
- **Árbol de carpetas** (avisa): código nuevo fuera de las carpetas declaradas, con dónde iría cada cosa.

## 5. Excepciones y cambios
- Puntual y aprobada por el usuario: `senzu-allow` con el motivo en la línea (y al devlog).
- Permanente (una carpeta o archivo que es correcto así): `"excepciones": ["ruta/**"]`, la edita el usuario.
- Cambiar de estilo es una decisión del usuario: nuevo ADR, quitar el sello, nueva plantilla y `--comprobar`.

## 6. El formato
```json
{ "_sello": "senzu:inmutable", "estilo": "hexagonal", "stack": "laravel",
  "capas": [ { "nombre": "dominio", "rutas": ["app/Domain/**"], "puede_usar": [], "prohibido": ["Illuminate\\"], "por_que": "…" } ],
  "controladores": { "rutas": ["app/Http/Controllers/**"], "orm": "<regex>", "logica_en": "…", "dto": "<regex>", "dto_en": "…" },
  "contextos": { "rutas": ["src/*"], "publico": ["Application"], "compartido": ["Shared"] },
  "excepciones": ["database/**"] }
```
Rutas con `*` (un segmento) y `**` (cualquier profundidad); la primera capa que encaja es la del archivo. En
`contextos.rutas`, el `*` es el nombre del contexto.
