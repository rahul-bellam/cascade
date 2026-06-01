output "vpc_id" {
  description = "Cascade VPC ID"
  value       = aws_vpc.cascade.id
}

output "alb_dns" {
  description = "ALB DNS name"
  value       = aws_lb.cascade.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.cascade.domain_name
}

output "rds_endpoint" {
  description = "RDS cluster endpoint"
  value       = aws_rds_cluster.cascade.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.cascade.primary_endpoint_address
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.cascade.name
}

output "s3_bucket" {
  description = "Content bucket name"
  value       = aws_s3_bucket.cascade.id
}
