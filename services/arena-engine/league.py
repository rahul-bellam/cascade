from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
import time
from datetime import datetime, timedelta

router = APIRouter(prefix="/league")

# In-memory stores (Simulating Redis/PostgreSQL for Phase 6 MVP)
seasons: dict[str, dict] = {}
users: dict[str, dict] = {} 
# season_id -> division -> list of user entries
standings: dict[str, dict[str, dict[str, dict]]] = {}

DIVISIONS = ["Bronze", "Silver", "Gold"]

def get_division(elo: int) -> str:
    if elo < 1200:
        return "Bronze"
    elif elo < 1500:
        return "Silver"
    return "Gold"

def ensure_user(user_id: str):
    if user_id not in users:
        users[user_id] = {"id": user_id, "elo": 1000, "division": "Bronze"}

class CreateSeasonReq(BaseModel):
    name: str
    weeks: int = 1

class MatchResultReq(BaseModel):
    season_id: str
    winner_id: str
    loser_id: str

@router.post("/seasons")
def create_season(req: CreateSeasonReq):
    sid = str(uuid.uuid4())
    start_date = datetime.now()
    end_date = start_date + timedelta(weeks=req.weeks)
    
    season = {
        "id": sid,
        "name": req.name,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "active": True
    }
    seasons[sid] = season
    standings[sid] = {"Bronze": {}, "Silver": {}, "Gold": {}}
    return season

@router.get("/seasons/current")
def get_current_season():
    # Return the first active season
    for s in seasons.values():
        if s["active"]:
            return s
    raise HTTPException(status_code=404, detail="No active season found")

@router.post("/match-result")
def submit_match_result(req: MatchResultReq):
    if req.season_id not in seasons:
        raise HTTPException(status_code=404, detail="Season not found")
        
    ensure_user(req.winner_id)
    ensure_user(req.loser_id)
    
    # Store old divisions for promotion/relegation check
    w_old_div = users[req.winner_id]["division"]
    l_old_div = users[req.loser_id]["division"]
    
    # Update ELO
    users[req.winner_id]["elo"] += 25
    users[req.loser_id]["elo"] -= 20
    
    # Re-evaluate divisions
    w_new_div = get_division(users[req.winner_id]["elo"])
    l_new_div = get_division(users[req.loser_id]["elo"])
    
    users[req.winner_id]["division"] = w_new_div
    users[req.loser_id]["division"] = l_new_div
    
    # Initialize standings if empty
    s_standings = standings[req.season_id]
    
    def add_points(user_id, div, points):
        if user_id not in s_standings[div]:
            s_standings[div][user_id] = {"user_id": user_id, "points": 0, "wins": 0, "losses": 0, "trend": "same"}
        s_standings[div][user_id]["points"] += points
    
    add_points(req.winner_id, w_new_div, 100)
    s_standings[w_new_div][req.winner_id]["wins"] += 1
    
    add_points(req.loser_id, l_new_div, 10)
    s_standings[l_new_div][req.loser_id]["losses"] += 1
    
    # Handle trend (Promotion/Relegation)
    if w_new_div != w_old_div:
        s_standings[w_new_div][req.winner_id]["trend"] = "promoted"
    if l_new_div != l_old_div:
        s_standings[l_new_div][req.loser_id]["trend"] = "relegated"

    return {
        "status": "success",
        "winner": {"id": req.winner_id, "elo": users[req.winner_id]["elo"], "division": w_new_div, "trend": s_standings[w_new_div][req.winner_id]["trend"]},
        "loser": {"id": req.loser_id, "elo": users[req.loser_id]["elo"], "division": l_new_div, "trend": s_standings[l_new_div][req.loser_id]["trend"]}
    }

@router.get("/seasons/{season_id}")
def get_season(season_id: str) -> Optional[dict]:
    return seasons.get(season_id)

@router.get("/standings")
def get_standings(season_id: str, division: str):
    if season_id not in standings:
        raise HTTPException(status_code=404, detail="Season not found")
    if division not in DIVISIONS:
        raise HTTPException(status_code=400, detail="Invalid division")
        
    div_standings = standings[season_id][division]
    sorted_users: List[dict] = sorted(div_standings.values(), key=lambda x: x["points"], reverse=True)
    
    # Add rank and ELO
    result = []
    for i, user_data in enumerate(sorted_users):
        u_info = users.get(user_data["user_id"], {})
        result.append({
            "rank": i + 1,
            "user_id": user_data["user_id"],
            "elo": u_info.get("elo", 1000),
            "points": user_data["points"],
            "wins": user_data["wins"],
            "losses": user_data["losses"],
            "trend": user_data["trend"]
        })
        
    return {"season_id": season_id, "division": division, "standings": result}
