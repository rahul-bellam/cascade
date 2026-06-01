# Cascade — Terraform (Phase 8)

Illustrative AWS infra: ECS Fargate cluster, Aurora Serverless v2 Postgres, ElastiCache Redis (Multi-AZ).

```bash
cd deploy/terraform
terraform init
terraform plan  -var="db_password=..."
terraform apply -var="db_password=..."
```

Each backend service runs as its own ECS service (see `locals.services`). Build images via the
per-service Dockerfiles, push to ECR, and wire task definitions (omitted here for brevity).
> Not applied automatically — review before running.
