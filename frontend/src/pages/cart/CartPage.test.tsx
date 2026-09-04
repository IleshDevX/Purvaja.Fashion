import { cleanup, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartPage } from './CartPage.js';
import { renderWithProviders } from '../../test/testUtils.js';
import { useCartStore } from '../../store/cartStore.js';
import { useCheckoutStore } from '../../features/checkout/store/checkoutStore.js';

vi.mock('../../features/products/hooks/useProducts.js', () => ({
  useProductsQuery: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

describe('CartPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useCartStore.setState({ items: [] });
    useCheckoutStore.setState({ coupon: null, deliveryOptionId: 'standard' });
  });

  it('renders empty cart view when no items are present', () => {
    renderWithProviders(<CartPage />);

    expect(screen.getByRole('heading', { name: /Your Bag is Empty/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Catalog/i })).toBeInTheDocument();
  });

  it('renders cart items, quantity controls, and order summary when items exist', () => {
    useCartStore.setState({
      items: [
        {
          id: 'shirt-1-variant-1',
          shirtId: 'shirt-1',
          variantId: 'variant-1',
          name: 'Classic Linen Shirt',
          slug: 'classic-linen-shirt',
          image: '/images/classic-linen.jpg',
          price: 2499,
          color: { name: 'Ivory White', hex: '#FFFFF0' },
          size: '40 (M)',
          quantity: 2,
        },
      ],
    });

    renderWithProviders(<CartPage />);

    expect(screen.getByText('Classic Linen Shirt')).toBeInTheDocument();
    expect(screen.getByText(/40 \(M\)/)).toBeInTheDocument();
    expect(screen.getByText(/Ivory White/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PROCEED TO CHECKOUT/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Summary/i })).toBeInTheDocument();
  });

  it('allows increasing quantity using the plus button', () => {
    useCartStore.setState({
      items: [
        {
          id: 'shirt-1-variant-1',
          shirtId: 'shirt-1',
          variantId: 'variant-1',
          name: 'Classic Linen Shirt',
          slug: 'classic-linen-shirt',
          image: '/images/classic-linen.jpg',
          price: 2499,
          color: { name: 'Ivory White', hex: '#FFFFF0' },
          size: '40 (M)',
          quantity: 1,
        },
      ],
    });

    renderWithProviders(<CartPage />);

    const increaseBtn = screen.getByLabelText(/Increase quantity/i);
    fireEvent.click(increaseBtn);

    const storeItems = useCartStore.getState().items;
    expect(storeItems[0].quantity).toBe(2);
  });
});
