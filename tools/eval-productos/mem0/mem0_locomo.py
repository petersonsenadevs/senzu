#!/usr/bin/env python
# Adaptador mem0 para el cara a cara de F8-T9 (plan Hemispheric). mem0 se encarga SOLO de la memoria (ingiere las
# conversaciones de LoCoMo y recupera); el CONTESTADOR y el JUEZ son los MISMOS que el pipeline Node (Qwen3 local vía
# Ollama /api/chat con think:false, mismos prompts, temp 0 + seed), para que la unica diferencia sea la memoria.
# Guarda en el MISMO formato JSON que pipeline.mjs (resultados-e2e-locomo-mem0.json) -> comparable y re-juzgable.
# 100% local y 0 EUR: se desactiva la telemetria de mem0 y chroma (nada de red).
#   py mem0_locomo.py --limite 10 --topk 10            # prueba
#   py mem0_locomo.py                                   # LoCoMo completo (reanudable)
import os, re, json, sys, time, argparse, urllib.request

os.environ.setdefault("MEM0_TELEMETRY", "False")          # mem0: sin telemetria (sin red)
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")    # chroma/posthog: idem

# Qwen3 "piensa" por defecto y mem0 no pasa think al cliente de Ollama -> extraccion lentisima. Forzamos think=False
# en TODAS las llamadas de mem0 a Ollama (mismo modelo, sin el razonamiento): rapido y justo, sin tocar la libreria.
import ollama as _ollama
_orig_chat = _ollama.Client.chat
def _chat_nothink(self, *a, **kw):
    kw.setdefault("think", False)
    return _orig_chat(self, *a, **kw)
_ollama.Client.chat = _chat_nothink

HERE = os.path.dirname(os.path.abspath(__file__))
PROD = os.path.dirname(HERE)                               # tools/eval-productos
LOCOMO = os.path.join(PROD, "..", ".datos", "locomo.json")
BASE = os.environ.get("EVAL_LLM_LOCAL_BASE", "http://localhost:11434")

# --- prompts IDENTICOS al pipeline Node (pipeline.mjs / juez.mjs) ---
SIS_CONTESTAR = ("You are a precise assistant. Answer the question using ONLY the conversation excerpts provided. "
                 "Be concise: a few words or one short sentence. If the answer is not in the excerpts, reply exactly: I don't know.")
SIS_JUEZ = ("You grade whether a predicted answer matches the reference answer for a question. It is correct if it "
            "conveys the same information, even if worded differently; otherwise wrong. Reply with exactly one word: CORRECT or WRONG.")
_ABST = re.compile(r"\bi\s*don'?t\s*know\b|no\s+(information|answer|mention|idea)|not\s+(mentioned|available|stated|in the)", re.I)
def es_abstencion(t): return bool(_ABST.search(t or ""))

def ollama_chat(system, user, max_tokens, model):
    body = {"model": model, "stream": False, "think": False,
            "messages": ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}],
            "options": {"temperature": 0, "num_predict": max_tokens, "seed": 7}}
    req = urllib.request.Request(BASE + "/api/chat", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        j = json.loads(r.read())
    txt = (j.get("message", {}) or {}).get("content") or ""
    return re.sub(r"<think>.*?</think>", "", txt, flags=re.S).strip()

def contestar(ctx, pregunta, model):
    return ollama_chat(SIS_CONTESTAR, f"Conversation excerpts:\n{ctx}\n\nQuestion: {pregunta}\nAnswer:", 128, model)

def juzgar(pregunta, oro, predicha, model):
    txt = ollama_chat(SIS_JUEZ, f"Question: {pregunta}\nReference answer: {oro}\nPredicted answer: {predicha}\nVerdict:", 4, model)
    correcto = bool(re.search(r"\bcorrect\b", txt, re.I)) and not re.search(r"\bwrong\b", txt, re.I)
    return correcto, txt

# --- LoCoMo: mismo parseo que loader.mjs (incl. cat5 usa adversarial_answer) ---
def cargar_locomo():
    raw = json.load(open(LOCOMO, encoding="utf8"))["datos"]
    convs = []
    for m in raw:
        hid = m["sample_id"]
        conv = m.get("conversation", {}) or {}
        sesiones = []
        for k in list(conv.keys()):
            mm = re.match(r"^session_(\d+)$", k)
            if not mm or not isinstance(conv[k], list):
                continue
            n = int(mm.group(1))
            fecha = conv.get(f"session_{n}_date_time", "") or ""
            turnos = []
            for t in conv[k]:
                txt = (t.get("text") or t.get("blip_caption") or t.get("query") or "")
                txt = str(txt).strip()
                if txt:
                    turnos.append((t.get("speaker", "") or "", fecha, txt))
            sesiones.append((n, fecha, turnos))
        sesiones.sort(key=lambda s: s[0])
        items = []
        for i, q in enumerate(m.get("qa", []) or []):
            gold = q.get("answer")
            if gold is None or str(gold).strip() == "":
                gold = q.get("adversarial_answer", "")
            items.append({"id": f"{hid}#{i}", "pregunta": str(q.get("question", "")).strip(),
                          "oro": str(gold).strip(), "tipo": f"locomo-cat{q.get('category')}", "abstencion": False})
        convs.append({"hid": hid, "sesiones": sesiones, "items": items})
    return convs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limite", type=int, default=0)
    ap.add_argument("--topk", type=int, default=10)
    ap.add_argument("--modelo", default="qwen3:8b")
    ap.add_argument("--salida", default=os.path.join(PROD, "resultados-e2e-locomo-mem0.json"))
    ap.add_argument("--coleccion", default="locomo_mem0")   # colección chroma; cámbiala para empezar limpio sin borrar
    args = ap.parse_args()

    from mem0 import Memory
    chroma_path = os.path.join(HERE, "chroma")
    config = {
        "llm": {"provider": "ollama", "config": {"model": args.modelo, "temperature": 0, "ollama_base_url": BASE}},
        "embedder": {"provider": "ollama", "config": {"model": "nomic-embed-text", "ollama_base_url": BASE}},
        "vector_store": {"provider": "chroma", "config": {"collection_name": args.coleccion, "path": chroma_path}},
    }
    mem = Memory.from_config(config)

    # checkpoint reanudable (mismo formato que pipeline.mjs + lista de conversaciones ya ingeridas)
    if os.path.exists(args.salida):
        estado = json.load(open(args.salida, encoding="utf8"))
    else:
        estado = {"dataset": "locomo", "retriever": "mem0", "ingesta": "mem0", "topk": args.topk,
                  "juez": "local", "modelo": args.modelo, "ingeridos": [], "hechos": {}}
    estado.setdefault("ingeridos", [])
    estado.setdefault("hechos", {})
    def guardar():
        json.dump(estado, open(args.salida, "w", encoding="utf8"), ensure_ascii=False, indent=2)

    convs = cargar_locomo()
    total_items = sum(len(c["items"]) for c in convs)
    objetivo = min(total_items, args.limite) if args.limite else total_items
    hechos_n = len(estado["hechos"])
    total_sesiones = sum(len(c["sesiones"]) for c in convs)
    total_pasos = total_sesiones + objetivo        # ingesta (sesiones) + preguntas = progreso global
    pasos = sum(len(c["sesiones"]) for c in convs if c["hid"] in estado["ingeridos"]) + hechos_n
    def gpct():
        return round(100 * pasos / total_pasos) if total_pasos else 0
    print(f"\nmem0 end-to-end - locomo - top-{args.topk} - modelo {args.modelo} - juez local")
    if hechos_n:
        print(f"Reanudando: {hechos_n} preguntas ya hechas, {len(estado['ingeridos'])} conversaciones ingeridas")

    for ci, c in enumerate(convs, 1):
        hid = c["hid"]
        pend = [it for it in c["items"] if it["id"] not in estado["hechos"] and (not args.limite or hechos_n < args.limite)]
        if not pend:
            continue
        # ingesta: mem0 extrae memorias de cada sesion (una vez por conversacion)
        if hid not in estado["ingeridos"]:
            print(f"  ingiriendo conv {ci}/{len(convs)} ({hid}, {len(c['sesiones'])} sesiones)...", flush=True)
            t0 = time.time()
            for si, (_n, fecha, turnos) in enumerate(c["sesiones"], 1):
                if not turnos:
                    continue
                msgs = [{"role": "user", "content": f"{sp} ({fecha}): {txt}" if sp else f"({fecha}): {txt}"} for (sp, fecha, txt) in turnos]
                try:
                    mem.add(messages=msgs, user_id=hid)
                except Exception as e:
                    print(f"  aviso: add fallo en {hid} sesion {_n}: {str(e)[:120]}")
                pasos += 1
                print(f"  [GLOBAL {gpct()}%] conv {ci}/{len(convs)} · ingesta sesion {si}/{len(c['sesiones'])}", flush=True)
            estado["ingeridos"].append(hid)
            guardar()
            print(f"  ingerida {hid} ({len(c['sesiones'])} sesiones) en {time.time()-t0:.0f}s")
        # preguntas
        for it in c["items"]:
            if args.limite and hechos_n >= args.limite:
                break
            if it["id"] in estado["hechos"]:
                continue
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
                print(f"  [GLOBAL {gpct()}%] conv {ci}/{len(convs)} · preguntas {hechos_n}/{objetivo} · aciertos {100*ok/hechos_n:.1f}%", flush=True)
        if args.limite and hechos_n >= args.limite:
            break
    guardar()

    # informe (como pipeline.mjs)
    filas = list(estado["hechos"].values())
    def pct(l): return round(1000 * sum(1 for h in l if h.get("correcto")) / len(l)) / 10 if l else 0
    tipos = {}
    for h in filas:
        tipos.setdefault(h["tipo"], []).append(h)
    print(f"\n\nResultado mem0 - {len(filas)} preguntas - top-{args.topk}")
    print(f"  Acierto global: {pct(filas)}%  ({sum(1 for h in filas if h.get('correcto'))}/{len(filas)})")
    for k in sorted(tipos):
        l = tipos[k]
        print(f"    {k:<28} {pct(l):>5}%  ({sum(1 for h in l if h.get('correcto'))}/{len(l)})")
    print(f"  Guardado en {os.path.basename(args.salida)}")

if __name__ == "__main__":
    main()
