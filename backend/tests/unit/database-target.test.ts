import { describe, expect, it } from 'vitest';
import { validateTestDatabaseUrl } from '../database-target.js';

describe('isolated database target guard', () => {
  const schema = 'purvaja_test_0123456789abcdef';
  it('accepts a remote isolated schema only with its own role and verified TLS', () => {
    const url = `postgresql://${schema}.project:fixture@pooler.example.invalid/postgres?schema=${schema}&sslmode=verify-full`;
    expect(validateTestDatabaseUrl(url).searchParams.get('schema')).toBe(schema);
    for (const unsafe of [url.replace(schema + '.project', 'postgres.project'), url.replace('verify-full', 'require'), url.replace('schema=' + schema, 'schema=public'), url + '&options=unsafe']) {
      expect(() => validateTestDatabaseUrl(unsafe)).toThrow();
    }
  });
  it('accepts an explicit local test database', () => {
    expect(validateTestDatabaseUrl('postgresql://fixture:fixture@127.0.0.1:55439/purvaja_phase1_test?schema=public').hostname).toBe('127.0.0.1');
  });
  it.each([
    'postgresql://fixture:fixture@db.example.invalid/purvaja_test',
    'postgresql://fixture:fixture@127.0.0.1/production',
    'postgresql://fixture:fixture@127.0.0.1/purvaja_test?host=db.example.invalid',
    'postgresql://fixture:fixture@127.0.0.1/purvaja_test?schema=customer',
    'postgresql://127.0.0.1/purvaja_test',
    'not a URL',
  ])('rejects unsafe or ambiguous target %s', value => {
    expect(() => validateTestDatabaseUrl(value)).toThrow();
  });
});
