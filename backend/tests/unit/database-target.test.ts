import { describe, expect, it } from 'vitest';
import { validateTestDatabaseUrl } from '../database-target.js';

describe('isolated database target guard', () => {
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
