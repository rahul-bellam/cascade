"""Smoke test: walk the rate-limiter cascade from problem to a terminal."""
import json, sys, urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8090"

def get(p):
    with urllib.request.urlopen(BASE + p) as r: return json.load(r)
def post(p, b):
    req = urllib.request.Request(BASE+p, data=json.dumps(b).encode(),
        headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req) as r: return json.load(r)

print("health:", get("/health")["status"])
start = post("/cascade/start", {"archetype":"rate-limiter","user_id":"u1"})
sid = start["session_id"]
cur = start["current"]
print(f"\nStart: {start['name']}  (session {sid[:8]})")
print(f"  PROBLEM [{cur['node_id']} / {cur['severity']}]: {cur['description']}")

# A sequence of good fixes that should drive the cascade toward a stable terminal.
fixes = [
    "move counters to redis with expire ttl",            # no_persistence -> redis_spof
    "add redis sentinel with replica failover",          # redis_spof -> memory_exhaustion
    "add ttl/expire on keys and maxmemory eviction policy", # memory_exhaustion -> distributed_inconsistency
    "use crdt counters to merge counts globally",        # distributed_inconsistency -> terminal_stable
]

ok = True
step = 0
while True:
    state = get(f"/cascade/{sid}")
    if state["current"]["is_terminal"]:
        break
    fix = fixes[step] if step < len(fixes) else "add monitoring and async batching"
    step += 1
    res = post(f"/cascade/{sid}/fix", {"fix": fix})
    nxt = res["next"]
    tag = "TERMINAL" if nxt["is_terminal"] else f"{nxt['severity']}"
    print(f"\n  FIX: {fix!r}")
    print(f"   -> {res['from_node']} => {nxt['node_id']} [{tag}] ({res['edge_reason']})")
    print(f"      {nxt['description']}")
    if nxt["is_terminal"]:
        print(f"\n  OUTCOME: status={res['status']}  score={res.get('score')}")
        ok &= (res["status"] == "survived")
        break
    if step > 12:
        ok = False; break

summ = get(f"/cascade/{sid}/summary")
print(f"\n  Post-mortem: {len(summ['path'])} steps, depth {summ['depth']}, score {summ['score']}, status {summ['status']}")
ok &= (summ["status"] == "survived" and summ["depth"] >= 3)
print("\nCASCADE SMOKE:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
