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
  description = "Cloud SQL machine tier (shared-core; 20-50 concurrent users doesn't need more)"
  type        = string
  default     = "db-f1-micro"
}

variable "billing_account_id" {
  description = "GCP billing account ID the project is linked to (for the budget resource)"
  type        = string
}

variable "budget_amount_inr" {
  description = "Monthly budget ceiling in INR, alerted on at 50/80/100%"
  type        = number
  default     = 5000
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
  ]
}
