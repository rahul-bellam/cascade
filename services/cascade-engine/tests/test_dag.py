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
    dag = dagmod.load_dag("rate-limiter")
    node = dag.first_node()
    assert node == "no_persistence"
    fixes = ["redis ttl", "redis sentinel replica", "ttl eviction", "crdt global merge"]
    steps = 0
    for f in fixes:
        if dag.is_terminal(node):
            break
        edge = dag.resolve_transition(node, f)
        node = edge["to"]; steps += 1
        if steps > 20:
            break
    assert dag.is_terminal(node)
    assert dag.node(node).get("outcome") == "survived"

def test_empty_fix_drops_to_fail():
    dag = dagmod.load_dag("rate-limiter")
    edge = dag.resolve_transition("no_persistence", "")
    assert edge["to"] == "terminal_fail"
