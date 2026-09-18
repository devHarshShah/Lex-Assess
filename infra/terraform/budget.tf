# Monthly budget ceiling with early-warning alerts. This is a safety net, not an expected-spend
# figure - GCP applies any available promotional credit before charging a real card
# (credit_types_treatment defaults to INCLUDE_ALL_CREDITS), so this tracks what would actually be
# billed, not gross usage. Notifications go to billing account admins/users by default - no
# Pub/Sub or Monitoring channel needed at this scale.
data "google_project" "current" {
  project_id = var.project_id
}

resource "google_billing_budget" "monthly" {
  billing_account = var.billing_account_id
  display_name    = "lex-assess-monthly-budget"

  budget_filter {
    # The Billing Budgets API always stores/returns this as the numeric
    # project number, not the project ID string - using the ID here would
    # show a permanent, harmless-but-noisy diff on every plan.
    projects = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      currency_code = "INR"
      units         = tostring(var.budget_amount_inr)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.8
  }
  threshold_rules {
    threshold_percent = 1.0
  }

  depends_on = [google_project_service.apis]
}
