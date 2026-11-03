#!/usr/bin/env python
# Adaptador mem0 para LongMemEval (X-T22). Igual que mem0_locomo.py pero sobre LongMemEval: cada pregunta trae SU PROPIO
# haystack (varias sesiones), así que se ingiere por haystack con user_id = question_id y se contesta esa única pregunta.
# Reutiliza los helpers de mem0_locomo.py (mismo contestador, juez y cliente Ollama think:false) para que la ÚNICA
# diferencia frente al motor/embedding sea la memoria. Lee el subset compacto que exporta loader.mjs (evita re-parsear
# los 277 MB en Python):
#   node tools/eval-productos/loader.mjs --exportar-mem0 --tipos knowledge-update,temporal-reasoning
#   py mem0_longmemeval.py --limite 5          # prueba
#   py mem0_longmemeval.py                      # las 211 preguntas (reanudable)
import os, json, time, argparse

import mem0_locomo as base   # ejecuta el monkeypatch think:false y trae los helpers compartidos
from mem0_locomo import contestar, juzgar, es_abstencion, BASE, PROD

SUBSET = os.path.join(PROD, "..", ".datos", "longmemeval-subset-mem0.json")


def cargar_longmemeval(ruta=SUBSET):
    # El subset ya viene filtrado por tipos y en el formato compacto {hid, pregunta, respuesta, tipo, abstencion, sesiones}
    datos = json.load(open(ruta, encoding="utf8"))
    convs = []
    for r in datos:
        sesiones = []
        for si, s in enumerate(r.get("sesiones", []) or [], 1):
            fecha = s.get("fecha", "") or ""
            turnos = [(t.get("hablante", "") or "", fecha, t.get("texto", "") or "") for t in (s.get("turnos") or []) if (t.get("texto") or "").strip()]
            sesiones.append((si, fecha, turnos))
        convs.append({"hid": r["hid"], "sesiones": sesiones,
                      "items": [{"id": r["hid"], "pregunta": str(r.get("pregunta", "")).strip(),
                                 "oro": str(r.get("respuesta", "")).strip(), "tipo": r.get("tipo", "desconocido"),
                                 "abstencion": bool(r.get("abstencion"))}]})
    return convs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limite", type=int, default=0)
    ap.add_argument("--topk", type=int, default=10)
    ap.add_argument("--modelo", default="qwen3:8b")
    ap.add_argument("--salida", default=os.path.join(PROD, "resultados-e2e-longmemeval-mem0.json"))
    ap.add_argument("--coleccion", default="longmemeval_mem0")
    args = ap.parse_args()

    from mem0 import Memory
    chroma_path = os.path.join(base.HERE, "chroma")
    config = {
        "llm": {"provider": "ollama", "config": {"model": args.modelo, "temperature": 0, "ollama_base_url": BASE}},
        "embedder": {"provider": "ollama", "config": {"model": "nomic-embed-text", "ollama_base_url": BASE}},
        "vector_store": {"provider": "chroma", "config": {"collection_name": args.coleccion, "path": chroma_path}},
    }
    mem = Memory.from_config(config)

    if os.path.exists(args.salida):
        estado = json.load(open(args.salida, encoding="utf8"))
    else:
        estado = {"dataset": "longmemeval", "retriever": "mem0", "ingesta": "mem0", "topk": args.topk,
                  "juez": "local", "modelo": args.modelo, "ingeridos": [], "hechos": {}}
    estado.setdefault("ingeridos", [])
    estado.setdefault("hechos", {})

    def guardar():
        json.dump(estado, open(args.salida, "w", encoding="utf8"), ensure_ascii=False, indent=2)

    convs = cargar_longmemeval()
    objetivo = min(len(convs), args.limite) if args.limite else len(convs)
    hechos_n = len(estado["hechos"])
    total_sesiones = sum(len(c["sesiones"]) for c in convs)
    total_pasos = total_sesiones + objetivo
    pasos = sum(len(c["sesiones"]) for c in convs if c["hid"] in estado["ingeridos"]) + hechos_n

    def gpct():
        return round(100 * pasos / total_pasos) if total_pasos else 0

    print(f"\nmem0 end-to-end - longmemeval - top-{args.topk} - modelo {args.modelo} - juez local - {len(convs)} preguntas")
    if hechos_n:
        print(f"Reanudando: {hechos_n} preguntas ya hechas, {len(estado['ingeridos'])} haystacks ingeridos")

    for ci, c in enumerate(convs, 1):
        hid = c["hid"]
        it = c["items"][0]
        if it["id"] in estado["hechos"]:
            continue
        if args.limite and hechos_n >= args.limite:
            break
        # ingesta del haystack (user_id = hid, cada pregunta tiene su propia historia)
        if hid not in estado["ingeridos"]:
            print(f"  ingiriendo {ci}/{len(convs)} ({hid}, {len(c['sesiones'])} sesiones)...", flush=True)
            t0 = time.time()
            for si, (_n, fecha, turnos) in enumerate(c["sesiones"], 1):
                if not turnos:
                    continue
                msgs = [{"role": "user", "content": f"{sp} ({fe}): {txt}" if sp else f"({fe}): {txt}"} for (sp, fe, txt) in turnos]
                try:
                    mem.add(messages=msgs, user_id=hid)
                except Exception as e:
                    print(f"  aviso: add fallo en {hid} sesion {_n}: {str(e)[:120]}")
                pasos += 1
                print(f"  [GLOBAL {gpct()}%] {ci}/{len(convs)} - ingesta sesion {si}/{len(c['sesiones'])}", flush=True)
            estado["ingeridos"].append(hid)
            guardar()
            print(f"  ingerido {hid} ({len(c['sesiones'])} sesiones) en {time.time()-t0:.0f}s")
        # la pregunta
        t0 = time.time()
        res = mem.search(query=it["pregunta"], filters={"user_id": hid}, limit=args.topk)
        resultados = res.get("results", res) if isinstance(res, dict) else res
        mems = [r.get("memory", "") if isinstance(r, dict) else str(r) for r in (resultados or [])]
        ctx = "\n".join(m for m in mems if m)
        predicha = contestar(ctx, it["pregunta"], args.modelo)
        if it["abstencion"]:
            correcto, juez_txt = es_abstencion(predicha), None
        else:
            correcto, juez_txt = juzgar(it["pregunta"], it["oro"], predicha, args.modelo)
        estado["hechos"][it["id"]] = {"tipo": it["tipo"], "abstencion": it["abstencion"], "predicha": predicha,
                                      "oro": it["oro"], "correcto": correcto, "juez": juez_txt,
                                      "recuperados": len(mems), "coste": 0, "ms": round((time.time()-t0)*1000, 1)}
        hechos_n += 1
        pasos += 1
        if hechos_n % 5 == 0:
            guardar()
            ok = sum(1 for h in estado["hechos"].values() if h.get("correcto"))
            print(f"  [GLOBAL {gpct()}%] preguntas {hechos_n}/{objetivo} - aciertos {100*ok/hechos_n:.1f}%", flush=True)
    guardar()

    filas = list(estado["hechos"].values())
    def pct(l): return round(1000 * sum(1 for h in l if h.get("correcto")) / len(l)) / 10 if l else 0
    tipos = {}
    for h in filas:
        tipos.setdefault(h["tipo"], []).append(h)
    print(f"\n\nResultado mem0 - longmemeval - {len(filas)} preguntas - top-{args.topk}")
    print(f"  Acierto global: {pct(filas)}%  ({sum(1 for h in filas if h.get('correcto'))}/{len(filas)})")
    for k in sorted(tipos):
        l = tipos[k]
        print(f"    {k:<24} {pct(l):>5}%  ({sum(1 for h in l if h.get('correcto'))}/{len(l)})")
    print(f"  Guardado en {os.path.basename(args.salida)}")


if __name__ == "__main__":
    main()
