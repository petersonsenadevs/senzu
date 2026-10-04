# Protocolo de auditoría (/auditar)

Índice: 1 Alcance · 2 Inventario · 3 Medición con herramientas · 4 Lectura dirigida · 5 Verificación
de cada hallazgo · 6 Priorización · 7 Informe y plan · 8 Qué NO hacer

## 1. Alcance (2 minutos, con el usuario)
- ¿Todo el backend o un área? (pagos, API pública, colas, un módulo). Un área bien auditada vale más
  que todo mal auditado. Si el usuario no lo sabe, empieza por los hotspots (§3) y propón el área.
- ¿Para qué? (antes de un refactor, antes de heredar el proyecto, un incidente, preparar producción).
  El objetivo cambia la prioridad: antes de producción manda seguridad y datos; antes de un refactor,
  arquitectura y tests.
- Límite de tiempo acordado. Una auditoría sin límite no termina.

## 2. Inventario (lo que hay, sin juzgar todavía)
- Stack y versiones (lo inyecta session-start) y convenciones (`senzu/conventions.md` si existe).
- Estructura: módulos o carpetas principales, puntos de entrada (rutas, comandos, colas, cron, webhooks).
- Qué herramientas de calidad YA tiene el proyecto (linters, análisis estático, tests, CI). Úsalas antes
  de proponer otras.
- Tamaño: nº de archivos y líneas por módulo (orden de magnitud, no contabilidad).

## 3. Medición con herramientas (la base de la evidencia)
Ejecuta, en este orden, lo que exista o se pueda ejecutar sin instalar (herramientas y comandos por
stack en `herramientas-por-stack.md`):
1. **Hotspots**: `node <skills>/backend-audit/scripts/hotspots.mjs` — dónde se concentra el riesgo.
2. **Tests y cobertura**: ¿pasan? ¿qué partes críticas no tienen ni un test?
3. **Análisis estático** al nivel que el proyecto aguante (empieza bajo, sube hasta que aparezca ruido).
4. **Dependencias**: vulnerabilidades conocidas y paquetes abandonados o muy desactualizados.
5. **Arquitectura**: reglas de capas y dependencias circulares.
6. **Rendimiento dirigido**: N+1 y consultas lentas en los flujos críticos (log de queries en local).
Guarda la salida relevante de cada herramienta: es la evidencia del informe.

## 4. Lectura dirigida
Solo ahora se lee código, y solo el que las herramientas señalan: los hotspots, los archivos con más
avisos, los flujos críticos del alcance (login, pago, alta, integraciones). Para cada zona, recorre las
categorías de `catalogo-hallazgos.md` que apliquen.

## 5. Verificación de cada hallazgo
Antes de que un hallazgo entre en el informe:
- Abre el código real y confirma que la herramienta no se equivoca (falso positivo → fuera).
- Consigue la evidencia más fuerte posible, en este orden de preferencia:
  1. **Test que falla** y reproduce el problema (el mejor: demuestra y queda como red para el arreglo).
  2. **Medición** (tiempo, nº de consultas, memoria) antes y después de una carga concreta.
  3. **Salida de herramienta** con regla, archivo y línea.
  4. **`archivo:línea`** con el fragmento y el razonamiento en una frase.
- Marca la confianza: **confirmado** (hay reproducción o medición) o **probable** (evidencia estática).
- Lo que no puedas probar va a la sección de sospechas, con qué haría falta para confirmarlo.

## 6. Priorización
Gravedad (crítica, alta, media, baja) según `catalogo-hallazgos.md`, ajustada por:
- **Superficie**: ¿código público o expuesto a usuarios? ¿hotspot? Sube un nivel.
- **Probabilidad**: ¿pasa ya en producción o solo en un caso raro? Baja un nivel si es teórico.
- **Coste del arreglo**: esfuerzo S, M o L. Los arreglos críticos de esfuerzo S van primero.

## 7. Informe y plan
- Informe con la plantilla de `informe.md` en `senzu/auditoria/<AAAA-MM-DD>-<area>.md`.
- Presenta al usuario el resumen ejecutivo y los 3-5 hallazgos principales; pregunta qué se arregla.
- Lo aprobado → tarjetas en `senzu/plan/PLAN.md` (formato de `project-planner/templates/task-card.md`), una por
  hallazgo o grupo pequeño, en una fase propia (`AU-T1`, `AU-T2`…) ordenadas por riesgo:
  - **Para qué**: el hallazgo y su riesgo en una línea, con su id y el informe
    (`H-03 de senzu/auditoria/2026-10-04-pagos.md: un cliente ve los pedidos de otro`).
  - **Skill**: la receta del catálogo que lo arregla. **Verificar**: la MISMA evidencia que demostró el fallo
    (el test de reproducción que fallaba ahora pasa, la herramienta ya no lo marca, la medición mejora).
  Los refactores grandes se hacen con `/refactor`.
- Las tarjetas se trabajan con `/siguiente`, una a una, como las del plan. El muro tarjeta-guard no deja cerrar
  ninguna sin «Verificado» (esa evidencia, otra vez), «Cumple» (el riesgo ya no existe) y su devlog. Cuando se
  cierran todas las de un informe, se anota en él «Resuelto: AU-T1…AU-Tn» con la fecha.
- Devlog con herramientas ejecutadas, hallazgos por gravedad y decisiones.

## 8. Qué NO hacer
- Informes de 80 hallazgos cosméticos que esconden los 3 que importan.
- Reportar como fallo lo que la versión del framework o las convenciones del proyecto justifican.
- Arreglar durante la auditoría ("ya que estaba…"): mezcla diagnóstico y cambio, y nadie revisa.
- Instalar herramientas o dependencias sin preguntar.
- Opiniones de estilo como hallazgos ("yo usaría X").
