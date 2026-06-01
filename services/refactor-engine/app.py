"""Cascade — Blind Refactor Engine (Python / FastAPI).

Phase 0 scaffold: exposes a /health endpoint so the service is runnable end-to-end.
Codebase analysis + dependency mapping arrive in Phase 4.
"""
import os
import time

from fastapi import FastAPI

app = FastAPI(title="Cascade Refactor Engine", version="0.1.0")
_start_time = time.time()


@app.get("/health")
def health() -> dict:
    return {
        "service": "cascade-refactor-engine",
        "status": "operational",
        "version": "0.1.0",
        "uptime": f"{int(time.time() - _start_time)}s",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8095"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
