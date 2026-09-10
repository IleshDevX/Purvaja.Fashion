import { describe, it, expect, vi } from 'vitest';
import { applyPaymentObservation } from '../../src/services/payment-lifecycle.service.js';
import { ConflictError } from '../../src/utils/errors.js';
import type { Prisma } from '@prisma/client';

describe('AUD-001: Payment Authority & Capture Evidence Validation', () => {
  it('applyPaymentObservation strictly rejects SUCCESS observation when amountPaise is undefined', async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      payment: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pay-1',
          amountPaise: 249900,
          status: 'INITIATED',
          orderId: 'order-1',
          order: { id: 'order-1', status: 'PENDING' },
        }),
      },
      paymentObservation: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      applyPaymentObservation(mockTx, 'pay-1', {
        source: 'RECONCILIATION',
        state: 'SUCCESS',
        deduplicationKey: 'reconcile-test-1',
        amountPaise: undefined,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('applyPaymentObservation strictly rejects SUCCESS observation when amountPaise mismatches payment', async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      payment: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pay-1',
          amountPaise: 249900,
          status: 'INITIATED',
          orderId: 'order-1',
          order: { id: 'order-1', status: 'PENDING' },
        }),
      },
      paymentObservation: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as Prisma.TransactionClient;

    await expect(
      applyPaymentObservation(mockTx, 'pay-1', {
        source: 'RECONCILIATION',
        state: 'SUCCESS',
        deduplicationKey: 'reconcile-test-2',
        amountPaise: 100000, // Mismatching amount
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('applyPaymentObservation accepts SUCCESS observation when amountPaise exactly matches', async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      payment: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pay-1',
          amountPaise: 249900,
          status: 'INITIATED',
          orderId: 'order-1',
          order: { id: 'order-1', status: 'PENDING' },
        }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'pay-1', status: 'SUCCESS' }),
        update: vi.fn().mockResolvedValue({ id: 'pay-1', status: 'SUCCESS' }),
      },

      paymentObservation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'obs-1' }),
      },
      paymentInitiation: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        update: vi.fn().mockResolvedValue({ id: 'order-1', status: 'CONFIRMED' }),
      },
      inventoryReservation: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cart: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      orderItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },

    } as unknown as Prisma.TransactionClient;

    const result = await applyPaymentObservation(mockTx, 'pay-1', {
      source: 'RECONCILIATION',
      state: 'SUCCESS',
      deduplicationKey: 'reconcile-test-3',
      amountPaise: 249900, // Exact match
      providerReference: 'TX123456',
    });

    expect(result.disposition).toBe('APPLIED');
    expect(result.changed).toBe(true);
  });
});
