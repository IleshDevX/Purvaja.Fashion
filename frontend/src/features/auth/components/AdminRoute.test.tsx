import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { AdminRoute } from './AdminRoute.js';

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminRoute><p>Admin workspace</p></AdminRoute>} />
        <Route path="/account" element={<p>Customer account</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminRoute', () => {
  afterEach(cleanup);
  beforeEach(() => useAuthStore.setState({ user: null, status: 'guest', isInitializing: false }));

  it('waits for session restoration before deciding access', () => {
    useAuthStore.setState({ status: 'loading', isInitializing: true, user: null });

    renderRoute();

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('rejects an authenticated non-admin user', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'customer-1', firstName: 'Ava', lastName: 'Customer', email: 'ava@example.com', role: 'customer' },
    });

    renderRoute();

    expect(screen.getByText('Customer account')).toBeInTheDocument();
    expect(screen.queryByText('Admin workspace')).not.toBeInTheDocument();
  });

  it('allows a server-designated admin user', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'admin-1', firstName: 'Ava', lastName: 'Admin', email: 'ava@example.com', role: 'admin' },
    });

    renderRoute();

    expect(screen.getByText('Admin workspace')).toBeInTheDocument();
  });
});
