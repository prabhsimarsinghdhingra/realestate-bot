"""Polite scraper for publicly available pages of DarGlobal and Wasalt.

Usage:  python -m scraper.scrape            (writes data/scraped.jsonl)
Env:    MAX_PAGES_PER_SITE (default 60), SCRAPE_DELAY (default 1.0 seconds)

It honours robots.txt, uses a descriptive User-Agent, rate-limits itself and
only follows same-host links discovered from sitemaps / the home page.
"""
import json, os, re, sys, time
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

OUT = Path(__file__).resolve().parent.parent / "data" / "scraped.jsonl"
UA = "Mozilla/5.0 (compatible; RealEstateBotAssignment/1.0; educational use)"
MAX_PAGES = int(os.getenv("MAX_PAGES_PER_SITE", "60"))
DELAY = float(os.getenv("SCRAPE_DELAY", "1.0"))

SITES = {
    "DarGlobal": {
        "base": "https://darglobal.co.uk",
        "seeds": ["/", "/about", "/projects", "/press", "/investor"],
        "prefer": ["project", "press", "about", "investor", "partner"],
    },
    "Wasalt": {
        "base": "https://wasalt.sa",
        "seeds": ["/en", "/en/corporate", "/en/s/wasalt-business", "/en/projects", "/en/blog"],
        "prefer": ["corporate", "about", "project", "blog", "article", "auction", "business", "faq"],
    },
}
EXTRA = {"Wasalt": ["https://wasalt.com/en/about"]}

SKIP_EXT = re.compile(r"\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|mp4|css|js|ico|xml)(\?|$)", re.I)
session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "en,ar;q=0.8"})
_robots = {}


def robots_ok(url):
    host = "{0.scheme}://{0.netloc}".format(urlparse(url))
    if host not in _robots:
        rp = RobotFileParser()
        try:
            r = session.get(host + "/robots.txt", timeout=15)
            rp.parse(r.text.splitlines() if r.ok else [])
        except Exception:
            rp.parse([])
        _robots[host] = rp
    return _robots[host].can_fetch(UA, url)


def get(url):
    if not robots_ok(url):
        print("  robots-blocked:", url)
        return None
    time.sleep(DELAY)
    try:
        r = session.get(url, timeout=25)
        ctype = r.headers.get("content-type", "")
        if r.ok and ("text" in ctype or "xml" in ctype):
            return r.text
    except Exception as e:
        print("  fetch error:", url, e)
    return None


def sitemap_urls(base):
    found, queue, seen = [], [base + "/sitemap.xml"], set()
    while queue and len(seen) < 10:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        txt = get(sm)
        if not txt:
            continue
        for loc in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", txt):
            (queue if loc.endswith(".xml") else found).append(loc)
    return found


def flatten_strings(obj, out, depth=0):
    if depth > 12:
        return
    if isinstance(obj, str):
        if len(obj) > 25 and not obj.startswith(("http", "/", "data:")) and " " in obj:
            out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            flatten_strings(v, out, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            flatten_strings(v, out, depth + 1)


def extract(html, url):
    soup = BeautifulSoup(html, "lxml")
    links = [urldefrag(urljoin(url, a["href"]))[0] for a in soup.find_all("a", href=True)]
    extras = []
    # Next.js / JSON-LD embedded data (many modern sites render client-side)
    nd = soup.find("script", id="__NEXT_DATA__")
    if nd and nd.string:
        try:
            flatten_strings(json.loads(nd.string).get("props", {}), extras)
        except Exception:
            pass
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            flatten_strings(json.loads(s.string or ""), extras)
        except Exception:
            pass
    for t in soup(["script", "style", "noscript", "nav", "footer", "header", "svg", "form"]):
        t.decompose()
    title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    meta = soup.find("meta", attrs={"name": "description"})
    desc = meta.get("content", "").strip() if meta else ""
    body = soup.get_text("\n", strip=True)
    lines = [l for l in body.split("\n") if len(l) > 2]
    text = "\n".join([desc] + lines + list(dict.fromkeys(extras)))
    text = re.sub(r"\n{2,}", "\n", text).strip()
    return title, text, links


def score(url, prefer):
    return -sum(k in url.lower() for k in prefer)


def crawl(name, cfg):
    base, host = cfg["base"], urlparse(cfg["base"]).netloc
    cands = [urljoin(base, p) for p in cfg["seeds"]] + sitemap_urls(base)

    def ok(u):
        p = urlparse(u)
        if p.netloc != host or SKIP_EXT.search(u):
            return False
        if "search" in p.path or ("?" in u and "page=" in u):
            return False
        if name == "Wasalt" and not p.path.startswith(("/en", "/ar")):
            return False
        return True

    todo = sorted([u for u in dict.fromkeys(cands) if ok(u)], key=lambda u: score(u, cfg["prefer"]))
    todo += EXTRA.get(name, [])
    seen, records = set(), []
    while todo and len(records) < MAX_PAGES:
        url = todo.pop(0)
        if url in seen:
            continue
        seen.add(url)
        html = get(url)
        if not html:
            continue
        title, text, links = extract(html, url)
        if len(text) < 200:
            continue
        print(f"  [{name}] {len(text):6d} chars  {url}")
        records.append({"source": name, "url": url, "title": title, "text": text})
        for l in links:
            if l not in seen and l not in todo and ok(l) and len(todo) < 400:
                todo.append(l)
        todo.sort(key=lambda u: score(u, cfg["prefer"]))
    return records


def main():
    OUT.parent.mkdir(exist_ok=True)
    allrec = []
    for name, cfg in SITES.items():
        print("Scraping", name)
        allrec += crawl(name, cfg)
    with OUT.open("w", encoding="utf-8") as f:
        for r in allrec:
            f.write(json.dumps(r) + "\n")
    print(f"Saved {len(allrec)} pages -> {OUT}")
    return 0 if allrec else 1


if __name__ == "__main__":
    sys.exit(main())
