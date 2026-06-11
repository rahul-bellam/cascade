# content/constraints/deploy-platform/origin.py
# The starting deployment: ONE container, on ONE VM, fronted by NOTHING.
# It serves a simple API. It works for a demo and falls over under real traffic.
# This track is about scaling the *deployment*, not the application logic.

from flask import Flask, jsonify

app = Flask(__name__)


@app.route("/healthz")
def healthz():
    # 🚩 A health endpoint exists, but nothing reads it: no readiness/liveness
    #    probe, so a dead instance keeps "receiving" traffic (there's no LB anyway).
    return jsonify(status="ok")


@app.route("/api/items")
def items():
    # 🚩 Concern: single instance. One process, one CPU-bound box.
    #    Throughput flatlines around ~2k req/s, then requests queue and time out.
    return jsonify(items=[{"id": i} for i in range(20)])


if __name__ == "__main__":
    # 🚩 Concern: run by hand as a single container — `docker run app`.
    #    No replicas (no self-healing if it crashes).
    #    No load balancer / ingress (no stable front door, no balancing).
    #    No autoscaling (can't grow with demand).
    #    No edge cache / rate limiting (origin absorbs every request; the
    #    eventual gateway becomes the single point of failure).
    app.run(host="0.0.0.0", port=8080)
