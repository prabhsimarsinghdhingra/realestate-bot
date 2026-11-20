# DarGlobal & Wasalt AI Chatbot

Scraper -> BM25 retrieval -> OpenRouter free LLM (RAG) -> FastAPI + chat UI -> Docker.

## Run locally
    cp .env.example .env        # put your OpenRouter key (free at openrouter.ai/keys)
    docker compose up --build   # scrapes during build, serves http://localhost:8000

Scrape manually: `python -m scraper.scrape` (writes data/scraped.jsonl). `data/seed.jsonl` is a
small sourced fallback so the bot works even if a site blocks scraping.

## Deploy (free) - Render
1. Push this folder to a GitHub repo.
2. render.com -> New -> Blueprint -> select the repo (uses render.yaml).
3. Set env var `OPENROUTER_API_KEY`. Deploy. URL: https://<name>.onrender.com
   (free tier sleeps when idle; first request takes ~30-60s.)

## Deploy - Hugging Face Spaces (alt)
New Space -> SDK Docker -> push repo; add front-matter `sdk: docker` and `app_port: 8000` to README,
and `OPENROUTER_API_KEY` as a secret.

## Endpoints
`GET /` UI, `POST /api/chat {message, history}`, `GET /api/health`.

## Frontend (React)
`frontend/` is a Vite + React app (Framer Motion, react-markdown, lucide-react). Docker builds it in a
Node stage and FastAPI serves the result, so there is still just one container.
Local UI development with hot reload:

    uvicorn app.main:app --port 8000      # terminal 1
    cd frontend && npm install && npm run dev   # terminal 2 -> http://localhost:5173
