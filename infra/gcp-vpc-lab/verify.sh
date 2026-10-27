#!/usr/bin/env bash
# Read-only evidence for the report. Passwords are never printed.
cd "$(dirname "$0")"
REGION=asia-south1
[ -f ./.lab-state.env ] && source ./.lab-state.env
LB_IP=$(gcloud compute addresses describe la-lb-ip --global --format='value(address)' 2>/dev/null)
h() { echo; echo "##### $*"; }

h "Network and subnets"
gcloud compute networks list --filter="name=la-vpc" --format="table(name,x_gcp_mode:label=MODE,IPv4Range,routingConfig.routingMode)"
gcloud compute networks subnets list --filter="network~la-vpc" --format="table(name,region,ipCidrRange,gatewayAddress,privateIpGoogleAccess)"
h "Firewall rules"
gcloud compute firewall-rules list --filter="network~la-vpc" --sort-by=priority \
  --format="table(name,direction,priority,allowed[].map().firewall_rule().list():label=ALLOW,denied[].map().firewall_rule().list():label=DENY,sourceRanges.list():label=SRC,sourceTags.list():label=SRC_TAGS,destinationRanges.list():label=DST,targetTags.list():label=TARGET_TAGS)"
h "Instances (EXTERNAL_IP must be empty for the db VMs)"
gcloud compute instances list --filter="name~^la-" --format="table(name,zone.basename(),machineType.basename(),status,networkInterfaces[0].subnetwork.basename():label=SUBNET,networkInterfaces[0].networkIP:label=INTERNAL_IP,networkInterfaces[0].accessConfigs[0].natIP:label=EXTERNAL_IP,tags.items.list():label=TAGS)"
h "Cloud Router and NAT"
gcloud compute routers nats describe la-nat --router=la-router --region=$REGION --format="yaml(name,natIpAllocateOption,sourceSubnetworkIpRangesToNat,subnetworks,logConfig)"
gcloud compute routers get-status la-router --region=$REGION --format="yaml(result.natStatus)"
h "Load balancer"
gcloud compute forwarding-rules list --filter="name=la-http-rule" --format="table(name,IPAddress,IPProtocol,portRange,loadBalancingScheme)"
gcloud compute backend-services get-health la-web-backend --global
h "HTTP checks through the load balancer"
echo "GET /          -> $(curl -s -o /dev/null -m 15 -w '%{http_code} in %{time_total}s' http://$LB_IP/)"
echo "GET /api/health -> $(curl -s -m 15 -w ' [%{http_code}]' http://$LB_IP/api/health)"
h "Database VM serial logs: NAT proof (package downloads) and ready markers"
for p in "la-db-primary asia-south1-a" "la-db-standby asia-south1-b"; do
  set -- $p
  echo "--- $1"
  gcloud compute instances get-serial-port-output "$1" --zone="$2" 2>/dev/null \
    | grep -E "Get:[0-9]+ http|archive.ubuntu.com|pg_basebackup|LA-DB" | head -n 12
done
h "Web VM serial logs: ready markers"
for p in "la-web-1 asia-south1-a" "la-web-2 asia-south1-b"; do
  set -- $p; echo "--- $1"
  gcloud compute instances get-serial-port-output "$1" --zone="$2" 2>/dev/null | grep -E "LA-WEB-READY|ERR_|ELIFECYCLE" | head -n 5
done
