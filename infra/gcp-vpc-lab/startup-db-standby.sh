#!/bin/bash
# la-db-standby: streaming-replication standby of la-db-primary (10.0.1.10).
MARK=/var/lib/la-db-setup-done
[ -f "$MARK" ] && exit 0
export DEBIAN_FRONTEND=noninteractive
md() { curl -fsS -H 'Metadata-Flavor: Google' "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1"; }
REPL_PASS=$(md repl-pass)
PRIMARY_IP="10.0.1.10"

apt-get update -y
apt-get install -y postgresql
PGV=$(ls /etc/postgresql | head -1)
DATA=/var/lib/postgresql/$PGV/main
systemctl stop postgresql
# The primary may still be starting: retry until the base backup succeeds.
until rm -rf $DATA/* && sudo -u postgres env PGPASSWORD="$REPL_PASS" pg_basebackup -h $PRIMARY_IP -U replicator -D $DATA -R -X stream; do sleep 15; done
systemctl start postgresql
touch "$MARK"
echo "LA-DB-STANDBY-READY"
