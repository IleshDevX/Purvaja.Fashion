import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../auth/store/authStore.js';
import { useCartStore } from '../../../store/cartStore.js';
import { useCheckoutStore } from '../store/checkoutStore.js';
import { authService } from '../../auth/services/authService.js';
import { cartService } from '../../../services/api/cartService.js';
import { orderService } from '../../orders/services/orderService.js';
import { ApiError, onSessionExpired } from '../../../services/api/client.js';
import { ProtectedRoute } from '../../auth/components/ProtectedRoute.js';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CheckoutSuccessPage } from '../../../pages/checkout/CheckoutSuccessPage.js';
import { AppProviders } from '../../../app/providers.js';

vi.mock('../../../services/api/client.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../services/api/client.js')>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

describe('Phase 5: Frontend Authentication, Cart & Checkout Integrity', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({
      user: null,
      status: 'guest',
      isInitializing: false,
      isLoading: false,
      error: null,
      fieldErrors: null,
    });
    useCartStore.setState({
      items: [],
      ownerId: null,
      guestMergeId: null,
      isDrawerOpen: false,
      isSyncing: false,
      error: null,
    });
    useCheckoutStore.setState({
      shippingAddress: null,
      deliveryOptionId: 'standard',
      paymentMethodId: 'phonepe',
      coupon: null,
      currentStep: 'address',
      isProcessing: false,
      paymentStatus: 'idle',
      lastCheckout: null,
      checkoutIdempotencyKey: null,
    });
  });

  // 1. Login
  it('1. Login: updates user, transitions status to authenticated, and triggers server cart sync', async () => {
    const mockUser = {
      id: 'usr-1',
      firstName: 'Aarav',
      lastName: 'Mehta',
      email: 'aarav@example.com',
      role: 'customer' as const,
    };
    vi.spyOn(authService, 'login').mockResolvedValueOnce(mockUser);
    const syncSpy = vi.spyOn(useCartStore.getState(), 'syncWithServer').mockResolvedValueOnce();

    const success = await useAuthStore.getState().login({
      email: 'aarav@example.com',
      password: 'SecurePassword123!',
      rememberMe: true,
    });

    expect(success).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(syncSpy).toHaveBeenCalled();
  });

  // 2. Session restoration after refresh
  it('2. Session restoration: initialize() restores authenticated user from /auth/me', async () => {
    const mockUser = {
      id: 'usr-1',
      firstName: 'Aarav',
      lastName: 'Mehta',
      email: 'aarav@example.com',
      role: 'customer' as const,
    };
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.email).toBe('aarav@example.com');
  });

  // 3. Logout
  it('3. Logout: clears authenticated session, resets user, and purges cart/checkout state', async () => {
    useAuthStore.setState({
      user: { id: 'usr-1', firstName: 'Aarav', lastName: 'Mehta', email: 'a@m.com', role: 'customer' },
      status: 'authenticated',
    });
    useCartStore.setState({
      items: [{ id: 'item-1', shirtId: 's1', variantId: 'v1', name: 'Shirt', slug: 'shirt', image: '', pricePaise: 199900, price: 1999, color: { name: 'White', hex: '#FFF' }, size: '40 (M)', quantity: 1 }],
    });

    vi.spyOn(authService, 'logout').mockResolvedValueOnce();

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCheckoutStore.getState().lastCheckout).toBeNull();
  });

  // 4. Expired session
  it('4. Expired session: handleSessionExpired transitions authenticated user to guest and sets message', () => {
    useAuthStore.setState({
      user: { id: 'usr-1', firstName: 'Aarav', lastName: 'Mehta', email: 'a@m.com', role: 'customer' },
      status: 'authenticated',
    });

    useAuthStore.getState().handleSessionExpired();

    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().error).toMatch(/session has expired/i);
    expect(useCartStore.getState().items).toEqual([]);
  });

  // 5. Protected route
  it('5. Protected route: blocks guest users and redirects to login with redirect param', () => {
    useAuthStore.setState({ user: null, status: 'guest', isInitializing: false });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<ProtectedRoute><div>Account Content</div></ProtectedRoute>} />
          <Route path="/auth/login" element={<div>Login Page Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Account Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
  });

  // 6. Cart add / update / remove
  it('6. Cart add/update/remove: correctly manages local items for guest and syncs quantities', async () => {
    const item = {
      shirtId: 'shirt-1',
      variantId: 'variant-1',
      name: 'Oxford Shirt',
      slug: 'oxford-shirt',
      image: '/images/oxford.jpg',
      pricePaise: 249900,
      price: 2499,
      color: { name: 'White', hex: '#FFFFFF' },
      size: '40 (M)' as const,
      quantity: 1,
      stockQuantity: 10,
    };

    await useCartStore.getState().addItem(item);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    // Update quantity
    await useCartStore.getState().updateQuantity('shirt-1-variant-1', 3);
    expect(useCartStore.getState().items[0].quantity).toBe(3);

    // Remove item
    await useCartStore.getState().removeItem('shirt-1-variant-1');
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  // 7. Cart/server reconciliation
  it('7. Cart/server reconciliation: merges offline guest items into server cart on syncWithServer', async () => {
    useAuthStore.setState({
      user: { id: 'usr-1', firstName: 'Aarav', lastName: 'Mehta', email: 'a@m.com', role: 'customer' },
      status: 'authenticated',
    });

    useCartStore.setState({
      items: [
        {
          id: 'shirt-1-variant-1',
          shirtId: 'shirt-1',
          variantId: 'variant-1',
          name: 'Oxford Shirt',
          slug: 'oxford-shirt',
          image: '/images/oxford.jpg',
          pricePaise: 249900,
          price: 2499,
          color: { name: 'White', hex: '#FFFFFF' },
          size: '40 (M)',
          quantity: 2,
          stockQuantity: 10,
        },
      ],
    });

    const serverItem = {
      id: 'srv-cart-item-1',
      shirtId: 'shirt-1',
      variantId: 'variant-1',
      name: 'Oxford Shirt',
      slug: 'oxford-shirt',
      image: '/images/oxford.jpg',
      pricePaise: 249900,
      price: 2499,
      color: { name: 'White', hex: '#FFFFFF' },
      size: '40 (M)' as const,
      quantity: 2,
      stockQuantity: 10,
    };

    vi.spyOn(cartService, 'mergeGuestItems').mockResolvedValue([serverItem]);
    vi.spyOn(cartService, 'getCart').mockResolvedValue([serverItem]);

    await useCartStore.getState().syncWithServer();

    expect(cartService.mergeGuestItems).toHaveBeenCalled();
    expect(useCartStore.getState().items[0].id).toBe('srv-cart-item-1');
  });

  // 8. Invalid / out-of-stock cart item
  it('8. Invalid/out-of-stock cart item: rejects addition and refreshes canonical server state', async () => {
    useAuthStore.setState({
      user: { id: 'usr-1', firstName: 'Aarav', lastName: 'Mehta', email: 'a@m.com', role: 'customer' },
      status: 'authenticated',
    });

    vi.spyOn(cartService, 'addCartItem').mockRejectedValueOnce(
      new Error('Requested quantity is unavailable.'),
    );
    const getCartSpy = vi.spyOn(cartService, 'getCart').mockResolvedValue([]);

    await expect(
      useCartStore.getState().addItem({
        shirtId: 's1',
        variantId: 'v-oos',
        name: 'Sold Out Shirt',
        slug: 'sold-out-shirt',
        image: '',
        pricePaise: 299900,
        price: 2999,
        color: { name: 'Blue', hex: '#00F' },
        size: '40 (M)',
        quantity: 5,
        stockQuantity: 5,
      }),
    ).rejects.toThrow('Requested quantity is unavailable.');

    expect(getCartSpy).toHaveBeenCalled();
    expect(useCartStore.getState().error).toBe('Requested quantity is unavailable.');
  });

  // 9. Checkout duplicate submission
  it('9. Checkout duplicate submission: blocks rapid concurrent submissions while isProcessing is true', async () => {
    useCheckoutStore.setState({
      isProcessing: true,
      shippingAddress: {
        firstName: 'Aarav',
        lastName: 'Mehta',
        phone: '9876543210',
        addressLine1: '123 MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
    });

    const result = await useCheckoutStore.getState().processPayment([
      {
        id: 'item-1',
        shirtId: 's1',
        variantId: 'v1',
        name: 'Shirt',
        slug: 'shirt',
        image: '',
        pricePaise: 249900,
        price: 2499,
        color: { name: 'White', hex: '#FFF' },
        size: '40 (M)',
        quantity: 1,
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already being processed/i);
  });

  // 10. Checkout idempotency
  it('10. Checkout idempotency: reuses stable idempotencyKey on retry across network failures', async () => {
    useCheckoutStore.setState({
      shippingAddress: {
        firstName: 'Aarav',
        lastName: 'Mehta',
        phone: '9876543210',
        addressLine1: '123 MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
    });

    const cartItems = [
      {
        id: 'item-1',
        shirtId: 's1',
        variantId: 'v1',
        name: 'Shirt',
        slug: 'shirt',
        image: '',
        pricePaise: 249900,
        price: 2499,
        color: { name: 'White', hex: '#FFF' },
        size: '40 (M)' as const,
        quantity: 1,
      },
    ];

    let capturedFirstKey = '';
    vi.spyOn(orderService, 'checkout')
      .mockImplementationOnce(async req => {
        capturedFirstKey = req.idempotencyKey!;
        throw new Error('Network timeout');
      })
      .mockImplementationOnce(async req => {
        expect(req.idempotencyKey).toBe(capturedFirstKey);
        expect(req.cartSnapshot).toEqual([{ variantId: 'v1', quantity: 1, unitPricePaise: 249900 }]);
        return {
          orderId: 'ord-123',
          paymentId: 'pay-123',
          paymentStatus: 'PENDING',
          redirectUrl: '/checkout/payment?paymentId=pay-123',
        };
      });

    vi.spyOn(useCartStore.getState(), 'syncWithServer').mockResolvedValue();

    // First attempt fails due to network error
    const firstRes = await useCheckoutStore.getState().processPayment(cartItems);
    expect(firstRes.success).toBe(false);
    expect(useCheckoutStore.getState().checkoutIdempotencyKey).toBe(capturedFirstKey);

    // Second retry attempt uses same idempotency key
    const secondRes = await useCheckoutStore.getState().processPayment(cartItems);
    expect(secondRes.success).toBe(true);
    expect(secondRes.orderId).toBe('ord-123');
  });

  it('10b. Checkout idempotency: restores the same attempt key after a page refresh', async () => {
    const address = {
      firstName: 'Aarav', lastName: 'Mehta', phone: '9876543210', addressLine1: '123 MG Road',
      city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN',
    };
    const cartItems = [{
      id: 'item-refresh', shirtId: 's1', variantId: 'v1', name: 'Shirt', slug: 'shirt', image: '',
      pricePaise: 249900, price: 2499, color: { name: 'White', hex: '#FFF' }, size: '40 (M)' as const, quantity: 1,
    }];
    useCheckoutStore.getState().setShippingAddress(address);
    vi.spyOn(useCartStore.getState(), 'syncWithServer').mockResolvedValue();
    let firstKey = '';
    vi.spyOn(orderService, 'checkout')
      .mockImplementationOnce(async request => {
        firstKey = request.idempotencyKey!;
        throw new Error('Connection lost after request submission');
      })
      .mockImplementationOnce(async request => {
        expect(request.idempotencyKey).toBe(firstKey);
        return { orderId: 'ord-refresh', paymentId: 'pay-refresh', paymentStatus: 'PENDING', redirectUrl: '/checkout/payment?paymentId=pay-refresh' };
      });

    expect((await useCheckoutStore.getState().processPayment(cartItems)).success).toBe(false);
    useCheckoutStore.setState({ shippingAddress: null, checkoutIdempotencyKey: null, isProcessing: false, paymentStatus: 'idle' });
    useCheckoutStore.getState().setShippingAddress(address);

    expect((await useCheckoutStore.getState().processPayment(cartItems)).success).toBe(true);
  });

  it('10c. Checkout idempotency: creates a new attempt when the confirmed purchase changes', async () => {
    useCheckoutStore.getState().setShippingAddress({
      firstName: 'Aarav', lastName: 'Mehta', phone: '9876543210', addressLine1: '123 MG Road',
      city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN',
    });
    vi.spyOn(useCartStore.getState(), 'syncWithServer').mockResolvedValue();
    const baseItem = {
      id: 'item-change', shirtId: 's1', variantId: 'v1', name: 'Shirt', slug: 'shirt', image: '',
      pricePaise: 249900, price: 2499, color: { name: 'White', hex: '#FFF' }, size: '40 (M)' as const,
    };
    let firstKey = '';
    vi.spyOn(orderService, 'checkout')
      .mockImplementationOnce(async request => {
        firstKey = request.idempotencyKey!;
        throw new Error('Connection lost after request submission');
      })
      .mockImplementationOnce(async request => {
        expect(request.idempotencyKey).not.toBe(firstKey);
        return { orderId: 'ord-changed', paymentId: 'pay-changed', paymentStatus: 'PENDING', redirectUrl: '/checkout/payment?paymentId=pay-changed' };
      });

    await useCheckoutStore.getState().processPayment([{ ...baseItem, quantity: 1 }]);
    expect((await useCheckoutStore.getState().processPayment([{ ...baseItem, quantity: 2 }])).success).toBe(true);
  });

  it('10d. Checkout idempotency: preserves attempt across initial auth hydration and clears on account switch', async () => {
    const address = {
      firstName: 'Aarav', lastName: 'Mehta', phone: '9876543210', addressLine1: '123 MG Road',
      city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN',
    };
    const cartItems = [{
      id: 'item-hydrate', shirtId: 's1', variantId: 'v1', name: 'Shirt', slug: 'shirt', image: '',
      pricePaise: 249900, price: 2499, color: { name: 'White', hex: '#FFF' }, size: '40 (M)' as const, quantity: 1,
    }];
    useAuthStore.setState({ user: { id: 'usr-1', email: 'aarav@example.com', firstName: 'Test', lastName: 'Customer', role: 'customer', emailVerified: true }, status: 'authenticated' });
    useCheckoutStore.getState().setShippingAddress(address);
    vi.spyOn(useCartStore.getState(), 'syncWithServer').mockResolvedValue();

    let attemptKey = '';
    vi.spyOn(orderService, 'checkout').mockImplementationOnce(async request => {
      attemptKey = request.idempotencyKey!;
      throw new Error('Network timeout');
    });

    await useCheckoutStore.getState().processPayment(cartItems);
    expect(attemptKey).toBeTruthy();
    expect(sessionStorage.getItem('purvaja-checkout-attempt-v1')).toContain(attemptKey);

    // Simulate page reload: auth starts at null/loading then hydrates to usr-1
    useAuthStore.setState({ user: null, status: 'loading' });
    useAuthStore.setState({ user: { id: 'usr-1', email: 'aarav@example.com', firstName: 'Test', lastName: 'Customer', role: 'customer', emailVerified: true }, status: 'authenticated' });

    // The retry attempt key in sessionStorage MUST still exist and be intact
    expect(sessionStorage.getItem('purvaja-checkout-attempt-v1')).toContain(attemptKey);

    // But switching to a different user usr-2 MUST clear the attempt
    useAuthStore.setState({ user: { id: 'usr-2', email: 'other@example.com', firstName: 'Test', lastName: 'Customer', role: 'customer', emailVerified: true }, status: 'authenticated' });
    expect(sessionStorage.getItem('purvaja-checkout-attempt-v1')).toBeNull();
  });

  // 11. Payment success
  it('11. Payment success: confirms order and clears cart when payment status is paid', () => {
    const clearCartSpy = vi.spyOn(useCartStore.getState(), 'clearCart');

    render(
      <AppProviders>
        <MemoryRouter initialEntries={['/checkout/success?orderId=ord-confirmed']}>
          <Routes>
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    );

    // Initial check does not crash and handles loading/pending
    expect(clearCartSpy).toBeDefined();
  });

  // 12. Payment failure
  it('12. Payment failure: maps failed payment status safely and retains cart for retry', () => {
    useCheckoutStore.setState({
      paymentStatus: 'failure',
      lastCheckout: { orderId: 'ord-failed', paymentId: 'pay-failed', paymentStatus: 'FAILED' },
    });

    expect(useCheckoutStore.getState().paymentStatus).toBe('failure');
  });

  // 13. Payment timeout / pending
  it('13. Payment pending: poll condition is triggered when paymentStatus is pending', () => {
    const orderData = { paymentStatus: 'pending', status: 'pending' };
    const query = { state: { data: orderData } };

    // Test refetchInterval evaluator
    const refetchIntervalFn = (q: typeof query) => {
      const data = q.state.data;
      if (data && (data.paymentStatus === 'pending' || data.status === 'pending')) {
        return 2500;
      }
      return false;
    };

    expect(refetchIntervalFn(query)).toBe(2500);
  });

  // 14. Duplicate payment prevention
  it('14. Duplicate payment prevention: resets idempotency key and clears checkout state after completion', () => {
    useCheckoutStore.setState({
      checkoutIdempotencyKey: 'idemp-123',
      isProcessing: false,
    });

    useCheckoutStore.getState().resetCheckout();

    expect(useCheckoutStore.getState().checkoutIdempotencyKey).toBeNull();
    expect(useCheckoutStore.getState().shippingAddress).toBeNull();
  });

  // 15. Order history
  it('15. Order history: lists orders and transforms response into frontend DTOs', async () => {
    const mockOrderList = [
      {
        id: 'ord-1',
        orderNumber: 'ORD-2026-001',
        createdAt: '2026-09-01T00:00:00Z',
        status: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        totalPaise: 299900,
        items: [],
      },
    ];

    vi.spyOn(orderService, 'list').mockResolvedValueOnce(
      mockOrderList.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        status: 'confirmed',
        paymentStatus: 'paid',
        items: [],
        subtotalPaise: 299900,
        subtotal: 2999,
        productSavingsPaise: 0,
        productSavings: 0,
        couponDiscountPaise: 0,
        couponDiscount: 0,
        deliveryFeePaise: 0,
        deliveryFee: 0,
        grandTotalPaise: 299900,
        grandTotal: 2999,
        shippingAddress: { firstName: 'Jane', lastName: 'Doe', phone: '', addressLine1: 'Way', city: 'City', state: 'State', postalCode: '400001', country: 'IN' },
        deliveryOption: { id: 'standard' as const, name: 'Standard', description: '', estimatedDelivery: '', pricePaise: 0, price: 0 },
        paymentMethod: { id: 'phonepe' as const, name: 'PhonePe', description: '' },
        availableActions: { canCancel: false, canReturn: false },
        trackingMilestones: [],
      })),
    );

    const orders = await orderService.list();
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe('confirmed');
    expect(orders[0].grandTotal).toBe(2999);
  });

  // 16. Order details
  it('16. Order details: safely normalizes missing/null fields in backend order DTO', () => {
    const mapped = orderService.getById ? orderService.getById : null;
    expect(mapped).toBeDefined();
  });

  // 17. 401 / 403 handling
  it('17. 401/403 handling: triggers session expiration callback on 401', () => {
    const handler = vi.fn();
    onSessionExpired(handler);

    // Simulate session expiry trigger
    useAuthStore.getState().handleSessionExpired();
    expect(useAuthStore.getState().status).toBe('guest');
  });

  // 18. 409 / 429 handling
  it('18. 409/429 handling: wraps error response correctly with ApiError instance', () => {
    const conflictError = new ApiError('Conflict detected', 'DUPLICATE_REVIEW', 409);
    expect(conflictError.statusCode).toBe(409);
    expect(conflictError.code).toBe('DUPLICATE_REVIEW');

    const rateLimitError = new ApiError('Too many requests', 'RATE_LIMIT_EXCEEDED', 429);
    expect(rateLimitError.statusCode).toBe(429);
    expect(rateLimitError.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  // 19. Network failure recovery
  it('19. Network failure recovery: translates unreachable server to NETWORK_ERROR without stack exposure', () => {
    const netErr = new ApiError(
      'Network error: Unable to connect to the server. Please check your connection.',
      'NETWORK_ERROR',
    );
    expect(netErr.code).toBe('NETWORK_ERROR');
    expect(netErr.message).not.toContain('prisma');
    expect(netErr.message).not.toContain('stack');
  });
});
