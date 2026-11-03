<!-- GENERADO por tools/build-docs.ps1 desde el devlog interno del proyecto. -->

# Changelog

Resumen por fecha (lo nuevo arriba). El detalle de cada entrada vive en el diario interno del proyecto.

## 2026-11-03

- **feature** — Adaptador de Codex DESBLOQUEADO y hecho (X-T25): el formato de hooks de Codex es el MISMO hooks.json del plugin de Senzu (con ${CLAUDE_PLUGIN_ROOT}), que si esta en el repo. Nuevo modo install.mjs --plugin <dir>: empaqueta plugin autocontenido (.claude-plugin/plugin.json + hooks/hooks.json con 6 eventos + apply_patch + los .mjs copiados). test-plugin 35/0, npm test 54/199/14/24/35/22/40. Falta solo publicar/aprobar en la app de Codex (usuario) (exp) (entrada 223)
- **feature** — Web bilingue ES/EN (F12-T2): Astro i18n (en en /, es en /es/), diccionario src/i18n + todos los componentes del landing via t(), selector EN/ES, hreflang/canonical/og absolutos (dominio gethemispheric.com); docs/benchmarks en ingles esta pasada. Cuervo del hero entero (object-contain, ya no se corta). Adaptador de Codex investigado por subagente: BLOQUEADO (falta el formato de plugin de Codex, externo; los hooks ya corren, test-hooks-codex 18/18). ui-verify 0 problemas (en/es) (exp) (entrada 222)
- **feature** — Cuervo difuminado en el hero (marca de agua bajo el cerebro) + pagina /benchmarks INTERACTIVA (count-up de 16.2/5.3/+206, reveal de secciones, hover en filas; progresivo + prefers-reduced-motion) + SEO basico (robots.txt; og/favicon ya estaban). ui-verify 0 problemas (3 paginas x 375/768/1440). Publicar bloqueado por: comando de instalacion real y dominio/deploy (del usuario) (exp) (entrada 221)
- **feature** — Cierra F12-T11: docs en el repo Hemispheric (docs.md narrativo espejo de la web /docs: mensaje, que es, install real node install.mjs, Cortex, anfitriones, licencia, FAQ) + README al dia (quitado Obsidian, enlace a docs.md, Estado = carve-out completo); cuervo en el footer de la web. Build 3 paginas, ui-verify 0 problemas (exp) (entrada 220)
- **feature** — La mascota (el CUERVO) aplicada en la web: 4 imagenes de Codex (guardian, memoria, favicon, lockup) a src/assets/brand via astro:assets Image + favicon/apple-touch/og con sharp. Favicon del cuervo, glifo en el Nav, cuervo guardian en el loader "Hemispheric", cuervo-memoria en la cabecera de /docs, og:image = lockup. Build 3 paginas, ui-verify 0 problemas. La vida que faltaba (exp) (entrada 219)
- **feature** — Pagina /docs en la web (hemi-web): What it is, Install, How it works, The Cortex (enlace a la demo), Hosts, License, FAQ acordeon, en el design system con indice de anclas; enlaces /docs repuestos en Nav/Footer/QuickStart. Build 3 paginas sin enlaces muertos, ui-verify 0 problemas (375/768/1440). Parte web de F12-T11; falta espejo en el repo Hemispheric + mascota (exp) (entrada 218)
- **decisión** — Brief de marca (skill brand): mensaje confirmado ("Tu agente, con memoria propia, y que nunca sale de tu maquina"; memoria determinista local vs mem0/Zep) + mascota elegida por el usuario = el CUERVO que guarda y recuerda (metafora de memoria local, data-art, ojo ambar). brand/brief-marca-mascota.md con prompts Codex; memoria proyecto.marca-hemispheric. El usuario genera en Codex, el agente aplica despues (exp) (entrada 217)
- **feature** — Loader de marca "Hemispheric" (velo en BaseLayout, serif + punto ambar, ~700ms al cargar y reaparece al navegar a paginas internas; anti-flash is:inline, prefers-reduced-motion, aria-hidden) + arbolito (grafo de juguete Cortex.tsx) reubicado del hero a "How it works" con pie. Loader visible a 300ms OK, ui-verify 0 problemas (375/768/1440) (exp) (entrada 216)
- **feature** — Cerebro real en el HERO: nuevo modo solo-cerebro en cortex.mjs (htmlCortex soloCerebro: solo el canvas 3D, fondo transparente, arranca en 3D) via public/cortex-hero.html, sustituye el grafo SVG de juguete; CortexEmbed acepta src/bare/frameClass. Etiquetas de zona rehechas (eran serif blanca plana, "muy simple"): mono, mayusculas, tracking, color de la zona, anillo+punto+conector (data-art). Bateria 40/40, ui-verify 0 problemas (375/768/1440). Sync a Senzu. Cortex.tsx queda sin uso (exp) (entrada 215)
- **feature** — F12-T5: el cerebro REAL (cortex.mjs con relieve) se ve en la web; se genera con datos de demo (proyecto ficticio Aurora Coffee, 17 hechos) un HTML autonomo public/cortex-demo.html y se embebe por iframe (CortexEmbed.astro) en la seccion demo, sustituyendo el grafo SVG de juguete (Cortex.tsx); + texto de pista interactiva. Iframe carga OK (canvas #lienzo3d), ui-verify 0 problemas (375/768/1440). Hero aun con el grafo de juguete (pendiente) (exp) (entrada 214)
- **feature** — F12-T8: seccion de slides "Meet the Cortex" en hemi-web (carrusel sin dependencias: scroll-snap + botones + puntos + teclado + prefers-reduced-motion; 5 slides que explican el cerebro) + "Cortex" en la Nav; ademas baja el margen lateral (contenedor 1400->1600, texto 2xl->3xl) y se arregla el render de la web Astro en el entorno (remapeo de assets con letra de unidad). Build 2 paginas OK, render desktop/movil sin errores ni desborde. Falta visto del usuario (exp) (entrada 213)

## 2026-11-02

- **fix** — F12-T1: nueva fase F12 (web seria, 7 tarjetas) + auditoria de hemi-web por codigo (no se renderiza el build Astro aqui: localhost bloqueado) + cluster critico arreglado: licencia "MIT" falsa -> PolyForm Noncommercial + comercial de pago (C) Peterson Sena con CTA mailto; enlaces muertos /docs y REPO_URL="#" retirados/condicionales (sin href="#"); Obsidian quitado de anfitriones; build 2 paginas OK. Pendiente (usuario): comando de instalacion real y URL del repo (exp) (entrada 212)
- **test** — F11-T2: batería visual de la Cortex (tests/test-cortex-visual.mjs, Hemispheric) que mide píxeles del canvas 3D en Chromium real; 40 casos (6 idiomas, datos límite vacío/uno/enorme/raros con emoji-RTL-inyección, foco de búsqueda por diffing de frames, cerebro se pinta de verdad, presupuesto de frame móvil, paridad+privacidad cliente); MUERDE (sabotaje de la atenuación → FALLO, revertido); npm test 54/199/14/24/22/40. Además: el agente SÍ puede ver renders vía Playwright→PNG→lectura (file://, localhost y publicar bloqueados por el sandbox) (exp) (entrada 211)
- **feature** — F11-T1: Cortex 3D dirigido por la búsqueda; al buscar se encienden solo los nodos del dato encontrado (uno por dato por zona) + sus conexiones y el resto se atenúa, con impulsos («rollo cerebro»); nodosPorZona + buscar() + focoBusqueda en cortex.mjs (fuente Hemispheric, sync a Senzu); HTML 145KB OK, verify-build verde (test-cortex 105 PASS); falta visto visual del usuario (exp) (entrada 210)
- **test** — F10-T5: paridad e2e entre anfitriones en el repo propio (test-paridad portado, HOOKS=src, en npm test): recall+arranque byte-idénticos bajo Claude/Codex/standalone en 6 idiomas; 22/0 y npm test 54/199/14/24/22; CIERRA el carve-out F10 (Obsidian descartada, Codex-plugin pendiente) (exp) (entrada 209)
- **feature** — F10-T4: Senzu consume el cerebro de Hemispheric (fuente de verdad) por sync unidireccional (tools/sync-hemispheric.mjs) + guard de deriva (test-sync-hemispheric) que rompe el build si divergen; resolvers hechos/memoria/memoria-check layout-agnósticos (unión de candidatos) → 16 ficheros byte-idénticos; degrada sin el repo hermano; Codex nativo por plugin pendiente; verify-build verde, Hemispheric npm test 54/199/14/24 (exp) (entrada 208)

## 2026-10-30

- **decisión** — Licencia de Hemispheric: doble licencia © 2026 Peterson Sena — no comercial gratis (PolyForm Noncommercial 1.0.0, con crédito) + uso comercial de pago (COMMERCIAL.md, petersonsena24@gmail.com); MIT descartado (permite comercial gratis); Senzu sigue MIT; LICENSE/COMMERCIAL/README/package.json + memoria proyecto.licencia-hemispheric (exp) (entrada 207)
- **feature** — F10-T2: instalador propio de Hemispheric (install.mjs); registra los hooks de cerebro en Claude (.claude/settings.json, proyecto o --global), merge-safe, idempotente, --uninstall/--dry-run; crea .hemispheric/ y ~/.config/hemispheric/ + manifiesto hooks.json; Codex nativo por plugin (F10-T4), sin fabricar config.toml; test-install 24/0 (exp) (entrada 206)
- **feature** — F10-T1: repo propio con el núcleo portable (estructura limpia src/cli/cortex/tests, elegida por el usuario); copiado (no movido) de dev-standards, cero imports a Senzu; cli ajustado + buscar/memoria-check para el recall unificado; npm test verde allí (frontera 54/0, hechos 199/0, hard-recall 14/0); licencia pendiente (exp) (entrada 205)
- **test** — F9-T5: Senzu como adaptador fino (cierra F9); los inyectores delegan en el núcleo la decisión de inyectar (host.reclamarInyeccion), probado behavioral (turno reclamado → el hook cede); test-adaptador 6/0; test-hooks.ps1 PASS dentro de verify-build (método Senzu intacto; su invocación directa da falsos positivos de supply/pentest-guard porque la suite contiene malware/sqlmap a propósito); verify-build verde (exp) (entrada 204)
- **test** — F9-T4: paridad de inyección entre anfitriones; recuerdo-vivo y session-start corridos de verdad bajo Claude/Codex/standalone sobre proyectos sembrados igual → bloque idéntico salvo la ruta; recall multilingüe es/en/pt/fr/de/it byte-idéntico; engine≡hook; test-paridad-inyeccion 22/0, verify-build verde (exp) (entrada 203)
- **feature** — F9-T3: apretón de manos para que recuerdo-vivo/session-start no inyecten dos veces; cerrojo de turno «primero-gana» atómico (flag wx) en host.reclamarInyeccion, clave evento:proyecto:sesión:huella; huérfano se reclama, reloj atrás no caduca en falso; wiring en los dos hooks sin regresión; test-handshake 14/0 (carrera real de 8 procesos), test-hechos-hooks 146/0, verify-build verde (exp) (entrada 202)
- **feature** — F9-T2: detección de anfitrión (core/hooks/host.mjs) para el núcleo portable; resuelve agente (claude/codex/obsidian/standalone) por señales reales + senzu presente (eje aparte, para el handshake) + mapa de memoria + punto de inyección; env inyectable, determinista, precedencia y variable mentida cubiertas; cableado de librería en build-plugins/check-skills/build-docs; test-host 25/0, frontera 81/0, verify-build verde (exp) (entrada 201)
- **feature** — F9-T1: frontera del núcleo (carve-out Hemispheric); inventario de core/hooks en cerebro (viaja: recuerdo-vivo/session-start/estado-sesion/memoria/hechos) · base común (lib/messages/session-end) · método Senzu (se queda); gate tools/test-carve-frontera.mjs que falla si un hook de cerebro alcanza método (transitivo + fail-on-uncovered + autocomprobación); 78/0 y prueba negativa exit=1 (exp) (entrada 200)
- **design** — Cortex: reskin con la paleta de la web de Hemispheric (hemi-web): base casi-negra + acento ámbar #B45309 + 5 zonas rearmonizadas + Instrument Serif; tokens confirmados en el HTML; FALTA verificación visual (ui-verify no corre aquí: sin Playwright, file:// y publish bloqueados) (exp) (entrada 199)
- **feature** — X-T22: harness del benchmark de memoria sobre LongMemEval (prueba seria de X-18/temporal); ingesta estructurada a dimensiones estables (sustituye/data), adaptador mem0 para LongMemEval, runner reanudable; experimento controlado motor vs embedding vs mem0 en knowledge-update + temporal-reasoning (211 preg.); cableado verificado, run pendiente (exp) (entrada 198)
- **feature** — X-T20: intención temporal de futuro; una mudanza programada (desde>ahora) no borra el presente (transición en la línea de tiempo) y aflora ante «¿y después?»; pistas futuras multilingües + intencionTemporal (pasado con precedencia); test-hechos 199/0, hard-recall 14/0, eval sin cambio (exp) (entrada 197)
- **fix** — X-T23: arreglada la deriva de versionado; test-version §4 comprueba que el último tag de release (no cada patch efímero) tiene su línea en novedades.json; verify-build por fin TODO en verde (33 suites) sin inventar notas (exp) (entrada 196)
- **test** — X-T19: suite hard-recall determinista SIN LLM (gate de CI); distractor 3ª persona, multilingüe, diversidad bajo cupo, temporal presente/pasado; triada por capa; la descubre verify-build sola; 12/0 y PASS en verify-build (único rojo: test-version, deriva preexistente ajena) (exp) (entrada 195)
- **feature** — X-T18: guarda de ambigüedad al sustituir; un valor con matiz (es/en/pt/fr/de/it) no borra el vigente bueno en familias de valor único, deja ambos activos y avisa; regex con límite de palabra Unicode (sin falsos positivos); test-hechos 193/0, robustez 23/0, eval sin cambio (exp) (entrada 194)
- **feature** — F8-T9: cierre del cara a cara contra productos (LoCoMo); tabla a 3 completa (motor 25,6% · embedding 28% · mem0 21,1%) + Zep muestra 18,5%; BENCHMARK.md publicable; Zep inviable completo en local (exp) (entrada 193)

## 2026-10-29

- **fix** — F8-T9 (Fase 3e): Zep se moría ingiriendo (JSON gigante de qwen3); ingesta troceada en episodios + techo de salida + tolerancia a fallos; conv-26 reseteada por consistencia (exp) (entrada 192)

## 2026-10-28

- **feature** — F8-T9 (Fase 3d): runner del bench completo (10 convs) + progreso [GLOBAL %] en terminal durante ingesta y preguntas (exp) (entrada 191)
- **feature** — F8-T9 (Fase 3c): Zep=Graphiti+Neo4j montado (cliente no-think, RRF); funciona pero ~2h/conversación, muy lento (exp) (entrada 190)
- **feature** — F8-T9 (Fase 3b): mem0 operativo (think:false) + comparador; cara a cara conv-1: motor 28,2% > mem0 14,9% (embedding 30,3%) (exp) (entrada 189)
- **feature** — F8-T9 (Fase 3a): montaje de mem0 (venv D:, mem0ai 2.2.1 + nomic + adaptador mem0_locomo.py); pendiente primera ejecución (exp) (entrada 188)

## 2026-10-27

- **feature** — F8-T9 (Fase 2f): embedding e2e LoCoMo 28,0% vs motor 25,6%; el denso gana (esperado), el motor defiende por ejes (exp) (entrada 187)
- **feature** — F8-T9 (Fase 2e): LoCoMo motor completo 25,6% (0 €); juez local validado a mano (es justo); fix cat5 (adversarial_answer) + re-juez (exp) (entrada 186)
- **feature** — F8-T9 (Fase 2c): Qwen3-8B local operativo (think:false vía /api/chat nativo); smoke 10 preg. OK; Docker movido a D: (C: +140 GB) (exp) (entrada 184)
- **feature** — F8-T9 (Fase 2b): pipeline end-to-end (recuperar→contestar→juez) con tope de gasto, checkpoints y --dry; llm.mjs local-first Qwen3 (exp) (entrada 183)
- **feature** — F8-T9 (Fase 2a): recuperación offline motor vs embedding sobre turnos; LoCoMo (motor gana) y LongMemEval (embedding gana), 0 red/0 € (exp) (entrada 182)
- **feature** — F8-T9 (Fase 1): base del cara a cara vs productos de memoria (datasets LoCoMo/LongMemEval + loader común con streaming) (exp) (entrada 181)

## 2026-10-23

- **feature** — F8-T5: publicación reproducible (modo --bench, artículo BENCHMARK.md, mención en README); sin publicar fuera sin OK (exp) (entrada 180)
- **feature** — F8-T8: 2.º benchmark externo (NanoMIRACL); embedding gana, motor a la par de bm25, misma historia que TyDi (exp) (entrada 179)
- **feature** — F8-T4: batería adversaria (envenenado, homónimos, cruzado, erratas, abstención, empates, 10.000 hechos); test-eval-baselines (exp) (entrada 178)
- **feature** — F8-T3: dónde pierde el motor (parafraseo/distractor ante embedding; TyDi); modo --comparar, sin sobreajuste (exp) (entrada 177)
- **feature** — F8-T2: ejes más allá del recall (latencia, red, determinismo, coste, tamaño); modo --tabla (exp) (entrada 176)
- **feature** — F8-T7: benchmark externo público (Answerable TyDi QA) con datos reales; el motor bate a bm25/grep, pierde en recall ante embeddings (exp) (entrada 175)
- **feature** — F8-T1: baseline semántico (embedding local e5-small) y cierre del cara a cara de los cuatro (exp) (entrada 174)
- **feature** — F8-T1: baselines grep y bm25 para el benchmark comparado de la memoria (exp) (entrada 173)

## 2026-10-22

- **fix** — fix: brand con sync-senzu.mjs y /dependencias como comando (2.24.2) (entrada 172)
- **docs** — Skills y comandos en inglés para la documentación (2.24.1) (entrada 171)
- **feature** — Los escapes SENZU_ALLOW_* valen por comando, no por sesión (2.24.0) (entrada 170)
- **docs** — El resto de la documentación en inglés (skills, referencia, novedades, créditos, README) (entrada 169)
- **feature** — Los muros Bash miran dentro del script que se ejecuta (2.24.0) (entrada 168)

## 2026-10-20

- **feature** — El aviso N+1 ya capta los bucles de Python (2.24.0) (entrada 167)
- **feature** — Muro de inyección/XSS en edición y escaneo de secretos en el commit (2.24.0) (entrada 166)
- **feature** — Skill y comando /seguridad, muro de pentesting, aviso N+1 y skill TanStack (2.24.0) (entrada 165)

## 2026-10-19

- **feature** — /dependencias, muro no-borrar-tests y hygiene test/spec (2.24.0) (entrada 164)
- **feature** — Muro de cadena de suministro: anti-malware y skills maliciosas (2.24.0) (entrada 163)

## 2026-10-16

- **fix** — El CHANGELOG público ya no filtra rutas locales () (entrada 162)
- **feature** — /instalar pregunta el idioma y pasa --lang (2.23.0) (entrada 161)
- **feature** — X-T17 verificado: la web bilingüe se llena de inglés con v2.22.0 (entrada 160)
- **feature** — Muro legal en main (bilingüe) + RGPD a fondo e IA (AI Act) (entrada 159)
- **docs** — Guías en inglés (.en.md) y --lang documentado (entrada 158)
- **docs** — Guías en inglés (.en.md) y --lang documentado (entrada 158)

## 2026-10-13

- **fix** — fix: memoria-check.mjs no entraba al repo (.gitignore devlog muy amplio) (entrada 157)
- **feature** — i18n F1-T3: el router enruta prompts en inglés (keywords union) (entrada 156)
- **feature** — i18n F1-T2: descripciones de comando por idioma (menú /) (entrada 155)
- **feature** — i18n F1-T1h: últimos muros (arquitectura, front, cierre, tarjeta) (entrada 154)
- **feature** — i18n F1-T1g: feature-guard y code-hygiene al catálogo (entrada 153)
- **feature** — i18n F1-T1f: backend-guard al catálogo (entrada 152)
- **feature** — i18n F1-T1e: muros de protección (protect/conventions/secrets) (entrada 151)
- **feature** — i18n F1-T1d: arranque-guard y siguientePaso al catálogo (entrada 150)
- **feature** — i18n F1-T1c: stop-guard (avisos de cierre) al catálogo (entrada 149)
- **feature** — i18n F1-T1b: el resto de los deny() de guard al catálogo (entrada 148)
- **feature** — i18n F1-T1a: el array rules de guard al catálogo de idioma (entrada 147)
- **feature** — i18n F0-T5: instalar --lang y walking skeleton end-to-end (entrada 146)
- **test** — i18n F0-T4: test de paridad de locales (catálogo, comandos, router) (entrada 145)
- **feature** — i18n F0-T3: build-plugins -Lang renombra los comandos por idioma (entrada 144)
- **feature** — i18n F0-T2: catálogo de mensajes de muro por idioma (piloto deploy + verify-build) (entrada 143)
- **feature** — i18n F0-T1: idioma de la UI (inglés por defecto) y mapa de nombres de comando (entrada 142)

## 2026-10-12

- **feature** — Muro legal: no se publica una web a producción sin páginas legales (cookies/privacidad) (entrada 141)

## 2026-10-10

- **feature** — Idioma por ejes al adoptar: identificadores en inglés, dominio en el del negocio (entrada 140)
- **feature** — Conexiones y pool: la skill lo explica y un hook (pool-guard) lo hace cumplir (entrada 139)
- **fix** — El plan a medias ya no parece terminado, y el cierre liga plan y memoria (entrada 138)

## 2026-10-08

- **feature** — Que se entienda solo: avisos al guardar hechos que dentro de un mes no dirán nada (X-T15) (entrada 137)
- **test** — Segunda pasada asociativa: medida y descartada (X-T14) (entrada 136)
- **feature** — Une lo que va junto: activación propagada por nombres compartidos, hasta dos saltos (X-T13) (entrada 135)
- **feature** — El pasado, solo: las pistas temporales traen la historia (X-T12) (entrada 134)
- **feature** — Reconsolidación: la memoria aprende las palabras del usuario (X-T11, REALM) (entrada 133)
- **feature** — Cortex enseña cómo piensa: lo que más usa brilla más y «Ver cómo piensa» (X-T10) (entrada 132)
- **feature** — El agente sabe qué tiene la memoria y la consulta: mapa al empezar y aviso con cada mensaje (X-T9) (entrada 131)

## 2026-10-07

- **fix** — El agente sube a ramas de trabajo; las principales siguen protegidas (2.19.2, D-042) (entrada 130)
- **feature** — Léxico multilingüe de la convención: +11 puntos de recuerdo en la batería dura (X-T8) (entrada 129)
- **test** — Batería grande y dura: 386 preguntas en dos proyectos, línea base honesta (X-T5) (entrada 128)
- **feature** — Cortex vivo: se regenera al cerrar y el 3D elige zona (X-T7) (entrada 127)
- **feature** — Contradicciones de la memoria al empezar la sesión (X-T6) (entrada 126)
- **feature** — Registro del uso real de la memoria y --informe (X-T4) (entrada 125)
- **feature** — Convención de claves: la misma dimensión para lo mismo en cualquier idioma (X-T3) (entrada 124)
- **fix** — Saber que no sabe: abstención del 73 % al 88,5 % sin perder recuerdo (X-T2) (entrada 123)
- **test** — Cortex: revisión y lanzamiento, veredicto LISTA (F7-T4) (entrada 122)
- **fix** — Cortex: multiidioma, 3D anatómico con flujo de neuronas, 2D afinado y modo claro (entrada 121)
- **feature** — Cortex: la memoria en un HTML local, 2D/3D por zonas, y vista de cliente sin nada privado (F7-T3) (entrada 120)
- **design** — Design system de Cortex por rondas: Nocturno + 2D neón, giro 3D libre (F7-T2) (entrada 119)
- **docs** — Brief de Cortex aprobado: 2D y 3D, colores votados, modo cliente (F7-T1) (entrada 118)
- **feature** — Relevancia por uso y enfriamiento en la memoria de hechos (F6-T5) (entrada 117)
- **feature** — Procedencia, confianza y casi-duplicados en la memoria de hechos (F6-T4) (entrada 116)
- **feature** — Consolidación de lo aprendido al cerrar una sesión de trabajo (F6-T3) (entrada 115)
- **feature** — Objetivos y pendientes con ciclo de vida (F6-T2) (entrada 114)
- **feature** — Enlaces entre hechos y expansión de un salto (F6-T1) (entrada 113)
- **test** — Garantías: sin contexto no inventa y nunca da por vigente lo que no lo es (X-T1) (entrada 112)
- **docs** — Memoria de hechos documentada y propuesta de fusión para después de la prueba real (F5-T1) (entrada 111)
- **fix** — Afinado de la memoria de hechos con cifras, y su límite honesto (F4-T4) (entrada 110)
- **test** — Sesiones de punta a punta de la memoria de hechos, en Claude y en Codex (F4-T3) (entrada 109)
- **fix** — Robustez de la memoria de hechos: archivo dañado, concurrencia, tamaño, Unicode y rutas (F4-T2) (entrada 108)
- **feature** — Evaluación medida de la memoria de hechos: el punto de partida (F4-T1) (entrada 107)
- **feature** — Lo aprendido pasa a la sesión siguiente y /recordar elige el destino (F2-T4, F3-T3, F3-T4) (entrada 106)
- **feature** — Revisar la memoria es obligatorio al cerrar, en cualquier idioma (F3-T1 y F3-T2) (entrada 105)
- **feature** — Al editar un archivo, también los hechos de su tema (F2-T3) (entrada 104)
- **feature** — Recuerdo vivo: con cada mensaje, lo que la memoria ya sabe de eso (F2-T2) (entrada 103)
- **feature** — Los hechos vigentes llegan al iniciar la sesión, como datos (F2-T1) (entrada 102)
- **feature** — Aviso de decisiones de MEMORIA.md que citan un valor ya sustituido (F1-T3) (entrada 101)
- **feature** — Cada hecho enlazado con su entrada del devlog; plan ampliado con memoria casi perfecta y Cortex (F1-T2) (entrada 100)
- **feature** — Recuerdo unificado: hechos, MEMORIA.md y devlog en una sola consulta (F1-T1) (entrada 099)
- **feature** — Rama exp/hemispheric, fase 1: motor de hechos determinista en cualquier idioma y sin red (entrada 098)
- **fix** — verify-build entiende el tipo de proyecto: sin manifiesto no es un build · v2.19.0 (entrada 097)
- **feature** — Arquitectura declarada: MVC con servicios, hexagonal o DDD, cumplida por un muro · v2.18.0 (entrada 096)
- **feature** — La cadena del método entre comandos y muros de backend para que una feature no falle · v2.17.0 (entrada 095)

## 2026-10-05

- **fix** — Citar no es hacer: los muros miran lo que se ejecuta, no el texto que lo menciona · v2.16.0 (entrada 094)
- **feature** — Aviso de Senzu desactualizado y muros sin falsos positivos · v2.15.0 (entrada 093)
- **fix** — Convenciones selladas blindadas: rutas normalizadas, terminal, commit y no apagables · v2.14.0 (entrada 092)
- **feature** — Arranque guiado: el siguiente paso del método, anunciado y exigido antes del código · v2.13.0 (entrada 091)
- **feature** — Todo dentro de senzu/, tarjetas que se cierran con pruebas y ramas principales protegidas · v2.12.0 (entrada 090)

## 2026-10-04

- **feature** — Memoria viva: memoria del usuario, correcciones apuntadas, memoria por archivo, /retomar y medida del recuerdo · v2.11.0 (entrada 089)
- **feature** — Cierre limpio: no cerrar con archivos propios sin commitear ni tocar los de otro agente · v2.10.0 (entrada 088)
- **feature** — Perfiles de instalación (web, backend, front, agente de IA, librería) y scopes de Claude en la guía · v2.9.0 (entrada 087)

## 2026-10-03

- **feature** — Cuántas veces se clona Senzu: histórico diario en la rama stats, badge y datos para la web · v2.8.0 (entrada 086)
- **docs** — INSTALL.md para quien llega de fuera: plugin + /instalar primero, sin rutas de una máquina · v2.7.1 (entrada 085)
- **feature** — La web se rompe como un cristal: los trozos son la propia página · v2.7.0 (entrada 084)

## 2026-10-02

- **docs** — Catálogo de efectos y demos publicados para la web (docs/efectos.md + efectos.json) · v2.6.1 (entrada 083)
- **feature** — Física e impacto: intro y loader con pantalla rota, objeto que cae, página que se desmorona · v2.6.0 (entrada 082)
- **feature** — Versión móvil pensada (plan por sección, pieza V) y verificada usando el menú y con captura anotada · v2.5.0 (entrada 081)
- **feature** — ui-verify mide la geometría en píxeles (centrado, loaders, spinners, SVG, casi-alineados) · v2.4.0 (entrada 080)
- **feature** — Logo ya elegido visible para Claude y Codex (hooks y muros) + guía de marca en senzu/ · v2.3.0 (entrada 079)
- **chore** — Ningún nombre de la agencia en lo público + comprobación con la lista privada · v2.2.4 (entrada 078)
- **docs** — Sin cifras escritas a mano en la documentación + comprobación en check-skills · v2.2.3 (entrada 077)
- **fix** — CI: test-verify-build ya no depende de tener pnpm instalado · v2.2.2 (entrada 076)
- **infra** — Devlog privado y preparación de la limpieza del historial · v2.2.1 (entrada 075)
- **fix** — Marketplace de 13 a 4 plugins (62 → 25 MB) y guía generada por la versión anterior reconocida · v2.2.0 (entrada 074)
- **fix** — CI: falso FAIL de check-skills por finales de línea CRLF en Windows · v2.1.1 (entrada 073)
- **feature** — Licencia MIT, CREDITOS.md generado, licencias en CI y actualización semanal de terceros por PR · v2.1.0 (entrada 072)
- **docs** — Brief, marca, briefs de logos y plan de la web (movidos al repo aparte) (entrada 071)
- **docs** — Docs: clonado con la carpeta senzu/ y plugins senzu-* · v2.0.1 (entrada 070)

## 2026-10-01

- **feature** — dev-standards pasa a llamarse Senzu y todo lo del proyecto va a senzu/ (migración automática) · v2.0.0 (entrada 069)
- **fix** — verify-build entiende monorepos (paquetes y lenguajes) y el aviso de memoria mira el contenido · v1.6.2 (entrada 068)
- **fix** — El buscador lee también docs/devlog y los ADR del proyecto (un monorepo: de 14 a 200 entradas) · v1.6.1 (entrada 067)
- **feature** — Rondas de maquetas con piezas votables, /ronda y verificador (fijado, vetado, algo nuevo) · v1.6.0 (entrada 066)
- **feature** — Permisos por proyecto (subir, subir a main, commit en main) y hooks apagados, solo por el usuario · v1.6.0 (entrada 065)
- **fix** — Muros reales en Codex (traducción de apply_patch, Stop en JSON) y formateo que no impone estilo · v1.5.0 (entrada 064)
- **feature** — Memoria del proyecto (devlog/MEMORIA.md) + buscador del devlog con raíces, erratas y sinónimos · v1.4.0 (entrada 063)
- **fix** — verify-build encuentra Pint en Windows (./vendor/bin) y el instalador fusiona .mcp.json en vez de vaciarlo · v1.3.2 (entrada 062)
- **fix** — Capturas, maquetas e informes en el proyecto (no en temp) + .ui-verify ignorado por git · v1.3.1 (entrada 061)

## 2026-09-30

- **feature** — Modo ahorro de tokens opcional (CLAUDE.md compacto) · v1.3.0 (entrada 060)
- **feature** — Recetas con Pretext: texto medido sin el DOM (rodear formas, reajuste, masonry, canvas) (entrada 059)
- **build** — Colección de efectos fuera de git (Codex no clonaba) + CI con las suites (entrada 058)
- **feature** — Aviso de assets pesados al cerrar + skill instalar-proyecto para Codex (entrada 057)
- **feature** — /depurar (y aviso automático al fallar un test), /estimar, /entregar, /mapa y muros de backend (entrada 056)
- **feature** — Instalador interactivo (todo / categorías / a medida) con selección persistente y poda + /instalar en Codex sin barras · v1.2.0 (entrada 055)
- **fix** — /instalar en Codex: sin $NOMBRE en el texto (Codex lo toma como argumento) + check 12 ampliado · v1.1.2 (entrada 054)
- **fix** — La versión del plugin sale de los tags (una sola numeración) + homepage en el manifest · v1.1.1 (entrada 053)
- **fix** — Comandos compatibles con Codex (sin $ARGUMENTS/argument-hint) + check 12 + skills globales completas · v1.1.0 (entrada 052)
- **feature** — Auditoría de backend con pruebas: skill backend-audit, /auditar, /refactor, reglas de arquitectura en /verificar (entrada 051)
- **docs** — Guía de prueba para dirección (docs/guia-de-prueba.md): instalar y probarlo todo en una tarde (entrada 050)
- **feature** — Efectos 44→79 (CSS moderno, formas/SVG, tipografía cinética, microinteracciones, WebGL), composiciones de página, +8 repos MIT (entrada 049)

## 2026-09-29

- **feature** — Instalador agnóstico init.mjs (Windows/WSL/Linux/macOS) + suite de paridad PS↔Node (entrada 048)
- **fix** — dev-standards-all recomendado; /instalar con camino WSL soportado; roadmap instalador Node (entrada 047)
- **fix** — Versión monótona de plugins (1.0.n): update detecta builds del mismo día (entrada 046)
- **feature** — /instalar: del plugin a la instalación completa del proyecto (clona, detecta stack, init/sync) (entrada 045)
- **docs** — README showcase + CHANGELOG generado + tag v1.0.0 (entrada 044)
- **docs** — Docu multi-doc: README hub + docs/{skills,comandos,hooks,stacks,arquitectura} generada (entrada 043)
- **feature** — Lista negra anti-IA (muro+crítica), rotación de referencias, checkpoint por sección, iconos sin default (entrada 042)
- **fix** — Codex/Antigravity respetan la guía propia (AGENTS.project.md via Resolve-GuideTarget) (entrada 041)
- **feature** — Tanda pro back+front: 7 refs (bd, realtime, files, llm, a11y, cwv, forms), skill email-html, muros .only/conflictos (entrada 040)
- **feature** — Nuevo vs existente: preguntar antes de adaptarse; /adoptar modo entrevista; CLAUDE.dev-standards.md (entrada 039)

## 2026-09-22

- **docs** — REFERENCIA.md generada: catálogo de skills, enrutamiento, comandos y muros (entrada 038)
- **fix** — Instalación en un monorepo + fixes: UTF8 en backup, import CLAUDE.project.md, versiones en monorepos (entrada 037)
- **feature** — Stacks nuevos: wordpress, node-api, nuxt, sveltekit + referencias Go/Java/C# (entrada 036)
- **feature** — Stacks conscientes de versión (EOL en session-start) + /adoptar con conventions-guard (entrada 035)
- **refactor** — Hooks agnósticos de OS: PowerShell → Node (.mjs) + reglas devops en el guard (entrada 034)
- **feature** — Skill deploy-ops multi-stack (deploy, Docker, CI/CD, backups) + muro de deploy (entrada 033)
- **feature** — Muros obligatorios (librerías, debug, vetos de gustos, UI sin brief) + test-hooks (entrada 032)

## 2026-09-19

- **feature** — Directorio marketing-seo: SEO, GA4/GTM y MCPs de analítica (entrada 031)

## 2026-09-18

- **docs** — ROADMAP.md + decisión mobile en el mismo repo (dev-023) (entrada 030)

## 2026-09-17

- **feature** — Acompañamiento y calidad de salida: /repaso, /lanzar, crítica visual, evals, copy, medición, i18n (entrada 029)
- **feature** — Modo propuesta: blueprint aprobable + maquetas A/B + memoria de gustos (entrada 028)
- **feature** — Colección completa: todos los codrops MIT (124 carpetas, 234 MB) + canteras nuevas (entrada 027)
- **feature** — Verificación obligatoria de builds/backend (edit-tracker + verify-build + stop-guard) (entrada 026)
- **feature** — Hooks piden brief antes de diseñar + image-gen en stacks (entrada 025)
- **fix** — Perfil de front efectivo: detección de package.json + override manual (entrada 024)
- **fix** — image-gen REGLA 0: generación nativa del host antes que el script (entrada 023)

## 2026-09-16

- **feature** — Skill image-gen: imágenes IA coherentes con la web (Codex primero) (entrada 022)
- **feature** — Backend: 5 recetas operativas + catálogo por síntoma + B2 ampliado (entrada 021)
- **feature** — effects-vendor híper completo: 63 repos MIT por categoría + INDEX (entrada 020)
- **feature** — effects-vendor: código real MIT (uiverse, vanta, 6 codrops) + más canteras (entrada 019)
- **feature** — Scraping de la mega colección (índices Codrops/CodePen/Awwwards) (entrada 018)
- **feature** — Fuentes de efectos: colección viva (Codrops, CodePen, protocolo demo→receta) (entrada 017)
- **feature** — Recetario del look moderno (aurora CSS, bento, spotlight, CSS nativo) (entrada 016)
- **feature** — Caja de recursos, playbooks por negocio y modo descubrimiento (/brief) (entrada 015)
- **feature** — Front monstruo: brief, verificación móvil obligatoria, fuentes/iconos, inspiración, A0, reglas extensibles (entrada 014)
- **infra** — Instalación remota desde GitHub (plugins versionados + bootstrap) (entrada 013)
- **feature** — Comandos slash + ui-verify + encoding blindado + perfil Astro híbrido (entrada 012)

## 2026-09-15

- **infra** — Git del repo + test-router (22 casos) + skill de marca de la agencia (entrada 011)
- **feature** — Front Pro: árboles de decisión, catálogo de efectos, enrutado con entrypoints (entrada 010)

## 2026-08-25

- **refactor** — Todo conectado: registro único de skills, contratos verificados, paridad sin hooks (entrada 009)
- **feature** — project-planner: plan/PLAN.md coordina las skills + principios en el prompt base (entrada 008)
- **feature** — Set completo de hooks (11) + config por proyecto (entrada 007)
- **feature** — ddd-hexagonal como biblioteca (74 docs por tema) (entrada 006)
- **feature** — Mega plugin v2: contexto mínimo, code-quality, ddd-hexagonal, más front (entrada 005)
- **feature** — Instalación tipo plugin: marketplace Claude Code + skills globales (entrada 004)
- **refactor** — Vendor UI UX Pro Max + Design Skillstack (overlay ES) (entrada 003)
- **feature** — Mega-skills de front y diseño (entrada 002)

## 2026-07-18

- **infra** — Estructura inicial dev-standards (entrada 001)
