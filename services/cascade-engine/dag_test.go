package main

import (
	"math/rand"
	"testing"
)

func TestConditionEval(t *testing.T) {
	if !evaluateCondition("fix_contains('redis')", NewFixContext("add redis with ttl")) {
		t.Fatal("should match redis")
	}
	if !evaluateCondition("fix_contains('redis') AND NOT fix_contains('sentinel')", NewFixContext("add redis with ttl")) {
		t.Fatal("should match redis without sentinel")
	}
	if evaluateCondition("fix_contains('lua')", NewFixContext("add redis with ttl")) {
		t.Fatal("should NOT match lua")
	}
	if !evaluateCondition("fix_empty()", NewFixContext("")) {
		t.Fatal("empty fix should match fix_empty()")
	}
}

func TestConditionGrouping(t *testing.T) {
	cond := "(fix_contains('redis') OR fix_contains('lua')) AND fix_contains('ttl')"
	if !evaluateCondition(cond, NewFixContext("use redis with ttl")) {
		t.Fatal("redis+ttl should match OR+AND group")
	}
	if !evaluateCondition(cond, NewFixContext("use lua with ttl")) {
		t.Fatal("lua+ttl should match OR+AND group")
	}
	if evaluateCondition(cond, NewFixContext("use redis")) {
		t.Fatal("redis without ttl should NOT match")
	}
}

func TestLoadAndWalkToTerminal(t *testing.T) {
	dag, err := loadDag("rate-limiter")
	if err != nil {
		t.Fatalf("load DAG: %v", err)
	}
	node := dag.FirstNode()
	if node != "no_persistence" {
		t.Fatalf("expected first node 'no_persistence', got '%s'", node)
	}
	strong := "redis sentinel replica lua incr atomic ttl expire eviction crdt global merge load balancer shard async"
	rng := rand.New(rand.NewSource(7))
	steps := 0
	for !dag.IsTerminal(node) && steps < 30 {
		edge, err := dag.ResolveTransition(node, strong, rng)
		if err != nil {
			t.Fatalf("transition error: %v", err)
		}
		node = edge.To
		steps++
	}
	if !dag.IsTerminal(node) {
		t.Fatal("failed to reach terminal in 30 steps")
	}
}

func TestWeightedTransitionsHaveVariety(t *testing.T) {
	dag, err := loadDag("rate-limiter")
	if err != nil {
		t.Fatalf("load DAG: %v", err)
	}
	outcomes := map[string]int{}
	for seed := int64(0); seed < 40; seed++ {
		edge, err := dag.ResolveTransition("redis_spof", "sentinel replica fallback circuit", rand.New(rand.NewSource(seed)))
		if err != nil {
			t.Fatalf("transition error: %v", err)
		}
		outcomes[edge.To]++
	}
	if len(outcomes) < 2 {
		t.Fatalf("expected weighted variety, got %v", outcomes)
	}
}

func TestEmptyFixDropsToFail(t *testing.T) {
	dag, err := loadDag("rate-limiter")
	if err != nil {
		t.Fatalf("load DAG: %v", err)
	}
	edge, err := dag.ResolveTransition("no_persistence", "", nil)
	if err != nil {
		t.Fatalf("transition error: %v", err)
	}
	if edge.To != "terminal_fail" {
		t.Fatalf("expected terminal_fail, got '%s'", edge.To)
	}
}
