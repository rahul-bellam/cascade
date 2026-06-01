# The Cascade Engine — Core IP

**Version:** 0.2  
**Last Updated:** June 2026  
**New in v0.2:** Learn Mode → Toolkit → Constraint Unlock → Blind Refactor pipeline

---

## 1. What Is the Cascade Engine?

The Cascade Engine is the **brain of the platform**. In v0.2, it's been expanded from a single DAG-walker into a **family of engines** that power all five modes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CASCADE ENGINE FAMILY                         │
├────────────────┬────────────────┬────────────────┬─────────────────┤
│  LEARN ENGINE  │  CONSTRAINT    │  BLIND         │  CASCADE        │
│                │  UNLOCK ENGINE │  REFACTOR      │  ENGINE         │
│                │                │  ENGINE        │                 │
│  Teaches       │  Generates     │  Analyzes      │  Walks DAG     │
│  concepts      │  escalating    │  legacy        │  of failure    │
│  + validates   │  scaling       │  codebases     │  modes         │
│  snippets      │  challenges    │  + validates   │                 │
│                │                │  refactors     │                 │
└────────────────┴────────────────┴────────────────┴─────────────────┘
```

All engines share a common **threat model knowledge base** — the curated DAGs of failure modes for each system archetype.

---

## 2. How the Modes Connect

```
📖 LEARN MODE
   │
   │  You learn "Caching with Redis"
   │  You write: getCached(key, fetchFn, ttl)
   │  Your snippet saved to TOOLKIT
   ▼
🔓 CONSTRAINT UNLOCK
   │
   │  Level 1: "10x users!" 
   │  Editor auto-imports your toolkit snippet
   │  You apply caching pattern to the monolith
   │  Simulation confirms: latency dropped 80%
   │
   │  Level 4: "Cross-region DB!"
   │  You need: regional cache + CDN
   │  (If you didn't learn the CDN lesson yet → gated!)
   ▼
🔨 BLIND REFACTOR
   │
   │  You're given a monolith where caching was 
   │  bolted on wrong (inconsistent TTLs, cache 
   │  in wrong layer). Your Learn + Constraint 
   │  experience taught you the right patterns.
   │
   │  You refactor: extract cache layer, add 
   │  consistent invalidation, move cache to 
   │  the correct architectural boundary.
   ▼
🔗 CASCADE
   │
   │  Your fix introduces a new issue. The DAG 
   │  engine evaluates your change and spawns 
   │  the next failure. You have all the tools 
   │  from the previous three modes.
   ▼
⚔️ ARENA / 🏆 LEAGUE
   │
   │  You duel other engineers. Your toolkit, 
   │  constraint experience, refactor skills,
   │  and cascade intuition all come together.
```

---

## 2.5 The Comprehensive Concerns Map

The Cascade engine draws from a **master map of 233+ engineering concerns** across 15 categories — documented in `docs/engineering-concerns.md`. Every concern, from connection pool leaks to DNS TTL misconfigurations to unsafe database migrations, is a potential DAG node.

| Category | Concerns | Examples |
|:---|---:|:---|
| API Layer | 20 | Wrong status codes, missing idempotency, retry storms, no pagination |
| Caching | 20 | Cache stampede, stale cache, wrong eviction policy, CDN purge failure |
| Databases | 30 | N+1 queries, deadlocks, connection leaks, unsafe migrations, wrong isolation level |
| Sharding | 10 | Hot shards, wrong shard key, resharding without plan |
| Networking & Distance | 20 | DNS TTL too high during failover, TLS cert expiry, cross-region latency |
| Rate Limiting | 14 | Missing headers, distributed inconsistency, window boundary bursts |
| Circuit Breaker & Resilience | 14 | Wrong thresholds, no fallback, no bulkhead, no graceful shutdown |
| CI/CD & Deployments | 22 | No rollback plan, migration in same deploy, config drift, secrets in code |
| Observability | 20 | No monitoring, alert fatigue, no SLOs, logs too verbose |
| Message Queues | 15 | No ordering, no DLQ, no backpressure, schema mismatch |
| Security | 15 | SQL injection, JWT without expiry, no internal auth |
| DNS & Load Balancing | 8 | DNS failover, LB as SPOF, wrong routing algorithm |
| File Storage | 8 | No size limit, no checksum, no upload resume |
| Background Jobs | 9 | Job overlaps, no idempotency, cron as SPOF |
| Configuration & Feature Flags | 8 | Config drift, flags never cleaned up, no gradual rollout |

**How concerns chain together in the real world:**
```
#41 No connection pooling → #43 Pool leak → #42 Pool exhausted 
→ #4 No timeout → #115 Circuit breaker trips → #122 No fallback 
→ #151 No monitoring → #162 No on-call → 4-hour outage
```

Every concern in the master map links to a real production incident. Nothing is too small to include.

---

## 3. The Shared Threat Model (DAG)

Each system archetype defines a DAG that powers **Constraint Unlock**, **Blind Refactor**, and **Cascade** modes.

### Example: Rate Limiter Full DAG

```yaml
archetype: rate_limiter
name: "Rate Limiter"
slug: rate-limiter

# Used by Learn Mode
lessons:
  - caching-redis
  - token-bucket
  - distributed-counters

# Used by Constraint Unlock
starting_monolith: "Single Flask server, in-memory counting"
constraints:
  - level: 1  # Persistence
    title: "Server restart loses all counters"
    target_rps: 100
  - level: 2  # Scalability
    title: "20 concurrent clients = race conditions"
    target_rps: 500
  - level: 3  # Distribution
    title: "Multi-region = inconsistent limits"
    target_rps: 5000

# Used by Cascade and Blind Refactor (the DAG)
nodes:
  - id: "origin"
    type: "starting_state"
    description: "In-memory counter on single node"
    code_template: "rate_limiter/origin.py"
    
    transitions:
      - to: "no_persistence"
        weight: 1.0

  - id: "no_persistence"
    type: "issue"
    severity: "high"
    category: "data_loss"
    description: "Server restart = all counters lost. Users get unlimited access until the first request after restart."
    
    solution_signature:
      required: ["external_cache"]
      preferred: "redis_with_ttl"
    
    hints:
      - level: 1
        cost: 10
        text: "What happens to your counters when the server restarts?"
      - level: 2
        cost: 25
        text: "Consider persisting state to an external store like Redis."
      - level: 3
        cost: 50
        text: "Move your sliding window counter to Redis with EXPIRE. Use INCR + EXPIRE for atomicity."
    
    transitions:
      - to: "redis_spof"
        condition: "fix_contains('redis') AND NOT fix_contains('sentinel') AND NOT fix_contains('cluster')"
        weight: 0.6
      - to: "race_condition"
        condition: "fix_contains('redis') AND fix_contains('multi') AND NOT fix_contains('lua')"
        weight: 0.3
      - to: "single_node_bottleneck"
        condition: "fix_contains('faster_server') OR fix_contains('vertical_scale')"
        weight: 0.8
      - to: "no_fix"
        condition: "fix_contains('nothing') OR fix_empty()"
        weight: 0.1

  - id: "redis_spof"
    type: "issue"
    severity: "critical"
    category: "availability"
    description: "Redis node goes down. All rate limiting stops. API overwhelmed. 5xx errors everywhere."
    
    solution_signature:
      required: ["high_availability"]
      preferred: "redis_sentinel"
    
    hints:
      - level: 1
        text: "What happens if the Redis server crashes?"
      - level: 2
        text: "Consider a high-availability setup for Redis."
      - level: 3
        text: "Implement Redis Sentinel with automatic failover and a circuit breaker fallback."
    
    transitions:
      - to: "memory_exhaustion"
        condition: "fix_contains('sentinel') OR fix_contains('replica')"
        weight: 0.5
      - to: "network_overhead"
        condition: "fix_contains('cluster') OR fix_contains('multi_node')"
        weight: 0.3
      - to: "split_brain"
        condition: "fix_contains('sentinel') AND fix_contains('multi_region')"
        weight: 0.2

  - id: "race_condition"
    type: "issue"
    severity: "high"
    category: "consistency"
    description: "Under high concurrency, two requests read the same counter value and both pass. 1000s of requests bypass the limit."
    
    solution_signature:
      required: ["atomic_operation"]
      preferred: "lua_script"
    
    transitions:
      - to: "memory_exhaustion"
        condition: "fix_contains('lua') OR fix_contains('atomic')"
        weight: 0.7
      - to: "distributed_inconsistency"
        condition: "fix_contains('lock') OR fix_contains('mutex')"
        weight: 0.3

  - id: "memory_exhaustion"
    type: "issue"
    severity: "medium"
    category: "resource_exhaustion"
    description: "Unbounded counter keys fill Redis memory. Evictions cause false positives. Legitimate users blocked."
    
    solution_signature:
      required: ["memory_management"]
      preferred: "maxmemory_policy_ttl"
    
    transitions:
      - to: "distributed_inconsistency"
        condition: "fix_contains('ttl') OR fix_contains('eviction')"
        weight: 0.6
      - to: "cost_explosion"
        condition: "fix_contains('bigger_instance') OR fix_contains('scale_up')"
        weight: 0.4

  - id: "distributed_inconsistency"
    type: "issue"
    severity: "high"
    category: "consistency"
    description: "Multi-region deployment. Each region has its own counter. Users routed to different regions see different limits. 10x limit bypass possible."
    
    solution_signature:
      required: ["global_coordination"]
      preferred: "crdt_counters"
    
    transitions:
      - to: "terminal_stable"
        condition: "fix_contains('crdt') OR fix_contains('global')"
        weight: 0.7
      - to: "performance_degradation"
        condition: "fix_contains('centralized')"
        weight: 0.3

  - id: "terminal_stable"
    type: "terminal"
    description: "System is production-grade. Cascade survived!"
```

---

## 4. The Fix Analyzer (Updated)

The Fix Analyzer now works across **all three practical modes** (Constraint Unlock, Blind Refactor, Cascade):

```python
class FixAnalyzerV2:
    """
    Unified fix analyzer for all modes.
    """
    
    def analyze(self, context: AnalysisContext) -> FixSignature:
        """
        Analyze changes based on the current mode.
        """
        if context.mode == 'constraint_unlock':
            return self._analyze_constraint_fix(context)
        elif context.mode == 'blind_refactor':
            return self._analyze_refactor(context)
        elif context.mode == 'cascade':
            return self._analyze_cascade_fix(context)
    
    def _analyze_constraint_fix(self, context):
        """
        For Constraint Unlock: did they add the right component?
        Check code changes + architecture diagram changes.
        """
        code_sig = self._analyze_code_diff(
            context.original_code, 
            context.new_code
        )
        arch_sig = self._analyze_architecture_diff(
            context.original_arch,
            context.new_arch
        )
        
        # Merge signatures
        return FixSignature(
            signatures=code_sig.signatures + arch_sig.signatures,
            added_components=arch_sig.added_components,
            changed_algorithms=code_sig.changed_algorithms
        )
    
    def _analyze_refactor(self, context):
        """
        For Blind Refactor: measure structural improvement.
        """
        before_metrics = self._compute_structural_metrics(context.original_codebase)
        after_metrics = self._compute_structural_metrics(context.new_codebase)
        
        return RefactorScore(
            coupling_reduction=before_metrics.coupling - after_metrics.coupling,
            complexity_reduction=before_metrics.cyclomatic - after_metrics.cyclomatic,
            service_extraction=after_metrics.module_count - before_metrics.module_count,
            dependency_removal=before_metrics.dependencies - after_metrics.dependencies,
            architecture_score=self._score_architecture(context.new_codebase)
        )
```

---

## 5. Hint System (Updated)

The hint system now spans **all modes**, with mode-specific hint types:

| Mode | Level 1 (10pts) | Level 2 (25pts) | Level 3 (50pts) |
|:---|---:|:---:|:---:|
| **Learn** | *"What data structure is best for this?"* | *"Here's the algorithm name. Look it up."* | *"Here's the pattern — implement it."* |
| **Constraint Unlock** | *"What metric is failing?"* | *"What component addresses this metric?"* | *"You need X. Here's how to integrate it."* |
| **Blind Refactor** | *"Where is the tightest coupling?"* | *"These 3 functions are the god object. Extract them."* | *"Here's the target interface for the extracted service."* |
| **Cascade** | *"What just broke?"* | *"What pattern prevents this failure?"* | *"Implement X pattern. Check the toolkit for your snippet."* |

---

## 6. Toolkit Integration

The **Toolkit** is the connective tissue between modes:

```yaml
user_toolkit:
  - key: "cache_with_redis"
    source_lesson: "Caching with Redis"
    code: "function getCached(key, fetchFn, ttl) { ... }"
    used_in:
      - constraint_unlock_level_1
      - constraint_unlock_level_4
      - blind_refactor_payment_monolith
      - cascade_rate_limiter_link_1
  
  - key: "token_bucket"
    source_lesson: "Token Bucket Rate Limiter"
    code: "class TokenBucket { ... }"
    used_in:
      - constraint_unlock_level_2
      - cascade_rate_limiter_link_3
      - arena_duel_42
```

**Auto-import behavior:** When a user enters a Constraint Unlock or Cascade session, their relevant Toolkit snippets are **pre-populated in the editor sidebar**. They can drag-and-drop them into their code, or write them from scratch. The platform tracks which path they chose and factors it into scoring (using toolkit = efficient, writing from scratch = better learning).

---

## 7. Scoring System (Cross-Mode)

| Mode | Score Factors | Max Score |
|:---|---:|---:|
| **Learn** | Tests passed (70%), No hints used (20%), Code elegance (10%) | 100/lesson |
| **Constraint Unlock** | Levels passed (50%), Performance score (20%), No hints (15%), Cost efficiency (15%) | 500/session |
| **Blind Refactor** | Arch improvement (30%), Coupling reduction (25%), Perf improvement (20%), New req fit (15%), Code quality (10%) | 1000/session |
| **Cascade** | Chain depth (40%), No hints (20%), Performance (20%), Cost (10%), Elegance (10%) | 2000/session |
| **Arena** | See arena-pvp.md | ELO-based |
| **League** | See league-system.md | Season points |