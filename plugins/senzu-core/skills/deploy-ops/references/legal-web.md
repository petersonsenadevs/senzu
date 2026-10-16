# Legal de una web: cookies, privacidad y consentimiento (RGPD/LSSI y equivalentes)

Qué páginas legales necesita una web pública, qué debe tener cada una y cómo montar un banner de cookies
que **de verdad** cumple. El muro de deploy bloquea publicar a producción una web sin NINGUNA página legal;
este documento es el QUÉ y el CÓMO. El veredicto final se da en `/lanzar` (checklist §5 Legales).

> **Regla de oro**: el agente NO inventa el texto legal. Los datos del titular (NIF, razón social,
> dirección), las finalidades del tratamiento, los encargados y los plazos de conservación los aporta el
> cliente, y el texto final lo valida un abogado o un servicio especializado. El agente monta la
> estructura, el banner y el bloqueo técnico; no redacta cláusulas que luego nadie revisa.

## Índice
1. Las páginas mínimas y qué contiene cada una
2. El banner de consentimiento que sí cumple
3. Librerías recomendadas (no reinventar el banner)
4. Google Consent Mode v2 (si hay GA4 / Google Ads)
5. Montaje por stack
6. Formularios y newsletter
7. Si publicas fuera de España (UE, UK, EE. UU., Brasil)
8. RGPD a fondo (lo que no se ve en las páginas)
9. IA en la web: Reglamento de IA de la UE (AI Act) + RGPD
10. Checklist rápido

## 1. Las páginas mínimas y qué contiene cada una (España/UE: RGPD + LSSI-CE)
Accesibles desde el **footer de todas las páginas**, con URL propia e indexables:

- **Aviso legal (LSSI, art. 10)**: titular, NIF/CIF, domicilio, email de contacto, datos de registro
  mercantil si aplica, y el objeto del sitio. Obligatorio para cualquier web con actividad económica.
- **Política de privacidad (RGPD, arts. 13-14)**: responsable del tratamiento, qué datos se recogen y de
  dónde, finalidades y **base de legitimación** de cada una, destinatarios/encargados (hosting, email,
  analítica, pasarela de pago), transferencias internacionales, **plazos de conservación**, derechos ARCO-POL
  (acceso, rectificación, supresión, oposición, portabilidad, limitación) y cómo ejercerlos, y la AEPD como
  autoridad de reclamación. Enlazada desde cada formulario.
- **Política de cookies**: qué cookies usa el sitio (propias y de terceros), finalidad, duración y cómo
  revocar el consentimiento. Debe coincidir con lo que el banner realmente carga (hazla a partir de una
  auditoría real de cookies, no de memoria).

## 2. El banner de consentimiento que sí cumple
El error típico es un banner con solo "Aceptar" que, además, ya ha cargado Google Analytics antes de
tocarlo: eso **no es consentimiento** y es sancionable. Requisitos:

- **Bloqueo previo**: las cookies/scripts NO esenciales (analítica, marketing, mapas, vídeo embebido,
  píxeles) no se cargan hasta que el usuario acepta. Solo las técnicas/necesarias van sin consentimiento.
- **Rechazar tan fácil como aceptar**: botón "Rechazar" visible en el primer nivel, al mismo peso que
  "Aceptar". Nada de "Aceptar" grande y "Configurar" escondido.
- **Granular**: categorías (necesarias / analítica / marketing / preferencias) que se pueden aceptar por
  separado. Las necesarias, informadas pero no desactivables.
- **Sin muros de cookies ni patrones oscuros**: no condicionar el acceso a aceptar; no premarcar casillas;
  no usar colores que empujen a aceptar.
- **Revocable**: un enlace/botón permanente ("Preferencias de cookies") para cambiar la decisión luego.
- **Registro del consentimiento**: guardar qué aceptó y cuándo (lo hacen las librerías de abajo).

## 3. Librerías recomendadas (no reinventar el banner)
Montar un CMP (Consent Management Platform) a mano y que cumpla es más difícil de lo que parece. Usa una
probada y configúrala:
- **Open source / self-host**: Klaro!, Orest Bida `cookieconsent` (vanilla, sin dependencias) — gratis,
  controlas el bloqueo de scripts.
- **SaaS con auditoría y multi-idioma**: Cookiebot, CookieYes, Osano, Iubenda (también genera textos base
  revisables). Útiles si el cliente necesita escaneo periódico y versión en varios idiomas.
- **WordPress**: Complianz o CookieYes.
Elige UNA, bloquea los scripts de terceros a través de ella y genera la política de cookies desde su
auditoría.

## 4. Google Consent Mode v2 (si hay GA4 / Google Ads)
Desde 2024 Google exige Consent Mode v2 para seguir midiendo/remarketing en el EEE. Patrón: por defecto
`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` = `denied`; al aceptar, el CMP llama
a `gtag('consent','update', …)` y recién entonces se activa la medición. La mayoría de CMP de arriba tienen
integración directa con Consent Mode: actívala, no la implementes a mano salvo que haga falta.

## 5. Montaje por stack
- **Astro**: el CMP como script en el `<head>` del layout base (o una isla); los scripts de analítica/marketing
  con el `type`/atributo que la librería bloquea hasta el consentimiento. Páginas legales como rutas
  (`src/pages/politica-de-privacidad.astro`, `.../politica-de-cookies.astro`, `.../aviso-legal.astro`).
- **Next.js**: CMP en `app/layout.tsx`; GA4/Pixel vía `next/script` con `strategy` y cargado solo tras el
  consentimiento (o con Consent Mode). Rutas en `app/(legal)/…/page.tsx`.
- **Vue SPA**: CMP en `main.ts`/`App.vue`; vistas legales como rutas del router; recuerda `prerender`/SSG
  para que las páginas legales sean indexables.
- **Laravel (Blade)**: partial `components/cookie-banner.blade.php` en el layout; páginas legales como vistas
  con sus rutas; scripts de terceros condicionados al consentimiento.

## 6. Formularios y newsletter
- Checkbox de privacidad **no premarcado** enlazando a la política; sin él no se envía.
- Newsletter: **doble opt-in** (email de confirmación) y base de legitimación = consentimiento; guarda la
  prueba (fecha, IP) y ofrece baja en cada envío.
- Minimiza datos: pide solo lo necesario para la finalidad declarada.

## 7. Si publicas fuera de España (clave para una web en inglés)
Lo anterior es ES/UE. Al abrir a otros públicos cambian las reglas — adapta textos y banner (o usa un CMP
SaaS multi-jurisdicción):
- **Resto UE**: mismo RGPD; la ley de cookies y las autoridades varían por país.
- **Reino Unido**: UK GDPR + PECR; autoridad ICO. Muy parecido a la UE.
- **EE. UU.**: no hay ley federal única. California (CCPA/CPRA) y otros estados exigen un enlace claro de
  tipo "Do Not Sell or Share My Personal Information" y respetar la señal Global Privacy Control (GPC); el
  modelo es opt-out, no opt-in como la UE.
- **Brasil**: LGPD, autoridad ANPD; cercana al RGPD.
No asumas que el banner de la UE vale en EE. UU. ni al revés: el modelo de consentimiento es distinto.

## 8. RGPD a fondo (lo que no se ve en las páginas)
Más allá de las páginas públicas, el RGPD obliga a cosas que el cliente debe tener resueltas; el agente lo
recuerda y monta lo técnico, pero no sustituye al responsable legal.

- **Base de legitimación por finalidad (art. 6)**: cada tratamiento se apoya en UNA base: consentimiento,
  ejecución de un contrato, obligación legal, interés vital, misión de interés público o **interés legítimo**.
  Analítica y marketing → consentimiento; gestionar un pedido → contrato; facturación → obligación legal. No
  uses "interés legítimo" como cajón de sastre para saltarte el consentimiento de cookies.
- **Encargados del tratamiento (art. 28)**: todo tercero que trata datos por ti (hosting, email marketing,
  analítica, pasarela de pago, CRM, un LLM de IA) necesita un **contrato de encargo (DPA)** firmado. Lista
  realista de encargados = base de la política de privacidad.
- **Transferencias internacionales (arts. 44-49)**: si un encargado trata datos fuera del EEE (muchos SaaS de
  EE. UU.), hace falta garantía: decisión de adecuación (EE. UU. → **Data Privacy Framework** si la empresa
  está adherida) o **Cláusulas Contractuales Tipo (SCC)**. Decláralo en la política.
- **Registro de actividades de tratamiento (RAT, art. 30)**: documento interno de qué se trata y por qué.
  Obligatorio salvo excepciones; para una pyme con web + newsletter es breve pero debe existir.
- **Delegado de Protección de Datos (DPO)**: obligatorio si hay tratamiento a gran escala de datos sensibles
  u observación sistemática. Una web corporativa normal no suele necesitarlo; una que perfila usuarios, sí.
- **Evaluación de impacto (EIPD/DPIA, art. 35)**: antes de un tratamiento de alto riesgo (perfilado masivo,
  datos sensibles, biometría, decisiones automatizadas con efecto relevante).
- **Brechas de seguridad (arts. 33-34)**: notificar a la **AEPD en 72 h** desde que se conoce, y a los
  afectados si hay riesgo alto. Conviene tener el procedimiento escrito antes de necesitarlo.
- **Derechos (arts. 15-22)**: acceso, rectificación, supresión, oposición, portabilidad, limitación y a no ser
  objeto de decisiones automatizadas. Plazo de respuesta: **1 mes**. La web da un canal claro para ejercerlos.
- **Privacy by design / by default (art. 25) y minimización (art. 5)**: pide solo los datos necesarios,
  casillas no premarcadas, retención limitada y seudonimización/cifrado donde tenga sentido.

## 9. IA en la web: Reglamento de IA de la UE (AI Act) + RGPD
Si la web usa IA (chatbot/asistente, generación de imágenes o texto, recomendaciones, scoring), se suman
obligaciones nuevas. El agente implementa los avisos y etiquetas; el alcance legal lo valida el cliente.

**Reglamento (UE) 2024/1689 — AI Act (transparencia, art. 50)**
- **Chatbot/asistente de IA**: el usuario debe saber que **interactúa con una máquina**, no con una persona
  (salvo que sea obvio). Aviso visible al inicio de la conversación.
- **Contenido generado o manipulado por IA**: imágenes, audio, vídeo o texto sintéticos deben **marcarse como
  generados por IA**, de forma legible por humanos y por máquina (metadatos). Los *deepfakes* y el texto de
  interés público, etiquetados de forma clara.
- **Calendario**: prohibiciones de usos inaceptables desde feb-2025; obligaciones de transparencia y de los
  modelos de propósito general escalonadas hasta 2026-2027. Riesgo "limitado" (la mayoría de webs) = sobre
  todo **transparencia**; "alto riesgo" (empleo, crédito, educación…) añade muchas más obligaciones.

**RGPD aplicado a la IA**
- **Decisiones automatizadas (art. 22)**: si una IA decide algo con efecto jurídico o significativo sobre la
  persona (conceder un crédito, descartar una candidatura), hay derecho a **intervención humana**, a una
  explicación y a oponerse. No escondas una decisión automática detrás de un "lo revisa el sistema".
- **Datos en el chatbot**: lo que el usuario escribe suele ser dato personal; define la base de legitimación,
  decláralo en la política de privacidad y **no lo envíes a un LLM de terceros sin DPA** (el proveedor de IA es
  un encargado, §8) ni sin informar. Avisa de no pegar datos sensibles o de terceros.
- **Entrenamiento**: no uses datos personales de los usuarios para entrenar o afinar modelos sin base legal e
  información previa; ofrece oposición si procede.

**Práctico en la web (lo que monta el agente)**
- Chatbot IA: aviso "Estás hablando con un asistente de IA" + enlace a privacidad; disclaimer si el tema roza
  asesoramiento legal, médico o financiero ("no sustituye a un profesional").
- Imágenes/texto generados por IA: etiqueta visible (y metadatos C2PA si el pipeline lo permite); sin
  afirmaciones engañosas en marketing.
- Proveedor de IA (OpenAI, Anthropic, Google, Mistral…): añádelo como encargado en la política, firma su DPA,
  revisa región de datos y retención, y comprueba si entrena con tus datos por defecto (desactívalo).
- Si el widget de IA usa cookies de terceros, entra en el banner de consentimiento (§2), no al margen.

> Como con el resto: el agente no da asesoramiento legal. Implementa el aviso, la etiqueta y el disclaimer;
> el texto y el encaje legal los valida un abogado o un servicio especializado.

## 10. Checklist rápido (el detalle con evidencia, en /lanzar §5)
- [ ] Aviso legal, privacidad y cookies accesibles desde el footer, con datos reales del cliente.
- [ ] Banner que bloquea lo no esencial hasta aceptar, con "Rechazar" visible y revocación permanente.
- [ ] Analítica/marketing detrás del consentimiento (Consent Mode v2 si es Google).
- [ ] Política de cookies = auditoría real de lo que carga el sitio.
- [ ] Formularios con checkbox no premarcado; newsletter con doble opt-in.
- [ ] Texto legal validado por el cliente/abogado (el agente no lo inventa).
- [ ] Encargados (hosting, email, analítica, pasarela, IA) con DPA y declarados; transferencias fuera del EEE con garantía (DPF/SCC).
- [ ] Si hay IA: aviso de que se habla con un asistente de IA, contenido generado por IA etiquetado, y el proveedor de IA como encargado (§9).
