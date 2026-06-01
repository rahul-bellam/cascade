terraform {
  backend "s3" {
    bucket         = "cascade-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "cascade-terraform-locks"
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "cascade-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  tags = { Name = "cascade-terraform-locks" }
}
