package main

import (
	"fmt"
	"math"
	"strings"
)

func analyzeFix(fix string) Capabilities {
	f := strings.ToLower(fix)
	has := func(subs ...string) bool {
		for _, s := range subs {
			if strings.Contains(f, s) {
				return true
			}
		}
		return false
	}
	return Capabilities{
		Cache:      has("redis", "cache", "memcached"),
		Persistent: has("redis", "persist", "external", "expire", "ttl", "database", "db"),
		Atomic:     has("lua", "incr", "atomic", "transaction", "watch", "compare-and"),
		Pooling:    has("pool", "pooling"),
		Replicas:   has("replica", "read replica", "sentinel"),
		Horizontal: has("lb", "load balancer", "load-balancer", "scale out", "scale-out", "horizontal", "multiple servers", "autoscal"),
		Sharded:    has("shard", "consistent hash", "consistent-hash", "partition"),
	}
}

func requirementCheck(level ConstraintLevel, fix string) (bool, string) {
	f := strings.ToLower(fix)
	containsAll := func(keys []string) (bool, string) {
		for _, k := range keys {
			if !strings.Contains(f, strings.ToLower(k)) {
				return false, k
			}
		}
		return true, ""
	}
	containsAny := func(keys []string) bool {
		for _, k := range keys {
			if strings.Contains(f, strings.ToLower(k)) {
				return true
			}
		}
		return false
	}
	if len(level.Requires) > 0 {
		if ok, missing := containsAll(level.Requires); !ok {
			return false, fmt.Sprintf("missing required change: %q (need %s)", missing, level.ChangeType)
		}
	}
	if len(level.RequiresAny) > 0 {
		if !containsAny(level.RequiresAny) {
			return false, fmt.Sprintf("fix doesn't address the constraint (need one of: %s)", strings.Join(level.RequiresAny, ", "))
		}
	}
	return true, ""
}

func simulate(level ConstraintLevel, caps Capabilities) SimulationResult {
	rps := float64(level.TargetRPS)
	const singleNodeCap = 2000.0
	effectiveCap := singleNodeCap
	if caps.Horizontal {
		effectiveCap *= 6
	}
	if caps.Sharded {
		effectiveCap *= 1.5
	}
	if caps.Replicas {
		effectiveCap *= 1.3
	}

	util := rps / effectiveCap
	cpu := math.Min(100, util*100)

	base := 40.0
	if caps.Cache {
		base = 8.0
	}
	if caps.Pooling {
		base -= 4
	}
	if base < 3 {
		base = 3
	}

	queueFactor := 1.0
	if util < 0.95 {
		queueFactor = 1.0 / (1.0 - util)
	} else {
		queueFactor = 20.0 + (util-0.95)*200.0
	}

	p50 := base * math.Min(queueFactor, 6)
	p99 := base * queueFactor * 2.5

	errRate := 0.0
	if util > 1.0 {
		errRate += (util - 1.0) * 60.0
	}
	if util > 0.85 {
		errRate += (util - 0.85) * 10.0
	}
	errRate = math.Min(errRate, 95.0)

	throughput := int(math.Min(rps, effectiveCap))

	return SimulationResult{
		P50Latency: round1(p50),
		P99Latency: round1(p99),
		ErrorRate:  round1(errRate),
		Throughput: throughput,
		CPUPct:     round1(cpu),
	}
}

func evaluate(level ConstraintLevel, fix string) SimulationResult {
	caps := analyzeFix(fix)
	res := simulate(level, caps)

	if ok, reason := requirementCheck(level, fix); !ok {
		res.Passed = false
		res.FailureReason = reason
		return res
	}

	switch {
	case res.P99Latency > float64(level.LatencySLA):
		res.Passed = false
		res.FailureReason = fmt.Sprintf("p99 %.0fms exceeded SLA of %dms", res.P99Latency, level.LatencySLA)
	case res.ErrorRate > level.ErrorSLAPct:
		res.Passed = false
		res.FailureReason = fmt.Sprintf("error rate %.1f%% exceeded SLA of %.1f%%", res.ErrorRate, level.ErrorSLAPct)
	case res.CPUPct >= 95.0:
		res.Passed = false
		res.FailureReason = fmt.Sprintf("CPU pinned at %.0f%% — server saturated", res.CPUPct)
	default:
		res.Passed = true
	}
	return res
}

func round1(x float64) float64 { return math.Round(x*10) / 10 }
