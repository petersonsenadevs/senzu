#!/usr/bin/env python
# Adaptador Zep/Graphiti para el cara a cara F8-T9. Graphiti (el motor open-source de Zep) pone SOLO la memoria: ingiere las
# conversaciones de LoCoMo como episodios (grafo de conocimiento en Neo4j) y recupera por RRF (sin reordenador LLM). El
# CONTESTADOR y el JUEZ son los MISMOS que el resto (Qwen3 local via Ollama /api/chat con think:false, mismos prompts).
# LLM de ingesta de Graphiti = OllamaNoThinkClient (think=False -> ~3x mas rapido). Guarda en el MISMO formato JSON que
# pipeline.mjs (retriever "zep") -> comparable con comparar.mjs y re-juzgable. Reanudable + porcentaje de progreso.
#   py zep_locomo.py --limite 5           # prueba
#   py zep_locomo.py                       # LoCoMo completo (reanudable)
import os, re, json, time, argparse, asyncio, urllib.request, logging, warnings
from datetime import datetime, timezone

# Silenciar el ruido de Neo4j (avisos de propiedad inexistente en grafo vacio) para ver el progreso limpio.
logging.getLogger('neo4j').setLevel(logging.ERROR)
logging.getLogger('neo4j.notifications').setLevel(logging.ERROR)
warnings.filterwarnings('ignore')

HERE = os.path.dirname(os.path.abspath(__file__))
PROD = os.path.dirname(HERE)
LOCOMO = os.path.join(PROD, '..', '.datos', 'locomo.json')
BASE_V1 = 'http://localhost:11434/v1'
BASE_NATIVE = 'http://localhost:11434'
EP_TURNOS = 6       # turnos por episodio al ingerir (sesion troceada -> JSON de extraccion pequeno y valido)
EP_TIMEOUT = 300    # s por episodio; si se cuelga se salta y el run sigue

SIS_CONTESTAR = ("You are a precise assistant. Answer the question using ONLY the conversation excerpts provided. "
                 "Be concise: a few words or one short sentence. If the answer is not in the excerpts, reply exactly: I don't know.")
SIS_JUEZ = ("You grade whether a predicted answer matches the reference answer for a question. It is correct if it "
            "conveys the same information, even if worded differently; otherwise wrong. Reply with exactly one word: CORRECT or WRONG.")
_ABST = re.compile(r"\bi\s*don'?t\s*know\b|no\s+(information|answer|mention|idea)|not\s+(mentioned|available|stated|in the)", re.I)
def es_abstencion(t): return bool(_ABST.search(t or ''))

def ollama_chat(system, user, max_tokens, model):
    body = {"model": model, "stream": False, "think": False,
            "messages": ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}],
            "options": {"temperature": 0, "num_predict": max_tokens, "seed": 7}}
    req = urllib.request.Request(BASE_NATIVE + "/api/chat", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        j = json.loads(r.read())
    return re.sub(r"<think>.*?</think>", "", (j.get("message", {}) or {}).get("content") or "", flags=re.S).strip()

def contestar(ctx, pregunta, model):
    return ollama_chat(SIS_CONTESTAR, f"Conversation excerpts:\n{ctx}\n\nQuestion: {pregunta}\nAnswer:", 128, model)

def juzgar(pregunta, oro, predicha, model):
    txt = ollama_chat(SIS_JUEZ, f"Question: {pregunta}\nReference answer: {oro}\nPredicted answer: {predicha}\nVerdict:", 4, model)
    return (bool(re.search(r"\bcorrect\b", txt, re.I)) and not re.search(r"\bwrong\b", txt, re.I)), txt

def parse_fecha(s):
    s = (s or '').replace(' on ', ' ').replace(',', '').strip()
    for fmt in ('%I:%M %p %d %B %Y', '%d %B %Y', '%I:%M%p %d %B %Y'):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime(2023, 1, 1, tzinfo=timezone.utc)

def cargar_locomo():
    raw = json.load(open(LOCOMO, encoding='utf8'))['datos']
    convs = []
    for m in raw:
        hid = m['sample_id']
        conv = m.get('conversation', {}) or {}
        sesiones = []
        for k in list(conv.keys()):
            mm = re.match(r'^session_(\d+)$', k)
            if not mm or not isinstance(conv[k], list):
                continue
            n = int(mm.group(1))
            fecha = conv.get(f'session_{n}_date_time', '') or ''
            turnos = [(t.get('speaker', '') or '', str(t.get('text') or t.get('blip_caption') or t.get('query') or '').strip())
                      for t in conv[k]]
            turnos = [(sp, tx) for sp, tx in turnos if tx]
            sesiones.append((n, fecha, turnos))
        sesiones.sort(key=lambda s: s[0])
        items = []
        for i, q in enumerate(m.get('qa', []) or []):
            gold = q.get('answer')
            if gold is None or str(gold).strip() == '':
                gold = q.get('adversarial_answer', '')
            items.append({'id': f'{hid}#{i}', 'pregunta': str(q.get('question', '')).strip(),
                          'oro': str(gold).strip(), 'tipo': f'locomo-cat{q.get("category")}', 'abstencion': False})
        convs.append({'hid': hid, 'sesiones': sesiones, 'items': items})
    return convs

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limite', type=int, default=0)
    ap.add_argument('--topk', type=int, default=10)
    ap.add_argument('--modelo', default='qwen3:8b')
    ap.add_argument('--salida', default=os.path.join(PROD, 'resultados-e2e-locomo-zep.json'))
    args = ap.parse_args()

    from graphiti_core import Graphiti
    from graphiti_core.llm_client import LLMConfig
    from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
    from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
    from graphiti_core.nodes import EpisodeType
    from graphiti_core.search.search_config_recipes import EDGE_HYBRID_SEARCH_RRF
    from ollama_nothink import OllamaNoThinkClient

    cfg = LLMConfig(api_key='ollama', model=args.modelo, small_model=args.modelo, base_url=BASE_V1, temperature=0)
    llm = OllamaNoThinkClient(cfg)
    emb = OpenAIEmbedder(config=OpenAIEmbedderConfig(api_key='ollama', embedding_model='nomic-embed-text', base_url=BASE_V1))
    xenc = OpenAIRerankerClient(config=cfg)   # placeholder; con RRF no se invoca
    g = Graphiti('bolt://localhost:7687', 'neo4j', 'graphiti123', llm_client=llm, embedder=emb, cross_encoder=xenc)
    await g.build_indices_and_constraints()

    if os.path.exists(args.salida):
        estado = json.load(open(args.salida, encoding='utf8'))
    else:
        estado = {'dataset': 'locomo', 'retriever': 'zep', 'ingesta': 'graphiti', 'topk': args.topk,
                  'juez': 'local', 'modelo': args.modelo, 'ingeridos': [], 'hechos': {}}
    estado.setdefault('ingeridos', [])
    estado.setdefault('hechos', {})
    def guardar():
        json.dump(estado, open(args.salida, 'w', encoding='utf8'), ensure_ascii=False, indent=2)

    convs = cargar_locomo()
    objetivo = min(sum(len(c['items']) for c in convs), args.limite) if args.limite else sum(len(c['items']) for c in convs)
    hechos_n = len(estado['hechos'])
    total_sesiones = sum(len(c['sesiones']) for c in convs)
    total_pasos = total_sesiones + objetivo        # ingesta (sesiones) + preguntas = progreso global
    pasos = sum(len(c['sesiones']) for c in convs if c['hid'] in estado['ingeridos']) + hechos_n
    def gpct():
        return round(100 * pasos / total_pasos) if total_pasos else 0
    print(f"\nzep/graphiti end-to-end - locomo - top-{args.topk} - modelo {args.modelo}", flush=True)
    if hechos_n:
        print(f"Reanudando: {hechos_n} preguntas, {len(estado['ingeridos'])} conversaciones ingeridas", flush=True)

    for ci, c in enumerate(convs, 1):
        hid = c['hid']
        pend = [it for it in c['items'] if it['id'] not in estado['hechos'] and (not args.limite or hechos_n < args.limite)]
        if not pend:
            continue
        if hid not in estado['ingeridos']:
            print(f"  ingiriendo conv {ci}/{len(convs)} ({hid}, {len(c['sesiones'])} sesiones)...", flush=True)
            t0 = time.time()
            for si, (n, fecha, turnos) in enumerate(c['sesiones'], 1):
                if not turnos:
                    continue
                rt = parse_fecha(fecha)
                # Trocear la sesion en episodios pequenos: qwen3-8b, ante una sesion entera, se desboca extrayendo
                # el grafo (JSON de 60k+ que se rompe y mata el proceso). Con ~EP_TURNOS turnos por episodio el
                # extractor saca JSON pequeno y valido. Es ademas el uso natural de Graphiti (episodios = mensajes).
                trozos = [turnos[j:j + EP_TURNOS] for j in range(0, len(turnos), EP_TURNOS)]
                for ti, trozo in enumerate(trozos, 1):
                    cuerpo = "\n".join(f"{sp}: {tx}" if sp else tx for sp, tx in trozo)
                    try:
                        await asyncio.wait_for(
                            g.add_episode(name=f"{hid}-s{n}-c{ti}", episode_body=cuerpo, source=EpisodeType.message,
                                          source_description='locomo', group_id=hid, reference_time=rt),
                            timeout=EP_TIMEOUT)
                    except Exception as e:
                        print(f"    aviso: add_episode fallo {hid}-s{n}-c{ti}: {type(e).__name__} {str(e)[:100]}", flush=True)
                pasos += 1
                print(f"  [GLOBAL {gpct()}%] conv {ci}/{len(convs)} · ingesta sesion {si}/{len(c['sesiones'])} ({len(trozos)} ep)", flush=True)
            estado['ingeridos'].append(hid)
            guardar()
            print(f"  ingerida {hid} en {time.time()-t0:.0f}s", flush=True)
        for it in c['items']:
            if args.limite and hechos_n >= args.limite:
                break
            if it['id'] in estado['hechos']:
                continue
            t0 = time.time()
            try:
                res = await g.search_(it['pregunta'], config=EDGE_HYBRID_SEARCH_RRF, group_ids=[hid])
                edges = getattr(res, 'edges', res) or []
            except Exception as e:
                edges = []
            mems = [getattr(e, 'fact', '') for e in edges][:args.topk]
            ctx = "\n".join(m for m in mems if m)
            predicha = contestar(ctx, it['pregunta'], args.modelo)
            if it['abstencion']:
                correcto, juez_txt = es_abstencion(predicha), None
            else:
                correcto, juez_txt = juzgar(it['pregunta'], it['oro'], predicha, args.modelo)
            estado['hechos'][it['id']] = {'tipo': it['tipo'], 'abstencion': it['abstencion'], 'predicha': predicha,
                                          'oro': it['oro'], 'correcto': correcto, 'juez': juez_txt,
                                          'recuperados': len(mems), 'coste': 0, 'ms': round((time.time()-t0)*1000, 1)}
            hechos_n += 1
            pasos += 1
            if hechos_n % 5 == 0:
                guardar()
                ok = sum(1 for h in estado['hechos'].values() if h.get('correcto'))
                print(f"  [GLOBAL {gpct()}%] conv {ci}/{len(convs)} · preguntas {hechos_n}/{objetivo} · aciertos {100*ok/hechos_n:.1f}%", flush=True)
        if args.limite and hechos_n >= args.limite:
            break
    guardar()
    await g.close()

    filas = list(estado['hechos'].values())
    def pct(l): return round(1000 * sum(1 for h in l if h.get('correcto')) / len(l)) / 10 if l else 0
    tipos = {}
    for h in filas:
        tipos.setdefault(h['tipo'], []).append(h)
    print(f"\n\nResultado zep/graphiti - {len(filas)} preguntas - top-{args.topk}", flush=True)
    print(f"  Acierto global: {pct(filas)}%  ({sum(1 for h in filas if h.get('correcto'))}/{len(filas)})", flush=True)
    for k in sorted(tipos):
        l = tipos[k]
        print(f"    {k:<28} {pct(l):>5}%  ({sum(1 for h in l if h.get('correcto'))}/{len(l)})", flush=True)

asyncio.run(main())
