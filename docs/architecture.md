# Architecture Document

**Version:** 0.2  
**Last Updated:** June 2026
**New in v0.2:** Learn Mode, Constraint Unlock Engine, Blind Refactor Engine

---

## 1. High-Level Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Next.js App (React)                                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │   │
│  │  │ React    │  │ Monaco   │  │ Metrics  │  │ Dependency     │  │   │
│  │  │ Flow     │  │ Editor   │  │ Dashboard│  │ Graph Viz      │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ Lesson Player (Learn Mode — step-through interactive)   │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ WebSocket Client (Arena + Simulation Streaming)         │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Kong / Envoy)                         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────────┐
            ▼              ▼                  ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Auth Service    │ │  User        │ │  Content         │
│  (Go)            │ │  Service     │ │  Service         │
│                  │ │  (Go)        │ │  (Go)            │
│  OAuth, JWT      │ │  Profiles,   │ │  Lessons,        │
│                  │ │  Progress    │ │  Scenarios,      │
│                  │ │  Stats,      │ │  Hints,          │
│                  │ │  Toolkit     │ │  Solutions       │
└──────────────────┘ └──────────────┘ └──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CORE ENGINE SERVICES                              │
├──────────────┬──────────────┬──────────────┬────────────┬───────────────┤
│  LEARN       │  CONSTRAINT  │  BLIND       │  CASCADE   │  ARENA        │
│  ENGINE      │  UNLOCK      │  REFACTOR    │  ENGINE    │  ENGINE       │
│  (Python)    │  ENGINE (Go) │  ENGINE      │  (Python)  │  (Python)     │
│              │              │  (Python)    │            │  + League     │
│  Lesson      │  Monolith    │  Codebase    │  DAG       │  Matchmaking  │
│  Player      │  Generator   │  Analyzer    │  Walker    │  Duel State   │
│  Snippet     │  Constraint  │  Dependency  │  Fix       │  Scoring      │
│  Runner      │  Simulator   │  Mapper      │  Analyzer  │  Replay       │
│  Toolkit     │  Metrics     │  Refactor    │  Issue     │               │
│  Manager     │  Tracker     │  Validator   │  Generator │               │
└──────────────┴──────────────┴──────────────┴────────────┴───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ PostgreSQL   │  │ Redis        │  │ S3/MinIO     │  │ Kafka      │  │
│  │              │  │              │  │              │  │            │  │
│  │ Users        │  │ Sessions     │  │ Spaghetti    │  │ Simulation │  │
│  │ Progress     │  │ Arena State  │  │ Codebases    │  │ Events     │  │
│  │ Lessons      │  │ Leaderboard  │  │ Reference    │  │ Arena      │  │
│  │ Scenarios    │  │ Toolkit      │  │ Solutions    │  │ Actions    │  │
│  │ DAGs         │  │ Cache        │  │ Templates    │  │            │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. New Component Deep Dives

### 2.1 Learn Engine

**Purpose:** Delivers interactive concept + code snippet lessons.

**Tech:** Python (same ecosystem as Cascade Engine)

**Lesson Data Model:**

```json
{
  "id": "caching-redis",
  "title": "Caching with Redis",
  "prerequisites": [],
  "concept": {
    "content": [
      {"type": "text", "body": "Caching stores frequently accessed data in memory..."},
      {"type": "viz", "id": "cache-aside-animation"},
      {"type": "text", "body": "The two most common patterns are..."},
      {"type": "code_block", "language": "python", "code": "# Cache-aside pattern\ndef get_cached(key, fetch_fn, ttl):\n    data = redis.get(key)\n    if data:\n        return data\n    data = fetch_fn()\n    redis.setex(key, ttl, data)\n    return data"}
    ]
  },
  "snippet": {
    "prompt": "Implement a function `getCached(key, fetchFn, ttl)` that:\n1. Checks Redis for the key\n2. Returns cached value if found\n3. If not found, calls fetchFn(), stores result in Redis with TTL\n4. Returns the result",
    "starter_code": "def getCached(key, fetchFn, ttl):\n    # Your code here\n    pass",
    "test_cases": [
      {"name": "Returns cached value", "input": {...}, "expected": ...},
      {"name": "Calls fetchFn on miss", "input": {...}, "expected": ...},
      {"name": "Respects TTL", "input": {...}, "expected": ...}
    ],
    "hints": [
      "Use redis.get() to check for existing value",
      "Use redis.setex() to set with TTL in one call",
      "Remember to deserialize if storing JSON"
    ]
  },
  "toolkit_output": {
    "name": "cache_with_redis",
    "code": "function getCached(key, fetchFn, ttl) { ... }"
  }
}
```

**Snippet Runner:** Executes user code against test cases in a sandboxed container. Returns pass/fail + execution time + hint eligibility.

**Toolkit Manager:** Each successfully completed snippet is saved to the user's "Toolkit" — a personal library of reusable patterns accessible in Constraint Unlock and Cascade modes.

---

### 2.2 Constraint Unlock Engine

**Purpose:** Generates the next scaling challenge based on the user's current architecture state.

**Tech:** Go (performance-sensitive, many concurrent simulations)

**Core Mechanic:**

```python
class ConstraintUnlockEngine:
    def __init__(self, archetype: Archetype):
        self.archetype = archetype
        self.current_level = 0
        self.current_codebase = archetype.starting_monolith
        self.completed_levels = []
    
    def get_next_constraint(self) -> Constraint:
        """Generate the next scaling challenge."""
        level = self.current_level + 1
        constraint = self.archetype.constraints[level]
        
        return Constraint(
            level=level,
            title=constraint.title,           # "10x more users"
            description=constraint.description,
            impact_description=constraint.impact, # "Response time spikes to 5s"
            required_change=constraint.change_type, # "caching" / "replicas" / "lb"
            hint_levels=constraint.hints,
            simulation_params=SimulationParams(
                rps=constraint.target_rps,
                latency_sla_ms=constraint.latency_sla,
                duration_seconds=30,
                failure_conditions=constraint.failure_triggers
            )
        )
    
    def evaluate_fix(self, code: str, architecture: ArchDiagram) -> FixResult:
        """
        Run simulation against the user's updated system.
        Returns pass/fail + metrics.
        """
        sim = Simulation(
            code=code,
            architecture=architecture,
            params=self.get_next_constraint().simulation_params
        )
        result = sim.run()
        
        if result.passes_sla:
            self.current_level += 1
            self.completed_levels.append(result)
            return FixResult(passed=True, metrics=result.metrics)
        else:
            return FixResult(
                passed=False, 
                metrics=result.metrics,
                failure_reason=result.failure_reason  # "p99 exceeded SLA by 300ms"
            )
```

**Constraint Definitions (YAML):**

```yaml
url_shortener:
  starting_monolith: "Single Flask server, in-memory dict, 10 req/min"
  
  constraints:
    - level: 1
      title: "10x users — 100 req/min"
      impact: "Response time spikes. Users complain of slow redirects."
      change_type: caching
      target_rps: 100
      latency_sla_ms: 200
      failure_triggers: ["p99 > 1000ms"]
      
    - level: 2
      title: "100x users — 1,000 req/min"
      impact: "DB connection pool exhausted. Some requests fail entirely."
      change_type: connection_pooling + replicas
      target_rps: 1000
      latency_sla_ms: 500
      failure_triggers: ["error_rate > 5%"]
      
    - level: 3
      title: "1,000x users — 10,000 req/min"
      impact: "Single server at 100% CPU. Throughput flatlines."
      change_type: horizontal_scaling + lb
      target_rps: 10000
      latency_sla_ms: 500
      failure_triggers: ["cpu > 95% for 10s"]
      
    - level: 4
      title: "Cross-region — DB in another continent"
      impact: "Every query takes 200ms+. Pages load in 2+ seconds."
      change_type: cdn + regional_cache
      target_rps: 10000
      latency_sla_ms: 200
      failure_triggers: ["p50 > 500ms"]
```

---

### 2.3 Blind Refactor Engine

**Purpose:** Manages the reverse-engineering + refactoring workflow for legacy codebases.

**Tech:** Python (AST parsing, code analysis)

**Key Components:**

```yaml
blind_refactor_engine:
  codebase_loader:
    - Loads the spaghetti codebase into the browser
    - Builds file tree with metadata (lines, functions, dependencies)
    - Generates dependency graph (imports, function calls, data flow)
  
  dependency_mapper:
    - Static analysis of the codebase
    - Identifies: coupling points, circular dependencies, god objects
    - Renders interactive graph (D3 force-directed layout)
    - Color-coded: red = high coupling, green = well-encapsulated
  
  refactor_validator:
    - Before/after comparison of:
      - Number of files
      - Lines of code
      - Cyclomatic complexity per module
      - Coupling metrics (afferent/efferent)
      - Test coverage (if tests exist)
    - Performance simulation (before latency vs. after latency)
    - Architecture score (how well-separated are concerns?)
  
  requirement_injector:
    - Mid-refactor, injects a new feature requirement
    - Evaluates how easily the refactored architecture accommodates it
    - Measures: time to implement, lines added, components touched
```

**Codebase Storage:**

Each spaghetti codebase is stored in S3 as a tarball with metadata:

```
s3://cascade-refactors/
├── payment-monolith/
│   ├── source.tar.gz          # The terrible codebase
│   ├── metadata.yaml          # Languages, line counts, pain points
│   ├── dependency-graph.json  # Pre-computed dependency graph
│   ├── test-cases.json        # Tests to validate refactored version
│   └── reference-solution/    # How a senior engineer would refactor it
│       ├── arch-diagram.png
│       ├── code/
│       └── explanation.md
├── ecommerce-spaghetti/
│   └── ...
└── chat-app-legacy/
    └── ...
```

---

## 3. Updated Data Model (PostgreSQL)

```sql
-- New tables for v0.2

-- Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY,
    archetype_id UUID REFERENCES archetypes(id),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    order_index INT NOT NULL,
    concept_content JSONB NOT NULL,       -- Rich lesson content
    snippet_prompt TEXT NOT NULL,
    snippet_starter_code TEXT NOT NULL,
    snippet_test_cases JSONB NOT NULL,
    hint_levels JSONB NOT NULL,
    toolkit_key VARCHAR(100),             -- Output key for toolkit
    estimated_minutes INT DEFAULT 10
);

-- User progress on lessons
CREATE TABLE lesson_completions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    lesson_id UUID REFERENCES lessons(id),
    snippet_code TEXT NOT NULL,            -- What the user wrote
    tests_passed INT DEFAULT 0,
    tests_total INT NOT NULL,
    hints_used INT DEFAULT 0,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- User's toolkit (saved snippets)
CREATE TABLE user_toolkit (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    lesson_id UUID REFERENCES lessons(id),
    toolkit_key VARCHAR(100) NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,       -- User can switch between versions
    created_at TIMESTAMP DEFAULT NOW()
);

-- Constraint Unlock levels
CREATE TABLE constraint_levels (
    id UUID PRIMARY KEY,
    archetype_id UUID REFERENCES archetypes(id),
    level_number INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    impact_description TEXT NOT NULL,
    change_type VARCHAR(100) NOT NULL,
    target_rps INT NOT NULL,
    latency_sla_ms INT NOT NULL,
    simulation_duration_seconds INT DEFAULT 30,
    hint_levels JSONB NOT NULL,
    UNIQUE(archetype_id, level_number)
);

-- Constraint Unlock sessions
CREATE TABLE constraint_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    archetype_id UUID REFERENCES archetypes(id),
    current_level INT DEFAULT 0,
    max_level_unlocked INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Constraint attempts
CREATE TABLE constraint_attempts (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES constraint_sessions(id),
    level_number INT NOT NULL,
    attempt_number INT NOT NULL,
    code_snapshot TEXT,
    architecture_snapshot JSONB,
    passed BOOLEAN DEFAULT false,
    metrics JSONB,                         -- Latency, throughput, errors
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Blind Refactor scenarios
CREATE TABLE refactor_scenarios (
    id UUID PRIMARY KEY,
    archetype_id UUID REFERENCES archetypes(id),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    language VARCHAR(50) NOT NULL,
    line_count INT NOT NULL,
    pain_points TEXT[],                    -- Array of described issues
    new_requirement TEXT NOT NULL,         -- The surprise feature
    codebase_path VARCHAR(500) NOT NULL,   -- S3 path
    dependency_graph_path VARCHAR(500),    -- S3 path
    reference_solution_path VARCHAR(500),  -- S3 path
    difficulty VARCHAR(20) DEFAULT 'intermediate'
);

-- Refactor sessions
CREATE TABLE refactor_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    scenario_id UUID REFERENCES refactor_scenarios(id),
    phase VARCHAR(20) DEFAULT 'explore',   -- explore / diagnose / design / refactor / newreq / complete
    before_metrics JSONB,                  -- Starting state metrics
    after_metrics JSONB,                   -- Post-refactor metrics
    architecture_score INT,                -- How clean is the final design
    lines_changed INT,
    deps_removed INT,
    new_requirement_accommodated BOOLEAN,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

---

## 4. Updated API Design

### 4.1 New Endpoints

```
# Learn Mode
GET    /api/v1/lessons                              # List all lessons
GET    /api/v1/lessons/:slug                        # Get lesson content
POST   /api/v1/lessons/:slug/submit                 # Submit snippet for evaluation
GET    /api/v1/lessons/:slug/hints                  # Get available hints
POST   /api/v1/lessons/:slug/hints/reveal           # Reveal a hint
GET    /api/v1/toolkit                              # Get user's saved snippets
DELETE /api/v1/toolkit/:key                         # Remove toolkit item

# Constraint Unlock
GET    /api/v1/constraint/:archetypeSlug/start      # Start a new session
GET    /api/v1/constraint/sessions/:sessionId       # Get session state
POST   /api/v1/constraint/sessions/:sessionId/submit # Submit fix for current level
GET    /api/v1/constraint/sessions/:sessionId/metrics # Real-time metrics stream (WS)
GET    /api/v1/constraint/sessions/:sessionId/hints
POST   /api/v1/constraint/sessions/:sessionId/hints/reveal

# Blind Refactor
GET    /api/v1/refactor/scenarios                   # List available scenarios
GET    /api/v1/refactor/scenarios/:slug             # Get scenario details
POST   /api/v1/refactor/start                       # Start a refactor session
GET    /api/v1/refactor/sessions/:sessionId         # Get session state
GET    /api/v1/refactor/sessions/:sessionId/deps    # Get dependency graph
POST   /api/v1/refactor/sessions/:sessionId/phase   # Advance to next phase
POST   /api/v1/refactor/sessions/:sessionId/submit  # Submit refactored codebase
POST   /api/v1/refactor/sessions/:sessionId/newreq  # Reveal new requirement
POST   /api/v1/refactor/sessions/:sessionId/newreq/submit # Submit feature impl
GET    /api/v1/refactor/sessions/:sessionId/report  # Final before/after report
```

---

## 5. Updated Deployment

```yaml
key_changes_v0.2:
  simulation_workers:
    - Now shared across Constraint Unlock, Cascade, and Arena
    - Pre-warmed Docker images for common archetypes
    - gVisor sandboxing from day one
  
  content_delivery:
    - Lessons served from CDN (mostly static with dynamic snippet runner)
    - Codebases pre-loaded in S3, mounted read-only in sandbox
  
  toolkit:
    - User toolkit stored in Redis for fast access during Constraint sessions
    - Toolkit auto-imported into code editor when relevant lesson completed
```