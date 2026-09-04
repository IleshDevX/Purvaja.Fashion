# Performance Architecture

## Current Approach

- PostgreSQL through Prisma remains the authoritative store for catalog stock, carts, checkout, payments, sessions, orders, and every admin route.
- Product list/detail responses are intentionally not cached: they contain live variant stock and availability, which must not become stale.
- Published public review pages may be cached for 60 seconds when `REDIS_URL` is configured. Review responses contain no private customer data.
- Redis is optional. If it is absent or unhealthy, requests use PostgreSQL without failing or serving fabricated data.
- API text responses use HTTP compression. HTTPS termination, CDN/static asset caching, and image optimization belong at the reverse proxy (e.g. Nginx, LiteSpeed, Cloudflare, or Hostinger edge) layer.

## Redis Configuration

Set `REDIS_URL` only in the backend deployment environment. Do not expose it to Vite or commit it. The process logs only Redis availability, never the URL or credentials.

Redis is appropriate after deploying multiple API instances or observing repeated public review traffic. The current in-memory rate-limit stores are per-process; move them to a Redis store only when horizontal scaling is enabled.

## Query Discipline

- Public catalog queries use Prisma `select`, bounded pagination, database-side filtering, and deterministic ordering.
- Product review queries use the existing `(product_id, status, created_at)` index.
- Checkout inventory reservation stays transactional and bypasses cache.
- Existing indexes cover session expiry, catalog status/newness, product-category joins, order lifecycle, inventory reservations, and audit-history access. Add indexes only after collecting production query evidence with `EXPLAIN (ANALYZE, BUFFERS)`.

## Operations

Monitor API latency, PostgreSQL connection saturation, slow-query logs, Redis hit/error rate, and cache memory usage. Redis outages are warnings, not an availability dependency. Configure compression and proxy response buffering at the edge; do not cache authenticated or payment responses at a shared proxy.
