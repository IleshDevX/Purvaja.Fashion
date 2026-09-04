# Backend API Migration Map

## Phase 0 Baseline

The current backend is an Express and TypeScript health-check scaffold. Its only
implemented endpoint is versioned health status. All customer, checkout, and
admin API paths below are frontend compatibility requirements, not existing
backend behavior. Future responses must retain the frontend envelope:
`{ success: true, data: ... }` or `{ success: false, error: { code, message, details? } }`.

## Implemented Endpoint

| Method | Current path | Auth / role | Request | Response | Current implementation | Target status | Frontend consumer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/health`, `/api/v1/health` | No | None | Health status, timestamp, uptime, environment | Express health controller | KEEP | Operations only |

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
