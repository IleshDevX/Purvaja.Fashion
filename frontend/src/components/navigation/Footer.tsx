import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Globe, Instagram, Linkedin, Twitter, Check } from 'lucide-react';

export function Footer() {
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="bg-ivory-100 px-4 pb-10 pt-4 sm:px-6 lg:px-10 lg:pb-14">
      {/* Floating Modern Luxury Dark Container */}
      <div className="mx-auto max-w-[1720px] rounded-[32px] sm:rounded-[36px] bg-[#121212] border border-white/10 p-8 sm:p-12 lg:p-14 text-ivory-100 shadow-[0_25px_70px_rgba(0,0,0,0.35)] relative overflow-hidden">
        {/* Subtle Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-48 w-96 rounded-full bg-gold-500/10 blur-3xl" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_auto_1fr_1fr_auto_auto] gap-8 lg:gap-10 items-start">
          {/* Column 1: Brand & Newsletter */}
          <div className="max-w-md md:col-span-2 lg:col-span-1">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 group">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold-300 font-serif text-xl font-bold border border-white/10 transition-transform duration-300 group-hover:scale-105">
                P
              </span>
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-white block">
                  PURVAJA
                </span>
                <span className="text-[9px] uppercase tracking-[0.28em] text-gold-400 font-semibold block -mt-0.5">
                  Atelier
                </span>
              </div>
            </Link>

            {/* Headline */}
            <h3 className="mt-5 font-serif text-xl sm:text-2xl lg:text-3xl font-light text-white leading-snug">
              Imaginative menswear <br />
              <span className="italic text-gold-400 font-serif">for refined gentlemen.</span>
            </h3>

            {/* Newsletter Pill Input */}
            <div className="mt-6 sm:mt-8">
              <p className="text-xs font-medium text-ivory-200/70 mb-3">
                Subscribe to our newsletter
              </p>
              <form onSubmit={handleSubscribe} className="relative max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full rounded-full border border-white/15 bg-white/[0.06] py-3 pl-4 sm:pl-5 pr-14 text-xs text-white placeholder:text-white/40 focus:border-gold-400 focus:bg-white/[0.09] focus:outline-none transition-all duration-300"
                  required
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-gold-400 hover:text-charcoal-950 transition-all duration-300 active:scale-95"
                >
                  {subscribed ? <Check className="h-4 w-4 text-gold-300" /> : <ArrowUpRight className="h-4 w-4" />}
                </button>
              </form>
              {subscribed && (
                <p className="mt-2 text-[11px] font-medium text-gold-400 animate-fade-in">
                  Thank you for subscribing to Purvaja Atelier.
                </p>
              )}
            </div>
          </div>

          {/* Vertical Divider 1 */}
          <div className="hidden lg:block h-full min-h-[220px] w-px bg-white/10" />

          {/* Column 2: Navigation Group 1 */}
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-400/80 mb-2 lg:mb-4">
              Atelier Collections
            </p>
            <ul className="space-y-2.5 sm:space-y-3.5 text-xs font-medium text-ivory-200/70 sm:text-sm">
              <li>
                <Link to="/shop?category=formal" className="hover:text-white transition-colors flex items-center gap-1.5">
                  Our Shirting <span className="text-gold-400 text-xs">+</span>
                </Link>
              </li>
              <li>
                <Link to="/shop?category=casual" className="hover:text-white transition-colors">
                  Italian Linen
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  Our Process
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  VIP Club Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Navigation Group 2 */}
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-400/80 mb-2 lg:mb-4">
              Company & Help
            </p>
            <ul className="space-y-2.5 sm:space-y-3.5 text-xs font-medium text-ivory-200/70 sm:text-sm">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  Collar & Fit Guide
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  Client Concierge
                </Link>
              </li>
              <li>
                <Link to="/deals" className="hover:text-white transition-colors">
                  Editorial Journal
                </Link>
              </li>
            </ul>
          </div>

          {/* Vertical Divider 2 */}
          <div className="hidden lg:block h-full min-h-[220px] w-px bg-white/10" />

          {/* Column 4: Stacked Circular Social Icons */}
          <div className="flex flex-row md:col-span-2 lg:col-span-1 lg:flex-col items-center gap-3 pt-2 lg:pt-0">
            {[
              { icon: Globe, label: 'Website', href: 'https://purvajafashion.com' },
              { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
              { icon: Twitter, label: 'Twitter', href: 'https://twitter.com' },
              { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-ivory-200/80 transition-all duration-300 hover:border-gold-400 hover:bg-gold-400 hover:text-charcoal-950 hover:scale-105"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ivory-200/50">
          <p>© {new Date().getFullYear()} Purvaja Fashion Atelier. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-ivory-100 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-ivory-100 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-ivory-100 cursor-pointer transition-colors">Cookie Preferences</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
