# Cascade — Kubernetes (Phase 8, alternative to ECS)

Each backend has a Deployment + Service. Example manifests provided for `cascade-engine`
(Go) and `arena-engine` (Python/WebSockets). Replicate the pattern for auth, user,
learn-engine, constraint-engine, refactor-engine, insight-engine.

```bash
kubectl apply -f deploy/k8s/
```

Notes:
- Arena uses WebSockets → enable sticky sessions / session affinity at the ingress.
- Secrets (DATABASE_URL, JWT_SECRET) via `kubectl create secret` + `secretKeyRef`.
- HPA recommended on cascade/constraint/arena engines.
