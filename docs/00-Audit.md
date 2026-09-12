# Purvaja Fashion — forensic production-readiness audit

Date: 10 September 2026. Snapshot HEAD: `40761d8d85b39ffcd94cb5f2d007287a6d0ce595`. Workspace initially clean. Audit only: no source, configuration, dependency, migration, or database changes. Generated audit files live outside the repository; build/test caches and ignored build output were produced by checks.

# 1. Executive Summary

**Release decision: NO-GO. Fresh evidence-weighted score: 55/100.** This is not a probability of correctness or an inherited historical score.

The implementation contains substantial real functionality and stronger controls than older notes describe: opaque PostgreSQL sessions, RBAC, CSRF checks, transactional checkout/inventory, durable initiation leases, payment observations, a refund ledger, publication validation, and accessible shared dialogs. Nevertheless, the current implementation has release-blocking payment/configuration/retry gaps, an incomplete live refund workflow, concurrency and account-boundary risks, and incomplete external acceptance evidence.

This report identifies **26 distinct root findings: 10 HIGH, 15 MEDIUM, 1 LOW; no independently established CRITICAL remote vulnerability**. HIGH does not mean every failure was reproduced against a database. Each finding states its confidence and evidence boundary. AUD-010 could cause catastrophic data loss if the restore command is run against an alias of the source database; this audit executed only the guard.

Current execution evidence:

| Check | Current result | What it proves / does not prove |
|---|---|---|
| Node / pnpm | 24.12.0 / 11.22.0 | Actual local toolchain |
| Monorepo typecheck | PASS | Both TypeScript projects; not functional acceptance |
| Monorepo lint | PASS | Configured static rules |
| Backend unit tests | 45 passed, 2 skipped | Seven files passed; live Redis/cache cases skipped |
| Frontend tests | 84 passed / 20 files | Component/store/contract tests, mostly mocked API; not live checkout |
| Backend and frontend builds | PASS | Built artifacts generated successfully |
| Dependency audit | FAIL | 3 affected package records, 2 advisory families; development paths |
| Chromium guest viewport checks | 28 observations; no horizontal overflow/page errors | Four routes × seven widths with intercepted API responses |
| Targeted frontend repro | Confirmed retry-key deletion and false empty order state | Actual source modules and DOM, synthetic API/state |
| Targeted backend repro | Confirmed missing-amount capture, environment mismatch, alias guard acceptance | Actual service/config functions with transaction/provider doubles; no database/network |
| PostgreSQL integration / populated consistency | NOT RUN in this audit | No existing database was queried or mutated; prior passes are historical |
| Live PhonePe/email/refund/Redis, hosted staging, restore, Docker, full browser purchase | NOT VERIFIED | Configuration/code presence does not close these gates |

**Coverage boundary:** the inventory covers 288 non-generated text files, including 107 frontend source/test files and 59 backend source files; source-wide reference/security scans and targeted cross-stack review were performed. All route declarations were inventoried. Generated Prisma code, node_modules, binary assets, git-history blobs, and every line of every test were not manually reviewed. A file hash or search hit is not a claim of exhaustive line-by-line review. Full all-file/all-runtime certification requested in the brief is therefore **not established**; findings below are useful current evidence, not an assertion that no other defects exist.

Evidence artifacts: [file inventory](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/file-inventory.csv>), [route inventory](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/route-inventory.json>), [test declaration inventory](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/test-inventory.json>), [browser results](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/browser-results.json>), [backend reproductions](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/backend-results.json>), [redacted secret scan](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/secret-scan-redacted.json>), [ignored environment scan](<C:/Users/ilesh/.codex/visualizations/2026/09/10/01a089cb-86e3-7aa0-8027-11270ded5870/audit/env-scan-redacted.json>). Scripts beside these artifacts are repeatable audit harnesses, not product fixes.

# 2. Current System Architecture

Actual stack: React 19 + React Router + Zustand + TanStack Query + Axios; Vite frontend. Express 4 + Zod controllers + service layer + Prisma 7 with PostgreSQL adapter; PostgreSQL schema/migrations. Opaque random session cookies replace JWT. Argon2id replaces bcrypt. PhonePe legacy-style SHA-256/X-VERIFY adapter replaces the prompt’s Razorpay example. Redis is optional for review caching, mandatory in deployment environments for shared quotas and used for metrics aggregation. Resend handles authentication mail. MongoDB/Mongoose/Redux/JWT/Razorpay-specific checks are **not applicable**, not missing features.

Flow: Router → page/handler → Zustand or query hook → API service/client → mounted Express route → security/auth/CSRF/RBAC → controller/Zod → service/repository → Prisma/PostgreSQL → `{success,data}` or structured error → DTO mapping/store/query → UI. Financial code additionally crosses a provider adapter and a durable observation/refund ledger. Catalogue reads have a repository; most services use Prisma directly. Not every feature uses all these layers.

# 3. Overall Functional Status

Classification uses the user’s A–H system, with a necessary **NV** qualifier: implementation is present but full runtime functionality was not verified. A passing compile is never classified A by itself.

| Feature group | Classification | Current conclusion |
|---|---|---|
| Auth/profile/address | B / NV | Connected flows and passing mocked tests; cross-tab and address-atomicity gaps |
| Catalogue/detail/filter/search | B / NV | Real backend queries; facet and list-continuation gaps |
| Guest cart | B | Browser/store behavior exists; invalid-stock merge recovery incomplete |
| Authenticated cart/checkout | B / NV | Real persistence/locking code; hydration retry and settlement races |
| Live payments/refunds | B / C | Payment paths implemented; live refund adapter unavailable; production environment mismatch |
| Orders/returns/admin operations | B / E | Connected orders; operator return/reconciliation controls missing |
| Wishlist | D / local state | Local guest persistence; authenticated selections memory-only; no backend synchronization |
| Newsletter | B / E | Consent persistence implemented; delivery explicitly disabled pending provider |
| Hero/testimonials | F | Hardcoded editorial/commercial data; not live catalogue proof |
| Synthetic customers/order mail helpers | G | No runtime consumer found |
| Review update/delete/moderation, carrier, exchange | H | No corresponding executable workflow found; not automatically a security vulnerability |

# 4. Critical Production Blockers

Resolve AUD-010 and AUD-007 for recovery/account-boundary safety; AUD-001–004 for payment authority, live environment, retry identity and refunds. Close AUD-005–009 before trusting return operations, cart settlement, long-running payment sessions or Redis failure recovery. Then rerun integration/concurrency and full browser/provider acceptance on a known isolated/staging target. No code-only fix can substitute for settlement, restore or deployed-cookie evidence.

# 5. CRITICAL Issues

No CRITICAL remote breach was independently established. Do not inflate severity merely because the audit prompt is strict. The HIGH issues below are sufficient for NO-GO, and some have potentially severe financial/data-loss consequences under their stated conditions.

# 6. HIGH Issues

## [AUD-001] Operator reconciliation accepts incomplete capture evidence

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P0  
**Category:** Security / Payment  
**Exact file / location:** [backend/src/services/commerce.service.ts:791](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:791>); [backend/src/services/payment-lifecycle.service.ts:121](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-lifecycle.service.ts:121>); [backend/src/services/payment-provider.service.ts:211](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-provider.service.ts:211>)

### Problem

The operator path converts COMPLETED to SUCCESS without requiring amountPaise. The shared transition only compares an amount when supplied. PhonePe status parsing also does not reject a mismatching returned merchant/transaction identity or a non-2xx response before interpreting its body. Customer polling has a missing-amount check, so the trust policy differs by caller.

### Evidence and affected flow

A provider adapter returning COMPLETED with no amount causes SUCCESS/CONFIRMED. The audit executed the actual CommerceService with an in-memory transaction double: recordedAmount=null, paymentStatus=SUCCESS, orderStatus=CONFIRMED. This proves the missing validation branch, not that PhonePe has returned such a response or that a customer can forge the provider connection.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Require complete, validated provider observations at one shared boundary: successful HTTP result, expected merchant/payment identity, explicit integer amount equal to the authoritative amount, and a recognized terminal state. Never let omission bypass capture validation.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Fail-closed parsing can leave previously accepted ambiguous payments pending; expose reconciliation work without inventing payment success.

### Verification

Replay missing/wrong amount, wrong merchant, wrong transaction, malformed body, non-2xx success body, replay, and valid capture through callback, poll, and operator reconciliation; require identical decisions. See backend-results.json.

## [AUD-002] Production validation and runtime disagree on the payment environment

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P0  
**Category:** Configuration / Payment  
**Exact file / location:** [backend/src/config/env.ts:30](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/config/env.ts:30>); [backend/src/scripts/validate-config.ts:210](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/scripts/validate-config.ts:210>); [backend/src/services/payment-provider.service.ts:73](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-provider.service.ts:73>)

### Problem

The runtime schema defaults PHONEPE_ENVIRONMENT to sandbox. The validator reports production when the key is absent in production and rejects only an explicitly supplied sandbox value. env.ts validates raw process.env rather than the normalized schema result.

### Evidence and affected flow

A complete synthetic production configuration with that one key omitted passes validation and reports production, while the runtime schema default is sandbox. Production checkout can target the sandbox endpoint. The mismatch was reproduced without network calls.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Require an explicit production provider environment and validate the normalized configuration used by the adapter; maintain one source of defaults.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Start the actual production configuration parser with omitted, sandbox, invalid, and production values. Only explicit production may select the live endpoint. Add an artifact-level config test. See backend-results.json.

## [AUD-003] Session hydration erases the durable checkout retry key

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P0  
**Category:** Frontend / Financial integrity  
**Exact file / location:** [frontend/src/features/checkout/store/checkoutStore.ts:252](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/checkout/store/checkoutStore.ts:252>); [frontend/src/features/checkout/store/checkoutStore.ts:83](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/checkout/store/checkoutStore.ts:83>); [frontend/src/features/auth/store/authStore.ts:147](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/auth/store/authStore.ts:147>); [frontend/src/features/checkout/__tests__/frontend-purchase-flow-integrity.test.tsx:366](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/checkout/__tests__/frontend-purchase-flow-integrity.test.tsx:366>)

### Problem

On a fresh page, auth changes from null user to the restored user. The checkout subscriber treats this as an account change and calls resetCheckout(), which removes the sessionStorage attempt key. The existing refresh test resets only checkout memory and never runs this auth-hydration transition.

### Evidence and affected flow

After an order commits but its response is lost, reload and resubmit the same cart. The old key has been removed, allowing a new order/reservation. The real frontend in Chromium reproduced storage before=original-attempt, after=null during hydration. Duplicate orders/payments were not created in a database.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Distinguish initial restoration of the same persisted owner from logout/account switching. Preserve that owner’s in-flight attempt across reload; clear it on an actual boundary or confirmed terminal outcome.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not solve retry persistence by retaining another account’s address, cart, or attempt key.

### Verification

Run a full browser reload after the server commits but before the checkout response arrives; prove the same key, one order, one inventory reservation set, and one provider initiation. Include logout and account-switch negative cases. See browser-results.json.

## [AUD-004] Live refund execution and unknown-refund recovery are missing

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P0  
**Category:** Backend / Payment  
**Exact file / location:** [backend/src/services/payment-provider.service.ts:72](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-provider.service.ts:72>); [backend/src/services/commerce.service.ts:834](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:834>); [backend/src/services/payment-lifecycle.service.ts:82](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-lifecycle.service.ts:82>)

### Problem

Live cancellation/return/late-capture creates a REQUESTED refund ledger entry, but PhonePeProvider implements no refund method. processRefund therefore raises REFUND_CAPABILITY_UNAVAILABLE for the configured live adapter. In addition, a PENDING unknown refund is returned unchanged and there is no refund-status reconciliation API or worker. Ledger creation is not money movement.

### Evidence and affected flow

A paid order is cancelled or a late payment is captured after stock release. The order may be closed while the customer’s live refund remains requested indefinitely. An external manual refund process might exist, but none was supplied or verified.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Implement and verify the selected merchant refund contract, or provide an explicit operator settlement workflow that records authoritative manual refund evidence. Add unknown-outcome reconciliation and surface outstanding refunds.

### Dependencies

PhonePe merchant contract, refund ledger, operator UI/API, reconciliation worker, and alert ownership.

### Side effects / regression risk

Do not retry an uncertain refund blindly or mark it successful because a refund request was submitted.

### Verification

Verify real sandbox refund acceptance and final settlement, rejection, timeouts before/after acceptance, crash recovery, partial totals, duplicate requests, and late capture. Confirm the ledger against provider settlement; test live provider capability rather than DemoUpiProvider.

## [AUD-005] Return handling and reconciliation APIs are absent from the operator UI

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P1  
**Category:** API contract / Admin  
**Exact file / location:** [frontend/src/pages/admin/AdminOrdersPage.tsx:14](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminOrdersPage.tsx:14>); [frontend/src/pages/admin/AdminOrderDetailsPage.tsx:24](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminOrderDetailsPage.tsx:24>); [backend/src/services/admin.service.ts:640](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:640>); [backend/src/routes/admin.routes.ts:14](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:14>)

### Problem

Both operator order screens give RETURN_REQUESTED no next actions although the backend accepts RETURNED or DELIVERED. PROCESSING cancellation is also supported only by the backend. adminService has no consumer for payment reconciliation, refund processing, or operational metrics. Backend return details are not included in the operator order response.

### Evidence and affected flow

A customer requests a return. An administrator can see the order but cannot approve/finish/reject it using the shipped UI; reconciliation requires hand-authored API calls.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Expose backend-derived available actions and return-item details, add permitted operator controls, and connect reconciliation/refund operations with explicit outcome states.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not permit arbitrary state edits or bypass the refund capability gap in AUD-004.

### Verification

Customer requests partial return → operator sees exact lines → approves/rejects → stock/refund results persist after refresh. Verify guest/customer 401/403 and double submissions.

## [AUD-006] Payment settlement bypasses the cart mutation ownership lock

**Severity:** HIGH · **Confidence:** LIKELY · **Priority:** P1  
**Category:** Concurrency / Database  
**Exact file / location:** [backend/src/services/cart.service.ts:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/cart.service.ts:13>); [backend/src/services/commerce.service.ts:184](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:184>); [backend/src/services/payment-lifecycle.service.ts:174](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-lifecycle.service.ts:174>)

### Problem

Cart mutations/checkout serialize on the user row. applyPaymentObservation locks the payment but reads and updates/deletes cart items without acquiring the same user lock. The read-then-write quantity calculation can race an ordinary cart request; the payment row lock does not serialize cart writers.

### Evidence and affected flow

Settlement reads cart quantity 2 for an order of 1. Concurrent cart update commits 5; settlement writes its stale remainder 1, losing the new quantity. Deletion can similarly race an update. The interleaving is supported by implementation but was not executed against PostgreSQL.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Choose a consistent lock order for account/cart, payment, order, and inventory across all writers. Use atomic quantity operations where appropriate and re-read under the shared lock.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Simply adding a user lock after payment locks can introduce deadlocks with existing account-first paths; audit the entire lock order.

### Verification

Use synchronized barriers on two PostgreSQL connections for add/update/remove/merge/checkout versus callback/poll settlement. Assert final cart quantities, no duplicate writes, and no deadlocks.

## [AUD-007] Cross-tab account changes are not propagated to private-state ownership

**Severity:** HIGH · **Confidence:** LIKELY · **Priority:** P0  
**Category:** Authentication / Frontend  
**Exact file / location:** [frontend/src/features/auth/components/AuthBootstrap.tsx:8](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/auth/components/AuthBootstrap.tsx:8>); [frontend/src/features/auth/store/authStore.ts:163](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/auth/store/authStore.ts:163>); [frontend/src/store/cartStore.ts:135](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/store/cartStore.ts:135>); [frontend/src/services/api/client.ts:54](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/services/api/client.ts:54>)

### Problem

Session fencing is local to one tab’s auth store. There is no BroadcastChannel/storage-based auth-boundary notification or focus revalidation of /auth/me. Cookies are shared between tabs, while cart focus refresh trusts the tab’s existing owner ID. A stale tab can therefore send B’s new cookie while its UI and request generation still identify A.

### Evidence and affected flow

Tab 1 stays open as A. Tab 2 signs out and signs in as B. Focus tab 1: its cart request uses B’s cookie and can render B’s cart under A’s header. This is browser-session confusion, not proof that the backend lets A access B with A’s own session. A real two-account database-backed reproduction remains required.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Broadcast actual session boundaries and rehydrate before private requests on focus/account change. Bind responses to a verified current owner and invalidate all private queries on the boundary.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Coordinate this with AUD-003 so initial restoration is not mistaken for logout or a different account.

### Verification

Exercise A→B and admin→customer switches across two tabs with delayed reads/writes, stale 401/CSRF responses, focus, reload, and a blocked broadcast channel. Confirm no wrong-account mutation or stale private display.

## [AUD-008] Payment polling exhausts the global quota before payment expiry

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P1  
**Category:** Reliability / Performance  
**Exact file / location:** [frontend/src/pages/checkout/PaymentPendingPage.tsx:40](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/checkout/PaymentPendingPage.tsx:40>); [backend/src/middleware/security.middleware.ts:51](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/middleware/security.middleware.ts:51>); [backend/src/services/commerce.service.ts:710](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:710>); [backend/src/services/payment-provider.service.ts:122](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/payment-provider.service.ts:122>)

### Problem

The page polls every 2.5 seconds indefinitely with no in-flight guard, backoff, terminal REFUNDED handling, or 429 stop. All /api requests share 100 requests per 15 minutes per IP outside test mode. One waiting tab consumes that allowance in roughly 250 seconds, well before the 15-minute reservation expiry. A slow status API can also create overlapping 10-second provider requests.

### Evidence and affected flow

A legitimate customer waits several minutes and gets globally rate-limited, affecting cart/auth/order calls for others behind the same IP. UNKNOWN initiation remains PENDING and is not provider-polled by paymentStatus, so the page may spend its quota without resolving the ambiguity. Payment callback routes also sit behind this generic quota.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Use non-overlapping bounded polling with Retry-After/backoff, explicit ambiguous/refunded states, and an appropriate authenticated status budget. Separate provider callback ingress from customer quotas while preserving signature verification. Add scheduled reconciliation for durable unknowns.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not disable abuse controls globally or blindly reinitiate UNKNOWN payments.

### Verification

Run a 15-minute pending session, slow provider calls, two tabs, shared IP clients, Redis quotas, 429 recovery, unknown initiation and refunded outcomes; verify callback delivery remains possible.

## [AUD-009] Metrics publishing can reject without a handler and terminate the process

**Severity:** HIGH · **Confidence:** LIKELY · **Priority:** P1  
**Category:** DevOps / Reliability  
**Exact file / location:** [backend/src/services/metrics-aggregation.service.ts:112](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/metrics-aggregation.service.ts:112>); [backend/src/services/metrics-aggregation.service.ts:128](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/metrics-aggregation.service.ts:128>); [backend/src/server.ts:18](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/server.ts:18>)

### Problem

The interval invokes void this.publish() without a rejection handler. publish awaits Redis SET and may reject while the client still reports ready. Read-path getSnapshot has a catch, but the periodic path does not; the Redis client error listener does not consume the rejected command promise.

### Evidence and affected flow

After startup, a Redis command error such as READONLY/ACL failure produces an unhandled promise rejection in the Node process. With the default unhandled-rejection behavior this can crash the API worker. This fault was not injected into a running production process.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Catch and classify every periodic publication failure, bound Redis commands, recover/reconnect intentionally, and make telemetry degradation observable without an accidental process failure.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not make request-rate-limit failures fail open; metrics and quota failure policies serve different purposes.

### Verification

Run the built server in a child process, inject Redis command rejection after readiness, and assert liveness plus a bounded alert/recovery path without unhandledRejection.

## [AUD-010] Restore safety compares hostname strings instead of database identity

**Severity:** HIGH · **Confidence:** CONFIRMED · **Priority:** P0  
**Category:** DevOps / Data loss  
**Exact file / location:** [backend/src/scripts/postgres-recovery.ts:55](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/scripts/postgres-recovery.ts:55>); [backend/src/scripts/restore-database-drill.ts:43](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/scripts/restore-database-drill.ts:43>)

### Problem

The destructive restore guard rejects only identical hostname:port/database strings. It does not establish distinct server/database identities or a disposable target marker. localhost and 127.0.0.1, DNS aliases, and pooler/direct endpoints can identify the same database while passing the guard.

### Evidence and affected flow

The actual guard accepted localhost/live as source and 127.0.0.1/live as recovery with the required confirmation flags. A subsequent pg_restore --clean could replace the source database. No connection or restore was performed by this audit.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Before any destructive action, verify a distinct disposable recovery database using server/database identity and an explicit target marker, with a narrowly privileged role. Reject aliases and unresolved identity ambiguity.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

A safe fix will reject previously accepted recovery URLs until target identity is established; preserve backup artifacts.

### Verification

Use guard-only tests for equivalent host aliases and direct/pooler targets, then demonstrate the full restore only on a separately provisioned disposable target. Source data must remain unchanged. See backend-results.json.

# 7. MEDIUM Issues

## [AUD-011] Coupon preview stays tied to an old cart total

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P1  
**Category:** Business logic / Frontend  
**Exact file / location:** [frontend/src/features/checkout/utils/pricing.ts:56](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/checkout/utils/pricing.ts:56>); [frontend/src/features/checkout/store/checkoutStore.ts:130](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/checkout/store/checkoutStore.ts:130>); [backend/src/services/commerce.service.ts:315](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:315>)

### Problem

The UI stores an absolute discountPaise returned for one subtotal and reuses it after cart changes. The server recalculates percentage/cap/minimum/availability on checkout, while cartSnapshot binds only items and unit prices, not the reviewed coupon/shipping/grand total. The charged total can differ from the last displayed total even when every item price matches.

### Evidence and affected flow

Apply a 10% coupon to ₹1,000, then change the cart to ₹2,000. The stored UI discount is ₹100; the server calculates ₹200. A lowered discount or removed cap can cause the reverse difference; shipping threshold changes amplify it.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Invalidate/requote coupons on relevant cart changes and bind an authoritative priced checkout quote, including discount and shipping, to the customer’s confirmation.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve integer paise arithmetic and server-side pricing; do not trust the client-supplied discount.

### Verification

Cover quantity changes, fixed and percentage discounts, caps, expiry, admin edits between review/submit, and crossing the free-shipping threshold. Require displayed and charged totals to match.

## [AUD-012] Several screens turn loading/network failures into false empty or missing data

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P1  
**Category:** Frontend / Error handling  
**Exact file / location:** [frontend/src/pages/orders/OrderListPage.tsx:36](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/orders/OrderListPage.tsx:36>); [frontend/src/pages/account/AccountPage.tsx:70](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/account/AccountPage.tsx:70>); [frontend/src/pages/wishlist/WishlistPage.tsx:14](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/wishlist/WishlistPage.tsx:14>); [frontend/src/pages/product/ProductDetailsPage.tsx:55](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/product/ProductDetailsPage.tsx:55>); [frontend/src/pages/checkout/CheckoutSuccessPage.tsx:44](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/checkout/CheckoutSuccessPage.tsx:44>)

### Problem

Order history ignores pending/error state; address and wishlist list errors fall back to empty arrays; product details call any API failure Piece Not Found. Checkout success redirects a fetch failure to a failure page that asserts no confirmed order. VerifyEmail resend also has an unhandled async rejection and no error feedback.

### Evidence and affected flow

The audit intercepted an order-history 503 in Chromium: No Orders Found appeared with zero alerts. A paid customer whose success-page fetch times out can be told the payment was not completed. These are incorrect claims about data, not genuine 404/empty outcomes.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Separate pending, retryable outage, 401/403, 404, actual empty data, and authoritative payment failure. Retain order references on uncertainty and handle resend failures explicitly.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Inject 401, 403, 404, 429, 500, 503, timeout, offline and delayed success into each affected page; assert truthful copy and retry behavior. See orders-outage.png and browser-results.json.

## [AUD-013] Pagination metadata is discarded or inaccessible in customer/admin lists

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** API contract / Functionality  
**Exact file / location:** [frontend/src/features/orders/services/orderService.ts:338](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/orders/services/orderService.ts:338>); [frontend/src/pages/admin/AdminCustomersPage.tsx:16](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminCustomersPage.tsx:16>); [frontend/src/features/products/services/productService.ts:31](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/products/services/productService.ts:31>); [frontend/src/pages/admin/AdminOperationsPages.tsx:189](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminOperationsPages.tsx:189>)

### Problem

Customer orders request at most 100 and return only items; the UI has no page navigation. Admin customers request the default first 25 without navigation. Reviews expose only the first backend page while the product uses reviews.length as the visible count. Variant product selection is limited to the first 100 products; categories/coupons are capped at 100 with no continuation contract.

### Evidence and affected flow

Older orders, customer 26+, review 25+ under the backend default limit of 24, or a product outside the selector window cannot be reached through those lists. Search may locate some records but does not constitute pagination.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Preserve PageResult throughout services/hooks, add explicit page controls or cursor loading, and provide searchable complete reference selectors. Display authoritative total counts.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Changing list() return types affects existing hooks/components; migrate consumers together.

### Verification

Seed more than each endpoint limit in an isolated test database; navigate all pages and preserve filters/order. Confirm no missing/duplicate records.

## [AUD-014] Inventory filters use 10 instead of each variant’s configured threshold

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Admin / API  
**Exact file / location:** [backend/src/services/admin.service.ts:439](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:439>); [backend/src/services/admin.service.ts:489](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:489>)

### Problem

The database predicate classifies low stock as 1..10 and in-stock as >10, but returned status uses lowStockThreshold. The configurable threshold can therefore disagree with which page/filter contains the item. Dashboard low-stock counts also hardcode 10.

### Evidence and affected flow

Stock 15 with threshold 20 is labelled low_stock but excluded from the low-stock filter; stock 8 with threshold 5 is labelled in_stock but excluded from the in-stock filter.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Use the same per-row predicate for filtering, displayed status, counts and operational alerts.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Test thresholds 0, 5, 10, 20 and their boundaries across every filter and dashboard count. Verify pagination totals match displayed classifications.

## [AUD-015] Guest cart callers omit stock bounds and can poison the atomic merge

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P1  
**Category:** Cart / Frontend  
**Exact file / location:** [frontend/src/pages/product/ProductDetailsPage.tsx:96](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/product/ProductDetailsPage.tsx:96>); [frontend/src/pages/wishlist/WishlistPage.tsx:23](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/wishlist/WishlistPage.tsx:23>); [frontend/src/store/cartStore.ts:87](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/store/cartStore.ts:87>); [backend/src/services/cart.service.ts:38](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/cart.service.ts:38>)

### Problem

ProductDetails does not pass stockQuantity to guest addItem, so its accumulated limit becomes 20 regardless of real stock. Wishlist move selects the first combination without requiring an existing in-stock variant and may pass an empty ID. Guest merges are all-or-nothing; an unavailable line prevents every valid line from syncing.

### Evidence and affected flow

Repeated guest adds exceed the displayed stock or a wishlist move stores an unavailable variant. On login, the backend correctly rejects the merge, leaving the whole guest contribution unsynchronized. Browser-level store execution confirmed missing stock bounds allow quantity 2. This is a UX/merge issue; backend checkout still prevents overselling.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Pass authoritative bounds, require a valid in-stock selection, and provide a recoverable merge review that identifies unavailable lines without silently dropping purchases.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Keep durable merge IDs and server stock checks; do not reinterpret already-applied contributions as new ones.

### Verification

Test stock 1 with repeated adds, discontinued/missing variants, mixed valid/invalid guest lines, login retry, reload, and concurrent guest tabs.

## [AUD-016] Default-address changes are not atomic

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Database / Reliability  
**Exact file / location:** [backend/src/services/commerce.service.ts:121](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:121>); [backend/src/services/commerce.service.ts:126](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:126>); [backend/prisma/migrations/20260904103000_init_ecommerce_schema/migration.sql:542](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/prisma/migrations/20260904103000_init_ecommerce_schema/migration.sql:542>)

### Problem

The service clears existing defaults before a separate create/update. The partial unique index prevents two defaults, but does not roll back the clearing step if the following write fails. Concurrent default saves may produce a constraint failure after changing the previous default.

### Evidence and affected flow

A create or update fails after updateMany committed, leaving the account with no default even though the request failed. The database is correctly protected against multiple defaults; the defect is partial application.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Serialize and transact default clearing plus target write under the account/address ownership boundary; map expected conflicts to a useful response.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Inject a failure between clearing and writing, then run concurrent default saves. Require exactly the intended default after success and unchanged state after failure.

## [AUD-017] Request validation and persistence constraints disagree

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Validation / API  
**Exact file / location:** [backend/src/controllers/commerce.controller.ts:12](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/controllers/commerce.controller.ts:12>); [backend/src/validators/admin.validator.ts:37](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/validators/admin.validator.ts:37>); [backend/src/services/admin.service.ts:825](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:825>); [backend/src/middleware/error.middleware.ts:15](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/middleware/error.middleware.ts:15>)

### Problem

Commerce route IDs are checked only as strings before UUID casts. Several admin integer inputs lack PostgreSQL Int bounds. Coupon validation accepts percentage >100 or reversed dates that the database rejects. Generic Prisma/constraint errors become 500. Coupon date fields accept null but updateCoupon converts null to undefined, so an explicit request to clear a date is ignored.

### Evidence and affected flow

Malformed order/payment IDs and invalid numeric/coupon values reach persistence instead of returning a predictable client error. PATCH endsAt:null succeeds without removing the expiry. These are confirmed implementation mismatches; exact PostgreSQL error responses were not exercised in this run.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Validate UUIDs, integer bounds and coupled fields at the request boundary; distinguish omitted fields from null; map known persistence conflicts without leaking internals.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Existing clients relying on coerced inputs may need adjustment; preserve the established success envelope.

### Verification

Test malformed UUIDs, booleans/coercions, 2^31 bounds, oversized idempotency headers, percentage 101, reversed dates, unknown resources, duplicate keys, and explicit null clearing.

## [AUD-018] Business totals do not consistently describe settled sales

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Business logic / Analytics  
**Exact file / location:** [backend/src/services/admin.service.ts:121](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:121>); [backend/src/services/admin.service.ts:120](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:120>); [frontend/src/pages/orders/OrderListPage.tsx:203](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/orders/OrderListPage.tsx:203>); [frontend/src/features/orders/services/orderService.ts:64](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/orders/services/orderService.ts:64>)

### Problem

shirtsSold sums every order item, including unpaid/cancelled orders. Revenue sums paid-order totals without subtracting successful partial refunds. Customer order cards label the grand total Total Paid even for pending/failed orders. CANCELLED payment status falls through to pending in the frontend mapper.

### Evidence and affected flow

Abandoned checkouts inflate units sold; a partially refunded order keeps its full revenue; an unpaid order displays a paid amount. These figures can mislead operators and customers even while ledger rows remain correct.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Define gross orders, captures, refunds, net revenue and units sold separately, derive them from authoritative states/ledger events, and use explicit payment-state labels.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Check unpaid, failed, cancelled, fully/partially refunded, and delivered orders against a hand-calculated fixture ledger. Assert every displayed label matches the underlying metric.

## [AUD-019] Static storefront claims are not bound to catalogue or operational truth

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Mock/static / UX  
**Exact file / location:** [frontend/src/components/home/HeroSection.tsx:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/components/home/HeroSection.tsx:7>); [frontend/src/components/home/HeroSection.tsx:98](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/components/home/HeroSection.tsx:98>); [frontend/src/pages/home/HomePage.tsx:14](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/home/HomePage.tsx:14>); [frontend/src/features/checkout/utils/pricing.ts:17](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/checkout/utils/pricing.ts:17>); [backend/src/services/email.service.ts:48](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/email.service.ts:48>)

### Problem

Hero product names/prices are hardcoded and the passed featured product is ignored. Named five-star testimonials and international/doorstep-exchange claims are static. Checkout promises SMS/WhatsApp and air dispatch, but no connected carrier/message implementation exists. Order email methods have no production call sites. Reviews are immediately PUBLISHED while the UI says submitted for moderation. These are implementation facts; authenticity of real-world marketing claims was not verified.

### Evidence and affected flow

Changing price/archiving a product does not update its hero badge. Customers are promised communication/shipping features the software does not execute. The improved tracking screen correctly says carrier unavailable, but contradictory promises remain elsewhere.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Bind commercial prices/availability to real products, verify or explicitly label editorial/testimonial content, remove unsupported promises or implement the corresponding service/outbox, and align review moderation copy with the actual workflow.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not fabricate delivery estimates, reviews, messages or refund completion to satisfy UI assertions.

### Verification

Change/archive a featured product and refresh the homepage; verify prices. Exercise order creation/shipping with an email capture provider. Search rendered pages for unsupported carrier, exchange, international and moderation claims.

## [AUD-020] Return eligibility and rejection lifecycle do not enforce the advertised policy

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P1  
**Category:** Business logic / Orders  
**Exact file / location:** [backend/src/services/commerce.service.ts:962](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/commerce.service.ts:962>); [backend/src/services/admin.service.ts:640](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:640>); [backend/src/services/admin.service.ts:709](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/services/admin.service.ts:709>); [frontend/src/pages/home/HomePage.tsx:65](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/home/HomePage.tsx:65>)

### Problem

Return eligibility checks DELIVERED and absence of an existing return, but no elapsed-time/window rule. There is no dedicated deliveredAt snapshot. The backend’s rejection-like transition to DELIVERED leaves OrderReturn.status REQUESTED because only RETURNED updates the request record; canReturn then stays false forever. Exchange reasons are collected without an exchange workflow.

### Evidence and affected flow

An old delivered order can request a return despite the seven-day promise. Rejecting it returns the order to DELIVERED while the return remains REQUESTED, leaving contradictory records and no retry path.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Define the actual return/exchange policy, persist fulfillment event time, implement explicit approve/reject/completion decisions with coherent order/request states, and derive actions from that state.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not retroactively deny legacy orders without an agreed migration and customer-service policy.

### Verification

Verify the exact policy boundary, partial return, rejection, permitted resubmission, double request, timezone handling, and stock/refund outcomes. Resolve policy choices before changing eligibility.

## [AUD-021] Combined catalogue facets can match different variants

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Catalog / API  
**Exact file / location:** [backend/src/repositories/product.repository.ts:59](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/repositories/product.repository.ts:59>); [backend/src/repositories/product.repository.ts:60](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/repositories/product.repository.ts:60>); [backend/src/repositories/product.repository.ts:66](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/repositories/product.repository.ts:66>)

### Problem

Size, color and in-stock constraints each use a separate variants.some predicate. A product can match size in one variant, color in another, and stock in a third. Category filters also omit isActive even though publication logic reasons about active categories.

### Evidence and affected flow

A product with a sold-out M/red variant and an available L/blue variant can match size=M plus inStock=true, despite no purchasable selected size. The public API supports color even though the current shop UI does not expose it.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Build one coherent variant predicate for combined selected facets and clarify active-category behavior. Preserve intended OR semantics within a single facet and AND semantics across facets.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Use a multi-variant product where no one SKU satisfies all chosen attributes, then one that does. Verify list membership, totals, paging and direct API queries.

## [AUD-022] Locked development dependencies contain two advisory families

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** Dependencies / Security  
**Exact file / location:** [pnpm-lock.yaml:119](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/pnpm-lock.yaml:119>); [backend/package.json:25](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/package.json:25>); [frontend/package.json:48](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/package.json:48>)

### Problem

pnpm audit returned three affected-package records across two advisories: vitest and @vitest/mocker 3.2.7 (moderate), and js-yaml 4.3.1 via ESLint (high). All reported paths were development dependencies. A vulnerable installed version is confirmed; exploitable production request paths were not demonstrated.

### Evidence and affected flow

The Vitest advisory requires the relevant mock plugin/server exposure; the observed ordinary Vite frontend does not establish that condition. js-yaml affects processing specially crafted merge input. Do not equate the raw advisory rating with a confirmed public storefront exploit.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Upgrade the compatible tooling stack to patched versions and align coverage packages. Keep developer servers restricted, and reassess container production dependency contents.

### Dependencies

Vitest/coverage compatibility and ESLint’s transitive js-yaml resolution.

### Side effects / regression risk

Tooling upgrades can alter test behavior; audit --fix is not an authorized or sufficient remedy.

### Verification

Repeat lockfile audit plus typecheck/lint/test/build after the approved dependency change. Validate any Vitest major-version migration against real tests.

## [AUD-023] The deployment template is not executable as a clean release pipeline

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P2  
**Category:** DevOps / Deployment  
**Exact file / location:** [.github/workflows/deploy-hostinger.yml.template:66](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/.github/workflows/deploy-hostinger.yml.template:66>); [backend/prisma.config.ts:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/prisma.config.ts:10>); [vercel.json:18](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/vercel.json:18>); [backend/src/app.ts:51](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/app.ts:51>)

### Problem

The deployment workflow is a .template and therefore inactive. Even if enabled, its clean build job runs Prisma config-dependent validation/generation without providing DATABASE_URL/DIRECT_URL, while the config requires one. Vercel’s catch-all contains no API proxy and depends on an externally configured VITE_API_URL/backend topology. The Docker runner copies frontend assets but Express does not serve them. These are deployment boundaries, not evidence that an existing external deployment is broken.

### Evidence and affected flow

Enable the template on a clean runner: Prisma configuration loading has no database URL. Launch only the container and expect a unified storefront: no static route serves it. Default same-origin /api/v1 on Vercel needs an actual API routing design.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Make clean artifact generation explicitly configured, choose and verify the frontend/API origin topology, and activate the workflow only after staging proves it. Keep production secrets out of build artifacts.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Deployment activation is outside this audit; no workflow, proxy or production configuration was changed.

### Verification

Execute the exact clean build and production-only install in an isolated runner/container, load the storefront through the intended proxy, verify cookie/CORS/CSRF and health/readiness, then perform staging rollback and restore acceptance.

## [AUD-024] Remaining controls lack persistent labels and accessible carousel pause

**Severity:** MEDIUM · **Confidence:** CONFIRMED · **Priority:** P3  
**Category:** Accessibility  
**Exact file / location:** [frontend/src/pages/admin/AdminOperationsPages.tsx:124](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminOperationsPages.tsx:124>); [frontend/src/pages/admin/AdminProductsPage.tsx:52](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminProductsPage.tsx:52>); [frontend/src/components/home/HeroSection.tsx:127](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/components/home/HeroSection.tsx:127>)

### Problem

Category editor text fields and multiple admin searches rely on placeholders rather than persistent associated labels. Hero auto-rotation continues every 2.5 seconds and pauses only on pointer hover; a keyboard/touch pause control is absent. The shared Dialog improves focus behavior but does not establish whole-application accessibility.

### Evidence and affected flow

Keyboard/touch users cannot reliably pause moving hero content, and placeholder-only fields lose their visible identification after entry. No formal WCAG conformance or screen-reader pass is claimed.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Add persistent associated labels and an explicit keyboard/touch pause/resume control; respect reduced-motion preferences for automatic slide changes.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve carousel navigation and avoid restarting motion immediately when focus moves inside the control.

### Verification

Test keyboard-only operation, touch pause, reduced motion, persistent form labels and screen-reader announcements. Keep the existing modal focus regression tests.

## [AUD-025] Admin search/detail responses can overwrite newer navigation state

**Severity:** MEDIUM · **Confidence:** LIKELY · **Priority:** P2  
**Category:** Frontend / Concurrency  
**Exact file / location:** [frontend/src/pages/admin/AdminProductsPage.tsx:15](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminProductsPage.tsx:15>); [frontend/src/pages/admin/AdminOrdersPage.tsx:27](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminOrdersPage.tsx:27>); [frontend/src/pages/admin/AdminOrderDetailsPage.tsx:41](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/pages/admin/AdminOrderDetailsPage.tsx:41>)

### Problem

These components debounce requests or change route IDs but do not cancel/fence already-started responses by query/id. Session generation checks do not help when both requests belong to the same account. AdminCustomers has an active guard, showing inconsistent request ownership across screens.

### Evidence and affected flow

Search A responds after search AB and replaces the newer results. Navigate from order A to B while A is slow; A can populate the B route. This interleaving was identified from code but not reproduced against the live API.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Use query-keyed fetching or request cancellation/generation checks for the exact search/page/resource identity. Never enable mutations against a record that does not match the current route.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Preserve current successful flows and ownership checks; add negative-case coverage before rollout.

### Verification

Delay the first request, issue a newer query/navigation, resolve in reverse order, and assert the page and mutation target remain the newest identity.

# 8. LOW Issues

## [AUD-026] Unused scaffolding and policy names misrepresent the architecture

**Severity:** LOW · **Confidence:** CONFIRMED · **Priority:** P3  
**Category:** Maintainability / Dead code  
**Exact file / location:** [frontend/src/features/admin/data/syntheticCustomers.ts:1](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/frontend/src/features/admin/data/syntheticCustomers.ts:1>); [backend/src/config/env.ts:16](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/config/env.ts:16>); [backend/src/scripts/validate-config.ts:142](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/scripts/validate-config.ts:142>)

### Problem

The synthetic customer module has no runtime import. SESSION_SECRET is required/length-checked and described as session signing, but session authentication actually uses random opaque tokens whose hashes are stored in PostgreSQL; the secret is not used for signing. There are duplicate PM2 configuration files and unused order-mail methods.

### Evidence and affected flow

An operator may rotate SESSION_SECRET expecting sessions to be revoked or infer demo customers are live data. Neither follows from the actual implementation.

### Why this matters / root cause

The failure described above occurs because the affected boundary does not enforce the same state or contract as its callers. The consequences are limited to the scenario stated; no broader breach, corrupt production data, or live financial loss is inferred.

### Recommended fix

Remove unused artifacts after a reference check, document the opaque-session revocation model, and consolidate duplicate operational configuration deliberately.

### Dependencies

The referenced callers, API contracts, and regression fixtures.

### Side effects / regression risk

Do not remove environment keys or operational entrypoints without checking external deployment consumers.

### Verification

Check import/reference graphs and built artifacts; prove login/logout/reset revocation semantics before and after cleanup.

# 9. Frontend Audit

The router uses lazy page imports with Suspense, public/customer/auth/checkout/admin layout groups, protected customer and admin guards, and a customer wildcard. Zustand owns auth/cart/wishlist/checkout; query caches own catalogue/orders/address reads. Private query providers remount on local owner changes. Same-tab stale response fencing is real, but does not solve AUD-007. No Redux action/reducer matrix applies.

Catalogue URL state is implemented for category, fit, fabric, size, stock, new/deal flags, sort and page. Price/color/rating backend filters are not all exposed in ShopPage. Product detail resolves variant price and availability; guest callers fail to pass stock bounds (AUD-015). Address management supports list/create/delete in the UI; PATCH exists in the API client but no address edit UI was found. Checkout collects an inline address rather than selecting saved addresses. Wishlist is not server-backed. See AUD-011–015, AUD-019, AUD-024–026.

Route protection was inspected in code. Guest `/admin` redirected to `/auth/login?redirect=%2Fadmin` at every checked width. Deleted/expired users are rejected by backend session lookup in code; those HTTP scenarios were not rerun against PostgreSQL. Direct refresh/history across all authenticated routes remains unverified.

# 10. Backend Audit

All 67 route declarations were extracted, including three callback aliases and conditional demo completion. Health routes mount under two prefixes, plus direct liveness/readiness aliases. Every controller inspected delegates with await and forwards errors; admin router-wide requireAuth/ADMIN RBAC and mutation CSRF are present. There is no evidence of an unprotected general admin API. Main limitations are boundary consistency and missing operation consumers, not absent architecture. The complete endpoint table follows section 32 and is also saved separately.

# 11. Database Audit

The schema and SQL history define relational foreign keys, unique email/session token/cart/variant/review identities, an address partial-default unique index, inventory nonnegative checks, return/coupon constraints, and payment initiation/observation/refund records. Seventeen migration directories are present. Source constraints enforce line arithmetic and order total arithmetic; cross-row subtotal, payment/order agreement, refund totals and review aggregate consistency also rely on service transactions and diagnostic queries. Diagnostic queries are not preventive constraints.

No production/current database contents, installed constraints, migration checksums, row counts, backups or EXPLAIN plans were queried. Thus stock negativity, orphan counts, deployed schema drift and actual impossible-state incidence are **Unknown**, not zero. AUD-006, AUD-016, AUD-017 and AUD-020 remain code-level integrity concerns. The diagnostics contain 17 checks with bounded sample output; running them during concurrent writes is not the same as a transaction-consistent snapshot audit.

# 12. Authentication & Authorization Audit

Sessions use random 32-byte secrets, SHA-256 token hashes in the database, HttpOnly cookies, SameSite=Lax, secure cookies for staging/production, expiry/revocation and active-account checks. Passwords use Argon2id (memoryCost 19456, timeCost 2, parallelism 1). Registration forces CUSTOMER and public user DTOs exclude password hashes. Reset/change-email flows bind single-use token transitions to account locking and revoke sessions. Registration allows unverified users to obtain sessions; no requirement to verify before checkout is enforced. Whether that is intended is a business decision, not a proven escalation.

CSRF uses cookie/header equality; origin allowlisting and SameSite supplement it. There is no session-bound signed CSRF token. Subdomain/cookie injection exposure depends on the deployed domain topology and was not proven. SESSION_SECRET does not sign the opaque session (AUD-026).

| Capability | Guest | Customer | Admin | Enforcement |
|---|---|---|---|---|
| Catalogue/review reads | Yes | Yes | Yes | Public routes |
| Cart/address/order/payment status | No | Own | Own | requireAuth + userId ownership |
| Checkout/cancel/return | No | Own | Own | requireAuth + CSRF + service state validation |
| Review creation | No | Delivered purchase | Delivered purchase | Auth/CSRF/rate limit + purchase checks |
| Product/category/variant/inventory administration | No | No | Yes | Router-wide ADMIN + mutation CSRF |
| Order/customer/coupon/audit/metrics administration | No | No | Yes | Router-wide ADMIN + mutation CSRF |
| Provider callback | Signature | Signature | Signature | Public session-wise; provider signature/amount checks |
| Demo completion | No | Own in demo non-production | Own in demo non-production | Conditional route + controller gate |

This is a code-derived permission matrix. Current HTTP 401/403/IDOR tests are not claimed to have run against a database.

# 13. Security Audit

No plaintext production credential exposure was established in the inspected tracked files. Local backend/.env and frontend/.env exist, are ignored, and are untracked; configured-key presence was recorded without values. Database-like URLs found in CI/tests/build/docs were placeholder/service-fixture candidates, not automatically live secrets. The pattern scan is not an entropy scanner, external secret validation, or complete git-history audit. No credentials were rotated or transmitted.

Helmet, explicit CORS, credentialed requests, 1MB parsers, shared quota store with fail-closed behavior, structured safe errors and selected logging redaction are present. No dynamic eval, unparameterized customer SQL injection or password-hash response exposure was confirmed in the reviewed paths. Parameterized raw SQL is used for locks. Remaining concerns are the concrete findings, especially AUD-001, AUD-007, AUD-010 and AUD-022. Do not translate a lack of found exploits into a security PASS.

# 14. API Contract Audit

Ordinary UI callers and mounted route methods agree for auth, products, cart, address, checkout, orders and main admin CRUD. Success envelopes are unwrapped consistently; UUID validation and error mapping remain inconsistent. Important mismatches:

| Contract | Actual mismatch | Finding |
|---|---|---|
| Return actions | Backend allows completion/rejection; UI offers neither | AUD-005 |
| Payment capture | Operator accepts evidence customer polling rejects | AUD-001 |
| Checkout retry identity | Persisted frontend attempt is cleared by auth restoration | AUD-003 |
| Coupon quote | Preview snapshot differs from final server calculation | AUD-011 |
| List pagination | Metadata discarded or no continuation controls | AUD-013 |
| Inventory status | Filter predicate differs from row status | AUD-014 |
| Coupon PATCH dates | null accepted but ignored | AUD-017 |
| Error state | Service outage presented as empty/not-found/payment failure | AUD-012 |
| Variant facets | Combined filters can match unrelated SKUs | AUD-021 |

Backend-only capabilities: payment reconcile, refund process, operational metrics; review pagination/sort and several catalogue filters; address edit relative to the current UI. Deliberately absent APIs: wishlist sync, review update/delete/moderation, image upload, shipment carrier events and exchange processing. The UI’s image URL editor is functional code for references, not an upload integration.

# 15. End-to-End Functionality Audit

Legend: I=implementation traced; M=mocked local behavior/tests; B=targeted browser observation; NV=database/provider end-to-end not verified; H=missing. State is Zustand/query, not Redux.

| Feature | UI | State | API | Backend | DB | Security/error handling | Status |
|---|---|---|---|---|---|---|---|
| Registration | I/M | I/M | I | I | NV | Fixed customer role; delivery flag not exposed | B / NV |
| Login | I/M/B guest page | I/M | I | I | NV | Session/active account; cross-tab gap | B / NV |
| Logout | I/M | I/M | I | I | NV | Requires server confirmation | B / NV |
| Profile | I | I | I | I | NV | Private DTO; email-change verification | B / NV |
| Product listing/search | I/M/B outage page | I | I | I | NV | Public/bounded; API failures need truthful UI | B / NV |
| Filters/sort/pagination | I/M | URL/query | I | I | NV | Facet mismatch; some backend-only filters | B / NV |
| Product details | I | Query | I | I | NV | 404 versus outage conflated | B / NV |
| Add/update/remove cart | I/M | I/M/B | I | I | NV | Ownership/stock server-side; merge gaps | B / NV |
| Addresses | I | Query | I | I | NV | Owned; non-atomic default changes | B / NV |
| Checkout/order creation | I/M | I/M/B | I | I | NV | Pricing/locks; retry persistence fails | B / NV |
| Payment initiation | I | I | I | I | NV | Lease/idempotency; environment gap | B / NV |
| Payment verification | I/M | I | I | I/mock repro | NV | Missing evidence permitted in operator path | B / NV |
| Refunds | Display | I | E | Missing live adapter | NV | Durable ledger only | C live execution |
| Order history | I/B outage | Query | I | I | NV | False empty state; truncated history | B / NV |
| Order tracking | I | Derived | Order read | I | NV | No carrier integration; timeline inferred | B / F |
| Reviews/ratings | I | Query | I | I | NV | Purchase/duplicate/range checks; no edit/delete | B / NV |
| Admin login | I/M | Auth | Shared login | I | NV | ADMIN enforced in frontend and backend | B / NV |
| Admin products/variants | I | Local | I | I | NV | Publication checks; request races | B / NV |
| Admin inventory | I/M | Local | I | I | NV | Transactional ledger; filter mismatch | B / NV |
| Admin orders/returns | I | Local | I/E | I | NV | Missing controls/lifecycle gaps | B / E |
| Admin customers | I | Local | I | I | NV | ADMIN only; first-page limit | B / NV |
| Admin analytics | I | Local | I | I | NV | Gross/net/state definitions incomplete | B / NV |
| Wishlist | I | Local/M | Product reads only | H | H | Account persistence not implemented | D |
| Newsletter | I/M | Local | I | I | NV | Consent only, deliveryEnabled=false | B / NV |

No feature is assigned full-stack A solely from a component or unit test. This audit’s browser synthetic responses isolate UI behavior and do not replace database acceptance.

# 16. Business Logic Audit

Prices and quantity snapshots are server-calculated and stock changes are transactionally recorded. Coupons lock their row before checking redemption counts; a unique coupon/user constraint provides another guard. This is materially stronger than frontend-trusted money. Remaining financial/business problems are AUD-001–004, AUD-006, AUD-011, AUD-018 and AUD-020. Multiple tabs can create different checkout keys; the current user lock serializes creation but does not itself deduplicate distinct keys for the same cart. A policy for concurrent independent purchase attempts needs acceptance testing.

# 17. Payment/Razorpay Audit

Razorpay is not used. The PhonePe adapter uses `/pg/v1/pay`, `/pg/v1/status`, base64 payloads and X-VERIFY derived from configured secret/version fields. PHONEPE_CLIENT_ID is required but not consumed by this signing path. Compatibility with the actual provisioned merchant contract is **Unknown**; no contract migration is inferred merely from environment-variable names.

Callbacks compare signature/index, route/payload identity, configured merchant and amount; observations are durable and duplicate/late/out-of-order states are handled. Completed capture does not regress fulfilled orders and late capture creates a refund request. Those code strengths do not close the missing operator amount check, absent live refund implementation, ambiguous-outcome recovery and wrong-default environment defects. Currency is implicitly INR/paise in this application; no configurable multi-currency contract exists.

# 18. Inventory & Order Integrity Audit

Checkout locks the account, product rows, sorted variant rows and coupon row; it snapshots current prices, reserves by decrementing available stock, records SALE movements and creates a durable request/order/payment link in one transaction. Inventory corrections also use locked before/after values and a ledger. The expiry sweep has a distributed PostgreSQL advisory lock and bounded batch. Cancellation/failed/expired states release active reservations and remove pending coupon redemption. An active reservation is already deducted from available stock and is not subtracted twice in the current admin presentation.

The remaining AUD-006 settlement/cart race is distinct from overselling. Database concurrency tests must still prove stock=1 across simultaneous purchases, callback versus cancellation/expiry, admin correction versus checkout, and exact once-only restoration. No current PostgreSQL run was performed, so historical concurrency tests remain historical evidence.

# 19. UI/UX Audit

Screens contain real handlers, query/error patterns and functional local state; they are not all mock pages. The strongest UX blockers are false empty/payment states, unreachable return/refund actions, incomplete list navigation, guest merge failures and inaccurate commercial claims. The tracking page honestly exposes missing carrier/ETA data, but other pages still promise live tracking, dispatch and communications. An invoice-like view is not evidence of legal invoice generation or tax compliance, which was not evaluated.

# 20. Accessibility Audit

Shared dialogs implement portal semantics, focus restoration/trapping, Escape, background isolation and scroll locking. Auth/customer layouts provide landmarks/skip links. These controls have passing component tests. Remaining concrete gaps are AUD-024. The browser matrix confirmed one main landmark on its four guest routes; it did not perform a complete axe, contrast, keyboard, nested-dialog, or assistive-technology audit. No WCAG conformance claim is made.

# 21. Responsive Audit

At 320, 375, 390, 768, 1024, 1280 and 1440 pixels, Chromium checked login, shop outage, empty cart and guest admin redirect: 28 observations, no horizontal overflow, no page errors. These are observed limited states. Populated catalogue/product/cart/checkout/admin tables, dialogs, touch devices, Firefox/WebKit and all navigation paths were not verified in this run. Historical responsive claims are not promoted to current PASS.

# 22. Performance Audit

Current build: 1,792 modules transformed; route chunks generated. Largest reported JS chunk was react-vendor about 290.26kB raw/93.21kB gzip; motion about 114.87/45.46kB; stylesheet about 69.16/12.40kB. This is bundle evidence, not Core Web Vitals or load evidence. Catalogue and admin inventory pagination execute in the database; the older all-variants in-memory inventory finding is no longer true for the current implementation. Public review caching is limited to 60 seconds, and price/stock/session/cart/order reads are not put into that shared cache.

No hosted latency, throughput, saturation, database query plan, connection-pool capacity, image decode/LCP or production network result was measured. AUD-008 is a deterministic request-budget mismatch; AUD-009 is an error-path reliability issue. Avoid adding Redis to mutable transaction state as a speculative fix.

# 23. Testing & QA Audit

45 backend unit tests and 84 frontend tests passed; two live Redis/cache cases skipped. Test declarations were inventoried separately from execution. Integration source includes auth, IDOR, cart, checkout, inventory concurrency, payment hardening, initiation, refunds, returns, contracts, publication, operations and launch scenarios. Those suites depend on a disposable PostgreSQL target, which was not provided/created for this audit. Existing browser tests cover registration/session isolation, same-account multi-tab guest merge, admin publication, filters and responsive/performance paths; they do not establish a live provider purchase/refund.

The refresh-idempotency test is a concrete false assurance: it manually resets checkout state but leaves authenticated state intact, missing real hydration (AUD-003). Several tests labelled end-to-end mock services/providers or validate only data mapping. Tests can meaningfully cover those boundaries without proving the full commerce chain. The new audit harnesses reproduce defects but are external artifacts; no product tests were added or changed.

Failure-mode status: database unavailable is guarded at startup/readiness in code; UI failures are partly incorrect (AUD-012). Provider timeout becomes UNKNOWN initiation in code but lacks complete automatic recovery (AUD-008). Invalid/duplicate IDs, concurrent mutations, crash recovery, restore and deployed proxy/cookie behavior still require the explicitly listed acceptance tests.

# 24. DevOps & Production Audit

CI defines disposable PostgreSQL/Redis, restricted test-role bootstrap, migration replay/diff, seed, lint/typecheck/build, coverage, Chromium and clean-tree checks. This audit did not fetch hosted CI run status. Deployment remains an inactive template. Build success does not establish a runnable production-only deployment, correct reverse proxy, working backups, or tested rollback. Readiness checks database/migration names and configured services; liveness is separate. Migration-name presence is not checksum/schema-drift verification.

Backup code creates custom dumps, checks archive readability and hashes them; the restore command has the alias flaw AUD-010. Physical archive restoration, measured RPO/RTO, on-call delivery and multi-process Redis metrics remain unverified. Periodic metrics rejection can crash a worker (AUD-009). No deployment, restore, operational message, or production smoke was executed.

# 25. Configuration & Dependency Audit

Both package boundaries declare lint/test/build tooling. Node/pnpm matched repository settings. Production/staging config requires shared quota Redis, authentication mail and an alert webhook, with restrictive CORS/TLS checks. PhonePe environment normalization is inconsistent (AUD-002). dotenv and raw-env validation should not be assumed to use identical defaults. Backend and frontend real .env values were never printed in the audit artifacts.

Dependency advisories were checked live against maintainer sources: [Vitest GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) affects the installed 3.2.7 family and requires specific development-server/mock-plugin exposure; the maintainer lists 4.1.11 as patched. [js-yaml GHSA-2883-xcg3-v3hh](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh) affects 4.3.1, with 4.3.2 reported as patched by the audit registry. These are two root advisory families, not three independent application vulnerabilities. No dependency was changed.

# 26. Dead Code / Technical Debt

AUD-026 covers unused synthetic customer data, unused session-secret semantics and operational duplication. There is no evidence that the live admin customer page consumes syntheticCustomers. Order mail methods are uncalled, not a functioning notification system. Refund/reconcile/metrics routes are backend-only rather than dead routes. Wishlist local state is a deliberate implementation boundary but does not provide account synchronization. Public OpenAPI/comments were not treated as runtime proof. Long service modules and compressed one-line controllers/validators increase review burden; no arbitrary refactor is proposed during the audit.

# 27. Previous Audit Reconciliation

Historical inputs were the memory registry and current `docs/production-remediation-progress.md`/phase notes. They are claims to reconcile, not fresh execution evidence. No original standalone all-issue audit report was found in the current docs inventory, so a literal row-by-row reconciliation of an unavailable original report is not possible.

| Historical finding/claim | Current code/evidence | Status |
|---|---|---|
| Missing server-side admin RBAC | Router-wide auth + ADMIN guard exists | FIXED in code; HTTP runtime NV |
| Frontend JWT/localStorage auth concerns | Opaque server session; auth state memory-only | INCORRECT if applied to this stack |
| Same-tab stale auth/private responses | Generation fencing and provider remounts exist | PARTIALLY FIXED; AUD-007 across tabs |
| Password/reset/email target race | Account locks, purpose/target binding, delivery state exist | FIXED in code; live email NV |
| Unsafe demo endpoint in production | Route/controller/provider gates present | FIXED in code |
| Payment-initiation duplicate calls | Durable lease and unknown state exist | PARTIALLY FIXED; recovery/live contract NV |
| Checkout retry survives reload | Storage exists, hydration clears it; browser repro | STILL VALID defect / prior assurance contradicted |
| Payment verification complete | Operator accepts missing amount | PARTIALLY FIXED; AUD-001 |
| Live refunds supported | Ledger yes, PhonePe refund method no | PARTIALLY FIXED; AUD-004 |
| Inventory mutation lacks transactions | Locks/ledger/expiry coordination present | FIXED in code for stock writer; AUD-006 is separate |
| Inventory page loads all variants | Current database skip/take/filter | FIXED; old performance claim outdated |
| Admin available stock subtracts reservations twice | Current available=stockQuantity | FIXED in code |
| Paise contracts/review provenance | Paise fields and separate editorial aggregates exist | PARTIALLY FIXED; AUD-011/019 remain |
| Tracking/provider truth corrected | Tracking screen improved; other claims remain static | PARTIALLY FIXED; AUD-019 |
| Accessibility/responsive phase complete locally | Dialogs and sampled guest widths pass | PARTIALLY FIXED; AUD-024 and broader NV |
| Recovery guard safely separates targets | String alias bypass reproduced | PARTIALLY FIXED; AUD-010 |
| All 17 migrations/238 backend/84 frontend/10 Chromium historically passed | 17 files/84 frontend currently verified; rest not rerun | UNVERIFIED historical execution, not current PASS |
| Score 43/100, NO-GO | Fresh rubric 55/100; current blockers remain | NO-GO STILL VALID; score recalculated |

# 28. Feature Traceability Matrix

Model entries below name PostgreSQL Prisma models, not Mongoose models. Controller and route details appear in the endpoint inventory. “NV” means database/provider execution not repeated here.

| Feature | Frontend → state/API | Route → service/model/operation | Response → rendering / break |
|---|---|---|---|
| Register/login | LoginPage/RegisterPage → authStore → authService/client | auth routes → AuthService → User/Session + hash/create | public user/CSRF → authenticated; cross-tab AUD-007 |
| Logout/reset | AccountPage/reset form → authStore/authService | logout/reset → session/token updates under account lock | guest/reset state; mail delivery NV |
| Profile/address | AccountPage → authStore/query → addressService | auth/me + addresses → User/Address | DTO → form/list; AUD-012/016 |
| Catalogue/detail | ShopPage/ProductDetails → useProducts → productService | product routes → ProductService/ProductRepository → Product/Variant/Image/Category | page/detail DTO → cards/SKU selector; AUD-021 |
| Review/rating | ProductDetails → mutation → productService | createReview → delivered Order check → Review insert/Product aggregate | review list invalidate; no moderation/edit/delete |
| Guest/auth cart | ProductDetails/CartPage/Drawer → cartStore → cartService | cart routes → CartService → account lock/Cart/CartItem | canonical cart → store; AUD-015/006 |
| Checkout | CheckoutPage → checkoutStore → orderService.checkout | checkout → CommerceService → Order/Items/Reservation/CouponRedemption/Payment/Idempotency in transaction | payment session → navigation; AUD-003/011 |
| Initiation | checkout/initiate → provider redirect | payment row lock → PaymentInitiation lease → PhonePe adapter → persisted result | redirect or status page; AUD-002/008 |
| Completion | PaymentPending/demo/operator or webhook | observation → Payment/Order/InventoryReservation/CartItem/refund | session/order DTO → success/failure; AUD-001/006/008 |
| Order history/tracking | useOrders → orderService mapping | orders → owned Order with items/payments | list/derived milestones; AUD-012/013/018/019 |
| Cancel/return | OrderList/Details → orderService | ownership/state → observation or OrderReturn/items | order DTO → list/detail; AUD-004/005/020 |
| Admin products | forms/details → adminService | admin RBAC/CSRF → AdminService → product/category/image/variant transaction + AuditLog | DTO → editor/catalogue; NV |
| Admin inventory | inventory controls → adminService | stock/adjust → locked ProductVariant + InventoryMovement/AuditLog | refreshed inventory; AUD-014 |
| Admin orders | order screens → adminService | status → allowed transition + stock/refund/audit | returned order; UI stops at return request AUD-005 |
| Admin customers/analytics | pages → adminService | selected User/order queries and aggregate SQL | tables/metrics; AUD-013/018 |
| Newsletter | Footer → newsletterService | subscription → NewsletterSubscription upsert | pending-provider consent copy; delivery H |

# 29. Production Readiness Score /100

Scoring is an explicit reviewer judgment: full credit requires functioning relevant boundaries and current acceptance evidence. Presence of controls earns partial credit; confirmed defects and missing runtime evidence reduce it. Unknown does not mean broken, but cannot earn production certification.

| Area | Weight | Earned | Reason |
|---|---:|---:|---|
| Security | 20 | 13 | Session/RBAC/CSRF controls; payment/cross-tab/recovery gaps |
| Core Functionality | 20 | 9 | Connected journeys; retry/refund/operator gaps and live NV |
| Backend/API | 10 | 6 | Mounted/awaited handlers; validation/contract gaps |
| Database/Integrity | 10 | 6 | Transactions/constraints; current DB NV and concurrency risks |
| Frontend Reliability | 10 | 5 | Tests/build and fencing; repro failures/partial pagination |
| Testing | 10 | 5 | Meaningful local tests; mocked refresh false assurance and no current DB/provider acceptance |
| Performance | 5 | 3 | Query pagination/chunks; no load proof, polling budget defect |
| DevOps/Operations | 5 | 2 | CI/backup/readiness code; restore/metrics/deployment defects |
| UI/UX/Accessibility | 5 | 3 | Dialogs/sampled widths; error/copy/label gaps |
| Maintainability | 5 | 3 | Layered typed code; duplicated contracts and unused scaffolding |
| **Total** | **100** | **55** | **NO-GO** |

# 30. Release Decision: NO-GO

I would not sign off this snapshot for real customer money. The reproduced payment-authority and environment/retry failures, missing live refund execution, recovery alias guard, and unresolved concurrent/session behavior prevent safe approval. There is no evidence of actual production loss from this audit, and no claim that every ordinary journey is broken. Approval requires closing the listed blockers and supplying actual staging/provider/restore evidence.

# 31. P0 → P1 → P2 → P3 Fix Plan

This is an ordered implementation plan, not authorization to execute fixes in this audit.

| Phase | Scope / dependencies | Acceptance gate |
|---|---|---|
| P0 safety and money | Recovery target identity; cross-tab owner boundary; common provider capture validator; one production config source; durable retry ownership; real refund capability | Guard alias tests; two-account browser test; tampered/missing evidence rejection; explicit live environment; one checkout/provider attempt after reload; verified refund settlement |
| P1 critical journeys | Unblock operator return controls; define return policy/state; unify cart lock order; bounded polling/unknown reconciliation; resilient metrics; quote revalidation; truthful errors; guest merge recovery | PostgreSQL concurrent negative cases; real browser purchase/cancel/return; slow/failed provider; Redis fault injection; quote equals charge |
| P2 reliability/contracts | Pagination, thresholds, atomic addresses, validation/null semantics, accurate analytics, catalogue facets, patched tooling, deployment rehearsal, same-account stale requests, truthful content | All records reachable; consistent filters/statuses; rollback on injected write failure; 4xx boundary suite; hand-checked ledger reports; clean deployment artifact and proxy verification |
| P3 accessibility/cleanup | Persistent labels, carousel pause/reduced motion; remove unused scaffolding/duplicate policy names | Keyboard/touch/assistive-technology review; import/build checks; operational consumer compatibility |
| Release acceptance | Known isolated DB replay; full integration/concurrency; authenticated multi-tab Chromium plus browser/device coverage; merchant sandbox then agreed live acceptance; external email/Redis/alerts; hosted smoke; physical restore and measured RPO/RTO | Evidence attached to exact committed artifact. No PASS from filenames, historical counts or compilation alone |

# 32. SINGLE MASTER ISSUE CHECKLIST

- [ ] P0 — AUD-010 — Restore safety compares hostname strings instead of database identity
- [ ] P0 — AUD-007 — Cross-tab account changes are not propagated to private-state ownership
- [ ] P0 — AUD-001 — Operator reconciliation accepts incomplete capture evidence
- [ ] P0 — AUD-002 — Production validation and runtime disagree on the payment environment
- [ ] P0 — AUD-003 — Session hydration erases the durable checkout retry key
- [ ] P0 — AUD-004 — Live refund execution and unknown-refund recovery are missing
- [ ] P1 — AUD-005 — Return handling and reconciliation APIs are absent from the operator UI
- [ ] P1 — AUD-006 — Payment settlement bypasses the cart mutation ownership lock
- [ ] P1 — AUD-008 — Payment polling exhausts the global quota before payment expiry
- [ ] P1 — AUD-009 — Metrics publishing can reject without a handler and terminate the process
- [ ] P1 — AUD-011 — Coupon preview stays tied to an old cart total
- [ ] P1 — AUD-012 — Several screens turn loading/network failures into false empty or missing data
- [ ] P1 — AUD-015 — Guest cart callers omit stock bounds and can poison the atomic merge
- [ ] P1 — AUD-020 — Return eligibility and rejection lifecycle do not enforce the advertised policy
- [ ] P2 — AUD-013 — Pagination metadata is discarded or inaccessible in customer/admin lists
- [ ] P2 — AUD-014 — Inventory filters use 10 instead of each variant’s configured threshold
- [ ] P2 — AUD-016 — Default-address changes are not atomic
- [ ] P2 — AUD-017 — Request validation and persistence constraints disagree
- [ ] P2 — AUD-018 — Business totals do not consistently describe settled sales
- [ ] P2 — AUD-019 — Static storefront claims are not bound to catalogue or operational truth
- [ ] P2 — AUD-021 — Combined catalogue facets can match different variants
- [ ] P2 — AUD-022 — Locked development dependencies contain two advisory families
- [ ] P2 — AUD-023 — The deployment template is not executable as a clean release pipeline
- [ ] P2 — AUD-025 — Admin search/detail responses can overwrite newer navigation state
- [ ] P3 — AUD-024 — Remaining controls lack persistent labels and accessible carousel pause
- [ ] P3 — AUD-026 — Unused scaffolding and policy names misrepresent the architecture

# Appendix A. Complete mounted endpoint inventory

Code-derived route inventory. WIRED means mounted and connected, not runtime PASS. All routes also receive request ID/metrics and global security middleware except direct health aliases registered before that middleware. `/api` routes receive the global quota. Controllers forward to the named service; services use Prisma models listed below. No MongoDB layer exists.

| Method | Full route | Middleware | Controller | Service / model | Auth / RBAC | Validation | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/products` | Global | listProducts ([route:8](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/product.routes.ts:8>)) | ProductService → ProductRepository / Product, Variant, Review, Order | Public | Identifier/query/review Zod | WIRED / DB NV |
| GET | `/api/v1/products/:productId/reviews` | Global | listProductReviews ([route:9](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/product.routes.ts:9>)) | ProductService → ProductRepository / Product, Variant, Review, Order | Public | Identifier/query/review Zod | WIRED / DB NV |
| POST | `/api/v1/products/:productId/reviews` | requireAuth + CSRF + route limiter | createProductReview ([route:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/product.routes.ts:10>)) | ProductService → ProductRepository / Product, Variant, Review, Order | Session + own resource/purchase | Identifier/query/review Zod | WIRED / DB NV |
| GET | `/api/v1/products/:slugOrId` | Global | getProduct ([route:11](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/product.routes.ts:11>)) | ProductService → ProductRepository / Product, Variant, Review, Order | Public | Identifier/query/review Zod | WIRED / DB NV |
| POST | `/api/v1/newsletter/subscriptions` | Global + route limiter | subscribe ([route:6](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/newsletter.routes.ts:6>)) | NewsletterService / NewsletterSubscription | Public | Email + consent Zod | WIRED / DB NV |
| GET | `/health` | Global | getHealthStatus ([route:6](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/health.routes.ts:6>)) | Readiness/database/cache or liveness | Public | No user input | WIRED / live readiness NV |
| GET | `/api/v1/health` | Global | getHealthStatus ([route:6](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/health.routes.ts:6>)) | Readiness/database/cache or liveness | Public | No user input | WIRED / live readiness NV |
| GET | `/health/ready` | Global | getReadinessStatus ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/health.routes.ts:7>)) | Readiness/database/cache or liveness | Public | No user input | WIRED / live readiness NV |
| GET | `/api/v1/health/ready` | Global | getReadinessStatus ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/health.routes.ts:7>)) | Readiness/database/cache or liveness | Public | No user input | WIRED / live readiness NV |
| POST | `/api/v1/payments/phonepe-callback` | Signature in service | phonepeCallback ([route:31](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:31>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Public | Signature/payload/merchant/amount service checks | WIRED / DB NV |
| POST | `/api/v1/payments/:paymentId/callback` | Signature in service | phonepeCallback ([route:32](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:32>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Public | Signature/payload/merchant/amount service checks | WIRED / DB NV |
| POST | `/api/v1/payments/webhook` | Signature in service | phonepeCallback ([route:33](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:33>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Public | Signature/payload/merchant/amount service checks | WIRED / DB NV |
| GET | `/api/v1/cart` | requireAuth | getCart ([route:43](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:43>)) | CartService / Cart, CartItem, CartMerge, Variant | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/cart/merge` | requireAuth + CSRF | mergeCart ([route:44](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:44>)) | CartService / Cart, CartItem, CartMerge, Variant | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/cart/items` | requireAuth + CSRF | addCartItem ([route:45](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:45>)) | CartService / Cart, CartItem, CartMerge, Variant | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| PATCH | `/api/v1/cart/items/:itemId` | requireAuth + CSRF | updateCartItem ([route:46](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:46>)) | CartService / Cart, CartItem, CartMerge, Variant | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| DELETE | `/api/v1/cart/items/:itemId` | requireAuth + CSRF | removeCartItem ([route:47](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:47>)) | CartService / Cart, CartItem, CartMerge, Variant | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| DELETE | `/api/v1/cart` | requireAuth + CSRF | clearCart ([route:48](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:48>)) | CartService / Cart, CartItem, CartMerge, Variant | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| GET | `/api/v1/addresses` | requireAuth | listAddresses ([route:50](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:50>)) | CommerceService / Address | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/addresses` | requireAuth + CSRF | createAddress ([route:51](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:51>)) | CommerceService / Address | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| PATCH | `/api/v1/addresses/:addressId` | requireAuth + CSRF | updateAddress ([route:52](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:52>)) | CommerceService / Address | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| DELETE | `/api/v1/addresses/:addressId` | requireAuth + CSRF | deleteAddress ([route:53](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:53>)) | CommerceService / Address | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/coupons/validate` | requireAuth + CSRF + payment/coupon quota | validateCoupon ([route:55](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:55>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/checkout` | requireAuth + CSRF + payment/coupon quota | checkout ([route:56](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:56>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/payments/:paymentId/initiate` | requireAuth + CSRF + payment/coupon quota | initiatePayment ([route:58](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:58>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| GET | `/api/v1/payments/:paymentId/status` | requireAuth | paymentStatus ([route:59](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:59>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/payments/:paymentId/demo-result` | requireAuth + CSRF | demoResult ([route:62](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:62>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | Conditional: demo + non-production |
| GET | `/api/v1/orders` | requireAuth | listOrders ([route:65](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:65>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| GET | `/api/v1/orders/:orderId` | requireAuth | getOrder ([route:66](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:66>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/orders/:orderId/cancel` | requireAuth + CSRF | cancelOrder ([route:67](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:67>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| POST | `/api/v1/orders/:orderId/returns` | requireAuth + CSRF | requestReturnOrder ([route:68](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/commerce.routes.ts:68>)) | CommerceService / Order, Payment, Reservation, Coupon, Refund | Session + own resource/purchase | Body/query Zod; route IDs string-only (AUD-017) | WIRED / DB NV |
| GET | `/api/v1/auth/csrf` | Global | csrf ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:7>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/register` | Global + route limiter + auth quota | register ([route:8](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:8>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/login` | Global + route limiter + auth quota | login ([route:9](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:9>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/forgot-password` | Global + route limiter + auth quota | forgotPassword ([route:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:10>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/reset-password` | Global + route limiter + auth quota | resetPassword ([route:11](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:11>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/verify-email` | Global | verifyEmail ([route:12](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:12>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/resend-verification` | Global + route limiter + auth quota | resendVerification ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:13>)) | AuthService / User, Session, verification/reset token | Public | Body Zod where applicable; cookie session | WIRED / DB NV |
| GET | `/api/v1/auth/me` | requireAuth | me ([route:14](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:14>)) | AuthService / User, Session, verification/reset token | Session + own resource/purchase | Body Zod where applicable; cookie session | WIRED / DB NV |
| PATCH | `/api/v1/auth/me` | requireAuth + CSRF | updateMe ([route:15](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:15>)) | AuthService / User, Session, verification/reset token | Session + own resource/purchase | Body Zod where applicable; cookie session | WIRED / DB NV |
| POST | `/api/v1/auth/logout` | requireAuth + CSRF | logout ([route:16](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/auth.routes.ts:16>)) | AuthService / User, Session, verification/reset token | Session + own resource/purchase | Body Zod where applicable; cookie session | WIRED / DB NV |
| GET | `/api/v1/admin/dashboard` | requireAuth + requireRole(ADMIN) | dashboard ([route:6](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:6>)) | AdminService / Aggregate queries/metrics | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/products` | requireAuth + requireRole(ADMIN) | products ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:7>)) | AdminService / Product, ProductImage, ProductCategory | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| POST | `/api/v1/admin/products` | requireAuth + requireRole(ADMIN) + CSRF | createProduct ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:7>)) | AdminService / Product, ProductImage, ProductCategory | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/products/:id` | requireAuth + requireRole(ADMIN) | productDetail ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:7>)) | AdminService / Product, ProductImage, ProductCategory | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| PATCH | `/api/v1/admin/products/:id` | requireAuth + requireRole(ADMIN) + CSRF | updateProduct ([route:7](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:7>)) | AdminService / Product, ProductImage, ProductCategory | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/categories` | requireAuth + requireRole(ADMIN) | categories ([route:8](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:8>)) | AdminService / Category | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| POST | `/api/v1/admin/categories` | requireAuth + requireRole(ADMIN) + CSRF | createCategory ([route:8](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:8>)) | AdminService / Category | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| PATCH | `/api/v1/admin/categories/:id` | requireAuth + requireRole(ADMIN) + CSRF | updateCategory ([route:8](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:8>)) | AdminService / Category | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/variants` | requireAuth + requireRole(ADMIN) | variants ([route:9](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:9>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| POST | `/api/v1/admin/variants` | requireAuth + requireRole(ADMIN) + CSRF | createVariant ([route:9](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:9>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| PATCH | `/api/v1/admin/variants/:id` | requireAuth + requireRole(ADMIN) + CSRF | updateVariant ([route:9](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:9>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/inventory` | requireAuth + requireRole(ADMIN) | inventory ([route:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:10>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/inventory/movements` | requireAuth + requireRole(ADMIN) | movements ([route:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:10>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/inventory/reservations` | requireAuth + requireRole(ADMIN) | reservations ([route:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:10>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| POST | `/api/v1/admin/inventory/adjustments` | requireAuth + requireRole(ADMIN) + CSRF | adjust ([route:10](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:10>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| PATCH | `/api/v1/admin/inventory/:id` | requireAuth + requireRole(ADMIN) + CSRF | setStock ([route:11](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:11>)) | AdminService / ProductVariant, InventoryMovement, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/orders` | requireAuth + requireRole(ADMIN) | orders ([route:12](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:12>)) | AdminService / Order, OrderItem, Payment, Refund, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/orders/:id` | requireAuth + requireRole(ADMIN) | orderDetail ([route:12](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:12>)) | AdminService / Order, OrderItem, Payment, Refund, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| PATCH | `/api/v1/admin/orders/:id/status` | requireAuth + requireRole(ADMIN) + CSRF | updateOrder ([route:12](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:12>)) | AdminService / Order, OrderItem, Payment, Refund, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/customers` | requireAuth + requireRole(ADMIN) | customers ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:13>)) | AdminService / User, Order | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/customers/:id` | requireAuth + requireRole(ADMIN) | customerDetail ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:13>)) | AdminService / User, Order | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/coupons` | requireAuth + requireRole(ADMIN) | coupons ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:13>)) | AdminService / Coupon, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| POST | `/api/v1/admin/coupons` | requireAuth + requireRole(ADMIN) + CSRF | createCoupon ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:13>)) | AdminService / Coupon, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| PATCH | `/api/v1/admin/coupons/:id` | requireAuth + requireRole(ADMIN) + CSRF | updateCoupon ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:13>)) | AdminService / Coupon, AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| GET | `/api/v1/admin/audit-logs` | requireAuth + requireRole(ADMIN) | auditLogs ([route:13](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:13>)) | AdminService / AuditLog | Session + ADMIN | UUID/body/query Zod where supplied | WIRED / DB NV |
| POST | `/api/v1/admin/payments/:id/reconcile` | requireAuth + requireRole(ADMIN) + CSRF | reconcilePayment ([route:14](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:14>)) | CommerceService / Payment, Observation, Refund | Session + ADMIN | UUID Zod | BACKEND-ONLY; see AUD-001/004/005 |
| POST | `/api/v1/admin/refunds/:id/process` | requireAuth + requireRole(ADMIN) + CSRF | processRefund ([route:15](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:15>)) | CommerceService / Payment, Observation, Refund | Session + ADMIN | UUID Zod | BACKEND-ONLY; see AUD-001/004/005 |
| GET | `/api/v1/admin/metrics` | requireAuth + requireRole(ADMIN) | operationalMetrics ([route:16](<E:/01 Web Devlopment Projects/08 Purvaja Fashion/02 E-Commerce/backend/src/routes/admin.routes.ts:16>)) | AdminService / Aggregate queries/metrics | Session + ADMIN | UUID/body/query Zod where supplied | BACKEND-ONLY; see AUD-001/004/005 |
| GET | `/healthz` | request ID / metrics before security middleware | getHealthStatus | liveness / database readiness | Public | None | WIRED / no current database readiness proof |
| GET | `/readyz` | request ID / metrics before security middleware | getReadinessStatus | liveness / database readiness | Public | None | WIRED / no current database readiness proof |

# Appendix B. Evidence limits and reproducibility

The browser script runs only a loopback frontend and intercepts API calls with synthetic failures/state. The backend script invokes real functions with in-memory provider/database doubles. Neither reproduces PostgreSQL locking or a real merchant transaction. The schema/static scans and builds do not execute migrations. Reproduction results must not be cited as successful full-stack acceptance. Initial and final repository status checks are used to confirm audit-only execution. No earlier memory test count is claimed as current.
