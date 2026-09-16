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
  network       = data.google_compute_network.default.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = data.google_compute_network.default.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]

  depends_on = [google_project_service.apis]
}
