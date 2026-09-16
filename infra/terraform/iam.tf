# Runtime identity for the Cloud Run *service* (distinct from the WIF-bound
# CI/CD deployer service account, which just needs Artifact Registry push +
# Cloud Run deploy/execute permissions and is provisioned separately).

resource "google_service_account" "run_runtime" {
  project      = var.project_id
  account_id   = var.runtime_service_account_id
  display_name = "Lex-Assess Cloud Run runtime SA"
}

resource "google_project_iam_member" "run_runtime_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.run_runtime.email}"
}

resource "google_project_iam_member" "run_runtime_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.run_runtime.email}"
}

resource "google_storage_bucket_iam_member" "run_runtime_bucket_object_admin" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.run_runtime.email}"
}

# Secret Manager: container-only resources. Values are pushed manually via
# `gcloud secrets versions add` (see DEPLOYMENT.md) so secret material never
# lives in Terraform state.

resource "google_secret_manager_secret" "secrets" {
  for_each = toset(var.secret_names)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "run_runtime_secret_accessor" {
  for_each = google_secret_manager_secret.secrets

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run_runtime.email}"
}
