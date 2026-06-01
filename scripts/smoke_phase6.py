import urllib.request
import json

BASE = "http://localhost:8096/league"

def get(p):
    with urllib.request.urlopen(BASE+p) as r: return json.load(r)
def post(p, d):
    req = urllib.request.Request(BASE+p, data=json.dumps(d).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r: return json.load(r)

print("--- Starting League MVP Smoke Test ---")

# 1. Create a Season
print("Creating season...")
season = post("/seasons", {"name": "Season 1", "weeks": 4})
sid = season["id"]
print(f"Season ID: {sid}")

# 2. Get current season
cur = get("/seasons/current")
assert cur["id"] == sid
print("Current season fetched correctly.")

# 3. Submit Match Results
print("Submitting match results...")
# Match 1: p1 beats p2
r1 = post("/match-result", {"season_id": sid, "winner_id": "player1", "loser_id": "player2"})
# Match 2: p1 beats p3
r2 = post("/match-result", {"season_id": sid, "winner_id": "player1", "loser_id": "player3"})
# Match 3: p2 beats p3
r3 = post("/match-result", {"season_id": sid, "winner_id": "player2", "loser_id": "player3"})
# Match 4: p4 beats p5 (promote p4)
for _ in range(9): # 9 wins = 9 * 25 = 225 ELO. Starts at 1000 -> 1225 (Silver promotion!)
    post("/match-result", {"season_id": sid, "winner_id": "player4", "loser_id": "player5"})

print("P4 promoted to Silver:", post("/match-result", {"season_id": sid, "winner_id": "player4", "loser_id": "player5"})["winner"]["division"])

# 4. Fetch Standings
print("\n--- Standings (Bronze) ---")
bronze = get(f"/standings?season_id={sid}&division=Bronze")
for u in bronze["standings"]:
    print(f"Rank {u['rank']}: {u['user_id']} | Points: {u['points']} | ELO: {u['elo']} | Trend: {u['trend']}")

print("\n--- Standings (Silver) ---")
silver = get(f"/standings?season_id={sid}&division=Silver")
for u in silver["standings"]:
    print(f"Rank {u['rank']}: {u['user_id']} | Points: {u['points']} | ELO: {u['elo']} | Trend: {u['trend']}")

print("\nLEAGUE SMOKE: PASS ✅")
