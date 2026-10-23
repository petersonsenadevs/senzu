# Diseño de base de datos: esquemas, índices, migraciones y búsqueda

Índice: 1 Esquema · 2 Índices · 3 Migraciones seguras (expandir → contraer) · 4 Desnormalizar con cabeza ·
5 Búsqueda full-text · 6 Errores típicos

## 1. Esquema
- Nombres: tablas en plural snake_case, PK `id`, FK `<singular>_id`, timestamps siempre; el naming del
  proyecto manda si ya existe (senzu/conventions.md).
- Tipos correctos > validación en código: dinero en enteros de céntimos o `decimal` (nunca float),
  fechas en UTC (`timestamptz`/`datetime`), enums de BD o tabla lookup según necesidad de evolucionar.
- `NOT NULL` por defecto; nullable es una DECISIÓN (¿qué significa NULL aquí?). Defaults en la BD.
- Restricciones en la BD, no solo en el framework: UNIQUE, FK con `ON DELETE` pensado (restrict por
  defecto; cascade solo si el hijo no tiene sentido sin el padre), CHECK para invariantes simples.
- Relación N:M → tabla pivote con su propia identidad si lleva datos (fecha, cantidad, estado).

## 2. Índices
- Regla: **indexa lo que filtras/ordenas/uneas**, no todo. Cada índice encarece cada escritura.
- FK SIEMPRE indexadas (MySQL lo hace solo; Postgres NO — trampa clásica).
- Compuestos: el orden importa — columna de igualdad primero, rango después (`(user_id, created_at)`
  sirve para `WHERE user_id = ? ORDER BY created_at`, al revés no).
- Únicos para invariantes de negocio (email, slug, `(pedido_id, producto_id)`) — el código puede fallar,
  el UNIQUE no (data-integrity §únicos).
- Antes de optimizar: `EXPLAIN` real con datos reales. Un índice sin usar se borra.

## 3. Migraciones seguras (expandir → migrar → contraer)
- **Nunca** cambio destructivo en un solo paso sobre datos en producción:
  1. **Expandir**: añade la columna/tabla nueva (nullable o con default), despliega código que escribe en AMBAS.
  2. **Migrar**: backfill por lotes (chunks, no un UPDATE de 10M filas que bloquea).
  3. **Contraer**: cuando nada lee lo viejo, deploy posterior elimina columna/código antiguo.
- Renombrar columna = expandir+contraer (alias temporal), no `RENAME` a pelo con la app viva.
- Añadir índice a tabla grande: `CREATE INDEX CONCURRENTLY` (Postgres) / online DDL — sin lock de tabla.
- Toda migración con `down()` honesto; si es irreversible, dilo explícitamente y exige backup previo.

## 4. Desnormalizar con cabeza
- Por defecto: normaliza (3FN práctica). Desnormaliza solo con una lectura CARA y MEDIDA que lo justifique.
- Patrones sanos: contadores cacheados (`comments_count` mantenido por evento/trigger), snapshot de datos
  en el momento del hecho (precio y nombre EN el pedido: eso no es duplicar, es historia), tablas de
  lectura/reporting regeneradas por job.
- Toda desnormalización documenta QUIÉN la mantiene actualizada (evento, job, trigger) o se pudre.

## 5. Búsqueda full-text
- Un `LIKE '%x%'` no escala ni rankea. Escalera de decisión:
  1. **Postgres FTS** (`tsvector` + índice GIN): gratis, en tu BD, suficiente para la mayoría (+ `pg_trgm`
     para fuzzy/typos). MySQL: FULLTEXT INDEX con ngram para lo básico.
  2. **Meilisearch/Typesense** (self-host ligero): typo-tolerance, facetas, ranking instantáneo — cuando la
     búsqueda es parte del producto. Laravel: Scout lo integra directo.
  3. Algolia/Elastic: pagado/pesado — solo con necesidad demostrada (volumen, analítica de búsqueda).
- Sea cual sea: la búsqueda se llena por eventos del modelo (observer/job), y reindexar completo es un
  comando idempotente, no un ritual manual.

## 6. Conexiones y pool (lo que tumba la app en producción)
La BD aguanta un número LIMITADO de conexiones a la vez (`max_connections`: ~100 en Postgres por defecto).
Agotarlas = la app entera deja de responder («too many connections», timeout al adquirir del pool). El modelo
cambia por stack, y aquí es donde un dev de Laravel se confía de más:
- **Laravel / PHP-FPM**: una conexión por request que se cierra al terminar; el pool lo gestiona el servidor casi
  solo. Redis para caché, sesión y colas. Rara vez es el problema. **En otros stacks NO es así.**
- **Node / Python (proceso de larga vida)**: TÚ creas el pool, UNA vez al arrancar, y lo reutilizas. Nunca un
  pool ni un cliente nuevo por petición (eso agota la BD). Ciérralo en el apagado (SIGTERM). Dimensiónalo:
  `pool ≤ max_connections / nº de instancias` (deja margen para migraciones y psql manual). Pon timeouts
  (`connect_timeout`, `statement_timeout`, idle del pool) para que una query colgada no retenga la conexión.
  SQLAlchemy: `create_async_engine(url, pool_size=10, max_overflow=5, pool_timeout=30, pool_pre_ping=True)`.
- **Serverless (Vercel / Lambda) — el caso que más cae**: cada invocación es un proceso nuevo; si abres una
  conexión directa por invocación, agotas la BD en el primer pico. Soluciones: conéctate a través de un
  **pooler en modo transaction** (PgBouncer, o las cadenas «pooled» de Neon/Supabase), limita las conexiones
  (`connection_limit=1` en la URL de Prisma) y reutiliza el cliente con el **singleton global**:
  `const prisma = globalThis.prisma ?? new PrismaClient(); if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;`
- **Resiliencia**: reconexión/retry con backoff ante caída transitoria; un `/health` que mire conexiones activas,
  no solo `SELECT 1` (deploy-ops references/backups-monitoring.md). El hook `pool-guard` avisa al escribir
  código que crea conexiones por petición o un Prisma sin singleton.

## 7. Errores típicos del agente
- Float para dinero · fechas locales sin zona · VARCHAR(255) para todo por inercia.
- FK sin índice en Postgres · índice en cada columna "por si acaso" · UNIQUE olvidado y "validado en código".
- Migración que renombra/borra columna en el mismo deploy que el código nuevo (ventana de errores 500).
- Backfill sin chunks (lock de minutos) · `down()` vacío "porque nunca se usa".
- JSON columns como cajón desastre para datos que se filtran (eso son columnas o una tabla).
- `new PrismaClient()` / pool nuevo por request · pool sin dimensionar ni timeouts · conexión directa en serverless.
