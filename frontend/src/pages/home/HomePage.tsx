import { useLayoutEffect, useRef, useState } from 'react';
import { commercePolicy } from '@purvaja/commerce-policy';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Check, Heart, Minus, Plus, Sparkles, Star } from 'lucide-react';
import { HeroSection } from '../../components/home/HeroSection.js';
import type { Shirt } from '../../features/products/types/product.js';
import { useProductsQuery } from '../../features/products/hooks/useProducts.js';
import { PageLoadingFallback } from '../../components/common/PageLoadingFallback.js';
import { useWishlistStore } from '../../store/wishlistStore.js';

gsap.registerPlugin(ScrollTrigger);

const categoryCard1 = '/images/products/artisan-mandala-brown-1.jpg';
const categoryCard2 = '/images/products/forest-floral-green-1.jpg';
const categoryCard3Top = '/images/products/heritage-leaf-brown-1.jpg';
const categoryCard3Bottom = '/images/products/monochrome-abstract-grey-1.jpg';

const ATELIER_STANDARDS = [
  {
    id: 0,
    pill: 'Delivery Coverage',
    question: 'Where do you deliver?',
    answer: 'Checkout currently supports delivery addresses in India.',
    tag: 'Logistics & Delivery',
    badgeTitle: 'Delivery Across India',
    image: '/images/products/egyptian-linen-ivory-1.jpg',
  },
  {
    id: 1,
    pill: `${commercePolicy.returnWindowDays}-Day Return Requests`,
    question: 'What is your return policy?',
    answer: `Eligible delivered orders can be requested for return within ${commercePolicy.returnWindowDays} days of verified delivery.`,
    tag: 'Client Assurance',
    badgeTitle: `${commercePolicy.returnWindowDays}-Day Return Requests`,
    image: '/images/products/natural-linen-cream-1.jpg',
  },
  {
    id: 2,
    pill: 'Precision Fit Guide',
    question: 'How do I choose the right size?',
    answer:
      'Select from the sizes listed on the product page and check the product fit and details before ordering.',
    tag: 'Tailoring Matrix',
    badgeTitle: 'Collar & Sizing Precision',
    image: '/images/products/terra-striped-brown-1.jpg',
  },
] as const;

function ProductCard({ shirt, className = '' }: { shirt: Shirt; className?: string }) {
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isWishlisted = useWishlistStore((state) => state.isInWishlist(shirt.id));

  return (
    <article className={`group ${className}`}>
      <div className="relative overflow-hidden rounded-[26px] border border-ivory-300 bg-white p-3.5 shadow-[0_12px_32px_rgba(26,26,26,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold-500/40 hover:shadow-[0_22px_55px_rgba(26,26,26,0.08)]">
        <Link to={`/shirts/${shirt.slug}`} className="block">
          <div className="relative aspect-[0.92] overflow-hidden rounded-[20px] bg-ivory-200">
            <img
              src={shirt.images[0]}
              alt={shirt.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
              loading="lazy"
            />
            
            {/* Badges */}
            {(shirt.isNewArrival || (shirt.compareAtPrice && shirt.compareAtPrice > shirt.price)) && (
              <div className="absolute left-3 top-3 flex gap-2">
                <span className="rounded-full bg-charcoal-950/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ivory-100 backdrop-blur-sm">
                  {shirt.isNewArrival ? 'New' : 'Sale'}
                </span>
              </div>
            )}
          </div>
        </Link>

        <div className="px-1.5 pb-1 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-700">{shirt.fabric}</p>
            <button
              type="button"
              onClick={() => toggleWishlist(shirt.id)}
              className="text-charcoal-400 transition-colors hover:text-gold-700"
              aria-label="Toggle wishlist"
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-gold-600 text-gold-600' : ''}`} />
            </button>
          </div>

          <Link to={`/shirts/${shirt.slug}`} className="block">
            <h3 className="line-clamp-1 font-serif text-base font-bold text-charcoal-950 transition-colors group-hover:text-gold-700">
              {shirt.name}
            </h3>
          </Link>

          <div className="mt-3 flex items-center justify-between border-t border-ivory-300 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-sm font-bold tabular-nums text-charcoal-950">
                ₹{shirt.price.toLocaleString('en-IN')}
              </span>
              {shirt.compareAtPrice && (
                <span className="text-xs tabular-nums text-charcoal-400 line-through">
                  ₹{shirt.compareAtPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-charcoal-600">
              <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
              <span className="font-medium">{shirt.rating}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const revealRefs = useRef<HTMLElement[]>([]);
  const [openFaq, setOpenFaq] = useState<number>(0);
  const { data: products = [], isPending, isError } = useProductsQuery({ limit: 10, sort: 'featured' });

  const heroProduct = products[0];
  const collectionProducts = products.slice(0, 10);

  const addRevealRef = (element: HTMLElement | null) => {
    if (!element) return;
    if (!revealRefs.current.includes(element)) {
      revealRefs.current.push(element);
    }
  };

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      revealRefs.current.forEach((element) => {
        gsap.from(element, {
          y: 48,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 82%',
          },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const activeStandard = ATELIER_STANDARDS[openFaq] ?? ATELIER_STANDARDS[0];

  if (isPending) return <PageLoadingFallback />;
  if (isError || !heroProduct) {
    return <div className="py-24 text-center text-body text-charcoal-600">The collection is temporarily unavailable. Please try again shortly.</div>;
  }

  return (
    <div ref={rootRef} className="bg-ivory-100 text-charcoal-900">
      <HeroSection featuredProducts={products} />

      {/* 3-Column Curated Menswear Categories Matching Atelier Theme */}
      <section ref={addRevealRef} className="px-4 py-8 sm:py-12 lg:px-10 lg:py-16">
        <div className="mx-auto grid max-w-[1720px] gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Formal & Evening Menswear */}
          <div className="group relative h-[420px] xs:h-[480px] sm:h-[520px] lg:h-[550px] overflow-hidden rounded-[24px] sm:rounded-[28px] border border-ivory-300 bg-charcoal-950 shadow-[0_16px_40px_rgba(26,26,26,0.06)]">
            <img
              src={categoryCard1}
              alt="Formal and Evening Menswear Shirting"
              className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/85 via-charcoal-950/20 to-black/10" />
            
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-ivory-100">
              <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-gold-300">
                Tailored Evening
              </span>
              <h3 className="mt-1.5 font-serif text-2xl font-light text-ivory-100 sm:text-3xl">
                The Formal Classic
              </h3>
              <p className="mt-1.5 sm:mt-2 text-xs leading-relaxed text-ivory-200/75 sm:text-sm line-clamp-2">
                Browse formal shirts currently available in the catalogue.
              </p>
              <Link
                to="/shop?category=formal"
                className="mt-4 sm:mt-5 inline-flex w-full items-center justify-center rounded-full bg-white/95 px-6 py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-charcoal-950 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95 text-center"
              >
                Explore Formal Edit
              </Link>
            </div>
          </div>

          {/* Card 2: Smart Casual & Linen Menswear */}
          <div className="group relative h-[420px] xs:h-[480px] sm:h-[520px] lg:h-[550px] overflow-hidden rounded-[24px] sm:rounded-[28px] border border-ivory-300 bg-charcoal-950 shadow-[0_16px_40px_rgba(26,26,26,0.06)]">
            <img
              src={categoryCard2}
              alt="Smart Casual and Linen Menswear"
              className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/85 via-charcoal-950/20 to-black/10" />
            
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-ivory-100">
              <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-gold-300">
                Leisure & Resort
              </span>
              <h3 className="mt-1.5 font-serif text-2xl font-light text-ivory-100 sm:text-3xl">
                Browse by Fabric
              </h3>
              <p className="mt-1.5 sm:mt-2 text-xs leading-relaxed text-ivory-200/75 sm:text-sm line-clamp-2">
                Filter the current catalogue by fabric and fit.
              </p>
              <Link
                to="/shop?category=casual"
                className="mt-4 sm:mt-5 inline-flex w-full items-center justify-center rounded-full bg-white/95 px-6 py-3 sm:py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-charcoal-950 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95 text-center"
              >
                Explore Casual Edit
              </Link>
            </div>
          </div>

          {/* Card 3: Stacked 2 Menswear Cards */}
          <div className="flex h-auto md:col-span-2 lg:col-span-1 flex-col gap-4 sm:gap-5 md:flex-row lg:flex-col">
            {/* Top Sub-card */}
            <div className="group relative flex min-h-[220px] sm:min-h-[240px] flex-1 items-center justify-between overflow-hidden rounded-[24px] sm:rounded-[26px] border border-ivory-300 bg-white p-5 sm:p-6 shadow-[0_12px_28px_rgba(26,26,26,0.03)] transition-all duration-300 hover:border-gold-500/40 hover:shadow-[0_18px_40px_rgba(26,26,26,0.06)]">
              <div className="z-10 flex-1 pr-3 max-w-[62%]">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-gold-700">Menswear Classic</p>
                <h3 className="mt-1 font-serif text-lg sm:text-xl lg:text-2xl font-medium leading-tight text-charcoal-950">
                  Browse by Fabric
                </h3>
                <p className="mt-1 text-xs text-charcoal-500 line-clamp-1">Compare current fabrics and fits</p>
                <Link
                  to="/shop"
                  className="mt-3 sm:mt-4 inline-flex items-center justify-center rounded-full border border-charcoal-900/15 bg-ivory-100 px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal-900 shadow-sm transition-colors hover:border-charcoal-950 hover:bg-charcoal-950 hover:text-white"
                >
                  Shop Now
                </Link>
              </div>
              <div className="absolute -bottom-2 right-2 h-[88%] w-[38%] overflow-hidden rounded-[18px] sm:rounded-[20px]">
                <img
                  src={categoryCard3Top}
                  alt="Shirt from the current collection"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Bottom Sub-card */}
            <div className="group relative flex min-h-[220px] sm:min-h-[240px] flex-1 items-center justify-between overflow-hidden rounded-[24px] sm:rounded-[26px] border border-ivory-300 bg-white p-5 sm:p-6 shadow-[0_12px_28px_rgba(26,26,26,0.03)] transition-all duration-300 hover:border-gold-500/40 hover:shadow-[0_18px_40px_rgba(26,26,26,0.06)]">
              <div className="z-10 flex-1 pr-3 max-w-[62%]">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-gold-700">Casual Luxury</p>
                <h3 className="mt-1 font-serif text-lg sm:text-xl lg:text-2xl font-medium leading-tight text-charcoal-950">
                  Current Collection
                </h3>
                <p className="mt-1 text-xs text-charcoal-500 line-clamp-1">Available fabrics and variants</p>
                <Link
                  to="/shop"
                  className="mt-3 sm:mt-4 inline-flex items-center justify-center rounded-full border border-charcoal-900/15 bg-ivory-100 px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal-900 shadow-sm transition-colors hover:border-charcoal-950 hover:bg-charcoal-950 hover:text-white"
                >
                  Shop Now
                </Link>
              </div>
              <div className="absolute -bottom-2 right-2 h-[88%] w-[38%] overflow-hidden rounded-[18px] sm:rounded-[20px]">
                <img
                  src={categoryCard3Bottom}
                  alt="Current shirt collection"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR COLLECTION Section — Seamless Auto-Scrolling Menswear Carousel */}
      <section ref={addRevealRef} className="overflow-hidden py-10 sm:py-14">
        <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-10">
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-charcoal-900/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-700">Curated Atelier Lineup</p>
              <h2 className="mt-2 font-serif text-4xl font-light tracking-tight text-charcoal-950 sm:text-5xl lg:text-6xl">
                Our Collection
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <p className="hidden max-w-sm text-xs leading-relaxed text-charcoal-500 sm:block">
                Continuous rotation of current catalogue products. Hover on any piece to pause and explore.
              </p>
              <Link
                to="/shop"
                className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-charcoal-950 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-ivory-100 shadow-sm transition-all duration-300 hover:bg-charcoal-800 hover:shadow-md"
              >
                View All
              </Link>
            </div>
          </div>
        </div>

        {/* Auto-scrolling infinite product track */}
        <div className="relative w-full overflow-hidden">
          {/* Subtle edge fade gradients */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-ivory-100 to-transparent sm:w-16 lg:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-ivory-100 to-transparent sm:w-16 lg:w-24" />

          <div className="animate-product-scroll flex gap-5 px-4 py-2">
            {/* Duplicated items for smooth infinite loop */}
            {[...collectionProducts, ...collectionProducts].map((shirt, idx) => (
              <ProductCard
                key={`${shirt.id}-${idx}`}
                shirt={shirt}
                className="w-[280px] sm:w-[320px] lg:w-[340px] flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </section>

      {/* MERGED INTERACTIVE SERVICE & CRAFT EXPERIENCE — LIGHT THEME */}
      <section ref={addRevealRef} className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-editorial overflow-hidden rounded-[30px] border border-ivory-300 bg-white shadow-[0_20px_60px_rgba(26,26,26,0.06)]">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Side: Interactive Tabs & FAQ Accordion in Light Theme */}
            <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/35 bg-gold-50 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-gold-800 shadow-sm">
                    Atelier Standards & Care
                  </span>
                </div>

                <h2 className="mt-4 font-serif text-3xl font-light tracking-tight text-charcoal-950 sm:text-4xl lg:text-5xl">
                  Service feels
                  <span className="ml-3 italic text-gold-700">premium too</span>
                </h2>
                <p className="mt-3 max-w-lg text-xs leading-relaxed text-charcoal-600 sm:text-sm">
                  Review the current delivery coverage, return window, and fit information before ordering.
                </p>

                {/* Interactive Feature Category Pills (Accurately synchronized) */}
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {ATELIER_STANDARDS.map((standard) => {
                    const isActive = openFaq === standard.id;
                    return (
                      <button
                        key={standard.id}
                        type="button"
                        onClick={() => setOpenFaq(standard.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 ${
                          isActive
                            ? 'bg-charcoal-950 text-white shadow-md'
                            : 'border border-charcoal-900/15 bg-ivory-100/80 text-charcoal-700 hover:border-charcoal-950 hover:bg-white'
                        }`}
                      >
                        <span className={`text-[9px] ${isActive ? 'text-gold-400' : 'text-gold-600'}`}>✦</span>
                        {standard.pill}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive FAQ Accordion */}
                <div className="mt-7 space-y-3 border-t border-ivory-300 pt-5">
                  {ATELIER_STANDARDS.map((standard) => {
                    const isOpen = openFaq === standard.id;
                    return (
                      <div
                        key={standard.id}
                        className={`overflow-hidden rounded-[20px] border transition-all duration-300 ${
                          isOpen
                            ? 'border-gold-500/40 bg-[#FAF7F2] shadow-sm'
                            : 'border-ivory-300 bg-white hover:border-charcoal-900/25'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? -1 : standard.id)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal-900">
                            {standard.question}
                          </span>
                          <span
                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                              isOpen ? 'bg-gold-500 text-charcoal-950 shadow-sm' : 'bg-ivory-200 text-charcoal-600'
                            }`}
                          >
                            {isOpen ? (
                              <Minus className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-ivory-300/80 px-5 py-4">
                            <p className="max-w-lg text-xs leading-relaxed text-charcoal-600 sm:text-sm">
                              {standard.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Feature Highlights */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ivory-300 pt-5 text-xs text-charcoal-600">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500/20 text-gold-700">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>Eligible return requests within {commercePolicy.returnWindowDays} days of verified delivery</span>
                </div>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-700 transition-colors hover:text-gold-900 hover:underline"
                >
                  Explore Catalog <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Side: Dynamic Interactive Preview Image in Light Theme */}
            <div className="relative min-h-[380px] p-4 lg:min-h-[460px] lg:p-6">
              <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-[24px] bg-ivory-200 shadow-inner">
                <img
                  key={activeStandard.id}
                  src={activeStandard.image}
                  alt={activeStandard.badgeTitle}
                  className="h-full w-full object-cover object-center transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 via-transparent to-transparent" />

                {/* Floating Dynamic Highlight Badge */}
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/40 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-700">
                        {activeStandard.tag}
                      </span>
                      <p className="mt-1 font-serif text-base font-bold text-charcoal-950 sm:text-lg">
                        {activeStandard.badgeTitle}
                      </p>
                    </div>
                    <Link
                      to="/shop"
                      className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-charcoal-950 text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-gold-500 hover:text-charcoal-950"
                      aria-label="Explore collection"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIP WARDROBE CALL TO ACTION BANNER */}
      <section ref={addRevealRef} className="px-4 pb-16 pt-4 sm:px-6 lg:px-10 lg:pb-24">
        <div className="mx-auto max-w-editorial overflow-hidden rounded-[32px] border border-charcoal-900/20 bg-charcoal-950 px-6 py-12 text-center text-ivory-100 shadow-2xl sm:px-10 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-2xl">
            {/* VIP Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.26em] text-gold-300 shadow-sm">
              <Sparkles className="h-3 w-3 text-gold-400" />
              Explore the Collection
            </div>

            {/* Headline */}
            <h2 className="mt-6 font-serif text-3xl font-light uppercase tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-tight">
              Upgrade Your Shirt<br />
              <span className="font-serif italic font-normal text-gold-400">Wardrobe Today</span>
            </h2>

            {/* Subtitle */}
            <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-ivory-200/80 sm:text-sm md:text-base">
              Browse the current catalogue, compare available variants, and review delivery options at checkout.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              <Link
                to="/shop"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-charcoal-950 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95 sm:px-9 sm:py-4"
              >
                Shop All Shirts <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <Link
                to="/shop"
                className="group inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-ivory-100 backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white/10 active:scale-95 sm:px-9 sm:py-4"
              >
                View Categories
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
