import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminVariantsPage } from './AdminOperationsPages.js';
import { adminService } from '../../features/admin/services/adminService.js';
import { renderWithProviders } from '../../test/testUtils.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('retains a valid selected product while asynchronous product options are unavailable', () => {
  vi.spyOn(adminService, 'listProducts').mockReturnValue(new Promise(() => {}));
  vi.spyOn(adminService, 'listVariants').mockReturnValue(new Promise(() => {}));
  renderWithProviders(<AdminVariantsPage />, {
    routerProps: { initialEntries: ['/admin/variants?productId=selected-product'] },
  });
  const product = screen.getByRole('combobox', { name: 'Product' }) as HTMLSelectElement;
  expect(product.value).toBe('selected-product');
  expect(product.checkValidity()).toBe(true);
});
