import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import dag as dagmod

def test_condition_eval():
    ctx = dagmod.FixContext("add redis with ttl")
    assert dagmod.evaluate_condition("fix_contains('redis')", ctx) is True
    assert dagmod.evaluate_condition("fix_contains('redis') AND NOT fix_contains('sentinel')", ctx) is True
    assert dagmod.evaluate_condition("fix_contains('lua')", ctx) is False
    assert dagmod.evaluate_condition("fix_empty()", dagmod.FixContext("")) is True

def test_condition_rejects_arbitrary_code():
    import pytest
    with pytest.raises(ValueError):
        dagmod.evaluate_condition("__import__('os').system('echo hi')", dagmod.FixContext("x"))

def test_load_and_walk_to_terminal():
    import random
    dag = dagmod.load_dag("rate-limiter")
    node = dag.first_node()
    assert node == "no_persistence"
    # A robust strategy fix that satisfies the "survive" edges at each issue.
    strong = "redis sentinel replica lua incr atomic ttl expire eviction crdt global merge load balancer shard async"
    rng = random.Random(7)
    steps = 0
    while not dag.is_terminal(node) and steps < 30:
        node = dag.resolve_transition(node, strong, rng=rng)["to"]
        steps += 1
    assert dag.is_terminal(node)


def test_weighted_transitions_have_variety():
    """The same fix should be able to lead to different downstream failures."""
    import random
    dag = dagmod.load_dag("rate-limiter")
    outcomes = set()
    for seed in range(40):
        edge = dag.resolve_transition("redis_spof", "sentinel replica fallback circuit", rng=random.Random(seed))
        outcomes.add(edge["to"])
    assert len(outcomes) >= 2, f"expected weighted variety, got {outcomes}"

def test_empty_fix_drops_to_fail():
    dag = dagmod.load_dag("rate-limiter")
    edge = dag.resolve_transition("no_persistence", "")
    assert edge["to"] == "terminal_fail"
