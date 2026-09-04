import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  ShoppingBag,
  Users,
  Boxes,
  Menu,
  X,
  LogOut,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  User,
  Tags,
  ListTree,
  History,
  ClipboardCheck,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store/authStore.js';
import { useToast } from '../app/providers.js';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Shirts & Products', href: '/admin/products', icon: Shirt },
  { label: 'Categories', href: '/admin/categories', icon: ListTree },
  { label: 'Variants', href: '/admin/variants', icon: Tags },
  { label: 'Tailored Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Patrons & Clients', href: '/admin/customers', icon: Users },
  { label: 'Inventory Matrix', href: '/admin/inventory', icon: Boxes },
  { label: 'Stock Movements', href: '/admin/inventory/movements', icon: History },
  { label: 'Reservations', href: '/admin/inventory/reservations', icon: ClipboardCheck },
  { label: 'Coupons', href: '/admin/coupons', icon: Tags },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { addToast } = useToast();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    logout();
    addToast('Signed out of Atelier Admin Portal.', 'info');
    navigate('/auth/login');
  };

  // Generate breadcrumb titles from pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-ivory-100 text-charcoal-900 flex flex-col lg:flex-row antialiased selection:bg-gold-500 selection:text-charcoal-950 font-sans">
      {/* ── DESKTOP FIXED SIDEBAR ── */}
      <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-ivory-300 bg-white p-6 shrink-0 h-screen sticky top-0 z-40 shadow-[0_4px_24px_rgba(26,26,26,0.03)]">
        <div className="space-y-8">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gold-50 border border-gold-400/50 flex items-center justify-center group-hover:border-gold-600 transition-colors">
                <ShieldCheck className="h-5 w-5 text-gold-700" />
              </div>
              <div>
                <span className="font-serif text-lg font-bold tracking-[0.14em] text-charcoal-950 uppercase block">
                  PURVAJA
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800 block -mt-0.5">
                  Atelier Admin
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Admin Navigation">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400 px-3.5 mb-2">
              Management Suite
            </p>
            {ADMIN_NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-charcoal-950 text-white shadow-sm font-bold'
                      : 'text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-gold-400' : 'text-charcoal-500'}`} />
                    <span>{item.label}</span>
                  </span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Storefront Link & Admin Profile */}
        <div className="space-y-3 pt-6 border-t border-ivory-200">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2.5 text-xs font-medium text-charcoal-800 hover:bg-ivory-100 hover:text-charcoal-950 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-gold-600" />
              <span>Live Customer Store</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
          </Link>

          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-ivory-50 border border-ivory-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-gold-100 border border-gold-400/60 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-gold-800" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-charcoal-950 truncate">
                  {user?.firstName || 'Purvaja'} {user?.lastName || 'Admin'}
                </p>
                <p className="text-[10px] text-charcoal-500 truncate">
                  {user?.email || 'admin@purvajafashion.com'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-charcoal-500 hover:text-rose-600 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-950/60 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-4/5 max-w-xs h-full bg-white p-6 flex flex-col justify-between border-r border-ivory-300 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-ivory-200">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-gold-700" />
                  <span className="font-serif text-base font-bold text-charcoal-950 tracking-widest uppercase">
                    PURVAJA ADMIN
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 text-charcoal-500 hover:text-charcoal-950"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {ADMIN_NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? location.pathname === item.href
                    : location.pathname.startsWith(item.href);

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-semibold ${
                        isActive
                          ? 'bg-charcoal-950 text-white font-bold shadow-xs'
                          : 'text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-gold-400' : 'text-charcoal-500'}`} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-3 pt-6 border-t border-ivory-200">
              <Link
                to="/"
                className="flex items-center justify-between rounded-xl bg-ivory-50 border border-ivory-300 p-3 text-xs text-charcoal-800"
              >
                <span>Visit Storefront</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-ivory-100">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ivory-300 bg-white/95 px-4 sm:px-8 backdrop-blur-md shadow-2xs">
          {/* Left: Mobile Trigger & Breadcrumbs */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 text-charcoal-700 hover:text-charcoal-950 lg:hidden rounded-lg hover:bg-ivory-100"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-charcoal-500">
              <span className="font-semibold uppercase tracking-widest text-gold-800">Atelier Admin</span>
              {pathSegments.slice(1).map((seg, idx) => (
                <div key={idx} className="flex items-center gap-2 capitalize">
                  <span>/</span>
                  <span className={idx === pathSegments.length - 2 ? 'text-charcoal-950 font-bold' : ''}>
                    {seg.replace(/-/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick profile */}
          <div className="flex items-center gap-3">
            {/* Admin Avatar */}
            <div className="h-8 w-8 rounded-full bg-gold-100 border border-gold-400/60 flex items-center justify-center text-xs font-bold text-gold-900">
              {user?.firstName?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
