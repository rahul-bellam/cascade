# Cascade — Deployment & Launch (Phases 8–9)

## Phase 8 — Production deployment

### Infrastructure (`deploy/`)
- **`deploy/terraform/`** — AWS: ECS Fargate cluster, Aurora Serverless v2 Postgres, ElastiCache Redis (Multi-AZ).
- **`deploy/k8s/`** — alternative: Deployment + Service per backend (example: cascade-engine, arena-engine).
- **`deploy/monitoring/`** — Prometheus + Grafana + Loki; Prometheus scrapes every backend `/health`+metrics.

### Service topology
| Service | Lang | Port | Notes |
|---|---|---|---|
| auth | Python | 8081 | bcrypt+JWT |
| user | Python | 8082 | profiles/progress |
| learn-engine | Python | 8093 | snippet sandbox |
| cascade-engine | **Go** | 8090 | DAG walker, weighted transitions, telemetry, challenge |
| constraint-engine | **Go** | 8094 | load simulator |
| refactor-engine | Python | 8095 | dep mapper |
| arena-engine | Python | 8096 | WebSocket duels + league (sticky sessions) |
| insight-engine | Python | 8097 | reasoning-first TF-IDF scorer |

### Pre-launch checklist
**Security**
- [ ] Secrets in Secrets Manager / `secretKeyRef` (never in code)
- [ ] TLS 1.3 on all external endpoints
- [ ] Sandbox (gVisor) for snippet execution
- [ ] Rate limiting on public APIs
- [ ] JWT secret rotated; tokens expire

**Infra**
- [ ] Auto-scaling (HPA) on cascade/constraint/arena
- [ ] Daily DB backups, tested restore
- [ ] Multi-AZ Postgres + Redis
- [ ] CDN; DNS failover
- [ ] WebSocket sticky sessions for arena

**Observability**
- [ ] Alerts: p99 > 500ms, error rate > 1%
- [ ] On-call rotation + runbooks (DB failover, Redis rebuild)
- [ ] Dashboards: active users, sessions, errors, latency

**Load testing**
- [ ] 100 concurrent cascade sessions
- [ ] 50 concurrent arena duels
- [ ] DB ≥ 500 q/s

## Phase 9 — Content expansion & polish

### Content pipeline (3 archetypes complete across all modes)
- `rate-limiter` ✅ (lessons, constraint track, DAG, refactor codebase)
- `url-shortener` ✅ (lessons, constraint track, DAG, refactor codebase)
- `notification-system` ✅ (lessons, constraint track, DAG, refactor codebase)

> **Deployment strategy:** for the *how/where to host* decision (bootstrap → scale-up,
> Vercel + single box, AWS as the dormant target), see [`deployment-strategy.md`](./deployment-strategy.md).

### Polish pass
- [ ] Helpful error messages; loading/empty states
- [ ] Onboarding flow; keyboard shortcuts
- [ ] Mobile-responsive Learn mode
- [ ] <2s initial load; <100ms API

### Community launch
- [ ] Public repo, docs site, Discord
- [ ] Product Hunt; launch blog post
- [ ] First League season
