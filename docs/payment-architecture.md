# Payment Architecture

Purvaja Fashion uses Express, Prisma, and PostgreSQL for all payment state. The browser never marks an order paid. `PAYMENT_PROVIDER=demo` is the current development setting; it deliberately shows a labeled local simulation and charges no money.

Checkout loads the authenticated user's server-side cart, snapshots variant prices into order items, reserves stock in a transaction, and creates one UPI/PhonePe payment record. A conditional PostgreSQL stock update prevents overselling. Reservations expire after 15 minutes and are released for failed, expired, or cancelled payments.

Payment status is independent from order status. `SUCCESS` confirms the order and consumes its reservation. All other demo terminal states release stock. Repeated terminal callbacks are idempotent because payment transitions are conditional and reservation release occurs only once.

`PHONEPE_*` configuration remains backend-only. Live PhonePe initiation is intentionally disabled until the merchant's current official integration contract and credentials are configured; no live transaction has been tested.
