# Ten-phase plan verification — 7 September 2026

**Decision: approve the architectural direction, subject to the amendments below. This is plan approval, not production release approval.** Further implementation is paused at the user's requested review checkpoint.

## What is sound

The plan addresses all 29 audit IDs, puts reproducibility and security before broader feature completion, and defines evidence beyond compilation. It targets the correct owners of the observed failures: session lifetime, transactional inventory, durable request identity, payment transitions, API contracts and release artifacts. It preserves the existing worktree and separates demo payments from real financial operations.

Root-cause resolution means fixing an invariant at its owning boundary and proving every caller respects it. It does not require replacing the architecture or introducing an outbox, queue, cache or abstraction where the existing transaction boundary is sufficient.

## Required amendments before execution

1. **Separate demo acceptance from real-provider acceptance in Phases 4, 5 and 10.** Demo checkout, durable request identity, replay, expiration, stock and clearly labeled simulated outcomes can be completed now. Real initiation/authentication/callback/refund/settlement certification remains deferred. Phase 6 and later demo work must depend on the stable demo contracts, not on unavailable merchant credentials. Preserve the production prohibition on demo payments. Define the demonstration deployment environment explicitly rather than enabling simulated payment completion on a real-money store.

2. **Strengthen the Phase 1 isolation gate.** An environment variable or a database name containing “test” is not sufficient proof of isolation. Record the intended disposable host/database, use credentials restricted to that environment, verify the target before migration/seed/test execution, and prove migrations on an empty database. Preserve a baseline of existing changes so implementation work is distinguishable from pre-existing changes. Do not migrate the configured shared database as a way to unblock tests.

3. **Specify the complete transaction and lifecycle invariants before Phases 3–5.** A sorted variant lock alone does not establish a global lock order. Include user/cart, payment, order, product, variant, reservation and coupon interactions, including worker batches. State the order used by each operation, avoid cycles, and test deadlock/failure recovery. Define cart merge ownership across accounts/tabs, idempotency retention and expiry, replay after cart changes or successful checkout, late payment outcomes, and full versus partial return/refund policy. A successful simulated refund must never imply real money was returned.

4. **Use per-phase release and evidence gates.** For each implementation change record: failure mechanism, failing reproduction, chosen invariant/owner, affected callers, migration compatibility, regression results and rollback approach. Prefer additive migrations and forward repair where rolling back would destroy valid new data. Run relevant security/browser/contract checks during each phase; Phase 8 is the full regression pass, not the first time behavior is exercised. Phase 9 collects measurements from the beginning, then optimizes only measured bottlenecks.

5. **Make acceptance measurable and status truthful.** Establish performance workload/latency/error budgets, recovery objectives and alert expectations before measuring acceptance; do not invent thresholds without a workload. Use `Planned`, `Implemented`, `Locally verified`, `Staging verified` and `Deferred` states. A phase is complete only when its applicable exit evidence exists. The score remains an evidence-based audit judgment, not a guaranteed reward for finishing tasks.

## Current checkpoint

Some code changes were already made under the earlier explicit implementation request. They include database-test isolation, migration visibility, request quota handling, stock ownership, durable guest merging, demo checkout request association, session fencing, token binding, monetary precision and portions of packaging/form handling. These are **partial implementation**, not closure of their entire audit findings or phases.

The plan references `production-remediation-progress.md`, but that file was absent at verification time. Establish that tracker from actual diffs and test evidence at the start of Phase 1 rather than assuming everything remains untouched or has already passed.

Two new migrations are authored for durable cart merge records and email verification target binding. Prisma client generation was performed locally; these migrations have **not** been applied to the configured shared database. The changed application therefore requires migration deployment to an appropriate isolated environment before its database behavior can be accepted.

Recursive TypeScript checking passed at this checkpoint. Earlier scoped tests covered several new frontend/session and HTTP trust-boundary cases. No clean-database integration/concurrency run, complete authenticated browser acceptance, clean staging deployment, backup restore or real provider certification is established. Full final-tree verification remains required; the earlier 43/100 audit is the baseline, not a newly recalculated score.

A fresh focused frontend test invocation during this review returned passing results for pricing (5 tests) and payment navigation (4 tests) when it was stopped at the review checkpoint. The overall invocation is **incomplete**, not a suite pass; investigate/rerun it during Phase 1.

## Execution order retained

1. Reproducible baseline, isolated database and evidence tracker.
2. Authentication, authorization, request security and private-state ownership.
3. Atomic inventory, cart merge and checkout snapshots.
4. Durable demo checkout/initiation; real-provider extension deferred.
5. Demo state-machine/reconciliation and honest refund semantics; real-money verification deferred.
6. Exact amounts, order contracts and data invariants.
7. Customer/admin workflow completeness and truthful UI behavior.
8. Complete browser, accessibility and responsive regression.
9. Measured performance, monitoring and operational fault detection.
10. Demo staging rehearsal and recoverability sign-off; separate future real-money launch gate.

**Next implementation step after this checkpoint:** Phase 1 reconciliation of the existing changes and an isolated migration/test run. Do not restart the earlier fixes blindly or declare any phase complete from typechecking alone.
