variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev/staging/prod)"
  type        = string
  default     = "production"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "cascade_admin"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Custom domain name (empty = CloudFront default)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (required if domain_name set)"
  type        = string
  default     = ""
}

variable "container_image_tag" {
  description = "Docker image tag for all services"
  type        = string
  default     = "latest"
}

variable "ecs_cpu" {
  description = "ECS task CPU units"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "ECS task memory (MiB)"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of ECS tasks per service"
  type        = number
  default     = 2
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}
