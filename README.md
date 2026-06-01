# Cascade

> *"First you learn. Then you break. Then you rebuild. Then you compete."*

**Cascade** is a progressive system design learning platform that takes you from zero to production-ready architect through concepts, code, chain reactions, refactors, constraints, and competitive duels.

## Getting Started

```bash
# 1. Start infrastructure (PostgreSQL, Redis, MinIO) — optional for local dev,
#    the Python engines fall back to SQLite when DATABASE_URL is unset.
docker-compose up -d

# 2. Backend engines (each in its own terminal)
cd services/learn-engine   && python3 -m venv .venv && . .venv/bin/activate \
    && pip install -r requirements.txt && python app.py    # :8093
cd services/cascade-engine && python3 -m venv .venv && . .venv/bin/activate \
    && pip install -r requirements.txt && python app.py    # :8090

# 3. Frontend
cd frontend && npm install && npm run dev                  # :3000
```

Open `http://localhost:3000`. Then walk the **rate-limiter journey**:

| Step | Route | What happens |
|---|---|---|
| Learn | `/learn/token-bucket` | Read the concept, write `TokenBucket.allow()`, run tests, save it to your Toolkit |
| Scale | `/constraint` | Take the working monolith and survive 3 escalating constraints (10x / 100x / 1000x). Apply a fix, watch the live latency/error/CPU metrics flatten — or spike. Your earned Toolkit snippets are suggested inline. |
| Solve for failure | `/cascade` | Fix one issue (in-memory counter) → your fix spawns the next failure (Redis SPOF → race condition → memory exhaustion → multi-region drift) → survive to a stable system. Toolkit snippets auto-suggested at each node. |

### Verify it works (no infra required)

```bash
make seed                 # seed lessons + validate the rate-limiter DAG
python scripts/validate-dags.py
# with the engines running:
python scripts/smoke_learn.py        # Learn: lesson -> submit -> toolkit
python scripts/smoke_cascade.py      # Cascade: problem -> fix -> ... -> survived
python scripts/smoke_constraint.py   # Constraint: origin -> scale through 3 levels
python scripts/smoke_phase2.py       # Toolkit earned in Learn appears in Constraint + Cascade
python scripts/smoke_phase3.py       # Cascade DAG graph + weighted transitions + post-mortem
python scripts/smoke_fullstack.py    # frontend proxy -> both engines
```

## Project Structure

```
cascade/
├── frontend/              # Next.js + React + TypeScript
├── services/              # Backend microservices
│   ├── auth/              # Go — Authentication (JWT, bcrypt)
│   ├── user/              # Go — User profiles, progress
│   ├── learn-engine/      # Python — Lessons, snippet runner, toolkit
│   ├── constraint-engine/ # Go — Scaling challenges, load simulation
│   ├── refactor-engine/   # Python — Dependency mapping, refactor validation
│   ├── cascade-engine/    # Python — DAG walker, fix analyzer, chain reactions
│   └── arena-engine/      # Go — WebSocket duels, ELO matchmaking, league system
├── content/               # Lesson content, DAGs, spaghetti codebases
├── docs/                  # Architecture, PRD, build phases, concerns map
├── scripts/               # DB migrations, seeding, validation
└── docker-compose.yml     # Local development environment
```

## The Five Modes

| Mode | Description |
|:---|---|
| 📖 **Learn** | Concepts paired with code snippets. Build your toolkit. |
| 🔓 **Unlock** | Scale a monolith through 6 escalating constraints. Real-time metrics. |
| 🔨 **Refactor** | Reverse-engineer spaghetti codebases. Extract services. Survive the PM. |
| 🔗 **Cascade** | Fix one issue. Your fix creates a new one. Survive the chain reaction. |
| ⚔️ **Arena + 🏆 League** | Duel other engineers. Weekly seasons. Champion post-mortems. |

## Coverage

Cascade covers **233+ engineering concerns** across 15 categories — from N+1 queries and connection pool leaks to DNS TTL misconfigurations and unsafe database migrations. Every concern links to a real production incident.

## License

MIT