# PhonePe Production Onboarding & Credential Provisioning Guide

This document outlines the mandatory operational and regulatory steps required to provision live PhonePe credentials and transition Purvaja Fashion from `PAYMENT_PROVIDER=demo` to live production payments (`PAYMENT_PROVIDER=phonepe`).

---

## 1. Regulatory & Business Prerequisites

PhonePe Payment Gateway (PG) requires standard Indian business KYC verification before live credentials and merchant access are issued:

1. **Registered Legal Entity:** Certificate of Incorporation / Partnership Deed / Sole Proprietorship registration.
2. **Business PAN & GSTIN:** Active Goods and Services Tax (GST) registration.
3. **Current Bank Account:** Settled directly into the Purvaja Fashion bank account (requires cancelled cheque / bank statement).
4. **Active Storefront Compliance:**
   - HTTPS domain (`https://purvaja.fashion`)
   - Mandatory public policy pages published:
     - Terms of Service (`/terms`)
     - Privacy Policy (`/privacy`)
     - Cancellation & Refund Policy (`/returns`)
     - Shipping & Delivery Policy (`/shipping`)
     - Contact Us with physical address and grievance email (`/contact`)

---

## 2. PhonePe Merchant Portal Onboarding Steps

1. **Sign Up:** Register at [PhonePe Business](https://business.phonepe.com/) using the corporate email address.
2. **KYC Submission:** Upload entity documents, bank verification, and director identity proofs.
3. **PG Integration Request:** In the dashboard under **Developer Settings** -> **API Credentials**:
   - Request **Standard Checkout (Web / Redirect)** integration.
   - Note the assigned **Merchant ID (MID)** (e.g. `PURVAJAFASHIONONLINE`).
4. **Generate API Keys (OAuth & Salt Key):**
   - **Client ID & Client Secret:** Used for the OAuth 2.0 `client_credentials` grant token exchange.
   - **Salt Key (Client Secret) & Salt Index:** Used for HMAC SHA-256 request payload verification (`X-VERIFY` header). Standard Salt Index is typically `1`.
5. **Configure Webhook Callback:**
   - Set the S2S Webhook URL:
     ```text
     https://api.purvaja.fashion/api/v1/payments/phonepe-callback
     ```
   - Enable events for `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `REFUND_SUCCESS`, and `REFUND_FAILED`.
6. **Whitelist Outbound Hostinger Server IPs:**
   - In PhonePe portal security settings, whitelist the static public IPv4 and IPv6 addresses of your Hostinger VPS deployment server.

---

## 3. Production Environment Variable Configuration

Once live credentials are confirmed by PhonePe, update `backend/.env` on the Hostinger VPS:

```bash
# Set Payment Gateway to live PhonePe
PAYMENT_PROVIDER=phonepe
PHONEPE_ENVIRONMENT=production

# Authoritative Merchant Credentials
PHONEPE_MERCHANT_ID=YOUR_LIVE_PHONEPE_MERCHANT_ID
PHONEPE_CLIENT_ID=YOUR_LIVE_PHONEPE_CLIENT_ID
PHONEPE_CLIENT_SECRET=YOUR_LIVE_PHONEPE_CLIENT_SECRET
PHONEPE_CLIENT_VERSION=1

# S2S Webhook URL configured in PhonePe Dashboard
PHONEPE_CALLBACK_URL=https://api.purvaja.fashion/api/v1/payments/phonepe-callback
```

---

## 4. Live Verification Procedure

Before routing customer traffic to PhonePe:

1. **Staging Smoke Test:**
   - Run in `PHONEPE_ENVIRONMENT=sandbox` with PhonePe UAT test simulator.
2. **Production ₹1 Verification:**
   - Create a live test product priced at ₹1 (100 paise).
   - Perform a real UPI payment using GPay / PhonePe / Paytm app.
   - Confirm server logs receive the S2S callback with verified HMAC signature:
     `PhonePe payment webhook callback received.`
   - Confirm order transitions to `CONFIRMED` and payment status to `SUCCESS`.
3. **Automated Refund Test:**
   - From Admin Order Details, initiate a partial or full refund for the ₹1 transaction.
   - Confirm PhonePe PG executes the refund and logs:
     `PhonePe refund completed with provider reference.`
4. **Reconciliation Verification:**
   - Trigger `POST /api/v1/admin/payments/:id/reconcile` and verify status agrees with PhonePe servers.
