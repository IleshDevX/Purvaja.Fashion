# Phase 1 verification — 7 September 2026

Scope: reconcile the existing working tree, establish the progress tracker, and verify the migration/test baseline in isolation. Later product implementation remains at the requested checkpoint. Demo payments are the current scope; real-money launch is deferred.

## Snapshot and isolation

Base commit: `85f7493c6be8bd5a99d64e982c535428658177fa`. The tested source includes existing tracked modifications and untracked files. It is an independent copy of the working tree, not a clean committed release. No bulk reset, staging, commit, shared database migration or deployment was performed.

Evidence root: `C:/Users/ilesh/.codex/visualizations/2026/09/06/01a07702-324d-7621-ba86-b89066893a09/phase1/`.

- `baseline-status.txt`: pre-Phase-1 Git status, including 98 modified entries, 2 deleted entries and 43 untracked entries.
- Each `run-*/baseline-manifest.json`: per-file SHA-256 hashes for that verification snapshot.
- Each run records command arguments, exit codes and timings in `results.json`, with separate logs and Vitest JSON reports.
- Final full-suite verification snapshot: `run-1788756453723`.
- Corrected artifact-smoke verification snapshot: `run-1788756639930` (separate cluster on port `55441`).

An external [embedded-postgres](https://github.com/leinelissen/embedded-postgres) installation supplies native PostgreSQL 16.14. It is outside project dependencies. Each run initializes an empty cluster on `127.0.0.1:55439`, creates `purvaja_phase1_test`, and uses a database-owning role without superuser, database-creation or role-creation privileges. Cluster authentication restricts that role to its disposable database. Connection identity and zero initial public tables are recorded in `database-identity.json`. Generated passwords remain ephemeral and are redacted from command logs. The runner stops its cluster after verification; it retains evidence/data files.

Node 24.12.0 and pnpm 11.22.0 execute a frozen install in the snapshot. Application environment files and existing dependencies are excluded. Demo mode and explicit local database settings are supplied to children. Provider, email and Redis credentials are removed. No browser or hosted service acceptance is implied.

## Root causes corrected within Phase 1

| Finding | Responsible layer and correction | Verification |
|---|---|---|
| Tests could inherit an application database or use a privileged role | Test bootstrap validates explicit loopback database URL, database name, allowed connection options, actual server identity and role privileges; no configured target means no application DB fallback | URL boundary unit tests plus real restricted-role integration run |
| CI service account was a cluster administrator | CI bootstrap creates a restricted database owner and generates an independent seed-admin password | Source/lint review; hosted GitHub workflow execution remains pending |
| Migrated schema differed from Prisma declarations | Preserve SQL history; declare existing `gen_random_uuid()` defaults and verification-token index | Fresh migrations, repeat deployment and Prisma schema diff |
| Frontend typecheck inspected an empty project root | Use TypeScript build mode to follow app and tooling references; correct the invalid test status to `pending` | Actual typecheck and production bundle build |
| Payment suite required incidental seed stock >= 50 | Own and clean up a unique product/variant fixture sized for the suite | Full PostgreSQL payment-hardening suite |

Phase 1 source files: `.github/workflows/ci.yml`, `backend/tests/bootstrap-ci.mjs`, `backend/tests/database-target.ts`, `backend/tests/setup.ts`, `backend/tests/unit/database-target.test.ts`, `backend/tests/integration/payment-hardening.test.ts`, `backend/vitest.config.ts` (comment), `backend/prisma/schema.prisma`, `frontend/package.json`, and `frontend/src/store/session-cart-regression.test.ts`. The progress tracker and this report document the changes. Other pre-existing application changes remain attributed to their phases.

## Migration reconciliation

All eleven local SQL migrations are included in the snapshot, including the seven currently untracked migration files. No existing migration SQL was rewritten. The two earlier remediation migrations add durable cart-merge records and bind verification tokens to their intended email. They have only been applied to the disposable verification database in this phase.

Release packaging must include the reviewed migrations. Target-email binding invalidates legacy unbound email-change links; those links require reissue. An empty-database replay does not prove an upgrade of an existing populated environment, restore or rollback safety.

## Execution results

| Check | Result | Evidence |
|---|---|---|
| `pnpm install --frozen-lockfile` | PASS | `01-frozen-install.log` |
| Prisma validate and generate | PASS | `02-schema-validate.log`, `03-client-generate.log` |
| Empty database deployment | PASS: all 11 migrations applied | `04-migrate-empty.log`, `migration-results.json` |
| Repeat migration deployment | PASS: nothing pending | `05-migrate-repeat.log` |
| Database versus Prisma schema | PASS: zero difference, exit 0 | `06-schema-diff.log` |
| Seed | PASS: 50 products, 300 variants | `07-seed.log` |
| Monorepo typecheck | PASS, including frontend project references | `08-typecheck.log` |
| Monorepo lint | PASS | `09-lint.log` |
| Backend and frontend builds | PASS | `10-build.log` |
| Backend Vitest | PASS: 194 passed, 0 failed, 1 skipped across 23 files | `backend-tests.json`, `11-backend-tests.log` |
| Frontend Vitest, two workers | PASS: 67 passed, 0 failed across 14 files | `frontend-tests.json`, `12-frontend-tests.log` |
| Git whitespace check | PASS | `git diff --check`, run on current workspace |
| Compiled API smoke in demo/test environment | PASS: HTTP 200 and success=true for `/health`, `/api/v1/health/ready`, `/api/v1/products`; graceful shutdown | `run-1788756639930/10b-artifact-smoke.log` |

The sole skipped test is the real Redis integration test; this local run intentionally provisions no Redis. CI coverage and Redis execution remain pending. Payment-provider network/signature tests include mocks and do not establish real gateway acceptance. The four durable-commerce boundary tests and thirteen payment-hardening tests actually executed against this disposable PostgreSQL instance.

Initial-run failures are retained for traceability: schema drift, missing Node imports in the new CI bootstrap, invalid frontend test status, and seed-dependent payment-suite setup. These are verification/tooling defects, not grounds to weaken product assertions.

The initial frontend run reported 67 passing assertions. A separate diagnostic pnpm invocation from the frontend directory triggered the existing nested lockfile and reinstalled dependencies in that disposable snapshot; the final run therefore uses a fresh snapshot and root workspace commands exclusively. That initial frontend output is superseded by the final run for acceptance.

The first artifact smoke script incorrectly requested `/ready` and received 404. The corrected script uses the application's registered `/api/v1/health/ready` route; no application routing change was made for the probe. Its separate snapshot repeats install, migrations, seed and build before testing the compiled server.

All stages in the corrected artifact run exited 0. Both verification clusters shut down after their runs. The artifact check runs compiled JavaScript in the isolated demo/test configuration; it does not certify a production environment configuration or real payments.

After the full-suite snapshot, only documentation and two end-of-file blank-line removals changed in the workspace (`backend/src/utils/errors.ts`, `frontend/src/store/cartStore.ts`). `post-validation-differences.json` confirms both code files are identical after trimming trailing whitespace. This cleanup makes the existing Git whitespace gate pass without altering application behavior.

To reproduce locally with the retained external tooling, run `node <evidence-root>/run.mjs` from the repository root. Use `--artifact-only` for the separate artifact pass. The runner requires the retained external runtime installation and records individual command exit codes; consult `results.json` rather than treating runner process exit alone as proof that every stage passed.

## Remaining release evidence

- Reviewed commit containing every required migration and source file, followed by clean-checkout GitHub CI execution (including Redis and coverage).
- Authenticated browser, persistence, cross-user, full writer-concurrency and responsive/accessibility acceptance in their assigned phases.
- Populated upgrade rehearsal, staging configuration, alerting, backup restore and rollback evidence.
- Real provider credentials, confirmed API contract and real financial certification remain deferred. Existing provider mocks/fallbacks are not certification.

The original 43/100 and NO-GO audit remain the baseline. Local Phase 1 checks do not establish production readiness or a new score.
