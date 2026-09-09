# Phase 7 customer and admin workflow verification

Date: 9 September 2026. Scope is Phase 7 only. Real payments, provider email delivery, live carrier tracking, hosted staging, and later phases are outside this verification.

## Root causes and implemented controls

| Root cause | Architectural correction | Acceptance evidence |
|---|---|---|
| Catalog filters and pagination lived in component memory. Shared links, reload, and browser navigation lost state. | A single validated URL-state codec now owns search, category, allowlisted filters, route defaults, sort, and page. Invalid input is discarded before API queries. | Codec round-trip/invalid-input tests and Chromium reload/back/forward journey. |
| Admin product creation exposed only basic fields, silently omitted empty category arrays, and had no variant authoring workflow. | The controlled product editor owns attributes, flags, category replacement, ordered images, and publication status across awaits. Empty arrays remain explicit replacement intent. Variant create/edit is available through the authenticated admin API and UI. | Authenticated API lifecycle test plus Chromium create/variant/publish/storefront/archive journey. |
| A status toggle could publish incomplete products. | The service enforces publishability in the transaction: active category, primary image, active variant, and required merchandising attributes. The same invariant applies to creates and updates. | Negative publication test and successful lifecycle test. |
| Phone and fit preferences were display defaults rather than stored customer data. | Nullable profile fields are stored in PostgreSQL, validated at the API boundary, returned by the safe user serializer, and edited through the authenticated profile endpoint. | Fresh-session persistence integration test. |
| Newsletter submission displayed success after a timer without recording consent. | A normalized unique consent record is durably upserted. The API returns `PENDING_PROVIDER` and `deliveryEnabled: false` until a provider exists, and the UI retains the address after errors. | Duplicate database test and frontend success/error tests. |
| Tracking UI synthesized carrier, tracking number, ETA, location, support number, and service promises. | The page shows recorded order states and renders carrier fields only when supplied. Derived milestones use recorded timestamps only where their meaning is supported. | Order mapping tests and the production build. |

## Provider decisions

- **Images:** Phase 7 stores validated HTTPS or site-relative asset references. Binary upload/storage is deferred because no production media store or CDN was supplied. Publication requires one primary reference.
- **Newsletter:** Consent persistence is implemented. Delivery is deferred and represented as `PENDING_PROVIDER`; no message is claimed or queued to a nonexistent provider.
- **Shipping:** The timeline uses authoritative order state. Carrier scans, identifiers, and ETA appear only when future provider data supplies them.

## Verification contract

The isolated runner must replay all migrations into a new loopback PostgreSQL database owned by a restricted test role, report zero Prisma schema drift, seed, typecheck, lint, build, run backend and frontend suites, and execute Chromium. The Phase 7 suite verifies profile session persistence, idempotent newsletter consent, rejected incomplete publication, successful publication, public visibility, and explicit category/image clearing.

## Remaining production evidence

Phase 7 is locally complete on the recorded snapshot. Hosted staging remains required to repeat the flows against deployed infrastructure and any later media, newsletter, or carrier provider. Phase 7 does not change the overall 43/100 NO-GO release decision by itself.

## Recorded result

Evidence directory: `C:\Users\ilesh\.codex\visualizations\2026\09\06\01a07702-324d-7621-ba86-b89066893a09\phase1\run-1788892154763`.

- Frozen install, schema validation, client generation, repeatable migration deploy, seed, lint, typecheck, backend/frontend builds, and compiled artifact smoke: passed.
- Migrations: 17 applied; repeat deploy passed; Prisma schema drift: zero.
- Backend: 232 passed, 0 failed, 2 intentional live-integration skips.
- Frontend: 82 passed, 0 failed.
- Chromium: 4 passed, including admin create/variant/publish/storefront/archive and catalog reload/history state.
