import { cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage.js';
import { renderWithProviders } from '../../test/testUtils.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';

describe('RegisterPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      status: 'guest',
      isLoading: false,
      error: null,
    });
  });

  it('renders registration form fields and submit button', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /Create an Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /REGISTER ACCOUNT/i })).toBeInTheDocument();
  });

  it('submits registration form with provided input data', async () => {
    const mockRegister = vi.fn().mockResolvedValue(true);
    useAuthStore.setState({ register: mockRegister });

    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Meera' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Patel' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'meera@example.com' } });
    fireEvent.change(screen.getByLabelText(/Phone Number \(Optional\)/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Password123!Aa' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Password123!Aa' } });

    fireEvent.click(screen.getByRole('button', { name: /REGISTER ACCOUNT/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Meera',
        lastName: 'Patel',
        email: 'meera@example.com',
        phone: '9876543210',
        password: 'Password123!Aa',
        confirmPassword: 'Password123!Aa',
      });
    });
  });
});
