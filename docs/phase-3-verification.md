# Phase 3 — Atomic stock, cart ownership and checkout snapshots

Date: 8 September 2026. Scope stops at Phase 3. The whole-product audit baseline remains 43/100 and NO-GO until all applicable phases and release gates are reassessed.

## Root-cause findings and corrections

| Boundary | Root cause | Implemented invariant |
|---|---|---|
| Inventory writers | Checkout, expiry, returns and administrative adjustments previously risked reading or writing stock through different protocols | All stock changes use `changeStock` inside the caller transaction; variants are locked in deterministic UUID order before stock is read; stock and its movement commit together |
| Cross-domain deadlock | The reproduced mixed checkout/admin race locked variant then audit actor, while checkout locked user then variant | Audit actors are locked before product/variant rows. Existing-order workflows use payment → actor/user → order → sorted variants. Customer returns lock user before order. The same failing race now passes without a retry workaround |
| No-op reconciliation | Setting stock to its existing value attempted a forbidden zero-quantity ledger movement | The inventory owner returns an explicit zero delta without updating stock or creating a false movement |
| Stale cart and price | Checkout refreshed server state and could immediately accept a different quantity or authoritative price without customer review | The storefront submits the exact variant, quantity and paise price the customer reviewed. Checkout compares that snapshot after product/variant locks and rejects changes before order, reservation, coupon or payment creation |
| Production contract transition | Older development/test clients do not yet send the new snapshot field | The field is additive for compatibility, while staging/production reject checkout requests without it. The current storefront always supplies it |
| Guest-cart replay | A synchronized server cart could be mistaken for guest additions, and ambiguous retries could be applied twice | Guest/server provenance remains explicit in the store; guest content retains one durable merge UUID across retry/reload; the server serializes by owner and stores the UUID plus canonical request hash in the same cart transaction |
| Merge failure visibility | Background synchronization errors existed in state but were not rendered to customers | Cart page and drawer show the synchronization error and provide a retry using the same durable merge identity |

## Lock and lifecycle order

- New checkout: user/cart owner → sorted products → sorted variants → optional coupon → new order/reservations/payment.
- Payment result or administrative order transition: existing payment → actor/user → order → sorted variants → reservation/cart state.
- Direct administrative inventory/product writes: actor → product/variant.
- Guest-cart merge and ordinary cart mutation: user/cart owner → cart items.

Transactions never perform external provider calls while holding inventory locks. Every failed transaction rolls back its stock row, ledger entry, reservation, coupon redemption and order/payment association together.

## Isolated verification

Final evidence snapshot: `C:/Users/ilesh/.codex/visualizations/2026/09/06/01a07702-324d-7621-ba86-b89066893a09/phase1/run-1788793604013/`.

The runner copied the current tracked and untracked source, excluded environment files, recorded SHA-256 hashes and created an empty PostgreSQL 16 cluster on loopback. The test database owner had no superuser, create-database or create-role privilege. The cluster was stopped after verification; no shared database was changed.

| Check | Result |
|---|---|
| Frozen install | PASS |
| Prisma validate/generate | PASS |
| Empty migration deployment and repeat | PASS: 12 migrations, nothing pending on repeat |
| Database-to-Prisma drift | PASS: zero difference |
| Typecheck and lint | PASS |
| Backend/frontend production builds | PASS |
| Compiled artifact smoke | PASS |
| Backend tests | PASS: 214 passed, 0 failed, 2 environment-dependent skips |
| Frontend tests | PASS: 71 passed, 0 failed |
| Chromium | PASS: 2 journeys, including parallel-tab guest merge plus focus/reload |
| Git whitespace check | PASS |

The PostgreSQL tests prove exactly two successes from three simultaneous one-unit decrements at stock two; simultaneous restocks are not lost; checkout/admin/release writers reconcile through one ledger; stale reviewed prices create no order/reservation/stock change; coupon limits serialize; cancellation, expiry and return paths restore stock once; and inventory movement before/after quantities remain consistent. The browser test proves two tabs replaying the same persisted guest merge contribute one server quantity after login, focus and reload.

## Populated migration and multi-instance pre-staging gates

Evidence snapshot: `C:/Users/ilesh/.codex/visualizations/2026/09/06/01a07702-324d-7621-ba86-b89066893a09/phase1/phase3-gates-1788844052012/`.

The verifier copied the current tracked and untracked source while excluding environment files. It created a loopback PostgreSQL 16 database owned by a role without superuser, database-creation or role-creation privileges. The configured shared Supabase development database was not changed.

For the populated migration rehearsal, the verifier deployed only the baseline schema, inserted linked legacy records across authentication, addresses, catalogue, inventory, reviews, carts, orders, payments, coupons and audit logs, and then deployed the remaining migrations. All 13 migration records finished without rollback. Repeating deployment reported no pending work, Prisma detected zero schema drift, and the legacy user, product, stock, order, payment and token records survived with their intended backfills and defaults.

For the multi-instance workload, the verifier built the backend and launched two independent Node.js API processes sharing the disposable PostgreSQL database. A round-robin burst sent 40 checkouts against stock 20, split evenly between both processes. Exactly 20 completed and 20 returned `INSUFFICIENT_STOCK`; final stock was zero with exactly 20 sale movements and 20 active reservations. A separate checkout with the same user and idempotency key was sent concurrently to both processes. Both requests returned HTTP 200 while the database contained one completed idempotency record, one payment, one reservation and one stock movement.

| Gate | Result |
|---|---|
| Populated baseline-to-current migration deployment | PASS: 13 applied, 0 rolled back |
| Migration replay | PASS: nothing pending |
| Database-to-Prisma drift | PASS: zero difference |
| Linked legacy-record preservation/backfills | PASS |
| Compiled two-process API startup | PASS |
| Cross-process oversell contention | PASS: 20 accepted / 20 rejected at stock 20 |
| Cross-process idempotency replay | PASS: two responses / one committed checkout |

## Remaining external staging evidence

- The populated migration and compiled multi-instance workload gates are complete in a disposable local staging-equivalent topology.
- External staging sign-off is not verified because this workspace has no staging API endpoint, dedicated staging database or shared Redis configuration. Repeat the same workload against that deployed topology when it is provisioned.
- This correctness workload is not a capacity or peak-traffic benchmark.
- Live payment behavior remains deferred under the agreed demo-only scope.
- No shared database migration, external deployment, commit or whole-product score increase was performed.

Phase 3 implementation and local pre-staging acceptance evidence are complete. External staging and later-phase gates remain open.
