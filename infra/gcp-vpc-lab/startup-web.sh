#!/bin/bash
# la-web-1 / la-web-2: nginx + React build + NestJS API (Lex-Assess). Secrets come from instance metadata.
MARK=/var/lib/la-web-setup-done
[ -f "$MARK" ] && exit 0
export HOME=/root DEBIAN_FRONTEND=noninteractive COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NODE_OPTIONS=--max-old-space-size=2048
md() { curl -fsS -H 'Metadata-Flavor: Google' "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1"; }
LB_IP=$(md lb-ip); DB_IP=$(md db-ip); APP_PASS=$(md app-pass); JWT_SECRET=$(md jwt-secret)
ADMIN_PASS=$(md admin-pass); BUCKET=$(md bucket); PROJECT=$(md project)
REPO_URL=$(md repo-url); REPO_REF=$(md repo-ref)

fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
apt-get update -y
apt-get install -y nginx git curl build-essential ca-certificates
systemctl stop nginx   # keep the load balancer health check red until the app is really built
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable

git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" /opt/la
cd /opt/la
pnpm install --frozen-lockfile --filter backend... --filter frontend...

cd /opt/la/apps/backend
cat > .env <<ENVEOF
PORT=3000
FRONTEND_ORIGIN=http://$LB_IP
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://lex_assess_app:$APP_PASS@$DB_IP:5432/lex_assess?schema=public
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
TRUST_PROXY_HOPS=2
SEED_ADMIN_PASSWORD=$ADMIN_PASS
STORAGE_PROVIDER=gcs
GCS_PROJECT_ID=$PROJECT
GCS_BUCKET=$BUCKET
RAZORPAY_KEY_ID=lab-placeholder
RAZORPAY_KEY_SECRET=lab-placeholder
RAZORPAY_WEBHOOK_SECRET=lab-placeholder
ENVEOF
chmod 600 .env
pnpm exec prisma generate
# Both web servers run the migration; Prisma takes a lock, and the loop waits for the database.
for i in $(seq 1 40); do pnpm exec prisma migrate deploy && break; sleep 15; done
cd /opt/la && pnpm --filter backend build

cat > /etc/systemd/system/la-backend.service <<'SVCEOF'
[Unit]
Description=Lex-Assess backend
After=network-online.target
[Service]
WorkingDirectory=/opt/la/apps/backend
EnvironmentFile=/opt/la/apps/backend/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/src/main
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable --now la-backend

cd /opt/la/apps/frontend
VITE_API_BASE_URL=/api pnpm build
mkdir -p /var/www/lexassess && rm -rf /var/www/lexassess/* && cp -r dist/* /var/www/lexassess/

cat > /etc/nginx/sites-available/default <<'NGXEOF'
server {
    listen 80 default_server;
    root /var/www/lexassess;
    index index.html;
    client_max_body_size 10m;
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
    }
    location / { try_files $uri /index.html; }
}
NGXEOF
systemctl start nginx
touch "$MARK"
echo "LA-WEB-READY"
