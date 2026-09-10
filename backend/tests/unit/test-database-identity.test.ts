import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  vi.resetModules(); // setup imports the guard before this file's pg mock.
  return { connect: vi.fn(), query: vi.fn(), end: vi.fn() };
});
vi.mock('pg', () => ({ Client: class { connect=mocks.connect; query=mocks.query; end=mocks.end; } }));
import { verifyTestDatabase } from '../../src/config/test-database.js';

const role = 'purvaja_test_0123456789abcdef';
const url = `postgresql://${role}.project:do-not-print@pooler.example.invalid/postgres?schema=${role}&sslmode=verify-full`;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.connect.mockResolvedValue(undefined);
  mocks.end.mockResolvedValue(undefined);
});
describe('effective test database isolation', () => {
  it('allows the isolated role only after verifying outside-schema privileges', async () => {
    mocks.query.mockResolvedValueOnce({rows:[{database:'postgres',role,address:'10.0.0.1',privileged:false}]})
      .mockResolvedValueOnce({rows:[{unsafe:false}]});
    await verifyTestDatabase(url);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each([
    {database:'postgres',role,privileged:true},
    {database:'another',role,privileged:false},
    {database:'postgres',role:'postgres',privileged:false},
  ])('rejects unexpected database/role identity', async identity => {
    mocks.query.mockResolvedValueOnce({rows:[identity]});
    await expect(verifyTestDatabase(url)).rejects.toThrow();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it('rejects inherited or public write privileges outside the namespace', async () => {
    mocks.query.mockResolvedValueOnce({rows:[{database:'postgres',role,privileged:false}]})
      .mockResolvedValueOnce({rows:[{unsafe:true}]});
    await expect(verifyTestDatabase(url)).rejects.toThrow('outside its isolated schema');
    expect(mocks.end).toHaveBeenCalledOnce();
  });

  describe('local and containerized database targets (schema=public)', () => {
    const localUrl = 'postgresql://purvaja_test_runner:secret@localhost:5432/purvaja_test?schema=public';

    it.each(['127.0.0.1', '::1', '172.17.0.2', '172.18.0.3', '10.0.0.5', '192.168.1.10', null])(
      'accepts local/private address %s',
      async address => {
        mocks.query.mockResolvedValueOnce({
          rows: [{ database: 'purvaja_test', role: 'purvaja_test_runner', address, privileged: false }],
        });
        await verifyTestDatabase(localUrl);
        expect(mocks.query).toHaveBeenCalledOnce();
        expect(mocks.end).toHaveBeenCalledOnce();
      },
    );

    it('rejects public un-isolated addresses for public schema', async () => {
      mocks.query.mockResolvedValueOnce({
        rows: [{ database: 'purvaja_test', role: 'purvaja_test_runner', address: '3.108.20.1', privileged: false }],
      });
      await expect(verifyTestDatabase(localUrl)).rejects.toThrow('resolve to loopback or private network');
      expect(mocks.end).toHaveBeenCalledOnce();
    });
  });
});
