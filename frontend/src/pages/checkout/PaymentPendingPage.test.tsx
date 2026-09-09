import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PaymentPendingPage } from './PaymentPendingPage.js';
import { apiClient } from '../../services/api/client.js';

vi.mock('../../services/api/client.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/api/client.js')>();
  return { ...actual, apiClient: { ...actual.apiClient, get: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PaymentPendingPage', () => {
  it('moves to the success route when the durable payment record is confirmed', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { orderId: 'order-123', paymentStatus: 'SUCCESS' } },
    });

    render(
      <MemoryRouter initialEntries={['/checkout/payment-status?paymentId=payment-123']}>
        <Routes>
          <Route path="/checkout/payment-status" element={<PaymentPendingPage />} />
          <Route path="/checkout/success" element={<p>Confirmed order</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Confirmed order')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/payments/payment-123/status');
  });
});
