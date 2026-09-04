# Admin Architecture

All `/api/v1/admin/*` routes require the existing server-side session plus `ADMIN` role. Mutations also require the CSRF token. The frontend route guard is UX only; Express RBAC is authoritative.

The admin API provides dashboard aggregates, catalog and category mutations, variants, inventory, customer-safe listings, coupons, orders, and audit logs. Sensitive authentication fields are never selected.
