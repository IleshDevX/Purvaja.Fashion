# Remediation execution ledger

Scope: approved root-cause remediation, demo default and PhonePe OAuth sandbox adapter only. Live money is prohibited. Existing Supabase development data must be preserved. No database resets, schema drops or broad deletion of existing data are authorized.

## Phase 0 — baseline and isolated verification (complete)

Files changed:

- `.gitignore`: exclude backend `.local` certificates and generated fixture credentials.
- `backend/src/config/test-database.ts`, `backend/tests/database-target.ts`, `backend/tests/setup.ts`: explicit target validation, remote schema/role isolation and effective privilege checks; unit tests cannot inherit dotenv database access.
- `backend/src/config/database.ts`: explicit Prisma schema and matching raw SQL search path, bounded connection pool, test-server identity verification.
- `backend/src/scripts/prepare-test-schema.ts`: additive isolated schema/role provisioning; no reset or teardown.
- `backend/src/scripts/run-isolated-tests.ts`: guarded migration/seed/database/browser commands using separate migration and test roles.
- Existing user-added checkout hydration regression: corrected fixture TypeScript fields only; retained failing behavioral assertion.
- Ignored backend `.env`: verified-TLS connection configuration and separate restricted `TEST_DATABASE_URL`; no credentials in this ledger.

Database changes: created a new test schema and restricted login role inside the existing Supabase project. Applied all 17 existing migrations in that schema, then confirmed no pending migrations. Seeded 50 fixture products, 300 variants and one generated test administrator there. No new application migration authored, no public data seeded/reset/deleted. The first zero-step failed migration was marked rolled back only after verifying it created no application tables; migration execution then used the migration role. Test credentials cannot modify public tables.

Verification so far:

- Supabase TLS handshake: certificate and hostname verified with the provider CA; no `rejectUnauthorized:false` workaround.
- Target role effective-privilege checks: passed.
- Backend unit baseline: 46 passed, 2 conditional Redis tests skipped because no Redis endpoint configured yet. These remain outstanding for final acceptance, not waived.
- Frontend baseline: 84 passed, 1 failed (existing hydration regression/AUD-003). It remains a required Phase 2 fix.
- Typecheck after fixture type correction: both packages passed.
- Backend lint: no errors; script console warnings to clean before closing Phase 0.
- Full database regression: running; results pending.

Manual steps: no password sharing is needed. Leave generated `.local` assets and `.env` untracked. Optional future PhonePe sandbox execution still needs valid OAuth and webhook test credentials. No PhonePe network calls or live mode enabled.

The later phases remain Planned. A baseline failure records an existing bug; it must not be skipped or labeled fixed. Final acceptance will rerun the complete suite after remediation.

Phase 0 final evidence: all 25 database test files executed (186/193 initially passed; six wall-clock timeouts and one rolled-back migration history assertion). Reran all four affected files with an explicit remote test budget: 36/36 passed. Backend units 51 passed, two Redis-conditional tests outstanding. Typecheck, both builds and backend lint passed. Frontend hydration regression remains an intentional recorded failure for Phase 2. No application payment/UI changes made in Phase 0. Machine-readable focused rerun results are in ignored backend/.local/integration-results.json.

## Phase 1 — restore safety, telemetry and dependencies (in progress)

AUD-010, AUD-009, AUD-022. No restore will be executed against the shared Supabase database. Recovery checks will require an empty separate destination and verify database identity before launching native tools; restore will no longer drop existing objects.
