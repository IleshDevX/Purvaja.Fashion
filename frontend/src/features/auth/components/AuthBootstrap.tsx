import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { setupCrossTabAuthSync } from '../utils/authSync.js';
import { advanceApiSession } from '../../../services/api/client.js';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    void initialize();

    // Cross-tab session synchronization: immediately sync when another tab logs in, logs out, or switches accounts
    const cleanupSync = setupCrossTabAuthSync((newUserId, newStatus) => {
      const currentUserId = useAuthStore.getState().user?.id ?? null;
      const currentStatus = useAuthStore.getState().status;
      if (newUserId !== currentUserId || (newStatus === 'guest' && currentStatus === 'authenticated')) {
        advanceApiSession();
        void useAuthStore.getState().initialize();
      }
    });

    // Window focus revalidation: when a background tab regains focus, verify session with backend
    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const state = useAuthStore.getState();
        if (state.status === 'authenticated') {
          void state.initialize();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      cleanupSync();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [initialize]);

  return <>{children}</>;
}
