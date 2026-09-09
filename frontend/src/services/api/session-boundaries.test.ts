import { afterEach, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { advanceApiSession, createApiClient, getCsrfToken, onSessionExpired, setCsrfToken } from './client.js';

afterEach(() => { advanceApiSession(); vi.restoreAllMocks(); });

it('rejects delayed private data and CSRF tokens from the previous session', async () => {
  const client = createApiClient();
  let complete!: (response: AxiosResponse) => void;
  let config!: InternalAxiosRequestConfig;
  client.defaults.adapter = request => { config = request; return new Promise(resolve => { complete = resolve; }); };
  const pending = client.get('/orders');
  const result = expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  await vi.waitFor(() => expect(complete).toBeDefined());
  advanceApiSession();
  setCsrfToken('new-session');
  complete({ config, status: 200, statusText: 'OK', headers: {}, data: { data: { csrfToken: 'old-session', orders: ['private'] } } });
  await result;
  expect(getCsrfToken()).toBe('new-session');
});

it('does not expire the new session when an old request returns 401', async () => {
  const expired = vi.fn();
  onSessionExpired(expired);
  const client = createApiClient();
  let fail!: (error: Error) => void;
  let config!: InternalAxiosRequestConfig;
  client.defaults.adapter = request => { config = request; return new Promise((_resolve, reject) => { fail = reject; }); };
  const pending = client.get('/orders');
  const result = expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  await vi.waitFor(() => expect(fail).toBeDefined());
  advanceApiSession();
  fail(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { config, status: 401, statusText: 'Unauthorized', headers: {}, data: {} }));
  await result;
  expect(expired).not.toHaveBeenCalled();
});
