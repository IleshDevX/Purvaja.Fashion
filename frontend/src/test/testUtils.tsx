import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { AppProviders } from '../app/providers.js';

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { routerProps?: MemoryRouterProps },
) {
  const { routerProps, ...renderOptions } = options || {};

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders>
        <MemoryRouter {...routerProps}>{children}</MemoryRouter>
      </AppProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
