"""Cascade — Cascade Engine (Python / FastAPI). Phase 1.5: rate-limiter chain.

The "solving for failure" loop:
  POST /cascade/start            {archetype, user_id}      -> session at first issue
  GET  /cascade/{sid}            -> current problem (description, severity, hints meta)
  GET  /cascade/{sid}/hint?level=N
  POST /cascade/{sid}/fix        {fix}                     -> advance to next failure or terminal
  GET  /cascade/{sid}/summary    -> post-mortem (full path + score)

Fixes are free text; dag.py decides which downstream failure your fix triggers
(fix_contains/fix_empty conditions). Survive until a terminal node.
"""
from __future__ import annotations

import os
import time
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import dag as dagmod

app = FastAPI(title="Cascade Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
_start_time = time.time()

# In-memory session store (Postgres-backed cascade_sessions table available for prod).
SESSIONS: dict[str, dict] = {}

import json as _json
import urllib.request as _urlreq

LEARN_ENGINE_URL = os.getenv("LEARN_ENGINE_URL", "http://localhost:8093")


def _toolkit_for_user(user_id: str) -> list[dict]:
    """Best-effort fetch of the user's saved snippets from the Learn Engine."""
    try:
        with _urlreq.urlopen(f"{LEARN_ENGINE_URL}/users/{user_id}/toolkit", timeout=2) as r:
            return _json.load(r).get("toolkit", [])
    except Exception:
        return []


def _suggest_toolkit(node: dict, user_id: str) -> list[dict]:
    """Surface toolkit snippets relevant to the current failure node."""
    tk = _toolkit_for_user(user_id)
    if not tk:
        return []
    sig = node.get("solution_signature") or {}
    blob = " ".join([
        str(node.get("category", "")), str(node.get("description", "")),
        " ".join(sig.get("required", []) if isinstance(sig.get("required"), list) else []),
        str(sig.get("preferred", "")),
    ]).lower()
    out = []
    for item in tk:
        key = str(item.get("toolkit_key", "")).lower()
        relevant = False
        if "cache" in key and ("redis" in blob or "cache" in blob or "persist" in blob or "data_loss" in blob):
            relevant = True
        if "token" in key and ("rate" in blob or "limit" in blob or "counter" in blob):
            relevant = True
        out.append({**item, "relevant": relevant})
    # relevant first
    out.sort(key=lambda x: not x.get("relevant"))
    return out




class StartReq(BaseModel):
    archetype: str = "rate-limiter"
    user_id: str = "demo-user"


class FixReq(BaseModel):
    fix: str


def _node_view(dag: dagmod.Dag, node_id: str, hints_revealed: int = 0, user_id: str = "demo-user") -> dict:
    n = dag.node(node_id)
    hints = sorted(n.get("hints", []), key=lambda h: h.get("level", 0))
    return {
        "node_id": node_id,
        "type": n.get("type"),
        "severity": n.get("severity"),
        "category": n.get("category"),
        "description": n.get("description"),
        "outcome": n.get("outcome"),
        "is_terminal": dag.is_terminal(node_id),
        "hint_count": len(hints),
        "hints_revealed": [h for h in hints if h.get("level", 0) <= hints_revealed],
        "solution_signature": n.get("solution_signature"),
        "suggested_toolkit": _suggest_toolkit(n, user_id) if not dag.is_terminal(node_id) else [],
    }


def _score(session: dict, dag: dagmod.Dag) -> int:
    """Cascade scoring (per docs): chain depth 40% / no-hints 20% / survival bonus."""
    depth = session["depth"]
    hints = session["hints_used"]
    survived = session["status"] == "survived"
    base = depth * 200                       # reward going deep
    hint_penalty = hints * 40
    survival_bonus = 500 if survived else 0
    return max(0, base + survival_bonus - hint_penalty)


@app.get("/health")
def health() -> dict:
    return {
        "service": "cascade-engine",
        "status": "operational",
        "version": "0.1.0",
        "uptime": f"{int(time.time() - _start_time)}s",
    }


@app.get("/archetypes")
def archetypes() -> dict:
    dag = dagmod.load_dag("rate-limiter")
    return {"archetypes": [{"slug": dag.slug, "name": dag.name}]}


@app.post("/cascade/start")
def start(req: StartReq) -> dict:
    try:
        dag = dagmod.load_dag(req.archetype)
    except (FileNotFoundError, Exception) as e:  # noqa: BLE001
        raise HTTPException(status_code=404, detail=f"No DAG for '{req.archetype}': {e}")

    first = dag.first_node()
    sid = str(uuid.uuid4())
    SESSIONS[sid] = {
        "id": sid,
        "user_id": req.user_id,
        "archetype": dag.slug,
        "current_node": first,
        "path": [],          # list of {from, fix, to, reason}
        "depth": 0,
        "hints_used": 0,
        "hints_revealed_here": 0,
        "status": "active",
    }
    return {
        "session_id": sid,
        "archetype": dag.slug,
        "name": dag.name,
        "current": _node_view(dag, first, 0, req.user_id),
    }


def _require(sid: str):
    s = SESSIONS.get(sid)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s, dagmod.load_dag(s["archetype"])


@app.get("/cascade/{sid}")
def current(sid: str) -> dict:
    s, dag = _require(sid)
    return {
        "session_id": sid,
        "status": s["status"],
        "depth": s["depth"],
        "hints_used": s["hints_used"],
        "current": _node_view(dag, s["current_node"], s["hints_revealed_here"], s["user_id"]),
    }


@app.get("/cascade/{sid}/hint")
def hint(sid: str, level: int = 1) -> dict:
    s, dag = _require(sid)
    node = dag.node(s["current_node"])
    hints = sorted(node.get("hints", []), key=lambda h: h.get("level", 0))
    revealed = [h for h in hints if h.get("level", 0) <= level]
    if not revealed:
        raise HTTPException(status_code=404, detail="No hint at that level")
    if level > s["hints_revealed_here"]:
        s["hints_used"] += level - s["hints_revealed_here"]
        s["hints_revealed_here"] = level
    return {"hints": revealed, "hints_used": s["hints_used"]}


@app.post("/cascade/{sid}/fix")
def submit_fix(sid: str, req: FixReq) -> dict:
    s, dag = _require(sid)
    if s["status"] != "active":
        raise HTTPException(status_code=409, detail=f"Session already {s['status']}")

    from_node = s["current_node"]
    edge = dag.resolve_transition(from_node, req.fix)
    to_node = edge["to"]

    s["path"].append(
        {"from": from_node, "fix": req.fix, "to": to_node, "reason": edge["reason"]}
    )
    s["current_node"] = to_node
    s["depth"] += 1
    s["hints_revealed_here"] = 0

    if dag.is_terminal(to_node):
        outcome = dag.node(to_node).get("outcome", "survived")
        s["status"] = "survived" if outcome == "survived" else "failed"

    result = {
        "session_id": sid,
        "from_node": from_node,
        "next": _node_view(dag, to_node, 0, s["user_id"]),
        "edge_reason": edge["reason"],
        "depth": s["depth"],
        "status": s["status"],
    }
    if s["status"] != "active":
        result["score"] = _score(s, dag)
    return result


@app.get("/cascade/{sid}/summary")
def summary(sid: str) -> dict:
    s, dag = _require(sid)
    return {
        "session_id": sid,
        "archetype": s["archetype"],
        "status": s["status"],
        "depth": s["depth"],
        "hints_used": s["hints_used"],
        "score": _score(s, dag),
        "path": [
            {
                "step": i + 1,
                "problem": dag.node(p["from"]).get("description"),
                "your_fix": p["fix"],
                "led_to": p["to"],
                "led_to_problem": dag.node(p["to"]).get("description"),
            }
            for i, p in enumerate(s["path"])
        ],
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8090"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
