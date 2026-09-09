import { describe, expect, it } from 'vitest';
import { paymentDestination } from './paymentNavigation.js';

describe('hosted versus internal payment navigation', () => {
  it('keeps external HTTPS URLs absolute and internal demo routes relative', () => {
    expect(paymentDestination('https://gateway.example/pay/123', 'http://localhost:5174'))
      .toEqual({ external: true, url: 'https://gateway.example/pay/123' });
    expect(paymentDestination('http://localhost:5174/checkout/payment?paymentId=123', 'http://localhost:5174'))
      .toEqual({ external: false, url: '/checkout/payment?paymentId=123' });
    expect(paymentDestination('http://localhost:5174/checkout/payment-status?paymentId=123', 'http://localhost:5174'))
      .toEqual({ external: false, url: '/checkout/payment-status?paymentId=123' });
  });
  it.each(['javascript:alert(1)', 'http://external.example/pay', 'https://user:secret@gateway.example/pay'])('rejects unsafe destination %s', url => {
    expect(() => paymentDestination(url, 'http://localhost:5174')).toThrow();
  });
});
