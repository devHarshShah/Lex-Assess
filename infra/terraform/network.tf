# Private Service Access peering so Cloud SQL can get a private IP.
# Cloud Run's native Cloud SQL integration (--add-cloudsql-instances) does not
# need a Serverless VPC Access connector even for a private-IP instance -
# Google manages that tunnel - but the private IP itself still requires this
# one-time VPC peering to exist.

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
