# Purvaja Fashion Atelier — Hostinger Production Deployment Runbook

> **Target Platform**: Hostinger (Portable between **Hostinger VPS** and **Hostinger Cloud / Web Hosting with Node.js**).  
> **Architecture**: React 19 / Vite SPA → Express API → Prisma ORM → PostgreSQL.  
> **Phase Objective**: Prepare complete production deployment readiness, hardening, configuration contracts, and operational procedures **WITHOUT** launching live production instances or enabling real PhonePe payments.

---

## Table of Contents
- [A. Production Architecture Overview](#a-production-architecture-overview)
- [B. System Prerequisites & Runtime Requirements](#b-system-prerequisites--runtime-requirements)
- [C. Hostinger Plan Considerations (Option A vs Option B)](#c-hostinger-plan-considerations)
- [D. Domain & DNS Configuration](#d-domain--dns-configuration)
- [E. HTTPS & TLS Certificate Setup](#e-https--tls-certificate-setup)
- [F. PostgreSQL Database Architecture & Connection Pooling](#f-postgresql-database-architecture--connection-pooling)
- [G. Production Environment Variables Contract](#g-production-environment-variables-contract)
- [H. Production Build Pipeline](#h-production-build-pipeline)
- [I. Prisma Production Migrations Workflow](#i-prisma-production-migrations-workflow)
- [J. Backend Startup & Process Supervision](#j-backend-startup--process-supervision)
- [K. Frontend Deployment](#k-frontend-deployment)
- [L. Nginx Reverse Proxy & Static Web Server Setup](#l-nginx-reverse-proxy--static-web-server-setup)
- [M. Cookie, CORS, and CSRF Security Policy](#m-cookie-cors-and-csrf-security-policy)
- [N. Transactional Email via Resend](#n-transactional-email-via-resend)
- [O. Optional Redis Shared Cache & Fallback Architecture](#o-optional-redis-shared-cache--fallback-architecture)
- [P. Payment Provider Safety: Demo UPI vs Real PhonePe](#p-payment-provider-safety-demo-upi-vs-real-phonepe)
- [Q. Database Backups, Retention, & Restore Drills](#q-database-backups-retention--restore-drills)
- [R. Structured Logging, Auditing, & Secret Redaction](#r-structured-logging-auditing--secret-redaction)
- [S. Health Probes & Readiness Endpoints](#s-health-probes--readiness-endpoints)
- [T. Staging Smoke-Testing Verification Checklist](#t-staging-smoke-testing-verification-checklist)
- [U. Rollback & Disaster Recovery Procedures](#u-rollback--disaster-recovery-procedures)
- [V. Production Go-Live Checklist](#v-production-go-live-checklist)

---

## A. Production Architecture Overview

The Purvaja Fashion E-Commerce application uses a decoupled monorepo architecture:
- **Client Tier (`frontend/`)**: High-performance React 19 Single-Page Application bundled with Vite. Contains zero secrets and communicates with the backend solely via JSON HTTP APIs.
- **Application Tier (`backend/`)**: Node.js 20+ Express server implementing Argon2id authentication, PostgreSQL-backed sessions, server-side RBAC, double-submit CSRF protection, rate limiting, and HTTP response compression.
- **Data Tier (`backend/prisma/`)**: PostgreSQL relational database managed via Prisma ORM with `@prisma/adapter-pg` connection pooling.
- **Cache Tier (Optional)**: Redis for caching public published customer reviews. PostgreSQL remains the permanent source of truth; if Redis is unavailable, the application gracefully falls back to PostgreSQL without degraded capabilities.
- **Email Tier**: Resend transactional email initiated solely through the backend API.
- **Payment Tier**: UPI-only payment architecture with provider abstraction. (Phase 10 preserves the demo UPI provider for testing; real PhonePe integration is blocked until Phase 12).

---

## B. System Prerequisites & Runtime Requirements

- **Node.js**: `v20.x` LTS or `v22.x` LTS (validated in `.nvmrc` and root `package.json`).
- **Package Manager**: `pnpm` (version `11.22.0` or >= `9.0.0`).
  ```bash
  # Enable on Hostinger VPS:
  corepack enable
  corepack prepare pnpm@11.22.0 --activate
  ```
- **Operating System**: Linux (Ubuntu 22.04/24.04 LTS or Debian 12 recommended on VPS; CloudLinux on shared/cloud hosting).
- **PostgreSQL**: Version 15+ or 16+ with SSL enabled.
- **OpenSSL / Crypto**: Supported OpenSSL libraries for Argon2id and SHA-256 session token hashing.

---

## C. Hostinger Plan Considerations

The application code is strictly portable and contains no VPS-only assumptions. Two deployment topologies are supported:

### OPTION A — HOSTINGER VPS *(Recommended for full control)*
- **Applicable Plans**: Hostinger KVM 1, KVM 2, KVM 4, or KVM 8.
- **Characteristics**:
  - Full root SSH access.
  - Custom Nginx reverse proxy serving static frontend files and proxying `/api/` requests to Node.js.
  - Process management via **PM2** with cluster mode and automated startup on reboot (`systemd`).
  - Optional local or internal Redis container/service (`127.0.0.1:6379`).
  - Strict firewall (`ufw`) allowing only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).

### OPTION B — HOSTINGER CLOUD / WEB / NODE.JS HOSTING *(Managed environment)*
- **Applicable Plans**: Hostinger Cloud Startup / Cloud Professional / Cloud Enterprise, or Business Web Hosting with Node.js Selector.
- **Characteristics**:
  - Node.js runtime managed via Hostinger hPanel Node.js Selector (powered by Phusion Passenger / LiteSpeed).
  - Frontend static bundle deployed to `public_html/` with `.htaccess` rewrite rules for client-side routing.
  - Backend executed as an internal Node.js application listening on the dynamically assigned `PORT` / socket.
  - Environment variables configured via the hPanel Node.js application management panel.
  - Database provided by Hostinger Remote PostgreSQL or external managed PostgreSQL.

> [!NOTE]
> Instructions depending on the specific hosting plan are explicitly noted throughout this guide.

---

## D. Domain & DNS Configuration

> [!IMPORTANT]
> `MANUAL INFRASTRUCTURE STEP — NOT VERIFIED LOCALLY`  
> Do not use actual production credentials or modify live DNS records until the final production maintenance window.

Configure DNS records in your domain registrar or Hostinger DNS Zone Editor:

| Host / Name | Type | Value / Destination | TTL | Purpose |
| :--- | :---: | :--- | :---: | :--- |
| `@` | `A` | `<HOSTINGER_SERVER_IP>` | 300 | Primary apex domain (`https://example.com`) |
| `www` | `CNAME` | `example.com` (or `<HOSTINGER_SERVER_IP>`) | 300 | Canonical www redirect |
| `api` | `A` | `<HOSTINGER_SERVER_IP>` | 300 | *(Optional)* If using dedicated API subdomain |

---

## E. HTTPS & TLS Certificate Setup

Production security strictly requires HTTPS. Cookies are flagged `secure: true`, meaning authentication will fail on unencrypted HTTP.

### Option A: Hostinger VPS (Let's Encrypt with Certbot)
```bash
# MANUAL INFRASTRUCTURE STEP — NOT VERIFIED LOCALLY
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```
*Verify auto-renewal timer*:
```bash
sudo systemctl status certbot.timer
```

### Option B: Hostinger Cloud/Web Hosting (hPanel)
1. Log in to **Hostinger hPanel**.
2. Navigate to **Security → SSL**.
3. Activate the **Lifetime Free SSL** certificate for the apex domain and `www`.
4. Enable **Force HTTPS** toggle.

---

## F. PostgreSQL Database Architecture & Connection Pooling

### Connection Strings
- **`DATABASE_URL`**: Used by the Express API application runtime. Connects via `@prisma/adapter-pg` with a pooled client (`pg.Pool`).
  ```text
  postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>?schema=public&sslmode=require
  ```
- **`DIRECT_URL`**: Used exclusively by Prisma CLI commands (`pnpm db:migrate:deploy`). Bypasses transaction-level connection poolers (such as PgBouncer) so session-level migration locks can execute safely.

### Strict SSL Requirement
- **`sslmode=require`** (or `sslmode=verify-ca`, `sslmode=verify-full`) is **strictly mandatory** for production and staging.
- Omitting `sslmode` or specifying `sslmode=no-verify` causes an **immediate hard validation failure** at startup and in `pnpm validate:config`.
- Applies to both `DATABASE_URL` and `DIRECT_URL`.

---

## G. Production Environment Variables Contract

Never commit real credentials to source control. Configure these variables on the target server:

### Backend Production Environment (`backend/.env` or hPanel Environment Manager)
```bash
# Runtime Mode
NODE_ENV=production

# Server Binding
PORT=5001
HOST=127.0.0.1
TRUST_PROXY=1

# Frontend & CORS
CORS_ORIGIN=https://example.com,https://www.example.com
FRONTEND_URL=https://example.com
COOKIE_DOMAIN=

# PostgreSQL Database (SSL Enforced)
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>?schema=public&sslmode=require
DIRECT_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:5432/<DB_NAME>?schema=public&sslmode=require

# Authentication Security (Minimum 32 random characters)
SESSION_SECRET=<CRYPTOGRAPHICALLY_RANDOM_64_HEX_STRING>

# Transactional Email (Resend)
RESEND_API_KEY=re_live_<YOUR_ACTUAL_KEY>
EMAIL_FROM=noreply@example.com

# Shared Cache (Redis - Optional, leave blank to use PostgreSQL fallback)
REDIS_URL=redis://127.0.0.1:6379

# Payment Configuration (UPI / PhonePe)
# In Phase 10, 'demo' is rejected in production. Real PhonePe credentials configured in Phase 12.
PAYMENT_PROVIDER=phonepe
PHONEPE_MERCHANT_ID=
PHONEPE_CLIENT_ID=
PHONEPE_CLIENT_SECRET=
PHONEPE_CLIENT_VERSION=
PHONEPE_CALLBACK_URL=
```

### Frontend Production Environment (`frontend/.env.production`)
```bash
# Reverse-proxy single domain setup (Recommended):
VITE_API_URL=/api/v1
VITE_APP_NAME=Purvaja Fashion - Atelier
VITE_ERROR_REPORTING_URL=
```

---

## H. Production Build Pipeline

Run the monorepo build from the repository root:

```bash
# 1. Clean installation of locked dependencies
pnpm install --frozen-lockfile

# 2. Validate configuration contract
pnpm validate:config

# 3. Generate Prisma client
pnpm db:generate

# 4. Build backend (TypeScript tsc) and frontend (Vite)
pnpm build
```

**Artifact Verification**:
- Backend output directory: `backend/dist/` (entrypoint: `backend/dist/server.js`).
- Frontend output directory: `frontend/dist/` (contains `index.html`, `assets/index-[hash].js`, `assets/index-[hash].css`).

---

## I. Prisma Production Migrations Workflow

Apply database migrations safely before starting the updated backend process:

```bash
# Execute safe, forward-only production migrations
pnpm db:migrate:deploy
```

> [!CAUTION]
> **STRICT PRODUCTION DATABASE RULES**:
> 1. **NEVER** run `prisma migrate dev` on a staging or production database.
> 2. **NEVER** run `pnpm db:seed` against production. Database seeding with demo fixtures is strictly blocked in `backend/prisma/seed.ts` when `NODE_ENV=production`.

---

## J. Backend Startup & Process Supervision

### Production Start Command
```bash
# Direct launch:
pnpm start
# (Runs node dist/server.js in backend package)
```

### Option A: Hostinger VPS (PM2 Process Management)
Create or verify `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'purvaja-api',
      script: 'backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      kill_timeout: 10000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: '127.0.0.1',
      },
    },
  ],
};
```
Commands:
```bash
# Start in cluster mode:
pm2 start ecosystem.config.cjs --env production

# Persist across VPS reboots:
pm2 save
pm2 startup systemd

# Zero-downtime reload:
pm2 reload purvaja-api --update-env

# View logs:
pm2 logs purvaja-api
```

### Option B: Hostinger Cloud / Node.js Hosting (hPanel)
1. In hPanel, go to **Advanced → Node.js**.
2. Set **Application root**: `backend`.
3. Set **Application startup file**: `dist/server.js`.
4. Set **Node.js version**: `20.x`.
5. Enter production environment variables in the **Environment variables** table.
6. Click **Restart Application**.

---

## K. Frontend Deployment

### Output Structure
The Vite build creates deterministic static files in `frontend/dist/`:
```text
frontend/dist/
├── index.html
├── favicon.ico
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
```

### Single-Page Application (SPA) Routing
Because React Router handles client-side routing, any direct request to URLs like `/catalog`, `/cart`, `/checkout`, or `/admin/orders` must be rewritten to serve `/index.html` with an HTTP 200 status code.

---

## L. Nginx Reverse Proxy & Static Web Server Setup

### Option A: Hostinger VPS Nginx Configuration
Create `/etc/nginx/sites-available/purvaja.fashion`:

```nginx
# Upstream Express cluster
upstream express_backend {
    server 127.0.0.1:5001;
    keepalive 32;
}

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/purvaja/frontend/dist;
    index index.html;

    # Hashed static assets with long cache lifetimes
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing fallback for frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API reverse proxy to backend
    location /api/ {
        proxy_pass http://express_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Healthcheck endpoints
    location ~ ^/(health|healthz|readyz) {
        proxy_pass http://express_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Option B: Hostinger Cloud/Web Hosting (`.htaccess` Rewrite)
Place this `.htaccess` in `public_html/`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## M. Cookie, CORS, and CSRF Security Policy

1. **Authentication Session Cookie (`pf_session`)**:
   - `httpOnly: true` (JavaScript cannot read the token).
   - `secure: true` (transmitted only over HTTPS in production).
   - `sameSite: 'lax'` (prevents cross-site submission while permitting top-level navigation).
   - `maxAge: 30 days`.
   - Salted and hashed with SHA-256 before persisting in PostgreSQL.
2. **Double-Submit CSRF Cookie (`pf_csrf`)**:
   - `httpOnly: false` (read by frontend client to set `X-CSRF-Token` header on state-modifying requests).
   - `secure: true`.
   - `sameSite: 'lax'`.
3. **CORS Origins**:
   - Set to explicit allowed origin(s) in `CORS_ORIGIN`.
   - Wildcard `*` is strictly blocked in production.
   - Allowed headers: `Content-Type`, `Authorization`, `X-Requested-With`, `X-CSRF-Token`, `Idempotency-Key`.

---

## N. Transactional Email via Resend

Transactional emails (email verification, password reset, order confirmations) are sent strictly through the backend Express API using Resend:
- **Sending Domain Authentication (DNS)**:
  - Add SPF record: `TXT @ "v=spf1 include:amazonses.com ~all"`
  - Add DKIM records (3 `CNAME` records generated in Resend dashboard).
  - Add DMARC record: `TXT _dmarc "v=DMARC1; p=none;"`
- **Missing Key Safety**:
  - In development and test modes, if `RESEND_API_KEY` is missing, tokens and reset links are output to structured logs for verification without throwing unhandled exceptions.
  - In production, missing `RESEND_API_KEY` produces a prominent warning and logs email contents safely without crashing.

---

## O. Optional Redis Shared Cache & Fallback Architecture

- **Optionality**: Redis is **100% optional**. The application operates with zero functional degradation when Redis is absent.
- **Scope**: Only public published customer reviews are cached (`TTL = 60s`).
- **Safety**: Sessions, shopping carts, addresses, orders, checkout, payments, and admin routes are **NEVER** stored in Redis.
- **Resilience**: Redis client initializes with a 2-second connection timeout and `reconnectStrategy: false`. If Redis fails or times out, the backend immediately queries PostgreSQL directly.

---

## P. Payment Provider Safety: Demo UPI vs Real PhonePe

> [!CRITICAL]
> **PHASE 10 PAYMENT SAFETY POLICY & PRODUCTION GATING**:
> - **DO NOT enable real PhonePe payments in Phase 10.**
> - The demo UPI payment provider (`PAYMENT_PROVIDER=demo`) is **strictly blocked** when `NODE_ENV=production`.
> - Phase 12 will handle official PhonePe sandbox credentials, contract verification, request signing, and webhook validation.
> - No simulated or invented PhonePe credentials may be used in production.
> - **IMPORTANT IMPLICATION**: Because demo payments are blocked in production and real PhonePe credentials are intentionally deferred to Phase 12, **live production launch is intentionally and safely gated until Phase 12 is completed**. The application is pre-deployment hardened and fully staging-ready, but cannot be launched to live customers until Phase 12.

---

## Q. Database Backups, Retention, & Restore Drills

> [!NOTE]
> Database backups and application deployments must be managed independently.

### Automated PostgreSQL Backup Script (`backup.sh`)
```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/var/backups/purvaja-postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/purvaja_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Creating compressed custom-format PostgreSQL backup..."
pg_dump -Fc -v -d "$DATABASE_URL" -f "$BACKUP_FILE"

# Retention: Delete backups older than 14 days
find "$BACKUP_DIR" -name "purvaja_*.dump" -mtime +14 -delete

echo "Backup complete: $BACKUP_FILE"
```

### Restore Verification Drill
Test restoration periodically into an isolated test database:
```bash
pg_restore --clean --if-exists -v -d "$TEST_DATABASE_URL" /var/backups/purvaja-postgres/purvaja_backup.dump
```

---

## R. Structured Logging, Auditing, & Secret Redaction

- **Engine**: Pino with structured JSON output.
- **Secret Redaction**: Production logs automatically redact:
  - Passwords and password hashes (`password`, `passwordHash`)
  - Tokens and hashes (`token`, `tokenHash`, `csrfToken`)
  - Session secrets (`SESSION_SECRET`, `session`)
  - Database credentials (`DATABASE_URL`, `DIRECT_URL`)
  - API keys (`RESEND_API_KEY`, `phonepeClientSecret`)
  - Cookie headers (`cookie`, `set-cookie`)
  - Authorization headers (`authorization`)

---

## S. Health Probes & Readiness Endpoints

The backend provides dual-stage probes for monitoring and container orchestration:

| Probe URL | Type | Logic Verified | Status Codes |
| :--- | :---: | :--- | :---: |
| `GET /health` or `GET /healthz` | **Liveness** | Verifies Express HTTP event loop is responsive. | `200 OK` |
| `GET /health/ready` or `GET /readyz` | **Readiness** | Executes `SELECT 1` against PostgreSQL to ensure database availability. | `200 OK` (or `503` if DB down) |

---

## T. Staging Smoke-Testing Verification Checklist

Before directing customer traffic to any newly deployed environment, verify all 20 smoke tests in staging:

- [ ] 1. **Frontend Landing**: Frontend loads with status 200, no mixed-content warnings, no browser console errors.
- [ ] 2. **Liveness Probe**: `GET /healthz` returns `{"status":"healthy"}` (HTTP 200).
- [ ] 3. **Readiness Probe**: `GET /readyz` returns `{"status":"ready"}` (HTTP 200).
- [ ] 4. **User Registration**: New customer can register account and receives CSRF + session cookies.
- [ ] 5. **User Login**: Customer can log in with valid credentials; invalid credentials yield sanitized error.
- [ ] 6. **User Logout**: Session is invalidated in PostgreSQL and cookies are cleared.
- [ ] 7. **Email Verification**: Verification token link flow is structurally valid.
- [ ] 8. **Password Reset**: Password reset request and token verification flows complete safely.
- [ ] 9. **Product Catalog**: Products list, category filters, and detail pages display with live prices and stock.
- [ ] 10. **Cart Management**: Add to cart, quantity update, item removal, and persistent cart merge work.
- [ ] 11. **Shipping Address**: Customer can save, view, and select shipping address.
- [ ] 12. **Checkout Flow**: Checkout initiates, computes totals, and holds inventory reservation.
- [ ] 13. **Payment Flow**: Demo UPI payment completes in staging (`PAYMENT_PROVIDER=demo`).
- [ ] 14. **Order Creation**: Order is created with status `CONFIRMED` and payment reference recorded.
- [ ] 15. **Admin Authorization**: Admin endpoints reject non-admin users with HTTP 403.
- [ ] 16. **Admin Operations**: Admin can view dashboard metrics, update product inventory, and transition orders.
- [ ] 17. **Inventory Concurrency**: Atomic inventory adjustments update stock without negative counts.
- [ ] 18. **Redis Graceful Fallback**: Cache operations succeed with or without active Redis instance.
- [ ] 19. **HTTPS & Secure Cookies**: Cookies contain `Secure; HttpOnly; SameSite=Lax` attributes.
- [ ] 20. **Zero Credential Leaks**: Inspect HTML and browser console to confirm zero database credentials or backend secrets are exposed.

---

## U. Rollback & Disaster Recovery Procedures

### 1. Application Code Rollback
If a defect is detected in the application layer:
```bash
# On server:
cd /var/www/purvaja
git checkout <PREVIOUS_STABLE_TAG>
pnpm install --frozen-lockfile
pnpm build
pm2 reload purvaja-api --update-env
```

### 2. Database Schema Rollback
> [!WARNING]
> Database rollback is **not** equivalent to application rollback.
> Prisma migrations are strictly forward-moving. To reverse a schema change:
> 1. Create a forward-correcting migration that restores the previous schema.
> 2. Apply via `pnpm db:migrate:deploy`.
> 3. If catastrophic data corruption occurred, restore from the verified pre-deployment snapshot using `pg_restore`.

---

## V. Production Go-Live Checklist

Complete every check before cutting DNS over to production:

- [ ] `NODE_ENV` is set to `production`.
- [ ] `PORT` and `HOST` match reverse proxy upstream (`127.0.0.1:5001`).
- [ ] `TRUST_PROXY` is configured appropriately (`1` or `loopback`).
- [ ] `DATABASE_URL` connects with `sslmode=require` and a high-entropy password.
- [ ] `DIRECT_URL` is configured for non-pooled migration operations.
- [ ] `pnpm validate:config` completes with `PASSED: Environment is production-ready`.
- [ ] `pnpm db:migrate:deploy` applies all pending migrations without error.
- [ ] Production database has **NOT** been seeded with demo fixtures (`pnpm db:seed` blocked).
- [ ] `SESSION_SECRET` is at least 32 cryptographically random characters.
- [ ] `CORS_ORIGIN` matches exact production domains without wildcards.
- [ ] `FRONTEND_URL` is set to canonical production HTTPS URL.
- [ ] Resend sender domain is verified with SPF, DKIM, and DMARC.
- [ ] `PAYMENT_PROVIDER` is NOT set to `demo` (real PhonePe configured in Phase 12).
- [ ] Pre-deployment database backup taken and verified via `pg_dump`.
- [ ] Initial admin user password rotated from default development credentials.
- [ ] HTTPS certificates active with automated renewal confirmed.
- [ ] Healthcheck endpoints `/healthz` and `/readyz` return HTTP 200.
