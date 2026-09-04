import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminInventoryPage } from './AdminInventoryPage.js';
import { renderWithProviders } from '../../test/testUtils.js';
import { adminService } from '../../features/admin/services/adminService.js';

describe('AdminInventoryPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders SKU inventory matrix with paginated items, status badges, and controls', async () => {
    vi.spyOn(adminService, 'getInventory').mockResolvedValue({
      items: [
        {
          id: 'v-1',
          shirtId: 's-1',
          shirtName: 'Royal Bengal Linen Shirt',
          slug: 'royal-bengal-linen-shirt',
          sku: 'SHIRT-001-38-IVO',
          color: 'Ivory White',
          size: '38 (S)',
          stock: 25,
          reservedStock: 0,
          availableStock: 25,
          lowStockThreshold: 10,
          status: 'in_stock',
          lastUpdated: new Date().toISOString(),
        },
      ],
      page: 1,
      limit: 25,
      total: 300,
      totalPages: 12,
    });

    renderWithProviders(<AdminInventoryPage />);

    expect(screen.getByText(/SKU Inventory Matrix/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search SKU code, shirt, or colorway/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Royal Bengal Linen Shirt')).toBeInTheDocument();
      expect(screen.getByText('SHIRT-001-38-IVO')).toBeInTheDocument();
      expect(screen.getByText('25 Units')).toBeInTheDocument();
      expect(screen.getByText(/300 total SKUs/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 12/i)).toBeInTheDocument();
    });
  });
});
