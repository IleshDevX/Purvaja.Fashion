export function validateTestDatabaseUrl(value: string): URL {
  let target: URL;
  try { target = new URL(value); } catch { throw new Error('TEST_DATABASE_URL is invalid.'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['127.0.0.1', '[::1]', 'localhost'].includes(target.hostname) ||
      !/^purvaja(?:_[a-z0-9]+)*_test$/.test(decodeURIComponent(target.pathname.slice(1))) ||
      !target.username || !target.password) {
    throw new Error('Database tests require an authenticated loopback PostgreSQL database named purvaja_*_test.');
  }
  for (const key of target.searchParams.keys()) {
    if (!['schema', 'sslmode', 'connection_limit', 'pool_timeout'].includes(key)) {
      throw new Error('TEST_DATABASE_URL contains an unsupported connection override.');
    }
  }
  if (target.searchParams.has('schema') && target.searchParams.get('schema') !== 'public') {
    throw new Error('Database tests require a dedicated database, not a shared database schema.');
  }
  return target;
}
