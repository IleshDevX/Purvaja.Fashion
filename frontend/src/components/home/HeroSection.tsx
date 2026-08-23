import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { Shirt } from '../../features/products/types/product.js';

// 4 Curated Luxury Menswear Hero Stories
const HERO_SLIDES = [
  {
    id: 0,
    tag: 'Autumn Winter 2026 · Menswear',
    line1: 'Reflect',
    line2: 'Fashion',
    line3: 'Reframed.',
    description:
      'Sharp shirting, quieter luxury, tailored distinction. Purely menswear essentials crafted with 100% Egyptian cotton for the modern gentleman.',
    stat1Label: 'Material',
    stat1Val: '100% Egyptian Cotton',
    stat2Label: 'Shipping',
    stat2Val: 'Free Delivery ₹2,500+',
    stat3Label: 'Tailoring',
    stat3Val: 'Slim & Regular Cuts',
    badgeTag: "Editor's Choice",
    badgeTitle: 'Artisan Mandala Shirt',
    badgePrice: '₹2,499',
    badgeCompare: '₹3,299',
    link: '/shop?category=formal',
    image: '/images/products/artisan-mandala-brown-1.jpg',
  },
  {
    id: 1,
    tag: 'Resort & Leisure · Italian Weave',
    line1: 'Bespoke',
    line2: 'Linen',
    line3: 'Essence.',
    description:
      'Lightweight Italian linen shirting engineered for warm-weather sophistication, unconstructed tailoring, and breezy elegance.',
    stat1Label: 'Weave',
    stat1Val: '100% Pure Italian Linen',
    stat2Label: 'Comfort',
    stat2Val: 'Breathable Open Weave',
    stat3Label: 'Fit',
    stat3Val: 'Relaxed & Tailored Cuts',
    badgeTag: 'New In Season',
    badgeTitle: 'Heritage Leaf Resort Shirt',
    badgePrice: '₹2,899',
    badgeCompare: '₹3,699',
    link: '/shop?category=casual',
    image: '/images/products/heritage-leaf-brown-1.jpg',
  },
  {
    id: 2,
    tag: 'Savile Row Precision · Evening Edit',
    line1: 'Architectural',
    line2: 'Collar',
    line3: 'Distinction.',
    description:
      'Hand-finished semi-spread collars and mother-of-pearl buttons. Tailored for high-stakes boardrooms, formal galas, and timeless evenings.',
    stat1Label: 'Fabric',
    stat1Val: '2-Ply 100s Giza Cotton',
    stat2Label: 'Collar',
    stat2Val: 'Semi-Spread Stiffened',
    stat3Label: 'Buttons',
    stat3Val: 'Genuine Mother-of-Pearl',
    badgeTag: 'Bespoke Formal',
    badgeTitle: 'Monochrome Abstract Shirt',
    badgePrice: '₹3,299',
    badgeCompare: '₹4,099',
    link: '/shop?category=formal',
    image: '/images/products/monochrome-abstract-grey-1.jpg',
  },
  {
    id: 3,
    tag: 'Modern Signature · Autumn Palette',
    line1: 'Understated',
    line2: 'Quiet',
    line3: 'Luxury.',
    description:
      'Rich botanical earth tones and tactile textures. Meticulously engineered for seamless transition from daytime business to midnight dinners.',
    stat1Label: 'Palette',
    stat1Val: 'Earthy Botanical Print',
    stat2Label: 'Touch',
    stat2Val: 'Silky Soft Cotton Poplin',
    stat3Label: 'Finish',
    stat3Val: 'Hand-Rolled Tailored Hem',
    badgeTag: 'Atelier Signature',
    badgeTitle: 'Forest Floral Green Shirt',
    badgePrice: '₹3,699',
    badgeCompare: '₹4,499',
    link: '/shop?category=casual',
    image: '/images/products/forest-floral-green-1.jpg',
  },
] as const;

interface HeroSectionProps {
  featuredProduct?: Shirt;
}

export function HeroSection({ featuredProduct }: HeroSectionProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto-slide interval: Cycles every 2.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 2500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = HERO_SLIDES[currentSlide];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
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
                  key={`tag-${slide.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-white/90 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-gold-700 shadow-sm backdrop-blur-sm transition-all duration-500 animate-fade-in"
                >
                  <Sparkles className="h-3 w-3 text-gold-600" />
                  {slide.tag}
                </span>
              </div>

              {/* Sophisticated Luxury Serif Title with Smooth Transition */}
              <div key={`title-${slide.id}`} className="space-y-0 tracking-tight animate-fade-in">
                <div className="overflow-hidden">
                  <h1 className="font-serif text-[2.6rem] xs:text-[3.2rem] sm:text-[4.4rem] md:text-[5.2rem] lg:text-[5.8rem] xl:text-[6.6rem] font-light leading-[0.92] text-charcoal-950">
                    {slide.line1}
                  </h1>
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-serif text-[2.6rem] xs:text-[3.2rem] sm:text-[4.4rem] md:text-[5.2rem] lg:text-[5.8rem] xl:text-[6.6rem] font-light leading-[0.92] text-charcoal-950">
                    {slide.line2}
                  </h1>
                </div>
                <div className="overflow-hidden">
                  <h1 className="font-serif text-[2.6rem] xs:text-[3.2rem] sm:text-[4.4rem] md:text-[5.2rem] lg:text-[5.8rem] xl:text-[6.6rem] font-light italic leading-[0.92] text-gold-700">
                    {slide.line3}
                  </h1>
                </div>
              </div>

              {/* Description Paragraph */}
              <p
                key={`desc-${slide.id}`}
                className="mt-4 sm:mt-5 max-w-lg text-xs xs:text-sm leading-relaxed text-charcoal-600 sm:text-base animate-fade-in"
              >
                {slide.description}
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
                    to={slide.link}
                    className="group inline-flex items-center justify-center rounded-full border border-charcoal-900/25 bg-white/80 px-6 sm:px-8 py-3 sm:py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-charcoal-900 transition-all duration-300 hover:border-gold-500 hover:bg-charcoal-950 hover:text-white active:scale-95 text-center"
                  >
                    Featured Piece
                  </Link>
                </div>

                {/* 4 Interactive Slide Progress Pills */}
                <div className="flex items-center gap-2 pt-1 xs:pt-0">
                  {HERO_SLIDES.map((s, idx) => {
                    const isActive = currentSlide === idx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        aria-label={`Go to slide ${idx + 1}`}
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isActive
                            ? 'w-8 bg-charcoal-950'
                            : 'w-2 bg-charcoal-900/20 hover:bg-charcoal-900/40'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Quick Feature Badges */}
              <div
                key={`stats-${slide.id}`}
                className="mt-6 sm:mt-8 grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 border-t border-charcoal-900/10 pt-4 sm:pt-5 text-xs text-charcoal-600 sm:gap-8 animate-fade-in"
              >
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400">
                    {slide.stat1Label}
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-charcoal-900 truncate">{slide.stat1Val}</p>
                </div>
                <div className="hidden sm:block h-7 w-px bg-charcoal-900/10" />
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400">
                    {slide.stat2Label}
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-charcoal-900 truncate">{slide.stat2Val}</p>
                </div>
                <div className="hidden sm:block h-7 w-px bg-charcoal-900/10" />
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.24em] text-charcoal-400">
                    {slide.stat3Label}
                  </p>
                  <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-charcoal-900 truncate">{slide.stat3Val}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sharp Menswear Editorial Portrait Carousel */}
          <div className="relative h-[340px] xs:h-[400px] sm:h-[480px] lg:h-[600px] xl:h-[650px] w-full">
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-charcoal-200 shadow-[0_20px_50px_rgba(26,26,26,0.1)] lg:rounded-[34px]">
              {/* Cycling Image */}
              <img
                key={`img-${slide.id}`}
                src={slide.image}
                alt={slide.badgeTitle}
                className="h-full w-full object-cover object-[center_15%] transition-all duration-700 animate-fade-in"
              />

              {/* Subtle ambient lighting vignette */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-black/10" />

              {/* Manual Arrow Controls on Image */}
              <div className="absolute right-5 top-5 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-gold-400 hover:text-charcoal-950 active:scale-95"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Floating Featured Product Card Badge */}
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6">
                <Link
                  to={slide.link}
                  key={`badge-${slide.id}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-black/50 px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 hover:bg-black/70 group/badge animate-fade-in"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-serif text-lg font-bold text-ivory-100 sm:text-xl group-hover/badge:text-gold-300 transition-colors">
                      {slide.badgeTitle}
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
              <span className="font-serif tracking-[0.2em] text-sm">100% EGYPTIAN COTTON</span>
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">AUTUMN WINTER 2026</span>
              <span className="text-gold-400">✦</span>
              <span className="font-serif tracking-[0.2em] text-sm">QUIET LUXURY SHIRTING</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}


