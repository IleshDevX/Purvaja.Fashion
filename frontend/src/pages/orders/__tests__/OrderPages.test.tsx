import { cleanup, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderListPage } from '../OrderListPage.js';
import { OrderDetailsPage } from '../OrderDetailsPage.js';
import { OrderTrackingPage } from '../OrderTrackingPage.js';
import { renderWithProviders } from '../../../test/testUtils.js';
import { Order } from '../../../features/orders/types/order.js';

const mockUseOrdersQuery = vi.fn();
const mockUseOrderQuery = vi.fn();
const mockCancelOrder = vi.fn();
const mockReturnOrder = vi.fn();

vi.mock('../../../features/orders/hooks/useOrders.js', () => ({
  useOrdersQuery: (params: unknown) => mockUseOrdersQuery(params),
  useOrderQuery: (id: string | undefined) => mockUseOrderQuery(id),
}));

vi.mock('../../../features/orders/services/orderService.js', () => ({
  orderService: {
    cancel: (...args: unknown[]) => mockCancelOrder(...args),
    requestReturn: (...args: unknown[]) => mockReturnOrder(...args),
  },
}));

const mockOrder: Order = {
  id: 'order-123',
  orderNumber: 'ORD-2026-0001',
  createdAt: '2026-09-01T10:00:00.000Z',
  status: 'processing',
  items: [
    {
      id: 'item-1',
      shirtId: 'shirt-1',
      name: 'Oxford Royal Cutaway Shirt',
      slug: 'oxford-royal-cutaway-shirt',
      image: '/images/oxford-royal.jpg',
      size: '42 (L)',
      color: { name: 'Sky Blue', hex: '#87CEEB' },
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
    firstName: 'Jane',
    lastName: 'Doe',
    addressLine1: '123 Heritage Way',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
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
    description: 'Pay securely using UPI',
  },
  paymentStatus: 'paid',
  availableActions: { canCancel: true, canReturn: false },
  trackingNumber: 'TRK-EXP-48201',
  courierName: 'Blue Dart Express',
  estimatedDelivery: '2026-09-08T18:00:00.000Z',
  trackingMilestones: [
    {
      status: 'confirmed',
      title: 'Order Confirmed',
      description: 'Your order has been placed and confirmed.',
      timestamp: '2026-09-01T10:00:00.000Z',
      completed: true,
      current: false,
    },
    {
      status: 'processing',
      title: 'In Atelier Production',
      description: 'Master tailors are inspecting fabrics.',
      timestamp: '2026-09-02T14:30:00.000Z',
      completed: true,
      current: true,
    },
    {
      status: 'shipped',
      title: 'Handed Over to Courier',
      description: 'Package ready for dispatch.',
      completed: false,
      current: false,
    },
  ],
};

describe('Order Pages Test Suite', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('OrderListPage', () => {
    it('renders empty state when no orders exist', () => {
      mockUseOrdersQuery.mockReturnValue({ data: [], isLoading: false });

      renderWithProviders(<OrderListPage />);

      expect(screen.getByRole('heading', { name: /No Orders Found/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Browse Collection/i })).toBeInTheDocument();
    });

    it('renders orders list with order details, status, and items', () => {
      mockUseOrdersQuery.mockReturnValue({ data: [mockOrder], isLoading: false });

      renderWithProviders(<OrderListPage />);

      expect(screen.getByText('#ORD-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Oxford Royal Cutaway Shirt')).toBeInTheDocument();
      expect(screen.getAllByText('₹2,999').length).toBeGreaterThan(0);
    });

    it('opens cancellation modal when clicking cancel button for a cancellable order', () => {
      const cancellableOrder: Order = { ...mockOrder, status: 'confirmed' };
      mockUseOrdersQuery.mockReturnValue({ data: [cancellableOrder], isLoading: false });

      renderWithProviders(<OrderListPage />);

      const cancelBtn = screen.getByRole('button', { name: /Cancel Order/i });
      fireEvent.click(cancelBtn);

      expect(screen.getByRole('heading', { name: 'Cancel Order' })).toBeInTheDocument();
      expect(screen.getByText(/Reason for Cancellation/i)).toBeInTheDocument();
    });
  });

  describe('OrderDetailsPage', () => {
    it('shows loading indicator while order data is being fetched', () => {
      mockUseOrderQuery.mockReturnValue({ data: undefined, isPending: true });

      renderWithProviders(<OrderDetailsPage />);

      expect(screen.getByText(/Loading Order Details/i)).toBeInTheDocument();
    });

    it('renders not found state when order does not exist', () => {
      mockUseOrderQuery.mockReturnValue({ data: undefined, isPending: false });

      renderWithProviders(<OrderDetailsPage />);

      expect(screen.getByRole('heading', { name: /Order Not Found/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Return to Orders/i })).toBeInTheDocument();
    });

    it('renders complete invoice, customer address, and items when order exists', () => {
      mockUseOrderQuery.mockReturnValue({ data: mockOrder, isPending: false });

      renderWithProviders(<OrderDetailsPage />);

      expect(screen.getByRole('heading', { name: /Order #ORD-2026-0001/i })).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText(/123 Heritage Way/i)).toBeInTheDocument();
      expect(screen.getByText('Oxford Royal Cutaway Shirt')).toBeInTheDocument();
      expect(screen.getAllByText('₹2,999').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Print Invoice/i })).toBeInTheDocument();
    });
  });

  describe('OrderTrackingPage', () => {
    it('shows a truthful loading state', () => {
      mockUseOrderQuery.mockReturnValue({ data: undefined, isPending: true });

      renderWithProviders(<OrderTrackingPage />);

      expect(screen.getByText(/Loading order status/i)).toBeInTheDocument();
    });

    it('renders a retryable unavailable state when order data is missing', () => {
      mockUseOrderQuery.mockReturnValue({ data: undefined, isPending: false });

      renderWithProviders(<OrderTrackingPage />);

      expect(screen.getByRole('heading', { name: /Order status unavailable/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Return to Orders/i })).toBeInTheDocument();
    });

    it('renders supplied status milestones, courier name, and tracking number', () => {
      mockUseOrderQuery.mockReturnValue({ data: mockOrder, isPending: false });

      renderWithProviders(<OrderTrackingPage />);

      expect(screen.getByText(/Package #TRK-EXP-48201/i)).toBeInTheDocument();
      expect(screen.getByText(/Carrier: Blue Dart Express/)).toBeInTheDocument();
      expect(screen.getAllByText('In Atelier Production').length).toBeGreaterThan(0);
      expect(screen.getByText(/Master tailors are inspecting fabrics/i)).toBeInTheDocument();
    });

    it('does not invent carrier, tracking, ETA, or support data when absent', () => {
      mockUseOrderQuery.mockReturnValue({data:{...mockOrder,trackingNumber:undefined,courierName:undefined,estimatedDelivery:undefined},isPending:false});
      renderWithProviders(<OrderTrackingPage />);
      expect(screen.getByRole('heading',{name:'Order #ORD-2026-0001'})).toBeInTheDocument();
      expect(screen.getByText('Carrier tracking unavailable')).toBeInTheDocument();
      expect(screen.getByText('Not provided')).toBeInTheDocument();
      expect(screen.queryByText(/98765 43210/)).toBeInTheDocument();
      expect(screen.queryByText(/Support Helpline/)).not.toBeInTheDocument();
      expect(screen.queryByText(/BlueDart Air Express/)).not.toBeInTheDocument();
    });
  });
});
