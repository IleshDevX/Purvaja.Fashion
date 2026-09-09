import { type ReactNode } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '../components/common/ErrorBoundary.js';

export function CheckoutLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory-50 text-charcoal-900 antialiased">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Minimal Checkout Header */}
      <header className="sticky top-0 z-30 w-full bg-ivory-100/95 backdrop-blur-md border-b border-ivory-300">
        <div className="max-w-content mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Link
                to="/cart"
                className="text-charcoal-500 hover:text-charcoal-950 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
                aria-label="Return to bag"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link
                to="/"
                className="font-serif text-lg text-charcoal-900 hover:text-gold-600 transition-colors"
              >
                PURVAJA
              </Link>
            </div>
            <div className="flex items-center gap-2 text-caption text-charcoal-500">
              <Lock className="h-3.5 w-3.5 text-success" />
              <span className="hidden sm:inline">Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col w-full py-6 sm:py-10 outline-none">
        <ErrorBoundary>
          <div className="max-w-content mx-auto w-full px-5 sm:px-8 flex-1 flex flex-col">
            {children ?? <Outlet />}
          </div>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-ivory-300 bg-ivory-200 py-5 text-center text-caption text-charcoal-400">
        <div className="max-w-content mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span>Complimentary size replacement & 7-day returns</span>
          </div>
          <p>© {new Date().getFullYear()} Purvaja Fashion</p>
        </div>
      </footer>
    </div>
  );
}
