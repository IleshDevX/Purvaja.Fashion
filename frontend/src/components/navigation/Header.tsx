import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../../store/cartStore.js';
import { useWishlistStore } from '../../store/wishlistStore.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';

const NAV_LINKS = [
  { label: 'New In', href: '/new-arrivals' },
  { label: 'Shop All', href: '/shop' },
  { label: 'Collections', href: '/shop' },
  { label: 'Deals', href: '/deals' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const cartCount = useCartStore(s => s.getItemCount());
  const setCartDrawerOpen = useCartStore(s => s.setDrawerOpen);
  const wishlistCount = useWishlistStore(s => s.getItemCount());
  const { user, status } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(26,26,26,0.06)] border-b border-ivory-300'
            : 'bg-white/90 backdrop-blur-md border-b border-charcoal-900/5'
        }`}
      >
        <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-charcoal-700 hover:text-charcoal-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <Link
              to="/"
              className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-950 hover:text-gold-700 transition-colors select-none"
            >
              PURVAJA
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-10" aria-label="Main navigation">
              <div className="relative group">
                <Link
                  to="/shop"
                  className="font-serif text-lg font-medium tracking-[0.03em] text-charcoal-950 hover:text-gold-700 transition-colors hover-underline-animation py-6"
                >
                  Shop
                </Link>

                {/* Mega Menu Dropdown — Solid Opaque Luxury Background with Clear Large Typography */}
                <div className="absolute top-full -left-12 w-[880px] bg-white border border-ivory-300 shadow-[0_30px_70px_rgba(26,26,26,0.14)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-8 rounded-2xl">
                  <div className="grid grid-cols-4 gap-8 text-left">
                    <div>
                      <h4 className="font-serif text-xl mb-4 text-charcoal-950 font-bold border-b border-ivory-300 pb-2.5 tracking-wide">
                        Fit
                      </h4>
                      <ul className="space-y-3 text-sm text-charcoal-700 font-medium">
                        <li>
                          <Link to="/shop?fit=Slim" className="hover:text-gold-700 transition-colors block">
                            Slim Fit
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?fit=Regular" className="hover:text-gold-700 transition-colors block">
                            Regular Fit
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?fit=Tailored" className="hover:text-gold-700 transition-colors block">
                            Tailored Fit
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-serif text-xl mb-4 text-charcoal-950 font-bold border-b border-ivory-300 pb-2.5 tracking-wide">
                        Fabric
                      </h4>
                      <ul className="space-y-3 text-sm text-charcoal-700 font-medium">
                        <li>
                          <Link to="/shop?fabric=Oxford" className="hover:text-gold-700 transition-colors block">
                            Oxford
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?fabric=Silk" className="hover:text-gold-700 transition-colors block">
                            Silk Blend
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?fabric=Linen" className="hover:text-gold-700 transition-colors block">
                            Linen
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?fabric=Poplin" className="hover:text-gold-700 transition-colors block">
                            Poplin
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-serif text-xl mb-4 text-charcoal-950 font-bold border-b border-ivory-300 pb-2.5 tracking-wide">
                        Occasion
                      </h4>
                      <ul className="space-y-3 text-sm text-charcoal-700 font-medium">
                        <li>
                          <Link to="/shop?occasion=Business" className="hover:text-gold-700 transition-colors block">
                            Business
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?occasion=Casual" className="hover:text-gold-700 transition-colors block">
                            Weekend Casual
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop?occasion=Evening" className="hover:text-gold-700 transition-colors block">
                            Evening Essential
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <div className="relative overflow-hidden aspect-[4/5] rounded-xl border border-ivory-300 bg-ivory-200 group/card">
                      <img
                        src="/images/products/artisan-mandala-brown-1.jpg"
                        alt="The Oxford Edit"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-charcoal-950/20 to-transparent" />
                      <div className="absolute bottom-3.5 left-3.5 text-ivory-100">
                        <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-gold-300">Featured</p>
                        <p className="font-serif text-base font-bold text-white">The Oxford Edit</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                to="/new-arrivals"
                className="font-serif text-lg font-medium tracking-[0.03em] text-charcoal-950 hover:text-gold-700 transition-colors hover-underline-animation"
              >
                New Arrivals
              </Link>
              <Link
                to="/shop"
                className="font-serif text-lg font-medium tracking-[0.03em] text-charcoal-950 hover:text-gold-700 transition-colors hover-underline-animation"
              >
                Our Story
              </Link>
              <Link
                to="/deals"
                className="font-serif text-lg font-medium tracking-[0.03em] text-charcoal-950 hover:text-gold-700 transition-colors hover-underline-animation"
              >
                Journal
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {(user?.role === 'admin' || user?.email?.includes('admin')) && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300 border border-gold-500/40 hover:bg-gold-500 hover:text-charcoal-950 transition-colors shadow-2xs"
                  title="Atelier Admin Control Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                  <span>Admin</span>
                </Link>
              )}

              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-charcoal-800 hover:text-gold-700 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <Link
                to={status === 'authenticated' ? '/account' : '/auth/login'}
                className="p-2 text-charcoal-800 hover:text-gold-700 transition-colors hidden sm:block"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>

              <Link
                to="/wishlist"
                className="p-2 text-charcoal-800 hover:text-gold-700 transition-colors relative hidden sm:block"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-gold-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setCartDrawerOpen(true)}
                className="p-2 text-charcoal-800 hover:text-gold-700 transition-colors relative"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-charcoal-900 text-ivory-100 text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Full-Screen Search Overlay ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-ivory-100/98 backdrop-blur-lg flex flex-col animate-fade-in">
          <div className="max-w-content mx-auto w-full px-6 pt-20 pb-10 flex-1">
            <div className="flex justify-end mb-8">
              <button
                onClick={() => setSearchOpen(false)}
                className="p-2 text-charcoal-500 hover:text-charcoal-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSearch} className="mb-12">
              <div className="border-b-2 border-charcoal-900 pb-3">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shirts, fabrics, styles..."
                  className="w-full bg-transparent text-display-lg font-serif text-charcoal-900 placeholder:text-charcoal-300 outline-none"
                />
              </div>
            </form>
            <div>
              <h3 className="text-overline text-charcoal-400 mb-4">Popular Searches</h3>
              <div className="flex flex-wrap gap-3">
                {['Egyptian Cotton', 'Linen', 'Formal Shirts', 'Slim Fit', 'New Arrivals'].map(term => (
                  <button
                    key={term}
                    onClick={() => { navigate(`/shop?search=${encodeURIComponent(term)}`); setSearchOpen(false); }}
                    className="px-4 py-2 border border-charcoal-200 text-body-sm text-charcoal-600 hover:border-charcoal-900 hover:text-charcoal-900 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full-Screen Mobile Navigation ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[55] bg-ivory-100 flex flex-col animate-fade-in lg:hidden">
          <div className="flex items-center justify-between px-5 h-16">
            <Link to="/" className="font-serif text-xl font-medium text-charcoal-900">
              PURVAJA
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-charcoal-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-8 gap-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-serif text-3xl text-charcoal-900 hover:text-gold-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="divider-editorial my-4" />
            <Link
              to={status === 'authenticated' ? '/account' : '/auth/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="text-body text-charcoal-500 hover:text-charcoal-900 transition-colors"
            >
              {status === 'authenticated' ? `Hello, ${user?.firstName}` : 'Sign In'}
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="text-body text-charcoal-500 hover:text-charcoal-900 transition-colors"
            >
              Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
            </Link>
          </nav>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="h-16 lg:h-20" />
    </>
  );
}
