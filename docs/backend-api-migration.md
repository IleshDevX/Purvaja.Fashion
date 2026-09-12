# Backend API Reference & Migration Map

## Overview

The Purvaja Fashion E-Commerce platform utilizes an Express & TypeScript backend with PostgreSQL (Prisma ORM), Redis caching (with graceful PostgreSQL fallback), Argon2id authentication, atomic inventory locking with stock reservation timeouts, PhonePe PG UPI integration (with local simulation), and Resend transactional emails.

All API endpoints follow the standardized response envelope:
- **Success:** `{ success: true, data: ... }`
- **Error:** `{ success: false, error: { code: string, message: string, details?: unknown } }`

---

## Complete Implemented Endpoints

### 1. System & Health
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| GET | `/health`, `/api/v1/health` | Public | System status, database latency, Redis connection status, uptime |

### 2. Authentication & Sessions (`/api/v1/auth`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | Public | Register customer account (Argon2id, email verification trigger) |
| POST | `/api/v1/auth/login` | Public | Authenticate and issue secure HttpOnly session cookie |
| POST | `/api/v1/auth/logout` | Customer/Admin | Revoke session and clear session cookie (Requires CSRF) |
| GET | `/api/v1/auth/me` | Customer/Admin | Fetch current authenticated user profile |
| PATCH | `/api/v1/auth/me` | Customer/Admin | Persist names, phone, fit/collar preferences; email changes remain verification-bound (Requires CSRF) |
| POST | `/api/v1/auth/verify-email` | Public | Verify email address using SHA-256 token |
| POST | `/api/v1/auth/resend-verification` | Public | Rate-limited resend of verification email (max 3/hr) |
| POST | `/api/v1/auth/forgot-password` | Public | Generate and send password reset link |
| POST | `/api/v1/auth/reset-password` | Public | Reset password using one-time token and revoke sessions |
| GET | `/api/v1/auth/csrf` | Public | Issue CSRF double-submit token (`pf_csrf` cookie) |

### Newsletter consent (`/api/v1/newsletter`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/newsletter/subscriptions` | Public, rate limited | Idempotently store normalized consent; returns `PENDING_PROVIDER` and does not claim delivery while no provider is configured |

### 3. Customer Addresses (`/api/v1/addresses`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/addresses` | Customer | List all saved customer shipping addresses |
| POST | `/api/v1/addresses` | Customer | Add new shipping address (optionally set default) |
| PATCH | `/api/v1/addresses/:addressId` | Customer | Update existing address fields / default status |
| DELETE | `/api/v1/addresses/:addressId` | Customer | Delete an address owned by the customer |

### 4. Public Catalog (`/api/v1/products`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/products` | Public | Paginated product listing with filters (`category`, `fit`, `fabric`, `size`, `color`, `sleeve`, `collar`, `pattern`, `minPricePaise`, `maxPricePaise`, `minRating`, `inStock`, `deals`, `newArrivals`, `ids`) and search |
| GET | `/api/v1/products/:slugOrId` | Public | Product details by UUID or slug with variants and related items |
| GET | `/api/v1/products/:productId/reviews` | Public | Paginated published product reviews |
| POST | `/api/v1/products/:productId/reviews` | Customer | Submit a 1-5 star review (Requires completed purchase) |

### 5. Cart Management (`/api/v1/cart`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/cart` | Customer | Retrieve customer server-side cart with computed pricing |
| POST | `/api/v1/cart/items` | Customer | Add variant to cart with inventory validation |
| PATCH | `/api/v1/cart/items/:id` | Customer | Update cart item quantity |
| DELETE | `/api/v1/cart/items/:id` | Customer | Remove item from cart |
| DELETE | `/api/v1/cart` | Customer | Clear entire cart |

### 6. Coupons & Discounts (`/api/v1/coupons`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/coupons/validate` | Customer | Validate coupon code, minimum spend, expiry, and per-user usage limits |

### 7. Orders & Checkout (`/api/v1`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/checkout` | Customer | Idempotently create an order, reserve inventory and calculate server pricing from exact paise values |
| GET | `/api/v1/orders` | Customer | Paginated customer-owned orders with validated `page`, `limit`, `status`, `search` and `sort` semantics |
| GET | `/api/v1/orders/:orderId` | Customer Owner | Order invoice details, tracking milestones, item lines |
| POST | `/api/v1/orders/:orderId/cancel` | Customer Owner | Cancel when the server-provided `availableActions.canCancel` is true; restore inventory and create the appropriate refund record |
| POST | `/api/v1/orders/:orderId/returns` | Customer Owner | Request item quantities for return when `availableActions.canReturn` is true |

### 8. Payments (`/api/v1/payments`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/payments/:paymentId/demo-result` | Customer Owner | Apply a simulated success/failure result (DEV/TEST demo mode only) |
| POST | `/api/v1/payments/:paymentId/initiate` | Customer Owner | Idempotently claim or resume the durable payment-initiation workflow |
| GET | `/api/v1/payments/:paymentId/status` | Customer Owner | Return the authoritative order/payment state |
| POST | `/api/v1/payments/phonepe-callback` | Public (Authenticated) | PhonePe Standard Checkout webhook authenticated with SHA-256 of the configured webhook username and password in the `Authorization` header |

### 9. Administration (`/api/v1/admin`)
| Method | Path | Auth / Role | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/dashboard` | Admin | Real-time sales, order counts, revenue, and inventory alerts |
| GET | `/api/v1/admin/products` | Admin | Paginated admin product list with inventory counts |
| GET | `/api/v1/admin/products/:id` | Admin | Product detail with variants and categories |
| POST | `/api/v1/admin/products` | Admin | Create product with categories, images, and base attributes |
| PATCH | `/api/v1/admin/products/:id` | Admin | Update product information and category associations |
| GET | `/api/v1/admin/categories` | Admin | List all product categories |
| POST | `/api/v1/admin/categories` | Admin | Create product category |
| PATCH | `/api/v1/admin/categories/:id` | Admin | Update product category |
| GET | `/api/v1/admin/variants` | Admin | Paginated SKU variant management |
| POST | `/api/v1/admin/variants` | Admin | Create SKU variant with size, color, and stock |
| PATCH | `/api/v1/admin/variants/:id` | Admin | Update SKU variant |
| GET | `/api/v1/admin/inventory` | Admin | Stock matrix (in-stock, low-stock, out-of-stock) |
| POST | `/api/v1/admin/inventory/adjust` | Admin | Atomic manual stock adjustment with movement audit log |
| POST | `/api/v1/admin/inventory/set-stock/:id` | Admin | Force set variant stock count with correction audit |
| GET | `/api/v1/admin/inventory/movements` | Admin | Paginated inventory ledger history (audited) |
| GET | `/api/v1/admin/inventory/reservations` | Admin | Active and expired checkout inventory reservations |
| GET | `/api/v1/admin/orders` | Admin | Paginated customer orders with search and status |
| GET | `/api/v1/admin/orders/:id` | Admin | Order inspection with payments, items, and customer info |
| PATCH | `/api/v1/admin/orders/:id/status` | Admin | Update order status (`PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`) with automatic stock restoration on cancellation/return |
| GET | `/api/v1/admin/customers` | Admin | Paginated customer list with order counts |
| GET | `/api/v1/admin/customers/:id` | Admin | Customer details with recent order history |
| GET | `/api/v1/admin/coupons` | Admin | List discount coupons |
| POST | `/api/v1/admin/coupons` | Admin | Create promotional discount coupon |
| PATCH | `/api/v1/admin/coupons/:id` | Admin | Update coupon validity, max uses, or discount rates |
| GET | `/api/v1/admin/audit-logs` | Admin | System audit trail tracking all administrative actions |
