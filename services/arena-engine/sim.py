import math
import time
from typing import Optional

class SimulationMetrics:
    p50_latency: float
    p99_latency: float
    error_rate: float
    throughput: int
    cost_monthly: float
    cpu_util: float

    def __init__(self, p50: float, p99: float, err: float, tput: int, cost: float, cpu: float):
        self.p50_latency = p50
        self.p99_latency = p99
        self.error_rate = err
        self.throughput = tput
        self.cost_monthly = cost
        self.cpu_util = cpu

    def dict(self) -> dict:
        return {
            "p50": round(self.p50_latency, 1),
            "p99": round(self.p99_latency, 1),
            "error_rate": round(self.error_rate, 4),
            "rps": self.throughput,
            "cost": round(self.cost_monthly, 0),
            "cpu": round(self.cpu_util, 1),
        }


def simulate_duel(p1_fix: str, p2_fix: str, archetype: str = "rate_limiter") -> dict[str, dict]:
    p1 = _simulate_player(p1_fix)
    p2 = _simulate_player(p2_fix)
    return {p1_fix[:8]: p1.dict(), p2_fix[:8]: p2.dict()}


def _simulate_player(fix_text: str) -> SimulationMetrics:
    fix = fix_text.lower() if fix_text else ""

    score = 0
    if "redis" in fix:
        score += 10
    if "sentinel" in fix or "replica" in fix or "cluster" in fix:
        score += 20
    if "lua" in fix or "incr" in fix or "atomic" in fix:
        score += 15
    if "ttl" in fix or "expire" in fix or "eviction" in fix:
        score += 10
    if "fallback" in fix or "circuit" in fix:
        score += 15
    if "cache" in fix:
        score += 8
    if "queue" in fix or "async" in fix or "batch" in fix:
        score += 12
    if "shard" in fix or "partition" in fix:
        score += 15
    if "pool" in fix or "connection" in fix:
        score += 8
    if "replicate" in fix or "failover" in fix:
        score += 12
    if "balancer" in fix or "proxy" in fix:
        score += 10
    if "bloom" in fix:
        score += 10
    if "backoff" in fix or "retry" in fix:
        score += 8
    if "timeout" in fix:
        score += 5

    cap_score = min(score, 100)

    base_latency = 40.0
    improvement = cap_score / 100.0
    p50 = max(5, base_latency * (1.0 - improvement * 0.8))
    p99 = p50 * (2.0 + (1.0 - improvement) * 3.0)

    target_rps = 1000
    capacity = target_rps * (0.3 + improvement * 0.7)
    throughput = int(capacity)

    error_rate = max(0.0, 0.15 * (1.0 - improvement * 0.95))
    cpu = max(10, 85 * (1.0 - improvement * 0.7))
    cost = 100 + (capacity / 100) * 20 + (p99 / 10) * 5

    return SimulationMetrics(
        p50=round(p50, 1),
        p99=round(p99, 1),
        err=round(error_rate, 4),
        tput=throughput,
        cost=round(cost, 0),
        cpu=round(cpu, 1),
    )
