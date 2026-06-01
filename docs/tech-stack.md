# Tech Stack

**Version:** 0.2  
**Last Updated:** June 2026  
**New in v0.2:** Learn Engine (Python), Constraint Unlock Engine (Go), Blind Refactor Engine (Python), Dependency Graph Viz

---

## 1. Stack Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                       │
│  Next.js 14 · React 18 · TypeScript · Tailwind CSS                     │
│  React Flow (Architecture Canvas) · Monaco Editor (Code)               │
│  D3.js (Dependency Graph Visualization)                                │
│  Recharts (Metrics Dashboard) · Custom Lesson Player                   │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                    │
│  Envoy Proxy (self-hosted) or Kong                                      │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICES                               │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  Go 1.22     │  │  Python 3.12     │  │  Go 1.22                 │  │
│  │              │  │                  │  │                          │  │
│  │  Auth        │  │  Learn Engine    │  │  Constraint Unlock       │  │
│  │  User        │  │  Cascade Engine  │  │  Engine                  │  │
│  │  Content     │  │  Refactor Engine │  │  Simulation Orchestrator │  │
│  │  Arena       │  │  Fix Analyzer    │  │  Arena Engine            │  │
│  │  League      │  │  DAG Walker      │  │  Matchmaking             │  │
│  └──────────────┘  └──────────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                     │
│  PostgreSQL 16 (Primary DB · Users · Progress · Content · DAGs)        │
│  Redis 7 (Cache · Sessions · Arena State · Leaderboards · Toolkit)     │
│  Apache Kafka (Simulation Events · Arena Actions · Analytics)          │
│  S3 / MinIO (Codebases · Artifacts · Reference Solutions)              │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│                          INFRASTRUCTURE                                 │
│  Docker · Kubernetes (EKS/GKE) · gVisor (Sandbox)                      │
│  AWS/GCP · Terraform · GitHub Actions · k6 / Locust                    │
│  OpenTelemetry · Grafana · Prometheus · Sentry                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend

| Technology | Purpose | Why |
|:---|---|:---|
| **Next.js 14** | Full-stack React framework | SSR, API routes, file-system routing |
| **React 18** | UI framework | Concurrent features for real-time updates |
| **TypeScript** | Type safety | Catch bugs early |
| **Tailwind CSS** | Styling | Rapid prototyping, consistent design |
| **React Flow** | Architecture canvas | Drag-and-drop node editor for system design diagrams |
| **Monaco Editor** | Code editor | Same engine as VS Code |
| **D3.js** | Dependency graph visualization | Force-directed graphs for codebase analysis (Blind Refactor) |
| **Recharts** | Metrics dashboard | Real-time charting for latency, throughput, error rates |
| **WebSocket (native)** | Real-time communication | Arena sync, simulation streaming |
| **TanStack Query** | Server state management | Caching, optimistic updates |
| **Zustand** | Client state management | Lightweight, simpler than Redux |

---

## 3. Backend

### 3.1 Go Services

| Service | Purpose | Key Packages |
|:---|---|:---|
| **Auth Service** | Registration, login, OAuth, JWT | `golang-jwt/jwt`, `golang.org/x/oauth2` |
| **User Service** | Profiles, progress, stats, toolkit | `chi`, `pgx` |
| **Content Service** | Lessons, scenarios, hints, solutions | `chi`, `pgx` |
| **Constraint Unlock Engine** | Scaling challenge generation + simulation | `chi`, `docker/docker` |
| **Arena Engine** | Matchmaking, duel state, scoring, replay | `gorilla/websocket`, `redis/go-redis` |
| **Simulation Orchestrator** | Container management, load testing | `docker/docker`, `k6` integration |

**Why Go?** Fast startup, excellent concurrency for WebSocket handling, small binaries.

### 3.2 Python Services

| Service | Purpose | Key Libraries |
|:---|---|:---|
| **Learn Engine** | Lesson delivery, snippet validation | `FastAPI`, `pytest` (for test runner) |
| **Cascade Engine** | DAG walker, fix analyzer, issue generator | `FastAPI`, `ast` (AST parser) |
| **Blind Refactor Engine** | Codebase analysis, dependency mapping, refactor validation | `FastAPI`, `ast`, `networkx` (graph analysis) |

**Why Python?** Rich AST parsing, `networkx` for graph analysis, faster prototyping of the core IP.

---

## 4. Data Layer

### 4.1 PostgreSQL 16

**New tables in v0.2:**
- `lessons`, `lesson_completions`, `user_toolkit`
- `constraint_levels`, `constraint_sessions`, `constraint_attempts`
- `refactor_scenarios`, `refactor_sessions`

### 4.2 Redis 7

**New usage in v0.2:**
- `user:{id}:toolkit` — Hash of saved snippet code
- `constraint:{sessionId}:state` — Current level state
- `refactor:{sessionId}:snapshot` — Current codebase state

### 4.3 S3 / MinIO

**New usage in v0.2:**
- `s3://cascade-lessons/{lesson-id}/` — Lesson content (videos, diagrams)
- `s3://cascade-codebases/{scenario-id}/` — Spaghetti codebase tarballs
- `s3://cascade-refactor-snapshots/{session-id}/` — Mid-refactor snapshots

---

## 5. Key Libraries for New Modes

### Dependency Graph Visualization (Blind Refactor)

```yaml
frontend:
  - d3.js (force-directed graph)
  - react-d3-graph (React wrapper)
  - Color coding: red (high coupling), yellow (medium), green (low)

backend:
  - networkx (Python) — build dependency graph from AST
  - pycg (Python Call Graph) — generate call graphs
  - pydeps (Python) — dependency visualization data
```

### Code Analysis (Blind Refactor + Fix Analyzer)

```yaml
python:
  - ast — built-in Python AST parser
  - astor — code generation from AST
  - radon — code complexity metrics
  - vulture — dead code detection
  
  custom:
    - CouplingAnalyzer — measures afferent/efferent coupling
    - GodObjectDetector — identifies over-bloated classes/functions
    - ServiceBoundaryFinder — suggests service boundaries based on call patterns
```

### Snippet Sandbox (Learn Mode)

```yaml
execution:
  - gVisor (runsc) — sandboxed container
  - Timeout: 10 seconds per snippet
  - Memory: 128MB per snippet
  - Network: isolated (no outbound)
  
  preloaded_images:
    - python:3.12-slim
    - node:20-slim
    - golang:1.22
    - openjdk:21-slim
```

---

## 6. Development Environment

```yaml
version: '3.8'
services:
  # ... (existing services from v0.1)

  learn-engine:
    build: ./services/learn-engine
    ports: ["8093:8093"]
    depends_on: [postgres, redis, minio]

  constraint-engine:
    build: ./services/constraint-engine
    ports: ["8094:8094"]
    depends_on: [postgres, redis, kafka]
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]

  refactor-engine:
    build: ./services/refactor-engine
    ports: ["8095:8095"]
    depends_on: [postgres, minio]
```