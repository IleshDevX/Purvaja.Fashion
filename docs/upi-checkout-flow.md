# UPI Checkout Flow

1. The frontend synchronizes the selected basket to the authenticated Express cart.
2. `POST /api/v1/checkout` creates an order, price snapshots, inventory reservations, and an initiated UPI payment.
3. Demo mode redirects to `/checkout/payment`, marked `DEMO PAYMENT - NO REAL MONEY WILL BE CHARGED`.
4. The demo page sends only a requested outcome; Express verifies payment ownership and changes state server-side.
5. Success confirms the order and clears the cart. Failure, expiry, and cancellation release reservations and preserve the frontend basket for another checkout.

For local testing, choose each of Success, Failure, Expiry, and Cancel Payment on the demo screen. `PAYMENT_PROVIDER=demo` is required. Demo routes must not be enabled in production.
