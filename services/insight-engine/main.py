import os
import time
import re
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

CASCADE_ENGINE_URL = os.getenv("CASCADE_ENGINE_URL", "http://localhost:8090")

app = FastAPI(title="insight-engine", version="1.0.0")

telemetry_cache: list[dict] = []
last_fetch = 0.0
CACHE_TTL = 30.0

class InsightRequest(BaseModel):
    diagnosis: str
    tradeoffs: str
    foresight: str
    expected_diagnosis: list[str] = []
    expected_tradeoffs: list[str] = []
    expected_foresight: list[str] = []

class InsightResponse(BaseModel):
    diagnosis_score: float
    tradeoff_score: float
    foresight_score: float
    total: float
    unlocked: bool
    process_hint: str = ""

# ── Tokenizer ────────────────────────────────────────────────────────────────

_TOKENIZE_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")

def tokenize(text: str) -> str:
    tokens = _TOKENIZE_RE.findall(text.lower())
    return " ".join(tokens)

# ── TF-IDF scorer ────────────────────────────────────────────────────────────

def _score_tfidf(text: str, expected: list[str]) -> float:
    if not expected:
        return 1.0
    clean = tokenize(text)
    if not clean.strip():
        return 0.0
    candidates = [clean] + [tokenize(e) for e in expected]
    vec = TfidfVectorizer(ngram_range=(1, 2), max_features=500)
    try:
        mat = vec.fit_transform(candidates)
        sims = cosine_similarity(mat[0:1], mat[1:]).flatten()
        return float(np.mean(sims))
    except ValueError:
        return 0.0

# ── Keyword fallback scorer ───────────────────────────────────────────────────

def _score_keyword(text: str, expected: list[str]) -> float:
    if not expected:
        return 1.0
    norm = text.lower()
    hits = sum(1 for kw in expected if kw.lower() in norm)
    return hits / len(expected)

def score_insight(req: InsightRequest) -> InsightResponse:
    if HAS_SKLEARN:
        ds = _score_tfidf(req.diagnosis, req.expected_diagnosis)
        ts = _score_tfidf(req.tradeoffs, req.expected_tradeoffs)
        fs = _score_tfidf(req.foresight, req.expected_foresight)
    else:
        ds = _score_keyword(req.diagnosis, req.expected_diagnosis)
        ts = _score_keyword(req.tradeoffs, req.expected_tradeoffs)
        fs = _score_keyword(req.foresight, req.expected_foresight)

    total = (ds + ts + fs) / 3.0
    unlocked = total >= 0.3

    hint = ""
    if not unlocked:
        if ds < 0.3:
            hint = "Start by identifying the specific component that's failing — what resource is exhausted or unavailable?"
        elif ts < 0.3:
            hint = "Your fix has a cost. What trade-off are you making? (Latency? Consistency? Cost?)"
        else:
            hint = "Good diagnosis. Now think one step ahead — what new failure could your fix introduce?"

    return InsightResponse(
        diagnosis_score=round(ds, 3),
        tradeoff_score=round(ts, 3),
        foresight_score=round(fs, 3),
        total=round(total, 3),
        unlocked=unlocked,
        process_hint=hint,
    )

# ── Telemetry helpers ────────────────────────────────────────────────────────

def fetch_telemetry() -> list[dict]:
    global telemetry_cache, last_fetch
    now = time.time()
    if telemetry_cache and now - last_fetch < CACHE_TTL:
        return telemetry_cache
    import httpx
    try:
        resp = httpx.get(f"{CASCADE_ENGINE_URL}/cascade/telemetry", timeout=5)
        if resp.status_code == 200:
            telemetry_cache = resp.json()
            last_fetch = now
    except Exception:
        pass
    return telemetry_cache

def compute_mastery(entries: list[dict]) -> dict:
    concern_stats: dict[int, dict] = {}
    for e in entries:
        for cid in e.get("concern_ids", []):
            if cid not in concern_stats:
                concern_stats[cid] = {"exposures": 0, "fixes": 0, "misses": 0}
            concern_stats[cid]["exposures"] += 1
            missed = e.get("missed", [])
            if missed:
                concern_stats[cid]["misses"] += 1
            else:
                concern_stats[cid]["fixes"] += 1
    result = {}
    for cid, stats in concern_stats.items():
        rate = stats["fixes"] / stats["exposures"] if stats["exposures"] > 0 else 0
        if rate > 0.8 and stats["exposures"] >= 5:
            state = "strong"
        elif rate > 0.5:
            state = "improving"
        elif stats["exposures"] >= 3 and rate < 0.3:
            state = "blind_spot"
        elif rate < 0.5:
            state = "weak"
        else:
            state = "exposed"
        result[str(cid)] = {
            "exposures": stats["exposures"],
            "fix_rate": round(rate, 2),
            "state": state,
        }
    return result

def compute_biases(entries: list[dict]) -> list[dict]:
    bias_counter: dict[str, int] = defaultdict(int)
    total = 0
    for e in entries:
        rf = e.get("reached_for_first", "")
        if rf:
            bias_counter[rf] += 1
            total += 1
    biases = []
    for bias, count in sorted(bias_counter.items(), key=lambda x: -x[1]):
        biases.append({
            "bias": bias,
            "strength": round(count / total, 2) if total > 0 else 0,
            "evidence": f"reaches for {bias} first {count}/{total} times",
        })
    return biases

def detect_chains(entries: list[dict]) -> list[list[str]]:
    graph: dict[str, set[str]] = defaultdict(set)
    for e in entries:
        src = e.get("node", "")
        dst = e.get("led_to", "")
        if src and dst:
            graph[src].add(dst)
    chains = []
    for src, dsts in graph.items():
        for dst in dsts:
            if dst in graph:
                for dst2 in graph[dst]:
                    chains.append([src, dst, dst2])
    return chains[:5]

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/insight/score")
def score_insight_endpoint(req: InsightRequest) -> InsightResponse:
    return score_insight(req)

@app.get("/profile/{user_id}/mastery")
def get_mastery(user_id: str):
    entries = [e for e in fetch_telemetry() if e.get("user_id") == user_id]
    if not entries:
        raise HTTPException(status_code=404, detail=f"No telemetry for user '{user_id}'")
    return {"user_id": user_id, "concern_mastery": compute_mastery(entries)}

@app.get("/profile/{user_id}/biases")
def get_biases(user_id: str):
    entries = [e for e in fetch_telemetry() if e.get("user_id") == user_id]
    return {"user_id": user_id, "instinct_biases": compute_biases(entries)}

@app.get("/profile/{user_id}/weaknesses")
def get_weaknesses(user_id: str):
    entries = [e for e in fetch_telemetry() if e.get("user_id") == user_id]
    mastery = compute_mastery(entries)
    weak = {k: v for k, v in mastery.items() if v["state"] in ("blind_spot", "weak")}
    return {
        "user_id": user_id,
        "weaknesses": dict(sorted(weak.items(), key=lambda x: x[1]["exposures"], reverse=True)),
    }

@app.get("/profile/{user_id}/chains")
def get_chains(user_id: str):
    entries = [e for e in fetch_telemetry() if e.get("user_id") == user_id]
    return {"user_id": user_id, "recurring_chains": detect_chains(entries)}

@app.get("/profile/{user_id}/full")
def get_full_profile(user_id: str):
    entries = [e for e in fetch_telemetry() if e.get("user_id") == user_id]
    return {
        "user_id": user_id,
        "sessions": len(set(e.get("ts", "")[:10] for e in entries)),
        "concern_mastery": compute_mastery(entries),
        "instinct_biases": compute_biases(entries),
        "recurring_chains": detect_chains(entries),
    }

@app.get("/profile/{user_id}/weekly")
def get_weekly_mirror(user_id: str):
    entries = [e for e in fetch_telemetry() if e.get("user_id") == user_id]
    mastery = compute_mastery(entries)
    biases = compute_biases(entries)
    weak = {k: v for k, v in mastery.items() if v["state"] in ("blind_spot", "weak")}
    strong = {k: v for k, v in mastery.items() if v["state"] == "strong"}
    return {
        "user_id": user_id,
        "week_of": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "weaknesses": len(weak),
        "strengths": len(strong),
        "top_bias": biases[0]["bias"] if biases else "none",
        "blind_spots": [f"concern_{k}" for k in weak.keys()],
        "message": f"You closed {len(strong)} concerns this period. "
                   f"Still weak on {len(weak)} — keep practicing.",
    }
