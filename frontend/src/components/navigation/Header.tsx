import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../../store/cartStore.js';
import { useWishlistStore } from '../../store/wishlistStore.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { DEVELOPMENT_SHIRTS } from '../../features/products/data/shirts.js';

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

  const liveSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return DEVELOPMENT_SHIRTS.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.fabric.toLowerCase().includes(q) ||
        s.fit.toLowerCase().includes(q) ||
        s.collar.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [searchOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              {(user?.role === 'admin' || user?.email?.includes('admin')) && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-2.5 sm:px-3.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300 border border-gold-500/40 hover:bg-gold-500 hover:text-charcoal-950 transition-colors shadow-2xs"
                  title="Atelier Admin Control Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                  <span className="hidden xs:inline">Admin</span>
                </Link>
              )}

              <button
                onClick={() => setSearchOpen(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-charcoal-800 hover:text-gold-700 transition-colors rounded-full hover:bg-ivory-100/60"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <Link
                to={status === 'authenticated' ? '/account' : '/auth/login'}
                className="w-10 h-10 sm:w-11 sm:h-11 hidden sm:flex items-center justify-center text-charcoal-800 hover:text-gold-700 transition-colors rounded-full hover:bg-ivory-100/60"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>

              <Link
                to="/wishlist"
                className="w-10 h-10 sm:w-11 sm:h-11 hidden sm:flex items-center justify-center text-charcoal-800 hover:text-gold-700 transition-colors relative rounded-full hover:bg-ivory-100/60"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-gold-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setCartDrawerOpen(true)}
                className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-charcoal-800 hover:text-gold-700 transition-colors relative rounded-full hover:bg-ivory-100/60"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-charcoal-900 text-ivory-100 text-[10px] font-semibold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Elevated Luxury Search Modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] bg-charcoal-950/70 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-16 p-3 sm:p-4 animate-fade-in overflow-y-auto"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-ivory-300 shadow-2xl p-4 sm:p-8 space-y-4 sm:space-y-6 animate-scale-in relative text-charcoal-950 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ivory-200 pb-3 sm:pb-4">
              <div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.26em] text-gold-700 font-sans">
                  Atelier Search
                </p>
                <h2 className="font-serif text-xl sm:text-3xl font-light tracking-tight text-charcoal-950 mt-0.5">
                  Search Menswear
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-2 text-charcoal-400 hover:text-charcoal-950 hover:bg-ivory-100 rounded-full transition-colors"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Solid Search Input Bar */}
            <form onSubmit={handleSearch}>
              <div className="relative flex items-center bg-ivory-50 border-2 border-ivory-300 focus-within:border-charcoal-950 focus-within:bg-white rounded-xl sm:rounded-2xl px-3.5 py-2.5 sm:py-3.5 transition-all shadow-2xs">
                <Search className="w-4 sm:w-5 h-4 sm:h-5 text-charcoal-400 mr-2.5 sm:mr-3 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by shirt name, fabric, or style (e.g. Linen, Slim Fit)..."
                  className="w-full bg-transparent text-xs sm:text-base font-medium text-charcoal-950 placeholder:text-charcoal-400 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-charcoal-400 hover:text-charcoal-950"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Dynamic Results / Popular Curations */}
            {searchQuery.trim() ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-charcoal-500 font-medium">
                  <span>Matching Pieces ({liveSearchResults.length})</span>
                  {liveSearchResults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSearch()}
                      className="text-gold-800 font-bold hover:underline"
                    >
                      View all in Shop →
                    </button>
                  )}
                </div>

                {liveSearchResults.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-xs text-charcoal-500 bg-ivory-50 rounded-xl sm:rounded-2xl border border-ivory-200">
                    No shirts found matching "{searchQuery}". Try searching for "Linen", "Cotton", or "Slim".
                  </div>
                ) : (
                  <div className="divide-y divide-ivory-200 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                    {liveSearchResults.slice(0, 5).map((shirt) => (
                      <Link
                        key={shirt.id}
                        to={`/shirts/${shirt.slug}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between py-2.5 sm:py-3 px-2 rounded-xl hover:bg-ivory-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={shirt.images[0]}
                            alt={shirt.name}
                            className="h-11 w-9 sm:h-12 sm:w-10 rounded-lg object-cover bg-ivory-100 border border-ivory-300 shrink-0"
                          />
                          <div>
                            <p className="font-serif text-xs sm:text-sm font-bold text-charcoal-950 group-hover:text-gold-700 transition-colors line-clamp-1">
                              {shirt.name}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-charcoal-500">{shirt.fabric} · {shirt.fit} Fit</p>
                          </div>
                        </div>
                        <span className="font-sans text-xs sm:text-sm font-bold tabular-nums text-charcoal-950">
                          ₹{shirt.price.toLocaleString('en-IN')}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 font-sans">
                  Popular Curations
                </h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {['Egyptian Cotton', 'Pure Linen', 'Formal Shirts', 'Slim Fit', 'New Arrivals'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        navigate(`/shop?search=${encodeURIComponent(term)}`);
                        setSearchOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-full bg-ivory-100 border border-ivory-300 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-950 hover:text-white hover:border-charcoal-950 transition-all duration-200"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Full-Screen Mobile Navigation ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[55] bg-ivory-100 flex flex-col animate-fade-in lg:hidden overflow-y-auto pb-safe">
          <div className="flex items-center justify-between px-5 h-16 border-b border-ivory-300/80 bg-white/90 backdrop-blur-md sticky top-0 z-10">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="font-serif text-2xl font-semibold tracking-tight text-charcoal-950">
              PURVAJA
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center text-charcoal-700 hover:text-charcoal-950 rounded-full hover:bg-ivory-200 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 space-y-6">
            <nav className="flex flex-col gap-4 sm:gap-6">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-serif text-2xl sm:text-3xl font-light text-charcoal-950 hover:text-gold-700 transition-colors border-b border-ivory-300/50 pb-3"
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Quick Category Filter Links */}
              <div className="pt-2 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-700 mb-3 font-sans">
                  Quick Filter
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/shop?fabric=Linen"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-ivory-300 text-xs font-semibold text-charcoal-800 hover:border-gold-500 transition-colors"
                  >
                    Pure Linen
                  </Link>
                  <Link
                    to="/shop?fabric=Oxford"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-ivory-300 text-xs font-semibold text-charcoal-800 hover:border-gold-500 transition-colors"
                  >
                    Oxford Weave
                  </Link>
                  <Link
                    to="/shop?fit=Slim"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-ivory-300 text-xs font-semibold text-charcoal-800 hover:border-gold-500 transition-colors"
                  >
                    Slim Fit
                  </Link>
                  <Link
                    to="/shop?fit=Regular"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-ivory-300 text-xs font-semibold text-charcoal-800 hover:border-gold-500 transition-colors"
                  >
                    Regular Fit
                  </Link>
                </div>
              </div>
            </nav>

            <div className="space-y-3 pt-4 border-t border-ivory-300 bg-white/50 -mx-6 -mb-6 p-6 rounded-t-3xl">
              <Link
                to={status === 'authenticated' ? '/account' : '/auth/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-ivory-300 text-sm font-semibold text-charcoal-900 shadow-2xs"
              >
                <span className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-gold-700" />
                  {status === 'authenticated' ? `Hello, ${user?.firstName}` : 'Sign In / Register'}
                </span>
                <span className="text-xs text-gold-700 font-bold">→</span>
              </Link>
              
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-ivory-300 text-sm font-semibold text-charcoal-900 shadow-2xs"
              >
                <span className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-gold-700" />
                  Wishlist
                </span>
                <span className="text-xs bg-gold-100 text-gold-900 px-2 py-0.5 rounded-full font-bold">
                  {wishlistCount}
                </span>
              </Link>

              {(user?.role === 'admin' || user?.email?.includes('admin')) && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-charcoal-950 text-gold-300 text-sm font-bold shadow-md"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gold-400" />
                    Admin Control Center
                  </span>
                  <span className="text-xs">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed header */}
      <div className="h-16 lg:h-20" />
    </>
  );
}
