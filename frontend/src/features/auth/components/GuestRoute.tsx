import { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { sanitizeInternalRedirect } from '../utils/redirect.js';

export interface GuestRouteProps {
  children?: ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { status, user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const isAuthenticated = status === 'authenticated' && user !== null;

  if (isAuthenticated) {
    const rawRedirect = searchParams.get('redirect');
    const safeRedirect = sanitizeInternalRedirect(rawRedirect);
    return <Navigate to={safeRedirect} replace />;
  }

  return <>{children}</>;
}
