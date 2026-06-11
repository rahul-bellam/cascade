provider "aws" {
  region = var.aws_region
}

# ── VPC ─────────────────────────────────────────────────────────────────────

resource "aws_vpc" "cascade" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "cascade-vpc" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.cascade.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "cascade-public-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.cascade.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "cascade-private-${count.index}" }
}

resource "aws_internet_gateway" "cascade" {
  vpc_id = aws_vpc.cascade.id
  tags   = { Name = "cascade-igw" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "cascade-nat-eip" }
}

resource "aws_nat_gateway" "cascade" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "cascade-nat" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.cascade.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.cascade.id
  }
  tags = { Name = "cascade-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.cascade.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.cascade.id
  }
  tags = { Name = "cascade-private-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── Security Groups ──────────────────────────────────────────────────────────

resource "aws_security_group" "alb" {
  name        = "cascade-alb"
  description = "Allow HTTP/HTTPS inbound to ALB"
  vpc_id      = aws_vpc.cascade.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "cascade-alb-sg" }
}

resource "aws_security_group" "ecs" {
  name        = "cascade-ecs"
  description = "Allow traffic from ALB to ECS tasks"
  vpc_id      = aws_vpc.cascade.id
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "cascade-ecs-sg" }
}

resource "aws_security_group" "rds" {
  name        = "cascade-rds"
  description = "Allow PostgreSQL from ECS"
  vpc_id      = aws_vpc.cascade.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  tags = { Name = "cascade-rds-sg" }
}

resource "aws_security_group" "redis" {
  name        = "cascade-redis"
  description = "Allow Redis from ECS"
  vpc_id      = aws_vpc.cascade.id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  tags = { Name = "cascade-redis-sg" }
}

# ── RDS Aurora (PostgreSQL) ─────────────────────────────────────────────────

resource "aws_rds_cluster" "cascade" {
  cluster_identifier        = "cascade-aurora"
  engine                    = "aurora-postgresql"
  engine_version            = "16.1"
  database_name             = "cascade"
  master_username           = var.db_username
  master_password           = var.db_password
  port                      = 5432
  db_subnet_group_name      = aws_db_subnet_group.cascade.name
  vpc_security_group_ids    = [aws_security_group.rds.id]
  backup_retention_period   = 30
  preferred_backup_window   = "03:00-04:00"
  skip_final_snapshot       = false
  final_snapshot_identifier = "cascade-aurora-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
}

resource "aws_rds_cluster_instance" "cascade" {
  count              = 2
  cluster_identifier = aws_rds_cluster.cascade.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.cascade.engine
  engine_version     = aws_rds_cluster.cascade.engine_version
  tags               = { Name = "cascade-aurora-instance-${count.index}" }
}

resource "aws_db_subnet_group" "cascade" {
  name       = "cascade-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "cascade-db-subnet-group" }
}

# ── ElastiCache Redis ────────────────────────────────────────────────────────

resource "aws_elasticache_replication_group" "cascade" {
  replication_group_id       = "cascade-redis"
  description                = "Cascade Redis cluster"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.cascade.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled           = true
  tags                       = { Name = "cascade-redis" }
}

resource "aws_elasticache_subnet_group" "cascade" {
  name       = "cascade-elasticache-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

# ── S3 ───────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "cascade" {
  bucket = "cascade-content-${var.environment}"
  tags   = { Name = "cascade-content" }
}

resource "aws_s3_bucket_versioning" "cascade" {
  bucket = aws_s3_bucket.cascade.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cascade" {
  bucket = aws_s3_bucket.cascade.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── ECS ──────────────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "cascade" {
  name = "cascade-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { Name = "cascade-ecs-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "cascade" {
  cluster_name       = aws_ecs_cluster.cascade.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ── ALB ──────────────────────────────────────────────────────────────────────

resource "aws_lb" "cascade" {
  name               = "cascade-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = { Name = "cascade-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "cascade-api-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.cascade.id
  target_type = "ip"
  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = { Name = "cascade-api-tg" }
}

resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.cascade.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ── CloudFront (CDN) ─────────────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "cascade" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = var.domain_name != "" ? [var.domain_name] : []

  origin {
    domain_name = aws_lb.cascade.dns_name
    origin_id   = "cascade-alb"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "cascade-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = true
      cookies { forward = "all" }
    }
    min_ttl     = 0
    default_ttl = 60
    max_ttl     = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Name = "cascade-cdn" }
}

# ── Route53 DNS (optional) ───────────────────────────────────────────────────

resource "aws_route53_record" "cascade" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.cascade.domain_name
    zone_id                = aws_cloudfront_distribution.cascade.hosted_zone_id
    evaluate_target_health = false
  }
}

# ── Data sources ─────────────────────────────────────────────────────────────

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}
