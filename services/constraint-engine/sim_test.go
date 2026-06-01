package main

import "testing"

func loadRL(t *testing.T) *Archetype {
	a, err := loadArchetype("rate-limiter")
	if err != nil {
		t.Fatalf("load rate-limiter: %v", err)
	}
	if len(a.Constraints) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(a.Constraints))
	}
	return a
}

func TestLevel1RequiresPersistence(t *testing.T) {
	a := loadRL(t)
	l1 := a.Constraints[0]
	// Bad fix: ignore persistence -> should fail requirement gate.
	if r := evaluate(l1, "just add a bigger server"); r.Passed {
		t.Fatalf("level1 should fail without redis/persist; got %+v", r)
	}
	// Good fix: redis + persist.
	if r := evaluate(l1, "move counters to redis with expire to persist them"); !r.Passed {
		t.Fatalf("level1 should pass with redis+persist; got %+v", r)
	}
}

func TestLevel2RequiresAtomic(t *testing.T) {
	a := loadRL(t)
	l2 := a.Constraints[1]
	if r := evaluate(l2, "use redis"); r.Passed {
		t.Fatalf("level2 should fail without atomic op; got %+v", r)
	}
	if r := evaluate(l2, "use redis incr with a lua script for atomic check-and-increment"); !r.Passed {
		t.Fatalf("level2 should pass with atomic; got %+v", r)
	}
}

func TestLevel3RequiresHorizontalAndSimOverloadsSingleNode(t *testing.T) {
	a := loadRL(t)
	l3 := a.Constraints[2]
	// Without horizontal scaling, single node should overload at 10k rps.
	bad := evaluate(l3, "use redis with lua")
	if bad.Passed {
		t.Fatalf("level3 should fail single-node; got %+v", bad)
	}
	if bad.CPUPct < 95 && bad.ErrorRate < l3.ErrorSLAPct {
		t.Fatalf("expected overload signal (cpu/errors); got %+v", bad)
	}
	good := evaluate(l3, "add a load balancer and scale out horizontally with consistent hash sharding")
	if !good.Passed {
		t.Fatalf("level3 should pass horizontally scaled; got %+v", good)
	}
}

func TestCacheLowersLatency(t *testing.T) {
	a := loadRL(t)
	l1 := a.Constraints[0]
	withCache := simulate(l1, analyzeFix("redis cache persist"))
	noCache := simulate(l1, analyzeFix("persist to database"))
	if withCache.P50Latency >= noCache.P50Latency {
		t.Fatalf("cache should lower p50: cache=%.1f nocache=%.1f", withCache.P50Latency, noCache.P50Latency)
	}
}
