# Product Requirements Document (PRD)

**Product Name:** Cascade  
**Status:** Pre-Seed / Concept  
**Version:** 0.2  
**Date:** June 2026

---

## 1. Executive Summary

Cascade is a **progressive system design learning platform** with five modes that take users from zero to production-ready architect.

**The Core Insight:** Existing platforms either teach concepts in isolation (ByteByteGo) or test algorithmic puzzles (LeetCode). Neither prepares engineers for the reality of building, breaking, fixing, and scaling real systems.

**Cascade's solution:** A scaffolded journey where:
1. You **learn a concept** and immediately **write code** for it
2. You **scale a tiny monolith** through escalating real-world constraints
3. You **reverse-engineer and refactor** a terrible but working codebase
4. You **survive chain-reaction failures** where every fix reveals a deeper issue
5. You **compete head-to-head** against other engineers under real load

---

## 2. Problem Statement

### The Gap

| Skill | How It's Learned Today | The Problem |
|:---|---|:---|
| System Design Concepts | ByteByteGo, DesignGurus, YouTube | ⚠️ **Passive** — watch, don't do |
| Code Practice | LeetCode, CodeSignal | ⚠️ **Algorithms** — not system design |
| Building Projects | The Odin Project, Boot.dev | ⚠️ **Greenfield only** — never inherit legacy |
| Scaling Knowledge | Blog posts, conference talks | ⚠️ **No practice** — theory only |
| Refactoring Skills | On-the-job, pain | ⚠️ **No safe space** to learn |
| Competitive System Design | **Nothing exists** | ❌ |

### Target Audience

| Persona | Pain Point | Why Cascade |
|:---|---|:---|
| **Junior Engineer** (0-2 yrs) | "I can build a CRUD app but don't know how to scale it." | Constraint Unlock teaches scaling incrementally |
| **Mid Engineer** (3-5 yrs) | "I inherited a terrible codebase and don't know where to start." | Blind Refactor is a safe sandbox for legacy skills |
| **Senior Engineer** (6-10 yrs) | "I need to prepare for Staff interviews but pure theory isn't enough." | Cascade + Arena provides deep practice |
| **Bootcamp Grad** | "I only learned greenfield. Real codebases terrify me." | Blind Refactor bridges the exact gap |
| **Engineering Team** | "We need to level up our team's architecture skills." | Private leagues + custom scenarios |

### Core User Needs

1. **"I want to learn system design by actually coding, not watching videos."**
2. **"I want to practice scaling a system step by step and see the impact of my decisions in real time."**
3. **"I want a safe space to practice refactoring terrible code before I have to do it at work."**
4. **"I want to experience chain-reaction failures so I understand why resilience patterns matter."**
5. **"I want to compete with peers and benchmark my architecture skills."**

---

## 3. Product Overview

### 3.1 The Five Modes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE CASCADE JOURNEY                                 │
├─────────────┬──────────────┬──────────────┬────────────┬──────────┬─────────┤
│  📖 LEARN   │  🔓 UNLOCK   │  🔨 REFACTOR │  🔗 CASCADE │  ⚔️ ARENA│ 🏆 LEAGUE│
├─────────────┼──────────────┼──────────────┼────────────┼──────────┼─────────┤
│ Concepts +  │ Tiny mono-   │ Spaghetti    │ Fix one    │ Your     │ Weekly  │
│ code        │ lith → each  │ codebase →   │ issue →    │ design   │ tourna- │
│ snippets.   │ level adds   │ reverse      │ chain      │ vs.      │ ments   │
│ Learn by    │ a constraint │ engineer →   │ reaction   │ theirs   │ with    │
│ doing.      │ (1000x users,│ refactor     │ of new     │ under    │ seasons,│
│             │ new region). │ code + arch  │ failures.  │ load.    │ divis-  │
│             │              │ to meet new  │ Survive    │          │ ions.   │
│             │              │ requirements.│ the fall.  │          │         │
└─────────────┴──────────────┴──────────────┴────────────┴──────────┴─────────┘
```

#### 📖 Mode 0: LEARN

**Goal:** Build foundational knowledge through concept + code pairs.

**Format for each lesson:**

```
┌──────────────────────────────────────────────────────────────────┐
│  LESSON: CACHING WITH REDIS                                      │
│                                                                  │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  THE CONCEPT (60%)   │  │  THE SNIPPET (40%)              │  │
│  │                      │  │                                  │  │
│  │  • What is caching?  │  │  // TODO: Implement a Redis     │  │
│  │  • Why TTL matters   │  │  // cache wrapper with TTL      │  │
│  │  • Cache-aside vs    │  │                                  │  │
│  │    write-through     │  │  function getCached(key, ttl) { │  │
│  │  • Cache invalidation│  │    // your code here            │  │
│  │    is hard           │  │  }                               │  │
│  │                      │  │                                  │  │
│  │  [Interactive viz]   │  │  [▶ Run]  [✔ Submit]  [💡 Hint] │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
│  OUTPUT: Your function runs against test cases. See if you pass. │
│  Your snippet gets saved to your TOOLKIT for use in later modes. │
└──────────────────────────────────────────────────────────────────┘
```

**Lesson Catalog (MVP):**
| # | Concept | Snippet | Est. Time |
|:---:|---|---:|
| 1 | Caching with Redis | `getCached(key, fetchFn, ttl)` | 10 min |
| 2 | Token Bucket Rate Limiter | `allowRequest(clientId)` | 15 min |
| 3 | Consistent Hashing | `getNode(key, ring)` | 15 min |
| 4 | Connection Pooling | `getConnection(pool)` | 10 min |
| 5 | Circuit Breaker | `callWithBreaker(fn, state)` | 15 min |
| 6 | Message Queue (basic) | `publish(topic, msg) + subscribe(topic)` | 15 min |
| 7 | Database Read Replicas | Route `SELECT` vs `INSERT` | 10 min |
| 8 | Health Checks | `healthCheck(service, interval)` | 10 min |
| 9 | Retry with Backoff | `retryWithBackoff(fn, maxRetries)` | 15 min |
| 10 | Bloom Filter | `BloomFilter(capacity, errorRate)` | 15 min |

---

#### 🔓 Mode 1: CONSTRAINT UNLOCK

**Goal:** Experience scaling challenges by living through them.

**Core Mechanic:**
```
Level 0: Working monolith (10 req/min, 1 server)
    ↓  "10x users!"
Level 1: Response time spikes. Add caching.
    ↓  "100x users!"
Level 2: DB connection pool exhausted. Add replicas + pooling.
    ↓  "1000x users!"
Level 3: Single server saturated. Add load balancer + scale horizontally.
    ↓  "DB is in another region now"
Level 4: Cross-region latency. Add CDN, regional caches.
    ↓  "Active-active multi-region"
Level 5: Data inconsistency. Add CRDTs, conflict resolution.
    ↓  "One region just went down"
Level 6: Complete outage. Add multi-region failover, circuit breakers.
```

**Key differentiator:** At each level, the platform **simulates the constraint in real time**. You see:
- A latency graph that spikes when your architecture can't handle the load
- Error rate climbing as connections drop
- Throughput cratering as the system buckles

Your fix either flattens the graph or doesn't. **You can see the consequences of bad decisions immediately.**

**Difficulty scaling:**
| Track | Levels | Starting Complexity | Time |
|:---:|:---:|:---:|:---:|
| 🟢 Beginner | 0→3 | Single service, one language | 20 min |
| 🟡 Intermediate | 0→5 | Multi-service, basic infra | 40 min |
| 🔴 Advanced | 0→6 | Distributed, multi-region | 60 min |

---

#### 🔨 Mode 2: THE BLIND REFACTOR

**Goal:** Build brownfield skills — reverse engineering, refactoring, and dealing with legacy code.

**Core Mechanic:**

```
PHASE 1: EXPLORE (10 min)
──────────────────────────────────────
  You're given a working but terrible codebase.
  Navigate the files. Read the code. Map the dependencies.
  
  Tools:
  - File tree navigator
  - Dependency graph visualizer (auto-generated)
  - "What does this function do?" helper (AI-powered)
  
  Task: Document the current architecture in 5 bullet points.

PHASE 2: DIAGNOSE (5 min)
──────────────────────────────────────
  What's wrong? Identify the top 3 pain points.
  
  The platform gives you metrics:
  - Hotspots: most-called functions
  - Bottlenecks: slowest operations
  - Coupling: most interconnected modules
  
  Task: List the top 3 issues and why they matter.

PHASE 3: DESIGN (10 min)
──────────────────────────────────────
  Draw the target architecture.
  
  Where will you introduce:
  - Service boundaries?
  - Async communication?
  - Caching layers?
  - Database separation?
  
  Task: Submit your target architecture diagram.

PHASE 4: REFACTOR (30 min)
──────────────────────────────────────
  Write the code. Extract services. Add queues. 
  Introduce caching. Break dependencies.
  
  The platform tracks:
  - Lines changed
  - Dependencies removed/added
  - Test coverage (if any tests exist)
  - Performance improvement (before/after latency)

PHASE 5: NEW REQUIREMENT (15 min)
──────────────────────────────────────
  SURPRISE! The PM drops a new feature:
  "We need to add [X] by end of sprint."
  
  Your refactored architecture must accommodate it.
  If you refactored well, this is easy. If you didn't...
  
  Task: Implement the new feature in your refactored codebase.
```

**Scenario Catalog (MVP):**

| Scenario | Language | Lines of Code | Pain Points | New Requirement |
|:---|---:|---:|:---|:---|
| 🏦 **Payment Monolith** | Python | ~2,000 | Auth+payments+ledger+notifications all synchronous. One DB. No queue. | Add fraud detection service |
| 📦 **E-commerce Spaghetti** | JavaScript | ~3,000 | Cart+inventory+shipping+reviews share global state. DB queries in templates. | Add real-time inventory tracking |
| 💬 **Chat App Legacy** | Go | ~2,500 | WebSocket+persistence+presence+uploads in one process. No separation. | Add message search |
| 📊 **Analytics Pipeline** | Python | ~1,800 | Batch processing runs inline with API requests. No separation of concerns. | Add real-time dashboard |
| 🔐 **Auth Service** | Node.js | ~1,500 | Sessions+OAuth+permissions+MFA all in one file. Synchronous everything. | Add SSO integration |

---

#### 🔗 Mode 3: CASCADE

*(Detailed in original PRD — chain-reaction survival mode powered by the DAG engine)*

#### ⚔️ Mode 4: ARENA + 🏆 LEAGUE

*(Detailed in docs/arena-pvp.md and docs/league-system.md)*

---

## 4. The Unified Engine

All modes are powered by a **shared engine** that understands system archetypes:

```
                    ┌─────────────────────┐
                    │   CORE ENGINE        │
                    │   (System Archetypes)│
                    ├─────────────────────┤
                    │                     │
                    │  Rate Limiter       │
                    │  URL Shortener      │
                    │  Notification Sys   │
                    │  Payment System     │
                    │  Chat System        │
                    │  E-commerce         │
                    │  ...                │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────────┐
            │                 │                     │
    ┌───────▼───────┐ ┌──────▼──────┐ ┌───────────▼───┐
    │  CONSTRAINT    │ │   BLIND     │ │   CASCADE     │
    │  UNLOCK ENGINE │ │   REFACTOR  │ │   ENGINE      │
    │                │ │   ENGINE    │ │               │
    │  Generates     │ │  Generates  │ │  Walks DAG    │
    │  next scaling  │ │  legacy     │ │  of failure   │
    │  challenge     │ │  codebase   │ │  modes        │
    └────────────────┘ └─────────────┘ └───────────────┘
```

Each archetype defines:
1. **The starting monolith** (for Constraint Unlock)
2. **The spaghetti codebase** (for Blind Refactor)
3. **The failure DAG** (for Cascade)
4. **The reference solution** (for post-mortems)

---

## 5. Functional Requirements

### 5.1 Learn Mode (New)

| ID | Requirement | Priority |
|:---|---|:---:|
| L1 | Each lesson pairs a concept with a code snippet exercise | P0 |
| L2 | In-browser code editor with test runner | P0 |
| L3 | Interactive visualizations accompany each concept | P0 |
| L4 | Successful snippets saved to user's "Toolkit" | P1 |
| L5 | Lessons build on each other (prerequisite tracking) | P1 |
| L6 | User can replay any lesson | P2 |

### 5.2 Constraint Unlock Mode (New)

| ID | Requirement | Priority |
|:---|---|:---:|
| CU1 | Starting monolith code is runnable in-browser | P0 |
| CU2 | Each level introduces a new constraint with clear description | P0 |
| CU3 | Platform simulates constraint in real time (latency, errors, throughput) | P0 |
| CU4 | Metrics dashboard shows before/after performance | P0 |
| CU5 | User must modify both code and architecture to advance | P0 |
| CU6 | Hints available (3 levels, costs reputation) | P1 |
| CU7 | Post-level analysis compares user's approach with reference | P1 |

### 5.3 Blind Refactor Mode (New)

| ID | Requirement | Priority |
|:---|---|:---:|
| BR1 | Spaghetti codebase is loaded in-browser with file tree | P0 |
| BR2 | Dependency graph visualizer auto-generated from code | P0 |
| BR3 | User can edit any file in the codebase | P0 |
| BR4 | Platform tracks metrics: lines changed, deps removed, perf improvement | P0 |
| BR5 | Reverse-engineering phase with guided prompts | P1 |
| BR6 | Surprise new requirement injected mid-refactor | P1 |
| BR7 | Before/after comparison report at end | P1 |
| BR8 | AI-powered "What does this function do?" helper | P2 |

### 5.4 Cascade Mode

*(As documented in original PRD — see docs/cascade-engine.md)*

### 5.5 Arena + League

*(As documented in original PRD — see docs/arena-pvp.md and docs/league-system.md)*

---

## 6. User Journey Map

```
NEW USER
│
├── 📖 LEARN MODE
│   ├── Lesson 1: Caching → Write Redis wrapper → Saved to Toolkit
│   ├── Lesson 2: Rate Limiting → Write token bucket → Saved to Toolkit
│   ├── Lesson 3: Load Balancing → Write health check → Saved to Toolkit
│   └── ... (continues building toolkit)
│
├── 🔓 CONSTRAINT UNLOCK
│   ├── Level 0: Run the monolith
│   ├── Level 1: 10x users → Add caching (uses Toolkit!)
│   ├── Level 2: 100x users → Add replicas
│   ├── Level 3: 1000x users → Add load balancer
│   └── ... (continues through constraints)
│
├── 🔨 BLIND REFACTOR
│   ├── Scenario 1: Payment Monolith
│   │   ├── Explore → Diagnose → Design → Refactor → New Requirement
│   │   └── Score: Architecture improvement + code quality + feature fit
│   ├── Scenario 2: E-commerce Spaghetti
│   └── Scenario 3: Chat App Legacy
│
├── 🔗 CASCADE
│   ├── Topic: Rate Limiter (uses Toolkit + Constraint + Refactor skills)
│   ├── Topic: URL Shortener
│   └── Topic: Notification System
│
├── ⚔️ ARENA
│   ├── Queue for matchmaking
│   ├── Duel other engineers
│   └── Study replays of losses
│
└── 🏆 LEAGUE
    ├── Join weekly contest
    ├── Climb divisions
    └── Compete in Season Finale
```

---

## 7. Success Metrics

| Metric | 3-Month Target | 12-Month Target |
|:---|---:|---:|
| Registered Users | 5,000 | 50,000 |
| Lessons Completed | 25,000 | 250,000 |
| Constraint Levels Passed | 10,000 | 100,000 |
| Blind Refactors Completed | 2,000 | 25,000 |
| Cascade Sessions | 5,000 | 75,000 |
| Arena Duels | 1,000 | 20,000 |
| League Participants | 200 | 2,000 |
| Avg. Session Duration | 25 min | 35 min |
| NPS | 40+ | 60+ |
| Net Revenue | $0 (building) | $50k MRR |

---

## 7.5 Comprehensive Engineering Concerns Coverage

---

## 8. Cognitive Moat & Personalization

### 8.1 The Signal Layer (capture now — data is unrecoverable retroactively)

Every fix the user submits is a permanent, compounding data point. From day one, every interaction across all modes logs:

```jsonc
{
  "user_id": "...",
  "mode": "cascade | constraint | learn | arena",
  "archetype": "rate_limiter",
  "node": "redis_spof",
  "concern_ids": [42, 43, 4, 115],
  "fix_text": "add redis sentinel",
  "capabilities_detected": ["high_availability"],
  "outcome": "advanced | survived | failed | sla_pass | sla_fail",
  "led_to": "memory_exhaustion",
  "hints_used": 0,
  "time_to_fix_ms": 41000,
  "reached_for_first": "caching",
  "missed": ["fallback", "idempotency"],
  "ts": "2026-06-01T..."
}
```

The two highest-value fields are `reached_for_first` (instinct/bias) and `missed` (blind spot).

### 8.2 Personal Failure Profile

Aggregate the signal layer into a per-user model keyed to the 233-concern map:

- **concern_mastery** per concern with state machine: `unseen → exposed → weak → improving → strong`, with decay (mastery fades if not exercised)
- **instinct_biases** — e.g. "cache_first 0.78" — revealed by what user reaches for before profiling
- **recurring_chains** — failure paths this user falls into repeatedly
- **growth trajectory** — 30-day blind-spots-closed, avg mastery delta

### 8.3 Adaptive Loop

The profile drives the product:

1. **Targeted chain selection** — DAG walker biased toward nodes touching the user's `blind_spot` and `weak` concerns
2. **Adaptive difficulty** — auto-tunes to flow edge (hard on weak areas, easy on strong)
3. **Personalized hints** — references user's own pattern: *"You added the breaker — but last 4 times you skipped the fallback."*
4. **Weekly mirror** — short report of closed blind spots, persistent weaknesses, bias regression
5. **Spaced repetition / boss fights** — weak concerns resurface on schedule until converted to `strong`

### 8.4 Cold-Start Onboarding UX

The "coach knows you" promise must be felt in session 1, not day 21. Onboarding includes:

1. Interactive "pick 3 failures that scare you most" — maps to concerns → initial bias sketch
2. First chain automatically biases toward one of their picks → immediate taste of personalization
3. Explicit feedback after each node: "was this too easy / too hard / just right?" tunes difficulty before play-data accumulates

### 8.5 Privacy Architecture

**Trust is part of the moat.** These rules are enforced from day one:

| Rule | Why |
|:---|---|
| User owns their profile — exportable, deletable at any time | Removes lock-in fear |
| No data feeds leaderboards without explicit opt-in | Arena ELO is separate and consensual |
| Assess never sees Practice profile without candidate consent | Prevents "I won't play honestly" chilling effect |
| Practice mode always clearly indicates when data is being used for calibration vs. personalization | Transparency builds trust |



Cascade covers **233+ engineering concerns** across 15 categories — from high-level architecture patterns down to the smallest operational details. Every concern is documented in `docs/engineering-concerns.md` and mapped to:

1. **Learn Lessons** — Each concern has a corresponding concept + snippet lesson
2. **Constraint Unlock Levels** — Concerns surface at specific scaling thresholds
3. **Blind Refactor Scenarios** — Concerns are baked into the spaghetti codebases
4. **Cascade DAG Nodes** — Each concern is a failure node with transitions to deeper issues
5. **Real Incidents** — Every concern links to a real-world production post-mortem

### How Small Concerns Chain

A typical Cascade chain might look like this at the micro level:

```
#41 No connection pooling
  → #43 Connection pool leak (error path doesn't release conns)
    → #42 Pool too small (exhausted from leaked conns)
      → #4 No timeout (requests queue forever)
        → #115 Circuit breaker trips
          → #122 No fallback (users see 500)
            → #151 No monitoring (no one knows)
              → #162 No on-call (nobody responds)
```

This isn't a hypothetical. This exact chain has happened at multiple companies. Cascade teaches it by making you **live through it**.

---

## 9. Reasoning-First Flow (Anti-AI-Cheat)

The product separates diagnosis from implementation — code stays locked until the user articulates *what* is failing, *why*, and *what the trade-off is*.

### 9.1 Two-Act Structure

```
Act 1 — diagnose (editor locked)
  → User writes: what's failing & why, what they'll change, what new failure their fix might cause
  → Scored on 3 axes: diagnosis, trade-off awareness, foresight
  → If score low → process hint (Socratic, never the answer)
  → If score OK → unlock editor

Act 2 — implement (editor open)
  → User writes the fix
  → Cascade engine reacts to what they actually did
  → Final score = reasoning + implementation + depth survived + independence
```

### 9.2 Scoring Robustness

The three-axis scorer (diagnosis / trade-off awareness / foresight) uses:
- **Embedding similarity** to expected reasoning concepts
- **LLM rubric grader** for paraphrase-tolerant evaluation
- **Deterministic keyword fallback** — works with no LLM in dev

### 9.3 Adversarial Robustness (Assess)

For hiring contexts where candidates may try to reverse-engineer the scorer:

1. **Hidden probe values** in the problem UI that must be referenced in the reasoning text
2. **Ensemble scoring** — multiple models evaluate independently; divergence triggers manual review
3. **Reasoning-vs-implementation gap** — low reasoning + high code = "pasted from AI" red flag
4. **Time-boxed** with "explain in your own words" disincentive

### 9.4 Process Hints (Socratic, Escalating)

| Level | Old (answer) | New (process) |
|:---:|---|---|
| 1 | "Add Redis Sentinel." | "What happens to every request the moment that single Redis node dies?" |
| 2 | "Use INCR for atomicity." | "Two requests read the counter at the same instant — what property does your update need?" |
| 3 | "Here's the Lua script." | "You've named the property (atomic). Where in your read-modify-write is the gap?" |

Hints cost reasoning score; usage is reported transparently for Assess contexts.

---

## 10. Competitive Landscape

| Platform | Strengths | Weaknesses | Cascade's Advantage |
|:---|---|:---|:---:|
| **ByteByteGo** | Beautiful diagrams, deep concepts | No practice, no code | We make you implement |
| **Boot.dev** | Code-first learning, Python/Go | Pure greenfield, no system design focus | Constraint Unlock + Refactor add real-world skills |
| **System Design Sandbox** | Structured practice, hints | Diagrams only, no code | We simulate real failures + code |
| **SysSimulator** | Drag-drop simulation | Manual chaos, no learning path | We guide the entire journey |
| **LeetCode** | Huge user base, competitions | Algorithms only, no system design | System design PvP is new |
| **Codecademy** | Interactive code lessons | Basic projects, no architecture | We teach distributed systems, not syntax |
| **The Odin Project** | Real projects, free | Greenfield only, no scaling practice | Constraint Unlock fills the scaling gap |

---

## 12. Content Pipeline + Community UGC

To keep the platform fresh, each system archetype needs **four artifacts**:

```yaml
rate_limiter:
  learn_lesson:
    - Concept: Token bucket algorithm
    - Snippet: Implement `allowRequest(clientId)`
  
  constraint_unlock:
    - Starting state: Single-node in-memory counter
    - Level 1: Server restart loses state → Add Redis
    - Level 2: Redis SPOF → Add Sentinel
    - Level 3: Atomicity under load → Add Lua scripting
    - Level 4: Memory exhaustion → Add TTL + eviction
  
  blind_refactor:
    - Codebase: 1500-line Flask app, rate limiting mixed with auth logic
    - Pain points: Global state, no separation of concerns, synchronous
    - New requirement: Add per-endpoint rate limits
  
  cascade_dag:
    - Nodes: 12
    - Edges: 18
    - Max depth: 7
```

### 12.1 Challenge-a-Friend (Viral Loop)

Any user can build or pick a scenario → send a shareable link → friend must survive their cascade. Head-to-head comparison: who survived deeper, cheaper, with fewer hints, better reasoning score.

- Every challenge is an invite with built-in intent ("bet you can't survive this outage")
- Same primitive powers Assess (company sends a candidate a screen)
- Drives Arena cold-start: challenges seed the competitive queue

### 12.2 Community-Submitted Scenarios (UGC Content Moat)

Users (especially seniors) author scenarios from real incidents they lived through. The pipeline is gated by quality, not speed:

**Phased Plan:**

| Phase | What | How |
|:---:|---|---|
| **v1** | Structured template (fill in blanks: trigger, condition, outcome, concern_ids) + manual review | Lowest tech risk; teaches the format |
| **v2** | AI-assisted drafting from clean incident data (postmortem JSON, structured outage reports) | NLP surface area is bounded |
| **v3** | Freeform prose → AI-drafted DAG | Full NLP research problem; only after v2 proves the pipeline |

**Validation gate** (every submission):

```
Submit → PENDING REVIEW (~1-2 hrs)
  → PASS → goes live (credited, author reputation)
  → FAIL → private + specific reason + "resubmit"
```

Automated checks (instant): parses, valid transitions, reachable + survivable terminal, solvable, no orphans, not a near-duplicate.
Human judgment (1-2 hr): causal fidelity, grounded in reality, honest level tag, Socratic hints, clear descriptions.

**Why the delay is a moat, not friction:** a smaller-but-credible canon beats a bigger-but-junky one. This is the "faithful failure simulation" differentiator.

---

## 13. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|:---|---|:---:|:---|
| Spaghetti codebases too complex for beginners | High | Medium | Start with simpler codebases (500 lines). Add AI "explain function" helper. |
| Constraint simulation too expensive | High | Medium | Pre-compute common paths. Use lightweight simulation for early levels. Full Docker sim only for advanced. |
| Users skip Learn mode, get stuck later | Medium | Medium | Prerequisite gating — certain Constraint levels require specific lessons. |
| Blind Refactor feels like homework | Medium | Low | Gamify it. Score based on improvement. Show "archaeologist" ranking. |
| Content creation bottleneck | High | High | Build authoring tools. Community-contributed scenarios. LLM-assisted codebase generation. |
| Cascade chains feel contrived | High | Medium | Base all chains on real production post-mortems. Cite sources. |
| **Trust leak between Practice & Assess** — users won't play honestly if they fear their profile hurts hireability | **Critical** | Medium | Clear data boundary: Practice profiles never shared with Assess without explicit, revocable opt-in. Separate consent flow. Publish trust architecture publicly. |
| **Reasoning scorer gamed in Assess** — adversarial candidate reverse-engineers the scoring model | High | Medium | Ensemble scoring (multiple models, divergence → manual review). Hidden probe values in problem UI. Reasoning-vs-implementation gap detection. Time-boxed sessions. |
| **UGC quality rot** — community submissions degrade canon with plausible-but-wrong failure models | High | Medium | Validation pipeline with automated integrity checks + human causal-fidelity review before publishing. Rejected scenarios remain private-playable (still usable in challenge-a-friend). |
| **Adaptive hints leak answers** — personalized hints reveal too much, undermining the reasoning-first flow | Medium | Low | Hints are Socratic (question, never answer), reference user's pattern not the solution. Escalating levels cost reasoning score. Usage transparent for Assess. |