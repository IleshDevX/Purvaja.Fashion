# Remediation verification — 11 September 2026

Scope: complete the in-progress repository remediation against the supplied verification report, preserving existing changes. Production approval remains separate from repository acceptance.

## Root causes and implementation

| Finding | Responsible correction | Acceptance boundary |
|---|---|---|
| AUD-002 / AUD-004 | One PhonePe Standard Checkout OAuth adapter; raw JSON, O-Bearer, v2 payment/status/refund endpoints, required credentials, cached/coalesced token requests. Refund results retain their state and exact amount; pending outcomes reconcile by merchant refund ID without repeating the money-movement request. Provider mode must match the durable refund ledger. | Mocked contract and database evidence; provider-backed sandbox verification still requires credentials. |
| AUD-007 | Cross-tab boundaries identify their originating document and ignore self notifications; session fencing protects private state. GuestRoute exclusively owns post-authentication redirects, preventing an old form continuation from redirecting a subsequently navigated page. | Browser ownership and parallel-login tests, deferred-login navigation regression. |
| AUD-010 | Existing identity/empty-target restore safeguards retained. | Physical restore/RPO/RTO requires a separate recovery database and PostgreSQL utilities; not certified. |
| AUD-011 | Coupon identity and terms are stored separately from calculated discount. Preview derives discount, minimum eligibility, caps and shipping from current cart inputs. | Pricing regression tests; backend checkout remains authoritative. |
| AUD-015 | Guest add commands require inventory; missing stock and invalid quantities are rejected. Migration preserves only valid guest snapshots and their durable merge ID, preventing duplicate cross-tab contributions. | Store regression and browser merge tests. |
| AUD-019 | Featured prices/materials come from catalogue products. Shipping/return values are shared between checkout enforcement and customer copy through a validated release-controlled policy package. Unsupported doorstep exchange and delivery guarantees are not promised. | Shared policy and pricing tests; no CMS/operational claims are fabricated. |
| AUD-020 | Database delivery facts are immutable; both return commands and response availability use the same delivery-based eligibility rule. A corrective migration clears the previous inferred updated-at backfill. Unknown historical dates remain unknown and cannot reopen eligibility. | Integration test changes updatedAt without extending eligibility and rejects deliveredAt mutation. |
| AUD-022 | Both workspaces pin Vitest/coverage 4.1.11; frontend setup uses an absolute setup-file path. | Separate frozen-lockfile clean install passes 91 frontend tests. |
| AUD-023 | Active environment-bound workflow, complete workspace bundle, external configuration links, persistent uploads, same-origin SPA/API serving, public release smoke, application rollback on probe failure. | YAML/build/local routing checks; staging deployment not certified. |
| AUD-026 | Unused SESSION_SECRET removed from application/configuration/docs. | Repository search and configuration tests. |
| Browser admin | Variant listing respects product scope; the selected product remains an option while search results load or exclude it. Previously native required-select validation could block Save before the asynchronous list arrived. Image-add UI exposes the accessible publication contract. | Selected-option validity regression and publication flow across engines. |
| Browser history | URL is the catalogue state authority. Firefox protocol reload was independently shown to append a history entry on bare HTML and can wait indefinitely for external resources; native location.reload preserves history and waits only for the application document. Acceptance uses the same helper wherever reload semantics are under test and asserts history length, Back, Forward, and rendered private state. | Final Chromium, Firefox, and WebKit acceptance passed. |
| Performance evidence | The HTTP catalogue workload is independent of browser rendering. It now runs once, before UI work, in a dedicated API project; browser projects measure only their own Web Vitals. This prevents prior screenshot/navigation load from contaminating an otherwise identical server benchmark. | 60/60 correct responses; local isolated p95 941.02 ms against the unchanged 2,000 ms gate. |

## Evidence

- Clean install: pnpm 11.22.0, frozen lockfile, independently installed node_modules, Vitest 4.1.11, final source 22 frontend files / 93 tests passed.
- Dependency audit: zero reported advisories.
- Type checking, lint, backend/frontend production builds, workflow YAML parsing and diff whitespace checks passed during remediation.
- Local backend returned 200 with correct content types for `/shop`, `/api/v1/products?limit=1`, and `/readyz`.
- First database run: 193 passed / 1 failed; the added eligibility assertion reproduced the response-layer use of updatedAt. After correction, focused delivery/refund integration: 11 passed.
- First complete browser run: 29 passed / 1 failed (Firefox automation-protocol reload). All three admin publication workflows and auth ownership scenarios passed.
- Complete integration rerun: 195 passed across 25 files. Backend unit suite: 76 passed / 2 skipped; subsequent HTTP security suite: 6 passed.
- Diagnostic browser run: 24 passed / 6 failed. Traces exposed the variant option and duplicate auth redirect races, aggregate viewport screenshot timeout, protocol reload waiting on external resources, and a contaminated browser-repeated API sample. These causes were corrected without relaxing assertions or thresholds.
- Final browser acceptance: 46/46 passed in 11.4 minutes. It covers one isolated API workload plus Chromium, Firefox, and WebKit auth ownership, parallel guest-cart merge, admin publication, reload/history, responsive routes at seven widths, accessibility/error states, and Web Vitals.
- Final browser performance sample: 60/60 correct responses, zero errors, 22.47 requests/second, p50 317.32 ms, p95 941.02 ms, max 947.38 ms. Browser Web Vitals also passed; these remain isolated-local measurements rather than production capacity evidence.

Raw local evidence is under ignored `backend/.local/remediation-*.log`, `clean-install.log`, and `clean-frontend-tests.log`. Test data uses the restricted development/test schema; no public-schema reset or real-money payment was performed.

## External gates still required

1. Official PhonePe sandbox authorization, payment completion/status, webhook, and refund completion against verified credentials.
2. Protected staging deployment followed by its public smoke gate.
3. Backup restored into a separate empty recovery database, with consistency and measured RPO/RTO evidence.

Demo remains the development/test payment mode. No production deployment or live payment approval is implied by local tests. See [release environments](release-environments.md).

## Primary references

- [PhonePe Standard Checkout request contracts](https://www.postman.com/phonepe-pg-integrations-online/phonepe-pg-phonepe-standard-checkout-online/documentation/p7im9w7/1-standard-checkout-apis)
- [PhonePe official SDK status/refund interface](https://pkg.go.dev/github.com/PhonePe/phonepe-pg-sdk-go/payments/v2/standardcheckout)
- [Playwright Firefox reload history issue](https://github.com/microsoft/playwright/issues/22640); local minimal reproduction independently compared protocol reload, location.reload, and history.go(0).
