import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Tag,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore.js';
import { useCheckoutStore } from '../../features/checkout/store/checkoutStore.js';
import {
  ShippingAddress,
  DeliveryOptionId,
  PaymentMethodId,
  CheckoutStep,
} from '../../features/checkout/types/checkout.js';
import {
  AVAILABLE_DELIVERY_OPTIONS,
  AVAILABLE_PAYMENT_METHODS,
  calculateOrderPricing,
} from '../../features/checkout/utils/pricing.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { addressSchema } from '../../features/checkout/schemas/addressSchema.js';
import { useToast } from '../../app/providers.js';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const items = useCartStore(s => s.items);
  const clearCart = useCartStore(s => s.clearCart);
  const { user } = useAuthStore();

  const {
    shippingAddress,
    setShippingAddress,
    deliveryOptionId,
    setDeliveryOptionId,
    paymentMethodId,
    setPaymentMethodId,
    coupon,
    applyCoupon,
    removeCoupon,
    currentStep,
    setCurrentStep,
    processPayment,
    isProcessing,
  } = useCheckoutStore();

  // Local Form state for Address
  const [firstName, setFirstName] = useState(shippingAddress?.firstName || user?.firstName || '');
  const [lastName, setLastName] = useState(shippingAddress?.lastName || user?.lastName || '');
  const [phone, setPhone] = useState(shippingAddress?.phone || '');
  const [addressLine1, setAddressLine1] = useState(shippingAddress?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(shippingAddress?.addressLine2 || '');
  const [city, setCity] = useState(shippingAddress?.city || '');
  const [state, setState] = useState(shippingAddress?.state || '');
  const [postalCode, setPostalCode] = useState(shippingAddress?.postalCode || '');
  const [country] = useState('India');

  const [couponInput, setCouponInput] = useState('');

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const pricing = calculateOrderPricing(items, deliveryOptionId, coupon);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !addressLine1 || !city || !state || !postalCode) {
      addToast('Please complete all required address fields.', 'error');
      return;
    }

    const candidate: ShippingAddress = {
      firstName,
      lastName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    };
    const parsed = addressSchema.safeParse(candidate);
    if (!parsed.success) {
      addToast(parsed.error.issues[0]?.message ?? 'Please check your delivery address.', 'error');
      return;
    }
    setShippingAddress(parsed.data);
    setCurrentStep('delivery');
  };

  const handleApplyCouponCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput);
    if (res.success) {
      addToast(res.message, 'success');
      setCouponInput('');
    } else {
      addToast(res.message, 'error');
    }
  };

  const handleCompleteOrder = async () => {
    if (!shippingAddress) {
      addToast('Please provide your delivery address.', 'error');
      setCurrentStep('address');
      return;
    }

    const res = await processPayment(items);
    if (res.success && res.orderId) {
      clearCart();
      addToast('Order confirmed successfully!', 'success');
      navigate(`/checkout/success?orderId=${encodeURIComponent(res.orderId)}`);
    } else {
      addToast(res.error || 'Payment declined by gateway.', 'error');
      navigate('/checkout/failure');
    }
  };

  const STEPS: { id: CheckoutStep; num: string; label: string }[] = [
    { id: 'address', num: '01', label: 'ADDRESS' },
    { id: 'delivery', num: '02', label: 'DELIVERY & REVIEW' },
    { id: 'payment', num: '03', label: 'PAYMENT' },
  ];

  return (
    <div className="py-4 sm:py-8">
      {/* 3-Step Stepper Progress Bar */}
      <div className="mb-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted =
              (step.id === 'address' && currentStep !== 'address') ||
              (step.id === 'delivery' && currentStep === 'payment');
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex-1 flex items-center">
                <button
                  onClick={() => {
                    if (isCompleted) setCurrentStep(step.id);
                  }}
                  disabled={!isCompleted && !isCurrent}
                  className={`flex items-center gap-2 sm:gap-3 text-left transition-colors ${
                    isCurrent
                      ? 'text-charcoal-900 font-semibold'
                      : isCompleted
                      ? 'text-gold-700 cursor-pointer'
                      : 'text-charcoal-300 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-caption font-bold border transition-colors ${
                      isCurrent
                        ? 'border-charcoal-900 bg-charcoal-900 text-ivory-100'
                        : isCompleted
                        ? 'border-gold-600 bg-gold-500 text-ivory-100'
                        : 'border-ivory-300 text-charcoal-400 bg-ivory-100'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.num}
                  </span>
                  <span className="text-caption-editorial hidden sm:inline">{step.label}</span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-3 sm:mx-6 transition-colors ${
                      isCompleted ? 'bg-gold-500' : 'bg-ivory-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Active Checkout Step (7 cols) */}
        <div className="lg:col-span-7 bg-ivory-100 p-6 sm:p-8 border border-ivory-300 shadow-subtle">
          {/* STEP 1: ADDRESS */}
          {currentStep === 'address' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-overline text-gold-600 mb-1">Step 01</p>
                <h2 className="font-serif text-heading-lg text-charcoal-900">
                  Shipping & Delivery Address
                </h2>
                <p className="text-body-sm text-charcoal-500 mt-1">
                  Where should our tailored courier partner deliver your garments?
                </p>
              </div>

              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-first-name" className="block text-caption text-charcoal-700 font-medium mb-1">
                      First Name *
                    </label>
                    <input
                      id="checkout-first-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-last-name" className="block text-caption text-charcoal-700 font-medium mb-1">
                      Last Name *
                    </label>
                    <input
                      id="checkout-last-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="block text-caption text-charcoal-700 font-medium mb-1">
                    Mobile Phone (For delivery updates) *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    pattern="[6-9][0-9]{9}"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-address-line-1" className="block text-caption text-charcoal-700 font-medium mb-1">
                    Street Address / Flat / Floor *
                  </label>
                  <input
                    id="checkout-address-line-1"
                    type="text"
                    required
                    autoComplete="street-address"
                    value={addressLine1}
                    onChange={e => setAddressLine1(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-address-line-2" className="block text-caption text-charcoal-700 font-medium mb-1">
                    Locality / Landmark / Area (Optional)
                  </label>
                  <input
                    id="checkout-address-line-2"
                    type="text"
                    value={addressLine2}
                    onChange={e => setAddressLine2(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="checkout-city" className="block text-caption text-charcoal-700 font-medium mb-1">City *</label>
                    <input
                      id="checkout-city"
                      type="text"
                      required
                      autoComplete="address-level2"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-state" className="block text-caption text-charcoal-700 font-medium mb-1">State *</label>
                    <input
                      id="checkout-state"
                      type="text"
                      required
                      autoComplete="address-level1"
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-postal-code" className="block text-caption text-charcoal-700 font-medium mb-1">
                      PIN Code *
                    </label>
                    <input
                      id="checkout-postal-code"
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      pattern="[0-9]{6}"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="6 digits"
                      className="w-full px-3.5 py-2.5 bg-white border border-ivory-300 text-sm sm:text-base text-charcoal-900 rounded-xl outline-none focus:border-charcoal-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-4 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2 rounded-xl shadow-md"
                >
                  CONTINUE TO DELIVERY & REVIEW <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: DELIVERY & REVIEW */}
          {currentStep === 'delivery' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-overline text-gold-600 mb-1">Step 02</p>
                <h2 className="font-serif text-heading-lg text-charcoal-900">
                  Select Delivery Speed & Review Items
                </h2>
              </div>

              {/* Delivery Options Radio Cards */}
              <div className="space-y-3">
                {Object.values(AVAILABLE_DELIVERY_OPTIONS).map(option => (
                  <label
                    key={option.id}
                    onClick={() => setDeliveryOptionId(option.id as DeliveryOptionId)}
                    className={`p-4 border block cursor-pointer transition-all ${
                      deliveryOptionId === option.id
                        ? 'border-charcoal-900 bg-ivory-50'
                        : 'border-ivory-300 bg-ivory-100 hover:border-charcoal-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          checked={deliveryOptionId === option.id}
                          onChange={() => setDeliveryOptionId(option.id as DeliveryOptionId)}
                          className="mt-1 accent-charcoal-900"
                        />
                        <div>
                          <span className="font-medium text-body-sm text-charcoal-900 block">
                            {option.name}
                          </span>
                          <span className="text-caption text-charcoal-500 block mt-0.5">
                            {option.description}
                          </span>
                          <span className="text-caption font-semibold text-gold-700 block mt-1">
                            Estimated transit: {option.estimatedDelivery}
                          </span>
                        </div>
                      </div>
                      <span className="font-serif text-heading text-charcoal-900">
                        {option.id === 'standard' && pricing.isFreeShipping
                          ? 'FREE'
                          : `₹${option.price}`}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Items Summary in Step 2 */}
              <div className="pt-4 border-t border-ivory-300">
                <h3 className="font-serif text-heading text-charcoal-900 mb-3">Garments in this Order</h3>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-ivory-50 border border-ivory-200">
                      <img src={item.image} alt={item.name} className="w-12 h-16 object-cover bg-ivory-200" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-body-sm text-charcoal-900 block truncate">
                          {item.name}
                        </span>
                        <span className="text-caption text-charcoal-400">
                          {item.color.name} · {item.size} · Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="font-serif text-heading text-charcoal-900 pr-2">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep('address')}
                  className="px-6 py-3.5 border border-charcoal-400 text-charcoal-700 text-body-sm font-medium hover:border-charcoal-900 hover:text-charcoal-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Edit Address
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('payment')}
                  className="flex-1 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
                >
                  PROCEED TO PAYMENT <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {currentStep === 'payment' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-overline text-gold-600 mb-1">Step 03</p>
                <h2 className="font-serif text-heading-lg text-charcoal-900">
                  Select Payment Gateway
                </h2>
                <p className="text-body-sm text-charcoal-500 mt-1">
                  All transactions are encrypted with 256-bit SSL protocols.
                </p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                {AVAILABLE_PAYMENT_METHODS.map(method => (
                  <label
                    key={method.id}
                    onClick={() => setPaymentMethodId(method.id as PaymentMethodId)}
                    className={`p-4 border block cursor-pointer transition-all ${
                      paymentMethodId === method.id
                        ? 'border-charcoal-900 bg-ivory-50'
                        : 'border-ivory-300 bg-ivory-100 hover:border-charcoal-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethodId === method.id}
                        onChange={() => setPaymentMethodId(method.id as PaymentMethodId)}
                        className="mt-1 accent-charcoal-900"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-body-sm text-charcoal-900">
                            {method.name}
                          </span>
                          {method.badge && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-800 bg-gold-200 px-2 py-0.5 rounded-xs">
                              {method.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-caption text-charcoal-500 block mt-0.5">
                          {method.description}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep('delivery')}
                  className="px-6 py-3.5 border border-charcoal-400 text-charcoal-700 text-body-sm font-medium hover:border-charcoal-900 hover:text-charcoal-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCompleteOrder}
                  className="flex-1 py-4 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-elevated"
                >
                  {isProcessing
                    ? 'AUTHORIZING PAYMENT...'
                    : `CONFIRM & PAY ₹${pricing.grandTotal.toLocaleString('en-IN')}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Persistent Order Summary Sidebar (5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 bg-ivory-100 p-6 sm:p-8 border border-ivory-300 space-y-6">
          <h3 className="font-serif text-heading-lg text-charcoal-900">Order Summary</h3>

          {/* Item Thumbnails Snippet */}
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="w-12 h-16 object-cover bg-ivory-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-body-sm font-medium text-charcoal-900 block truncate">
                    {item.name}
                  </span>
                  <span className="text-caption text-charcoal-400">
                    {item.size} · Qty {item.quantity}
                  </span>
                </div>
                <span className="font-serif text-heading text-charcoal-900">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon Input */}
          <div className="pt-4 border-t border-ivory-300">
            {coupon ? (
              <div className="flex items-center justify-between p-3 bg-gold-50 border border-gold-300 text-caption font-medium text-gold-800">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gold-600" />
                  <span>{coupon.code} applied</span>
                </div>
                <button onClick={removeCoupon} className="p-1 text-charcoal-500 hover:text-charcoal-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCouponCode} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value)}
                  placeholder="Code (e.g. SHIRT10)"
                  className="flex-1 px-3 py-2 bg-ivory-50 border border-ivory-300 text-caption text-charcoal-900 uppercase placeholder:normal-case placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-charcoal-900 text-ivory-100 text-caption font-semibold tracking-wider hover:bg-charcoal-800 transition-colors"
                >
                  APPLY
                </button>
              </form>
            )}
          </div>

          {/* Cost breakdown */}
          <div className="space-y-3 pt-4 border-t border-ivory-300 text-body-sm text-charcoal-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-charcoal-900">
                ₹{pricing.subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            {pricing.productSavings > 0 && (
              <div className="flex justify-between text-gold-700">
                <span>Product Savings</span>
                <span>−₹{pricing.productSavings.toLocaleString('en-IN')}</span>
              </div>
            )}
            {pricing.couponDiscount > 0 && (
              <div className="flex justify-between text-gold-700">
                <span>Coupon Discount</span>
                <span>−₹{pricing.couponDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{pricing.deliveryFee === 0 ? 'Complimentary' : `₹${pricing.deliveryFee}`}</span>
            </div>
            <div className="flex justify-between items-baseline pt-4 border-t border-ivory-300">
              <span className="text-body font-semibold text-charcoal-900">Total Payable</span>
              <span className="font-serif text-heading-xl text-charcoal-900">
                ₹{pricing.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
