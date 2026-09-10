/* eslint-disable no-console -- CLI status messages contain no connection secrets. */
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { verifyTestDatabase } from '../config/test-database.js';

// Additive provisioning only. Existing schemas, roles and data are never reset.
// Run from backend; connection secrets remain in its ignored .env file.
async function main(): Promise<void> {
  const file = new URL('../../.env', import.meta.url);
  const original = readFileSync(file, 'utf8');
  const settings = dotenv.parse(original);
  if (settings.TEST_DATABASE_URL) {
    await verifyTestDatabase(settings.TEST_DATABASE_URL);
    console.log('Existing isolated test target verified; no provisioning performed.');
    return;
  }
  const source = new URL(settings.DIRECT_URL ?? '');
  if (source.searchParams.get('sslmode') !== 'verify-full') throw new Error('Provisioning requires verified TLS.');
  const role = `purvaja_test_${randomBytes(8).toString('hex')}`;
  const password = randomBytes(32).toString('hex');
  const admin = new Client({ connectionString: source.toString(), connectionTimeoutMillis: 10_000 });
  try {
    await admin.connect();
    await admin.query('BEGIN');
    // Identifiers/password are generated hexadecimal values, never user SQL.
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
    await admin.query(`GRANT "${role}" TO CURRENT_USER`);
    await admin.query(`CREATE SCHEMA "${role}" AUTHORIZATION "${role}"`);
    await admin.query(`ALTER ROLE "${role}" SET search_path TO "${role}"`);
    await admin.query('COMMIT');
  } catch (error) {
    await admin.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { await admin.end(); }
  const target = new URL(source);
  const projectSuffix = decodeURIComponent(source.username).split('.').slice(1).join('.');
  target.username = projectSuffix ? `${role}.${projectSuffix}` : role;
  target.password = password;
  target.searchParams.set('schema', role);
  // Preserve credentials immediately so a transient pooler delay cannot orphan
  // the target. Verification must still pass before migrations/tests can run.
  writeFileSync(file, `${original.trimEnd()}\nTEST_DATABASE_URL=${JSON.stringify(target.toString())}\n`);
  await verifyTestDatabase(target.toString());
  console.log('Isolated test schema and restricted role created and verified. No existing data changed.');
}

main().catch(error => {
  console.error('Test target provisioning failed.', { code: typeof error?.code === 'string' ? error.code : 'TARGET_VALIDATION_FAILED' });
  process.exitCode = 1;
});
