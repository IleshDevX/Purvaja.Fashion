import { type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/navigation/Header.js';
import { Footer } from '../components/navigation/Footer.js';
import { CartDrawer } from '../components/navigation/CartDrawer.js';
import { ErrorBoundary } from '../components/common/ErrorBoundary.js';

export function CustomerLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory-100 text-charcoal-900 antialiased">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <CartDrawer />
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col w-full outline-none">
        <ErrorBoundary>
          {children ?? <Outlet />}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
