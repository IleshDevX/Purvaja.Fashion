# Phase 6 verification: exact money, order contracts and data integrity

Date: 8 September 2026

Scope: remove lossy money conversions and ambiguous client contracts, establish authoritative review provenance, and make stored business invariants measurable with exact totals and bounded diagnostic samples.

## Root-cause findings

Product, cart and checkout adapters mixed rupee decimals with integer paise. Variant overrides could therefore be discarded or rounded at different layers. Product and order clients also accepted several incompatible response shapes, invented fallback identifiers and silently mapped unknown states. That hid server/client contract drift. Seeded editorial ratings shared the same fields as verified review aggregates, so displayed values could not be traced to their source. The consistency checker sampled records without first calculating the complete affected population, which could understate a large incident.

## Architectural remediation

- Money remains integer paise through database fields, API DTOs, cart state, checkout snapshots, coupon calculations, shipping calculations, order lines, refunds and product variant selection. Rupees are derived only for presentation.
- Product price filters are explicit `minPricePaise` and `maxPricePaise`. Product responses expose base and selected-variant paise values rather than asking the browser to reconstruct them.
- Collection responses use one `{ items, page, limit, total, totalPages }` contract. Product and order adapters reject malformed envelopes and unknown states instead of guessing.
- The order service owns action eligibility and returns `availableActions`. Cancellation and return clients follow those server decisions. Return requested, returned and refunded are represented as separate workflow and financial states.
- Published reviews are the source of actual `rating` and `reviewCount`. Illustrative seed values live in `editorialRating` and `editorialReviewCount`, and the response identifies which source is displayed.
- Database constraints enforce nonnegative catalogue prices, coherent review aggregates, exact order-line arithmetic, bounded order totals and positive payment amounts.
- The consistency checker reports an exact anomaly count for the full requested window and separately returns at most 20 diagnostic examples. It covers order arithmetic, payment/order amounts, review aggregates and checkout idempotency associations in addition to the existing inventory/payment checks.

## Migration and compatibility

Migration `20260908170000_phase6_exact_money_and_review_provenance` adds the `OUT_FOR_DELIVERY` order state, editorial review columns and integrity constraints. It preserves historical seeded review figures as editorial metadata when no published reviews exist, then recomputes actual aggregates from published review rows.

The constraints deliberately stop deployment when a populated target contains invalid financial records. The safe release sequence is backup, read-only consistency report, anomaly classification and approved data repair, followed by migration rehearsal on a restored staging copy. Rewriting the migration or weakening constraints to admit unexplained records is not an acceptable remedy.

## Verification coverage

The Phase 6 integration suite verifies selected-variant paise, precise product price filtering, order pagination/filter/search/sort and server-owned actions. It first establishes a clean consistency baseline, then injects 21 order financial defects plus review and idempotency defects. The checker returns the exact count of 21 while bounding examples to 20, and each injected defect fails its named invariant.

Frontend coverage verifies fractional unit prices, multi-quantity arithmetic, one-paise discounts and shipping without floating-point loss. Order adapter tests verify paise preservation, distinct return-requested/refunded state and fail-closed handling of unknown server states.

Evidence snapshot: `C:/Users/ilesh/.codex/visualizations/2026/09/06/01a07702-324d-7621-ba86-b89066893a09/phase1/run-1788867080486/`.

All snapshot commands finished with exit code zero: frozen install; isolated non-superuser PostgreSQL identity check; Prisma validation and generation; all 16 migrations on an empty database and repeat deployment; zero schema drift; seed; recursive typecheck and lint; both builds; compiled artifact smoke; backend tests; frontend tests; and authenticated Chromium. Backend: 229 passed, 0 failed, 2 intentionally skipped across 73 suites. Frontend: 77 passed, 0 failed across 38 suites. Playwright Chromium: 2 passed.

After tightening the checkout-session payment-status type and correcting the API reference, frontend typecheck, lint, all 77 tests and the production build passed again. `git diff --check` returned no whitespace errors; its CRLF notices are repository line-ending warnings.

## Populated snapshot migration and consistency gate

Evidence snapshot: `C:/Users/ilesh/.codex/visualizations/2026/09/06/01a07702-324d-7621-ba86-b89066893a09/phase1/phase6-populated-gates-1788886722367/`.

The verifier created a restricted, loopback PostgreSQL 16 database, deployed the first 15 migrations and inserted linked Phase 5 records. The population included fractional-paise-sensitive order arithmetic, payment and checkout-idempotency associations, two published reviews, and one explicitly classified editorial-rating fixture. Pre-migration classification found zero unexplained financial, payment, idempotency or customer-review anomalies.

With all source connections closed, PostgreSQL created a transaction-consistent database clone using `CREATE DATABASE ... TEMPLATE`. Phase 6 was applied only to that restored clone. The rehearsal preserved users, products, reviews, exact order lines and totals, payments and idempotency links. It recomputed the published-review aggregate and moved the no-review fixture to editorial provenance as designed. All 16 migration records finished without rollback, repeat deployment found nothing pending, and Prisma reported zero drift. An attempted one-paise line-total corruption was rejected with check-constraint SQLSTATE `23514` and rolled back.

The compiled read-only consistency command then passed all 16 checks with zero anomalies. This completes the populated-database migration rehearsal and read-only data scan in a disposable local staging-equivalent topology.

An external hosted staging database was not supplied, so deployment-environment sign-off remains **Not Verified**. External multi-instance and live PhonePe evidence remain deferred as documented in earlier phases and still block the overall production launch decision.

Phase 6 implementation and local pre-staging acceptance are complete. The baseline production score remains 43/100 and the release decision remains NO-GO until later phases and external deployment gates are completed with their required evidence.
