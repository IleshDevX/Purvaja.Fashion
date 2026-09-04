# CI/CD Quality Gates & Testing Architecture — Phase 8

## 1. Executive Summary

Purvaja Fashion Atelier is configured with a fully automated, multi-tier testing pipeline and CI/CD quality gate enforcement. The architecture guarantees that no regression, security vulnerability, broken database migration, schema drift, or broken customer/admin critical flow can reach production.

---

## 2. CI/CD Workflow (`.github/workflows/ci.yml`)

The primary CI pipeline runs automatically on:
- **Pushes** to the `main` branch.
- **Pull Requests** targeting `main`.
- Dynamic concurrency cancellation (`cancel-in-progress: true`) to preserve runner resources on rapid iterations.

### Ephemeral Service Containers & Test Configuration
- **PostgreSQL**: `postgres:16-alpine` service container initialized with ephemeral test credentials (`postgrespassword`), healthy via `pg_isready`.
- **Redis**: `redis:7-alpine` service container on port 6379, healthy via `redis-cli ping`.
- **Zero External Network Dependencies**: `RESEND_API_KEY` is omitted in CI; the email service operates in deterministic unconfigured mode without making outbound network requests.
- **Environment Validation**: `EMAIL_FROM` is set to `noreply@purvaja.fashion` to pass strict `z.string().email()` validation in `env.ts`.

### Pipeline Stages & Quality Gates

```text
GitHub Push / PR
       ↓
Isolated PostgreSQL 16 & Redis 7 Service Containers Spun Up (Healthy via pg_isready & redis-cli ping)
       ↓
Repository Checkout & Node/PNPM Cache Hydration
       ↓
pnpm install --frozen-lockfile
       ↓
Prisma Schema Validation (pnpm db:validate)
       ↓
Prisma Client Generation (pnpm db:generate)
       ↓
Zero-State Migration Deployment (pnpm db:migrate / prisma migrate deploy)
       ↓
Deterministic Seed Fixture Ingestion (pnpm db:seed: 50 products, 300 SKUs)
       ↓
Monorepo ESLint Quality Gate (pnpm lint: 0 errors, 0 warnings)
       ↓
TypeScript Strict Typecheck Gate (pnpm typecheck: 0 type errors)
       ↓
Production Bundle Compilation (pnpm build: Backend tsc + Frontend Vite bundle)
       ↓
Backend Integration Test Suite & Coverage (pnpm --filter ... test:coverage: 10 suites / 51 tests)
       ↓
Frontend Component & Store Test Suite & Coverage (pnpm --filter ... test:coverage: 8 suites / 16 tests)
       ↓
Strict Clean Git Tree Gate (git diff --check, git diff --exit-code, git diff --cached --exit-code, [ -z "$(git status --porcelain)" ])
```

---

## 3. Database Isolation & Zero-Contamination Strategy

1. **Ephemeral CI Containers**: In GitHub Actions, a clean `postgres:16-alpine` container is initialized with ephemeral test credentials. No developer database and no production Supabase database is ever contacted during CI.
2. **Deterministic Migration Verification**: The pipeline validates that `prisma migrate deploy` executes cleanly on a completely empty database from migration `20260328120000_init_database` through `20260401000000_phase6_operations`.
3. **Deterministic Seed Verification**: `pnpm db:seed` executes against the freshly migrated schema to ensure the expected scale (50 products, 300 variants, categories, and initial admin account) is generated reliably.
4. **Integration Test Hygiene**: Backend integration tests run serially (`fileParallelism: false`) with isolated fixtures. For example, `e2e-flows.test.ts` provisions dedicated test customers and test orders in `beforeAll` and tears them down in `afterAll`, never mutating existing seed or developer database records.

---

## 4. Test Suite Structure & Coverage

### Backend Test Suites (10 Suites / 51 Tests)
- `tests/integration/auth.test.ts`: Customer registration, argon2id hashing, secure cookies, `/auth/me`, password reset, email verification, session revocation.
- `tests/integration/auth-resend.test.ts`: Resend verification email, token expiration, cooldown timing, active token rotation.
- `tests/integration/catalog.test.ts`: Product listing, fuzzy search, category filters, sorting, slug/UUID lookup, published reviews filter.
- `tests/integration/cart.test.ts`: Cart lifecycle, variant quantity controls, stock exhaustion constraints, cart account isolation.
- `tests/integration/checkout.test.ts`: Address creation, server-side pricing recalculation, inventory hold reservation, idempotency key enforcement.
- `tests/integration/payment-flow.test.ts`: Demo PhonePe callbacks (SUCCESS, FAILED, CANCELLED), reservation consumption vs release, customer order details, stranger 404 isolation.
- `tests/integration/admin.test.ts`: RBAC protection (401 unauthenticated, 403 customer), stock adjustments, operational movements, coupon/reservation queries.
- `tests/integration/health.test.ts`: Health check probe, database connectivity verification, error boundary diagnostics.
- `tests/unit/cache.service.test.ts`: Redis connectivity, cache hit/miss with TTL, graceful unreachable instance degradation, and graceful PostgreSQL fallback.
- `tests/integration/e2e-flows.test.ts`: Full end-to-end customer and administrator business journeys using isolated fixtures.

### Frontend Test Suites (8 Suites / 16 Tests)
- `src/features/checkout/utils/pricing.test.ts`: Integer paise arithmetic, shipping thresholds, coupon discount caps.
- `src/store/cartStore.test.ts`: Client-side cart persistence, reactive item counts, drawer state.
- `src/features/admin/schemas/productFormSchema.test.ts`: Zod product creation and validation schemas.
- `src/features/auth/components/AdminRoute.test.tsx`: Route protection for unauthenticated guests and non-admin users.
- `src/pages/auth/LoginPage.test.tsx`: Form inputs, error toast alerts, submit handler dispatch.
- `src/pages/auth/RegisterPage.test.tsx`: Required inputs, password matching, validation feedback.
- `src/pages/cart/CartPage.test.tsx`: Empty cart state, item steppers, pricing breakdown, checkout action.
- `src/pages/admin/AdminInventoryPage.test.tsx`: Inventory SKU matrix rendering, search debounce, status badges, stock adjustment buttons.

---

## 5. Developer Local Commands

Every developer has access to standard, unified commands in root `package.json`:

| Command | Action |
| :--- | :--- |
| `pnpm test` | Runs all frontend and backend tests |
| `pnpm test:watch` | Runs test watchers across frontend and backend |
| `pnpm test:coverage` | Computes test coverage with v8 coverage reporters |
| `pnpm lint` | Runs ESLint across all workspaces |
| `pnpm typecheck` | Runs `tsc --noEmit` across all workspaces |
| `pnpm build` | Builds backend (`tsc`) and frontend (`vite build`) |
| `pnpm db:validate` | Validates Prisma schema integrity |
| `pnpm db:generate` | Generates typed Prisma client |
| `pnpm db:migrate` | Deploys pending migrations |
| `pnpm db:seed` | Seeds development database with catalog fixtures |

---

## 6. Dependency & Security Clarifications

- **CI Credentials**: GitHub Actions uses ephemeral localhost service containers with test credentials (`postgrespassword` and test session secret). No production secrets or personal API tokens are committed or used in CI.
- **External Delivery**: No external email provider is called during CI. The dummy Resend API key is omitted so that email delivery remains in mock/unconfigured mode.
- **Dependency Audit**: `pnpm audit` reports 5 transitive vulnerabilities from `express@4.21.2` (`qs`) and Prisma dev tooling (`mysql2`). No breaking major version upgrades were blindly introduced. The application uses PostgreSQL exclusively via `@prisma/adapter-pg` and `pg`.
- **Environment Safety**: No `.env` or `.env.local` files are tracked in git; `.gitignore` strictly protects environment files while allowing `.env.example`.
