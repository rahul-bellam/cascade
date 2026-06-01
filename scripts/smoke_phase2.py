"""Phase 2 integration: toolkit earned in Learn shows up in Constraint + Cascade,
and the constraint track scales end-to-end. Run with learn(8093)+cascade(8090)+constraint(8094) up."""
import json, sys, urllib.request
def call(base, p, body=None):
    if body is None:
        req = urllib.request.Request(base+p)
    else:
        req = urllib.request.Request(base+p, data=json.dumps(body).encode(),
              headers={"Content-Type":"application/json"}, method="POST")
    with urllib.request.urlopen(req) as r: return json.load(r)

LEARN="http://localhost:8093"; CASC="http://localhost:8090"; CON="http://localhost:8094"
USER="phase2-user"
ok=True

# 1. Earn the token_bucket toolkit by completing the Learn lesson.
SOL=("class TokenBucket:\n"
 "    def __init__(self,capacity,refill_rate):\n"
 "        self.capacity=capacity;self.refill_rate=refill_rate;self.tokens=capacity;self.last=now()\n"
 "    def allow(self):\n"
 "        t=now();self.tokens=min(self.capacity,self.tokens+(t-self.last)*self.refill_rate);self.last=t\n"
 "        if self.tokens>=1:\n            self.tokens-=1;return True\n        return False\n")
sub = call(LEARN, "/lessons/token-bucket/submit", {"user_id":USER,"code":SOL})
print("Learn: token-bucket passed=%s saved=%s" % (sub["passed"], sub["saved_to_toolkit"]))
ok &= sub["passed"] and sub["saved_to_toolkit"]

# 2. Constraint Unlock: toolkit should be suggested at level 1.
cst = call(CON, "/constraint/start", {"archetype":"rate-limiter","user_id":USER})
sug = cst["current"].get("suggested_toolkit") or []
print("Constraint L1 suggested toolkit:", [(t["toolkit_key"], t.get("relevant")) for t in sug])
ok &= any(t["toolkit_key"]=="token_bucket" for t in sug)

# walk the constraint track to completion
sid=cst["session_id"]
for fix in ["redis expire persist counters","redis incr lua atomic","load balancer scale out horizontal consistent hash shard"]:
    r=call(CON, f"/constraint/{sid}/submit", {"code":fix})
    if r.get("all_levels_complete"):
        print("Constraint: all levels complete, score", r["score"]); break
ok &= r.get("all_levels_complete", False)

# 3. Cascade: toolkit should be suggested at the first node.
cas = call(CASC, "/cascade/start", {"archetype":"rate-limiter","user_id":USER})
ctk = cas["current"].get("suggested_toolkit") or []
print("Cascade node1 suggested toolkit:", [(t["toolkit_key"], t.get("relevant")) for t in ctk])
ok &= any(t["toolkit_key"]=="token_bucket" for t in ctk)

print("\nPHASE2 SMOKE:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
