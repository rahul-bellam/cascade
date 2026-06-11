# Deployment Strategy

**Status:** Active.
**One-liner:** *Ship cheap, keep control, scale only when revenue demands it — matched to the build-and-run model.*

This doc is the *strategy*. The mechanical checklist (security/observability/load) lives in
[`deployment.md`](./deployment.md); the business rationale in [`business-model.md`](./business-model.md).

---

## 1. Principle

Cascade is built to be **run profitably**, not to impress investors with infrastructure. So we
deploy on the **smallest footprint that serves users reliably**, and we only add complexity (and
cost) when usage forces it. Premature ECS/Aurora/Multi-AZ spend is the enemy of bootstrapping.

> Rule of thumb: don't pay for scale you don't have. A single box + a PaaS frontend runs the whole
> product for **~$0–25/mo**. The AWS path in `terraform/` is a *future*, not a *now*.

## 2. Why not Firebase for the backend

A reasonable instinct ("Firebase + Vercel") doesn't fit this backend, and forcing it would mean a
costly rewrite that fights the build-and-run model:

- The backend is **8 long-running servers**, two of them **Go** (cascade-engine, constraint-engine).
  Firebase Cloud Functions are short-lived; you'd rewrite the engines.
- **arena-engine holds persistent WebSocket connections** for live duels — serverless functions are
  the worst fit for long-lived sockets.
- **learn-engine runs a subprocess sandbox** to execute user-submitted Python — not something you do
  inside a Cloud Function.
- **insight-engine** does TF-IDF reasoning scoring; **Firestore is NoSQL** while the services assume
  relational Postgres (`DATABASE_URL`, migrations in `scripts/migrations/`).

**Verdict:** keep the containers; use **managed Postgres + Redis** if you want the "someone else runs
the database" benefit. Supabase/Neon give you that for Postgres; Upstash for Redis.

## 3. The chosen stack (bootstrap phase)

| Layer | Choice | Cost | Why |
|---|---|---|---|
| **Frontend** | **Vercel** | Free tier | Native Next.js home, zero ops, instant rollbacks, preview deploys |
| **Backend** | **One box via `docker-compose.prod.yml`** (VPS or Railway/Render) | ~$5–20/mo | Dockerfiles already exist; zero rewrite; full control |
| **Postgres** | Bundled container **or** managed (Neon/Supabase free tier) | $0 | Managed = automatic backups, less ops |
| **Redis** | Bundled container **or** Upstash free tier | $0 | Only arena-engine needs it |
| **Images** | **GHCR** via `deploy.yml` | Free | No cloud account needed to publish images |
| **TLS/edge** | Caddy or Nginx on the box (auto-TLS), or PaaS-provided HTTPS | $0 | One public origin for the frontend to call |

### How the pieces connect

```
  Browser ──HTTPS──> Vercel (Next.js)
                        │  Next.js API routes (/api/*) proxy server-side using
                        │  CASCADE_ENGINE_URL, LEARN_ENGINE_URL, ... (Vercel env vars)
                        ▼
                 https://api.cascade.dev   (your box, Caddy/Nginx + TLS)
                        │  reverse-proxies to the compose network:
                        ├─ cascade-engine:8090   (Go)
                        ├─ constraint-engine:8094 (Go)
                        ├─ learn-engine:8093, insight-engine:8097, refactor:8095,
                        │  arena:8096 (WS), auth:8081, user:8082 (Python)
                        └─ postgres / redis (internal only)
```

The frontend never talks to the engines directly — it proxies through its own `/api/*` routes
(`frontend/src/pages/api/*/[...path].ts`), so only **one** backend origin must be public and CORS is
a non-issue.

### Artifacts in the repo

| File | Purpose |
|---|---|
| `docker-compose.prod.yml` | Whole backend on one box; bundled or managed datastores |
| `.env.prod.example` | Production env template (copy → `.env.prod`, gitignored) |
| `frontend/vercel.json` | Vercel build config; env-var mapping documented inline |
| `frontend/Dockerfile` | Only if self-hosting the frontend instead of Vercel |
| `.github/workflows/deploy.yml` | CI-gated build + push images to GHCR |
| `.github/workflows/deploy-aws.yml.disabled` | The scale-up rollout, parked until needed |

## 4. First deploy — runbook

**Backend (the box):**
```bash
cp .env.prod.example .env.prod          # fill JWT_SECRET (openssl rand -hex 32), DB password
bash scripts/run-migrations.sh          # apply scripts/migrations/*.sql to Postgres
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
# front with Caddy: one line — reverse_proxy /api/* ... (or expose engines behind one vhost)
```

**Frontend (Vercel):**
1. Import the repo, set **Root Directory = `frontend`**.
2. Add env vars pointing at the box: `CASCADE_ENGINE_URL`, `LEARN_ENGINE_URL`,
   `CONSTRAINT_ENGINE_URL`, `REFACTOR_ENGINE_URL`, `ARENA_ENGINE_URL`, `AUTH_SERVICE_URL`
   (all `https://api.cascade.dev`).
3. Deploy. Vercel handles TLS, CDN, and preview deploys per-PR for free.

**Smoke after deploy:** hit `/api/health`, run one Learn submit, start one Cascade session, open an
Arena duel (verifies the WebSocket path through the proxy).

## 5. Known deployment gotchas (already handled / to watch)

- ✅ **Fixed:** `cascade-engine` hardcoded `insightEngineURL=localhost:8097`; now reads
  `INSIGHT_ENGINE_URL` (set in `docker-compose.prod.yml`). The reasoning gate would 500 otherwise.
- **WebSockets:** arena-engine needs sticky sessions *if* you ever run >1 replica. On a single box,
  non-issue. Caddy/Nginx must allow WS upgrade on the arena path.
- **Content baking:** Go images bake `content/` and set `CONTENT_DIR=/app/content`; refactor-engine
  mounts `./content` read-only. Rebuild images (or redeploy) when content changes.
- **Datastore swap:** to use managed Postgres/Redis, delete the `postgres`/`redis` services from the
  prod compose and point `DATABASE_URL`/`REDIS_URL` at the managed endpoints.
- **SQLite fallback:** Python engines fall back to SQLite when `DATABASE_URL` is unset — fine for a
  demo, **not** for production (data is per-container and ephemeral). Always set `DATABASE_URL` in prod.

## 6. When to scale up (and how)

Stay on the single box until you hit a *real* signal, then graduate one piece at a time:

| Trigger | Move |
|---|---|
| Box CPU/mem regularly >70% | Bigger box first (cheapest fix), or split the hot engine onto its own box |
| Arena needs >1 replica | Move arena-engine to k8s with sticky sessions; the `k8s/` manifests + HPA exist |
| Need zero-downtime + autoscale across all services | Enable `deploy-aws.yml.disabled` → ECS Fargate + Aurora Serverless v2 + ElastiCache (`terraform/`) |
| Compliance / multi-region | Full AWS path with Multi-AZ, per `deployment.md` checklist |

The scaffolding for the end state (`terraform/`, `k8s/`, monitoring) is intentionally already in the
repo — but **dormant**. We turn it on when revenue justifies the bill, not before.

## 7. TLS reverse proxy for the box (`deploy-box/`)

The frontend (on Vercel) calls each engine through a distinct `*_ENGINE_URL`, and the Arena
WebSocket connects browser-direct. cascade-engine and constraint-engine both serve `/archetypes`
and everything serves `/health`, so **path-based routing on one host collides** — we use
**subdomain-per-engine** instead.

- **`deploy-box/Caddyfile`** (recommended) — automatic HTTPS via Let's Encrypt, WebSocket
  passthrough for Arena, HSTS/security headers. Validated with `caddy validate` ("Valid
  configuration"). Run as a host-network container; point DNS for each subdomain at the box.
- **`deploy-box/nginx.conf`** — alternative if you already run Nginx (bring your own certs via
  certbot); explicit `Upgrade`/`Connection` headers + long read timeout for the Arena WS.

Map (replace `api.example.com`): `cascade.` → :8090, `constraint.` → :8094, `learn.` → :8093,
`refactor.` → :8095, `auth.` → :8081, `arena.` → :8096 (HTTP + `wss://arena.../arena/queue`).
Set the matching `*_ENGINE_URL` (and `NEXT_PUBLIC_ARENA_WS_URL`) on Vercel.

## 8. Infra layout (consolidated)

The previously-duplicated `deploy/{terraform,k8s,monitoring}` tree has been **removed**. Canonical:

| Path | Purpose | Phase | Validated |
|---|---|---|---|
| `docker-compose.prod.yml` + `deploy-box/` | single-box backend + TLS proxy | bootstrap | caddy validate ✅ |
| `monitoring/` | Prometheus/Grafana/Loki for the box | bootstrap | yaml ✅ |
| `terraform/` | AWS provisioning (VPC/ECS/Aurora/ElastiCache/ALB/CloudFront) | scale-up | terraform validate ✅ |
| `k8s/` | namespaced Deployments + Services + HPA + monitoring | scale-up | kubeconform (k8s 1.29) ✅ |
| `.github/workflows/deploy-aws.yml.disabled` | AWS CD rollout | scale-up (dormant) | — |

All scale-up infra is **dormant** until revenue justifies the bill.
