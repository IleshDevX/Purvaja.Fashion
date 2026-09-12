import { Client } from 'pg';

export function validateTestDatabaseUrl(value: string): URL {
  let target: URL;
  try { target = new URL(value); } catch { throw new Error('TEST_DATABASE_URL is invalid.'); }
  const schema = target.searchParams.get('schema') ?? 'public';
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(target.hostname);
  const role = decodeURIComponent(target.username).split('.')[0];
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !target.username || !target.password ||
      (local ? !/^purvaja(?:_[a-z0-9]+)*_test$/.test(decodeURIComponent(target.pathname.slice(1))) || schema !== 'public'
        : !/^purvaja_test_[a-f0-9]{16}$/.test(schema) || role !== schema || target.searchParams.get('sslmode') !== 'verify-full')) {
    throw new Error('Tests require a disposable local database or an isolated remote schema with its own restricted role and verified TLS.');
  }
  for (const key of target.searchParams.keys()) {
    if (!['schema', 'sslmode', 'sslrootcert', 'connection_limit', 'pool_timeout'].includes(key)) {
      throw new Error('TEST_DATABASE_URL contains an unsupported connection override.');
    }
  }
  return target;
}

function isLocalOrPrivateAddress(address?: string | null): boolean {
  if (!address) return true;
  if (['127.0.0.1', '::1'].includes(address) || address.startsWith('127.')) return true;
  // RFC 1918 private IPv4 ranges (Docker bridge networks in CI/local, LAN)
  if (/^10\./.test(address)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(address)) return true;
  if (/^192\.168\./.test(address)) return true;
  // RFC 4193 IPv6 unique local addresses
  if (/^[fF][cCdD]/.test(address)) return true;
  return false;
}

export async function verifyTestDatabase(value: string): Promise<void> {
  const target = validateTestDatabaseUrl(value);
  const schema = target.searchParams.get('schema') ?? 'public';
  const client = new Client({ connectionString: value, connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
    const identity = await client.query<{ database: string; role: string; address: string; privileged: boolean }>(
      `SELECT current_database() AS database, current_user AS role, host(inet_server_addr()) AS address,
       (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls) AS privileged FROM pg_roles WHERE rolname = current_user`,
    );
    const row = identity.rows[0];
    if (!row || row.privileged || row.database !== decodeURIComponent(target.pathname.slice(1))) {
      throw new Error('Test database identity or role privileges are unsafe.');
    }
    if (schema === 'public') {
      if (!isLocalOrPrivateAddress(row.address)) throw new Error('Local test target did not resolve to loopback or private network.');
      return;
    }
    if (row.role !== schema) throw new Error('Test role must own only its isolated schema.');
    const unsafe = await client.query<{ unsafe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname <> $1 AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
         AND c.relkind IN ('r','p','v','m','f') AND (
           has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
           OR pg_has_role(current_user,c.relowner,'MEMBER'))
       ) OR EXISTS (
         SELECT 1 FROM pg_namespace n WHERE n.nspname <> $1 AND n.nspname NOT LIKE 'pg_%'
         AND (has_schema_privilege(current_user,n.oid,'CREATE') OR pg_has_role(current_user,n.nspowner,'MEMBER'))
       ) AS unsafe`, [schema],
    );
    if (unsafe.rows[0]?.unsafe !== false) throw new Error('Test role can modify objects outside its isolated schema.');
  } finally { await client.end(); }
}
