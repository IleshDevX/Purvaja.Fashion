import { type ReactNode } from 'react';
import { Outlet, Link } from 'react-router-dom';

export function AuthLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen antialiased">
      {/* Left — Fashion Imagery */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal-900 relative overflow-hidden items-end p-12">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&auto=format&fit=crop&q=80')`,
          }}
        />
        <div className="relative z-10">
          <Link to="/" className="font-serif text-3xl text-ivory-100 mb-6 block">PURVAJA</Link>
          <p className="font-serif text-display text-ivory-200 leading-tight mb-4">
            The Art of<br />Everyday Elegance
          </p>
          <p className="text-body text-ivory-400 max-w-sm">
            Curated premium shirts for the modern gentleman who values craftsmanship and refined taste.
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-ivory-100 p-6 sm:p-10">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <Link to="/" className="font-serif text-2xl text-charcoal-900">PURVAJA</Link>
        </div>
        <div className="w-full max-w-md">
          {children ?? <Outlet />}
        </div>
        <div className="mt-8 text-center">
          <Link to="/" className="text-body-sm text-charcoal-400 hover:text-charcoal-700 transition-colors">
            ← Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
