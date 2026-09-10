/**
 * Cross-tab session boundary synchronization.
 * Propagates login, logout, and account-switch events across browser tabs
 * to prevent session desynchronization and stale private state.
 */

export const AUTH_SYNC_CHANNEL_NAME = 'purvaja_auth_channel';
export const AUTH_SYNC_STORAGE_KEY = 'purvaja_auth_boundary_v1';

export interface AuthSyncPayload {
  type: 'AUTH_BOUNDARY';
  userId: string | null;
  status: string;
  timestamp: number;
}

let lastBroadcast: { userId: string | null; status: string } | null = null;

export function broadcastAuthBoundary(userId: string | null, status: string): void {
  if (typeof window === 'undefined') return;

  if (lastBroadcast && lastBroadcast.userId === userId && lastBroadcast.status === status) {
    return;
  }
  lastBroadcast = { userId, status };

  const payload: AuthSyncPayload = {
    type: 'AUTH_BOUNDARY',
    userId,
    status,
    timestamp: Date.now(),
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // BroadcastChannel may be restricted or unsupported; fallback to localStorage
  }

  try {
    localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // LocalStorage may be blocked or restricted
  }
}

export function setupCrossTabAuthSync(
  onBoundaryChange: (userId: string | null, status: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let channel: BroadcastChannel | null = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data as Partial<AuthSyncPayload> | null;
        if (data && data.type === 'AUTH_BOUNDARY' && typeof data.status === 'string') {
          lastBroadcast = { userId: data.userId ?? null, status: data.status };
          onBoundaryChange(data.userId ?? null, data.status);
        }
      };
    }
  } catch {
    channel = null;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue) as Partial<AuthSyncPayload>;
      if (data && data.type === 'AUTH_BOUNDARY' && typeof data.status === 'string') {
        lastBroadcast = { userId: data.userId ?? null, status: data.status };
        onBoundaryChange(data.userId ?? null, data.status);
      }
    } catch {
      // Ignore malformed storage payloads
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore close errors
      }
    }
    window.removeEventListener('storage', handleStorage);
  };
}
