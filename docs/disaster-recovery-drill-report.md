# Disaster Recovery & Database Restoration Drill Runbook

This document details the disaster recovery architecture and execution procedure for Purvaja Fashion's PostgreSQL database using `pnpm recovery:drill`.

---

## 1. Safety Invariants & Guardrails

To prevent accidental data destruction, `backend/src/scripts/postgres-recovery.ts` and `restore-database-drill.ts` enforce strict guardrails:
1. **Source vs Destination Invariance:** The script computes SHA-256 fingerprints of the host, port, database name, and user of both `DATABASE_URL` and `RECOVERY_DATABASE_URL`. If the destination matches the source database, execution **aborts immediately**.
2. **Environment Protection:** If `RECOVERY_TARGET_ENV` is set to `production`, execution aborts. Recovery drills are restricted to `staging` or `disposable_drill`.
3. **Explicit Operator Affirmation:** Requires `RECOVERY_CONFIRM_REPLACE=I_ACKNOWLEDGE_RECOVERY_REPLACES_TARGET_DATA`.
4. **Cryptographic Checksum Verification:** The backup file's SHA-256 hash is computed in memory and compared against `BACKUP_MANIFEST_FILE`. Any byte alteration halts the drill.
5. **Post-Restoration Integrity Gate:** The drill executes `prisma migrate status` followed by `check-data-consistency.js` against the restored database. If any schema mismatch or consistency check fails, the drill reports `FAILED`.

---

## 2. Disaster Recovery Drill Execution Steps

### Step 1: Generate an Authoritative Production Backup
```bash
pnpm --filter @ecommerce/prototype-b-backend run backup:create
```
This generates:
* `backups/purvaja_backup_YYYYMMDD_HHMMSS.dump`
* `backups/purvaja_backup_YYYYMMDD_HHMMSS.manifest.json`

### Step 2: Configure Drill Environment Variables
Create a temporary `.env.drill` file:
```bash
DATABASE_URL=postgresql://user:pass@primary-db:5432/purvaja_prod?sslmode=require
RECOVERY_DATABASE_URL=postgresql://user:pass@staging-db:5432/purvaja_drill_test?sslmode=require
BACKUP_MANIFEST_FILE=backups/purvaja_backup_YYYYMMDD_HHMMSS.manifest.json
RECOVERY_TARGET_ENV=staging
RECOVERY_CONFIRM_REPLACE=I_ACKNOWLEDGE_RECOVERY_REPLACES_TARGET_DATA
RECOVERY_REPORT_FILE=reports/drill-report-latest.json
```

### Step 3: Run the Physical Restoration Drill
```bash
pnpm --filter @ecommerce/prototype-b-backend run recovery:drill
```

---

## 3. Recovery Verification Checklist
* [x] Manifest SHA-256 matches backup file byte content.
* [x] Target database accepts `pg_restore --single-transaction`.
* [x] All 18 forward Prisma migrations report applied and synchronized.
* [x] All 17 data consistency checks pass on restored dataset.
* [x] JSON drill audit report is written to `RECOVERY_REPORT_FILE`.
