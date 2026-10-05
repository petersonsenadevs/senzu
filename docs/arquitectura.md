[← Volver al README](../README.md)

# Arquitectura: cómo funciona por dentro

La idea central: **escribes las reglas UNA vez** (en `core/` + `stacks/<lenguaje>/`) y un renderer las
traduce al formato de cada herramienta (Claude Code, Codex, Cursor, Windsurf, Antigravity). Nunca
mantienes el mismo prompt en 5 sitios.

## Estructura del repo

```
senzu/
├── core/                     # Reglas COMUNES a todos los lenguajes
│   ├── methodology/          # devlog, git-flow, acciones prohibidas
│   ├── prompts/              # systemprompt base (se hereda en cada stack)
│   ├── hooks/                # hooks Node (.mjs, agnósticos de OS) — ver docs/hooks.md
│   ├── skills/               # skills propias (devlog, project-planner, code-quality, deploy-ops, email-html…)
│   ├── skills-vendor/        # skills de terceros COPIADAS por tools/vendor.ps1 (inglés, NO editar)
│   ├── skills-overlay/       # NUESTRA capa en español que se copia ENCIMA del vendor al renderizar
│   ├── skills-plugin/        # routers (skill-router, front-activation): tablas GENERADAS del registro
│   ├── skills-registry.json  # FUENTE ÚNICA de enrutado: grupo, cuándo, keywords, prioridad, requires
│   ├── commands/             # comandos slash — ver docs/comandos.md
│   ├── effects-vendor/       # repos de efectos con licencia verificada (no van en git: vendor-effects.ps1)
│   ├── githooks/             # commit-msg, pre-commit, pre-push (capa dura para CUALQUIER herramienta)
│   ├── perfiles.json         # perfiles de instalación: web, backend, front, agente-ia, librería → grupos
│   └── bundles.json          # bundles de skills opcionales
├── plugins/                  # GENERADO: los plugins de Claude Code y Codex (senzu-all, -front, -backend, -core)
├── .claude-plugin/           # marketplace.json (GENERADO)
├── assets/                   # logos y las imágenes de los artículos
├── docs/                     # GENERADO casi todo (la web los publica): skills, hooks, comandos, stacks y
│                             # efectos.md + efectos.json (catálogo de efectos y demos, el contrato con la web)
├── stacks/                   # UNA carpeta por stack — ver docs/stacks.md
│   └── <stack>/              # stack.json, systemprompt.md (EVOLUTIVO), best-practices.md,
│                             # prohibited.md, mcp.json, rules/ (extensible), settings.partial.json
├── tools/
│   ├── init.mjs              # EL INSTALADOR (Node: Windows, WSL, Linux, macOS): menú, perfiles, selección
│   ├── init-project.ps1      # El mismo instalador en PowerShell (resultado idéntico: test-init-parity)
│   ├── sync.ps1              # Re-renderiza la config a un proyecto respetando lo elegido (PowerShell)
│   ├── vendor.ps1            # Actualiza las skills upstream · vendor-effects.ps1: colección de efectos
│   ├── build-routers.ps1     # Regenera las tablas de skill-router/front-activation desde el registro
│   ├── build-plugins.ps1     # Genera plugins/ + marketplace.json
│   ├── build-docs.ps1        # Genera docs/, REFERENCIA.md, CHANGELOG.md y los badges del README
│   ├── build-creditos.mjs    # CREDITOS.md desde los manifiestos de terceros (y comprueba licencias)
│   ├── build-efectos.mjs     # docs/efectos.md y efectos.json desde el catálogo y las fichas de las demos
│   ├── trafico.mjs           # clones, visitas y estrellas acumulados por día (workflow diario → rama stats)
│   ├── check-skills.ps1      # Verificador: falla si algo se desconecta
│   ├── test-router.ps1       # casos dorados prompt → skill
│   ├── test-hooks.ps1        # los muros (exit 2 = bloquea)
│   ├── test-*.mjs            # el resto de suites (memoria, permisos, cierre, rondas, geometría, móvil…)
│   ├── install-skills.ps1    # Skills globales para Codex/Cursor/Windsurf/Claude
│   └── renderers/            # claude.ps1 · codex.ps1 · cursor.ps1 · windsurf.ps1 · antigravity.ps1
└── templates/                # Plantillas (devlog, plan, decisiones)
```

## Lo que Senzu deja en cada proyecto: todo en `senzu/`
```
<proyecto>/
├── CLAUDE.md · AGENTS.md          # donde los agentes los exigen (raíz)
├── .claude/ · .agents/            # skills, muros (hooks), comandos y configuración de cada agente
└── senzu/
    ├── senzu.json                 # marcador: stack, perfil, selección, permisos, hooks apagados, ramasProtegidas
    ├── conventions.md · .json     # convenciones selladas con /adoptar
    ├── devlog/                    # MEMORIA.md, INDEX.md, AAAA-MM-DD/NNN-slug.md
    ├── plan/                      # PLAN.md (tarjetas), brief.md, estimacion.md
    ├── auditoria/                 # AAAA-MM-DD-<area>.md (/auditar); sus tarjetas van al plan (fase AU)
    ├── arquitectura/              # adr/, contextos/, glosario/, event-storming/, context-map.md (DDD)
    ├── entrega/                   # manual, servicios y accesos para el cliente (/entregar)
    ├── informes/                  # comparativas e informes
    ├── mapa.md                    # mapa del proyecto (/mapa)
    ├── design-system/<slug>/      # MASTER, gustos, blueprint, brand-guidelines, propuestas/, logos/
    ├── ui-verify/                 # capturas de verificación (fuera de git)
    └── .estado/                   # en qué se quedó la sesión, para /retomar (fuera de git)
```
Si el proyecto ya tiene SU carpeta para algo (`docs/adr`, `docs/architecture`, un CHANGELOG), Senzu usa la suya y
no la duplica. Lo que Senzu dejaba antes en `docs/` (`docs/auditoria`, `docs/entrega`, `docs/MAPA.md`) lo mueven los
instaladores a `senzu/` con `git mv` al actualizar.

## Las tarjetas se cierran con pruebas
Todo trabajo con varios pasos va a `senzu/plan/PLAN.md` como tarjetas (las del plan y las que salen de una
auditoría, fase `AU`). Cada tarjeta lleva **«Para qué»**: el objetivo del usuario, o el hallazgo que resuelve.
El muro `tarjeta-guard` no deja pasarla a `[done]` sin **«Verificado»** (la evidencia real; en una de auditoría,
la misma que demostró el fallo), **«Cumple»** (cómo cumple su «Para qué») y un **«Devlog»** que exista.

## Ramas principales
Ni commit directo ni push del agente a una rama principal: `main`, `master`, `trunk`, `develop`, `dev`,
`staging`, `stage`, `preprod`, `production`, `prod`, `live`, `qa`, `uat`, `release` y `release/…`,
`production/…`, `staging/…` (un push a staging o a production también despliega), más las que el usuario añada
en `"ramasProtegidas"` del marcador. Una sola lista (`ramaProtegida()` en `lib.mjs`) para guard, cierre-limpio y
session-start, la misma en los githooks. Solo el usuario lo abre con `pushMain` / `commitEnMain`.

Fuera de `main` vive la rama **`stats`**: solo datos (el histórico de tráfico y los badges), la escribe cada día
el workflow `trafico.yml` y de ahí la leen el README y la web.

## Arranque guiado: el siguiente paso del método
`siguientePaso()` en `lib.mjs` responde «¿en qué punto está este proyecto?» y lo comparten `session-start` (lo
anuncia lo primero) y el muro `arranque-guard` (no deja escribir código sin él). Orden: **instalar** (no hay
`senzu/senzu.json`) → **adoptar** (hay código o historia, ≥5 commits, y ninguna convención sellada) → **brief**
(proyecto nuevo con perfil de front y sin brief real) → **plan** (proyecto nuevo sin tarjetas reales) →
**siguiente** (hay tarjetas: solo se anuncia). Las plantillas que deja el instalador no cuentan: una tarjeta
«X-T1 …» o «<Verbo + objeto>» no es un plan, ni un brief con «…» en el Objetivo.

Dos niveles. **instalar** y **adoptar** bloquean: el muro para una vez por paso y sesión, solo código y
manifiestos (nunca `senzu/`, `CLAUDE.md`, `AGENTS.md`, `.claude/` ni la documentación), así obliga a proponer el
paso sin dejar al usuario atascado. **brief** y **plan** no bloquean (no todo proyecto los necesita): la sesión y
la primera edición de código le recuerdan al agente que tiene que saber qué se va a hacer y, si el usuario no lo
ha dicho claro, hablarlo con él antes de programar; `/plan` solo si es algo grande o el usuario lo quiere. Los pasos que el
usuario no quiere en un proyecto van en `"omitirPasos"` del marcador (`init.mjs --omitir-paso`); el guard no
deja que el agente lo pase, y los dos instaladores lo conservan al reinstalar (como `ramasProtegidas`).

## Convenciones selladas: inmutables por cualquier camino
Lo sellado por `/adoptar` (`conventions.md` y `conventions.json` con `senzu:inmutable`) tiene cuatro capas:
`protect-files` (edición, también `apply_patch` de Codex), `conventions-guard` (el código que viola una regla),
`guard` (la terminal: escribir, mover, borrar o restaurar) y el githook `pre-commit` (ningún commit cambia ni
borra lo sellado sin `SENZU_ALLOW_CONVENCIONES=1`, la llave del usuario que el guard no deja usar al agente).
`protect-files` y `conventions-guard` no se pueden apagar desde el marcador.

**Rutas**: toda ruta que compara un hook pasa por `rutaNativa()` / `relDelProyecto()` de `lib.mjs` (y
`readHookInput()` ya entrega `file_path` normalizado). En Windows llegan mezcladas (`C:\`, `C:/`, `c:\`, `/c/`
de Git Bash, con barra final); compararlas como texto hizo que estos dos muros no bloquearan nada (092).
`test-convenciones` prueba todas las combinaciones.

## Versión al día y muros sin falsos positivos
`estadoVersion()` (lib.mjs) compara la versión que corre la sesión (el `plugin.json` junto a los hooks) con, por
orden: la registrada en `installed_plugins.json` (→ abrir una sesión nueva), la del marketplace descargado
(→ `/plugin update`) y la de GitHub (→ actualizar el marketplace; caché de 24 h en `~/.config/senzu/`, 1,5 s,
`SENZU_SIN_RED=1`). Las novedades que enseña son las de `core/novedades.json` entre la versión actual y la
ofrecida; `test-version` exige una línea por versión publicada.

Un muro que frena sin motivo enseña al agente a rodearlo. `test-falsos-positivos` guarda cada bloqueo injusto
visto (y el ataque que el arreglo no debe abrir): el guard mira el DESTINO de cada orden (leer el marcador no es
escribirlo), el menú del instalador se reconoce dentro de la misma línea, los flags de permisos se aceptan solo
en proyectos de prueba en la carpeta temporal, depurar-coach solo salta al EJECUTAR una verificación y
code-hygiene no revisa los scripts temporales del agente.

## Perfiles de instalación
`core/perfiles.json` responde «¿qué es el proyecto?» con un conjunto de grupos de skills. Un perfil es una
selección por categorías con nombre: se guarda en `senzu/senzu.json` y cada actualización la respeta, con
`init.mjs` o con `sync.ps1`. La regla que importa: **si lo elegido no tiene grupos de front, no se instala nada
de front** aunque el stack lo traiga (Laravel o Next con perfil backend): ni las skills, ni el muro de diseño,
ni los comandos de diseño, ni las secciones de front del `CLAUDE.md`/`AGENTS.md`. Los dos instaladores lo hacen
igual (`seleccionSinFront` / `Test-SeleccionSinFront`) y la prueba de paridad lo comprueba.

## Dos agentes en el mismo repositorio
`edit-tracker` apunta qué archivos toca cada sesión (en Codex, traduciendo `apply_patch`). Con eso:
- `cierre-limpio` no deja cerrar con archivos **propios** sin commitear (o se commitea lo hecho y se dice qué
  falta), y avisa de los **ajenos** sin tocarlos: pueden ser de Codex, de otra sesión de Claude o del usuario.
- `session-start` nombra al empezar lo que hay a medias, para no trabajar a ciegas encima.

## Registro único y verificador (todo conectado)

- **`core/skills-registry.json`** es la única fuente de "qué skill se usa": por skill, `group`, `when`,
  `keywords` (regex del prompt-router), `priority` (la específica gana), `requires` e `installedBy`.
  De él se derivan: las tablas de activación de `CLAUDE.md`/`AGENTS.md`, las reglas del router
  (`config.json → router`), las tablas generadas de `skill-router`/`front-activation` y `docs/skills.md`.
- **`tools/check-skills.ps1`** (11 checks) falla si: una skill no está en el registro (o al revés); un
  `SKILL.md` pasa de 100 líneas o su `description` de 250; una referencia citada no existe; una cita
  `skill §sección` no resuelve; las tablas generadas están desactualizadas; un plugin/bundle no
  satisface `requires`; los ejemplos de tarjeta no los parsea la regex real de los hooks.
- **Contratos únicos**: tarjeta de tarea (una regex en `core/hooks/lib.mjs`), devlog
  (`senzu/devlog/<fecha>/NNN-slug.md`), design system (`senzu/design-system/<slug>/MASTER.md`), `hooks/config.json`
  (mismas claves para proyecto y plugin).
- **El repo se protege solo**: `.githooks/` con commit-msg (Conventional ≤72, sin co-autores) y
  pre-commit que regenera plugins+docs y ejecuta las 3 suites antes de aceptar el commit.

## El plan manda: `project-planner`

Con decenas de skills y de muros hace falta quién decide **qué se hace, en qué orden y con qué skill**:

- `senzu/plan/PLAN.md` con **fases entregables** (walking skeleton primero) y **tareas pequeñas**
  (`F1-T2 · título [S] [todo]`), cada una con skill+sección a leer, "hecho cuando" y verificación.
  Una sola tarea `doing` a la vez.
- Los hooks lo leen: `session-start` muestra progreso y siguientes, `stop-guard` exige cerrar la
  tarea con devlog, `pre-compact` conserva el estado al compactar contexto.
- El "alma" son tres piezas: **principios** (`core/prompts/base-systemprompt.md`), **`skill-router`**
  (qué leer) y **`project-planner`** (qué hacer y en qué orden).

## Disciplina de contexto (por qué no se come la ventana del agente)

Lo que se carga **siempre** es pequeño; lo grande se lee **bajo demanda y por secciones**:

| Capa | Tamaño | Cuándo se carga |
|---|---|---|
| Reglas generadas (`CLAUDE.md`/`AGENTS.md`) con las tablas de activación | ~300 líneas | siempre |
| `description` de cada skill instalada | ≤ 250 caracteres | siempre |
| `SKILL.md` efectivo (propio u overlay ES) con su tabla "Lectura mínima por tarea" | ≤ 100 líneas | solo cuando la tarea encaja |
| `SKILL.upstream.md` y `references/` | grande | solo la sección indicada (offset/limit o Grep) |

Protocolo: una skill por tarea, solo su sección mínima, nada se lee entero, no se relee.

## Capas vendor + overlay (skills de terceros sin perder upstream)

Las skills de front son los repos reales [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
y [Claude Design Skillstack](https://github.com/freshtechbro/claudedesignskills) (MIT), vendorizados:

| Capa | Qué contiene | Quién la edita |
|---|---|---|
| `core/skills-vendor/<skill>/` | Copia íntegra upstream + `LICENSE.upstream`; `VENDOR.json` registra repo/commit | Nadie: `tools/vendor.ps1` |
| `core/skills-overlay/<skill>/` | `SKILL.md` en español, `references/es/` (brief, propuestas, gustos, anti-IA, fuentes/iconos, inspiración, copywriting…), plantillas y CSVs propios | Nosotros |

Al renderizar se fusionan (overlay ENCIMA del vendor). Actualizar upstream (`vendor.ps1`) nunca pisa
la capa propia. El mismo patrón aplica al catálogo de efectos (`core/effects-vendor/`, 124 repos MIT
con el código descargado e indexado).

## Cómo detecta el front cada herramienta

1. **Descripción del SKILL.md** con disparadores explícitos: lo usan Claude/Codex/Cursor para auto-invocar.
2. **Bloque generado "Front y diseño"** en las reglas: perfil del stack + tabla de activación —
   la garantía para herramientas sin hooks.
3. **Hooks de Claude Code**: recordatorio en la primera edición de UI + muro si no hay brief ni design
   system + verificación móvil obligatoria al cerrar (ver [docs/hooks.md](hooks.md)).

Búsqueda de diseño dentro de un proyecto:
```bash
py -3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech dashboard" --design-system -p "Mi App" --persist -o .
# macOS/Linux: python3 …
```

## Paridad entre herramientas

| | Claude Code | Codex / Cursor / Windsurf / Antigravity |
|---|---|---|
| Reglas + tablas de activación | CLAUDE.md | AGENTS.md / .cursor/rules / .windsurf/rules |
| Skills | .claude/skills/ | .agents/skills/ · .cursor/skills/ · .windsurf/skills/ |
| Muros en vivo (hooks) | ✔ | — (los cubren los githooks + las reglas) |
| Comandos slash | ✔ | — (frases en llano equivalentes: USO.md §4) |
| Guía propia del proyecto | CLAUDE.project.md importada | AGENTS.project.md referenciada |

## Versiones

Una sola numeración para todo: la versión que ves en Claude y en Codex es la del tag de git.

| Tipo de cambio | Versión | Cómo se publica |
|---|---|---|
| Tanda de funcionalidades | sube el segundo número (1.1.0 → 1.2.0) | `SENZU_RELEASE=1.2.0 git commit …` y luego `git tag -a v1.2.0` |
| Arreglos | sube el tercero (1.1.0 → 1.1.1) | igual, con `SENZU_RELEASE=1.1.1` y tag `v1.1.1` |
| Cambio incompatible (obliga a reinstalar) | sube el primero (2.0.0) | igual |

Entre dos releases, cada commit sube solo el tercer número (último tag + commits desde él), así
`/plugin marketplace update` siempre detecta que hay versión nueva. El `CHANGELOG.md` se genera del
devlog; en GitHub, cada tag puede tener su Release con esa parte del changelog.
