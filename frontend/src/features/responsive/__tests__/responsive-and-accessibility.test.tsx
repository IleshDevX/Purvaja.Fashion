import { cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/testUtils.js';
import { CustomerLayout } from '../../../layouts/CustomerLayout.js';
import { CheckoutLayout } from '../../../layouts/CheckoutLayout.js';
import { AdminLayout } from '../../../layouts/AdminLayout.js';
import { AuthLayout } from '../../../layouts/AuthLayout.js';
import { Header } from '../../../components/navigation/Header.js';
import { CartDrawer } from '../../../components/navigation/CartDrawer.js';
import { Footer } from '../../../components/navigation/Footer.js';
import { OrderListPage } from '../../../pages/orders/OrderListPage.js';
import { useOrdersQuery } from '../../../features/orders/hooks/useOrders.js';
import { Order } from '../../../features/orders/types/order.js';

vi.mock('../../../features/orders/hooks/useOrders.js', () => ({
  useOrdersQuery: vi.fn(),
}));

const mockOrder: Order = {
  id: 'order-123',
  orderNumber: 'ORD-2026-0001',
  createdAt: '2026-09-01T10:00:00.000Z',
  status: 'confirmed',
  items: [
    {
      id: 'item-1',
      shirtId: 'shirt-1',
      name: 'Artisan Egyptian Shirt',
      slug: 'artisan-egyptian-shirt',
      image: '/images/test.jpg',
      size: '40 (M)',
      color: { name: 'White', hex: '#FFFFFF' },
      quantity: 1,
      unitPricePaise: 299900,
      unitPrice: 2999,
      lineTotalPaise: 299900,
      lineTotal: 2999,
    },
  ],
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
  shippingAddress: {
    firstName: 'Ilesh',
    lastName: 'Patel',
    addressLine1: 'Atelier Avenue',
    city: 'Ahmedabad',
    state: 'Gujarat',
    postalCode: '380015',
    phone: '+91 98765 43210',
    country: 'India',
  },
  deliveryOption: {
    id: 'standard',
    name: 'Standard Delivery',
    description: 'Tracked ground delivery',
    estimatedDelivery: '3-5 business days',
    pricePaise: 0,
    price: 0,
  },
  paymentMethod: {
    id: 'phonepe',
    name: 'PhonePe / UPI',
    description: 'UPI transaction',
  },
  paymentStatus: 'paid',
  availableActions: { canCancel: true, canReturn: false },
  trackingMilestones: [],
};

describe('Phase 8 — Responsive & Accessibility Hardening Suite', () => {
  beforeEach(() => {
    vi.mocked(useOrdersQuery).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useOrdersQuery>);
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  describe('1. Skip to Content Navigation & Landmarks', () => {
    it('CustomerLayout renders skip link pointing to #main-content landmark', () => {
      renderWithProviders(<CustomerLayout />);
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const mainLandmark = document.getElementById('main-content');
      expect(mainLandmark).toBeInTheDocument();
      expect(mainLandmark?.tagName.toLowerCase()).toBe('main');
    });

    it('CheckoutLayout renders skip link pointing to #main-content landmark', () => {
      renderWithProviders(<CheckoutLayout />);
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const mainLandmark = document.getElementById('main-content');
      expect(mainLandmark).toBeInTheDocument();
    });

    it('AuthLayout exposes a skip link and main landmark', () => {
      renderWithProviders(<AuthLayout><p>Authentication form</p></AuthLayout>);
      expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
      expect(document.getElementById('main-content')?.tagName.toLowerCase()).toBe('main');
    });

    it('AdminLayout renders skip link pointing to #admin-main-content landmark', () => {
      renderWithProviders(<AdminLayout />);
      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#admin-main-content');

      const adminMain = document.getElementById('admin-main-content');
      expect(adminMain).toBeInTheDocument();
    });
  });

  describe('2. Modal & Drawer ARIA Semantics and Keyboard Navigation', () => {
    it('Header mobile navigation drawer has ARIA dialog attributes and closes on Escape', () => {
      renderWithProviders(<Header />);
      const menuButton = screen.getByRole('button', { name: /toggle navigation menu/i });
      expect(menuButton).toBeInTheDocument();

      // Open menu
      fireEvent.click(menuButton);
      const drawer = screen.getByRole('dialog', { name: /mobile navigation/i });
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');

      // Dismiss with Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
      expect(document.body.style.overflow).not.toBe('hidden');
    });

    it('Header search modal manages initial focus, restores trigger focus, and closes on Escape', async () => {
      renderWithProviders(<Header />);
      const searchButton = screen.getByRole('button', { name: /^search$/i });

      // Open search modal
      searchButton.focus();
      fireEvent.click(searchButton);
      const searchModal = screen.getByRole('dialog', { name: /search menswear/i });
      expect(searchModal).toBeInTheDocument();
      expect(searchModal).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');
      await waitFor(() => expect(screen.getByLabelText(/search products/i)).toHaveFocus());

      // Dismiss with Escape key
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /search menswear/i })).not.toBeInTheDocument();
      expect(document.body.style.overflow).not.toBe('hidden');
      expect(searchButton).toHaveFocus();
    });

    it('CartDrawer has ARIA dialog semantics, locks body scroll, and closes on Escape', async () => {
      const { useCartStore } = await import('../../../store/cartStore.js');
      useCartStore.getState().setDrawerOpen(true);

      renderWithProviders(<CartDrawer />);

      const cartDialog = screen.getByRole('dialog', { name: /shopping bag/i });
      expect(cartDialog).toBeInTheDocument();
      expect(cartDialog).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(useCartStore.getState().isDrawerOpen).toBe(false);
    });

    it('OrderListPage cancel modal has ARIA dialog semantics and closes on Escape', () => {
      renderWithProviders(<OrderListPage />);

      const cancelTrigger = screen.getByRole('button', { name: /cancel order/i });
      fireEvent.click(cancelTrigger);

      const cancelModal = screen.getByRole('dialog', { name: /cancel order/i });
      expect(cancelModal).toBeInTheDocument();
      expect(cancelModal).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /cancel order/i })).not.toBeInTheDocument();
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  describe('3. Touch Targets & Accessible Controls', () => {
    it('Footer newsletter input and social icons have accessible names', () => {
      renderWithProviders(<Footer />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /subscribe to newsletter/i });
      expect(submitBtn).toBeInTheDocument();

      expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /twitter/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /linkedin/i })).toBeInTheDocument();
    });

    it('Admin layout mobile drawer toggle has accessible label and min 44px hit target class', () => {
      renderWithProviders(<AdminLayout />);
      const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
      expect(hamburger).toBeInTheDocument();
      expect(hamburger.className).toContain('min-h-[44px]');
      expect(hamburger.className).toContain('min-w-[44px]');
    });
  });
});
