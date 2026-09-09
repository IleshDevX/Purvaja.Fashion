import { describe, expect, it } from 'vitest';
import { mapBackendOrderToFrontendOrder } from './orderService.js';
import type { BackendOrderDto } from '../../../services/api/contracts.js';

describe('mapBackendOrderToFrontendOrder', () => {
  it('correctly maps raw backend paise values, addresses, and uppercase statuses to frontend Order shape', () => {
    const rawDto: BackendOrderDto = {
      id: 'order-123',
      orderNumber: 'PF-TEST-001',
      userId: 'user-456',
      shippingAddress: {
        recipientName: 'Aarav Sharma',
        phone: '+91 98765 43210',
        line1: 'Flat 402, Royal Palms',
        line2: 'MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
      },
      subtotalPaise: 499900,
      discountPaise: 50000,
      shippingChargePaise: 19900,
      taxPaise: 0,
      totalPaise: 469800,
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:05:00.000Z',
      availableActions: { canCancel: false, canReturn: false },
      items: [
        {
          id: 'item-1',
          orderId: 'order-123',
          productName: 'Royal Oxford Luxury Shirt',
          sku: 'RO-WHT-40',
          size: '40 (M)',
          colorName: 'Crisp White',
          unitPricePaise: 499900,
          quantity: 1,
          lineTotalPaise: 499900,
          variant: {
            id: 'var-1',
            colorHex: '#FFFFFF',
            product: {
              name: 'Royal Oxford Luxury Shirt',
              slug: 'royal-oxford-luxury-shirt',
              images: [{ url: 'https://cdn.purvaja.com/shirts/oxford-white.jpg' }],
            },
          },
        },
      ],
      payments: [
        {
          id: 'pay-1',
          provider: 'PHONEPE',
          method: 'UPI',
          amountPaise: 469800,
          status: 'SUCCESS',
          createdAt: '2026-03-01T10:02:00.000Z',
          refunds: [{
            id: 'refund-1',
            amountPaise: 125050,
            status: 'REQUESTED',
            mode: 'LIVE',
            reason: 'RETURN',
            requestedAt: '2026-03-02T10:00:00.000Z',
          }],
        },
      ],
    };

    const order = mapBackendOrderToFrontendOrder(rawDto);

    expect(order.id).toBe('order-123');
    expect(order.orderNumber).toBe('PF-TEST-001');
    expect(order.status).toBe('confirmed');
    expect(order.paymentStatus).toBe('paid');
    expect(order.refunds).toEqual([expect.objectContaining({
      id: 'refund-1', amount: 1250.5, status: 'requested', mode: 'live', reason: 'return',
    })]);

    // Rupees conversion
    expect(order.subtotal).toBe(4999);
    expect(order.couponDiscount).toBe(500);
    expect(order.deliveryFee).toBe(199);
    expect(order.grandTotal).toBe(4698);
    expect(order.grandTotalPaise).toBe(469800);
    expect(order.refunds?.[0].amountPaise).toBe(125050);

    // Shipping address mapping
    expect(order.shippingAddress.firstName).toBe('Aarav');
    expect(order.shippingAddress.lastName).toBe('Sharma');
    expect(order.shippingAddress.addressLine1).toBe('Flat 402, Royal Palms');
    expect(order.shippingAddress.city).toBe('Bengaluru');

    // Milestones synthesis
    expect(order.trackingMilestones).toBeDefined();
    expect(order.trackingMilestones.length).toBeGreaterThan(0);
    expect(order.trackingMilestones[0].completed).toBe(true);

    // Item mapping
    expect(order.items).toHaveLength(1);
    expect(order.items[0].name).toBe('Royal Oxford Luxury Shirt');
    expect(order.items[0].slug).toBe('royal-oxford-luxury-shirt');
    expect(order.items[0].unitPrice).toBe(4999);
    expect(order.items[0].lineTotal).toBe(4999);
    expect(order.items[0].color.hex).toBe('#FFFFFF');
  });

  it('handles missing address gracefully with safe defaults', () => {
    const rawDto = {
      id: 'order-empty',
      orderNumber: 'PF-TEST-002',
      userId: 'user-456',
      shippingAddress: {} as unknown as BackendOrderDto['shippingAddress'],
      subtotalPaise: 0,
      discountPaise: 0,
      shippingChargePaise: 0,
      taxPaise: 0,
      totalPaise: 0,
      status: 'CANCELLED',
      paymentStatus: 'FAILED',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      availableActions: { canCancel: false, canReturn: false },
      items: [],
    };

    const order = mapBackendOrderToFrontendOrder(rawDto as unknown as BackendOrderDto);
    expect(order.shippingAddress.firstName).toBe('Customer');
    expect(order.status).toBe('cancelled');
    expect(order.paymentStatus).toBe('failed');
    expect(order.grandTotal).toBe(0);
  });

  it('keeps return requested distinct from returned and refunded payment state', () => {
    const dto: BackendOrderDto = {
      id: 'return-order', orderNumber: 'PF-RETURN', userId: 'user', shippingAddress: {},
      subtotalPaise: 10001, discountPaise: 1, shippingChargePaise: 19900, taxPaise: 0,
      totalPaise: 29900, status: 'RETURN_REQUESTED', paymentStatus: 'REFUNDED',
      createdAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T01:00:00.000Z',
      items: [], availableActions: { canCancel: false, canReturn: false },
    };
    const order = mapBackendOrderToFrontendOrder(dto);
    expect(order.status).toBe('return_requested');
    expect(order.paymentStatus).toBe('refunded');
    expect(order.grandTotalPaise).toBe(29900);
  });

  it('rejects unknown server order states instead of silently presenting them as pending', () => {
    const dto = {
      id: 'bad-order', orderNumber: 'PF-BAD', userId: 'user', shippingAddress: {},
      subtotalPaise: 0, discountPaise: 0, shippingChargePaise: 0, taxPaise: 0,
      totalPaise: 0, status: 'NEW_UNSUPPORTED_STATE', paymentStatus: 'PENDING',
      createdAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T00:00:00.000Z',
      items: [], availableActions: { canCancel: false, canReturn: false },
    } as BackendOrderDto;
    expect(() => mapBackendOrderToFrontendOrder(dto)).toThrow('Unsupported order status');
  });
});
