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

class Duel:
    def __init__(self, p1_id: str, p1_ws: WebSocket, p2_id: str, p2_ws: WebSocket):
        self.id = str(uuid.uuid4())
        self.p1_id = p1_id
        self.p1_ws = p1_ws
        self.p2_id = p2_id
        self.p2_ws = p2_ws
        self.phase = "matchmaking"
        self.scores = {}

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

    async def advance_phase(self):
        self.phase = "design"
        await self.broadcast({"type": "phase_change", "data": "design"})
        
        # Simulation of phases: design -> code -> simulation -> scoring
        await asyncio.sleep(2)  # fast timer for testing
        self.phase = "code"
        await self.broadcast({"type": "phase_change", "data": "code"})
        
        await asyncio.sleep(5)
        self.phase = "simulation"
        await self.broadcast({"type": "phase_change", "data": "simulation"})
        await self.broadcast({"type": "simulation_start"})
        
        # Send tick updates
        for _ in range(3):
            await asyncio.sleep(1)
            await self.broadcast({
                "type": "simulation_tick", 
                "data": {"p50": random.randint(10, 50), "p99": random.randint(50, 200), "rps": random.randint(500, 2000)}
            })
            
        self.phase = "scoring"
        await self.broadcast({"type": "phase_change", "data": "scoring"})
        self.scores = {self.p1_id: random.randint(300, 1000), self.p2_id: random.randint(300, 1000)}
        await self.broadcast({"type": "scores", "data": self.scores})
        
        self.phase = "complete"
        await self.broadcast({"type": "duel_complete"})


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
            # If user sends code updates, pass to opponent
            if data.get("type") == "code_update":
                # Find duel
                for d in duels.values():
                    if d.p1_id == user_id or d.p2_id == user_id:
                        await d.send_to_opponent(user_id, {"type": "opponent_progress", "data": "coding"})
            elif data.get("type") == "submit":
                for d in duels.values():
                    if d.p1_id == user_id or d.p2_id == user_id:
                        await d.send_to_opponent(user_id, {"type": "opponent_progress", "data": "submitted"})
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8096"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
