# Resend DNS & Production Transactional Email Setup Guide

To ensure reliable, inbox-delivered transactional emails (order confirmations, verification OTPs, password reset links, return notifications) from `noreply@purvaja.fashion`, the authoritative DNS records for `purvaja.fashion` must be configured at your DNS provider (Hostinger DNS Management or Cloudflare).

---

## 1. Required DNS Records for `purvaja.fashion`

Add the following DNS records to your domain DNS Zone:

### 1.1 DKIM (DomainKeys Identified Mail) — Cryptographic Signature
* **Type:** `CNAME` or `TXT` (provided in Resend Dashboard -> Domains -> `purvaja.fashion`)
* **Host / Name:** `resend._domainkey.purvaja.fashion`
* **Value / Points to:** `feedback-smtp.us-east-1.amazonses.com` (or the specific key token generated in your Resend account)
* **TTL:** Automatic or `3600`

### 1.2 SPF (Sender Policy Framework) — Authorized IP Range
* **Type:** `TXT`
* **Host / Name:** `@` (or `purvaja.fashion`)
* **Value:** `v=spf1 include:amazonses.com ~all`
* **TTL:** `3600`
*(Note: If you already have an existing SPF record, append `include:amazonses.com` before `~all` or `-all`).*

### 1.3 DMARC (Domain-based Message Authentication, Reporting, and Conformance)
* **Type:** `TXT`
* **Host / Name:** `_dmarc.purvaja.fashion`
* **Value:** `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@purvaja.fashion`
* **TTL:** `3600`

### 1.4 Inbound / Return-Path MX Record (Optional for Bounce Handling)
* **Type:** `MX`
* **Host / Name:** `bounces.purvaja.fashion`
* **Value:** `feedback-smtp.us-east-1.amazonses.com`
* **Priority:** `10`
* **TTL:** `3600`

---

## 2. Resend Portal Verification Steps

1. Log in to [Resend Console](https://resend.com/domains).
2. Click **Add Domain** -> Enter `purvaja.fashion` -> Region: **us-east-1** (or closest).
3. Copy the exact DKIM and SPF tokens into your Hostinger / Cloudflare DNS Manager.
4. Click **Verify DNS Records**. Once propagated (typically 2–15 minutes), Resend will display a green **Verified** status.
5. Generate an API Key with **Sending Access**:
   - Go to **API Keys** -> **Create API Key** -> Name: `Purvaja Production Mailer`.

---

## 3. Production Environment Variable Configuration

Update `backend/.env` with your verified sender credentials:

```bash
# Enable transactional delivery via Resend
RESEND_API_KEY=re_live_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=Purvaja Fashion Atelier <noreply@purvaja.fashion>
```

---

## 4. Verification Test

Run the backend email delivery integration test:

```bash
pnpm --filter @ecommerce/prototype-b-backend exec tsx -e "
  import { emailService } from './src/services/email.service.js';
  emailService.sendVerificationEmail('test@purvaja.fashion', 'https://purvaja.fashion/verify?token=test-123')
    .then(res => console.log('Email test result:', res))
    .catch(console.error);
"
```
Check inbox and spam folder to confirm SPF and DKIM pass headers.
