---
description: Crea o retoma el plan del proyecto (senzu/plan/PLAN.md) con la skill project-planner
---

Uso: `/plan [descripción del proyecto o feature]` — el argumento es opcional salvo que se indique lo contrario; si no llega, aplica el comportamiento por defecto de abajo.

Aplica la skill `project-planner`:

1. Si existe `senzu/plan/PLAN.md`, léelo (cabecera + fase activa) y resume: progreso, tarea `doing` y siguientes; propón continuar.
2. Si no existe (o lo que el usuario escribió tras el comando describe algo nuevo): descubrimiento breve del proyecto, brief con alcance IN/OUT en
   `senzu/plan/brief.md`, y plan completo en `senzu/plan/PLAN.md` (fases entregables; tarjetas `### F1-T1 · título  [S] [todo]` con
   skill+sección, "hecho cuando" y "verificar"). Presenta el plan y espera mi OK antes de ejecutar.
3. Proyecto nuevo con backend y sin `senzu/arquitectura/capas.json`: elige con el usuario la arquitectura
   (`code-quality §references/arquitectura-declarada.md`: MVC con servicios para la mayoría, hexagonal con
   integraciones o reglas que se prueban sin BD, DDD + hexagonal solo con dominio complejo) y la primera
   tarjeta la declara: `node <skills-dir>/code-quality/scripts/arquitectura.mjs --plantilla <estilo> --stack <s>`,
   carpetas de cada capa, ADR en `senzu/arquitectura/adr/` y `--sellar` con su OK.

Petición: lo que el usuario escribió tras el comando

## Al terminar
Con el OK del usuario: `/siguiente` para la primera tarjeta. Con interfaz y sin design system, antes `/design-system`.
