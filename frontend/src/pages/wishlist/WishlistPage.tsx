import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlistStore } from '../../store/wishlistStore.js';
import { useCartStore } from '../../store/cartStore.js';
import { DEVELOPMENT_SHIRTS } from '../../features/products/data/shirts.js';
import { useToast } from '../../app/providers.js';

export function WishlistPage() {
  const { addToast } = useToast();
  const { savedItemIds, removeFromWishlist, clearWishlist } = useWishlistStore();
  const addItem = useCartStore(s => s.addItem);

  const savedShirts = DEVELOPMENT_SHIRTS.filter(s => savedItemIds.includes(s.id));

  const handleMoveToBag = (shirt: (typeof savedShirts)[0]) => {
    const primaryColor = shirt.colors[0] || { name: 'Standard', hex: '#000000' };
    const primarySize = shirt.sizes[0] || '39 (M)';

    addItem({
      shirtId: shirt.id,
      name: shirt.name,
      slug: shirt.slug,
      image: shirt.images[0] || '',
      price: shirt.price,
      compareAtPrice: shirt.compareAtPrice,
      color: primaryColor,
      size: primarySize,
      quantity: 1,
    });

    removeFromWishlist(shirt.id);
    addToast(`Moved "${shirt.name}" to your shopping bag.`, 'success');
  };

  return (
    <div className="py-8 lg:py-16">
      <div className="max-w-editorial mx-auto px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 lg:mb-12">
          <div>
            <p className="text-overline text-gold-600 mb-2">Saved Archives</p>
            <h1 className="font-serif text-display text-charcoal-900">Your Wishlist</h1>
          </div>
          {savedShirts.length > 0 && (
            <button
              onClick={() => {
                clearWishlist();
                addToast('Wishlist cleared.', 'info');
              }}
              className="text-caption text-charcoal-400 hover:text-error transition-colors underline underline-offset-4 self-start"
            >
              Clear All Saved Pieces
            </button>
          )}
        </div>

        {savedShirts.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-ivory-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-7 h-7 text-charcoal-400" />
            </div>
            <h2 className="font-serif text-display text-charcoal-900 mb-2">No Saved Pieces Yet</h2>
            <p className="text-body text-charcoal-500 mb-8">
              Save your favorite luxury shirts, tailored linen, and formal cotton pieces while you browse.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wide hover:bg-charcoal-800 transition-colors"
            >
              Explore Collection <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {savedShirts.map(shirt => (
              <div key={shirt.id} className="group relative flex flex-col bg-ivory-50 border border-ivory-200">
                <div className="relative aspect-[3/4] bg-ivory-200 overflow-hidden">
                  <Link to={`/shirts/${shirt.slug}`} className="block w-full h-full">
                    <img
                      src={shirt.images[0]}
                      alt={shirt.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </Link>
                  <button
                    onClick={() => {
                      removeFromWishlist(shirt.id);
                      addToast(`Removed "${shirt.name}" from wishlist.`, 'info');
                    }}
                    className="absolute top-3 right-3 z-10 w-8 h-8 bg-ivory-100/90 rounded-full flex items-center justify-center text-charcoal-500 hover:text-error shadow-subtle transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-caption text-charcoal-400 block mb-1">{shirt.fabric}</span>
                    <Link
                      to={`/shirts/${shirt.slug}`}
                      className="font-serif text-heading text-charcoal-900 hover:text-gold-600 transition-colors line-clamp-1 mb-2"
                    >
                      {shirt.name}
                    </Link>
                    <div className="font-sans text-subheading font-bold text-charcoal-900 tabular-nums mb-4">
                      ₹{shirt.price.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleMoveToBag(shirt)}
                    className="w-full py-2.5 bg-charcoal-900 text-ivory-100 text-caption font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> MOVE TO BAG
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
