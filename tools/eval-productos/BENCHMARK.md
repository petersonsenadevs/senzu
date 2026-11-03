# Una memoria gratis y offline que mide igual o mejor que los productos de pago

> Cara a cara del motor de memoria de Senzu/Hemispheric contra productos comerciales de memoria para
> agentes (**mem0**, **Zep/Graphiti**) sobre el benchmark académico **LoCoMo** (Maharana et al. 2024, SNAP
> Research). Rama `exp/hemispheric`. Borrador reproducible; **no publicado**. Victorias **y** derrotas, sin
> cherry-picking.

## El problema

mem0, Zep o Letta construyen la memoria de un agente **con un LLM** (extraen hechos y grafos llamando a GPT-4o)
y cobran por ello. Nuestro motor (`core/hooks/hechos.mjs`) es **determinista, sin red, sin modelo y gratis**.
La pregunta honesta: en el terreno de ellos —conversaciones largas, el benchmark que ellos mismos usan—
¿aguanta la comparación?

## El método (misma vara para todos)

- **Mismo contestador y mismo juez para todos: Qwen3-8B local vía Ollama.** La única diferencia entre
  columnas es **de qué memoria** sale el contexto. Así el cara a cara es controlado y justo.
- Cada producto **ingiere a su manera natural**: mem0 por sesión, Zep/Graphiti por episodios (~6 turnos),
  nuestro motor y el embedding indexando los hechos.
- Dataset: **LoCoMo completo, 1986 preguntas**, 10 conversaciones largas, 5 categorías.
- Juez: el mismo Qwen3 decide acierto/fallo con la respuesta de referencia. **Todo en local, 0 €.**

> **Matiz imprescindible (credibilidad):** usamos **Qwen3-8B local**, no GPT-4o. Por eso los **números
> absolutos NO son comparables** al leaderboard oficial de mem0/Zep (que corren con GPT-4o y publican cifras
> más altas). Lo que esta tabla mide es el **cara a cara entre memorias bajo las mismas condiciones**: quién
> aporta mejor contexto cuando el modelo que responde y el que juzga son idénticos.

## 1. Cara a cara completo — LoCoMo, 1986 preguntas

`node tools/eval-productos/comparar.mjs resultados-e2e-locomo-{motor-llm,embedding-llm,mem0-full}.json`

| categoría | qué mide | **motor** | embedding e5 | mem0 |
|---|---|---|---|---|
| cat1 single-hop (282) | dato directo | 23,0 % | 30,5 % | 25,2 % |
| cat2 **temporal** (321) | fechas / orden | **16,2 %** | 17,4 % | 5,3 % |
| cat3 multi-hop (96) | cruzar datos | 17,7 % | 24,0 % | 17,7 % |
| cat4 open-domain (841) | + sentido común | 41,6 % | 44,7 % | 35,0 % |
| cat5 adversaria (446) | saber decir «no sé» | **5,6 %** | 3,4 % | 4,7 % |
| **GLOBAL** | | **25,6 %** | **28,0 %** | **21,1 %** |

**Lecturas clave:**
- **Ganamos a mem0** en global (25,6 % vs 21,1 %) **siendo gratis y offline** — mem0 cobra y llama a un LLM
  para ingerir.
- En lo **temporal casi triplicamos a mem0** (16,2 % vs 5,3 %): el motor guarda los hechos **con fecha**, su
  punto fuerte.
- Quedamos **pegados al embedding** (28,0 %), que también es gratis y determinista. Donde nos saca ventaja es
  en el dato literal (cat1) y en cruzar datos (cat3) → trabajo futuro (X-T18..21).
- En **saber callar** (cat5) somos los mejores de los tres.

## 2. Muestra con Zep/Graphiti — conv-1, 195 preguntas

Zep/Graphiti construye un **grafo de conocimiento** con el LLM. A escala completa en local resulta
**inviable por tiempo** (cientos de llamadas a Qwen3 por conversación: la ingesta de las 1986 preguntas
llevaba decenas de horas). Se incluye como **muestra sobre la primera conversación**, a cuatro:

`node tools/eval-productos/comparar.mjs resultados-e2e-locomo-{motor-llm,embedding-llm,mem0,zep}.json`

| categoría | **motor** | embedding e5 | mem0 | zep |
|---|---|---|---|---|
| cat1 (32) | 25,0 % | 31,3 % | 21,9 % | 18,8 % |
| cat2 (37) | 27,0 % | 27,0 % | 2,7 % | 2,7 % |
| cat3 (13) | 30,8 % | 46,2 % | 15,4 % | 30,8 % |
| cat4 (70) | 40,0 % | 47,1 % | 24,3 % | 30,0 % |
| cat5 (43) | 11,6 % | 0,0 % | 4,7 % | 9,3 % |
| **GLOBAL** | **28,2 %** | **30,3 %** | **14,9 %** | **18,5 %** |

En la muestra el motor **supera a mem0 y a Zep**, y Zep queda por delante de mem0. Es una muestra (una
conversación), pero confirma el patrón de la tabla completa.

## 3. Lo que esto demuestra (y lo que no)

- **Sí demuestra:** nuestra memoria, bajo condiciones idénticas, **iguala o supera** a dos productos de pago
  del sector —con mem0 medido **a escala completa**— siendo **determinista, offline y 0 €**.
- **No demuestra:** que ganemos su leaderboard oficial con GPT-4o. No lo hemos medido así (ni es el objetivo:
  nuestra tesis es «precisión comparable o mejor, pero determinista, offline, gratis y que sabe callar»).
- **Honestidad de la ingesta:** cada producto se alimenta como es natural para él; el contenido, las
  preguntas, el contestador y el juez son idénticos. Zep solo pudo medirse en muestra por su coste en local.

## Reproducirlo

```
# los tres completos (tabla 1)
node tools/eval-productos/comparar.mjs \
  tools/eval-productos/resultados-e2e-locomo-motor-llm.json \
  tools/eval-productos/resultados-e2e-locomo-embedding-llm.json \
  tools/eval-productos/resultados-e2e-locomo-mem0-full.json

# muestra a cuatro con Zep (tabla 2)
node tools/eval-productos/comparar.mjs \
  tools/eval-productos/resultados-e2e-locomo-{motor-llm,embedding-llm,mem0,zep}.json

# regenerar desde cero (necesita Ollama + Qwen3; mem0/zep además Docker/Neo4j)
node tools/eval-productos/correr-bench-completo.mjs
```

Resultados crudos guardados (con procedencia): `tools/eval-productos/resultados-e2e-locomo-*.json`.
Arnés: `loader.mjs`, `pipeline.mjs`, `recuperar.mjs`, `mem0/`, `zep/`, `comparar.mjs`.
