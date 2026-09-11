# PhonePe Standard Checkout integration

The default development and test provider remains `PAYMENT_PROVIDER=demo`. PhonePe is opt-in and must remain in `PHONEPE_ENVIRONMENT=sandbox` until a separate production approval and provider verification are complete.

The PhonePe adapter implements the current Standard Checkout OAuth flow:

1. Exchange `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_VERSION`, and `PHONEPE_CLIENT_SECRET` for an `O-Bearer` token with the sandbox OAuth endpoint.
2. Create payments with `POST /checkout/v2/pay`, using the local payment ID as `merchantOrderId` and integer paise as `amount`.
3. Reconcile with `GET /checkout/v2/order/{merchantOrderId}/status`.
4. Submit refunds with `POST /payments/v2/refund`. An accepted `PENDING` response is not settlement. The admin refund action reconciles pending/unknown outcomes with `GET /payments/v2/refund/{merchantRefundId}/status`; only `COMPLETED` with the exact ledger amount updates financial totals. Pending reconciliation never repeats the refund POST.
5. Authenticate webhooks by comparing the `Authorization` header to the SHA-256 digest of `PHONEPE_WEBHOOK_USERNAME:PHONEPE_WEBHOOK_PASSWORD`, then validate the event, merchant order, merchant identity, and amount before applying the idempotent payment transition.

Required server-side variables when `PAYMENT_PROVIDER=phonepe` is selected:

```ini
PAYMENT_PROVIDER=phonepe
PHONEPE_ENVIRONMENT=sandbox
PHONEPE_MERCHANT_ID=
PHONEPE_CLIENT_ID=
PHONEPE_CLIENT_SECRET=
PHONEPE_CLIENT_VERSION=
PHONEPE_CALLBACK_URL=https://your-sandbox-host.example/api/v1/payments/phonepe-callback
PHONEPE_WEBHOOK_USERNAME=
PHONEPE_WEBHOOK_PASSWORD=
```

Never expose these values through `VITE_*` variables or commit them. Startup and `validate:config` fail closed when the selected provider is missing configuration. Sandbox credentials are still required for a provider-backed acceptance test; local tests mock only the remote PhonePe boundary and do not move money.

Official references: [Authorization](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization), [Create Payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment), [Order Status](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/order-status), [Refund](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/refund), and [Webhook](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/webhook).
