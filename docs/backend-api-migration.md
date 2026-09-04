# Backend API Migration Map

## Phase 0 Baseline

The current backend is an Express and TypeScript health-check scaffold. Its only
implemented endpoint is versioned health status. All customer, checkout, and
admin API paths below are frontend compatibility requirements, not existing
backend behavior. Future responses must retain the frontend envelope:
`{ success: true, data: ... }` or `{ success: false, error: { code, message, details? } }`.

## Implemented Endpoints

| Method | Current path | Auth / role | Request | Response | Current implementation | Target status | Frontend consumer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/health`, `/api/v1/health` | No | None | Health status, timestamp, uptime, environment | Express health controller | KEEP | Operations only |
| GET | `/api/v1/products` | No | `page`, `limit`, `search`, catalog filters, `sort` | `{ items, page, limit, pageSize, total, totalPages }` | Prisma/PostgreSQL catalog query | IMPLEMENTED | `productService.list` |
| GET | `/api/v1/products/:slugOrId` | No | UUID or URL-safe slug | `{ product, relatedProducts }` | Prisma/PostgreSQL catalog query | IMPLEMENTED | `productService.getBySlugOrId` |
| GET | `/api/v1/products/:productId/reviews` | No | UUID or URL-safe slug; `page`, `limit`, `sort` | `{ items, page, limit, pageSize, total, totalPages }` | Published reviews only | IMPLEMENTED | `productService.getReviews` |

## Public Catalog API

`GET /api/v1/products` reads only active products from PostgreSQL through Prisma. Pagination defaults to page `1` and limit `24`; the maximum limit is `100`. Supported filters are comma-separated `category`, `fit`, `fabric`, `size`, `color`, `sleeve`, `collar`, and `pattern`, plus `minPrice`, `maxPrice`, `minRating`, `inStock`, `deals`, and `newArrivals`. Supported sort values are `featured`, `newest`, `price-asc`, `price-desc`, `rating`, and `discount`. Search matches name, description, brand, SKU, and category.

`GET /api/v1/products/:slugOrId` accepts a UUID or URL-safe product slug and returns the product, images, variants, category summaries, stock state, and up to four same-category related products. It returns `404 PRODUCT_NOT_FOUND` for a valid but unknown identifier and `400 VALIDATION_ERROR` for malformed input.

`GET /api/v1/products/:productId/reviews` accepts the same identifier form, returns only `PUBLISHED` reviews, and supports `page`, `limit` (maximum `100`), and `sort` (`newest`, `oldest`, `rating-high`, `rating-low`). Reviewer email and user records are never selected; the public response uses the privacy-safe label `Verified customer`.

All catalog endpoints are public, use the shared `{ success, data }` envelope, validate query parameters, and use the shared standardized error envelope. They do not expose Prisma errors, authentication data, user records, sessions, or tokens.

## Custom Authentication

Implemented endpoints are `POST /api/v1/auth/register`, `POST /login`, `POST /logout`, `GET /me`, `PATCH /me`, `POST /verify-email`, `POST /forgot-password`, `POST /reset-password`, and `GET /csrf`. Registration and login establish a server-side PostgreSQL session whose random browser secret is stored only in a Secure-in-production, HttpOnly, SameSite=Lax cookie. PostgreSQL stores only its SHA-256 hash, expiration, and revocation state.

Passwords are normalized and hashed with Argon2id. Email verification and password reset links contain high-entropy single-use secrets; only their SHA-256 hashes are stored. Resend runs exclusively through the backend email service. If email delivery is unavailable, registration completes safely but reports `emailSent: false`; verification can be retried by a future resend endpoint. Forgot-password always returns the same response, whether or not an account exists.

`PATCH /me` and `POST /logout` require the double-submit CSRF token: the frontend reads the non-HttpOnly `pf_csrf` cookie and sends it as `X-CSRF-Token`, while the session cookie remains HttpOnly. All sensitive auth endpoints have a stricter in-memory rate limit. `requireAuth` and `requireRole(...)` load the user and role from the server-side session; frontend role values are never trusted. Unverified users may browse and access their profile; a future checkout phase must require verified email before order placement.

`POST /api/v1/auth/resend-verification` accepts `{ email }`, always returns the same generic success response for valid input, and is rate-limited to three requests per IP per hour. It sends a new verification email only for active, unverified accounts. The backend sends the email before atomically consuming prior active registration verification tokens and recording the new hashed, 24-hour token; failed delivery leaves existing valid tokens intact.

## Required Customer Endpoints

| Method | Target path | Auth / role | Request or query | Response | Target status | Frontend consumer |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | No | Registration credentials | Authenticated user | REBUILD | `authService.register` |
| POST | `/api/v1/auth/login` | No | Login credentials | Authenticated user and session cookie | REBUILD | `authService.login` |
| POST | `/api/v1/auth/logout` | Customer | None | Empty success response | REBUILD | `authService.logout` |
| GET | `/api/v1/auth/me` | Customer | None | Current user | REBUILD | `authService.getCurrentUser` |
| PATCH | `/api/v1/auth/me` | Customer | Profile fields | Updated user | REBUILD | `authService.updateProfile` |
| POST | `/api/v1/auth/forgot-password` | No | Email | Empty success response | REBUILD | `authService.forgotPassword` |
| POST | `/api/v1/auth/reset-password` | No | Reset token and password | Empty success response | REBUILD | `authService.resetPassword` |
| GET | `/api/v1/products` | No | Search, filters, sort, limit | Product list or paginated items | REBUILD | `productService.list` |
| GET | `/api/v1/products/:slugOrId` | No | Product slug or UUID | Product with related products | REBUILD | `productService.getBySlugOrId` |
| GET | `/api/v1/products/:productId/reviews` | No | Product ID | Reviews | REBUILD | `productService.getReviews` |
| POST | `/api/v1/products/:productId/reviews` | Customer | Rating, title, comment | Created review | REBUILD | `productService.createReview` |
| POST | `/api/v1/orders/checkout` | Customer | Lines, address, delivery, payment, coupon | Order ID, payment state, optional redirect | REBUILD | `orderService.checkout` |
| GET | `/api/v1/orders/my-orders` | Customer | Order filters | Customer orders | REBUILD | `orderService.list` |
| GET | `/api/v1/orders/:orderId` | Customer owner | None | Order | REBUILD | `orderService.getById` |
| GET | `/api/v1/orders/:orderId/status` | Customer owner | None | Order and payment status | REBUILD | `orderService.getPaymentStatus` |
| POST | `/api/v1/orders/:orderId/cancel` | Customer owner | Cancellation reason | Updated order | REBUILD | `orderService.cancel` |
| POST | `/api/v1/orders/:orderId/returns` | Customer owner | Return reason | Updated order | REBUILD | `orderService.requestReturn` |

## Required Admin Endpoints

| Method | Target path | Auth / role | Request or query | Response | Target status | Frontend consumer |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/analytics/metrics` | Admin | None | Dashboard metrics | REBUILD | `adminService.getDashboardMetrics` |
| GET | `/api/v1/admin/analytics/sales` | Admin | `timeframe` | Sales points | REBUILD | `adminService.getSalesChartData` |
| GET | `/api/v1/admin/analytics/top-products` | Admin | None | Product sales ranking | REBUILD | `adminService.getTopProducts` |
| GET | `/api/v1/admin/customers` | Admin | `search` | Customers | REBUILD | `adminService.getCustomers` |
| GET | `/api/v1/admin/inventory` | Admin | `filter` | Variant inventory | REBUILD | `adminService.getInventory` |
| PATCH | `/api/v1/admin/inventory/:variantId` | Admin | Stock count | Updated inventory item | REBUILD | `adminService.updateVariantStock` |
| GET / PUT | `/api/v1/admin/settings` | Admin | Store settings for PUT | Settings | REBUILD | `adminService.getSettings`, `updateSettings` |
| GET / POST | `/api/v1/admin/products` | Admin | Product filter or product form | Product list or created product | REBUILD | `adminService.listProducts`, `createProduct` |
| PUT / DELETE | `/api/v1/admin/products/:id` | Admin | Product form for PUT | Updated product or empty success | REBUILD | `adminService.updateProduct`, `deleteProduct` |
| GET | `/api/v1/admin/orders` | Admin | None | Orders | REBUILD | `adminService.listOrders` |
| GET / PATCH | `/api/v1/admin/orders/:id` | Admin | Status for PATCH | Order | REBUILD | `adminService.getOrder`, `updateOrderStatus` |

## Compatibility Rules

- The backend calculates price, discounts, delivery, stock, and payment state; clients send only requested input.
- Cart and wishlist currently persist locally in the frontend. Their server synchronization is a future API decision, not a Phase 0 implementation.
- No current `/payments`, `/cart`, `/cart_items`, `/ratings`, or `/users` endpoint exists. These are `UNKNOWN` until a Phase 1 contract decision; do not add unconsumed routes.
- PhonePe callbacks must be a separate signed, idempotent backend-only route and must never be invoked by the browser as a trusted payment result.
