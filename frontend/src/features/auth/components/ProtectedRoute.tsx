import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export interface ProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status, user } = useAuthStore();
  const location = useLocation();

  const isAuthenticated = status === 'authenticated' && user !== null;

  if (!isAuthenticated) {
    const target = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${target}`} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
