# PostgreSQL Migration Design

## Baseline and Scope

There are no Mongoose models or MongoDB collections in the current backend. The
only MongoDB artifact was an unused connection module and dependency, removed in
Phase 0. This document is a target design for PostgreSQL and Prisma; it is not a
Prisma schema or a migration.

All mutable financial amounts should be integer paise, all primary keys should
be UUIDs, and all entity timestamps should be UTC `created_at` and `updated_at`.
The Express API is the only database client exposed to the storefront.

| Entity | Source / current usage | Key relationships | Constraints and indexes | Migration concerns |
| --- | --- | --- | --- | --- |
| `users` | Frontend auth user type | Has addresses, orders, reviews | Unique normalized email; index role | Use Argon2 hash only; do not store sessions or roles in frontend storage |
| `addresses` | Checkout shipping address | Belongs to user; may be snapshotted in order | User ID index | Preserve order address snapshots when user changes an address |
| `categories` | Product list filter requirement | Has products through join table | Unique slug | Seed categories explicitly; catalog seed currently has no normalized category field |
| `products` | `PRODUCT_SEED`, public/admin product APIs | Has images, variants, reviews, categories | Unique slug; active/catalog indexes | Preserve 50 product IDs and slugs where practical |
| `product_images` | Catalog image arrays | Belongs to product | Product and position unique | Current images are local `/images/products/...` paths; storage strategy is a later decision |
| `product_variants` | Catalog variants | Belongs to product; has inventory movements and order items | Unique SKU and product/color/size | Preserve 300 variant IDs and SKUs; stock must be authoritative here |
| `inventory_movements` | Required for admin inventory | Belongs to variant; references actor/order | Variant/date index; immutable rows | Never mutate stock without a movement reason and actor |
| `carts` | Frontend local cart only | Has cart items; optionally belongs to user | One active cart per user | No backend cart contract exists yet; defer server synchronization decision |
| `cart_items` | Frontend local cart only | Belongs to cart and variant | Unique cart/variant | Validate stock only at checkout; cart is not a reservation |
| `wishlists` | Frontend local wishlist only | Has product join records | Unique user/product | No API contract exists; defer implementation |
| `orders` | Checkout and order pages | Belongs to user; has items, payment and address snapshot | Customer/date and status/date indexes; unique public order number | Create in one transaction with stock validation and idempotency key |
| `order_items` | Checkout lines | Belongs to order; references variant | Order ID index | Snapshot product name, SKU, selected color/size, and unit price |
| `payments` | Checkout payment status | Belongs to order | Unique provider transaction ID; order index | Start COD first; provider callbacks need signature verification and idempotency |
| `reviews` | Product review UI | Belongs to product and user | Unique user/product; product/date index | Validate purchase/review policy before publishing reviews |
| `coupons` | Checkout coupon input | Has redemptions | Unique normalized code; active/date index | Recalculate eligibility and discount server-side |
| `coupon_redemptions` | Coupon use audit | Belongs to coupon, user, order | Unique coupon/order; user/coupon index | Write in the checkout transaction |
| `audit_logs` | Admin-sensitive actions | References actor and entity | Entity/date and actor/date indexes | Store append-only event metadata without secrets or payment data |

## Catalog Seed Verification

`backend/src/seeds/products.seed.ts` contains 50 products, 300 variants, 50
unique slugs, and 300 unique SKUs. It preserves colors, sizes, prices, discounts,
images, and inventory counts from the prototype.

Known migration decisions for Phase 2:

- Convert string product attributes such as fit, fabric, collar, sleeve, and
  pattern to controlled enums or validated text values.
- Derive category assignments deliberately; the recovered seed does not provide
  a normalized category relation.
- Verify that image files are deployed or migrate assets to object storage before
  production traffic.
- Recalculate discount display from `price` and `compare_at_price`; do not trust
  duplicated discount input from an admin client.
- The provided catalog is development data, not an inventory import process.

## Phase 2 Implementation

The initial Prisma migration is `20260904103000_init_ecommerce_schema`. It
creates UUID-keyed users, sessions, email verification tokens, password reset
tokens, addresses, categories, products, images, variants, inventory movements,
reviews, carts, cart items, orders, order items, payments, coupons, coupon
redemptions, and audit logs.

Authentication remains custom Express authentication. Future opaque session,
email-verification, and password-reset tokens will be stored only as SHA-256
hashes. Resend is the planned transactional email provider for Phase 4; no
Resend SDK, key, email, or authentication endpoint exists in this phase.

The seed is repeatable: it upserts the recovered catalog by product slug and
variant SKU, attaches every item to the derived `shirts` category, and verifies
50 products, 300 variants, 50 unique slugs, and 300 unique SKUs. Legacy seed
IDs are retained in metadata because PostgreSQL UUID primary keys replace the
prototype's `shirt-###` and `var-###` identifiers.

The migration adds PostgreSQL check constraints for ratings, quantities, money,
discounts, stock, coupon limits, ISO country codes, and a partial unique index
that permits only one default address per user. Orders, payments, inventory,
coupon redemptions, and audit logs use restrictive foreign keys to preserve
historical records; only cart items cascade when their cart is removed.
