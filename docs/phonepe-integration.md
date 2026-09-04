# PhonePe Integration Status

The code exposes a payment-provider abstraction with a demo UPI adapter and a separate PhonePe adapter. All credentials are server-side configuration: `PHONEPE_MERCHANT_ID`, `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`, `PHONEPE_ENVIRONMENT`, and `PHONEPE_CALLBACK_URL`.

PhonePe live initiation and callback verification are not active in this development build. They require verification against the merchant account's current official PhonePe API documentation before production enablement. The application fails fast when `PAYMENT_PROVIDER=phonepe` is selected without the required configuration.
