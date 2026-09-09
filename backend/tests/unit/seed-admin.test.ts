import { expect, it } from 'vitest';
import { getSeedAdminCredentials } from '../../src/config/seed-admin.js';

it('rejects absent or weak privileged seed credentials without leaking them', () => {
  expect(() => getSeedAdminCredentials({})).toThrow('explicit INITIAL_ADMIN_EMAIL');
  expect(() => getSeedAdminCredentials({ INITIAL_ADMIN_EMAIL: 'admin@example.invalid', INITIAL_ADMIN_PASSWORD: 'secret' })).toThrow('at least 16');
});
it('accepts only explicit credentials and normalizes email', () => {
  expect(getSeedAdminCredentials({ INITIAL_ADMIN_EMAIL: 'Admin@Example.invalid', INITIAL_ADMIN_PASSWORD: 'test-only-long-password' }).email).toBe('admin@example.invalid');
});
