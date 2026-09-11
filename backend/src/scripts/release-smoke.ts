import { env } from '../config/env.js';

// Read-only probe of the public reverse proxy, SPA fallback, built assets and API.
const origin = new URL(env.FRONTEND_URL).origin;
async function read(path: string, contentType: string): Promise<string> {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.headers.get('content-type')?.includes(contentType)) {
    throw new Error(`Release smoke failed for ${path}: HTTP ${response.status}`);
  }
  return response.text();
}
await read('/readyz', 'application/json');
const html = await read('/shop', 'text/html');
const script = html.match(/<script[^>]+src="([^"]+)"/);
if (!script) throw new Error('Storefront build does not contain its entry script.');
await read(script[1]!, 'javascript');
const catalogue = JSON.parse(await read('/api/v1/products?limit=1', 'application/json')) as { success?: boolean };
if (catalogue.success !== true) throw new Error('Catalogue API contract failed.');
