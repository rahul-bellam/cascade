locals {
  services = {
    cascade-engine  = { port = 8090, cpu = 512, memory = 1024 },
    learn-engine    = { port = 8093, cpu = 256, memory = 512 },
    constraint-engine = { port = 8094, cpu = 256, memory = 512 },
    insight-engine  = { port = 8097, cpu = 256, memory = 512 },
    arena-engine    = { port = 8096, cpu = 256, memory = 256 },
    refactor-engine = { port = 8095, cpu = 256, memory = 256 },
    auth            = { port = 8081, cpu = 128, memory = 256 },
    user            = { port = 8082, cpu = 128, memory = 256 },
  }
}

resource "aws_ecs_task_definition" "service" {
  for_each = local.services

  family                   = "cascade-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${aws_ecr_repository.cascade[each.key].repository_url}:${var.container_image_tag}"
      essential = true
      portMappings = [
        { containerPort = each.value.port, protocol = "tcp" }
      ]
      environment = [
        { name = "RUST_LOG", value = "info" },
        { name = "DATABASE_URL", value = aws_rds_cluster.cascade.endpoint },
        { name = "REDIS_URL", value = aws_elasticache_replication_group.cascade.primary_endpoint_address },
      ]
      secrets = [
        { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.cascade.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = each.key
        }
      }
    }
  ])
  tags = { Name = "cascade-${each.key}" }
}

resource "aws_ecs_service" "service" {
  for_each = local.services

  name            = "cascade-${each.key}"
  cluster         = aws_ecs_cluster.cascade.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service[each.key].arn
    container_name   = each.key
    container_port   = each.value.port
  }
}

resource "aws_lb_target_group" "service" {
  for_each = local.services

  name        = "cascade-${each.key}"
  port        = each.value.port
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
  tags = { Name = "cascade-${each.key}" }
}

# ALB listener rules per service path
resource "aws_lb_listener_rule" "service" {
  for_each = local.services

  listener_arn = aws_lb_listener.api.arn
  priority     = index(keys(local.services), each.key) + 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service[each.key].arn
  }
  condition {
    path_pattern {
      values = ["/${each.key}/*"]
    }
  }
}

# ── ECR Repositories ─────────────────────────────────────────────────────────

resource "aws_ecr_repository" "cascade" {
  for_each = local.services
  name     = "cascade/${each.key}"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = { Name = "cascade/${each.key}" }
}

resource "aws_ecr_lifecycle_policy" "cascade" {
  for_each = aws_ecr_repository.cascade
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 30 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}

# ── IAM ──────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "ecs_execution" {
  name = "cascade-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "cascade-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_policy" "ecs_task" {
  name = "cascade-ecs-task-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.cascade.arn}/*"
      },
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.jwt.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = aws_iam_policy.ecs_task.arn
}

# ── Secrets Manager ──────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt" {
  name = "cascade-jwt-${var.environment}"
  tags = { Name = "cascade-jwt" }
}

# ── CloudWatch ───────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "cascade" {
  name              = "/ecs/cascade"
  retention_in_days = 90
  tags = { Name = "cascade-logs" }
}

# ── Auto Scaling ─────────────────────────────────────────────────────────────

resource "aws_appautoscaling_target" "service" {
  for_each = local.services

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.cascade.name}/${aws_ecs_service.service[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = 2
  max_capacity       = 10
}

resource "aws_appautoscaling_policy" "cpu" {
  for_each = local.services

  name = "cascade-${each.key}-cpu-scaling"
  service_namespace  = aws_appautoscaling_target.service[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.service[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.service[each.key].scalable_dimension
  policy_type        = "TargetTrackingScaling"
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70
    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
