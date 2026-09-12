import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  Tag,
  Truck,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore.js';
import { useCheckoutStore } from '../../features/checkout/store/checkoutStore.js';
import { calculateOrderPricing } from '../../features/checkout/utils/pricing.js';
import { useProductsQuery } from '../../features/products/hooks/useProducts.js';
import { useToast } from '../../app/providers.js';

export function CartPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { items, removeItem, updateQuantity, clearCart, error: cartError, isSyncing, syncWithServer } = useCartStore();
  const { coupon, applyCoupon, removeCoupon, deliveryOptionId } = useCheckoutStore();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const { data: recommendedShirts = [] } = useProductsQuery({ limit: 4, sort: 'featured' });

  const pricing = calculateOrderPricing(items, deliveryOptionId, coupon);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;

    const res = await applyCoupon(couponCodeInput, pricing.subtotalPaise);
    if (res.success) {
      addToast(res.message, 'success');
      setCouponCodeInput('');
    } else {
      addToast(res.message, 'error');
    }
  };

  return (
    <div className="py-8 lg:py-16">
      <div className="max-w-editorial mx-auto px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-10 lg:mb-12">
          <p className="text-overline text-gold-600 mb-2">Order Review</p>
          <h1 className="font-serif text-display text-charcoal-900">Your Shopping Bag</h1>
        </div>

        {cartError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-red-300 bg-red-50 px-4 py-3 text-body-sm text-red-800">
            <span>Your bag could not be synchronized: {cartError}</span>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => void syncWithServer().catch(() => undefined)}
              className="font-semibold underline disabled:opacity-50"
            >
              {isSyncing ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-ivory-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-7 h-7 text-charcoal-400" />
            </div>
            <h2 className="font-serif text-display text-charcoal-900 mb-2">Your Bag is Empty</h2>
            <p className="text-body text-charcoal-500 mb-8">
              Explore the current catalogue and add an available product to your cart.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wide hover:bg-charcoal-800 transition-colors"
            >
              Explore Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left: Cart Items List (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Free Shipping Meter */}
              <div className="p-4 bg-ivory-50 border border-ivory-300 rounded-2xl">
                <div className="flex items-center gap-2 text-caption text-charcoal-800 mb-2">
                  <Truck className="w-4 h-4 text-gold-600 flex-shrink-0" />
                  {pricing.isFreeShipping ? (
                    <span className="font-medium text-success">
                      You've unlocked complimentary standard shipping!
                    </span>
                  ) : (
                    <span>
                      Add <strong className="text-charcoal-900">₹{pricing.remainingForFreeShipping.toLocaleString('en-IN')}</strong> more for complimentary shipping.
                    </span>
                  )}
                  {pricing.couponEligibilityError && (
                    <p role="alert" className="mt-2 text-xs text-error">{pricing.couponEligibilityError}</p>
                  )}
                </div>
                <div className="w-full bg-ivory-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gold-500 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, ((pricing.subtotalPaise - pricing.couponDiscountPaise) / pricing.freeShippingThresholdPaise) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-ivory-300">
                {items.map(item => (
                  <div key={item.id} className="py-4 sm:py-6 flex gap-3 sm:gap-6">
                    <Link
                      to={`/shirts/${item.slug}`}
                      className="w-20 sm:w-28 aspect-[3/4] bg-ivory-200 rounded-xl overflow-hidden flex-shrink-0 border border-ivory-300"
                    >
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/shirts/${item.slug}`}
                            className="font-serif text-base sm:text-heading font-medium text-charcoal-900 hover:text-gold-600 transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await removeItem(item.id);
                                addToast(`Removed "${item.name}" from your bag.`, 'info');
                              } catch (err) {
                                addToast(err instanceof Error ? err.message : 'Unable to remove item.', 'error');
                              }
                            }}
                            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center text-charcoal-400 hover:text-error transition-colors -mr-1.5"
                            aria-label={`Remove ${item.name} from bag`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-caption text-charcoal-500 mt-0.5 sm:mt-1">
                          Color: <span className="font-medium text-charcoal-800">{item.color.name}</span> · Size:{' '}
                          <span className="font-medium text-charcoal-800">{item.size}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 sm:pt-4">
                        {/* Quantity Stepper */}
                        <div className="inline-flex items-center border border-ivory-300 bg-ivory-50 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateQuantity(item.id, item.quantity - 1);
                              } catch (err) {
                                addToast(err instanceof Error ? err.message : 'Unable to update quantity.', 'error');
                              }
                            }}
                            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-charcoal-600 hover:text-charcoal-900 transition-colors"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 sm:px-3 text-caption font-semibold text-charcoal-900 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateQuantity(item.id, item.quantity + 1);
                              } catch (err) {
                                addToast(err instanceof Error ? err.message : 'Unable to update quantity.', 'error');
                              }
                            }}
                            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center text-charcoal-600 hover:text-charcoal-900 transition-colors"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="font-serif text-base sm:text-heading font-bold text-charcoal-900 tabular-nums">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          {item.compareAtPrice && (
                            <span className="block text-[11px] sm:text-caption text-charcoal-400 line-through tabular-nums">
                              ₹{(item.compareAtPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Link
                  to="/shop"
                  className="text-caption-editorial text-charcoal-600 hover:text-charcoal-900 underline underline-offset-4"
                >
                  ← Continue Exploring Catalog
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    addToast('Shopping bag cleared.', 'info');
                  }}
                  className="text-caption text-charcoal-400 hover:text-error py-2"
                >
                  Clear Bag
                </button>
              </div>
            </div>

            {/* Right: Order Summary Sidebar (5 cols) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 bg-ivory-50 p-5 sm:p-8 border border-ivory-300 rounded-3xl space-y-6 shadow-sm">
              <h2 className="font-serif text-heading-lg text-charcoal-900">Summary</h2>

              {/* Coupon Form */}
              <div>
                <label htmlFor="cart-coupon-input" className="block text-overline text-charcoal-500 mb-2">Promotional Code</label>
                {coupon ? (
                  <div className="flex items-center justify-between p-3 bg-gold-50 border border-gold-300 text-caption font-medium text-gold-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gold-600" />
                      <span>{coupon.code} applied</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      aria-label="Remove applied coupon"
                      className="flex h-8 w-8 items-center justify-center text-charcoal-500 hover:text-charcoal-900 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      id="cart-coupon-input"
                      type="text"
                      value={couponCodeInput}
                      onChange={e => setCouponCodeInput(e.target.value)}
                      placeholder="e.g. SHIRT10 or WELCOME20"
                      className="flex-1 px-3.5 py-2.5 bg-white border border-ivory-300 text-caption text-charcoal-900 uppercase placeholder:normal-case placeholder:text-charcoal-400 outline-none focus:border-charcoal-900 rounded-xl"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-charcoal-900 text-ivory-100 text-caption font-semibold tracking-wider hover:bg-charcoal-800 transition-colors rounded-xl shadow-xs"
                    >
                      APPLY
                    </button>
                  </form>
                )}
              </div>

              {/* Line Items Breakdown */}
              <div className="space-y-3 pt-4 border-t border-ivory-300 text-body-sm text-charcoal-600">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span className="font-medium text-charcoal-900 tabular-nums">
                    ₹{pricing.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                {pricing.productSavings > 0 && (
                  <div className="flex justify-between text-gold-700">
                    <span>Product Savings</span>
                    <span className="tabular-nums">−₹{pricing.productSavings.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {pricing.couponDiscount > 0 && (
                  <div className="flex justify-between text-gold-700">
                    <span>Coupon Discount</span>
                    <span className="tabular-nums">−₹{pricing.couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated Delivery</span>
                  <span>{pricing.deliveryFee === 0 ? 'Complimentary' : `₹${pricing.deliveryFee}`}</span>
                </div>
                <div className="flex justify-between items-baseline pt-4 border-t border-ivory-300">
                  <span className="text-body font-semibold text-charcoal-900">Total</span>
                  <span className="font-serif text-heading-xl font-bold text-charcoal-900 tabular-nums">
                    ₹{pricing.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-4 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors rounded-xl shadow-md"
              >
                PROCEED TO CHECKOUT
              </button>

              <div className="flex items-center justify-center gap-2 text-caption text-charcoal-400 text-center">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>256-Bit SSL Encrypted & Protected Checkout</span>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Products Carousel */}
        {items.length > 0 && (
          <div className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-ivory-300">
            <div className="text-center mb-8 sm:mb-10">
              <p className="text-overline text-gold-600 mb-2">Curated Additions</p>
              <h3 className="font-serif text-2xl sm:text-display text-charcoal-900">You May Also Like</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {recommendedShirts.map(rec => (
                <Link key={rec.id} to={`/shirts/${rec.slug}`} className="group block">
                  <div className="aspect-[3/4] bg-ivory-200 rounded-2xl overflow-hidden mb-3 border border-ivory-300">
                    <img
                      src={rec.images[0]}
                      alt={rec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <h4 className="text-body-sm font-medium text-charcoal-900 group-hover:text-gold-600 transition-colors line-clamp-1">
                    {rec.name}
                  </h4>
                  <p className="text-caption text-charcoal-500 font-serif font-semibold mt-1 tabular-nums">
                    ₹{rec.price.toLocaleString('en-IN')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
