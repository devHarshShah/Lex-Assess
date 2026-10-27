#!/usr/bin/env bash
# Deletes everything build.sh created. Only "la-" resources and the lab bucket are touched.
set -uo pipefail
cd "$(dirname "$0")"
PROJECT="${PROJECT:-lexassess-509005}"; REGION=asia-south1; ZONE_A=asia-south1-a; ZONE_B=asia-south1-b
[ "$(gcloud config get-value project 2>/dev/null)" = "$PROJECT" ] || { echo "gcloud project is not $PROJECT"; exit 1; }
[ -f ./.lab-state.env ] && source ./.lab-state.env
d() { echo "+ $*"; "$@" --quiet 2>&1 | tail -n 2; }

d gcloud compute forwarding-rules delete la-http-rule --global
d gcloud compute target-http-proxies delete la-http-proxy
d gcloud compute url-maps delete la-lb
d gcloud compute backend-services delete la-web-backend --global
d gcloud compute health-checks delete la-web-hc
d gcloud compute instance-groups unmanaged delete la-web-ig-a --zone=$ZONE_A
d gcloud compute instance-groups unmanaged delete la-web-ig-b --zone=$ZONE_B
d gcloud compute instances delete la-web-1 --zone=$ZONE_A
d gcloud compute instances delete la-web-2 --zone=$ZONE_B
d gcloud compute instances delete la-db-primary --zone=$ZONE_A
d gcloud compute instances delete la-db-standby --zone=$ZONE_B
d gcloud compute routers nats delete la-nat --router=la-router --region=$REGION
d gcloud compute routers delete la-router --region=$REGION
d gcloud compute addresses delete la-lb-ip --global
for r in la-allow-lb-to-web la-allow-web-to-db la-allow-db-replication la-allow-iap-ssh la-deny-all-ingress \
         la-allow-db-egress-web la-allow-db-egress-sql la-deny-db-egress; do d gcloud compute firewall-rules delete $r; done
d gcloud compute networks subnets delete la-subnet-web --region=$REGION
d gcloud compute networks subnets delete la-subnet-db --region=$REGION
d gcloud compute networks delete la-vpc
[ -n "${LAB_BUCKET:-}" ] && d gcloud storage rm -r "gs://$LAB_BUCKET"
d gcloud iam service-accounts delete "la-web-sa@${PROJECT}.iam.gserviceaccount.com"
d gcloud iam service-accounts delete "la-db-sa@${PROJECT}.iam.gserviceaccount.com"

echo; echo "=== Leftover check (all lists below should be empty) ==="
gcloud compute instances list --filter="name~^la-"
gcloud compute networks list --filter="name~^la-"
gcloud compute addresses list --filter="name~^la-"
gcloud compute forwarding-rules list --filter="name~^la-"
gcloud compute routers list --filter="name~^la-"
gcloud compute firewall-rules list --filter="name~^la-"
gcloud iam service-accounts list --filter="email~^la-"
echo "Local secrets file ./.lab-state.env can now be deleted."
