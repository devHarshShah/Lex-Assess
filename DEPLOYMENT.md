# Deployment

The backend (`apps/backend`) deploys to **Cloud Run** in `asia-south1` (Mumbai — the app is
India-only). CI/CD is `.github/workflows/backend-deploy.yml`: on push to `main` it builds the
Docker image, pushes it to Artifact Registry, runs Prisma migrations as a one-off Cloud Run Job,
then deploys the image to the `lex-assess-backend` Cloud Run service.

The frontend (`apps/frontend`) deploys separately to **Vercel** (see `apps/frontend/vercel.json`)
and is not part of this document.

Backing infra (Cloud SQL, GCS, Secret Manager, IAM) is managed with Terraform in
`infra/terraform/`. Provisioning is a one-time (or infrequent) manual process; day-to-day deploys
only touch the Cloud Run service via CI.

## 1. Bootstrap (one-time, before Terraform can run)

Terraform's state lives in a GCS bucket, which has to exist before `terraform init` can use it as
a backend:

```sh
PROJECT_ID=<your-gcp-project-id>

gcloud storage buckets create "gs://${PROJECT_ID}-tfstate" \
  --location=asia-south1 --uniform-bucket-level-access --project "$PROJECT_ID"
```

Also create the Artifact Registry repository in Mumbai (the workflow pushes images here; it's not
managed by Terraform since it's tied 1:1 to the existing CI/CD pipeline):

```sh
gcloud artifacts repositories create lex-assess \
  --repository-format=docker --location=asia-south1 --project "$PROJECT_ID"
```

> If a `lex-assess` repository or a `lex-assess-backend` Cloud Run service already exists in
> `us-central1` from earlier testing, they can be deleted once the `asia-south1` deployment is
> verified working (`gcloud run services delete lex-assess-backend --region=us-central1`,
> `gcloud artifacts repositories delete lex-assess --location=us-central1`).

## 2. Terraform apply

```sh
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in project_id
terraform init -backend-config="bucket=${PROJECT_ID}-tfstate"
terraform plan
terraform apply
```

This provisions: Private Service Access peering, the Cloud SQL Postgres instance (private IP
only, `db-g1-small`, single zone, daily backups + PITR), the app database + user, the GCS uploads
bucket (versioned), the Cloud Run runtime service account with least-privilege IAM, and empty
Secret Manager secret containers (no values yet).

Read the outputs you'll need next:

```sh
terraform output sql_connection_name
terraform output bucket_name
terraform output runtime_service_account_email
terraform output db_user
terraform output -raw db_password   # sensitive
```

## 3. Push secret values

Terraform only creates secret *containers* — it never writes secret values into state. Push each
one manually:

```sh
CONNECTION_NAME=$(terraform output -raw sql_connection_name)
DB_USER=$(terraform output -raw db_user)
DB_PASSWORD=$(terraform output -raw db_password)
DB_NAME=$(terraform output -raw db_name)

printf 'postgresql://%s:%s@localhost/%s?host=/cloudsql/%s' \
  "$DB_USER" "$DB_PASSWORD" "$DB_NAME" "$CONNECTION_NAME" \
  | gcloud secrets versions add DATABASE_URL --data-file=- --project "$PROJECT_ID"

# Generate/pull the rest from wherever they actually live and push the same way:
echo -n "<value>" | gcloud secrets versions add JWT_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add RAZORPAY_KEY_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add RAZORPAY_WEBHOOK_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add SMTP_PASS --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add GOOGLE_CLIENT_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY --data-file=- --project "$PROJECT_ID"
```

`JWT_SECRET` should be a fresh random value (e.g. `openssl rand -base64 48`), not reused from
local dev. The Razorpay/SMTP/Google values come from those providers' dashboards.

## 4. Set GitHub repo secrets and variables

The workflow references these — set them under repo Settings → Secrets and variables → Actions.

**Secrets:**

| Name | Value |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | (existing — CI/CD deployer WIF provider) |
| `GCP_SERVICE_ACCOUNT` | (existing — CI/CD deployer service account) |
| `GCP_PROJECT_ID` | your GCP project ID |
| `GCP_RUN_SERVICE_ACCOUNT` | `terraform output runtime_service_account_email` |
| `GCP_SQL_CONNECTION_NAME` | `terraform output sql_connection_name` |

**Variables** (non-secret config, referenced as `vars.*` in the workflow):

| Name | Value |
|---|---|
| `FRONTEND_ORIGIN` | the Vercel frontend's URL, e.g. `https://app.lexassess.in` |
| `COOKIE_DOMAIN` | shared apex domain, e.g. `.lexassess.in` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Calendar integration service account email |
| `GCS_BUCKET` | `terraform output bucket_name` |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_PLAN_ID` | Razorpay plan ID |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_SECURE`, `SMTP_FROM` | SMTP config |

The CI/CD deployer service account (`GCP_SERVICE_ACCOUNT`) also needs `roles/iam.serviceAccountUser`
on the new runtime service account so it's allowed to deploy Cloud Run revisions running as it:

```sh
gcloud iam service-accounts add-iam-policy-binding "$(terraform output -raw runtime_service_account_email)" \
  --member="serviceAccount:<GCP_SERVICE_ACCOUNT>" --role="roles/iam.serviceAccountUser" \
  --project "$PROJECT_ID"
```

## 5. Cross-site cookies

The frontend (Vercel) and backend (Cloud Run) are different origins, so the httpOnly auth cookie
needs `SameSite=None; Secure` to be sent cross-site — that's why the workflow sets
`COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` in production. Since the frontend and backend
share a parent domain, `COOKIE_DOMAIN` should be the shared apex (e.g. `.lexassess.in`) so the
cookie is valid across both subdomains. `FRONTEND_ORIGIN` must exactly match the frontend's origin
for CORS in the backend to accept the requests.

## 6. Secret rotation

```sh
gcloud secrets versions add <NAME> --data-file=- --project "$PROJECT_ID"
```

then trigger a redeploy (push to `main`, or re-run the `deploy` job). **Rotating a secret alone
does nothing to already-running revisions** — Cloud Run resolves `:latest` at deploy time and
pins that resolved version to the revision, so a running revision keeps using whatever version was
current when it was deployed until the next deploy picks up the new one.

## Out of scope here

- Wiring `apps/backend/src/scripts/seed-maritime.ts` into CI or an npm script — it remains a
  manual one-off (`pnpm --filter backend exec ts-node src/scripts/seed-maritime.ts`, or run the
  compiled `dist` output).
- Managing the Cloud Run *service* resource in Terraform — it's deployed/updated exclusively by
  `deploy-cloudrun` in CI so the two don't fight over the same resource's state.
- Frontend/Vercel infrastructure.
