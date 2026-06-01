import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sim import evaluate, simulate, analyze_fix
from model import ConstraintLevel


def load_rl_levels():
    return [
        ConstraintLevel(
            level=1, title="10x", impact="restart wipes counters",
            target_rps=100, latency_sla_ms=200, error_sla_pct=1.0,
            change_type="caching", requires=["redis", "persist"],
        ),
        ConstraintLevel(
            level=2, title="100x", impact="concurrent races",
            target_rps=1000, latency_sla_ms=300, error_sla_pct=2.0,
            change_type="atomic", requires=["redis"], requires_any=["lua", "incr", "atomic"],
        ),
        ConstraintLevel(
            level=3, title="1000x", impact="single node saturated",
            target_rps=10000, latency_sla_ms=500, error_sla_pct=3.0,
            change_type="horizontal", requires_any=["lb", "load balancer", "scale out", "horizontal", "shard"],
        ),
    ]


def test_level1_requires_persistence():
    levels = load_rl_levels()
    bad = evaluate(levels[0], "just add a bigger server")
    assert not bad.passed, f"level1 should fail without persistence: {bad}"
    good = evaluate(levels[0], "move counters to redis with expire to persist them")
    assert good.passed, f"level1 should pass with redis+persist: {good}"


def test_level2_requires_atomic():
    levels = load_rl_levels()
    bad = evaluate(levels[1], "use redis")
    assert not bad.passed, f"level2 should fail without atomic: {bad}"
    good = evaluate(levels[1], "use redis incr with a lua script for atomic check-and-increment")
    assert good.passed, f"level2 should pass with atomic: {good}"


def test_level3_requires_horizontal():
    levels = load_rl_levels()
    bad = evaluate(levels[2], "use redis with lua")
    assert not bad.passed, f"level3 should fail single-node: {bad}"
    assert bad.cpu_pct >= 95 or bad.error_rate >= levels[2].error_sla_pct, \
        f"expected overload signal: {bad}"
    good = evaluate(levels[2], "add a load balancer and scale out horizontally with consistent hash sharding")
    assert good.passed, f"level3 should pass horizontally scaled: {good}"


def test_cache_lowers_latency():
    levels = load_rl_levels()
    with_cache = simulate(levels[0], analyze_fix("redis cache persist"))
    no_cache = simulate(levels[0], analyze_fix("persist to database"))
    assert with_cache.p50_latency < no_cache.p50_latency, \
        f"cache should lower p50: cache={with_cache.p50_latency} nocache={no_cache.p50_latency}"
