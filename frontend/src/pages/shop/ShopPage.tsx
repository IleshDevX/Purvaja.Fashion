import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  Star,
  Heart,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ShirtFit, ShirtFabric, ShirtSize, ShirtSortOption } from '../../features/products/types/product.js';
import { CATALOG_FABRICS, CATALOG_FITS, CATALOG_SIZES, parseCatalogUrlState, serializeCatalogUrlState, type CatalogUrlState } from '../../features/products/utils/catalogUrlState.js';
import { useProductsPaginatedQuery } from '../../features/products/hooks/useProducts.js';
import { useWishlistStore } from '../../store/wishlistStore.js';
import { useToast } from '../../app/providers.js';
import { Dialog } from '../../components/ui/Dialog.js';

const FITS = CATALOG_FITS;
const FABRICS = CATALOG_FABRICS;
const SIZES = CATALOG_SIZES;

function paginationItems(totalPages: number, currentPage: number): Array<number | string> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visible = [...pages].filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | string> = [];
  for (const page of visible) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && page - previous > 1) items.push(`ellipsis-${previous}`);
    items.push(page);
  }
  return items;
}

export function ShopPage({
  defaultNewArrivalsOnly = false,
  defaultDealsOnly = false,
}: {
  defaultNewArrivalsOnly?: boolean;
  defaultDealsOnly?: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const toggleWishlist = useWishlistStore(s => s.toggleWishlist);
  const isInWishlist = useWishlistStore(s => s.isInWishlist);

  const defaults = { newArrivals: defaultNewArrivalsOnly, deals: defaultDealsOnly };
  const catalog = parseCatalogUrlState(searchParams, defaults);
  const { search: searchQuery, fits: selectedFits, fabrics: selectedFabrics, sizes: selectedSizes,
    inStock: onlyInStock, newArrivals: onlyNewArrivals, deals: onlyDeals, sort: sortBy, page: currentPage } = catalog;
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const updateCatalog = (change: Partial<CatalogUrlState>, resetPage=true) => {
    setSearchParams(serializeCatalogUrlState({...catalog,...change,page:resetPage?1:(change.page??catalog.page)},defaults));
  };

  // Click outside to close sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const SORT_OPTIONS: { value: ShirtSortOption; label: string }[] = [
    { value: 'featured', label: 'Featured Curations' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'discount', label: 'Highest Discount' },
  ];

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Featured Curations';
  const PAGE_LIMIT = 12;
  const { data: paginationResult, isPending, isError, error: queryError, refetch } = useProductsPaginatedQuery({
    page: currentPage,
    limit: PAGE_LIMIT,
    search: searchQuery || undefined,
    category: catalog.category,
    fit: selectedFits,
    fabric: selectedFabrics,
    size: selectedSizes,
    inStock: onlyInStock || undefined,
    newArrivals: onlyNewArrivals || undefined,
    deals: onlyDeals || undefined,
    sort: sortBy,
  });

  const filteredShirts = paginationResult?.items ?? [];
  const totalPages = paginationResult?.totalPages ?? 1;
  const totalCount = paginationResult?.total ?? 0;

  useEffect(() => {
    if (paginationResult && currentPage > Math.max(1, paginationResult.totalPages)) {
      setSearchParams(previous => {
        const routeDefaults={newArrivals:defaultNewArrivalsOnly,deals:defaultDealsOnly};
        const current=parseCatalogUrlState(previous,routeDefaults);
        return serializeCatalogUrlState({...current,page:Math.max(1,paginationResult.totalPages)},routeDefaults);
      });
    }
  }, [currentPage, paginationResult, setSearchParams, defaultNewArrivalsOnly, defaultDealsOnly]);

  const toggleFit = (fit: ShirtFit) => {
    updateCatalog({fits:selectedFits.includes(fit)?selectedFits.filter(f=>f!==fit):[...selectedFits,fit]});
  };

  const toggleFabric = (fabric: ShirtFabric) => {
    updateCatalog({fabrics:selectedFabrics.includes(fabric)?selectedFabrics.filter(f=>f!==fabric):[...selectedFabrics,fabric]});
  };

  const toggleSize = (size: ShirtSize) => {
    updateCatalog({sizes:selectedSizes.includes(size)?selectedSizes.filter(s=>s!==size):[...selectedSizes,size]});
  };

  const clearAllFilters = () => {
    updateCatalog({search:'',category:undefined,fits:[],fabrics:[],sizes:[],inStock:false,newArrivals:false,deals:false,sort:'featured'});
  };

  const hasActiveFilters =
    selectedFits.length > 0 ||
    selectedFabrics.length > 0 ||
    selectedSizes.length > 0 ||
    onlyInStock ||
    onlyNewArrivals ||
    onlyDeals ||
    searchQuery.length > 0;

  const totalActiveFiltersCount =
    selectedFits.length +
    selectedFabrics.length +
    selectedSizes.length +
    (onlyInStock ? 1 : 0) +
    (onlyNewArrivals ? 1 : 0) +
    (onlyDeals ? 1 : 0);

  return (
    <div className="min-h-screen bg-ivory-100 py-8 lg:py-12 text-charcoal-900">
      <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-10 xl:px-12">
        {/* Editorial Page Header */}
        <div className="mb-8 border-b border-ivory-300 pb-6 lg:mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-700">
            Curated Atelier Lineup
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-charcoal-950 sm:text-4xl lg:text-5xl">
                {defaultNewArrivalsOnly
                  ? 'New Arrivals 2026'
                  : defaultDealsOnly
                  ? 'Curated Offers & Deals'
                  : searchQuery
                  ? `Search: "${searchQuery}"`
                  : 'Menswear Collection'}
              </h1>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-charcoal-500 sm:text-sm">
                Impeccably tailored shirts woven with premium Egyptian cotton, European linen, and structured collars for an effortless sartorial presence.
              </p>
            </div>

            {/* Mobile Filter Toggle & Quick Stats */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-charcoal-900/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-charcoal-900 shadow-sm transition-colors hover:border-charcoal-950 lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters {totalActiveFiltersCount > 0 && `(${totalActiveFiltersCount})`}</span>
              </button>

              <p className="text-xs text-charcoal-500">
                Showing <span className="font-bold text-charcoal-950">{filteredShirts.length}</span> pieces
              </p>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr] lg:gap-10 items-start">
          
          {/* ── LEFT SIDE FILTER PANEL (Sticky Desktop) ── */}
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <div className="rounded-[26px] border border-ivory-300 bg-white p-6 shadow-[0_12px_32px_rgba(26,26,26,0.03)] space-y-7">
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-ivory-300 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gold-700" />
                  <h3 className="font-serif text-lg font-bold text-charcoal-950">Refine Selection</h3>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-charcoal-400 hover:text-gold-700 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>

              {/* 1. Quick Filters / Badges */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-3">
                  Highlights
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => updateCatalog({newArrivals:!onlyNewArrivals})}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      onlyNewArrivals
                        ? 'bg-charcoal-950 text-white shadow-sm'
                        : 'border border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-900/30 hover:bg-white'
                    }`}
                  >
                    <span>New In Season</span>
                    {onlyNewArrivals && <Check className="h-3.5 w-3.5 text-gold-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateCatalog({deals:!onlyDeals})}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      onlyDeals
                        ? 'bg-charcoal-950 text-white shadow-sm'
                        : 'border border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-900/30 hover:bg-white'
                    }`}
                  >
                    <span>Special Deals</span>
                    {onlyDeals && <Check className="h-3.5 w-3.5 text-gold-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateCatalog({inStock:!onlyInStock})}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      onlyInStock
                        ? 'bg-charcoal-950 text-white shadow-sm'
                        : 'border border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-900/30 hover:bg-white'
                    }`}
                  >
                    <span>In Stock Only</span>
                    {onlyInStock && <Check className="h-3.5 w-3.5 text-gold-400" />}
                  </button>
                </div>
              </div>

              {/* 2. Fit Profile */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-3">
                  Fit Profile
                </p>
                <div className="flex flex-col gap-2">
                  {FITS.map(fit => {
                    const isSelected = selectedFits.includes(fit);
                    return (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => toggleFit(fit)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-charcoal-950 text-white shadow-sm'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-900/30 hover:bg-white'
                        }`}
                      >
                        <span>{fit} Fit</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-gold-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Luxury Fabric */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-3">
                  Luxury Fabric
                </p>
                <div className="flex flex-col gap-1.5">
                  {FABRICS.map(fabric => {
                    const isSelected = selectedFabrics.includes(fabric);
                    return (
                      <button
                        key={fabric}
                        type="button"
                        onClick={() => toggleFabric(fabric)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium transition-all text-left ${
                          isSelected
                            ? 'bg-[#FAF7F2] border border-gold-500/50 text-charcoal-950 font-bold shadow-xs'
                            : 'text-charcoal-600 hover:bg-ivory-50 hover:text-charcoal-950'
                        }`}
                      >
                        <span>{fabric}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-gold-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Collar / Chest Sizes */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-3">
                  Collar & Chest Size
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map(size => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`rounded-xl py-2 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                          isSelected
                            ? 'bg-charcoal-950 text-white shadow-sm'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-900/30 hover:bg-white'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ── RIGHT SIDE PRODUCT CATALOG AREA ── */}
          <div>
            {/* Active Filters Bar & Sort Selector */}
            <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-ivory-300 bg-white p-3.5 sm:p-4 shadow-[0_8px_20px_rgba(26,26,26,0.02)]">
              {/* Active Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {hasActiveFilters ? (
                  <>
                    <span className="font-serif text-xs sm:text-sm font-semibold tracking-wider text-gold-700 mr-1 uppercase">
                      Active:
                    </span>
                    {selectedFits.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFit(f)}
                        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-charcoal-950 border border-charcoal-800 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-ivory-100 shadow-xs hover:border-gold-500 hover:text-gold-300 transition-all"
                      >
                        {f} <X className="h-3 w-3 text-gold-400" />
                      </button>
                    ))}
                    {selectedFabrics.map(fab => (
                      <button
                        key={fab}
                        type="button"
                        onClick={() => toggleFabric(fab)}
                        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-charcoal-950 border border-charcoal-800 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-ivory-100 shadow-xs hover:border-gold-500 hover:text-gold-300 transition-all"
                      >
                        {fab} <X className="h-3 w-3 text-gold-400" />
                      </button>
                    ))}
                    {selectedSizes.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-charcoal-950 border border-charcoal-800 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-ivory-100 shadow-xs hover:border-gold-500 hover:text-gold-300 transition-all"
                      >
                        {s} <X className="h-3 w-3 text-gold-400" />
                      </button>
                    ))}
                    {onlyNewArrivals && (
                      <button
                        type="button"
                        onClick={() => updateCatalog({newArrivals:false})}
                        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-charcoal-950 border border-charcoal-800 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-ivory-100 shadow-xs hover:border-gold-500 hover:text-gold-300 transition-all"
                      >
                        New <X className="h-3 w-3 text-gold-400" />
                      </button>
                    )}
                    {onlyDeals && (
                      <button
                        type="button"
                        onClick={() => updateCatalog({deals:false})}
                        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-charcoal-950 border border-charcoal-800 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-ivory-100 shadow-xs hover:border-gold-500 hover:text-gold-300 transition-all"
                      >
                        Deals <X className="h-3 w-3 text-gold-400" />
                      </button>
                    )}
                    {onlyInStock && (
                      <button
                        type="button"
                        onClick={() => updateCatalog({inStock:false})}
                        className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-charcoal-950 border border-charcoal-800 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-ivory-100 shadow-xs hover:border-gold-500 hover:text-gold-300 transition-all"
                      >
                        In Stock <X className="h-3 w-3 text-gold-400" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="font-serif text-xs font-semibold text-charcoal-500 hover:text-gold-700 underline underline-offset-4 ml-1 transition-colors"
                    >
                      Clear All
                    </button>
                  </>
                ) : (
                  <p className="font-serif text-xs sm:text-sm text-charcoal-600 font-medium">
                    Showing all handcrafted menswear shirting ({filteredShirts.length})
                  </p>
                )}
              </div>

              {/* Custom Luxury Sort Selector */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 relative" ref={sortRef}>
                <span className="font-serif text-xs sm:text-sm font-medium text-charcoal-600">Sort:</span>
                <div className="relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className="w-full sm:w-auto inline-flex items-center justify-between gap-3 rounded-xl bg-ivory-50 px-3.5 sm:px-4 py-2 border border-ivory-300 font-serif text-xs sm:text-sm font-semibold text-charcoal-950 transition-all hover:border-gold-500 hover:bg-white shadow-2xs"
                  >
                    <span>{currentSortLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-charcoal-600 transition-transform duration-200 ${sortDropdownOpen ? 'rotate-180 text-gold-700' : ''}`} />
                  </button>

                  {sortDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-ivory-300 bg-white p-2 shadow-[0_20px_50px_rgba(26,26,26,0.14)] z-50 animate-scale-in">
                      <div className="space-y-1">
                        {SORT_OPTIONS.map(option => {
                          const isSelected = sortBy === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                updateCatalog({sort:option.value});
                                setSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 font-serif text-sm transition-all text-left ${
                                isSelected
                                  ? 'bg-charcoal-950 text-white font-medium shadow-xs'
                                  : 'text-charcoal-800 hover:bg-ivory-100 hover:text-gold-700'
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-gold-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products Grid / Empty State */}
            {isPending ? (
              <div className="rounded-[24px] border border-ivory-300 bg-white p-16 text-center text-sm text-charcoal-500">Loading collection…</div>
            ) : isError ? (
              <div role="alert" className="space-y-4 rounded-[24px] border border-rose-200 bg-white p-16 text-center">
                <p className="text-sm text-rose-800">{queryError instanceof Error ? queryError.message : 'The collection could not be loaded.'}</p>
                <button type="button" onClick={() => void refetch()} className="rounded-full bg-charcoal-950 px-6 py-3 text-xs font-bold text-white">Retry</button>
              </div>
            ) : filteredShirts.length === 0 ? (
              <div className="py-16 sm:py-20 text-center rounded-[24px] sm:rounded-[26px] border border-ivory-300 bg-white p-6 sm:p-8">
                <h3 className="font-serif text-xl sm:text-2xl font-light text-charcoal-950 mb-2">No matching pieces</h3>
                <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto mb-6">
                  We couldn't find shirts matching your exact filter combination. Try clearing some filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-full bg-charcoal-950 px-6 sm:px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-md hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
                {filteredShirts.map(shirt => {
                  const discount = shirt.compareAtPrice
                    ? Math.round(((shirt.compareAtPrice - shirt.price) / shirt.compareAtPrice) * 100)
                    : 0;
                  const inWishlist = isInWishlist(shirt.id);

                  return (
                    <article key={shirt.id} className="group flex flex-col">
                      <div className="relative overflow-hidden rounded-[18px] sm:rounded-[24px] border border-ivory-300 bg-white p-2.5 sm:p-3.5 shadow-[0_10px_28px_rgba(26,26,26,0.03)] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold-500/40 hover:shadow-[0_20px_50px_rgba(26,26,26,0.08)] flex-1 flex flex-col justify-between">
                        <div>
                          {/* Image Container */}
                          <Link to={`/shirts/${shirt.slug}`} className="block">
                            <div className="relative aspect-[0.92] overflow-hidden rounded-[14px] sm:rounded-[18px] bg-ivory-200">
                              <img
                                src={shirt.images[0]}
                                alt={shirt.name}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                                loading="lazy"
                              />

                              {/* Badges */}
                              <div className="absolute left-2 sm:left-3 top-2 sm:top-3 flex flex-col gap-1 sm:gap-1.5">
                                {shirt.isNewArrival && (
                                  <span className="rounded-full bg-charcoal-950/90 px-2 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-ivory-100 backdrop-blur-sm">
                                    NEW
                                  </span>
                                )}
                                {discount > 0 && (
                                  <span className="rounded-full bg-gold-600/90 px-2 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                                    −{discount}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>

                          {/* Metadata */}
                          <div className="px-1 sm:px-1.5 pb-1 pt-3 sm:pt-4">
                            <div className="mb-1 sm:mb-1.5 flex items-center justify-between gap-2">
                              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-gold-700 truncate">
                                {shirt.fabric}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const added = toggleWishlist(shirt.id);
                                  addToast(
                                    added
                                      ? `Added "${shirt.name}" to wishlist.`
                                      : `Removed "${shirt.name}" from wishlist.`,
                                    'info',
                                  );
                                }}
                                className="text-charcoal-400 transition-colors hover:text-gold-700 shrink-0 p-0.5"
                                aria-label="Toggle wishlist"
                              >
                                <Heart className={`h-3.5 sm:h-4 w-3.5 sm:w-4 ${inWishlist ? 'fill-gold-600 text-gold-600' : ''}`} />
                              </button>
                            </div>

                            <Link to={`/shirts/${shirt.slug}`} className="block">
                              <h3 className="line-clamp-1 font-serif text-sm sm:text-lg font-medium text-charcoal-950 transition-colors group-hover:text-gold-700">
                                {shirt.name}
                              </h3>
                            </Link>
                            <p className="mt-0.5 sm:mt-1 line-clamp-1 text-[11px] sm:text-xs text-charcoal-500 hidden xs:block">{shirt.tagline}</p>
                          </div>
                        </div>

                        {/* Price & Rating */}
                        <div className="mt-2.5 sm:mt-4 flex items-center justify-between border-t border-ivory-300 px-1 sm:px-1.5 pt-2.5 sm:pt-3">
                          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                            <span className="font-sans text-xs sm:text-sm font-bold tabular-nums text-charcoal-950">
                              ₹{shirt.price.toLocaleString('en-IN')}
                            </span>
                            {shirt.compareAtPrice && (
                              <span className="text-[10px] sm:text-xs tabular-nums text-charcoal-400 line-through">
                                ₹{shirt.compareAtPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {shirt.rating > 0 && (
                            <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs text-charcoal-600">
                              <Star className="h-3 sm:h-3.5 w-3 sm:w-3.5 fill-gold-500 text-gold-500" />
                              <span className="font-medium">{shirt.rating}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 pt-8 border-t border-ivory-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs font-medium text-charcoal-500">
                  Showing <span className="font-bold text-charcoal-900">{(currentPage - 1) * PAGE_LIMIT + 1}</span>–
                  <span className="font-bold text-charcoal-900">{Math.min(currentPage * PAGE_LIMIT, totalCount)}</span> of{' '}
                  <span className="font-bold text-charcoal-900">{totalCount}</span> artisanal pieces
                </p>

                <nav aria-label="Catalog pagination" className="flex w-full items-center justify-center gap-1.5 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      updateCatalog({page:Math.max(1,currentPage-1)},false);
                      window.scrollTo({ top: 160, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    aria-label="Previous catalog page"
                    className="inline-flex h-11 min-w-11 items-center justify-center gap-1 px-2 sm:px-3 text-xs font-semibold rounded-lg border border-ivory-300 bg-white text-charcoal-700 hover:bg-ivory-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {paginationItems(totalPages, currentPage).map(item => typeof item === 'number' ? (
                        <button
                          key={item}
                          type="button"
                          aria-label={`Catalog page ${item}`}
                          aria-current={currentPage === item ? 'page' : undefined}
                          onClick={() => {
                            updateCatalog({page:item},false);
                            window.scrollTo({ top: 160, behavior: 'smooth' });
                          }}
                          className={`${currentPage === item ? 'flex' : 'hidden sm:flex'} h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                            currentPage === item
                              ? 'bg-charcoal-950 text-white shadow-2xs'
                              : 'border border-ivory-300 bg-white text-charcoal-700 hover:bg-ivory-100'
                          }`}
                        >
                          {item}
                        </button>
                      ) : <span key={item} aria-hidden="true" className="hidden px-1 text-charcoal-400 sm:inline">…</span>)}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateCatalog({page:Math.min(totalPages,currentPage+1)},false);
                      window.scrollTo({ top: 160, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    aria-label="Next catalog page"
                    className="inline-flex h-11 min-w-11 items-center justify-center gap-1 px-2 sm:px-3 text-xs font-semibold rounded-lg border border-ivory-300 bg-white text-charcoal-700 hover:bg-ivory-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE FILTER DRAWER OVERLAY ── */}
        <Dialog open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)} labelledBy="mobile-filter-title"
          overlayClassName="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm animate-fade-in lg:hidden"
          panelClassName="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between border-b border-ivory-300 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gold-700" />
                  <h3 id="mobile-filter-title" className="font-serif text-lg font-bold text-charcoal-950">Filters</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  aria-label="Close filters"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal-500 hover:bg-ivory-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Filter Options */}
              <div className="space-y-6 flex-1">
                {/* Highlights */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-2.5">
                    Highlights
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => updateCatalog({newArrivals:!onlyNewArrivals})}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                        onlyNewArrivals ? 'bg-charcoal-950 text-white' : 'border border-ivory-300 bg-ivory-50 text-charcoal-700'
                      }`}
                    >
                      <span>New In Season</span>
                      {onlyNewArrivals && <Check className="h-3.5 w-3.5 text-gold-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCatalog({deals:!onlyDeals})}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                        onlyDeals ? 'bg-charcoal-950 text-white' : 'border border-ivory-300 bg-ivory-50 text-charcoal-700'
                      }`}
                    >
                      <span>Special Deals</span>
                      {onlyDeals && <Check className="h-3.5 w-3.5 text-gold-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCatalog({inStock:!onlyInStock})}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                        onlyInStock ? 'bg-charcoal-950 text-white' : 'border border-ivory-300 bg-ivory-50 text-charcoal-700'
                      }`}
                    >
                      <span>In Stock Only</span>
                      {onlyInStock && <Check className="h-3.5 w-3.5 text-gold-400" />}
                    </button>
                  </div>
                </div>

                {/* Fits */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-2.5">
                    Fit Profile
                  </p>
                  <div className="flex flex-col gap-2">
                    {FITS.map(fit => {
                      const isSelected = selectedFits.includes(fit);
                      return (
                        <button
                          key={fit}
                          type="button"
                          onClick={() => toggleFit(fit)}
                          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                            isSelected
                              ? 'bg-charcoal-950 text-white'
                              : 'border border-ivory-300 bg-ivory-50 text-charcoal-700'
                          }`}
                        >
                          <span>{fit} Fit</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-gold-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fabrics */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-2.5">
                    Luxury Fabric
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {FABRICS.map(fabric => (
                      <button
                        key={fabric}
                        type="button"
                        onClick={() => toggleFabric(fabric)}
                        className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-xs ${
                          selectedFabrics.includes(fabric)
                            ? 'bg-[#FAF7F2] border border-gold-500 text-charcoal-950 font-bold'
                            : 'text-charcoal-600 hover:bg-ivory-50'
                        }`}
                      >
                        <span>{fabric}</span>
                        {selectedFabrics.includes(fabric) && <Check className="h-3.5 w-3.5 text-gold-700" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizes */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 mb-2.5">
                    Sizes
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`rounded-xl py-2 text-xs font-bold ${
                          selectedSizes.includes(size)
                            ? 'bg-charcoal-950 text-white'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-700'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="mt-8 pt-4 border-t border-ivory-300 flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex-1 rounded-full border border-ivory-300 py-3 text-xs font-bold uppercase tracking-[0.16em] text-charcoal-800"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 rounded-full bg-charcoal-950 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white"
                >
                  Apply
                </button>
              </div>
        </Dialog>
      </div>
    </div>
  );
}
