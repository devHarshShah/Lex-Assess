#!/bin/bash
# la-db-primary: PostgreSQL primary. Secrets come from instance metadata, never from this file.
MARK=/var/lib/la-db-setup-done
[ -f "$MARK" ] && exit 0
export DEBIAN_FRONTEND=noninteractive
md() { curl -fsS -H 'Metadata-Flavor: Google' "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1"; }
DB_PASS=$(md db-pass)
APP_PASS=$(md app-pass)
REPL_PASS=$(md repl-pass)

apt-get update -y
apt-get install -y postgresql
PGV=$(ls /etc/postgresql | head -1)
CONF=/etc/postgresql/$PGV/main
sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/" $CONF/postgresql.conf
echo "host all all 10.0.0.0/16 scram-sha-256" >> $CONF/pg_hba.conf
echo "host replication replicator 10.0.1.0/24 scram-sha-256" >> $CONF/pg_hba.conf
systemctl restart postgresql

sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASS';" >/dev/null
sudo -u postgres psql -c "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '$REPL_PASS';" >/dev/null
sudo -u postgres psql -c "CREATE ROLE lex_assess_app WITH LOGIN PASSWORD '$APP_PASS';" >/dev/null
sudo -u postgres createdb -O lex_assess_app lex_assess
touch "$MARK"
echo "LA-DB-READY"
