# Phase 8 — DevOps & Production Readiness Report

**Application**: Purvaja Fashion — Atelier Full-Stack E-Commerce Monorepo  
**Environment**: Production & Staging Operational Hardening  
**Target Runtime**: Node.js v24.12.0 LTS (Aligned across `.nvmrc`, `package.json`, `Dockerfile`, and CI)  
**Package Manager**: pnpm v11.22.0  
**Database**: PostgreSQL 16 (Supabase Managed Pooler, AWS ap-south-1)  
**Process Manager**: PM2 Cluster Mode (Hostinger VPS) / Docker Multi-stage Container  
**Date**: September 6, 2026  

---

## 1. Executive Summary

Phase 8 concludes the production hardening of the Purvaja Fashion application. The repository has been audited and prepared for reliable, reproducible deployment to staging and production. Key operational capabilities implemented and verified include:
- **Runtime & Toolchain Alignment**: Node.js 24 (`24.12.0`) and pnpm `11.22.0` unified across `.nvmrc`, `package.json` engines, `Dockerfile`, and CI workflows.
- **Granular Health & Readiness Probes**: `/healthz` (liveness) and `/readyz` (readiness) checking database connectivity, Prisma migration application state, Redis cache availability with transparent PostgreSQL fallback, transactional email status, and payment provider mode without leaking secrets.
- **Request Correlation & Log Security**: Standard `X-Request-Id` correlation middleware attached to all incoming requests, propagated through headers, application logs, and structured error responses. All credentials, session tokens, CSRF tokens, database URLs, and payment secrets are automatically redacted by Pino.
- **Zero-Downtime Rollout Readiness**: PM2 cluster configuration with `wait_ready: true` and application `process.send('ready')` integration. Graceful shutdown handler closes HTTP listener, clears background timers, and disconnects database and cache pools cleanly upon `SIGTERM`/`SIGINT`.
- **Automated Smoke Test**: 19-step validation procedure (`pnpm smoke-test`) testing public catalog, product details, customer authentication, CSRF enforcement, cart management, checkout inventory reservation, payment lifecycle, reservation expiry sweeps, coupon validation, return policy enforcement, RBAC (401/403/200), inventory adjustment audits, and probe responses, with automated disposable test data purging. It targets the in-process app by default; set `SMOKE_BASE_URL` to exercise a deployed HTTP service. It is blocked when `NODE_ENV=production` because it creates and deletes records.

---

## 2. Files Changed & Added

| File | Change Type | Purpose / Description |
| :--- | :--- | :--- |
| [`Dockerfile`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/Dockerfile) | **Modified** | Updated base and runner stages to `node:24-slim` for Node 24 LTS alignment. |
| [`docker-compose.yml`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/docker-compose.yml) | **Modified** | Updated healthcheck test probe to `http://localhost:5001/healthz`. |
| [`backend/src/middleware/requestId.middleware.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/middleware/requestId.middleware.ts) | **New** | Request correlation middleware generating or propagating `X-Request-Id`. |
| [`backend/src/types/express.d.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/types/express.d.ts) | **Modified** | Added optional `id?: string` to Express `Request` interface. |
| [`backend/src/app.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/app.ts) | **Modified** | Applied `requestIdMiddleware` as primary middleware before security and routes. |
| [`backend/src/middleware/error.middleware.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/middleware/error.middleware.ts) | **Modified** | Added `requestId` to logger context and structured client JSON error response. |
| [`backend/src/controllers/auth.controller.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/controllers/auth.controller.ts) | **Modified** | Set `secure: true` for cookies in both staging and production environments. |
| [`backend/src/controllers/health.controller.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/controllers/health.controller.ts) | **Modified** | Enhanced `getReadinessStatus` with granular subsystem checks (`database`, `migrations`, `redis`, `email`, `payment`). |
| [`backend/src/config/database.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/config/database.ts) | **Modified** | Added `checkDatabaseReadiness` verifying both connection and migration table state. |
| [`backend/src/services/cache.service.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/services/cache.service.ts) | **Modified** | Added `isConnected` getter to expose Redis connection state without throwing. |
| [`backend/src/utils/logger.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/utils/logger.ts) | **Modified** | Exported `REDACTED_PATHS` constant for test verification and pino config. |
| [`backend/src/scripts/smoke-test.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/scripts/smoke-test.ts) | **New** | Automated 19-step production smoke-test script with complete cascade cleanup. |
| [`backend/package.json`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/package.json) | **Modified** | Added `"smoke-test": "tsx src/scripts/smoke-test.ts"`. |
| [`package.json`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/package.json) | **Modified** | Added `"smoke-test": "pnpm --filter @ecommerce/prototype-b-backend smoke-test"`. |
| [`backend/tests/integration/health.test.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/tests/integration/health.test.ts) | **Modified** | Updated mocks and assertions for `checkDatabaseReadiness`. |
| [`backend/tests/integration/production-security.test.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/tests/integration/production-security.test.ts) | **Modified** | Updated error response assertions to verify `requestId` and `X-Request-Id`. |
| [`backend/tests/integration/phase8-devops.test.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/tests/integration/phase8-devops.test.ts) | **New** | Integration tests for Phase 8 DevOps contracts (health, correlation, config, redaction, lifecycle). |
| [`docs/phase-8-devops.md`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/docs/phase-8-devops.md) | **New** | This comprehensive operational handbook and Phase 8 report. |

---

## 3. Deployment Architectures & Lifecycle

### A. Hostinger VPS (Bare Metal / System Node)
- **Node.js**: Installed via NodeSource / nvm matching `.nvmrc` (`24.12.0`).
- **Nginx Reverse Proxy**:
  - Terminates TLS (Let's Encrypt / Certbot).
  - Enforces HTTP/2, HSTS (`max-age=31536000; includeSubDomains`), and security headers.
  - Proxies `/api/v1` and `/healthz` to local Node upstream `127.0.0.1:5001`.
  - Sets headers:
    ```nginx
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Request-Id $request_id;
    ```
- **PM2 Process Management**:
  - Configured in [`ecosystem.config.cjs`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/ecosystem.config.cjs).
  - Runs in `cluster` mode with `instances: 'max'`.
  - Configured with `wait_ready: true` and `listen_timeout: 10000`. The server sends `process.send('ready')` upon opening the HTTP listener to achieve zero-downtime reloads (`pm2 reload ecosystem.config.cjs --env production`).
- **Graceful Shutdown**:
  - Listens for `SIGTERM` and `SIGINT`.
  - Stops the background reservation cleanup interval timer (`clearInterval(reservationCleanupTimer)`).
  - Closes HTTP listener to stop accepting new connections while completing inflight requests (10-second hard kill timeout).
  - Closes Prisma connection pool (`prisma.$disconnect()`) and Redis connection (`cacheService.disconnect()`).

### B. Docker Container Deployment
- **Base & Runner Image**: `node:24-slim` Debian-based minimal image.
- **Multistage Build**:
  - `base`: Sets PNPM home, activates `pnpm@11.22.0` via Corepack.
  - `deps`: Copies manifest and installs dependencies with frozen lockfile (`--frozen-lockfile`). Generates Prisma client.
  - `builder`: Compiles TypeScript backend (`pnpm --filter @ecommerce/prototype-b-backend build`) and Vite frontend (`pnpm --filter @ecommerce/prototype-b build`).
  - `runner`: Unprivileged system user (`nodejs:nodejs`, UID 1001), minimal runtime dependencies, compiled distribution artifacts only. Starts via `CMD ["node", "backend/dist/server.js"]`.
- **Healthcheck**: Configured with Docker healthcheck querying `http://localhost:5001/healthz` every 10s.

---

## 4. Environment & Secrets Management Audit

### A. Environment Configuration Rules
1. **Never Commit Secrets**: Real credentials, encryption keys, and tokens are prohibited in git repositories. Verified that `.gitignore` ignores all `.env` files except `.env.example`.
2. **Deployment Validation Gate**: The compiled backend runs `validateProductionConfig` at startup when `NODE_ENV=staging` or `NODE_ENV=production`. If any required setting is missing or insecure, the process halts immediately with exit code 1.
3. **Database SSL Enforcement**: In staging and production, `DATABASE_URL` must enforce TLS via `sslmode=require`, `sslmode=verify-ca`, or `sslmode=verify-full`. Insecure `sslmode=no-verify` is strictly rejected.

### B. Environment Variable Inventory (Secrets Redacted)

| Variable Name | Required In Prod? | Sensitivity | Purpose / Description | Reference Value |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | Public | Runtime mode (`production`, `staging`, `development`, `test`) | `production` |
| `PORT` | Yes | Public | HTTP port (default `5001`) | `5001` |
| `HOST` | Yes | Public | Listen interface (`127.0.0.1` behind proxy, `0.0.0.0` in container) | `127.0.0.1` |
| `TRUST_PROXY` | Yes | Public | Express trust proxy setting (`1` for Nginx/Cloudflare, `loopback` for local) | `1` |
| `DATABASE_URL` | Yes | **Secret** | Connection-pooled PostgreSQL connection string | `postgresql://[REDACTED_SECRET]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DIRECT_URL` | Yes | **Secret** | Direct non-pooled PostgreSQL URL for Prisma migrations | `postgresql://[REDACTED_SECRET]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require` |
| `FRONTEND_URL` | Yes | Public | Customer frontend URL (used in email links and CORS defaults) | `https://purvaja.fashion` |
| `CORS_ORIGIN` | Yes | Public | Comma-separated list of allowed origins (no wildcards allowed) | `https://purvaja.fashion` |
| `COOKIE_DOMAIN` | Optional | Public | Cookie domain scope (e.g. `.purvaja.fashion` if subdomains used) | `[REDACTED_SECRET]` |
| `PAYMENT_PROVIDER`| Yes | Public | Active payment provider (`phonepe` in prod; `demo` forbidden in prod) | `phonepe` |
| `PHONEPE_MERCHANT_ID` | Yes (if PhonePe) | **Secret** | PhonePe merchant identifier | `[REDACTED_SECRET]` |
| `PHONEPE_CLIENT_ID` | Yes (if PhonePe) | **Secret** | PhonePe client ID | `[REDACTED_SECRET]` |
| `PHONEPE_CLIENT_SECRET` | Yes (if PhonePe) | **Secret** | PhonePe API secret key | `[REDACTED_SECRET]` |
| `PHONEPE_CLIENT_VERSION`| Yes (if PhonePe) | Public | PhonePe API client version | `1` |
| `PHONEPE_ENVIRONMENT` | Yes (if PhonePe) | Public | PhonePe gateway mode (`sandbox` or `production`) | `sandbox` |
| `PHONEPE_CALLBACK_URL` | Yes (if PhonePe) | Public | Webhook endpoint for server-to-server transaction callbacks | `https://purvaja.fashion/api/v1/payments/phonepe-callback` |
| `PHONEPE_WEBHOOK_USERNAME` | Yes (if PhonePe) | **Secret** | Username configured for PhonePe webhook authorization | `[REDACTED_SECRET]` |
| `PHONEPE_WEBHOOK_PASSWORD` | Yes (if PhonePe) | **Secret** | Password configured for PhonePe webhook authorization | `[REDACTED_SECRET]` |
| `RESEND_API_KEY` | Optional | **Secret** | Transactional email provider API key (`re_...`) | `[REDACTED_SECRET]` |
| `EMAIL_FROM` | Yes (if email) | Public | Verified sender email address | `noreply@purvaja.fashion` |
| `REDIS_URL` | Optional | **Secret** | Optional Redis cache instance URL (fallback to PostgreSQL active) | `[REDACTED_SECRET]` |

---

## 5. Health & Readiness Monitoring

The backend exposes separated liveness and readiness endpoints:

### Liveness Probe (`GET /healthz`, `GET /health`, `GET /api/v1/health`)
- **Purpose**: Verify that the Node.js process is active, event loop is unblocked, and HTTP server is accepting connections.
- **Expected Status**: `200 OK`.
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "timestamp": "2026-09-06T16:34:00.000Z",
      "uptime": 124.5,
      "environment": "production"
    }
  }
  ```

### Readiness Probe (`GET /readyz`, `GET /health/ready`, `GET /api/v1/health/ready`)
- **Purpose**: Verify that required downstream dependencies are operational before routing customer traffic.
- **Subsystem Checks**:
  1. **Database**: Executes `SELECT 1` through Prisma pool adapter. Status: `'connected'` or `'disconnected'`.
  2. **Migrations**: Queries `_prisma_migrations` to verify schema records are applied and active. Status: `'ready'` or `'pending'`.
  3. **Redis**: Checks `cacheService.isConnected`. Status: `'connected'`, `'fallback_to_postgres'`, or `'not_configured'`.
  4. **Email Provider**: Checks if `RESEND_API_KEY` is present. Status: `'configured'` or `'log_only'`.
  5. **Payment Provider**: Reports active provider (`'phonepe_sandbox'`, `'phonepe_production'`, or `'demo'`).
- **Expected Status**: `200 OK` when database is healthy; `503 Service Unavailable` if database connection fails.
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ready",
      "checks": {
        "database": "connected",
        "migrations": "ready",
        "redis": "not_configured",
        "email": "log_only",
        "payment": "demo"
      }
    }
  }
  ```

---

## 6. Migration Deployment & Rollback Runbook

### A. Current Migration History (All 9 Applied)
1. `20260904103000_init_ecommerce_schema`: Users, roles, categories, products, variants, images, reviews, carts.
2. `20260904140000_auth_profile_and_token_purpose`: Verification purpose enums, profile fields, session hashes.
3. `20260904170000_checkout_payments`: Orders, items, payments, addresses, reservations, coupons.
4. `20260904180000_admin_inventory`: Audit logs, inventory movements, tracking metadata.
5. `20260905180000_performance_composite_indexes`: Catalog, order, and review composite query indexes.
6. `20260905190000_checkout_idempotency`: Idempotency keys and checkout reservation safeguards.
7. `20260906150000_phase2_return_and_coupon_integrity`: Order returns, items, unique coupon redemptions.
8. `20260906151000_phase2_return_cleanup_fks`: Order return cascade constraints and safe cleanup foreign keys.
9. `20260906160000_phase7_performance_indexes`: Index scans on variants, admin products, order items, and cart items.

### B. Safe Migration Deployment Command
```bash
# Deploys all unapplied migrations in alphabetical/chronological order
pnpm --filter @ecommerce/prototype-b-backend db:migrate:deploy
```
*Note*: `db:migrate:deploy` is non-interactive, records checksums in `_prisma_migrations`, and never creates or alters schema files dynamically during deployment.

### C. Database Rollback & Forward-Recovery Policy
> [!IMPORTANT]
> Prisma Migrate does not support automatic down-migrations or destructive automatic rollbacks in production environments.
> Schema alterations must always move forward:
> 1. **Forward-Recovery**: If a migration introduces an unexpected defect, generate a forward-correcting migration that drops or alters the problematic constraint/index/column and deploy it via `pnpm db:migrate:deploy`.
> 2. **Disaster Recovery Restore**: In the event of catastrophic data corruption, restore the database from the pre-deployment snapshot using `pg_restore` (see Backup & Restore Runbook below).
> 3. **Non-destructive Index Rollbacks**: An unnecessary index can be safely removed with a forward migration containing `DROP INDEX IF EXISTS index_name;`.

### D. Large-Table Index Guidelines (`CREATE INDEX CONCURRENTLY`)
The already-applied Phase 7 migration uses ordinary `CREATE INDEX IF NOT EXISTS` statements. It must not be rewritten in place because Prisma records migration checksums. Before applying that migration to a busy production database, use a reviewed maintenance window or replace it with a new forward migration strategy; future high-volume indexes should use the concurrent pattern below.

For future migrations on high-volume production tables (e.g. `order_items`, `inventory_movements`, `audit_logs` exceeding 1M rows):
- Standard `CREATE INDEX` acquires an `EXCLUSIVE` lock that blocks table writes for the duration of the index build.
- PostgreSQL allows `CREATE INDEX CONCURRENTLY` to build the index without blocking writes.
- Because `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, Prisma migrations must specify `-- @prisma-disable-transactions` (or `disableTransaction = true` in Prisma migration configuration):
  ```sql
  -- migration.sql
  -- @prisma-disable-transactions
  CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_logs_actor_created" ON "audit_logs"("actor_id", "created_at" DESC);
  ```

---

## 7. Backups & Disaster Recovery Runbook

### A. Operational Parameters

| Parameter | Specification | Status |
| :--- | :--- | :--- |
| **Backup Frequency** | Automated Daily Snapshots (Supabase) + Pre-deployment manual dump | Active |
| **Retention Policy** | 7 days (Starter Tier) / 30 days (Pro Tier with PITR) | Active |
| **Recovery Point Objective (RPO)** | 24 Hours (Daily Snapshot) / ~5 minutes (with PITR active) | Provider/configuration dependent; drill required |
| **Recovery Time Objective (RTO)** | ≤ 30 minutes (Database restore + Schema validation + Smoke test) | Target only; restore drill required |
| **Backup Platform** | Supabase Managed PostgreSQL Storage (AWS ap-south-1) | Documented target; account evidence required |
| **Automated Off-site Replication** | Scheduled export to secondary cloud storage (S3 / B2) | `Planned` |

### B. Manual Backup Procedure (Pre-Deployment Snapshot)
Before applying major migrations or deployment releases, execute a consistent logical backup:
```bash
# Export compressed custom-format PostgreSQL dump
pg_dump \
  --dbname="[DATABASE_URL]" \
  --format=c \
  --blobs \
  --no-owner \
  --file="purvaja_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### C. Database Restore Procedure (Disaster Recovery)
To restore a snapshot to a staging or disposable recovery instance:
```bash
# Restore custom-format dump cleanly
pg_restore \
  --dbname="[TARGET_DATABASE_URL]" \
  --clean \
  --if-exists \
  --no-owner \
  "purvaja_backup_YYYYMMDD_HHMMSS.dump"

# Verify schema and migration state after restore
pnpm db:validate
pnpm --filter @ecommerce/prototype-b-backend exec prisma migrate status
pnpm smoke-test
```

---

## 8. Smoke-Test Suite (`pnpm smoke-test`)

The automated script [`backend/src/scripts/smoke-test.ts`](file:///E:/01%20Web%20Devlopment%20Projects/08%20Purvaja%20Fashion/02%20E-Commerce/backend/src/scripts/smoke-test.ts) executes 19 checks with disposable test data purging. For a deployed staging service, configure the same staging database and run:

```powershell
$env:NODE_ENV = 'staging'
$env:SMOKE_BASE_URL = 'https://staging-api.example.com'
pnpm smoke-test
```

Without `SMOKE_BASE_URL`, the suite uses the in-process Express app and is not external deployment evidence. The reservation sweep and inventory adjustment checks also call internal service methods, so external HTTP smoke coverage should be complemented by deployed-worker verification.

```text
======================================================
 PURVAJA FASHION — PRODUCTION SMOKE TEST SUITE
======================================================

  ✓ [01/19] Public Catalog — Loaded 12 products (total: 50)
  ✓ [02/19] Product Details — Retrieved product 'heritage-leaf-brown-resort-shirt' with variant '85e3bc9c-ce70-40ed-a3e9-e4b0e23eb398' (stock: 50)
  ✓ [03/19] Customer Registration — Registered user ID 43281b53-571f-4372-9c42-95832abcefd1
  ✓ [04/19] Customer Login — Authenticated session established, CSRF token extracted
  ✓ [05/19] CSRF Protection — Missing and mismatched CSRF tokens both rejected with 403
  ✓ [06/19] Cart Management — Add item, retrieve cart, and update quantity succeeded
  ✓ [07/19] Checkout & Stock Reservation — Order ORD-1788691447477 created with active reservation
  ✓ [08/19] Payment Initiation — Payment 61b4bcab-cbd2-456a-81ac-5b8e6817a9f8 initiated, status: INITIATED
  ✓ [09/19] Payment Status & Safe Cancellation — Payment status verified and reservation safely released on order cancel
  ✓ [10/19] Customer Order History — Retrieved order list (1 orders found)
  ✓ [11/19] Reservation Expiry Sweep — Sweep executed cleanly, released 0 expired reservations
  ✓ [12/19] Coupon Validation — Coupon 'LMT1_C207BA80' validated: discount 20000 paise
  ✓ [13/19] Return Request Policy Enforcement — Return on non-delivered order correctly rejected with 400
  ✓ [14/19] Admin Unauthenticated Protection (401) — Unauthenticated admin access rejected with HTTP 401
  ✓ [15/19] Customer RBAC Admin Rejection (403) — Customer role access to admin dashboard rejected with HTTP 403
  ✓ [16/19] Admin Authenticated Dashboard (200) — Admin dashboard returned metrics (50 products, 11 orders)
  ✓ [17/19] Admin Inventory Adjustment Audit — Adjusted and safely restored stock count (48 units)
  ✓ [18/19] Health Liveness Endpoint (/healthz) — Liveness healthy, uptime: 10s
  ✓ [19/19] Readiness Endpoint (/readyz) — Ready with DB: connected, Migrations: ready, Redis: not_configured

🧹 Cleaning up disposable test records...
✅ Disposable test data cleanly purged.

======================================================
 SMOKE TEST SUMMARY: 19/19 PASSED, 0 FAILED
======================================================
```

---

## 9. Verification & Gate Outcomes

All quality gates were re-executed and verified green:

| Command | Status | Outcome / Details |
| :--- | :--- | :--- |
| **`pnpm typecheck`** | **PASS** | 0 TypeScript errors across frontend and backend monorepo workspaces. |
| **`pnpm lint`** | **PASS** | 0 ESLint errors. Pre-existing warnings in frontend untouched. |
| **`pnpm test`** | **PASS** | **203 tests passed** across 30 test suites (144 backend + 59 frontend). |
| **`pnpm build`** | **PASS** | Compiled distribution: backend `tsc` + frontend production Vite bundle (`dist/index.html`). |
| **`pnpm db:validate`** | **PASS** | Prisma schema validated successfully (`prisma/schema.prisma is valid 🚀`). |
| **`prisma migrate status`** | **PASS** | `9 migrations found in prisma/migrations. Database schema is up to date!` |
| **`pnpm smoke-test`** | **PASS (local only unless SMOKE_BASE_URL is set)** | 19/19 checks passed in the reported run; zero residual test records. External staging execution remains a separate required evidence item. |

---

## 10. Items Marked Planned, Not Implemented, or Unknown

In adherence to strict operational truthfulness, the following capabilities are explicitly cataloged:

| Item | Status | Operational Context |
| :--- | :--- | :--- |
| **External APM / Observability Vendor** (Datadog, New Relic, Sentry) | `Planned` | Pino structured JSON logging and `X-Request-Id` correlation are active. Dedicated SaaS APM integration is deferred to production launch. |
| **Automated Cross-Region Database Replication** | `Not Implemented` | Active database runs on Supabase AWS `ap-south-1` single-region primary with daily platform backups. |
| **Automated Multi-Zone Failover** | `Not Implemented` | High-availability failover depends on Supabase managed instance SLA. |
| **Dedicated PhonePe Production Gateway Activation** | `Planned` | PhonePe SDK architecture and contract validation are verified with `PAYMENT_PROVIDER=demo` in staging; production merchant credentials will be applied in production release. |
| **Production Server Hardware / Memory Metrics** | `Unknown` | Hostinger VPS resource utilization metrics are managed via Hostinger hPanel and PM2 monitoring (`pm2 monit`), not exposed via application endpoints. |

---

## 11. Remaining Production Risks & Mitigations

1. **Supabase Pooler Connection Limit**:
   - *Risk*: Under sudden high concurrency surges, connection pooling limits on managed Supabase instances can be reached.
   - *Mitigation*: Application uses connection pooling via Prisma `@prisma/adapter-pg` with bounded timeouts; dashboard aggregate queries consolidated to single SQL roundtrips (Phase 7).
2. **Session Cleanup in PostgreSQL**:
   - *Risk*: Expired session tokens can accumulate in the `sessions` table over time.
   - *Mitigation*: The `sessions` table is indexed on `expiresAt`. A daily cron maintenance query (`DELETE FROM sessions WHERE expires_at < NOW()`) should be scheduled on the host.
3. **Hostinger SSH Key & Known Hosts Rotation**:
   - *Risk*: Static deployment keys must be securely stored in GitHub Secrets.
   - *Mitigation*: Deployment template enforces `HOSTINGER_SSH_KNOWN_HOSTS` verification to prevent MITM attacks during rsync/ssh.
