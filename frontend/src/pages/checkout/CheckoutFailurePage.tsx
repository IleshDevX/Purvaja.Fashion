import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, RotateCcw, ShoppingBag } from 'lucide-react';

export function CheckoutFailurePage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  return (
    <div className="py-8 lg:py-16 max-w-xl mx-auto">
      <div className="bg-ivory-100 p-8 sm:p-12 border border-ivory-300 shadow-subtle text-center space-y-6">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>

        <div>
          <p className="text-overline text-error mb-1">Authorization Unsuccessful</p>
          <h1 className="font-serif text-display text-charcoal-900">Payment Incomplete</h1>
          <p className="text-body-sm text-charcoal-500 mt-2">
            The banking gateway was unable to complete authorization for your transaction.
          </p>
        </div>

        <p className="text-body text-charcoal-600 leading-relaxed text-left p-4 bg-ivory-50 border border-ivory-200 text-caption">
          No funds were debited from your card or account. You can re-attempt using UPI, NetBanking,
          an alternate card, or choose Cash on Delivery (COD) at checkout.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            to={orderId ? `/checkout?orderId=${encodeURIComponent(orderId)}` : '/checkout'}
            className="flex-1 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> RETRY PAYMENT
          </Link>
          <Link
            to="/cart"
            className="flex-1 py-3.5 border border-charcoal-400 text-charcoal-800 text-body-sm font-semibold tracking-wider hover:border-charcoal-900 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> RETURN TO BAG
          </Link>
        </div>
      </div>
    </div>
  );
}
