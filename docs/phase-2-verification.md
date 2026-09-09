# Phase 2 — Authentication, authorization, sessions and request identity

Date: 7 September 2026. Scope stops at Phase 2. The audit baseline remains 43/100 and NO-GO; closing one phase does not recalculate the whole product score. Demo payments remain the agreed scope.

## Root causes and implemented corrections

| Boundary | Root cause | Architectural correction |
|---|---|---|
| Cross-user access | Private resources require both authentication and ownership checks at every data access path | Order, payment, address and cancellation paths constrain reads/writes by the authenticated owner; RBAC tests cover unauthenticated, customer and administrator outcomes |
| Session switching | In-flight requests and browser-persisted stores could outlive the session that created them | Session generations fence responses, retries and auth failures; account-scoped query state remounts; cart, checkout and wishlist state clear or rehydrate at logout/account changes |
| Token expiry/replay/invalidation | Token rows alone did not model whether their email was actually delivered, and sibling issuance could race | Verification/reset links are hashed, one-use and expiry checked under the account lock; sibling links and sessions are invalidated atomically after credential changes |
| Email delivery failure | A link could become active before the provider accepted the message, or a failed email change could leave a stale pending address | New token rows start in `delivery_pending`; provider requests carry stable idempotency keys; only provider acceptance activates a link and invalidates older links; failures remove the candidate and restore the prior email-change state |
| Forwarded identity | Directly reading forwarding headers bypasses the trusted-proxy boundary; raw IPv6 addresses can rotate within one client prefix | Rate-limit keys use Express `req.ip` after configured proxy trust and the library's IPv6-safe `/56` key helper; test-only identity overrides remain unavailable outside test mode |
| Multi-instance quotas | The PM2 topology uses `instances: max`, while earlier validation relied on a manually maintained worker-count hint and could silently deploy process-local counters | Staging and production always require a dedicated `RATE_LIMIT_REDIS_URL`; every limiter shares atomic namespaced counters; quota-store failures reject requests instead of falling back to per-process memory |
| Missing production dependencies | The application could start in production without authentication email delivery | Staging and production startup/config validation require both `RESEND_API_KEY` and `EMAIL_FROM`, as well as the shared quota store |

## Migration and compatibility

Migration `20260907113000_auth_token_delivery_state` adds `delivery_pending` to verification and reset tokens. Existing rows default to delivered for compatibility; all newly issued links use the delivery state machine. The migration was applied only to a fresh disposable PostgreSQL database. A populated-environment rehearsal remains a release gate.

`REDIS_URL` remains optional catalogue caching. `RATE_LIMIT_REDIS_URL` is separate security state and is mandatory in staging/production. All processes and replicas must use the same quota Redis database. Development/test may use the in-process store when deliberately running one API process.

## Isolated verification evidence

Evidence snapshot: `C:/Users/ilesh/.codex/visualizations/2026/09/06/01a07702-324d-7621-ba86-b89066893a09/phase1/run-1788778425596/`.

The runner copied tracked and untracked source, excluded environment files, recorded SHA-256 hashes, and created an empty PostgreSQL 16 cluster bound to loopback. The database-owning test role had no superuser, create-database or create-role privileges. The cluster was stopped after the run. No shared or production database was changed.

| Check | Result |
|---|---|
| Frozen install | PASS |
| Prisma validate/generate | PASS |
| Empty migration deployment and repeat | PASS: 12 migrations; repeat had nothing pending |
| Database-to-Prisma drift | PASS: zero difference |
| Explicit-credential seed | PASS |
| Monorepo typecheck/lint | PASS |
| Backend/frontend production builds | PASS |
| Compiled artifact smoke | PASS |
| Backend tests | PASS: 211 passed, 0 failed, 2 skipped across 28 files |
| Frontend tests | PASS: 71 passed, 0 failed across 16 files |
| Authenticated Chromium | PASS: registration, persisted address, reload, logout, account switch, cross-user absence, second reload, logout/login, original-owner restoration |
| Git whitespace check | PASS |

The automated backend evidence covers authentication/role denial, cross-user order/payment/address access, session revocation, password and email-change races, expiry, replay, sibling-token invalidation, pending-delivery rejection, spoofed-header handling, IPv4-mapped/rotating IPv6 grouping and fail-closed quota-store errors. Frontend tests cover stale response/401 fencing and session-bound private stores.

## External acceptance limits

- The live Redis concurrency/expiry test is implemented and CI provisions a disposable Redis service, but hosted CI has not executed in this workspace. The local environment had no Redis service, so that single test was skipped locally.
- Real Resend delivery cannot be tested without provider credentials. Provider success/failure and idempotency behavior are covered through injected adapter tests; this is not live-delivery evidence.
- A deployed multi-replica proxy/cookie topology, cross-tab browser behavior and populated-database migration rehearsal remain staging/release gates.
- No deployment, production migration, commit, live payment test or whole-product score increase was performed.

Phase 2 implementation and available local verification are complete. External service and staging evidence remains explicitly open rather than being represented as a pass.
