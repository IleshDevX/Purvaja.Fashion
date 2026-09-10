import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  broadcastAuthBoundary,
  setupCrossTabAuthSync,
  AUTH_SYNC_STORAGE_KEY,
} from '../utils/authSync.js';
import { useAuthStore } from '../store/authStore.js';
import { authService } from '../services/authService.js';

describe('AUD-007: Cross-Tab Auth Boundary Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('broadcastAuthBoundary writes auth state to localStorage', () => {
    broadcastAuthBoundary('user-123', 'authenticated');

    const stored = localStorage.getItem(AUTH_SYNC_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.type).toBe('AUTH_BOUNDARY');
    expect(parsed.userId).toBe('user-123');
    expect(parsed.status).toBe('authenticated');
    expect(typeof parsed.timestamp).toBe('number');
  });

  it('setupCrossTabAuthSync receives boundary changes via storage event', () => {
    const callback = vi.fn();
    const cleanup = setupCrossTabAuthSync(callback);

    const payload = {
      type: 'AUTH_BOUNDARY',
      userId: 'user-456',
      status: 'authenticated',
      timestamp: Date.now(),
    };

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_SYNC_STORAGE_KEY,
        newValue: JSON.stringify(payload),
      }),
    );

    expect(callback).toHaveBeenCalledWith('user-456', 'authenticated');
    cleanup();
  });

  it('setupCrossTabAuthSync ignores unrelated storage events', () => {
    const callback = vi.fn();
    const cleanup = setupCrossTabAuthSync(callback);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'some_other_key',
        newValue: 'test',
      }),
    );

    expect(callback).not.toHaveBeenCalled();
    cleanup();
  });

  it('cross-tab logout event updates user state from authenticated to guest', async () => {
    useAuthStore.setState({
      user: { id: 'usr-1', email: 'test@example.com', firstName: 'A', lastName: 'B', role: 'customer' },
      status: 'authenticated',
    });

    vi.spyOn(authService, 'getCurrentUser').mockRejectedValueOnce(new Error('Unauthenticated'));

    const callback = vi.fn((userId: string | null, status: string) => {
      if (status === 'guest' || userId === null) {
        void useAuthStore.getState().initialize();
      }
    });

    const cleanup = setupCrossTabAuthSync(callback);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_SYNC_STORAGE_KEY,
        newValue: JSON.stringify({
          type: 'AUTH_BOUNDARY',
          userId: null,
          status: 'guest',
          timestamp: Date.now(),
        }),
      }),
    );

    expect(callback).toHaveBeenCalledWith(null, 'guest');
    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe('guest');
      expect(useAuthStore.getState().user).toBeNull();
    });

    cleanup();
  });
});
