# Executable release environments

The active `deploy-hostinger.yml` workflow defaults to the protected `staging` environment. Both frontend and API use the same public origin; the backend serves `frontend/dist`, API routes, and SPA fallback. The release bundle includes the shared commerce policy package.

Browser acceptance uses that same topology on its own process, with `E2E_PORT` defaulting to 4174. Build with `VITE_API_URL=/api/v1` before running Playwright. API requests in the scenarios use the test origin; an existing development API on port 5001 is not reused or stopped. Local test/development HTTP omits CSP HTTPS upgrading; staging/production keep it enabled.

For each GitHub environment, configure the SSH secrets named in the workflow. Use separate staging/production hosts because the upstream port is 5001. Provision `/var/www/purvaja/<environment>/shared/backend.env` outside Git with the environment's validated application configuration, and a writable `shared/uploads` directory. The workflow links the configuration into the release root and backend directory and retains uploads across releases. Set `FRONTEND_URL` to the public HTTPS origin; reverse proxy all routes to the backend, including `/readyz` and `/api/v1`.

The host requires Node 24.12.0, pnpm 11.22.0, PM2, PostgreSQL backup utilities, and access to the configured database. Production and staging retain the existing email, shared rate limit, and operational alert requirements. Keep development/test payments in demo mode and use PhonePe sandbox only for provider verification. Production approval requires separately reviewed provider evidence.

Deployment validates configuration, creates a backup, applies migrations, checks consistency, activates the release, and probes public storefront HTML, its JavaScript entry, readiness, and the catalogue API. A failed activation probe restores the previous application release. Database migrations are not rolled back automatically; review backward compatibility before deployment. YAML validation and local builds do not constitute a staging deployment result.

Historical delivery dates inferred from `updated_at` are removed by the corrective migration. Historical orders without a verified delivery date cannot self-serve returns until evidence is established. New delivery transitions record their timestamp at the database boundary; subsequent edits and return rejection cannot extend the window.

Shipping prices, free-shipping threshold, and return duration live in `shared/commerce-policy`. Change and review this operational configuration with both applications. Unsupported delivery guarantees and doorstep exchange remain unavailable; product prices/materials come from catalogue records.
