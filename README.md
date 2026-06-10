# Cascade

> *Production instinct, simulated safely.*

**Cascade** is a progressive system-design platform that builds the instinct to keep real systems
alive under pressure — not interview-prep trivia. You learn a concept, scale it until it breaks,
predict and survive cascading failures, refactor the mess, and duel other engineers. Every mode
rewards *judgment* — diagnosis, trade-offs, and foresight — over output, which is what makes it hold
up in a world of AI-generated answers.

See [`docs/positioning.md`](docs/positioning.md) for the "why," and [`docs/README.md`](docs/README.md)
for the full doc index.

## The Six Modes

| Mode | Route | What you do |
|:---|:---|:---|
| 📖 **Learn** | `/learn` | Concepts paired with runnable code. Implement the snippet, pass the sandbox tests, save it to your Toolkit. |
| 🔓 **Constraint** | `/constraint` | Take a working monolith and survive escalating load (10× / 100× / 1000×). Apply a fix, watch live latency / error / CPU metrics flatten — or spike. |
| 🧠 **Predict** | `/predict` | Reason *first*: predict what fails next before you see it happen. Trains foresight. |
| 🔗 **Cascade** | `/cascade` | Fix one failure → your fix spawns the next → survive the chain. Each consequential node is gated on your reasoning before the fix unlocks. |
| 🔨 **Refactor** | `/refactor` | Reverse-engineer a spaghetti codebase blind, map its dependencies, and find the god-functions. |
| ⚔️ **Arena + 🏆 League** | `/arena`, `/league` | Real-time duels over WebSockets, weekly seasons, champion post-mortems. |

### The reasoning-first gate

Consequential Cascade nodes won't let you apply a fix until you've articulated **diagnosis**,
**trade-offs**, and **foresight**. The insight engine scores each dimension and either unlocks the
fix or returns a Socratic hint. This is what keeps Cascade meaningful when an AI can write the fix
for you — see [`docs/reasoning-first.md`](docs/reasoning-first.md).

## Content

Cascade is **data-driven** — drop YAML/dirs into `content/` and the engines auto-discover them.

| | Built |
|---|---|
| **Archetypes** (full across modes) | `rate-limiter`, `url-shortener`, `notification-system` |
| **Learn lessons** (8) | caching-redis, token-bucket, distributed-counters, consistent-hashing, bloom-filter, message-queues, retry-backoff, circuit-breaker |
| **Constraint tracks** (3) | one per archetype, each winnable with the correct fix |
| **Cascade DAGs** (3) | one per archetype |
| **Blind-refactor codebases** (3) | payment-monolith, url-shortener-spaghetti, notification-monolith |

Each archetype has a complete vertical: Learn lessons → Constraint track → Cascade DAG → Blind
Refactor codebase.

## Getting Started

```bash
# 1. Infrastructure (PostgreSQL, Redis) — optional for local dev; the Python
#    engines fall back to SQLite when DATABASE_URL is unset.
docker-compose up -d

# 2. Backend engines (each in its own terminal). Go engines need Go 1.22+.
#    Python engines: python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

# Go:
cd services/cascade-engine    && go run .                               # :8090
cd services/constraint-engine && CONTENT_DIR=$PWD/../../content go run . # :8094

# Python (FastAPI):
cd services/learn-engine    && PORT=8093 python app.py                  # :8093
cd services/insight-engine  && PORT=8097 python main.py                 # :8097  (reasoning scorer)
cd services/refactor-engine && PORT=8095 python app.py                  # :8095
cd services/arena-engine    && PORT=8096 python app.py                  # :8096  (WebSockets + league)
cd services/auth            && uvicorn main:app --port 8081             # :8081
cd services/user            && uvicorn main:app --port 8082             # :8082

# 3. Frontend
cd frontend && npm install && npm run dev                               # :3000
```

Open `http://localhost:3000`. Light + warm dark mode with a theme toggle in the nav.

### A first journey (rate-limiter)

| Step | Route | What happens |
|---|---|---|
| Learn | `/learn/token-bucket` | Read the concept, implement `TokenBucket.allow()`, pass the tests, save it to your Toolkit. |
| Scale | `/constraint` | Survive 3 escalating constraints; apply a fix and watch the live metrics flatten or spike. |
| Survive | `/cascade` | Fix the in-memory counter → Redis SPOF → race condition → memory exhaustion → multi-region drift. Reason before each fix. |

### Verify it works (no infra required)

```bash
python scripts/validate-dags.py             # all DAGs + constraint tracks valid

# Go engines:
( cd services/cascade-engine && go build ./... && go test ./... )
( cd services/constraint-engine && go build ./... && CONTENT_DIR=$PWD/../../content go test ./... )

# Frontend:
( cd frontend && npm run build )            # 12 routes

# With engines running:
python scripts/smoke_learn.py               # Learn: lesson -> submit -> toolkit
python scripts/smoke_cascade.py             # Cascade: problem -> fix -> ... -> survived
python scripts/smoke_constraint.py          # Constraint: origin -> scale through levels
python scripts/smoke_fullstack.py           # frontend proxy -> engines
```

## Project Structure

```
cascade/
├── frontend/              # Next.js + React + TypeScript (pages dir)
├── services/              # Backend microservices (mixed Go + Python)
│   ├── cascade-engine/    # Go     — DAG walker, fix analyzer, chain reactions      (:8090)
│   ├── constraint-engine/ # Go     — Scaling challenges, load simulation            (:8094)
│   ├── auth/              # Python — Authentication (JWT, bcrypt)                   (:8081)
│   ├── user/              # Python — User profiles, progress                        (:8082)
│   ├── learn-engine/      # Python — Lessons, sandboxed snippet runner, toolkit     (:8093)
│   ├── refactor-engine/   # Python — Dependency mapping, god-function detection     (:8095)
│   ├── arena-engine/      # Python — WebSocket duels, matchmaking, league           (:8096)
│   └── insight-engine/    # Python — TF-IDF reasoning scorer (Cascade gate)         (:8097)
├── content/               # DAGs, lessons, constraint tracks, spaghetti codebases (data-driven)
├── docs/                  # Strategy + engineering docs (see docs/README.md)
├── scripts/               # DB migrations, seeding, validation, smoke tests
├── deploy/                # Terraform, k8s, monitoring
└── docker-compose.yml     # Local development environment
```

## Design

Premium, calm, student-portal aesthetic — warm cream surfaces, warm-ink text, a single restrained
deep teal-green accent, Fraunces (serif display) + Jost (sans body), and a warm charcoal dark mode.
Not terminal/hacker, not generic SaaS blue/purple. See [`docs/design-system.md`](docs/design-system.md).

## Strategy & Moat

Cascade's durable edge isn't content — it's the model of *you*. The platform builds a Personal
Failure Profile of how you reason under pressure and adapts to your blind spots. Combined with the
AI-resistant reasoning gate and a dual Practice/Assess track, that's the moat.

- [`docs/cognitive-moat.md`](docs/cognitive-moat.md) — personalization & blind-spot modeling
- [`docs/positioning.md`](docs/positioning.md) — dual-track positioning, fresher→staff leveling
- [`docs/business-model.md`](docs/business-model.md) — build-and-run, bootstrap to profitability
- [`docs/market-landscape.md`](docs/market-landscape.md) — competitive set & where Cascade differs

## License

MIT
