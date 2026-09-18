# Private Service Access peering so Cloud SQL can get a private IP.
#
# Note on how Cloud Run actually reaches this instance: NOT via the native
# Cloud SQL integration (--add-cloudsql-instances / --set-cloudsql-instances).
# That flag mounts a /cloudsql/... Unix socket served by the Cloud SQL Auth
# Proxy, which requires the instance to have a public IP (or PSC) - and this
# instance is private-IP only (ipv4_enabled = false in cloudsql.tf). Using it
# fails at runtime with "P1001: Can't reach database server at /cloudsql/...".
#
# Instead, the Cloud Run service and the migrate job both use Direct VPC egress
# (--network/--subnet/--vpc-egress=private-ranges-only) and connect straight to
# google_sql_database_instance.main.private_ip_address over TCP, across the
# peering established below. Direct VPC egress costs nothing (unlike a
# Serverless VPC Access connector, which runs billable instances), and
# private-ranges-only keeps non-RFC1918 traffic (SMTP, Razorpay, Google APIs)
# egressing straight to the internet so no Cloud NAT is required.

data "google_compute_network" "default" {
  name    = "default"
  project = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "lex-assess-sql-peering-range"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = data.google_compute_network.default.self_link

  # The Google provider inconsistently returns the network data source's
  # self-link as either a full URL or a relative path across plans, and
  # `network` is immutable - without this, every plan risks a spurious
  # destroy-and-recreate (which cascades to the Cloud SQL instance via the
  # peering connection below) even though the network never actually changes.
  lifecycle {
    ignore_changes = [network]
  }
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = data.google_compute_network.default.self_link
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.apis]

  lifecycle {
    ignore_changes = [network]
  }
}
