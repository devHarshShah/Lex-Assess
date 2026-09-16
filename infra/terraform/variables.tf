variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources (Mumbai, since the app is India-only)"
  type        = string
  default     = "asia-south1"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-g1-small"
}

variable "sql_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "lex-assess-db"
}

variable "db_name" {
  description = "Application database name"
  type        = string
  default     = "lex_assess"
}

variable "db_user" {
  description = "Application database user"
  type        = string
  default     = "lex_assess_app"
}

variable "bucket_name" {
  description = "GCS bucket name for uploads/certificates"
  type        = string
  default     = "lexassess-uploads"
}

variable "runtime_service_account_id" {
  description = "Account ID (not email) for the Cloud Run runtime service account"
  type        = string
  default     = "lex-assess-run-sa"
}

variable "secret_names" {
  description = "Secret Manager secret containers to create (values pushed manually, see DEPLOYMENT.md)"
  type        = list(string)
  default = [
    "DATABASE_URL",
    "JWT_SECRET",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "SMTP_PASS",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ]
}
