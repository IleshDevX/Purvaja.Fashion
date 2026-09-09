import { Client } from 'pg';
import { validateTestDatabaseUrl } from './database-target.js';

// Backend test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

// Never inherit the application's shared database through dotenv. Integration
// tests must explicitly name a disposable database; unit tests cannot connect.
const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
  const parsed = validateTestDatabaseUrl(testUrl);
  const client = new Client({ connectionString: testUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const identity = await client.query<{ database: string; address: string; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean }>(
      `SELECT current_database() AS database, host(inet_server_addr()) AS address, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user`,
    );
    const row = identity.rows[0];
    if (!row || row.database !== decodeURIComponent(parsed.pathname.slice(1)) ||
        !['127.0.0.1', '::1'].includes(row.address) || row.rolsuper || row.rolcreatedb || row.rolcreaterole) {
      throw new Error('Database tests require a verified local database and an unprivileged test role.');
    }
  } finally {
    await client.end();
  }
}
process.env.DATABASE_URL = testUrl ?? 'postgresql://unavailable:unavailable@127.0.0.1:1/unconfigured_test';
process.env.DIRECT_URL = process.env.DATABASE_URL;
