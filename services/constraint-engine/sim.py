from __future__ import annotations
import math
from model import Capabilities, ConstraintLevel, SimulationResult


def analyze_fix(fix: str) -> Capabilities:
    f = fix.lower()
    return Capabilities(
        cache="redis" in f or "cache" in f or "memcached" in f,
        persistent="redis" in f or "persist" in f or "external" in f
                    or "expire" in f or "ttl" in f or "database" in f or "db" in f,
        atomic="lua" in f or "incr" in f or "atomic" in f
                or "transaction" in f or "watch" in f or "compare-and" in f,
        pooling="pool" in f,
        replicas="replica" in f or "read replica" in f or "sentinel" in f,
        horizontal=any(kw in f for kw in ("lb", "load balancer", "load-balancer",
                    "scale out", "scale-out", "horizontal", "multiple servers", "autoscal")),
        sharded="shard" in f or "consistent hash" in f or "consistent-hash" in f or "partition" in f,
    )


def requirement_check(level: ConstraintLevel, fix: str) -> tuple[bool, str]:
    f = fix.lower()
    if level.requires:
        for req in level.requires:
            if req.lower() not in f:
                return False, req
    if level.requires_any:
        found = any(r.lower() in f for r in level.requires_any)
        if not found:
            return False, level.requires_any[0]
    return True, ""


def simulate(level: ConstraintLevel, caps: Capabilities) -> SimulationResult:
    rps = float(level.target_rps)
    single_node_cap = 2000.0
    effective_cap = single_node_cap
    if caps.horizontal:
        effective_cap *= 6
    if caps.sharded:
        effective_cap *= 1.5
    if caps.replicas:
        effective_cap *= 1.3

    util = rps / effective_cap if effective_cap > 0 else 1.0
    cpu = min(100, util * 100)

    base = 40.0
    if caps.cache:
        base = 8.0
    if caps.pooling:
        base -= 4
    base = max(base, 3)

    if util < 0.95:
        queue_factor = 1.0 / (1.0 - util)
    else:
        queue_factor = 20.0 + (util - 0.95) * 200.0

    p50 = base * min(queue_factor, 6)
    p99 = base * queue_factor * 2.5

    err_rate = 0.0
    if util > 1.0:
        err_rate += (util - 1.0) * 60.0
    if util > 0.85:
        err_rate += (util - 0.85) * 10.0
    err_rate = min(err_rate, 95.0)

    throughput = int(min(rps, effective_cap))

    return SimulationResult(
        p50_latency=round(p50, 1),
        p99_latency=round(p99, 1),
        error_rate=round(err_rate, 1),
        throughput=throughput,
        cpu_pct=round(cpu, 1),
    )


def evaluate(level: ConstraintLevel, fix: str) -> SimulationResult:
    caps = analyze_fix(fix)
    res = simulate(level, caps)

    ok, reason = requirement_check(level, fix)
    if not ok:
        res.passed = False
        res.failure_reason = f'missing required change: "{reason}" (need {level.change_type})'
        return res

    if res.p99_latency > level.latency_sla_ms:
        res.passed = False
        res.failure_reason = f"p99 {res.p99_latency:.0f}ms exceeded SLA of {level.latency_sla_ms}ms"
    elif res.error_rate > level.error_sla_pct:
        res.passed = False
        res.failure_reason = f"error rate {res.error_rate:.1f}% exceeded SLA of {level.error_sla_pct}%"
    elif res.cpu_pct >= 95.0:
        res.passed = False
        res.failure_reason = f"CPU pinned at {res.cpu_pct:.0f}% -- server saturated"
    else:
        res.passed = True
    return res
