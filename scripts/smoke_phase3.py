"""Phase 3: DAG graph endpoint + weighted walk + post-mortem. Needs cascade-engine on 8090."""
import json, sys, urllib.request, collections
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8090"
def get(p):
    with urllib.request.urlopen(BASE+p) as r: return json.load(r)
def post(p,b):
    req=urllib.request.Request(BASE+p,data=json.dumps(b).encode(),headers={"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req) as r: return json.load(r)

ok=True
# 1. graph endpoint
g = get("/cascade/graph/rate-limiter")
print("graph: %d nodes, %d edges, start=%s, first=%s" % (len(g["nodes"]), len(g["edges"]), g["start"], g["first_issue"]))
ok &= len(g["nodes"]) == 13 and len(g["edges"]) > 13

# 2. walk to terminal (strong fix each step)
s = post("/cascade/start", {"archetype":"rate-limiter","user_id":"u1"})
sid = s["session_id"]; node = s["current"]
strong = "redis sentinel replica lua incr atomic ttl expire eviction crdt global merge load balancer shard async"
steps=0; status="active"
while not node["is_terminal"] and steps < 20:
    r = post(f"/cascade/{sid}/fix", {"fix": strong})
    node = r["next"]; status = r["status"]; steps += 1
print("walk: reached %s after %d steps, status=%s, score=%s" % (node["node_id"], steps, status, r.get("score")))
ok &= node["is_terminal"]

# 3. weighted variety: same fix from redis_spof leads to >1 outcome across fresh sessions
outs = collections.Counter()
for _ in range(30):
    ss = post("/cascade/start", {"archetype":"rate-limiter","user_id":"u1"})["session_id"]
    post(f"/cascade/{ss}/fix", {"fix":"redis ttl"})  # origin->redis_spof region
    r = post(f"/cascade/{ss}/fix", {"fix":"sentinel replica fallback circuit"})
    outs[r["next"]["node_id"]] += 1
print("weighted variety from redis_spof:", dict(outs))
ok &= len(outs) >= 2

# 4. summary/post-mortem
summ = get(f"/cascade/{sid}/summary")
print("summary: %d steps, depth %d, status %s" % (len(summ["path"]), summ["depth"], summ["status"]))
ok &= summ["depth"] >= 3

print("\nPHASE3 SMOKE:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
