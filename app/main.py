import os, subprocess, sys, threading
from pathlib import Path
import httpx
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from .retriever import Retriever

ROOT = Path(__file__).resolve().parent.parent
API_KEY = os.getenv("OPENROUTER_API_KEY", "")
# Free models rotate on OpenRouter, so we try several in order.
MODELS = [m.strip() for m in os.getenv(
    "OPENROUTER_MODELS",
    "meta-llama/llama-3.3-70b-instruct:free,google/gemma-3-27b-it:free,"
    "mistralai/mistral-small-3.2-24b-instruct:free,openrouter/free").split(",") if m.strip()]
SITE_URL = os.getenv("SITE_URL", "http://localhost:8000")

app = FastAPI(title="DarGlobal & Wasalt Assistant")
ret = Retriever()

SYSTEM = (
    "You are a helpful assistant for DarGlobal (international luxury developer) and Wasalt "
    "(Saudi real estate platform). Answer ONLY from the CONTEXT below. If the context does not "
    "contain the answer, say you don't have that information and suggest visiting darglobal.co.uk "
    "or wasalt.sa. Be concise, factual, never invent prices or availability. Reply in the user's language. "
    "Mention which source (DarGlobal / Wasalt) the facts come from."
)


def refresh_data():
    """Scrape in the background on first boot if nothing has been scraped yet."""
    if (ROOT / "data" / "scraped.jsonl").exists():
        return
    subprocess.run([sys.executable, "-m", "scraper.scrape"], cwd=ROOT)
    ret.load()


@app.on_event("startup")
def _start():
    if os.getenv("SCRAPE_ON_START", "true").lower() == "true":
        threading.Thread(target=refresh_data, daemon=True).start()


class Msg(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    message: str
    history: list[Msg] = []


async def ask_llm(messages):
    err = "no models tried"
    async with httpx.AsyncClient(timeout=60) as c:
        for m in MODELS:
            try:
                r = await c.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {API_KEY}", "HTTP-Referer": SITE_URL,
                             "X-Title": "DarGlobal Wasalt Assistant"},
                    json={"model": m, "messages": messages, "temperature": 0.2, "max_tokens": 600},
                )
                if r.status_code == 200:
                    j = r.json()
                    txt = (j.get("choices") or [{}])[0].get("message", {}).get("content")
                    if txt:
                        return txt.strip(), m
                err = f"{m}: HTTP {r.status_code}"
            except Exception as e:
                err = f"{m}: {e}"
    raise RuntimeError(err)


@app.post("/api/chat")
async def chat(body: ChatIn):
    hits = ret.search(body.message, k=6)
    sources = list({h["url"]: {"source": h["source"], "url": h["url"], "title": h["title"]} for h in hits}.values())
    if not hits:
        return {"answer": "I don't have information about that in my DarGlobal/Wasalt data. "
                          "Try asking about their projects, partnerships, or services.", "sources": [], "model": None}
    ctx = "\n\n".join(f"[{h['source']} | {h['url']}]\n{h['text']}" for h in hits)
    msgs = [{"role": "system", "content": SYSTEM + "\n\nCONTEXT:\n" + ctx}]
    msgs += [m.model_dump() for m in body.history[-6:]]
    msgs.append({"role": "user", "content": body.message})
    if not API_KEY:
        return {"answer": "(OPENROUTER_API_KEY not set - showing raw retrieved facts)\n\n" + hits[0]["text"],
                "sources": sources, "model": None}
    try:
        answer, model = await ask_llm(msgs)
    except Exception as e:
        return {"answer": "The language model is temporarily unavailable. Closest facts I found:\n\n"
                          + hits[0]["text"], "sources": sources, "model": None, "error": str(e)}
    return {"answer": answer, "sources": sources, "model": model}


@app.get("/api/health")
def health():
    return {"status": "ok", "chunks": len(ret.chunks), "models": MODELS, "llm_configured": bool(API_KEY)}


DIST = ROOT / "frontend_dist"   # built React app (see Dockerfile)


@app.get("/")
def index():
    f = DIST / "index.html"
    return FileResponse(f if f.exists() else ROOT / "static" / "index.html")


@app.get("/favicon.svg")
def favicon():
    return FileResponse(DIST / "favicon.svg")


if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
