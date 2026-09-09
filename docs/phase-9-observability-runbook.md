# Phase 9 — Measured performance and trustworthy operations

Date: 9 September 2026. Scope is Phase 9 only. This document separates implemented controls, isolated evidence, and external evidence that remains unavailable.

## Root-cause findings and corrections

| Root cause | Architectural correction | Local acceptance evidence |
|---|---|---|
| Request metrics used concrete paths after the router stack had unwound. UUIDs, slugs, and attacker-controlled 404 paths could create an unbounded map and expose identifiers. | HTTP metrics derive labels from the matched Express route pattern. Unknown paths replace identifier-like segments, and every process has a hard ceiling of 100 route labels with overflow folded into `__other__`. | Phase 9 tests send a real parameterized request, verify that its UUID is absent, and submit 250 unique labels without exceeding the ceiling. |
| Every PM2 worker owned a separate in-memory registry, so one `/admin/metrics` response could not describe the service. | Each worker publishes a cumulative, identifier-free snapshot to the already-required shared rate-limit Redis. Entries have a 45-second lease and disappear on graceful shutdown. The admin endpoint merges live worker snapshots, including weighted route latency. Startup fails in staging/production when the shared publisher cannot connect. | Pure aggregation tests verify counters and weighted averages. Redis-backed multi-host behavior still needs deployment evidence. |
| Logs and counters did not notify an operator. A stalled timer could remain invisible. | A bounded, deduplicating webhook transport now owns alerts. Unknown payment initiation, reconciliation mismatch, late capture, failed/unknown refund, exhausted reservation cleanup, worker stall, and consistency drift emit structured alerts without request bodies or customer data. Staging/production configuration requires an HTTPS alert destination. | A loopback HTTP receiver proves delivery and cooldown deduplication. A worker that misses three completion intervals is detected. External routing/on-call delivery remains unverified. |
| The consistency scan checked audit action names that the application never writes, grouped duplicate movements too narrowly, and missed several coupon cancellation cases. Its worker check read the CLI process's empty memory rather than the running service. | The scan now matches `INVENTORY_ADJUSTED`, the variant entity and transaction-time window; groups referenced inventory movements by event identity; checks cancelled or failed-payment coupon redemptions; and replaces the invalid process-local worker assertion with durable unknown-payment and failed/stale-refund checks. A failed scan sends one deduplicated drift alert. | The scan remains read-only and its exact-count queries run in the isolated suite. A populated hosted scan belongs to Phase 10. |
| Cache telemetry was declared but not recorded at the cache boundary. | Redis hit, miss, fallback, and failure outcomes are recorded inside `CacheService`. The only cache remains public catalogue review data, with bounded TTL and product-specific invalidation. Inventory, reservations, cart, checkout, orders, payments, sessions, coupons, private customer data, and admin data remain uncached. | Cache unit tests and the complete regression suite verify Redis fallback and review-cache behavior. |
| Performance statements were not tied to a repeatable current browser/API workload. | A Playwright workload makes 60 catalogue requests at concurrency 10, records throughput and p50/p95/max latency, and validates every response contract. A Chromium journey records navigation timing, LCP, CLS, and resource count on the seeded shop page. Results are serialized into the retained browser log. | The isolated Phase 9 run supplies the measured values. These values are a local regression baseline, not production capacity evidence. |

## Operational interfaces

- `GET /healthz` is process liveness and has no dependency checks.
- `GET /readyz` verifies the database, migrations, and required provider configuration.
- `GET /api/v1/admin/metrics` is admin-only. It returns `aggregation.scope` (`process` or `shared`) and `aggregation.workerCount` with the metrics snapshot.
- `OPERATIONAL_ALERT_WEBHOOK_URL` is mandatory and HTTPS in staging/production. `OPERATIONAL_ALERT_WEBHOOK_TOKEN` is optional and sent as a bearer token.
- `RATE_LIMIT_REDIS_URL` owns shared quotas and operational metric snapshots. `REDIS_URL` remains optional and is restricted to public catalogue caching.

## Alert response matrix

| Alert code | First operator action | Resolution evidence |
|---|---|---|
| `PAYMENT_STATE_UNKNOWN` | Query the provider by the stored payment/refund identifier; do not retry a charge or refund blindly. | Durable observation/refund reaches a terminal state and consistency scan passes. |
| `PAYMENT_RECONCILIATION_MISMATCH` | Freeze manual state edits; compare provider amount/state with the locked payment and order ledger. | Correct provider observation recorded, refund completed where required, no inventory/accounting drift. |
| `REFUND_PROCESSING_FAILED` | Inspect the stored failure code and provider dashboard; retry through the idempotent refund endpoint only after the outcome is known. | Refund is `SUCCEEDED` or an approved manual resolution is recorded. |
| `RESERVATION_WORKER_FAILED` | Check database readiness, lock contention, and the correlated worker log. | A later sweep completes and expired active reservations return to zero. |
| `RESERVATION_WORKER_STALLED` | Verify the process event loop and worker timer, then perform a graceful process replacement if it remains stalled. | Worker completion timestamp advances within three intervals. |
| `DATA_CONSISTENCY_DRIFT` | Preserve the report and affected IDs; investigate the named invariant before any repair. | Root cause is corrected, repair is reviewed, and a new read-only scan passes. |

## Verification contract and limits

The isolated runner must use a fresh loopback PostgreSQL database and non-superuser role, replay every migration twice, prove zero Prisma drift, seed representative fixtures, and pass typecheck, lint, builds, artifact smoke, backend, frontend, and Chromium suites. The final evidence directory and measured values are recorded after a clean run.

Final evidence: `C:\Users\ilesh\.codex\visualizations\2026\09\06\01a07702-324d-7621-ba86-b89066893a09\phase1\run-1788952839553`.

- 17 migrations applied twice; zero schema drift.
- 236 backend tests passed; two external-integration tests intentionally skipped.
- 84 frontend tests and 10 Chromium tests passed.
- Catalogue workload: 60/60 correct responses at concurrency 10, 99.41 requests/second, p50 66.32 ms, p95 171.98 ms, max 233 ms.
- Local shop-page lab result: DOM content loaded 595.4 ms, load 600.3 ms, LCP 1,408 ms, CLS 0.218, 17 resources.
- PostgreSQL concurrent-query deprecation warnings: zero in backend and browser logs after enabling the adapter's explicit pipeline contract.

The following remain external Phase 9/10 evidence: shared Redis aggregation across deployed application processes, delivery through the selected monitoring platform to the real on-call destination, sustained production-scale load, hosted Core Web Vitals, and a populated hosted consistency scan. PhonePe remains demo-only by user instruction. These limits keep the release decision at 43/100 and NO-GO until Phase 10 evidence exists.
