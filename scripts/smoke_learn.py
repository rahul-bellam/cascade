"""Smoke test for the Learn Engine over HTTP. Usage: python scripts/smoke_learn.py [base_url]"""
import json, sys, urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8093"

def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return json.load(r)

def post(path, body):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.load(r)

SOL = (
    "class TokenBucket:\n"
    "    def __init__(self, capacity, refill_rate):\n"
    "        self.capacity=capacity; self.refill_rate=refill_rate\n"
    "        self.tokens=capacity; self.last=now()\n"
    "    def allow(self):\n"
    "        t=now(); self.tokens=min(self.capacity, self.tokens+(t-self.last)*self.refill_rate); self.last=t\n"
    "        if self.tokens>=1:\n"
    "            self.tokens-=1; return True\n"
    "        return False\n"
)
STARTER = "class TokenBucket:\n    def __init__(self,c,r):\n        pass\n    def allow(self):\n        return True\n"

ok = True
h = get("/health"); print("health:", h["status"], "| backend:", h["backend"])
ls = get("/lessons")["lessons"]; print("lessons:", [l["slug"] for l in ls])
lesson = get("/lessons/token-bucket")
print("lesson title:", lesson["title"], "| prereqs:", lesson["prerequisite_slugs"], "| tests:", lesson["test_count"])
assert "expected" not in json.dumps(lesson["test_preview"]), "answers leaked!"

wrong = post("/lessons/token-bucket/submit", {"user_id":"u1","code":STARTER})
print("WRONG submit -> passed:", wrong["passed"], "score:", wrong["score"], "saved:", wrong["saved_to_toolkit"], f"({wrong['tests_passed']}/{wrong['tests_total']})")
ok &= (wrong["passed"] is False and wrong["saved_to_toolkit"] is False)

right = post("/lessons/token-bucket/submit", {"user_id":"u1","code":SOL})
print("RIGHT submit -> passed:", right["passed"], "score:", right["score"], "saved:", right["saved_to_toolkit"], "key:", right["toolkit_key"])
ok &= (right["passed"] is True and right["saved_to_toolkit"] is True)

tk = get("/users/u1/toolkit")["toolkit"]
print("toolkit:", [t["toolkit_key"] for t in tk])
ok &= any(t["toolkit_key"] == "token_bucket" for t in tk)

hint = get("/lessons/token-bucket/hint?level=2")
print("hints revealed at level 2:", len(hint["hints"]), "of max", hint["max_level"])
ok &= (len(hint["hints"]) == 2)

print("\nLEARN SMOKE:", "PASS ✅" if ok else "FAIL ❌")
sys.exit(0 if ok else 1)
