import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '../../app/providers.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { apiClient } from '../../services/api/client.js';
import { VerifyEmailPage } from './VerifyEmailPage.js';

vi.mock('../../services/api/client.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/api/client.js')>();
  return { ...actual, apiClient: { ...actual.apiClient, post: vi.fn() } };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VerifyEmailPage', () => {
  const initialize = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    useAuthStore.setState({ initialize });
  });

  it('accepts only a six-digit OTP, establishes auth state, and follows a safe redirect', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: { user: { id: 'user-1' } } } });

    render(
      <MemoryRouter initialEntries={['/auth/verify-email?email=meera%40example.com&redirect=%2Faccount']}>
        <AppProviders>
          <Routes>
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/account" element={<p>Verified account</p>} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );

    const code = screen.getByLabelText('Verification Code');
    fireEvent.change(code, { target: { value: '12ab34567' } });
    expect(code).toHaveValue('123456');
    fireEvent.click(screen.getByRole('button', { name: 'VERIFY EMAIL' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
      email: 'meera@example.com',
      otp: '123456',
    }));
    expect(initialize).toHaveBeenCalledOnce();
    expect(await screen.findByText('Verified account')).toBeInTheDocument();
  });

  it('requests a new OTP without exposing whether an account exists', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, data: {} } });
    render(
      <MemoryRouter initialEntries={['/auth/verify-email?email=unknown%40example.com']}>
        <AppProviders><VerifyEmailPage /></AppProviders>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SEND A NEW CODE' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification', { email: 'unknown@example.com' }));
    expect(screen.getByText(/If the account is eligible/i)).toBeInTheDocument();
  });
});
