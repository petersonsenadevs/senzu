# Una memoria de hechos determinista que recuerda igual que un embedding — y sabe callar

> Artículo reproducible del benchmark del motor de memoria de Senzu/Hemispheric (rama `exp/hemispheric`).
> Borrador listo para publicar (dev.to); **no publicado**. Victorias **y** derrotas, sin cherry-picking.

## El problema

Un agente que trabaja contigo necesita **recordar hechos**: quién es el cliente, qué stack usa el proyecto, qué
decidiste la semana pasada. Lo normal es tirar de embeddings (un modelo neuronal que mide "significado"). Nosotros
hicimos un motor **determinista, sin red y sin modelo** (`core/hooks/hechos.mjs`): léxico con peso, claves en
cualquier idioma, grafo de relaciones y un umbral para **abstenerse cuando no sabe**. ¿Aguanta la comparación?

## El método (para que cualquiera lo repita)

- **Mismo corpus, misma tokenización, mismo listón para todos.** Solo cambia el algoritmo de recuperación.
- Cuatro motores: **el motor** de Senzu, **embedding** (`multilingual-e5-small` cuantizado, local), **bm25**
  (búsqueda léxica clásica) y **grep** (coincidencia de palabras).
- Métricas: **recall@1** (el acierto sale el primero), **recall@3** (sale entre los 3 primeros) y **abstención**
  (cuando NO hay respuesta, ¿calla en vez de inventar?).
- Todo **offline y determinista** (misma salida en 3 tiradas, comprobado).

## 1. Corpus propio — hechos cortos (su dominio)

298 hechos, 415 preguntas en 12 idiomas y 6 escrituras. `node tools/eval-hechos.mjs --bench`:

| Motor | recall@1 | recall@3 | abstención |
|---|---|---|---|
| **Senzu (motor)** | **82,3 %** | **93,2 %** | **62,9 %** |
| embedding (e5-small) | 66,1 % | 81,6 % | 41,9 % |
| bm25 | 59,7 % | 71,6 % | 58,1 % |
| grep | 57,7 % | 70,0 % | 58,1 % |

**Gana a todos**, y además calla mejor: el embedding contesta de más (abstención 41,9 %).

## 2. Los ejes que no son recall (`--tabla`)

| Motor | lat. p50 | red | coste | determinista | índice en disco |
|---|---|---|---|---|---|
| **motor** | 8,2 ms | 0 | 0 € | **sí** | **73 KB** |
| embedding | 3,9 ms | 0 | 0 € | sí | ~129 MB (modelo) |
| bm25 / grep | <0,2 ms | 0 | 0 € | sí | en RAM |

Determinista, sin red, sin coste y **1.800× más ligero en disco** que el modelo de embeddings.

## 3. Dos benchmarks públicos (el rasero de otros)

No vale solo nuestro corpus. Lo medimos contra dos datasets públicos reconocidos, mismo montaje para los cuatro:

**Answerable TyDi QA** (Google, 11 idiomas) — `tools/eval-externo.mjs`:

| | recall@1 | recall@3 |
|---|---|---|
| embedding | 88,6 % | 92,0 % |
| **motor** | 76,1 % | 88,2 % |
| bm25 | 73,2 % | 86,1 % |
| grep | 62,0 % | 80,2 % |

**NanoMIRACL** (estándar de oro multilingüe, 6 idiomas, pool 1.000) — `tools/eval-nanomiracl.mjs`:

| | recall@1 | recall@3 |
|---|---|---|
| embedding | 70,3 % | 96,0 % |
| **motor** | 51,7 % | 76,0 % |
| bm25 | 50,3 % | 82,7 % |
| grep | 26,7 % | 55,7 % |

## 4. Dónde PIERDE (honestidad, `--comparar`)

- En el corpus propio pierde (recall@3) **solo** en dos categorías y solo ante el embedding: **paráfrasis**
  (89,2 vs 91,9) y **distractores semánticos** (80 vs 90). En los 21 idiomas no pierde en ninguno.
- En los benchmarks públicos (TyDi, MIRACL) el **embedding gana**: son párrafos largos de Wikipedia,
  recuperación de documentos — **no hechos cortos**, que es para lo que está hecho el motor. Ahí el motor va
  a la par de bm25 y por encima de grep.
- Comprobado **sin sobreajuste**: en la parte reservada (held-out) el motor gana igual.

## 5. Que lo aguante un escéptico (`tools/test-eval-baselines.mjs`, 10/0)

Casos adversarios con aserciones **sin cifras a mano**: corpus envenenado con casi-duplicados, homónimos
(desambigua «banco» mueble vs entidad), idioma cruzado, erratas, abstención en todas las sin-respuesta, empates
(determinista) y **10.000 hechos** (encuentra la aguja, consulta en ~280 ms).

## Conclusión

En **su dominio** —memoria de hechos cortos de un agente— el motor **gana a todos** y encima es determinista, sin
red, gratis y de 73 KB. **Fuera de su dominio** —recuperar documentos largos— empata con la búsqueda léxica clásica
y lo supera un modelo neuronal, que necesita 129 MB y un runtime. Para lo que fue hecho, no hay color.

## Reproducirlo (rama `exp/hemispheric`, commit `0127635e`)

```
node tools/eval-hechos.mjs --bench        # corpus propio (tabla 1)
node tools/eval-hechos.mjs --tabla        # ejes (tabla 2)
node tools/eval-hechos.mjs --comparar     # dónde pierde (sección 4)
node tools/test-eval-baselines.mjs        # batería adversaria (sección 5)
node tools/eval-externo/bajar-tydiqa.mjs  && node tools/eval-externo.mjs --baseline {motor,embedding,bm25,grep}
node tools/eval-externo/bajar-nanomiracl.mjs && node tools/eval-nanomiracl.mjs --baseline {motor,embedding,bm25,grep}
```

Corpus: `tools/eval-hechos/corpus.json`, `corpus-fitlab.json`, `adversario.json`. Datos externos crudos:
`tools/.datos/` (se bajan). Resultados reales guardados: `tools/eval-externo/resultados.json` y
`resultados-nanomiracl.json`.
