---
description: Revisión de seguridad con evidencia — mapa de superficie, pasada OWASP, informe y plan de arreglo
---

Uso: `/seguridad` — sin argumento, revisa todo el proyecto; con una zona (p. ej. `/seguridad auth` o `/seguridad el checkout`), céntrate en ella.

Aplica la skill `security` (lee `references/metodo-revision.md`). Es una revisión DEFENSIVA de la propia aplicación del usuario, con una prueba por hallazgo. No es pentesting: no se tocan sistemas de terceros ni infraestructura (eso necesita autorización, `references/pentesting.md`).

1. Contexto y alcance: pregunta qué maneja (datos personales, pagos, público o interno, roles) para saber qué pesa más. El control de acceso suele ser lo primero.
2. Mapa de superficie: lista entradas (endpoints, Server/Astro Actions, formularios, webhooks, uploads, cabeceras, colas), autenticación y roles, datos sensibles, salidas peligrosas (HTML/SQL/shell con input, URLs que pide el servidor, tools de IA) y dependencias.
3. Automatizado (defensivo, no ofensivo): corre lo que aplique y pega la salida — `semgrep --config auto`, `gitleaks detect`, `composer audit` / `npm audit --audit-level=high` / `pip-audit`, `osv-scanner -r .`. Para la cadena de suministro, la skill `dependencias`.
4. Pasada OWASP sobre el mapa (detalle en `code-quality references/security-owasp.md` y `auth-patterns.md`): control de acceso e IDOR, inyección, auth y sesiones, secretos y config, SSRF, uploads, logging de PII, y si hay IA, `references/agentes-ia.md`. Cada hallazgo con QUÉ, DÓNDE (archivo:línea o petición), POR QUÉ es explotable y CÓMO se arregla.
5. Severidad (crítica/alta/media/baja) e informe en el proyecto (`senzu/informes/seguridad-<fecha>.md`, nunca en temp): resumen en llano, tabla de hallazgos y plan priorizado.
6. No arregles a lo loco ni toques producción o datos: primero el mapa completo, luego los arreglos por prioridad, cada uno con su test. Un hallazgo no se cierra sin re-verificarlo.

## Al terminar
Si hay hallazgos críticos o altos, no sigas con el deploy ni cierres sin resolverlos o que el usuario los apruebe; deja la decisión y el arreglo en el devlog. Después, el paso siguiente del método lo dice /siguiente, o /verificar antes de cerrar.
