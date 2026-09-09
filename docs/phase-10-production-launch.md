# Phase 10 — Staging rehearsal and evidence-based release sign-off

Phase 10 closes the repository-level launch controls. It does not convert local evidence into deployment, recovery, provider, or on-call evidence. PhonePe remains deferred because merchant credentials and a confirmed live API contract are unavailable; `PAYMENT_PROVIDER=demo` remains prohibited in production.

## Root-cause findings and fixes

| Root cause | Architectural correction | Verification boundary |
|---|---|---|
| Mutating smoke-test safety was inferred from known production hostnames. Any new production hostname bypassed that rule. | `SMOKE_TARGET_ENV` is now the authority. External mutation requires `staging`, an explicit `SMOKE_BASE_URL`, and `SMOKE_ALLOW_MUTATIONS=true`; `production` is always rejected. | Pure contract tests and the local in-process suite verify enforcement. A deployed staging run is still required. |
| The earlier “restore verification” queried the active test database and did not restore a backup. | `backup:create` produces a custom-format dump, validates its catalogue, calculates SHA-256, and writes an immutable manifest. `recovery:drill` verifies that manifest, refuses the source database, restores only to an explicitly confirmed recovery target, checks migration status and runs all consistency checks, then records measured RTO and backup age. | Contract tests pass locally. This workstation has no `pg_dump`/`pg_restore`, so a physical archive restore is not verified here. |
| The deployment template synchronized files over the live release and had no artifact-level rollback. | Each commit is copied to an immutable release directory. A validated pre-migration backup is required, activation uses an atomic `current` symlink, and failed liveness/readiness restores the previous application release. Database changes remain forward-only. | YAML structure is locally parsed. The template is inactive and has not run on a host. |
| Container inputs contained reusable development credentials and container health represented only liveness. | Compose requires externally supplied PostgreSQL and session secrets. The image and Compose health checks use `/readyz`, while `/healthz` remains the process liveness endpoint. The Node image version is tied to `.nvmrc`. | TypeScript/build and YAML parsing are local evidence. Docker is unavailable on this workstation, so image construction is not verified. |
| Operational documents described planned controls as configured production behavior. | This phase records `Locally verified`, `Not verified`, and `Deferred` separately and keeps the release decision fail-closed. | The progress tracker is the release-status authority. |

## Operational commands

Build the executable scripts before using the production commands:

```bash
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

For a staging deployment, run configuration validation before migration or traffic activation:

```bash
pnpm validate:config
RELEASE_ID=<immutable-commit-id> BACKUP_DIRECTORY=/secure/backups pnpm backup:create
pnpm db:migrate:deploy
pnpm check:consistency
SMOKE_TARGET_ENV=staging SMOKE_BASE_URL=https://staging-api.example.com SMOKE_ALLOW_MUTATIONS=true pnpm smoke-test
```

The external smoke suite creates and deletes records. Its direct database and worker checks assume the command runs inside the same staging deployment boundary as `SMOKE_BASE_URL`. Do not run it from a machine connected to a different database.

For the restore drill, provision an empty disposable database and provide the backup manifest written by `backup:create`:

```bash
RECOVERY_TARGET_ENV=recovery \
RECOVERY_CONFIRM_REPLACE=RESTORE_DISPOSABLE_DATABASE \
RECOVERY_DATABASE_URL=<disposable-recovery-database> \
BACKUP_MANIFEST_FILE=<backup.dump.json> \
RECOVERY_REPORT_FILE=<evidence-path.json> \
pnpm recovery:drill
```

The generated report records archive identity, start/end time, measured restore duration, backup age, and the validations executed. RPO and RTO targets must be approved from measured hosted drills; this repository does not invent them.

## Release and rollback contract

1. Build one immutable artifact from a reviewed commit.
2. Validate configuration and create a verified backup before applying migrations.
3. Apply forward migrations and run the read-only consistency scan.
4. Activate the release atomically and require both `/healthz` and `/readyz`.
5. If the application fails probes, restore the prior application artifact. Do not reverse database migrations automatically.
6. If data recovery is required, stop writes, preserve the failed state for investigation, restore the verified archive to a separate recovery database, validate it, and switch only through the infrastructure change process.

## Evidence and status

Locally verified in the Phase 10 isolated PostgreSQL run:

- 17 migrations deployed; repeat deployment had nothing pending.
- Phase 10 launch and recovery contract tests passed.
- Production config rejection, migration-aware readiness, distributed worker locking, graceful shutdown, consistency defect detection, secret-safe errors, and traffic activation failure behavior passed.
- Typecheck, lint, both builds, 238 backend tests with 2 intentional external-integration skips, 84 frontend tests, and 10 Chromium tests passed.
- The independent post-suite scan passed all 17 consistency checks with zero anomalies; deployment YAML parsed successfully and schema drift was zero.

Not verified:

- Clean deployment of the immutable artifact to a hosted staging environment.
- External staging smoke run, proxy/cookie behavior, and multi-instance Redis aggregation on the deployed topology.
- Physical `pg_dump`/`pg_restore` drill with measured RPO/RTO and operator sign-off.
- Docker image build and runtime probe behavior.
- Delivery of production alerts to the selected on-call system.
- Live Resend delivery.

Deferred by the current product scope:

- Live PhonePe initiation, callback, reconciliation, refund, and settlement certification.
- Real-money production launch. Production configuration intentionally rejects the demo provider.

Phase 10 implementation can be locally complete while launch authorization remains **NO-GO**. Hosted evidence and the deferred payment capability must be supplied before the system can be described as production-certified or scored 100/100.
