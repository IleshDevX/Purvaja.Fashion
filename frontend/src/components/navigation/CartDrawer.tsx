import { Link } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore.js';
import { Dialog } from '../ui/Dialog.js';

export function CartDrawer() {
  const { items, isDrawerOpen, setDrawerOpen, removeItem, updateQuantity, getSubtotal, getItemCount, error, isSyncing, syncWithServer } = useCartStore();

  if (!isDrawerOpen) return null;

  const subtotal = getSubtotal();
  const count = getItemCount();

  return (
    <Dialog open={isDrawerOpen} onClose={() => setDrawerOpen(false)} labelledBy="cart-drawer-title"
      overlayClassName="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm animate-fade-in"
      panelClassName="fixed top-0 right-0 bottom-0 z-[75] w-full sm:max-w-md bg-ivory-100 shadow-overlay flex flex-col animate-slide-up pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-ivory-300">
          <div className="flex items-center gap-2">
            <h2 id="cart-drawer-title" className="font-serif text-heading text-charcoal-900">
              Shopping Bag
            </h2>
            <span className="text-caption text-charcoal-400">({count})</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-charcoal-500 hover:text-charcoal-900 transition-colors rounded-full hover:bg-ivory-200"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 custom-scrollbar">
          {error && (
            <div role="alert" className="mb-4 border border-red-300 bg-red-50 px-3 py-2 text-caption text-red-800">
              <p>Your bag could not be synchronized: {error}</p>
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => void syncWithServer().catch(() => undefined)}
                className="mt-1 font-semibold underline disabled:opacity-50"
              >
                {isSyncing ? 'Retrying…' : 'Retry synchronization'}
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <ShoppingBag className="w-12 h-12 text-charcoal-300 mb-4" />
              <p className="font-serif text-heading-lg text-charcoal-400 mb-2">Your bag is empty</p>
              <p className="text-body-sm text-charcoal-400 mb-6">
                Discover our curated collection of premium shirts.
              </p>
              <Link
                to="/shop"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-charcoal-900 text-ivory-100 text-body-sm font-medium hover:bg-charcoal-800 transition-colors rounded-xl"
              >
                Explore Collection <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {items.map(item => (
                <div key={item.id} className="flex gap-3.5 sm:gap-4 p-2 rounded-xl hover:bg-white/40 transition-colors">
                  <Link
                    to={`/shirts/${item.slug}`}
                    onClick={() => setDrawerOpen(false)}
                    className="w-20 h-24 bg-ivory-200 flex-shrink-0 rounded-lg overflow-hidden border border-ivory-300"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/shirts/${item.slug}`}
                      onClick={() => setDrawerOpen(false)}
                      className="text-body-sm font-medium text-charcoal-900 hover:text-gold-600 transition-colors line-clamp-1 block"
                    >
                      {item.name}
                    </Link>
                    <p className="text-caption text-charcoal-400 mt-0.5">
                      {item.color.name} · {item.size}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 sm:w-8 sm:h-8 border border-charcoal-200 rounded-lg flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-body-sm text-charcoal-900 w-6 text-center tabular-nums font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 sm:w-8 sm:h-8 border border-charcoal-200 rounded-lg flex items-center justify-center text-charcoal-600 hover:border-charcoal-400 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-body-sm font-bold text-charcoal-900 tabular-nums">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-charcoal-400 hover:text-error self-start transition-colors rounded-md"
                    aria-label={`Remove ${item.name} from bag`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-ivory-300 px-5 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4 bg-white/60">
            <div className="flex items-center justify-between">
              <span className="text-body text-charcoal-600">Subtotal</span>
              <span className="font-serif text-heading sm:text-heading-lg font-bold text-charcoal-900 tabular-nums">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-caption text-charcoal-400">
              Shipping & taxes calculated at checkout
            </p>
            <Link
              to="/checkout"
              onClick={() => setDrawerOpen(false)}
              className="block w-full py-3.5 bg-charcoal-900 text-ivory-100 text-center text-body-sm font-medium tracking-wide hover:bg-charcoal-800 transition-colors rounded-xl shadow-sm"
            >
              Proceed to Checkout
            </Link>
            <Link
              to="/cart"
              onClick={() => setDrawerOpen(false)}
              className="block w-full py-3 border border-charcoal-300 text-center text-body-sm text-charcoal-700 hover:border-charcoal-600 transition-colors rounded-xl"
            >
              View Full Bag
            </Link>
          </div>
        )}
    </Dialog>
  );
}
