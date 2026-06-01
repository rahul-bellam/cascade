# Contributing to Cascade

First off, thank you for considering contributing to Cascade! This project aims to revolutionize how engineers learn system design, and every contribution — whether code, content, or ideas — helps.

---

## 🧭 Where to Start

| I want to... | Start Here |
|:---|---|
| Fix a bug or add a feature | Check the GitHub Issues tab |
| Write a lesson | See [Creating Lessons](#creating-lessons) |
| Design a spaghetti codebase | See [Creating Blind Refactor Scenarios](#creating-blind-refactor-scenarios) |
| Build a failure DAG | See [Creating Cascade Chains](#creating-cascade-chains) |
| Improve documentation | Pick any doc in `/docs` and send a PR |
| Report a bug | Open a GitHub Issue |

---

## 🧑‍💻 Development Setup

### Prerequisites

- Go 1.22+
- Python 3.12+
- Node.js 20+
- Docker + Docker Compose
- `make` (optional)

### Local Setup

```bash
git clone https://github.com/yourusername/cascade.git
cd cascade

# Start all services
docker-compose up -d

# Install frontend dependencies
cd frontend && npm install

# Run frontend dev server
npm run dev

# Run backend services (in separate terminals)
cd services/auth && go run .
cd services/cascade-engine && poetry run python app.py
```

The platform should be available at `http://localhost:3000`.

---

## 🌳 Repository Structure

```
cascade/
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── learn/          # Learn Mode components
│   │   │   ├── constraint/     # Constraint Unlock components
│   │   │   ├── refactor/       # Blind Refactor components
│   │   │   ├── cascade/        # Cascade Mode components
│   │   │   ├── arena/          # Arena components
│   │   │   └── league/         # League components
│   │   ├── pages/
│   │   └── hooks/
│   └── package.json
│
├── services/
│   ├── auth/                   # Auth service (Go)
│   ├── user/                   # User service (Go)
│   ├── content/                # Content service (Go)
│   ├── learn-engine/           # Learn Mode engine (Python)
│   ├── constraint-engine/      # Constraint Unlock engine (Go)
│   ├── refactor-engine/        # Blind Refactor engine (Python)
│   ├── cascade-engine/         # Cascade engine (Python)
│   ├── arena-engine/           # Arena engine (Go)
│   └── simulation/             # Simulation orchestrator (Go)
│
├── content/
│   ├── lessons/                # Lesson definitions (YAML)
│   ├── constraints/            # Constraint definitions (YAML)
│   ├── codebases/              # Spaghetti codebases (tarballs)
│   ├── dags/                   # Failure DAG definitions (YAML)
│   └── solutions/              # Reference solutions
│
├── docs/
│   ├── architecture.md
│   ├── tech-stack.md
│   ├── cascade-engine.md
│   ├── arena-pvp.md
│   ├── league-system.md
│   └── mvp-roadmap.md
│
├── scripts/
├── tests/
├── docker-compose.yml
├── Makefile
├── PRD.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## 📝 Creating Lessons

### Lesson Format (YAML)

```yaml
id: caching-redis
title: "Caching with Redis"
prerequisites: []
estimated_minutes: 10
toolkit_key: "cache_with_redis"

concept:
  - type: text
    body: "Caching stores frequently accessed data in memory..."
  - type: viz
    id: cache-aside-animation
  - type: code_block
    language: python
    code: |
      def get_cached(key, fetch_fn, ttl):
          data = redis.get(key)
          if data:
              return data
          data = fetch_fn()
          redis.setex(key, ttl, data)
          return data

snippet:
  prompt: "Implement getCached(key, fetchFn, ttl)..."
  starter_code: |
    def getCached(key, fetchFn, ttl):
        pass
  test_cases:
    - name: "Returns cached value"
      call: "getCached('test', lambda: 'new', 60)"
      expected: "value"
  hints:
    - level: 1
      text: "Check if the key exists in Redis first."
    - level: 2
      text: "Use redis.get() and redis.setex()."
    - level: 3
      text: "Pattern: check cache -> on miss fetch -> store with TTL -> return"
```

### Lesson Principles

1. **One concept per lesson** — don't overload
2. **Snippet ≤ 20 lines** — bite-sized
3. **Test cases cover** happy path + edge case + failure mode
4. **Hints guide, don't give away**
5. **Every lesson outputs to Toolkit**

---

## 🔧 Creating Blind Refactor Scenarios

### Requirements

1. **1,500-3,000 lines** of code in a popular language (Python, JS, Go, Java)
2. **≥3 identifiable pain points** (god object, tight coupling, synchronous blocking, global state)
3. **Must be runnable** — the codebase should work (even if poorly)
4. **Reference solution** — how a senior engineer would refactor it
5. **A surprise new requirement**

### Submission

Create a directory under `content/codebases/{scenario-name}/` with:
- Source code (tarball or directory)
- `metadata.yaml` with description, pain points, and new requirement
- `reference/` with refactored solution
- PR with `[SCENARIO]` prefix

---

## 🌊 Creating Cascade Chains (DAGs)

### DAG Design Principles

1. **Base every chain on a real incident** — cite the post-mortem
2. **Each node teaches one pattern** — caching, circuit breaker, queue, etc.
3. **Transitions feel natural** — not "you added cache → meteor struck"
4. **Weighted transitions** for roguelike variety
5. **Terminal node = production-grade system**

### Real Incidents as Source Material

| Incident | DAG Topic |
|:---|---|
| GitHub 2018 Redis outage | Cache SPOF → Sentinel |
| Cloudflare 2023 cache stampede | Cache stampede → locking |
| Uber 2015 payment monolith | Monolith → services |
| Slack 2022 message ordering | Ordering → CRDTs |
| Discord 2017 chat latency | Queue → priorities |

---

## 🚀 Pull Request Process

1. Fork the repo and create your branch from `main`
2. Add tests for new code
3. Ensure all tests pass
4. Update documentation
5. Make sure your code lints
6. Open a PR with a clear title

### PR Title Conventions

```
[ENGINE] Add Lua script detection to Fix Analyzer
[CONTENT] Add "E-commerce Spaghetti" Blind Refactor scenario
[LESSON] Add "Consistent Hashing" lesson
[DAG] Add URL Shortener failure chain
[DOCS] Update architecture diagram for Arena mode
[BUGFIX] Fix simulation container timeout
```

---

## 📋 Good First Issues

Look for `good-first-issue` labels. These typically involve:
- Writing a lesson (YAML + test cases)
- Building test cases for existing lessons
- Fixing bugs in the snippet runner
- Improving error messages in simulation output
- Adding performance benchmarks

---

## 🧪 Testing Guidelines

| Component | Framework | Coverage Target |
|:---|---|:---:|
| Learn Engine | pytest | 90%+ |
| Constraint Engine | go test | 85%+ |
| Refactor Engine | pytest | 90%+ |
| Cascade Engine | pytest | 90%+ |
| Arena Engine | go test | 80%+ |
| Frontend | Playwright | 70%+ |

---

## 📚 Style Guides

- **Python**: PEP 8, type hints, Google-style docstrings. Linter: `ruff` + `mypy`
- **Go**: `gofmt`, error wrapping with context. Linter: `golangci-lint`
- **TypeScript/React**: Functional components, typed props. Linter: `eslint` + `prettier`
- **YAML**: 2-space indentation, no trailing whitespace

---

## 💬 Getting Help

- **GitHub Issues**: For bugs, feature requests, and questions
- **Discord**: [Join our server](https://discord.gg/cascade) *(placeholder)*

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

*Every expert was once a beginner. Every clean codebase was once spaghetti. Every system that survived once failed. Your contribution helps engineers learn from failure — safely.*