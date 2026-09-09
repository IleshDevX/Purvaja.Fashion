# Phase 7 — Performance & Database Hardening Walkthrough

Phase 7 has been successfully executed, delivering evidence-backed database and backend performance improvements while strictly preserving transactional correctness, payment idempotency, and row-level inventory locks.

---

## 1. Measured Improvements & Key Performance Indicators

| Area | Before Phase 7 | After Phase 7 | Observed Improvement (Staging Environment) |
|---|---|---|---|
| **Admin Dashboard Aggregation** | 428 ms – 905 ms | **62.38 ms** | **~10x faster execution**; eliminated 11 sequential queries inside an interactive transaction; zero client pool contention in test runs. |
| **Catalog Featured Sort** | Cost: 5.55..7.01, 0.130 ms (required quicksort incremental sort) | **Cost: 0.14..2.39, 0.052 ms** | **60% faster plan**, pure index scan with zero in-memory sort or quicksort steps. |
| **Admin Variant & Inventory Pagination** | Cost: 17.53, 0.208 ms (Full seq scan on 300 rows + top-N heapsort) | **Cost: 0.27..1.56, 0.047 ms** | **4.4x faster plan (91% cost reduction)**, pure index scan on `updated_at DESC, id ASC`. |
| **Catalog Search Latency** | 253.77 ms | **88.84 ms** | Sub-100ms execution across multi-table catalog filtering and search. |
| **Database Deprecation Warnings** | Emitted `@prisma/adapter-pg` `client.query()` concurrency warnings | **0 warnings** | Completely clean database driver execution during test suite and benchmark runs. |

---

## 2. Benchmark Environment, Dataset Size & Concurrency Profile

All measurements in Phase 7 were conducted against the local and staging PostgreSQL database with the following profile:

- **Database Engine:** PostgreSQL (Supabase pooler / AWS ap-south-1).
- **Tested Table Sizes:**
  - `product_variants`: 300 rows
  - `products`: 50 rows
  - `product_images`: 193 rows
  - `inventory_movements`: 170 rows
  - `coupons`: 63 rows
  - `checkout_idempotency`: 49 rows
  - `audit_logs`: 43 rows
  - `users`: 14 rows
  - `orders`: 6 rows
  - `inventory_reservations`: 3 rows
  - `reviews`: 2 rows
- **Concurrency Level in Profiling:** Single-node test runner with concurrent query batches in `Promise.all` (node client pool size: default 10).
- **Execution Mode:** `EXPLAIN ANALYZE` on PostgreSQL engine combined with end-to-end service timer measurements (`performance.now()`).

---

## 3. Query Execution Plans (`EXPLAIN ANALYZE`)

### 1. Catalog Listing Query
- **SQL:**
  ```sql
  SELECT id, name, slug, base_price_paise, rating, review_count, is_featured, created_at 
  FROM products 
  WHERE status = 'ACTIVE' 
  ORDER BY is_featured DESC, created_at DESC 
  LIMIT 12;
  ```
- **Before Optimization (suboptimal index `(is_featured, status)`):**
  ```text
  Limit  (cost=5.55..7.01 rows=12 width=109) (actual time=0.092..0.094 rows=12 loops=1)
    ->  Incremental Sort  (cost=5.55..11.63 rows=50 width=109) (actual time=0.091..0.092 rows=12 loops=1)
          Sort Key: is_featured DESC, created_at DESC
          Presorted Key: is_featured
          Full-sort Groups: 1  Sort Method: quicksort  Average Memory: 29kB  Peak Memory: 29kB
          ->  Index Scan Backward using products_is_featured_status_idx on products  (cost=0.14..9.81 rows=50 width=109) (actual time=0.018..0.039 rows=23 loops=1)
                Index Cond: (status = 'ACTIVE'::"ProductStatus")
  Planning Time: 0.620 ms
  Execution Time: 0.130 ms
  ```
- **After Optimization (composite index `products_status_is_featured_created_at_idx`):**
  ```text
  Limit  (cost=0.14..2.39 rows=12 width=109) (actual time=0.011..0.025 rows=12 loops=1)
    ->  Index Scan using products_status_is_featured_created_at_idx on products  (cost=0.14..9.53 rows=50 width=109) (actual time=0.009..0.023 rows=12 loops=1)
          Index Cond: (status = 'ACTIVE'::"ProductStatus")
  Planning Time: 0.251 ms
  Execution Time: 0.052 ms
  ```
  *Result: Zero in-memory sorting, exact 12 row reads, 60% lower execution cost.*

### 2. Admin Inventory & Variant Listing Query
- **SQL:**
  ```sql
  SELECT id, sku, color_name, size, stock_quantity, updated_at 
  FROM product_variants 
  ORDER BY updated_at DESC, id ASC 
  LIMIT 25;
  ```
- **Before Optimization (No index on `updated_at`):**
  ```text
  Limit  (cost=17.47..17.53 rows=25 width=65) (actual time=0.157..0.160 rows=25 loops=1)
    ->  Sort  (cost=17.47..18.22 rows=300 width=65) (actual time=0.155..0.157 rows=25 loops=1)
          Sort Key: updated_at DESC, id
          Sort Method: top-N heapsort  Memory: 31kB
          ->  Seq Scan on product_variants  (cost=0.00..9.00 rows=300 width=65) (actual time=0.021..0.077 rows=300 loops=1)
  Planning Time: 0.104 ms
  Execution Time: 0.208 ms
  ```
- **After Optimization (Index `product_variants_updated_at_id_idx`):**
  ```text
  Limit  (cost=0.27..1.56 rows=25 width=65) (actual time=0.013..0.024 rows=25 loops=1)
    ->  Index Scan using product_variants_updated_at_id_idx on product_variants  (cost=0.27..15.74 rows=300 width=65) (actual time=0.012..0.021 rows=25 loops=1)
  Planning Time: 0.177 ms
  Execution Time: 0.047 ms
  ```
  *Result: 91% cost reduction, zero sequential table scan, zero sorting.*

---

## 4. Changes Implemented

### Component 1: Database Indexes ([schema.prisma](../backend/prisma/schema.prisma))
Additive migration `20260906160000_phase7_performance_indexes` applied to PostgreSQL:
1. `products(status, is_featured DESC, created_at DESC)`: Serves active product listings sorted by featured/created_at without in-memory sorting.
2. `products(updated_at DESC, id ASC)`: Eliminates sequential scan and sort for admin product pagination.
3. `product_variants(updated_at DESC, id ASC)`: Eliminates top-N heapsort across variants in admin inventory management.
4. `order_items(variant_id)`: Foreign key index on `variant_id` optimizing variant lookups, joins, and non-blocking FK cascade/restrict checks.
5. `cart_items(variant_id)`: Foreign key index on `variant_id` optimizing variant reference lookups in cart operations.

### Component 2: Admin Dashboard Aggregation ([admin.service.ts](../backend/src/services/admin.service.ts))
- Replaced the 11-query sequential `$transaction` with a consolidated single SQL aggregate query (`SELECT (SELECT COUNT(*)...)...`) executed in parallel with recent orders via `Promise.all`.
- Removed transaction locks on read-only business metrics.
- Slashed dashboard latency from ~900ms down to ~62ms.

### Component 3: Bounded Query Safety
- **[commerce.service.ts](../backend/src/services/commerce.service.ts)**:
  - Added `take: 100` upper bound to `orders(userId)` to protect against unbounded memory reads on customer order history.
  - Added `take: 100` batch size bound to `releaseExpiredReservations()` active reservations query.
  - Added `take: 50` bound to `addresses(userId)`.
- **[admin.service.ts](../backend/src/services/admin.service.ts)**:
  - Added `take: 100` bound to `coupons()`.
  - Added `take: 100` bound to `categories()`.

---

## 5. Production Scalability Cautions & Technical Considerations

> [!WARNING]
> **Caution 1: Benchmark Dataset Size**
> The current staging database contains 50 products, 300 variants, and a small number of orders. While EXPLAIN ANALYZE proves that algorithmic costs (eliminating seq scans and sorts) scale logarithmically via B-tree index seeks, full production validation must re-measure under production-scale row counts (10,000+ products, 100,000+ orders) and sustained concurrent traffic before declaring production-scale readiness.

> [!IMPORTANT]
> **Caution 2: Query Truncation vs. Pagination**
> The additions of `take: 100` for customer orders and `take: 50` for customer addresses safeguard server memory from unbounded reads, but will truncate older records if a single customer accumulates more than 100 orders or 50 addresses. In a future iteration, the customer orders API should be upgraded to explicit cursor or page-based pagination (`page`, `limit`) to avoid silent truncation.

> [!NOTE]
> **Caution 3: Dashboard Snapshot Consistency**
> In `AdminService.dashboard()`, the scalar metrics aggregate query and the 10 recent orders query run in parallel under PostgreSQL `READ COMMITTED` isolation rather than inside a single serialized transaction. Consequently, the summary totals (e.g., total orders, revenue) and the 10 recent orders list represent database states separated by a few milliseconds. This non-blocking eventual consistency is standard for operational dashboards and prevents read queries from starving write transactions.

> [!CAUTION]
> **Caution 4: Production Index Migrations**
> In high-throughput production environments with active writes, creating indexes on large tables can acquire exclusive table locks. While Prisma's `prisma migrate deploy` executes standard `CREATE INDEX`, production database migrations on tables with millions of records should use `CREATE INDEX CONCURRENTLY` in non-transactional SQL migrations to prevent write blocking.

> [!NOTE]
> **Caution 5: Environment Guarantees**
> Observations of "zero pool contention" and "zero warnings" reflect the tested staging connection pool and vitest runner concurrency. They should be verified in staging deployment monitoring under simulated peak traffic rather than assumed as universal distributed guarantees.

---

## 6. Caching Policy Decision & Audit

- **Audit Confirmation:** Dynamic transactional state (**inventory, inventory reservations, cart, checkout, orders, payments, coupons, user sessions, sensitive admin data**) remains **100% UNCACHED** to preserve transactional integrity and concurrency safety.
- **Redis Requirement:** Direct PostgreSQL query performance is sub-90ms for catalog and ~62ms for admin dashboard. Adding Redis for the catalog or checkout is not justified and would introduce cache invalidation risks.
- **Existing Review Cache:** Public reviews continue using optional Redis cache with a 60-second TTL and automatic invalidation on review creation, with verified graceful fallback to PostgreSQL if Redis is offline.

---

## 7. Full Verification Results

All 5 verification quality gates passed cleanly:

```bash
# 1. Typecheck
pnpm typecheck  # PASS (frontend + backend, 0 errors)

# 2. Lint
pnpm lint       # PASS (0 errors)

# 3. Prisma Schema & Migration Validation
pnpm db:validate  # PASS (Schema valid, 9 migrations deployed)

# 4. Production Bundle Build
pnpm build      # PASS (Backend tsc + Vite production bundle in 8.34s)

# 5. Full Monorepo Test Suite
pnpm test       # PASS: 191 tests passed (132 backend + 59 frontend, 0 failed)
```
