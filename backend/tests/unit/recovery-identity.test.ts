import { beforeEach, expect, it, vi } from 'vitest';
const clients = vi.hoisted(() => [0,1].map(() => ({connect:vi.fn(),query:vi.fn(),end:vi.fn()})));
vi.mock('pg', () => ({Client: class { private client; constructor(options:{connectionString:string}) { this.client=clients[options.connectionString.includes('source') ? 0 : 1]!; } connect(){return this.client.connect();} query(sql:string){return this.client.query(sql);} end(){return this.client.end();} }}));
import { verifyRecoveryDestination } from '../../src/scripts/postgres-recovery.js';
beforeEach(() => {
  for (const c of clients) { c.connect.mockReset().mockResolvedValue(undefined);c.query.mockReset();c.end.mockReset().mockResolvedValue(undefined); }
  clients[0]!.query.mockResolvedValue({rows:[{cluster:'123',database:'1'}]});
});
it('rejects different hostnames identifying the same database', async () => {
  clients[1]!.query.mockResolvedValueOnce({rows:[{cluster:'123',database:'1'}]});
  await expect(verifyRecoveryDestination('postgres://source','postgres://alias')).rejects.toThrow('alias');
  expect(clients[1]!.query).toHaveBeenCalledOnce();
});
it('rejects a different but populated destination', async () => {
  clients[1]!.query.mockResolvedValueOnce({rows:[{cluster:'456',database:'1'}]})
    .mockResolvedValueOnce({rows:[{count:1}]});
  await expect(verifyRecoveryDestination('postgres://source','postgres://target')).rejects.toThrow('empty destination');
});
it('permits an identified empty separate destination', async () => {
  clients[1]!.query.mockResolvedValueOnce({rows:[{cluster:'123',database:'2'}]})
    .mockResolvedValueOnce({rows:[{count:0}]});
  await expect(verifyRecoveryDestination('postgres://source','postgres://target')).resolves.toBeUndefined();
  expect(clients.every(c=>c.end.mock.calls.length===1)).toBe(true);
});
it('fails closed without exposing connection diagnostics when identity cannot be read', async () => {
  clients[0]!.query.mockRejectedValue(new Error('credential-bearing connection error'));
  await expect(verifyRecoveryDestination('postgres://source','postgres://target')).rejects.toThrow('identity verification failed');
  expect(clients.every(c=>c.end.mock.calls.length===1)).toBe(true);
});
