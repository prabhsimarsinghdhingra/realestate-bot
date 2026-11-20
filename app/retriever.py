import json, re
from pathlib import Path
from rank_bm25 import BM25Okapi

DATA = Path(__file__).resolve().parent.parent / "data"


def tok(s):
    # light stemming so "brands" matches "brand", "projects" matches "project"
    return [w[:-1] if len(w) > 3 and w.endswith("s") else w for w in re.findall(r"\w+", s.lower())]


def chunk(text, size=900, overlap=150):
    text = re.sub(r"\s+", " ", text).strip()
    out, i = [], 0
    while i < len(text):
        out.append(text[i:i + size])
        i += size - overlap
    return out


class Retriever:
    def __init__(self):
        self.load()

    def load(self):
        chunks = []
        for fn in ("seed.jsonl", "scraped.jsonl"):
            p = DATA / fn
            if not p.exists():
                continue
            # iterate the file object (splits on "\n" only, unlike str.splitlines())
            with p.open(encoding="utf-8") as fh:
                lines = list(fh)
            for line in lines:
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                except ValueError:
                    continue  # skip a corrupt record instead of crashing
                for c in chunk(r["text"]):
                    chunks.append({"source": r["source"], "url": r["url"],
                                   "title": r.get("title", ""), "text": c})
        bm25 = BM25Okapi([tok(c["title"] + " " + c["text"]) for c in chunks]) if chunks else None
        self.chunks, self.bm25 = chunks, bm25

    def search(self, q, k=6):
        if not self.bm25:
            return []
        scores = self.bm25.get_scores(tok(q))
        top = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
        return [self.chunks[i] for i in top if scores[i] > 0]
