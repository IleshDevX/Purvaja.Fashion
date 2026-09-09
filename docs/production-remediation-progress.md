# Production remediation progress

Last checkpoint: Phase 9 execution, 9 September 2026. Baseline audit: 43/100, NO-GO. Real payments remain deferred by user instruction; demo testing must never be treated as real financial certification.

## Status rules

`Implemented` means code exists. `Locally verified` requires named passing checks on the identified snapshot. `Staging verified` requires deployment evidence. `Deferred` identifies an intentionally unavailable integration. No phase is complete solely from compilation, mocked tests or a locally applied migration.

## Phase tracker

| Phase | Current status | Remaining acceptance evidence |
|---|---|---|
| 1 — Baseline, isolation, migration and test reproducibility | Local migration/build/test checks verified; release gate pending | Reviewed commit with all migrations; clean-checkout GitHub CI with Redis/coverage; compiled artifact smoke result recorded in verification report |
| 2 — Auth/request/private-state ownership | Implementation and available local verification complete, including authenticated Chromium persistence/account switching | Hosted CI live-Redis result, live email delivery, cross-tab and deployed staging topology acceptance; see phase-2-verification.md |
| 3 — Inventory/cart/checkout snapshots | Implementation, populated migration rehearsal and compiled two-process workload locally verified | External staging topology replay after a staging API, dedicated database and shared Redis are provisioned; see phase-3-verification.md |
| 4 — Durable checkout/initiation | Durable initiation lease/session persistence and applicable local fault, retry, refresh and concurrency verification complete | Live PhonePe contract/sandbox navigation and external staging replay deferred; see phase-4-verification.md |
| 5 — Payment/reconciliation/refunds | Implementation and applicable local verification complete: monotonic transitions, durable observations/refunds, demo refund semantics, retry/unknown handling | Live PhonePe contract, sandbox refund/settlement and external staging remain deferred; see phase-5-verification.md |
| 6 — Money/contracts/data integrity | Implementation, isolated verification, populated snapshot migration rehearsal and 16-check consistency scan complete locally | Repeat against the external hosted staging environment when provisioned; see phase-6-verification.md |
| 7 — Customer/admin workflows | Implementation and isolated API/UI/Chromium verification complete | Repeat authenticated lifecycle in hosted staging and connect media/newsletter/shipping providers when selected; see phase-7-verification.md |
| 8 — Browser/accessibility/responsive | Shared dialog/accessibility implementation and isolated Chromium viewport/journey acceptance complete locally | Repeat on hosted staging and complete physical-device, WebKit/Firefox and manual assistive-technology checks; see phase-8-verification.md |
| 9 — Performance/operations | Architectural implementation and isolated acceptance complete | Deployed multi-process Redis aggregation, real on-call routing, hosted load/Core Web Vitals and populated consistency scan; see phase-9-observability-runbook.md |
| 10 — Deployment/recoverability | Locally complete; production certification pending | Hosted staging artifact, external smoke, physical restore drill, Docker runtime and operator alert evidence |

## Phase 1 baseline reconciliation

- Base Git commit: `85f7493c6be8bd5a99d64e982c535428658177fa`. The audited/executed state includes substantial pre-existing modifications and untracked files; HEAD alone is not the tested state.
- The pre-Phase-1 status inventory contains 98 modified tracked entries, 2 deletions and 43 untracked entries (directories can be grouped). File hashes identify each independent snapshot used for verification. Snapshots exclude ignored `.env` files, existing node_modules and generated output. The inventory is not evidence that every prior change was authored in this phase.
- Eleven migration SQL files exist. Seven are untracked, including the two earlier remediation migrations. They are no longer ignored, but release inclusion still requires a reviewed commit. No existing migration SQL is rewritten during Phase 1.
- Earlier code changes belong to multiple phases and are carried forward as partial implementation. Their presence does not imply acceptance, and Phase 1 must not silently replace or expand that work.

## Phase 1 implementation scope

- Test connection validation now requires an authenticated loopback PostgreSQL target with an explicit disposable database name, rejects URL connection overrides and shared-schema targeting, and verifies actual server/database identity and role privileges before test modules execute.
- Tests without TEST_DATABASE_URL cannot inherit the application database. Existing application guard refuses database access in test mode without that explicit setting.
- CI bootstrap creates a database-owning test role with no cluster administration privileges and generates a separate ephemeral seed-admin password. Ordinary migration/deployment commands remain explicit administrative operations; they are not automatically run against the shared database.
- The external runner provisions a dedicated PostgreSQL 16 cluster, confines it to loopback, gives the test role access only to its test database through pg_hba, supplies all connection values to migration/test child processes, records evidence and shuts down the cluster afterward.
- No real gateway credentials or hosted database credentials are needed by this runner. Payment mode is demo; external email/provider/cache credentials are removed from its child environment.
- Prisma declarations now match the existing SQL history: four database-generated UUID defaults and the verification-token lookup index. Applied SQL is unchanged.
- Frontend typechecking now follows both TypeScript project references. The earlier empty-root invocation missed source errors; an invalid payment-status fixture was corrected to the actual contract.
- The payment-hardening suite creates and removes its own product/stock fixture instead of borrowing seed catalogue stock. CI now checks migration replay and schema agreement.

## Compatibility and recovery

These Phase 1 changes affect test/CI execution, not production table definitions. They intentionally reject the previous unsafe hosted/superuser test setup. Configure CI's restricted role before enabling the strengthened test guard. Reverting test tooling would remove isolation protections and is not a remedy for failing product tests.

The existing new application migrations still need reviewed deployment to the intended environment. Verification-token target binding invalidates unbound legacy email-change links; those users require reissued links. Do not rewrite applied migrations or automatically undo data transitions. The disposable verification cluster can be recreated; the shared database is untouched.

## Evidence and release decision

See [Phase 1 verification](phase-1-verification.md) for snapshot identity, root causes, commands, evidence and limits. All eleven migrations replay on empty PostgreSQL with zero schema drift. Frozen install, generation, lint, typecheck and both builds pass. Backend tests: 194 passed, 0 failed, 1 live Redis test skipped. Frontend tests: 67 passed, 0 failed. The original score and NO-GO decision remain until findings and release gates are independently closed. This phase does not authorize deployment or later-phase feature implementation.

## Phase 6 completion checkpoint

Phase 6 removes mixed rupee/paise arithmetic from catalogue, cart, checkout and order boundaries; standardizes pagination and order action contracts; separates editorial rating fixtures from published-review aggregates; and adds database constraints plus exact-count consistency checks. The isolated defect-injection suite proves that totals remain exact beyond the 20-row diagnostic sample limit.

See [Phase 6 verification](phase-6-verification.md) for the root-cause analysis, migration behavior, named tests and evidence. The full verified snapshot replayed all 16 migrations with zero drift and passed backend tests (229 passed, 2 intentional skips), frontend tests (77 passed) and Chromium (2 passed). A separate populated rehearsal classified pre-migration data, cloned the database at a transaction-consistent boundary, migrated the clone from 15 to 16 migrations, preserved exact financial and provenance records, rejected a one-paise corruption at the database constraint and passed all 16 read-only consistency checks with zero anomalies. Phase 6 local pre-staging acceptance is complete. External hosted staging and later phases keep the overall release at 43/100, NO-GO.

## Phase 7 completion checkpoint

Phase 7 replaces component-only catalog filters with validated URL-owned state; completes controlled admin product, image, category, variant, and publication workflows; and enforces publication readiness inside the backend transaction. Profile preferences and newsletter consent are persisted. Tracking and subscription messages expose unavailable integrations instead of invented delivery, carrier, ETA, or support claims.

See [Phase 7 verification](phase-7-verification.md) for root causes, provider decisions, acceptance coverage, and limits. The isolated snapshot replayed 17 migrations with zero schema drift, passed lint/typecheck/build/artifact smoke, 232 backend tests with 2 intentional live-integration skips, 82 frontend tests, and 4 Chromium journeys. Phase 7 local acceptance is complete. Hosted staging and provider-backed media, email delivery, and carrier scans remain unverified, so the release remains 43/100, NO-GO.

## Phase 8 completion checkpoint

Phase 8 replaces ten independently managed modals and drawers with one accessible dialog contract for focus, Escape dismissal, scroll locking, restoration, and background isolation. Authentication pages now expose a main landmark and skip link; failures and icon controls are announced and labelled; invalid catalog shortcuts were corrected. The browser matrix also found and removed real 320 px overflow in catalog pagination and product-detail tabs.

See [Phase 8 verification](phase-8-verification.md) for the root-cause analysis, route/viewport matrix, saved browser artifacts, and production limits. The isolated snapshot replayed 17 migrations with zero drift and passed frozen install, typecheck, lint, build, artifact smoke, 232 backend tests with 2 intentional external-integration skips, 84 frontend tests, and 8 Chromium journeys. Phase 8 local acceptance is complete. Hosted staging, physical-device, WebKit/Firefox, and manual assistive-technology evidence remains open, so the release remains 43/100, NO-GO.

## Phase 9 completion checkpoint

Phase 9 bounds matched-route telemetry, aggregates leased worker snapshots through shared Redis, wires metrics at cache/payment/refund/worker boundaries, detects stalled reservation cleanup, and delivers deduplicated operational webhooks. The read-only consistency scan now uses the real inventory audit action, correct event identity and broader cancellation predicates, and checks durable unknown payments plus failed or stale refunds. A repeatable browser workload records API latency/throughput and local Core Web Vitals without adding transaction-state caching or unmeasured indexes.

See [Phase 9 operations and verification](phase-9-observability-runbook.md) for the root causes, alert response matrix, measurements, and limits. The final isolated snapshot replayed 17 migrations with zero drift and passed frozen install, typecheck, lint, builds, artifact smoke, 236 backend tests with 2 intentional external-integration skips, 84 frontend tests, and 10 Chromium tests. External multi-process Redis aggregation, the selected monitoring platform/on-call route, hosted load/Core Web Vitals, and a populated hosted consistency scan remain unverified.

## Phase 10 checkpoint

See [Phase 10 launch and recovery](phase-10-production-launch.md). Repository-level controls now use an explicit smoke target environment, checksum-backed backup manifests, a destructive restore guard tied to a separate recovery database, measured restore reports, immutable application releases, atomic activation and application rollback on failed probes. Compose no longer contains reusable database/session credentials and readiness owns container traffic health.

The isolated Phase 10 database replayed all 17 migrations with zero schema drift. Typecheck, lint, both builds, deployment YAML parsing, 238 backend tests with 2 intentional external-integration skips, 84 frontend tests, and 10 Chromium tests passed. The independent post-suite consistency scan passed all 17 checks with zero anomalies. Hosted staging deployment, external smoke, physical archive restore with measured RPO/RTO, Docker execution, real on-call delivery, live email, and live PhonePe remain **Not Verified** or **Deferred**. The baseline score remains 43/100 and the launch decision remains **NO-GO**; local implementation does not establish a 100/100 production certification.
