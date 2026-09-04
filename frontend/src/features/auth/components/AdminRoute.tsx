import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { PageLoadingFallback } from '../../../components/common/PageLoadingFallback.js';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { status, user, isInitializing } = useAuthStore();
  const location = useLocation();

  if (isInitializing || status === 'loading') return <PageLoadingFallback />;

  if (status !== 'authenticated' || !user) {
    const target = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${target}`} replace />;
  }

  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  return <>{children}</>;
}
