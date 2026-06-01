import os
import time
import asyncio
import uuid
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional

from league import router as league_router
from sim import simulate_duel, SimulationMetrics

app = FastAPI(title="Arena Engine")
app.include_router(league_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Matchmaker:
    def __init__(self):
        self.queue = []  # tuple of (user_id, ws)

    def join_queue(self, user_id: str, ws: WebSocket):
        self.queue.append((user_id, ws))

    def get_match(self):
        if len(self.queue) >= 2:
            p1 = self.queue.pop(0)
            p2 = self.queue.pop(0)
            return p1, p2
        return None

matchmaker = Matchmaker()
duels: Dict[str, 'Duel'] = {}

PHASE_DURATIONS = {
    "design": 5,
    "code": 8,
    "simulation": 3,
}

class Duel:
    def __init__(self, p1_id: str, p1_ws: WebSocket, p2_id: str, p2_ws: WebSocket):
        self.id = str(uuid.uuid4())
        self.p1_id = p1_id
        self.p1_ws = p1_ws
        self.p2_id = p2_id
        self.p2_ws = p2_ws
        self.phase = "matchmaking"
        self.p1_fix = ""
        self.p2_fix = ""
        self.p1_submitted = False
        self.p2_submitted = False
        self.scores = {}
        self.metrics: dict[str, SimulationMetrics] = {}

    async def broadcast(self, message: dict):
        try:
            await self.p1_ws.send_json(message)
        except:
            pass
        try:
            await self.p2_ws.send_json(message)
        except:
            pass

    async def send_to_opponent(self, sender_id: str, message: dict):
        ws = self.p2_ws if sender_id == self.p1_id else self.p1_ws
        try:
            await ws.send_json(message)
        except:
            pass

    async def wait_for_submissions(self):
        deadline = time.time() + PHASE_DURATIONS["code"]
        while time.time() < deadline:
            if self.p1_submitted and self.p2_submitted:
                return
            await asyncio.sleep(0.5)

    async def advance_phase(self):
        self.phase = "design"
        await self.broadcast({"type": "phase_change", "data": "design", "duration_s": PHASE_DURATIONS["design"]})
        await asyncio.sleep(PHASE_DURATIONS["design"])

        self.phase = "code"
        await self.broadcast({"type": "phase_change", "data": "code", "duration_s": PHASE_DURATIONS["code"]})

        await self.wait_for_submissions()

        self.phase = "simulation"
        await self.broadcast({"type": "phase_change", "data": "simulation"})
        await self.broadcast({"type": "simulation_start"})

        results = simulate_duel(self.p1_fix, self.p2_fix)
        self.metrics = {}
        for i, (pid, fix) in enumerate([(self.p1_id, self.p1_fix), (self.p2_id, self.p2_fix)]):
            key = list(results.keys())[i]
            self.metrics[pid] = SimulationMetrics(**results[key]) if isinstance(results[key], dict) else results[key]

        for tick in range(PHASE_DURATIONS["simulation"]):
            await asyncio.sleep(1)
            await self.broadcast({
                "type": "simulation_tick",
                "data": {
                    self.p1_id: self.metrics[self.p1_id].dict(),
                    self.p2_id: self.metrics[self.p2_id].dict(),
                },
            })

        self.phase = "scoring"
        await self.broadcast({"type": "phase_change", "data": "scoring"})
        self.scores = self._compute_scores()
        await self.broadcast({"type": "scores", "data": self.scores})

        self.phase = "complete"
        await self.broadcast({"type": "duel_complete"})

    def _compute_scores(self) -> dict[str, int]:
        scores = {}
        for pid in (self.p1_id, self.p2_id):
            m = self.metrics.get(pid)
            if not m:
                scores[pid] = 0
                continue
            s = 0
            s += int(max(0, 100 - m.p50_latency)) * 3
            s += int(max(0, 200 - m.p99_latency)) * 2
            s += int(m.throughput / 10)
            s += int(max(0, 500 - m.cost_monthly))
            if m.error_rate < 0.01:
                s += 200
            elif m.error_rate < 0.05:
                s += 100
            scores[pid] = max(0, s)
        self.scores = scores
        return scores


@app.get("/health")
def health():
    return {"status": "operational", "service": "arena-engine"}

@app.websocket("/arena/queue")
async def queue_ws(websocket: WebSocket, user_id: str):
    await websocket.accept()
    matchmaker.join_queue(user_id, websocket)
    
    match = matchmaker.get_match()
    if match:
        p1, p2 = match
        duel = Duel(p1[0], p1[1], p2[0], p2[1])
        duels[duel.id] = duel
        
        await duel.broadcast({"type": "match_found", "duel_id": duel.id, "opponent": "System Architect"})
        asyncio.create_task(duel.advance_phase())
    else:
        await websocket.send_json({"type": "waiting_for_match"})
        
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")
            fix_code = data.get("code", "")
            for d in duels.values():
                if d.p1_id == user_id or d.p2_id == user_id:
                    if msg_type == "code_update":
                        await d.send_to_opponent(user_id, {"type": "opponent_progress", "data": "coding"})
                    elif msg_type == "submit":
                        if d.p1_id == user_id:
                            d.p1_fix = fix_code
                            d.p1_submitted = True
                        else:
                            d.p2_fix = fix_code
                            d.p2_submitted = True
                        await d.send_to_opponent(user_id, {"type": "opponent_progress", "data": "submitted"})
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8096"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
