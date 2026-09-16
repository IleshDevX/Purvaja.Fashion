import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { verifyShippingWebhook } from '../../src/services/shipping-webhook.service.js';

const secret = 'shipping-webhook-unit-test-secret-32-characters';
const provider = 'test-carrier';
const now = Date.parse('2026-09-15T12:00:00.000Z');
const timestamp = String(Math.floor(now / 1000));
const body = Buffer.from('{"trackingNumber":"TRACK-1","status":"IN_TRANSIT"}');

function request(overrides: Record<string, string | undefined> = {}): Request {
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  const headers: Record<string, string | undefined> = {
    'x-shipping-signature': `sha256=${signature}`,
    'x-shipping-timestamp': timestamp,
    'x-shipping-event-id': 'event-1',
    'x-shipping-provider': provider,
    ...overrides,
  };
  return {
    rawBody: body,
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

describe('shipping webhook verification', () => {
  it('accepts a valid signature over the exact raw body', () => {
    expect(verifyShippingWebhook(request(), { secret, provider, now })).toMatchObject({
      provider,
      eventId: 'event-1',
      rawBody: body,
    });
  });

  it('rejects a missing signature', () => {
    expect(() => verifyShippingWebhook(request({ 'x-shipping-signature': undefined }), { secret, provider, now }))
      .toThrowError(expect.objectContaining({ statusCode: 401, code: 'SHIPPING_WEBHOOK_UNAUTHORIZED' }));
  });

  it('rejects an invalid signature', () => {
    expect(() => verifyShippingWebhook(request({ 'x-shipping-signature': `sha256=${'00'.repeat(32)}` }), { secret, provider, now }))
      .toThrowError(expect.objectContaining({ statusCode: 401, code: 'SHIPPING_WEBHOOK_UNAUTHORIZED' }));
  });

  it('rejects expired events', () => {
    expect(() => verifyShippingWebhook(request(), { secret, provider, now: now + 6 * 60 * 1000 }))
      .toThrowError(expect.objectContaining({ statusCode: 401, code: 'SHIPPING_WEBHOOK_EXPIRED' }));
  });

  it('rejects an unexpected provider identity', () => {
    expect(() => verifyShippingWebhook(request(), { secret, provider: 'different-carrier', now }))
      .toThrowError(expect.objectContaining({ statusCode: 401, code: 'SHIPPING_WEBHOOK_UNAUTHORIZED' }));
  });
});
