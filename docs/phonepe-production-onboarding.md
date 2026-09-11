# PhonePe production onboarding gate

Production PhonePe payments are intentionally disabled for this project. Development and automated acceptance continue to use `PAYMENT_PROVIDER=demo`; provider testing may use `PAYMENT_PROVIDER=phonepe` only with `PHONEPE_ENVIRONMENT=sandbox` and verified sandbox credentials.

Before any future production activation, complete all of these independent gates:

1. Finish PhonePe merchant onboarding and obtain production Standard Checkout OAuth credentials.
2. Configure a production webhook username and password in both PhonePe and the backend secret store.
3. Run the create-payment, redirect, webhook, order-status, reconciliation, and refund flows in PhonePe sandbox against hosted staging.
4. Rehearse duplicate, delayed, failed, amount-mismatch, merchant-mismatch, and out-of-order webhook events. Confirm that the order, payment, coupon, and inventory transactions remain idempotent.
5. Obtain explicit release approval before setting both `PAYMENT_PROVIDER=phonepe` and `PHONEPE_ENVIRONMENT=production`.

No live credential, real-money test, or production enablement is part of the current remediation.