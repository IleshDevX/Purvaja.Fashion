import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePostgresTarget, runPostgresTool } from './postgres-recovery.js';

export async function createDatabaseBackup(rawEnv: NodeJS.ProcessEnv = process.env): Promise<string> {
  const databaseUrl = rawEnv.DIRECT_URL || rawEnv.DATABASE_URL;
  if (!databaseUrl) throw new Error('DIRECT_URL or DATABASE_URL is required.');
  const backupDirectory = path.resolve(rawEnv.BACKUP_DIRECTORY || 'backups');
  const target = parsePostgresTarget(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const releaseId = (rawEnv.RELEASE_ID || 'manual').replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalPath = path.join(backupDirectory, `purvaja-${releaseId}-${timestamp}.dump`);
  const temporaryPath = `${finalPath}.partial`;
  const manifestPath = `${finalPath}.json`;

  await mkdir(backupDirectory, { recursive: true });
  await rm(temporaryPath, { force: true });
  try {
    await runPostgresTool(rawEnv.PG_DUMP_BIN || 'pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--file', temporaryPath,
    ], target.clientEnvironment);
    await runPostgresTool(rawEnv.PG_RESTORE_BIN || 'pg_restore', ['--list', temporaryPath], target.clientEnvironment);

    const bytes = await readFile(temporaryPath);
    const checksum = createHash('sha256').update(bytes).digest('hex');
    await rename(temporaryPath, finalPath);
    const details = await stat(finalPath);
    await writeFile(manifestPath, `${JSON.stringify({
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      releaseId,
      databaseIdentity: target.identity,
      artifact: path.basename(finalPath),
      bytes: details.size,
      sha256: checksum,
    }, null, 2)}\n`, { flag: 'wx' });
    return manifestPath;
  } catch (error) {
    await rm(temporaryPath, { force: true });
    await rm(finalPath, { force: true });
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  createDatabaseBackup()
    // eslint-disable-next-line no-console
    .then(manifest => console.log(`Backup created and verified: ${manifest}`))
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
