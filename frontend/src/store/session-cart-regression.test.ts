import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore, type CartItem } from './cartStore.js';
import { useAuthStore } from '../features/auth/store/authStore.js';
import { useCheckoutStore } from '../features/checkout/store/checkoutStore.js';
import { cartService } from '../services/api/cartService.js';
import { authService } from '../features/auth/services/authService.js';
import { useWishlistStore } from './wishlistStore.js';

const user = { id: 'owner-a', email: 'a@example.invalid', firstName: 'A', lastName: 'User', role: 'customer' as const };
const item: CartItem = { id: 'item-a', shirtId: 'p', variantId: 'v', name: 'Shirt', slug: 'shirt', image: '', pricePaise: 10049, price: 100.49, color: { name: 'Blue', hex: '#0000ff' }, size: '40 (M)', quantity: 1 };

beforeEach(() => {
  useAuthStore.setState({ user: null, status: 'guest', isLoading: false });
  useCartStore.setState({ items: [], ownerId: null, guestMergeId: null, isSyncing: false });
  vi.spyOn(cartService, 'getCart').mockResolvedValue([item]);
});
afterEach(() => { useAuthStore.setState({ user: null, status: 'guest' }); vi.restoreAllMocks(); });

describe('cart ownership and retry boundaries', () => {
  it('rejects a delayed profile update after A logs out and B logs in', async () => {
    useAuthStore.setState({ user, status: 'authenticated' });
    let complete!: (value: typeof user) => void;
    vi.spyOn(authService, 'updateProfile').mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const update = useAuthStore.getState().updateProfile(user);
    vi.spyOn(authService, 'logout').mockResolvedValue();
    await useAuthStore.getState().logout();
    const secondUser = { ...user, id: 'owner-b' };
    vi.spyOn(authService, 'login').mockResolvedValue(secondUser);
    await useAuthStore.getState().login({ email: 'b@example.invalid', password: 'password' });
    complete(user);
    expect(await update).toBe(false);
    expect(useAuthStore.getState().user?.id).toBe('owner-b');
  });

  it('merges guest items once and only reads server items on subsequent synchronization', async () => {
    useCartStore.setState({ items: [item], guestMergeId: 'stable-merge' });
    const merge = vi.spyOn(cartService, 'mergeGuestItems').mockResolvedValue([item]);
    useAuthStore.setState({ user, status: 'authenticated' });
    await useCartStore.getState().syncWithServer();
    await useCartStore.getState().syncWithServer();
    expect(merge).toHaveBeenCalledExactlyOnceWith([item], 'stable-merge');
    expect(useCartStore.getState().getItemCount()).toBe(1);
    expect(useCartStore.getState().getSubtotal()).toBe(100.49);
  });

  it('retains the same guest identity and content after an ambiguous merge failure', async () => {
    const merge = vi.spyOn(cartService, 'mergeGuestItems').mockRejectedValue(new Error('Response lost'));
    useCartStore.setState({ items: [item], guestMergeId: 'retry-merge' });
    useAuthStore.setState({ user, status: 'authenticated' });
    await expect(useCartStore.getState().syncWithServer()).rejects.toThrow('Response lost');
    expect(useCartStore.getState().guestMergeId).toBe('retry-merge');
    expect(useCartStore.getState().items).toEqual([item]);
    merge.mockResolvedValue([item]);
    await useCartStore.getState().syncWithServer();
    expect(merge.mock.calls.every(call => call[1] === 'retry-merge')).toBe(true);
  });

  it('discards a delayed private response after logout', async () => {
    let resolve!: (items: CartItem[]) => void;
    vi.mocked(cartService.getCart).mockImplementation(() => new Promise(done => { resolve = done; }));
    useAuthStore.setState({ user, status: 'authenticated' });
    await vi.waitFor(() => expect(resolve).toBeDefined());
    vi.spyOn(authService, 'logout').mockResolvedValue();
    useCheckoutStore.setState({ lastCheckout: { orderId: 'private', paymentId: 'p', paymentStatus: 'PENDING' } });
    useWishlistStore.getState().toggleWishlist('private-selection');
    await useAuthStore.getState().logout();
    resolve([item]);
    await Promise.resolve();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCheckoutStore.getState().lastCheckout).toBeNull();
    expect(useWishlistStore.getState().savedItemIds).toEqual([]);
  });

  it('does not announce a completed logout when server revocation fails', async () => {
    useAuthStore.setState({ user, status: 'authenticated' });
    vi.spyOn(authService, 'logout').mockRejectedValue(new Error('Offline'));
    expect(await useAuthStore.getState().logout()).toBe(false);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().error).toContain('could not be confirmed');
  });
});
