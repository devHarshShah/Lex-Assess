output "sql_connection_name" {
  description = "Cloud SQL connection name, e.g. project:region:instance - informational only; the deploy pipeline no longer uses the /cloudsql socket connector (see network.tf)"
  value       = google_sql_database_instance.main.connection_name
}

output "sql_private_ip" {
  description = "Cloud SQL private IP - this is the DATABASE_URL host; Cloud Run reaches it over Direct VPC egress"
  value       = google_sql_database_instance.main.private_ip_address
}

output "bucket_name" {
  description = "GCS bucket name for uploads/certificates"
  value       = google_storage_bucket.uploads.name
}

output "runtime_service_account_email" {
  description = "Email of the Cloud Run runtime service account - set as --service-account on deploy"
  value       = google_service_account.run_runtime.email
}

output "db_user" {
  description = "Application database user"
  value       = google_sql_user.app.name
}

output "db_password" {
  description = "Generated application database password - use to build DATABASE_URL, then push to Secret Manager"
  value       = random_password.db_password.result
  sensitive   = true
}

output "db_name" {
  description = "Application database name"
  value       = google_sql_database.app.name
}
