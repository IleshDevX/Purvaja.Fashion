import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { Shirt } from '../../features/products/types/product.js';

interface HeroSectionProps {
  featuredProducts: Shirt[];
}

export function HeroSection({ featuredProducts }: HeroSectionProps) {
  const rootRef = useRef<HTMLElement>(null);
  const slides = featuredProducts.slice(0, 4);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Auto-slide interval: Cycles every 2.5 seconds
  useEffect(() => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isPaused || prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.max(1, slides.length));
    }, 2500);

    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const activeProduct = slides[currentSlide] ?? slides[0];
  if (!activeProduct) return null;
  const activeLink = `/shirts/${activeProduct.slug}`;
  const activeImage = activeProduct.images[0] ?? '';

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section
      ref={rootRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full overflow-hidden bg-ivory-100 pt-16 lg:pt-22"
    >
      {/* Main Container */}
      <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="grid min-h-[540px] items-center gap-8 lg:min-h-[630px] lg:grid-cols-[1.1fr_0.9fr] xl:min-h-[670px] xl:grid-cols-[1.12fr_0.88fr]">
          
          {/* Left Column: Synchronized Menswear Typography & Story */}
          <div className="flex flex-col justify-center py-6 sm:py-8 lg:py-10">
            <div className="max-w-[580px]">
              {/* Season Tag */}
              <div className="mb-4 inline-flex items-center gap-2">
                <span
                  key={`tag-${activeProduct.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-white/90 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-gold-700 shadow-sm backdrop-blur-sm transition-all duration-500 animate-fade-in"
                >
                  <Sparkles className="h-3 w-3 text-gold-600" />
                  {activeProduct.isNewArrival ? 'New arrival' : 'Current collection'}
                </span>
              </div>

              {/* Sophisticated Luxury Serif Title with Smooth Transition */}
              <h1 key={`title-${activeProduct.id}`} className="space-y-0 font-serif text-[2.6rem] xs:text-[3.2rem] sm:text-[4.4rem] md:text-[5.2rem] lg:text-[5.8rem] xl:text-[6.6rem] font-light leading-[0.92] tracking-tight text-charcoal-950 break-words animate-fade-in">
                <span className="block overflow-hidden">Discover</span>
                <span className="block overflow-hidden italic text-gold-700">{activeProduct.name}</span>
              </h1>

              {/* Description Paragraph */}
              <p
                key={`desc-${activeProduct.id}`}
                className="mt-4 sm:mt-5 max-w-lg text-xs xs:text-sm leading-relaxed text-charcoal-600 sm:text-base animate-fade-in"
              >
                {activeProduct.description}
              </p>

              {/* Action Buttons & Slide Progress Indicators */}
              <div className="mt-6 sm:mt-7 flex flex-col xs:flex-row flex-wrap items-start xs:items-center gap-4 sm:gap-6">
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 w-full xs:w-auto">
                  <Link
                    to="/shop"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-charcoal-950 px-6 sm:px-8 py-3 sm:py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-ivory-100 shadow-md transition-all duration-300 hover:bg-charcoal-800 hover:shadow-xl active:scale-95 text-center"
                  >
                    Shop Collection <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>

                  <Link
                    to={activeLink}
                    className="group inline-flex items-center justify-center rounded-full border border-charcoal-900/25 bg-white/80 px-6 sm:px-8 py-3 sm:py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-charcoal-900 transition-all duration-300 hover:border-gold-500 hover:bg-charcoal-950 hover:text-white active:scale-95 text-center"
                  >
                    Featured Piece
                  </Link>
                </div>

                {/* 4 Interactive Slide Progress Pills with Accessible Hit Targets */}
                <div className="flex items-center gap-1 pt-1 xs:pt-0" role="tablist" aria-label="Hero carousel slide navigation">
                  {slides.map((product, idx) => {
                    const isActive = currentSlide === idx;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        aria-current={isActive ? 'true' : undefined}
                        className="flex h-11 items-center justify-center px-1.5 focus-visible:outline-offset-2"
                      >
                        <span
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isActive
                              ? 'w-8 bg-charcoal-950'
                              : 'w-2.5 bg-charcoal-900/20 hover:bg-charcoal-900/40'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Feature Badges */}
              <div
                key={`stats-${activeProduct.id}`}
                className="mt-6 sm:mt-8 grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 border-t border-charcoal-900/10 pt-4 sm:pt-5 text-xs text-charcoal-600 sm:gap-8 animate-fade-in"
              >
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400">
                    Fabric
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-charcoal-900 truncate">{activeProduct.fabric}</p>
                </div>
                <div className="hidden sm:block h-7 w-px bg-charcoal-900/10" />
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400">
                    Fit
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-charcoal-900 truncate">{activeProduct.fit}</p>
                </div>
                <div className="hidden sm:block h-7 w-px bg-charcoal-900/10" />
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400">
                    From
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-charcoal-900 truncate">₹{activeProduct.price.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sharp Menswear Editorial Portrait Carousel */}
          <div className="relative h-[340px] xs:h-[400px] sm:h-[480px] lg:h-[600px] xl:h-[650px] w-full">
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-charcoal-200 shadow-[0_20px_50px_rgba(26,26,26,0.1)] lg:rounded-[34px]">
              {/* Cycling Image */}
              <img
                key={`img-${activeProduct.id}`}
                src={activeImage}
                alt={activeProduct.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover object-[center_15%] transition-all duration-700 animate-fade-in"
              />

              {/* Subtle ambient lighting vignette */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-black/10" />

              {/* Manual Controls on Image */}
              <div className="absolute right-5 top-5 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={() => setIsPaused(p => !p)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95 text-xs font-bold"
                  aria-label={isPaused ? "Play hero carousel" : "Pause hero carousel"}
                >
                  {isPaused ? '▶' : '⏸'}
                </button>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Floating Featured Product Card Badge */}
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
                <Link
                  to={activeLink}
                  key={`badge-${activeProduct.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-black/50 px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 hover:bg-black/70 group/badge animate-fade-in"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-lg font-bold text-ivory-100 sm:text-xl group-hover/badge:text-gold-300 transition-colors">
                      {activeProduct.name}
                    </h3>
                  </div>

                  <span
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-charcoal-950 shadow-md transition-all duration-300 group-hover/badge:scale-105 group-hover/badge:bg-gold-400 group-hover/badge:text-charcoal-950"
                    aria-label="View featured piece"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Ticker Tape directly beneath Hero */}
      <div className="mt-8 w-full border-y border-charcoal-900 bg-charcoal-950 py-3 text-white sm:mt-10 sm:py-3.5">
        <div className="animate-marquee whitespace-nowrap text-xs font-semibold uppercase tracking-[0.28em] sm:text-xs">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="mx-4 inline-flex items-center gap-4">
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">LUXURY MENSWEAR</span>
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">PURVAJA ATELIER</span>
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">CURRENT COLLECTION</span>
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">ONLINE CATALOGUE</span>
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">QUIET LUXURY SHIRTING</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
