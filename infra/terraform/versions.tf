terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "gcs" {
    # Bucket must exist before `terraform init` (see DEPLOYMENT.md bootstrap step).
    # bucket = "<project-id>-tfstate"
    prefix = "lex-assess/infra"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # Some APIs (e.g. billingbudgets.googleapis.com) require an explicit quota project when
  # authenticating via user Application Default Credentials rather than a service account.
  user_project_override = true
  billing_project       = var.project_id
}
