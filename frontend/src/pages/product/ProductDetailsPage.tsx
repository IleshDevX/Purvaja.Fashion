import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Ruler,
  ChevronRight,
  Minus,
  Plus,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { DEVELOPMENT_SHIRTS } from '../../features/products/data/shirts.js';
import { ShirtColor, ShirtSize } from '../../features/products/types/product.js';
import { useCartStore } from '../../store/cartStore.js';
import { useWishlistStore } from '../../store/wishlistStore.js';
import { useToast } from '../../app/providers.js';

export function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const addItem = useCartStore(s => s.addItem);
  const toggleWishlist = useWishlistStore(s => s.toggleWishlist);
  const isInWishlist = useWishlistStore(s => s.isInWishlist);

  // Find product by id or slug
  const shirt = useMemo(() => {
    if (!productId) return null;
    const target = productId.toLowerCase();
    return (
      DEVELOPMENT_SHIRTS.find(
        s => s.id.toLowerCase() === target || s.slug.toLowerCase() === target,
      ) || null
    );
  }, [productId]);

  // Selected state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ShirtColor | null>(() => shirt?.colors[0] || null);
  const [selectedSize, setSelectedSize] = useState<ShirtSize | null>(() => shirt?.sizes[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'care' | 'sizing'>('details');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');

  // Sample reviews
  const [reviews, setReviews] = useState([
    {
      id: 'rev-1',
      author: 'Vikramaditya S.',
      rating: 5,
      date: 'Aug 14, 2026',
      title: 'Spectacular texture and drape',
      comment:
        'The collar holds its structure perfectly under a tailored blazer, while the cotton feels buttery soft against the skin.',
    },
    {
      id: 'rev-2',
      author: 'Sameer N.',
      rating: 5,
      date: 'Aug 02, 2026',
      title: 'True luxury at an honest price',
      comment:
        'Easily rivals Italian custom bespoke shirts. Stitch density is immaculate and size 40 is spot on.',
    },
  ]);

  if (!shirt) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-6">
        <h2 className="font-serif text-display text-charcoal-900 mb-4">Piece Not Found</h2>
        <p className="text-body text-charcoal-500 mb-8">
          The requested shirt could not be found in our current archives.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold hover:bg-charcoal-800 transition-colors"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const currentColor = selectedColor || shirt.colors[0] || { name: 'Standard', hex: '#000000' };
  const currentSize = selectedSize || shirt.sizes[0] || '39 (M)';
  const inWishlist = isInWishlist(shirt.id);

  const discount = shirt.compareAtPrice
    ? Math.round(((shirt.compareAtPrice - shirt.price) / shirt.compareAtPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    addItem({
      shirtId: shirt.id,
      name: shirt.name,
      slug: shirt.slug,
      image: shirt.images[0] || '',
      price: shirt.price,
      compareAtPrice: shirt.compareAtPrice,
      color: currentColor,
      size: currentSize,
      quantity,
    });
    addToast(`Added ${quantity} × "${shirt.name}" (${currentSize}) to your bag.`, 'success');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    setReviews(prev => [
      {
        id: `rev-${Date.now()}`,
        author: newReviewAuthor.trim(),
        rating: newReviewRating,
        date: 'Today',
        title: 'Verified Customer Review',
        comment: newReviewComment.trim(),
      },
      ...prev,
    ]);

    addToast('Thank you! Your verified review has been published.', 'success');
    setReviewModalOpen(false);
    setNewReviewAuthor('');
    setNewReviewComment('');
  };

  const relatedShirts = DEVELOPMENT_SHIRTS.filter(
    s => s.id !== shirt.id && (s.fabric === shirt.fabric || s.fit === shirt.fit),
  ).slice(0, 4);

  return (
    <div className="py-4 lg:py-8">
      <div className="max-w-editorial mx-auto px-4 sm:px-6 lg:px-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-caption text-charcoal-400 mb-4 sm:mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-charcoal-800 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/shop" className="hover:text-charcoal-800 transition-colors">
            Shirts
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-medium truncate max-w-xs">{shirt.name}</span>
        </nav>

        {/* ── Main Editorial Split Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* LEFT: Image Sequence & Hero Stage (6 cols) */}
          <div className="lg:col-span-6 flex flex-col-reverse lg:flex-row gap-3 sm:gap-4 items-start">
            {/* Thumbnails */}
            <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible no-scrollbar pb-1 lg:pb-0 shrink-0">
              {shirt.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 sm:w-16 aspect-[3/4] bg-ivory-200 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    selectedImageIndex === idx
                      ? 'border-charcoal-900 opacity-100 shadow-2xs'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover object-top" />
                </button>
              ))}
            </div>

            {/* Hero Stage Image with Contrained Viewport Height */}
            <div className="flex-1 w-full relative aspect-[3/4] max-h-[58vh] sm:max-h-[62vh] lg:max-h-[65vh] bg-ivory-200 rounded-2xl overflow-hidden shadow-subtle flex items-center justify-center">
              <img
                src={shirt.images[selectedImageIndex] || shirt.images[0]}
                alt={shirt.name}
                className="w-full h-full object-cover object-top"
              />
              {shirt.isNewArrival && (
                <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal-900 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-sm shadow-2xs">
                  New Arrival
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: Sticky Product Information Panel (6 cols) */}
          <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-4 sm:space-y-5">
            <div>
              <div className="flex items-center justify-between text-caption text-gold-600 font-medium mb-1">
                <span className="tracking-widest uppercase">{shirt.fabric} · {shirt.fit} Fit</span>
                {shirt.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                    <span className="text-charcoal-700 font-medium">{shirt.rating}</span>
                    <span className="text-charcoal-400">({reviews.length})</span>
                  </div>
                )}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-charcoal-900 mb-1.5 leading-tight">
                {shirt.name}
              </h1>
              <p className="text-body-sm text-charcoal-500">{shirt.tagline}</p>
            </div>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 pb-3 border-b border-ivory-300">
              <span className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-charcoal-900 tabular-nums">
                ₹{shirt.price.toLocaleString('en-IN')}
              </span>
              {shirt.compareAtPrice && (
                <>
                  <span className="font-sans text-base sm:text-lg text-charcoal-400 font-medium line-through tabular-nums">
                    ₹{shirt.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-bold text-gold-700 bg-gold-100 px-2 py-0.5 rounded-xs tracking-wider uppercase">
                    Save {discount}%
                  </span>
                </>
              )}
            </div>

            {/* Color Swatches */}
            {shirt.colors.length > 0 && (
              <div>
                <label className="block text-overline text-charcoal-500 mb-1.5">
                  Fabric Color: <span className="text-charcoal-900 font-normal">{currentColor.name}</span>
                </label>
                <div className="flex items-center gap-2.5">
                  {shirt.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all p-0.5 ${
                        currentColor.name === color.name
                          ? 'border-charcoal-900 scale-110 shadow-2xs'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector + Size Guide Trigger */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-overline text-charcoal-500">Select Size</label>
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-charcoal-600 hover:text-charcoal-900 underline underline-offset-4"
                >
                  <Ruler className="w-3 h-3" /> Size Guide
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {shirt.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-2 text-caption font-medium border transition-all rounded-xs ${
                      currentSize === size
                        ? 'border-charcoal-900 bg-charcoal-900 text-ivory-100 font-bold'
                        : 'border-ivory-300 bg-ivory-50 text-charcoal-800 hover:border-charcoal-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div>
              <label className="block text-overline text-charcoal-500 mb-1.5">Quantity</label>
              <div className="inline-flex items-center border border-ivory-300 bg-ivory-50 rounded-xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-charcoal-600 hover:text-charcoal-900"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-body-sm font-semibold text-charcoal-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 text-charcoal-600 hover:text-charcoal-900"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2.5 pt-1">
              <div className="flex gap-2.5">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 bg-charcoal-900 text-ivory-100 text-xs sm:text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors shadow-subtle rounded-xs"
                >
                  ADD TO SHOPPING BAG
                </button>
                <button
                  onClick={() => {
                    const added = toggleWishlist(shirt.id);
                    addToast(
                      added ? 'Added to your wishlist.' : 'Removed from your wishlist.',
                      'info',
                    );
                  }}
                  className={`p-3 border border-ivory-400 transition-colors flex items-center justify-center rounded-xs ${
                    inWishlist
                      ? 'bg-gold-50 border-gold-500 text-gold-600'
                      : 'hover:border-charcoal-900 text-charcoal-700'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${inWishlist ? 'fill-gold-600' : ''}`} />
                </button>
              </div>
              <button
                onClick={handleBuyNow}
                className="w-full py-2.5 border-2 border-charcoal-900 bg-transparent text-charcoal-900 text-xs sm:text-body-sm font-semibold tracking-wider hover:bg-charcoal-900 hover:text-ivory-100 transition-all rounded-xs"
              >
                BUY NOW WITH 1-CLICK
              </button>
            </div>

            {/* Assurance Badges */}
            <div className="pt-6 border-t border-ivory-300 grid grid-cols-2 gap-4 text-caption text-charcoal-600">
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-gold-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-charcoal-900 block">Complimentary Shipping</span>
                  <span>On orders above ₹2,500</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-gold-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-charcoal-900 block">7-Day Easy Returns</span>
                  <span>Doorstep pickup & swap</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Editorial Accordion Tabs (Craft, Fabric, Care) ── */}
        <div className="mt-16 lg:mt-24 pt-12 border-t border-ivory-300 max-w-4xl mx-auto">
          <div className="flex justify-center border-b border-ivory-300 mb-8 gap-8">
            {[
              { id: 'details', label: 'Craft & Description' },
              { id: 'care', label: 'Care Instructions' },
              { id: 'sizing', label: 'Fit & Silhouette' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'details' | 'care' | 'sizing')}
                className={`pb-3 text-caption-editorial tracking-widest transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-charcoal-900 font-semibold border-b-2 border-charcoal-900'
                    : 'text-charcoal-400 hover:text-charcoal-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-4">
            {activeTab === 'details' && (
              <div className="space-y-4 text-body text-charcoal-600 leading-relaxed">
                <p>{shirt.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-ivory-200">
                  <div>
                    <span className="text-overline text-charcoal-400 block mb-1">Collar</span>
                    <span className="font-medium text-charcoal-900">{shirt.collar}</span>
                  </div>
                  <div>
                    <span className="text-overline text-charcoal-400 block mb-1">Sleeve</span>
                    <span className="font-medium text-charcoal-900">{shirt.sleeve}</span>
                  </div>
                  <div>
                    <span className="text-overline text-charcoal-400 block mb-1">Pattern</span>
                    <span className="font-medium text-charcoal-900">{shirt.pattern}</span>
                  </div>
                  <div>
                    <span className="text-overline text-charcoal-400 block mb-1">Fabric</span>
                    <span className="font-medium text-charcoal-900">{shirt.fabric}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'care' && (
              <div className="space-y-3">
                <p className="text-body text-charcoal-600 mb-4">
                  To preserve the luster, weave integrity, and crispness of your shirt:
                </p>
                <ul className="space-y-2 text-body-sm text-charcoal-600">
                  {shirt.careInstructions.map((instruction, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-gold-600 flex-shrink-0" />
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'sizing' && (
              <div className="space-y-4 text-body text-charcoal-600">
                <p>
                  Tailored in a <strong className="text-charcoal-900">{shirt.fit} fit</strong>. Cut with
                  precision across the chest and waist while ensuring natural movement.
                </p>
                <div className="bg-ivory-50 p-4 border border-ivory-200 text-caption text-charcoal-500">
                  Note: If you fall between two collar sizes, we recommend choosing the larger collar
                  for comfortable neck closure with ties.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Client Reviews & Ratings Section ── */}
        <div className="mt-16 lg:mt-24 pt-12 border-t border-ivory-300 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-overline text-gold-600 mb-1">Verified Client Voices</p>
              <h2 className="font-serif text-display text-charcoal-900">Reviews & Ratings</h2>
            </div>
            <button
              onClick={() => setReviewModalOpen(true)}
              className="px-6 py-2.5 border border-charcoal-900 text-body-sm font-medium text-charcoal-900 hover:bg-charcoal-900 hover:text-ivory-100 transition-all self-start"
            >
              Write a Review
            </button>
          </div>

          <div className="space-y-6">
            {reviews.map(rev => (
              <div key={rev.id} className="p-6 bg-ivory-50 border border-ivory-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                    ))}
                  </div>
                  <span className="text-caption text-charcoal-400">{rev.date}</span>
                </div>
                <h4 className="font-serif text-heading text-charcoal-900">{rev.title}</h4>
                <p className="text-body-sm text-charcoal-600 leading-relaxed">{rev.comment}</p>
                <p className="text-caption font-medium text-charcoal-800 pt-2">{rev.author}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Curated Companions (Related Products) ── */}
        {relatedShirts.length > 0 && (
          <div className="mt-20 lg:mt-28 pt-16 border-t border-ivory-300">
            <div className="text-center mb-12">
              <p className="text-overline text-gold-600 mb-2">Complete the Look</p>
              <h2 className="font-serif text-display text-charcoal-900">You May Also Admire</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedShirts.map(rel => (
                <Link key={rel.id} to={`/shirts/${rel.slug}`} className="group block">
                  <div className="aspect-[3/4] bg-ivory-200 overflow-hidden mb-3">
                    <img
                      src={rel.images[0]}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <h3 className="text-body-sm font-medium text-charcoal-900 group-hover:text-gold-600 transition-colors line-clamp-1">
                    {rel.name}
                  </h3>
                  <p className="text-body-sm text-charcoal-900 font-sans font-bold tabular-nums mt-1">
                    ₹{rel.price.toLocaleString('en-IN')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Size Guide Modal */}
        {sizeGuideOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-ivory-100 w-full max-w-lg p-6 shadow-overlay border border-ivory-300 relative animate-scale-in">
              <button
                onClick={() => setSizeGuideOpen(false)}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-serif text-heading-lg text-charcoal-900 mb-1">Tailored Size Chart</h3>
              <p className="text-caption text-charcoal-500 mb-4">Measurements in inches</p>
              <div className="overflow-x-auto">
                <table className="w-full text-caption text-charcoal-800 border-collapse">
                  <thead>
                    <tr className="border-b border-ivory-300 text-left bg-ivory-200">
                      <th className="py-2 px-3">Size</th>
                      <th className="py-2 px-3">Collar</th>
                      <th className="py-2 px-3">Chest</th>
                      <th className="py-2 px-3">Waist</th>
                      <th className="py-2 px-3">Sleeve</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-ivory-200">
                      <td className="py-2 px-3 font-semibold">38 (S)</td>
                      <td className="py-2 px-3">15"</td>
                      <td className="py-2 px-3">39"</td>
                      <td className="py-2 px-3">35"</td>
                      <td className="py-2 px-3">32.5"</td>
                    </tr>
                    <tr className="border-b border-ivory-200">
                      <td className="py-2 px-3 font-semibold">39 (M)</td>
                      <td className="py-2 px-3">15.5"</td>
                      <td className="py-2 px-3">41"</td>
                      <td className="py-2 px-3">37"</td>
                      <td className="py-2 px-3">33"</td>
                    </tr>
                    <tr className="border-b border-ivory-200">
                      <td className="py-2 px-3 font-semibold">40 (M)</td>
                      <td className="py-2 px-3">16"</td>
                      <td className="py-2 px-3">43"</td>
                      <td className="py-2 px-3">39"</td>
                      <td className="py-2 px-3">33.5"</td>
                    </tr>
                    <tr className="border-b border-ivory-200">
                      <td className="py-2 px-3 font-semibold">42 (L)</td>
                      <td className="py-2 px-3">16.5"</td>
                      <td className="py-2 px-3">45"</td>
                      <td className="py-2 px-3">41"</td>
                      <td className="py-2 px-3">34"</td>
                    </tr>
                    <tr className="border-b border-ivory-200">
                      <td className="py-2 px-3 font-semibold">44 (XL)</td>
                      <td className="py-2 px-3">17.5"</td>
                      <td className="py-2 px-3">48"</td>
                      <td className="py-2 px-3">44"</td>
                      <td className="py-2 px-3">34.5"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-ivory-100 w-full max-w-md p-6 shadow-overlay border border-ivory-300 relative animate-scale-in">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-serif text-heading-lg text-charcoal-900 mb-1">Write a Review</h3>
              <p className="text-body-sm text-charcoal-500 mb-4">
                Share your impressions on fabric, fit, and craftsmanship.
              </p>
              <form onSubmit={handleAddReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-caption text-charcoal-600 mb-1">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setNewReviewRating(r)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            r <= newReviewRating
                              ? 'fill-gold-500 text-gold-500'
                              : 'text-charcoal-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-caption text-charcoal-600 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={newReviewAuthor}
                    onChange={e => setNewReviewAuthor(e.target.value)}
                    placeholder="e.g. Vikramaditya S."
                    className="w-full px-3 py-2 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 outline-none focus:border-charcoal-900"
                  />
                </div>
                <div>
                  <label className="block text-caption text-charcoal-600 mb-1">Review Comments</label>
                  <textarea
                    rows={4}
                    required
                    value={newReviewComment}
                    onChange={e => setNewReviewComment(e.target.value)}
                    placeholder="Tell us about the drape, stitching, and feel..."
                    className="w-full px-3 py-2 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 outline-none focus:border-charcoal-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wide hover:bg-charcoal-800 transition-colors"
                >
                  Submit Verified Review
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
