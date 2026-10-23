# Método de revisión de seguridad (lo que corre `/seguridad`)

Revisión defensiva con EVIDENCIA. No es un escaneo a ciegas ni teoría: es mapear la superficie, pasar OWASP
por lo que de verdad hay, y dejar cada hallazgo con prueba y arreglo. El detalle por vulnerabilidad vive en
`code-quality §references/security-owasp.md` y `auth-patterns.md`; aquí va el ORDEN y el CÓMO.

## Índice
1. Alcance y contexto · 2. Mapa de superficie · 3. Herramientas por stack (sin red ofensiva) · 4. Pasada
OWASP con evidencia · 5. Severidad · 6. Informe y plan · 7. Re-verificación

## 1. Alcance y contexto
- Es la PROPIA aplicación del usuario (código y config del repo). No se toca infraestructura ni sistemas de
  terceros: eso es pentesting y necesita autorización (`references/pentesting.md`).
- Pregunta el contexto: ¿maneja datos personales/pagos/salud? ¿es pública o interna? ¿qué roles hay? Eso fija
  qué pesa más (A01 control de acceso suele ser lo primero).
- Guarda el informe en el proyecto (nunca en temp): `senzu/informes/seguridad-<fecha>.md` (o donde el proyecto
  guarde sus informes).

## 2. Mapa de superficie (qué atacar)
Antes de buscar fallos, lista lo que recibe input o expone datos:
- **Entradas**: endpoints/rutas, Server Actions (Next) y Astro Actions (son públicos aunque el botón no se
  vea), formularios, webhooks, parámetros, cabeceras, cookies, uploads, mensajes de cola, respuestas de APIs.
- **Autenticación y roles**: cómo se inicia sesión, dónde se autoriza, qué es admin.
- **Datos sensibles**: tablas con PII, secretos, tokens, qué se registra en logs.
- **Salidas peligrosas**: render de HTML/markdown de usuario, SQL/plantillas/shell con input, URLs que pide el
  servidor (SSRF), tools de un agente de IA.
- **Dependencias**: manifiestos y lockfiles, scripts postinstall, skills de terceros (eso lo cubre
  `supply-guard` + el comando `/dependencias`).

## 3. Herramientas por stack (automatizado, sin red ofensiva)
Corre lo que aplique y pega la salida como evidencia:
- **Dependencias**: `composer audit` · `npm audit --audit-level=high` / `pnpm audit` · `pip-audit` / `uv` ·
  `osv-scanner -r .` (multi-lenguaje).
- **Secretos en el repo e historial**: `gitleaks detect --no-banner` o `trufflehog git file://. --only-verified`.
- **SAST** (análisis estático): `semgrep --config auto` (soporta PHP/JS/TS/Python/Go…) — el más rentable de un
  tirón. Por stack: `phpstan`/`larastan`, ESLint con `eslint-plugin-security`, `bandit` (Python), `gosec` (Go).
- **Cabeceras** (si está desplegado o en local): revisa HSTS, CSP, X-Content-Type-Options, Referrer-Policy;
  comprueba con Mozilla Observatory / securityheaders.com. Sin red ofensiva: solo tu propia URL.
- Nota: estas NO son herramientas de pentesting (no escanean sistemas de terceros); `semgrep`, `gitleaks`,
  `*-audit` son defensivas y pasan el muro. Un `nmap`/`sqlmap` contra un host NO (necesita autorización).

## 4. Pasada OWASP con evidencia (checklist, cada punto con prueba)
Recorre `security-owasp.md` sobre el mapa del paso 2. Por cada área, abre el código y comprueba:
- **A01 Control de acceso**: ¿cada operación autoriza en servidor sobre el recurso concreto? Busca queries sin
  filtro de propietario/tenant (`find(id)` sin `where owner = user`), rutas sin policy, `role`/`is_admin`
  aceptados del cliente (mass-assignment). Test que lo prueba: "usuario sin permiso" y "recurso de otro".
- **Inyección**: `DB::raw`/`whereRaw`/`$queryRaw`/f-strings con input; `exec`/`shell=True`/`child_process.exec`;
  `{!! !!}`/`dangerouslySetInnerHTML`/`v-html`/`set:html`; deserialización de datos externos.
- **Auth y sesiones**: hashing (bcrypt/argon2id), cookies HttpOnly/Secure/SameSite, JWT `alg` fijo y `exp`,
  rate limit en login/reset, sin enumeración de usuarios (ver `auth-patterns.md`).
- **Secretos y config**: secretos fuera del repo/bundle/logs, `APP_DEBUG=false`, sin endpoints de debug en prod.
- **SSRF**: URLs de usuario que pide el servidor con lista blanca y bloqueo de IPs internas (169.254.169.254).
- **Uploads**: validación por magic bytes, re-encode de imágenes, almacenamiento fuera del webroot.
- **LLM/agentes**: si hay IA, `references/agentes-ia.md`.
- **Logging**: ¿se registra PII o la request entera? (el muro `backend-guard` ya avisa de parte).

Cada hallazgo: QUÉ (una frase) · DÓNDE (`archivo:línea` o la petición) · POR QUÉ es explotable (escenario
concreto) · CÓMO se arregla (con el patrón de `security-owasp.md`).

## 5. Severidad
- **Crítica**: explotable por un anónimo con impacto grave (RCE, saltarse auth, leer datos de otros, secreto
  real en el repo). Para todo.
- **Alta**: explotable con una cuenta normal, o fuga de datos sensibles.
- **Media**: necesita condiciones (XSS self, falta de cabecera, rate limit flojo).
- **Baja/Informativa**: defensa en profundidad, buenas prácticas.

## 6. Informe y plan
- Resumen ejecutivo (en llano: qué riesgo corre el negocio), tabla de hallazgos por severidad, y un plan:
  qué se arregla ya (crítica/alta) y qué queda como mejora. No arregles a lo loco en la misma pasada: primero
  el mapa completo, luego los arreglos priorizados (cada uno con su test).
- No borres ni "arregles" datos ni toques producción. Propón; el usuario decide.

## 7. Re-verificación
- Un hallazgo no se cierra hasta re-probarlo: el test que fallaba (o la petición que colaba) ahora no pasa.
- Decisión y arreglo al devlog. Si el arreglo tocó un muro o una convención, cítalo.
