#!/usr/bin/env bash
# Builds the temporary Lex-Assess VPC lab. Every resource is prefixed "la-" and lives in its own
# custom-mode VPC (la-vpc). It never touches the default network, Cloud Run or Cloud SQL.
# Run from this folder with gcloud authenticated. Tear down afterwards with ./teardown.sh.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="${PROJECT:-lexassess-509005}"
REGION=asia-south1
ZONE_A=asia-south1-a
ZONE_B=asia-south1-b
REPO_URL="${REPO_URL:-https://github.com/devHarshShah/Lex-Assess.git}"
REPO_REF="${REPO_REF:-main}"
WEB_PUBLIC_IP="${WEB_PUBLIC_IP:-yes}"   # set to "no" if an org policy forbids external IPs
STATE=./.lab-state.env

[ "$(gcloud config get-value project 2>/dev/null)" = "$PROJECT" ] || { echo "gcloud project is not $PROJECT"; exit 1; }
gcloud config set compute/region "$REGION" >/dev/null
gcloud config set compute/zone "$ZONE_A" >/dev/null

# Secrets are generated once and kept only in this local file (chmod 600).
if [ ! -f "$STATE" ]; then
  {
    echo "DB_PASS=$(openssl rand -hex 16)"
    echo "APP_PASS=$(openssl rand -hex 16)"
    echo "REPL_PASS=$(openssl rand -hex 16)"
    echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "ADMIN_PASS=$(openssl rand -hex 8)Aa1"
    echo "LAB_BUCKET=lexassess-lab-uploads-$(openssl rand -hex 3)"
  } > "$STATE"
  chmod 600 "$STATE"
fi
# shellcheck disable=SC1090
source "$STATE"

has() { "$@" >/dev/null 2>&1; }
step() { echo; echo "=== $*"; }

step "1. VPC network and subnets (first address 10.0.0.0, each subnet a /24 = 256 addresses)"
has gcloud compute networks describe la-vpc || \
  gcloud compute networks create la-vpc --subnet-mode=custom --bgp-routing-mode=regional
has gcloud compute networks subnets describe la-subnet-web --region=$REGION || \
  gcloud compute networks subnets create la-subnet-web --network=la-vpc --region=$REGION --range=10.0.0.0/24
has gcloud compute networks subnets describe la-subnet-db --region=$REGION || \
  gcloud compute networks subnets create la-subnet-db --network=la-vpc --region=$REGION --range=10.0.1.0/24 \
    --enable-private-ip-google-access

step "2. Custom firewall layer (VPC firewall rules, targeted by network tag)"
fw() { local n=$1; shift; has gcloud compute firewall-rules describe "$n" || gcloud compute firewall-rules create "$n" --network=la-vpc "$@"; }
fw la-allow-lb-to-web      --direction=INGRESS --priority=1000 --action=ALLOW --rules=tcp:80 \
                           --source-ranges=130.211.0.0/22,35.191.0.0/16 --target-tags=la-web
fw la-allow-web-to-db      --direction=INGRESS --priority=1000 --action=ALLOW --rules=tcp:5432 \
                           --source-tags=la-web --target-tags=la-db
fw la-allow-db-replication --direction=INGRESS --priority=1000 --action=ALLOW --rules=tcp:5432 \
                           --source-tags=la-db --target-tags=la-db
fw la-allow-iap-ssh        --direction=INGRESS --priority=1000 --action=ALLOW --rules=tcp:22 \
                           --source-ranges=35.235.240.0/20 --target-tags=la-web,la-db
fw la-deny-all-ingress     --direction=INGRESS --priority=65000 --action=DENY --rules=all \
                           --source-ranges=0.0.0.0/0
fw la-allow-db-egress-web  --direction=EGRESS --priority=1000 --action=ALLOW --rules=tcp:80,tcp:443 \
                           --destination-ranges=0.0.0.0/0 --target-tags=la-db
fw la-allow-db-egress-sql  --direction=EGRESS --priority=1000 --action=ALLOW --rules=tcp:5432 \
                           --destination-ranges=10.0.0.0/16 --target-tags=la-db
fw la-deny-db-egress       --direction=EGRESS --priority=2000 --action=DENY --rules=all \
                           --destination-ranges=0.0.0.0/0 --target-tags=la-db

step "3. Cloud Router and Cloud NAT (internet for the private database subnet only)"
NAT_RANGES="--nat-custom-subnet-ip-ranges=la-subnet-db"
[ "$WEB_PUBLIC_IP" = "no" ] && NAT_RANGES="--nat-all-subnet-ip-ranges"
has gcloud compute routers describe la-router --region=$REGION || \
  gcloud compute routers create la-router --network=la-vpc --region=$REGION
has gcloud compute routers nats describe la-nat --router=la-router --region=$REGION || \
  gcloud compute routers nats create la-nat --router=la-router --region=$REGION \
    $NAT_RANGES --auto-allocate-nat-external-ips --enable-logging --log-filter=ALL

step "4. Service accounts and a throwaway uploads bucket (production bucket is NOT used)"
SA_WEB="la-web-sa@${PROJECT}.iam.gserviceaccount.com"
SA_DB="la-db-sa@${PROJECT}.iam.gserviceaccount.com"
has gcloud iam service-accounts describe "$SA_WEB" || gcloud iam service-accounts create la-web-sa --display-name="Lab web servers"
has gcloud iam service-accounts describe "$SA_DB"  || gcloud iam service-accounts create la-db-sa  --display-name="Lab database servers (no roles)"
has gcloud storage buckets describe "gs://$LAB_BUCKET" || \
  gcloud storage buckets create "gs://$LAB_BUCKET" --location=$REGION --uniform-bucket-level-access
sleep 10
gcloud storage buckets add-iam-policy-binding "gs://$LAB_BUCKET" --member="serviceAccount:$SA_WEB" --role=roles/storage.objectAdmin >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$LAB_BUCKET" --member="serviceAccount:$SA_WEB" --role=roles/storage.legacyBucketReader >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$SA_WEB" --member="serviceAccount:$SA_WEB" \
  --role=roles/iam.serviceAccountTokenCreator >/dev/null

step "5. Reserve the load balancer's global IP (the web servers need it for FRONTEND_ORIGIN)"
has gcloud compute addresses describe la-lb-ip --global || gcloud compute addresses create la-lb-ip --global --ip-version=IPV4
LB_IP=$(gcloud compute addresses describe la-lb-ip --global --format='value(address)')
echo "LB_IP=$LB_IP"

step "6. Database VMs (private subnet, NO external IP): primary in zone A, standby in zone B"
has gcloud compute instances describe la-db-primary --zone=$ZONE_A || \
gcloud compute instances create la-db-primary --zone=$ZONE_A --machine-type=e2-small \
  --subnet=la-subnet-db --private-network-ip=10.0.1.10 --no-address --tags=la-db \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud --boot-disk-size=20GB \
  --service-account="$SA_DB" --scopes=logging-write \
  --metadata-from-file=startup-script=startup-db-primary.sh \
  --metadata="db-pass=$DB_PASS,app-pass=$APP_PASS,repl-pass=$REPL_PASS"
has gcloud compute instances describe la-db-standby --zone=$ZONE_B || \
gcloud compute instances create la-db-standby --zone=$ZONE_B --machine-type=e2-small \
  --subnet=la-subnet-db --private-network-ip=10.0.1.11 --no-address --tags=la-db \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud --boot-disk-size=20GB \
  --service-account="$SA_DB" --scopes=logging-write \
  --metadata-from-file=startup-script=startup-db-standby.sh \
  --metadata="repl-pass=$REPL_PASS"

step "7. Web VMs (web subnet), one per zone"
ADDR_FLAG=""; [ "$WEB_PUBLIC_IP" = "no" ] && ADDR_FLAG="--no-address"
mkweb() { # name zone
  has gcloud compute instances describe "$1" --zone="$2" || \
  gcloud compute instances create "$1" --zone="$2" --machine-type=e2-medium \
    --subnet=la-subnet-web $ADDR_FLAG --tags=la-web \
    --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud --boot-disk-size=30GB \
    --service-account="$SA_WEB" --scopes=cloud-platform \
    --metadata-from-file=startup-script=startup-web.sh \
    --metadata="lb-ip=$LB_IP,db-ip=10.0.1.10,app-pass=$APP_PASS,jwt-secret=$JWT_SECRET,admin-pass=$ADMIN_PASS,bucket=$LAB_BUCKET,project=$PROJECT,repo-url=$REPO_URL,repo-ref=$REPO_REF"
}
mkweb la-web-1 $ZONE_A
mkweb la-web-2 $ZONE_B

step "8. Instance groups, health check, backend service and the external Application Load Balancer"
for pair in "la-web-ig-a:$ZONE_A:la-web-1" "la-web-ig-b:$ZONE_B:la-web-2"; do
  IFS=: read -r ig z vm <<<"$pair"
  has gcloud compute instance-groups unmanaged describe "$ig" --zone="$z" || {
    gcloud compute instance-groups unmanaged create "$ig" --zone="$z"
    gcloud compute instance-groups unmanaged add-instances "$ig" --zone="$z" --instances="$vm"
    gcloud compute instance-groups set-named-ports "$ig" --zone="$z" --named-ports=http:80
  }
done
has gcloud compute health-checks describe la-web-hc || \
  gcloud compute health-checks create http la-web-hc --port=80 --request-path=/ \
    --check-interval=10s --timeout=5s --healthy-threshold=2 --unhealthy-threshold=3
has gcloud compute backend-services describe la-web-backend --global || {
  gcloud compute backend-services create la-web-backend --global --load-balancing-scheme=EXTERNAL_MANAGED \
    --protocol=HTTP --port-name=http --health-checks=la-web-hc
  gcloud compute backend-services add-backend la-web-backend --global --instance-group=la-web-ig-a --instance-group-zone=$ZONE_A
  gcloud compute backend-services add-backend la-web-backend --global --instance-group=la-web-ig-b --instance-group-zone=$ZONE_B
}
has gcloud compute url-maps describe la-lb || gcloud compute url-maps create la-lb --default-service=la-web-backend
has gcloud compute target-http-proxies describe la-http-proxy || \
  gcloud compute target-http-proxies create la-http-proxy --url-map=la-lb
has gcloud compute forwarding-rules describe la-http-rule --global || \
  gcloud compute forwarding-rules create la-http-rule --global --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=la-lb-ip --target-http-proxy=la-http-proxy --ports=80

step "Done creating. The VMs now run their startup scripts (about 10-15 minutes for the web servers)."
echo "Load balancer: http://$LB_IP/"
echo "Admin login after the app is up: admin@lexassess.com / (password is ADMIN_PASS in $STATE)"
echo "Next: ./verify.sh   (read-only checks)   and   ./teardown.sh   when finished"
