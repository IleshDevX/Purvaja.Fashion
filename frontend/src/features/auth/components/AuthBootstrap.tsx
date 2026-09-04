import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return <>{children}</>;
}
