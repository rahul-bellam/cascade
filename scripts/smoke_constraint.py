"""Smoke test: scale the rate-limiter monolith through 3 constraint levels."""
import json, sys, urllib.request
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8094"
def get(p):
    with urllib.request.urlopen(BASE+p) as r: return json.load(r)
def post(p,b):
    req=urllib.request.Request(BASE+p,data=json.dumps(b).encode(),headers={"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req) as r: return json.load(r)

print("health:", get("/health")["status"])
print("archetypes:", [a["slug"] for a in get("/archetypes")["archetypes"]])
start = post("/constraint/start", {"archetype":"rate-limiter","user_id":"u1"})
sid = start["session_id"]
print(f"\nStart: {start['name']} ({start['max_level']} levels)")
print(f"  Origin: {start['origin']['impact']}")
cur = start["current"]
print(f"  L1 PROBLEM: {cur['title']} | target {cur['target_rps']} rps, p99 SLA {cur['latency_sla_ms']}ms")

# Wrong fix at level 1 -> should fail and NOT advance.
bad = post(f"/constraint/{sid}/submit", {"code":"# just buy a bigger box"})
print(f"\n  WRONG fix -> passed={bad['passed']} reason={bad['metrics'].get('failure_reason')}")
print(f"    metrics: p99={bad['metrics']['p99_latency']}ms err={bad['metrics']['error_rate']}% cpu={bad['metrics']['cpu_pct']}%")
ok = (bad["passed"] is False)

# Correct fixes per level.
fixes = [
    "move the token bucket counters to redis with expire to persist across restarts",
    "use redis incr with a lua script so check-and-increment is atomic",
    "add a load balancer and scale out horizontally with consistent hash sharding",
]
level = 1
for f in fixes:
    res = post(f"/constraint/{sid}/submit", {"code": f})
    m = res["metrics"]
    print(f"\n  L{level} FIX: {f[:55]}...")
    print(f"   -> passed={res['passed']}  p50={m['p50_latency']}ms p99={m['p99_latency']}ms err={m['error_rate']}% cpu={m['cpu_pct']}% tput={m['throughput']}")
    ok &= res["passed"]
    if res.get("all_levels_complete"):
        print(f"\n  🎉 ALL LEVELS COMPLETE  score={res['score']}")
        ok &= True
        break
    level += 1

final = get(f"/constraint/{sid}")
print(f"\n  Final: status={final['status']} score={final['score']} level={final['current_level']}/{final['max_level']}")
ok &= (final["status"] == "completed")
print("\nCONSTRAINT SMOKE:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
