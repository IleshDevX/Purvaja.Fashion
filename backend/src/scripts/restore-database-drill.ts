import { createHash } from 'node:crypto';
import 'dotenv/config';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertRecoveryTarget, runPostgresTool, verifyRecoveryDestination } from './postgres-recovery.js';

interface BackupManifest {
  schemaVersion: number;
  createdAt: string;
  artifact: string;
  sha256: string;
}

export async function runRestoreDrill(rawEnv: NodeJS.ProcessEnv = process.env): Promise<string> {
  const sourceUrl = rawEnv.DIRECT_URL || rawEnv.DATABASE_URL;
  const recoveryUrl = rawEnv.RECOVERY_DATABASE_URL;
  const manifestFile = rawEnv.BACKUP_MANIFEST_FILE;
  if (!sourceUrl || !recoveryUrl || !manifestFile) {
    throw new Error('DATABASE_URL, RECOVERY_DATABASE_URL, and BACKUP_MANIFEST_FILE are required.');
  }

  const recovery = assertRecoveryTarget(
    sourceUrl,
    recoveryUrl,
    rawEnv.RECOVERY_TARGET_ENV,
    rawEnv.RECOVERY_CONFIRM_REPLACE,
  );
  const manifestPath = path.resolve(manifestFile);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as BackupManifest;
  if (manifest.schemaVersion !== 1 || !manifest.artifact || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) {
    throw new Error('Backup manifest is invalid or unsupported.');
  }
  if (path.basename(manifest.artifact) !== manifest.artifact) {
    throw new Error('Backup manifest artifact must be a file in the manifest directory.');
  }
  const backupPath = path.resolve(path.dirname(manifestPath), manifest.artifact);
  const bytes = await readFile(backupPath);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (checksum !== manifest.sha256) throw new Error('Backup checksum does not match its manifest.');

  const startedAt = new Date();
  await verifyRecoveryDestination(sourceUrl, recoveryUrl);
  await runPostgresTool(rawEnv.PG_RESTORE_BIN || 'pg_restore', [
    '--single-transaction',
    '--exit-on-error',
    '--no-owner',
    '--no-privileges',
    '--dbname', recovery.database,
    backupPath,
  ], recovery.clientEnvironment);

  const verificationEnvironment = {
    DATABASE_URL: recoveryUrl,
    DIRECT_URL: recoveryUrl,
    NODE_ENV: 'test',
    TEST_DATABASE_URL: recoveryUrl,
  };
  await runPostgresTool(rawEnv.PNPM_BIN || 'pnpm', [
    '--filter', '@ecommerce/prototype-b-backend', 'exec', 'prisma', 'migrate', 'status',
  ], {}, verificationEnvironment);
  await runPostgresTool(process.execPath, [
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'check-data-consistency.js'),
  ], {}, verificationEnvironment);

  const completedAt = new Date();
  const backupStats = await stat(backupPath);
  const reportPath = path.resolve(rawEnv.RECOVERY_REPORT_FILE || `${manifestPath}.restore-report.json`);
  await writeFile(reportPath, `${JSON.stringify({
    schemaVersion: 1,
    status: 'PASS',
    recoveryDatabaseIdentity: recovery.identity,
    backupManifest: path.basename(manifestPath),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    measuredRtoSeconds: Math.ceil((completedAt.getTime() - startedAt.getTime()) / 1000),
    measuredBackupAgeSeconds: Math.max(0, Math.ceil((startedAt.getTime() - backupStats.mtimeMs) / 1000)),
    validations: ['backup_sha256', 'database_identity', 'empty_destination', 'pg_restore', 'prisma_migration_status', 'data_consistency'],
  }, null, 2)}\n`, { flag: 'wx' });
  return reportPath;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runRestoreDrill()
    // eslint-disable-next-line no-console
    .then(report => console.log(`Restore drill passed: ${report}`))
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
