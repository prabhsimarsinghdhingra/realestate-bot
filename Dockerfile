# ---- stage 1: build the React frontend ----
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- stage 2: Python API + scraped data + built UI ----
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
COPY requirements.txt .
RUN pip install -r requirements.txt
# scrape before copying app code so code edits don't re-trigger the slow scrape layer
COPY scraper ./scraper
COPY data ./data
ARG SCRAPE_AT_BUILD=true
RUN if [ "$SCRAPE_AT_BUILD" = "true" ]; then python -m scraper.scrape || echo "scrape failed at build"; fi
COPY app ./app
COPY static ./static
COPY --from=web /web/dist ./frontend_dist
ENV PORT=8000
EXPOSE 8000
CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
