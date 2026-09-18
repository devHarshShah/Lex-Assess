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
only, `db-f1-micro`, single zone, daily backups + PITR), the app database + user, the GCS uploads
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

`DATABASE_URL` points at the instance's **private IP over TCP**, not the `/cloudsql/...` Unix
socket — the socket connector requires a public-IP instance and this one is private-only. See the
note at the top of `infra/terraform/network.tf` for the full reasoning.

```sh
DB_USER=$(terraform output -raw db_user)
DB_PASSWORD=$(terraform output -raw db_password)
DB_NAME=$(terraform output -raw db_name)
DB_HOST=$(terraform output -raw sql_private_ip)

printf 'postgresql://%s:%s@%s:5432/%s' \
  "$DB_USER" "$DB_PASSWORD" "$DB_HOST" "$DB_NAME" \
  | gcloud secrets versions add DATABASE_URL --data-file=- --project "$PROJECT_ID"

# Generate/pull the rest from wherever they actually live and push the same way:
echo -n "<value>" | gcloud secrets versions add JWT_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add RAZORPAY_KEY_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add RAZORPAY_WEBHOOK_SECRET --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add SMTP_PASS --data-file=- --project "$PROJECT_ID"
echo -n "<value>" | gcloud secrets versions add GOOGLE_CLIENT_SECRET --data-file=- --project "$PROJECT_ID"
```

Every secret listed here must have **at least one version** before the first deploy. Cloud Run
mounts them as `NAME:latest`, and a secret with zero versions fails the deploy outright; several
are also read with `getOrThrow` at boot (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`), so an empty value crashes the container instead. If a real value isn't
available yet — `RAZORPAY_WEBHOOK_SECRET` can't be generated until Razorpay has the deployed
backend URL — push a placeholder to unblock the deploy and rotate it afterwards (see §6).

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

**Variables** (non-secret config, referenced as `vars.*` in the workflow):

| Name | Value |
|---|---|
| `FRONTEND_ORIGIN` | the Vercel frontend's URL (whatever domain it's actually served from) |
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

…and `compute.subnetworks.use` on the subnet, so it's allowed to deploy revisions with Direct VPC
egress (scoped to the one subnet rather than granted project-wide):

```sh
gcloud compute networks subnets add-iam-policy-binding default \
  --region=asia-south1 --project="$PROJECT_ID" \
  --member="serviceAccount:<GCP_SERVICE_ACCOUNT>" --role="roles/compute.networkUser"
```

Neither binding is in Terraform: the deployer service account itself is provisioned out of band
(it predates this config and is bound to the WIF pool), so Terraform doesn't own either side.

## 4b. Retrying a failed deploy

**Don't push an empty commit.** The pipeline is `ci → build → migrate → deploy` as four separate
jobs precisely so a retry can resume:

```sh
gh run rerun <run-id> --failed
```

Jobs that already succeeded aren't re-run, and `build` short-circuits anyway when the image for
that commit SHA is already in Artifact Registry (images are immutable per SHA), so a rerun after a
migrate or deploy failure takes seconds instead of rebuilding.

For iterating on the Cloud Run configuration itself, skip GitHub entirely and drive it locally
against the already-pushed image — `gcloud run jobs deploy lex-assess-migrate --image <ref> …` /
`gcloud run deploy lex-assess-backend --image <ref> …` — then commit once it works.

## 5. Cross-site cookies

The frontend (Vercel) and backend (Cloud Run, currently on the raw `*.run.app` domain — no custom
domain is wired up yet) are different origins with no shared apex, so `COOKIE_DOMAIN` is
deliberately left unset: setting it to a domain the backend isn't actually served from would make
browsers reject the cookie outright. `buildAuthCookieOptions` (`apps/backend/src/auth/auth-cookie.ts`)
already handles this — an unset `COOKIE_DOMAIN` falls back to `undefined`, which scopes the cookie
to the exact host serving the response. `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` are still
required for the httpOnly auth cookie to be sent cross-site at all. `FRONTEND_ORIGIN` must exactly
match the frontend's actual origin for CORS in the backend to accept the requests.

If `api.lexassess.in` is later put in front of Cloud Run via a load balancer (see the region
limitation noted elsewhere), and the frontend also moves to a `lexassess.in` subdomain, revisit
whether a shared `COOKIE_DOMAIN=.lexassess.in` is worth reintroducing at that point — it isn't
required either way, since `SameSite=None; Secure` already works cross-site.

## 6. Secret rotation

```sh
gcloud secrets versions add <NAME> --data-file=- --project "$PROJECT_ID"
```

then trigger a redeploy without a code change:

```sh
gh workflow run "Backend CI/CD" --ref main
```

(`build` short-circuits on the already-pushed image, so this is quick.) **Rotating a secret alone
does nothing to already-running revisions** — Cloud Run resolves `:latest` at deploy time and
pins that resolved version to the revision, so a running revision keeps using whatever version was
current when it was deployed until the next deploy picks up the new one.

### Razorpay: the placeholders that must be replaced

`RAZORPAY_WEBHOOK_SECRET` and `RAZORPAY_PLAN_ID` are seeded with dummy values, because Razorpay
can't issue a webhook secret until it has a reachable backend URL, and the URL doesn't exist until
the first successful deploy. Once the service is up:

1. Get the URL: `gcloud run services describe lex-assess-backend --region asia-south1 --format='value(status.url)'`
2. Register `<URL>/payments/webhook` in the Razorpay dashboard and copy the generated secret.
3. Push the real values and redeploy:
   ```sh
   echo -n "<real-secret>" | gcloud secrets versions add RAZORPAY_WEBHOOK_SECRET --data-file=- --project "$PROJECT_ID"
   gh variable set RAZORPAY_PLAN_ID --body "<real-plan-id>"
   ```

Until step 3, payment webhooks will fail signature verification — everything else works.

## 7. Seeding question papers

Each `apps/backend/src/scripts/seed-*.ts` seeds one practice-area's paper. They **look up** their
category by name (`prisma.specialization.findUniqueOrThrow`) rather than creating one — the
categories a student can pick are owned exclusively by `PrismaService.seedProfileDefaults()`, which
runs at app boot. This is deliberate: `UserProfile.specialization` is a plain string matched by
name against `Specialization.name` (not a foreign key), so if a seed script invented its own
category name, students would see duplicate/mismatched categories and picking one might return no
papers. If a seed script's `findUniqueOrThrow` throws, the category name and the
`specializationDefaults` list in `prisma.service.ts` have drifted — fix the name, don't add a
`create`.

One category is load-bearing in a way that's easy to miss: `ProfileSetupPage.tsx` locks students in
their 1st-3rd year to the `General` category with no other option, so
`seed-legal-research-skills.ts` (the paper written for that audience) attaches to `General`, not to
a category of its own.

Run every seed script and reconcile category visibility in one pass:

```sh
IMAGE="asia-south1-docker.pkg.dev/${PROJECT_ID}/lex-assess/lex-assess-backend:<sha>"

gcloud run jobs deploy lex-assess-seed \
  --image "$IMAGE" --region asia-south1 --project "$PROJECT_ID" \
  --command=node --args="dist/src/scripts/seed-all.js" \
  --memory=512Mi --task-timeout=900s \
  --service-account "lex-assess-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --network=default --subnet=default --vpc-egress=private-ranges-only \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --execute-now --wait
```

`seed-all.js` runs every script in `SEED_SCRIPTS`, then sets `isActive` on every category to
whether it has at least one paper with a `PUBLISHED` version — so a category nobody has written a
paper for never appears in the profile dropdown, and adding a new paper later and re-running this
job re-activates its category automatically.

**Re-running is not fully idempotent for live papers**: each script does
`paperSection.deleteMany`/`question.deleteMany` on its own version before recreating them, which is
harmless while no `TestAttempt` references those questions, but would orphan or corrupt scoring for
any student who has already attempted that paper. Don't re-run a paper's seed script once real
attempts exist against it — edit through the admin UI instead.

### Admin credentials

`PrismaService.seedDefaults()` creates `superadmin@lexassess.com` and `admin@lexassess.com` on
first boot with `SEED_ADMIN_PASSWORD` (falling back to `Pass@123` only when that env var is unset —
local dev only). To set/rotate real passwords and remove the `student@`/`company@` demo logins
(which are only ever created when `NODE_ENV !== 'production'`):

```sh
openssl rand -base64 24 | tr -d '\n' | gcloud secrets create SEED_ADMIN_PASSWORD --data-file=- --project "$PROJECT_ID"
openssl rand -base64 24 | tr -d '\n' | gcloud secrets create SEED_SUPERADMIN_PASSWORD --data-file=- --project "$PROJECT_ID"

gcloud run jobs deploy lex-assess-reset-admin \
  --image "$IMAGE" --region asia-south1 --project "$PROJECT_ID" \
  --command=node --args="dist/src/scripts/reset-admin-credentials.js" \
  --memory=512Mi \
  --service-account "lex-assess-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --network=default --subnet=default --vpc-egress=private-ranges-only \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,SEED_ADMIN_PASSWORD=SEED_ADMIN_PASSWORD:latest,SEED_SUPERADMIN_PASSWORD=SEED_SUPERADMIN_PASSWORD:latest" \
  --execute-now --wait
```

These two secrets are human credentials, not app config the runtime service reads on every
request, so they're created directly with `gcloud` rather than through Terraform, and the Cloud Run
*service* never mounts them — only this one-off job does.

### Repairing a drifted subscription link

`createSubscription` is idempotent as of the fix in `payments.service.ts` (reuses an existing live
subscription instead of creating a new one), and `verifyWebhook` resolves the user via
`notes.userId` rather than an exact `razorpaySubscriptionId` match, so this class of bug shouldn't
recur. If an account was affected before that fix — `hasActiveSubscription: false` despite a
`captured` `Transaction` row, because a re-subscribe overwrote the pointer before the original
webhook landed — repair it with:

```sh
gcloud run jobs deploy lex-assess-repair-subscription \
  --image "$IMAGE" --region asia-south1 --project "$PROJECT_ID" \
  --command=node --args="dist/src/scripts/repair-subscription.js" \
  --memory=512Mi \
  --service-account "lex-assess-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --network=default --subnet=default --vpc-egress=private-ranges-only \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --set-env-vars "REPAIR_USER_EMAIL=<email>,REPAIR_SUBSCRIPTION_ID=<the subscription id from the paid Transaction row>" \
  --execute-now --wait
```

## Out of scope here

- Managing the Cloud Run *service* resource in Terraform — it's deployed/updated exclusively by
  `deploy-cloudrun` in CI so the two don't fight over the same resource's state.
- Frontend/Vercel infrastructure.
