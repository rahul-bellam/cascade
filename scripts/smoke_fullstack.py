"""End-to-end: frontend Next proxy -> python services. Run with all 3 up."""
import json, sys, urllib.request

FE = "http://localhost:3000"
def get(p):
    with urllib.request.urlopen(FE+p) as r: return r.status, json.load(r)
def post(p,b):
    req=urllib.request.Request(FE+p,data=json.dumps(b).encode(),headers={"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req) as r: return r.status, json.load(r)

ok=True
s,d = get("/api/learn/lessons"); print("proxy /api/learn/lessons ->", s, [l['slug'] for l in d['lessons']]); ok &= s==200
SOL=("class TokenBucket:\n"
 "    def __init__(self,capacity,refill_rate):\n"
 "        self.capacity=capacity;self.refill_rate=refill_rate;self.tokens=capacity;self.last=now()\n"
 "    def allow(self):\n"
 "        t=now();self.tokens=min(self.capacity,self.tokens+(t-self.last)*self.refill_rate);self.last=t\n"
 "        if self.tokens>=1:\n            self.tokens-=1;return True\n        return False\n")
s,d = post("/api/learn/lessons/token-bucket/submit",{"user_id":"web","code":SOL})
print("proxy submit ->",s,"passed",d['passed'],"score",d['score'],"saved",d['saved_to_toolkit']); ok &= (s==200 and d['passed'])
s,d = post("/api/cascade/cascade/start",{"archetype":"rate-limiter","user_id":"web"})
sid=d['session_id']; print("proxy cascade start ->",s,"first:",d['current']['node_id']); ok &= s==200
s,d = post(f"/api/cascade/cascade/{sid}/fix",{"fix":"move counters to redis with ttl"})
print("proxy cascade fix ->",s,d['from_node'],"=>",d['next']['node_id']); ok &= s==200
print("\nFULLSTACK SMOKE:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
