import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';

if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GITHUB_ENV) throw new Error('This bootstrap is restricted to GitHub CI services.');
const bootstrap = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(bootstrap.hostname) || bootstrap.pathname !== '/purvaja_test') throw new Error('Unexpected CI database target.');
const client = new Client({ connectionString: bootstrap.href });
const password = randomBytes(24).toString('hex');
try {
  await client.connect();
  await client.query(`CREATE ROLE purvaja_test_runner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${password}'`);
  await client.query('ALTER DATABASE purvaja_test OWNER TO purvaja_test_runner');
  bootstrap.username = 'purvaja_test_runner';
  bootstrap.password = password;
  appendFileSync(process.env.GITHUB_ENV, ['DATABASE_URL','DIRECT_URL','TEST_DATABASE_URL'].map(key => `${key}=${bootstrap.href}\n`).join(''));
  appendFileSync(process.env.GITHUB_ENV, `INITIAL_ADMIN_PASSWORD=${randomBytes(24).toString('hex')}\n`);
} finally { await client.end(); }
