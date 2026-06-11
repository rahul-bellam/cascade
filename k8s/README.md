# Cascade — Kubernetes manifests

The scale-up deployment target (see `docs/deployment-strategy.md`). **Dormant** until
Cascade outgrows a single box; the bootstrap stack is `docker-compose.prod.yml` + Vercel.

## Layout

```
k8s/
├── namespace.yaml              # cascade namespace
├── secrets.yaml               # DATABASE_URL / REDIS_URL / JWT_SECRET (templated — replace before apply)
├── <service>/deployment.yaml   # Deployment + ClusterIP Service per backend (all 8 services)
├── hpa.yaml                   # HorizontalPodAutoscalers (cascade, constraint, arena)
└── monitoring.yaml            # Prometheus + Grafana + ServiceMonitor (in-cluster)
```

Services: `cascade-engine` (Go), `constraint-engine` (Go), `auth`, `user`,
`learn-engine`, `refactor-engine`, `arena-engine`, `insight-engine` (Python).

## Apply

```bash
kubectl apply -f k8s/namespace.yaml
# edit k8s/secrets.yaml with real values first (or use a sealed-secret / external-secrets)
kubectl apply -f k8s/secrets.yaml
kubectl apply -R -f k8s/            # all deployments + services
kubectl apply -f k8s/hpa.yaml       # requires metrics-server
```

## Notes

- **Arena WebSockets:** `arena-engine` Service uses `sessionAffinity: ClientIP` so a
  duel's two sockets land on the same replica. For edge stickiness, also set ingress
  affinity (e.g. `nginx.ingress.kubernetes.io/affinity: cookie`).
- **Service discovery:** `cascade-engine` reaches the reasoning scorer via
  `INSIGHT_ENGINE_URL=http://insight-engine:8097` (set in its Deployment env).
- **Provisioning the cluster + managed data layer** (VPC, EKS/ECS, Aurora, ElastiCache,
  ALB, CloudFront) lives in `terraform/`. The CD rollout is `.github/workflows/deploy-aws.yml.disabled`.
- **Single-box observability** (Prometheus/Grafana/Loki via docker-compose) lives in
  `monitoring/` and is for the bootstrap phase, not this cluster.
