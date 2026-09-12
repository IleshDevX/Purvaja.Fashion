import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage.js';
import { renderWithProviders } from '../../test/testUtils.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { GuestRoute } from '../../features/auth/components/GuestRoute.js';
import { AppProviders } from '../../app/providers.js';

describe('LoginPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      status: 'guest',
      isLoading: false,
      isInitializing: false,
      error: null,
    });
  });

  it('renders login form elements and headings', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /Sign In to Your Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create an account/i })).toBeInTheDocument();
  });

  it('displays an error alert when auth store contains an error', () => {
    useAuthStore.setState({ error: 'Invalid email or password.' });

    renderWithProviders(<LoginPage />);

    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('submits credentials through the auth store login action', async () => {
    const mockLogin = vi.fn().mockResolvedValue(true);
    useAuthStore.setState({ login: mockLogin });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'client@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'Secret123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'client@example.com',
        password: 'Secret123!',
        rememberMe: true,
      });
    });
  });

  it('does not redirect an already navigated page when login completes after the auth boundary', async () => {
    let finish!: (value: boolean) => void;
    const completion = new Promise<boolean>(resolve => { finish = resolve; });
    useAuthStore.setState({ login: vi.fn(async () => {
      useAuthStore.setState({ status: 'authenticated', user: { id: 'owner' } as NonNullable<ReturnType<typeof useAuthStore.getState>['user']> });
      return completion;
    }) });
    render(<MemoryRouter initialEntries={['/auth/login']}><AppProviders><Routes>
      <Route path="/auth/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/account" element={<Link to="/cart">Open cart</Link>} />
      <Route path="/cart" element={<h1>Cart destination</h1>} />
    </Routes></AppProviders></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'client@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Secret123!' } });
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }));
    fireEvent.click(await screen.findByRole('link', { name: 'Open cart' }));
    await act(async () => { finish(true); await completion; });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cart destination' })).toBeInTheDocument());
  });
});
