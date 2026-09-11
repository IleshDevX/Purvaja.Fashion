/* eslint-disable no-console -- CLI status messages contain no connection secrets. */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { verifyTestDatabase } from '../config/test-database.js';

async function main(): Promise<void> {
  const backend = fileURLToPath(new URL('../../', import.meta.url));
  const settings = dotenv.parse(readFileSync(new URL('../../.env', import.meta.url)));
  const target = settings.TEST_DATABASE_URL ?? '';
  await verifyTestDatabase(target);
  const local = new URL('../../.local/', import.meta.url);
  mkdirSync(local, { recursive: true });
  const credentialsFile = new URL('test-fixtures.env', local);
  if (!existsSync(credentialsFile)) writeFileSync(credentialsFile,
    `INITIAL_ADMIN_EMAIL=isolated-admin@example.invalid\nINITIAL_ADMIN_PASSWORD=${randomBytes(24).toString('hex')}\n`);
  const fixtures = dotenv.parse(readFileSync(credentialsFile));
  const require = createRequire(import.meta.url);
  const mode = process.argv[2];
  const selectedFiles = process.argv.slice(3);
  const selectionPattern = mode === 'e2e' ? /^e2e\/[a-z0-9-]+\.spec\.ts(?::[1-9][0-9]*)?$/ : /^tests\/integration\/[a-z0-9-]+\.test\.ts$/;
  if (selectedFiles.some(file => !selectionPattern.test(file))) {
    throw new Error('Only explicit test files for the selected mode can be selected.');
  }
  const commands: Record<string, string[]> = {
    migrate: [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    seed: [require.resolve('tsx/cli'), 'prisma/seed.ts'],
    // Hosted integration cases include multiple real network round trips. This
    // wall-clock test budget does not change application transaction timeouts.
    integration: [require.resolve('vitest/package.json').replace(/package\.json$/, 'vitest.mjs'), 'run', ...(selectedFiles.length ? selectedFiles : ['tests/integration']), '--testTimeout=30000', '--hookTimeout=60000', '--reporter=default', '--reporter=json', '--outputFile=.local/integration-results.json'],
    e2e: [require.resolve('@playwright/test/cli'), 'test', ...selectedFiles],
  };
  const args = mode ? commands[mode] : undefined;
  if (!args) throw new Error('Choose migrate, seed, integration or e2e.');
  const migrationTarget = new URL(settings.DIRECT_URL ?? '');
  const testTarget = new URL(target);
  if (migrationTarget.host !== testTarget.host || migrationTarget.pathname !== testTarget.pathname) {
    throw new Error('Migration and test endpoints must identify the same configured database.');
  }
  migrationTarget.searchParams.set('schema', testTarget.searchParams.get('schema')!);
  // Hosted poolers may need more than the schema engine's 5-second default
  // when allocating a session; this is bounded and does not retry mutations.
  migrationTarget.searchParams.set('connect_timeout', '30');
  const child = spawn(process.execPath, args, {
    cwd: mode === 'e2e' ? fileURLToPath(new URL('../../../', import.meta.url)) : backend, windowsHide: true, stdio: 'inherit',
    env: { ...process.env, ...fixtures, NODE_ENV: 'test', PAYMENT_PROVIDER: 'demo',
      DATABASE_URL: target, DIRECT_URL: mode === 'migrate' ? migrationTarget.toString() : target, TEST_DATABASE_URL: target },
  });
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Test command failed (${code}).`)));
  });
  if (mode === 'migrate') {
    const schema = testTarget.searchParams.get('schema')!;
    const admin = new Client({ connectionString: settings.DIRECT_URL });
    try {
      await admin.connect();
      // Only objects in the verified test namespace receive fixture privileges.
      // The test role never receives database-level DDL or public table grants.
      await admin.query(`GRANT ALL ON ALL TABLES IN SCHEMA "${schema}" TO "${schema}"`);
      await admin.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${schema}"`);
    } finally { await admin.end(); }
    await verifyTestDatabase(target);
  }
}
main().catch(err => { console.error('Isolated test command failed:', err.message); process.exitCode = 1; });
