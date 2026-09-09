# Production readiness: ten-phase remediation plan

Baseline: 6 September 2026 audit, 43/100, NO-GO. This is an implementation and acceptance plan, not a promise that completing code edits yields 100/100. Every phase requires root-cause removal, regression proof and recorded execution evidence. Existing working-tree changes must be preserved. Do not run mutating tests or migrations against the configured shared database.

**Scope clarification:** the user has no payment gateway credentials and requested demo payments only. Keep the production demo-payment prohibition. Implement and verify demo lifecycle behavior now; real PhonePe initiation, capture, refund and settlement certification remain deferred until credentials and the merchant API contract exist. A deployable demonstration is not a real-money production launch.

## Phase 1 — Reproducible release and isolated verification

**Root cause:** the working database and workspace contain changes that a clean Git checkout cannot reproduce; test configuration can inherit a shared database.

- Correct SQL ignore scope so all intended migrations can be included in the release; never rewrite already-applied migration contents.
- Require an explicit disposable test database for integration tests and override both database connection settings before application imports. Unit tests must not inherit the development database.
- Make production operational commands execute compiled JavaScript; retain separate development commands.
- Capture baseline and per-phase evidence, distinguish authored tests from executed tests, and make CI recreate schema from scratch.
- Files: `.gitignore`, `backend/tests/setup.ts`, Vitest configuration, backend/root package scripts, `.github/workflows/ci.yml`, deployment artifacts.
- Acceptance: frozen install and generate/build/lint/typecheck; fresh database migrations and fixtures; no shared-database fallback; all required migrations included in the final commit.
- Dependencies: disposable PostgreSQL instance; no merchant dependency.
- Exit evidence: clean-checkout CI run, schema comparison and production artifact smoke. **Do not mark complete merely because ignored files become untracked.**

## Phase 2 — Authentication, request security and private-state ownership

**Root cause:** request identity trusts caller headers; session-owned browser state has no consistent owner/lifetime; recovery tokens are insufficiently bound to their lifecycle.

- Derive rate-limit identity from Express's configured trusted-proxy interpretation; restrict test overrides to test execution; debit each limiter once; use a shared limiter store before multi-process launch.
- Await logout confirmation and show failure; invalidate/cancel private requests and clear user-owned stores on account/session boundaries; reject stale async completions.
- Bind verification tokens to target email/purpose and invalidate sibling reset tokens when changing credentials; revoke appropriate sessions.
- Require explicit privileged seed credentials. Scrub token query values from telemetry and logs.
- Files: rate-limit/auth/error middleware, auth service, auth store/types, query provider, checkout/cart stores, seed/config and client reporter.
- Acceptance: spoofed-header probes fail; 401/403/200 and cross-user resource matrix; A→logout→B has no stale data even with delayed requests; failed logout remains visible; old token replay fails.
- Dependencies: Phase 1; live email sandbox for delivery acceptance.
- Audit coverage: A05, A06, A24, A25, A27, A28.

## Phase 3 — Atomic stock, cart ownership and checkout snapshots

**Root cause:** different stock writers use inconsistent read/write protocols; synchronized server items are mistaken for unmerged guest additions; sellability/pricing are read outside their consistency boundary.

- Centralize stock mutations in a transactional inventory service. Lock variants in deterministic order before reading; derive movement before/after quantities from locked state. Route checkout, releases, returns and administrative writes through it.
- Revalidate parent product and variant status plus authoritative price during checkout; define explicit handling for price changes.
- Replace additive guest replay with a server-owned idempotent merge operation, durable merge identity and explicit guest/server provenance; never silently swallow partial merge failure.
- Files: commerce/admin services, new inventory service, cart DTO/controller/validator/store, Prisma migration for durable merge identity where required.
- Acceptance: stock=2 and three simultaneous one-unit purchases gives two successes; concurrent purchases/releases/returns/admin writes reconcile; retry/focus/reload/parallel-tab merge applies each guest addition once.
- Dependencies: Phase 1; isolated PostgreSQL concurrency runner.
- Audit coverage: A01, A07, A11.

## Phase 4 — Durable checkout and provider initiation

**Root cause:** idempotency association is written after committing an order and making an external request; simultaneous initiation has no durable exclusive claim.

- Commit checkout request identity, canonical payload hash, order, reservations and payment association together.
- Preserve committed request state on provider timeout; use a durable initiation lease/outbox and provider idempotency reference, not a process-local mutex.
- Persist provider redirect/session response and reuse it on retry; distinguish definite failure from an unknown external outcome.
- Preserve client checkout attempt identity across refresh and prevent unintended reuse when the confirmed purchase changes.
- Use validated full-page navigation for hosted provider URLs; route internal demo URLs separately.
- Files: commerce/provider services, Prisma payment/idempotency schema and migration, checkout store/page and contract tests.
- Acceptance: crash/fault injection at every commit/provider boundary; simultaneous attempts; lost response; retry after refresh; no duplicate payable order or reservation; external sandbox navigation works.
- Dependencies: Phases 1–3 and confirmed merchant API contract.
- Audit coverage: A03, A08.

## Phase 5 — Authoritative payments, reconciliation and refunds

**Root cause:** provider version assumptions and duplicated status writers can disagree; fulfillment status incorrectly controls callback replay; local refund status substitutes for money movement.

- Confirm provisioned PhonePe version and implement its official request/authentication/callback contract. Never infer credential semantics from environment variable names.
- Use one monotonic payment transition function with locked fresh reads. Fetch provider status outside database transactions and apply validated observations inside short transactions.
- Make callbacks idempotent after shipping/delivery and reject forged/mismatched merchant, order and amount values.
- Add durable reconciliation and refund ledger/workflow for late captures, cancelled orders and full/partial returns. Represent requested/pending/failed/succeeded refunds honestly.
- Files: payment provider and commerce/admin services, worker, refund schema/migration and payment/return UI contracts.
- Acceptance: merchant sandbox signature/authentication fixtures, duplicate/out-of-order callbacks, expiry versus capture, full/partial refund, duplicate refund submission, timeout/retry and captured/refunded/net reconciliation.
- Dependencies: Phase 4; merchant sandbox/version and refund capability.
- Audit coverage: A02, A09, A10. No live-money release before this gate.

## Phase 6 — Exact money, order contracts and data integrity

**Root cause:** client adapters lose minor-unit precision and assume incompatible response shapes; stored aggregates/checkers are not aligned with canonical business invariants.

- Keep money in integer paise throughout DTOs/calculations; format only in presentation. Expose selected-variant prices explicitly.
- Align cancellation response, filter/pagination semantics, action eligibility and separate return-requested/returned/refunded states.
- Recompute review aggregates safely under concurrent authors; separate illustrative fixtures from actual reviews.
- Classify existing data anomalies before remediation; add read-only exact invariant checks and explicit totals versus bounded samples.
- Files: API contracts/mappers, product repository, commerce/admin/review services, consistency checker and approved repair scripts.
- Acceptance: fractional prices/overrides/discount/shipping totals agree; controller-to-client contract tests; zero unexplained financial/review/idempotency anomalies; injected defects always fail consistency checks.
- Dependencies: Phases 3–5, data ownership/provenance.
- Audit coverage: A12, A13, A20, A21, A22.

## Phase 7 — Complete customer and admin workflows

**Root cause:** UI controls and success states exceed implemented API capabilities; category/save/error state transitions are incomplete.

- Synchronize filters with validated URL state, including links, back/forward and pagination.
- Complete admin image/attribute/publication lifecycle and explicit empty-category semantics; use controlled or captured form elements across awaits.
- Add explicit pending/empty/failure/retry states to reads and mutations.
- Persist supported profile preferences/newsletter subscriptions or clearly remove unavailable promises; show real shipment data or an honest unavailable state.
- Files: ShopPage, admin forms/validators/routes, account/footer/tracking pages, image/shipment/subscription services where approved product requirements exist.
- Acceptance: authenticated create/edit/delete or archive as applicable, refresh/new-session persistence, store visibility, error recovery and truthful success feedback.
- Dependencies: Phases 2 and 6; decisions on image storage, shipping and newsletter provider.
- Audit coverage: A14–A19.

## Phase 8 — Browser, accessibility and responsive acceptance

**Root cause:** component tests have been treated as broader usability evidence; modal behavior is implemented inconsistently.

- Introduce a shared accessible dialog primitive with initial focus, trapping, restoration, Escape and background isolation; label icon actions and announce failures.
- Run real customer/admin journeys with isolated fixtures, including authorization denial, refresh, back, slow/offline/failed requests and keyboard-only usage.
- Verify 320, 375, 390, 768, 1024, 1280 and 1440 widths across all critical pages/dialogs. Fix actual overflowing elements without hiding content.
- Files: shared dialogs/drawers, responsive styles and browser acceptance suite.
- Acceptance: no horizontal overflow, usable tables/forms/tap targets, screen-reader labels, visible focus, reduced-motion behavior and saved browser evidence for each journey.
- Dependencies: Phases 2–7; runnable isolated full stack.
- Audit coverage: A26, A29 plus earlier evidence gaps.

## Phase 9 — Measured performance and trustworthy operations

**Root cause:** process-local or unwired counters cannot establish system health; optimization is not backed by representative runtime measurements.

- Wire bounded route labels and metrics at actual operational boundaries; aggregate across workers and export actionable worker/payment/refund/reconciliation signals.
- Correct consistency checker enum/action predicates; establish alerts for unknown payments, failed refunds and reservation/accounting drift.
- Measure latency/throughput/query plans/Core Web Vitals on representative fixtures before optimizing. Validate review-cache correctness and invalidation; avoid caching sensitive transaction state.
- Files: metrics/logger/checker/worker/cache services, query indexes only where measured, dashboards/runbooks.
- Acceptance: injected failure triggers a real alert; stalled worker detected; high-cardinality URLs do not grow memory; before/after performance evidence shows no correctness regression.
- Dependencies: Phases 5–8 and monitoring destination.
- Audit coverage: A22, performance/operational gaps.

## Phase 10 — Staging rehearsal and evidence-based release sign-off

**Root cause:** local build evidence does not establish clean deployment, environment correctness, recoverability or real provider behavior.

- Finish one defined storefront/API hosting topology, reviewed active CI/CD workflow, Prisma configuration/migrations and compiled runtime scripts.
- Validate TLS/proxy/cookies/CORS/CSRF/secrets, independent liveness/readiness, worker startup/shutdown and frontend deep links.
- Deploy a clean artifact to staging, execute the complete acceptance matrix, reconcile payment/stock/refund records, rehearse rollback and backup restore, and test alerts.
- Re-audit every A01–A29 finding and every unverified gate; record remaining risks explicitly. Update the score only from the resulting evidence.
- Files: Docker/hosting workflow/runtime configuration, smoke/restore scripts and release evidence document.
- Acceptance: no open critical/high defects; all agreed functional/security/concurrency/provider/browser/recovery gates pass. A score of 100 is justified only if every dimension's evidence is actually complete; otherwise publish the honest score and NO-GO/conditional decision.
- Dependencies: Phases 1–9, staging host/domain, merchant sandbox, backup/monitoring access.

## Execution status

All phases begin OPEN. Source changes and local automated passes are recorded separately in `production-remediation-progress.md`; they do not imply staging or provider sign-off. The audit baseline remains unchanged for comparison.
