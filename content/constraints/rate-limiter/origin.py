# content/constraints/rate-limiter/origin.py
# A working token-bucket rate limiter for ~10 req/s on a single server.
# It works. It's simple. It's wrong for production.

from flask import Flask, request, jsonify
import time

app = Flask(__name__)

# 🚩 Concern: in-memory state — lost on restart, not shared across processes.
buckets = {}
CAPACITY = 100
REFILL_RATE = 10  # tokens/sec

def allow(client_id):
    now = time.time()
    b = buckets.get(client_id, {"tokens": CAPACITY, "last": now})
    b["tokens"] = min(CAPACITY, b["tokens"] + (now - b["last"]) * REFILL_RATE)
    b["last"] = now
    # 🚩 Concern: non-atomic read-modify-write — racy under concurrency.
    if b["tokens"] >= 1:
        b["tokens"] -= 1
        buckets[client_id] = b
        return True
    buckets[client_id] = b
    return False

@app.route("/check")
def check():
    client_id = request.args.get("client", "anonymous")
    return jsonify({"allowed": allow(client_id)})

if __name__ == "__main__":
    app.run(port=5000)
