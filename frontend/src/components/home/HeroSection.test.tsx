import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Shirt } from '../../features/products/types/product.js';
import { HeroSection } from './HeroSection.js';

const product: Shirt = {
  id: 'shirt-1',
  slug: 'accessible-shirt',
  name: 'Accessible Shirt',
  tagline: 'A test shirt',
  description: 'A carousel accessibility fixture.',
  pricePaise: 249900,
  price: 2499,
  images: ['/shirt.jpg'],
  colors: [{ name: 'Black', hex: '#000000' }],
  sizes: ['42 (L)'],
  variants: [],
  fit: 'Regular',
  fabric: 'Oxford Cotton',
  collar: 'Spread Collar',
  sleeve: 'Full Sleeve',
  pattern: 'Solid',
  careInstructions: [],
  rating: 0,
  reviewCount: 0,
  editorialReviewCount: 0,
  ratingSource: 'none',
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('HeroSection carousel controls', () => {
  it('exposes a visible native pause control whose choice survives pointer leave', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroSection featuredProducts={[product]} />
      </MemoryRouter>,
    );

    const pause = screen.getByRole('button', { name: 'Pause hero carousel' });
    expect(pause).toHaveClass('h-11', 'w-11');
    pause.focus();
    expect(pause).toHaveFocus();
    fireEvent.click(pause);

    const play = screen.getByRole('button', { name: 'Play hero carousel' });
    expect(play).toHaveAttribute('aria-pressed', 'true');
    fireEvent.mouseLeave(container.querySelector('section')!);
    expect(screen.getByRole('button', { name: 'Play hero carousel' })).toBeVisible();
  });
});
