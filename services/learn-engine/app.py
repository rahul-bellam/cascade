"""Cascade — Learn Engine (Python / FastAPI). Phase 1: Learn Mode MVP.

Endpoints:
  GET  /health
  GET  /lessons                      -> list (metadata only)
  GET  /lessons/{slug}               -> full lesson (concept + snippet, no answers)
  POST /lessons/{slug}/submit        -> run snippet against tests; on full pass, save to toolkit
  GET  /lessons/{slug}/hint?level=N  -> reveal hint up to level N
  GET  /users/{user_id}/toolkit      -> saved snippets

Storage: Postgres if DATABASE_URL is set, else SQLite seeded from content/lessons/*.yaml.
Execution: subprocess sandbox with a fake-redis + injectable-clock harness.
"""
from __future__ import annotations

import os
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import sandbox
import store

app = FastAPI(title="Cascade Learn Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
_start_time = time.time()


class Submission(BaseModel):
    user_id: str = "demo-user"
    code: str
    hints_used: int = 0


def _public_lesson(L: dict) -> dict:
    """Strip answer-bearing fields (expected outputs) before sending to client."""
    safe_tests = [
        {"name": tc.get("name"), "call": tc.get("call")}
        for tc in L["snippet_test_cases"]
    ]
    return {
        "slug": L["slug"],
        "title": L["title"],
        "prerequisite_slugs": L["prerequisite_slugs"],
        "estimated_minutes": L["estimated_minutes"],
        "concept_content": L["concept_content"],
        "snippet_prompt": L["snippet_prompt"],
        "snippet_starter_code": L["snippet_starter_code"],
        "test_count": len(L["snippet_test_cases"]),
        "test_preview": safe_tests,
        "hint_count": len(L["hint_levels"]),
        "toolkit_key": L["toolkit_key"],
    }


@app.get("/health")
def health() -> dict:
    return {
        "service": "cascade-learn-engine",
        "status": "operational",
        "version": "0.1.0",
        "backend": "postgres" if store.USE_PG else "sqlite",
        "uptime": f"{int(time.time() - _start_time)}s",
    }


@app.get("/lessons")
def list_lessons() -> dict:
    s = store.get_store()
    return {
        "lessons": [
            {
                "slug": L["slug"],
                "title": L["title"],
                "estimated_minutes": L["estimated_minutes"],
                "prerequisite_slugs": L["prerequisite_slugs"],
                "order_index": L["order_index"],
            }
            for L in s.get_lessons()
        ]
    }


@app.get("/lessons/{slug}")
def get_lesson(slug: str) -> dict:
    L = store.get_store().get_lesson(slug)
    if not L:
        raise HTTPException(status_code=404, detail=f"Lesson '{slug}' not found")
    return _public_lesson(L)


@app.get("/lessons/{slug}/hint")
def get_hint(slug: str, level: int = 1) -> dict:
    L = store.get_store().get_lesson(slug)
    if not L:
        raise HTTPException(status_code=404, detail="Lesson not found")
    hints = sorted(L["hint_levels"], key=lambda h: h.get("level", 0))
    revealed = [h for h in hints if h.get("level", 0) <= level]
    if not revealed:
        raise HTTPException(status_code=404, detail="No hint at that level")
    return {"hints": revealed, "max_level": max(h.get("level", 0) for h in hints)}


@app.post("/lessons/{slug}/submit")
def submit_lesson(slug: str, sub: Submission) -> dict:
    s = store.get_store()
    L = s.get_lesson(slug)
    if not L:
        raise HTTPException(status_code=404, detail="Lesson not found")

    outcome = sandbox.run_all(sub.code, L["snippet_test_cases"])

    s.record_completion(
        sub.user_id, slug, sub.code,
        outcome["tests_passed"], outcome["tests_total"], sub.hints_used,
    )

    saved_to_toolkit = False
    if outcome["passed"] and L.get("toolkit_key"):
        s.upsert_toolkit(sub.user_id, L["toolkit_key"], sub.code)
        saved_to_toolkit = True

    # Scoring per docs/cascade-engine.md: tests 70% / no-hints 20% / elegance 10%.
    test_score = 70 * (outcome["tests_passed"] / max(1, outcome["tests_total"]))
    hint_score = 20 if sub.hints_used == 0 else max(0, 20 - 5 * sub.hints_used)
    score = round(test_score + (hint_score if outcome["passed"] else 0))

    return {
        **outcome,
        "saved_to_toolkit": saved_to_toolkit,
        "toolkit_key": L.get("toolkit_key") if saved_to_toolkit else None,
        "score": score,
    }


@app.get("/users/{user_id}/toolkit")
def get_toolkit(user_id: str) -> dict:
    return {"toolkit": store.get_store().get_toolkit(user_id)}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8093"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
