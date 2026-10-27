# Temporary GCP VPC lab

Throwaway network used to demonstrate the "web and database in separate subnets, private database that can
still patch itself, highly available, custom firewall layer" design for Lex-Assess. It is **not** part of the
production deployment (Cloud Run + Cloud SQL, see `DEPLOYMENT.md`) and is isolated from it: everything is
prefixed `la-` and lives in its own custom VPC `la-vpc`.

```sh
./build.sh      # creates everything (about 3 min), VMs then need 10-15 min to finish their startup scripts
./verify.sh     # read-only evidence: subnets, firewall rules, no external IP on db, NAT, backend health, logs
./teardown.sh   # deletes everything and lists any leftovers; also delete ./.lab-state.env afterwards
```

`WEB_PUBLIC_IP=no ./build.sh` gives the web VMs no external IP (and widens Cloud NAT to both subnets) if an
organisation policy forbids external IPs. Secrets are generated into `./.lab-state.env` (git-ignored, chmod 600)
and handed to the VMs through instance metadata; they are never written to these scripts.
