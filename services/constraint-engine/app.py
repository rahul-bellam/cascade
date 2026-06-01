import os
import time
import uuid
import json
import urllib.request
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model import Session, ConstraintLevel
from content import load_archetype, list_archetypes, origin_code
from sim import evaluate

LEARN_ENGINE_URL = os.getenv("LEARN_ENGINE_URL", "http://localhost:8093")

app = FastAPI(title="Cascade Constraint Engine", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
_start_time = time.time()

sessions: dict[str, Session] = {}


class StartReq(BaseModel):
    archetype: str = "rate-limiter"
    user_id: str = "demo-user"


class SubmitReq(BaseModel):
    code: str = ""
    architecture: str = ""


def toolkit_for_user(user_id: str) -> list[dict]:
    try:
        url = f"{LEARN_ENGINE_URL}/users/{user_id}/toolkit"
        with urllib.request.urlopen(url, timeout=2) as r:
            return json.loads(r.read()).get("toolkit", [])
    except Exception:
        return []


def suggest_toolkit(a: dict, level: int, user_id: str) -> list[dict]:
    tk = toolkit_for_user(user_id)
    if not tk:
        return []
    ct = ""
    constraints = a.get("constraints", [])
    if 1 <= level <= len(constraints):
        ct = constraints[level - 1].get("change_type", "")
    out = []
    for item in tk:
        key = str(item.get("toolkit_key", ""))
        relevant = False
        if "caching" in ct and "cache" in key:
            relevant = True
        if "rate" in a.get("slug", "") and "token" in key:
            relevant = True
        if "cache" in key:
            relevant = True
        out.append({**item, "relevant": relevant})
    return out


def level_view(a: dict, level: int, user_id: str) -> dict:
    if level == 0:
        return {
            "level": 0,
            "title": "Origin -- the working monolith",
            "impact": a["starting_monolith"],
            "origin_code": origin_code(a),
            "is_origin": True,
            "suggested_toolkit": suggest_toolkit(a, 1, user_id),
        }
    constraints = a.get("constraints", [])
    if level > len(constraints):
        return {"completed": True}
    c = constraints[level - 1]
    return {
        "level": c["level"],
        "title": c["title"],
        "impact": c["impact"],
        "target_rps": c["target_rps"],
        "latency_sla_ms": c["latency_sla_ms"],
        "error_sla_pct": c["error_sla_pct"],
        "change_type": c["change_type"],
        "hint_count": len(c.get("hints", [])),
        "is_origin": False,
        "suggested_toolkit": suggest_toolkit(a, level, user_id),
    }


def compute_score(s: Session) -> int:
    level_score = len(s.completed) * 120
    hint_penalty = s.hints_used * 20
    perf_bonus = sum(20 for r in s.completed if r.p99_latency < 100)
    sc = level_score + perf_bonus - hint_penalty
    return max(0, sc)


@app.get("/health")
def health():
    return {
        "service": "cascade-constraint-engine",
        "status": "operational",
        "version": "0.2.0",
        "uptime": f"{int(time.time() - _start_time)}s",
    }


@app.get("/archetypes")
def archetypes():
    return {"archetypes": list_archetypes()}


@app.post("/constraint/start")
def start(req: StartReq):
    archetype_slug = req.archetype or "rate-limiter"
    user_id = req.user_id or "demo-user"
    try:
        a = load_archetype(archetype_slug)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"unknown archetype: {archetype_slug}")

    sid = str(uuid.uuid4())
    s = Session(
        session_id=sid,
        user_id=user_id,
        archetype=a["slug"],
        name=a["name"],
        current_level=0,
        max_level=len(a.get("constraints", [])),
        status="active",
    )
    sessions[sid] = s
    return {
        "session_id": sid,
        "archetype": a["slug"],
        "name": a["name"],
        "max_level": s.max_level,
        "current": level_view(a, 1, user_id),
        "origin": level_view(a, 0, user_id),
    }


def _require(sid: str):
    s = sessions.get(sid)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")
    try:
        a = load_archetype(s.archetype)
    except Exception:
        raise HTTPException(status_code=404, detail="archetype not found")
    return s, a


@app.get("/constraint/{sid}")
def current(sid: str):
    s, a = _require(sid)
    lvl = s.current_level if s.current_level >= 1 else 1
    return {
        "session_id": sid,
        "status": s.status,
        "current_level": s.current_level,
        "max_level": s.max_level,
        "score": s.score,
        "current": level_view(a, lvl, s.user_id),
    }


@app.post("/constraint/{sid}/submit")
def submit(sid: str, req: SubmitReq):
    s, a = _require(sid)
    if s.status != "active":
        raise HTTPException(status_code=409, detail=f"session already {s.status}")

    fix = req.code + "\n" + req.architecture
    level_num = s.current_level if s.current_level >= 1 else 1
    constraints = a.get("constraints", [])
    if level_num > len(constraints):
        raise HTTPException(status_code=400, detail="all levels completed")
    level = ConstraintLevel(**constraints[level_num - 1])
    res = evaluate(level, fix)

    resp = {
        "session_id": sid,
        "level": level_num,
        "metrics": res.model_dump(),
        "passed": res.passed,
    }

    if res.passed:
        s.current_level = level_num + 1
        s.completed.append(res)
        s.score = compute_score(s)
        if s.current_level > s.max_level:
            s.status = "completed"
            resp["all_levels_complete"] = True
            resp["score"] = s.score
        else:
            resp["next"] = level_view(a, s.current_level, s.user_id)
    resp["status"] = s.status
    return resp


@app.get("/constraint/{sid}/hint")
def hint(sid: str, level: int = 1):
    s, a = _require(sid)
    lvl = s.current_level if s.current_level >= 1 else 1
    constraints = a.get("constraints", [])
    if lvl > len(constraints):
        raise HTTPException(status_code=404, detail="no current level")
    hints = constraints[lvl - 1].get("hints", [])
    reveal = min(level, len(hints))
    if reveal > s.hints_used:
        s.hints_used = reveal
    return {
        "hints": hints[:reveal],
        "max_level": len(hints),
        "hints_used": s.hints_used,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8094"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
