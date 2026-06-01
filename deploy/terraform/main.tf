# Cascade — Production infrastructure (Phase 8)
# Illustrative AWS topology: ECS Fargate for services, Aurora Postgres, ElastiCache Redis.
# `terraform init && terraform plan` after setting vars. Not auto-applied.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

variable "region"      { default = "us-east-1" }
variable "db_password" { sensitive = true }
variable "environment" { default = "production" }

# ── Networking ──────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "cascade" {
  name = "cascade-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ── Data layer ──────────────────────────────────────────────────────────────
resource "aws_rds_cluster" "cascade" {
  cluster_identifier = "cascade-${var.environment}"
  engine             = "aurora-postgresql"
  engine_version     = "16.1"
  database_name      = "cascade"
  master_username    = "cascade_admin"
  master_password    = var.db_password
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
}

resource "aws_elasticache_replication_group" "cascade" {
  replication_group_id = "cascade-${var.environment}"
  description          = "Cascade Redis (sessions, leaderboards, toolkit, arena state)"
  engine               = "redis"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3 # Multi-AZ
  automatic_failover_enabled = true
}

# ── Services (one ECS service per backend; cascade & constraint are Go, rest Python) ──
locals {
  services = {
    auth              = { port = 8081, cpu = 256, mem = 512 }
    user              = { port = 8082, cpu = 256, mem = 512 }
    learn-engine      = { port = 8093, cpu = 512, mem = 1024 }
    cascade-engine    = { port = 8090, cpu = 512, mem = 1024 } # Go
    constraint-engine = { port = 8094, cpu = 512, mem = 1024 } # Go
    refactor-engine   = { port = 8095, cpu = 512, mem = 1024 }
    arena-engine      = { port = 8096, cpu = 512, mem = 1024 } # websockets
    insight-engine    = { port = 8097, cpu = 512, mem = 1024 }
  }
}

output "cluster"      { value = aws_ecs_cluster.cascade.name }
output "db_endpoint"  { value = aws_rds_cluster.cascade.endpoint }
output "redis_endpoint" { value = aws_elasticache_replication_group.cascade.primary_endpoint_address }
