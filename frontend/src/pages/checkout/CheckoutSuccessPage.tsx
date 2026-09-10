import { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Truck, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { PageLoadingFallback } from '../../components/common/PageLoadingFallback.js';
import { useOrderQuery } from '../../features/orders/hooks/useOrders.js';
import { useCartStore } from '../../store/cartStore.js';
import { useCheckoutStore } from '../../features/checkout/store/checkoutStore.js';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? undefined;
  const syncCart = useCartStore(s => s.syncWithServer);
  const resetCheckout = useCheckoutStore(s => s.resetCheckout);

  const {
    data: order,
    isPending,
    isError,
    refetch,
  } = useOrderQuery(orderId, {
    refetchInterval: query => {
      const data = query?.state?.data;
      if (data && (data.paymentStatus === 'pending' || data.status === 'pending')) {
        return 2500;
      }
      return false;
    },
  });

  const isConfirmed =
    order && (order.paymentStatus === 'paid' || order.status === 'confirmed');

  useEffect(() => {
    if (isConfirmed) {
      resetCheckout();
      void syncCart().catch(() => undefined);
    }
  }, [isConfirmed, resetCheckout, syncCart]);

  if (!orderId) {
    return <Navigate to="/shop" replace />;
  }
  if (isPending) return <PageLoadingFallback />;

  // Network/temporary fetch failure must NOT be reported as payment failure (AUD-012)
  if (isError) {
    return (
      <div className="py-8 lg:py-16 max-w-xl mx-auto px-4">
        <div className="bg-ivory-100 p-8 sm:p-12 border border-ivory-300 shadow-subtle text-center space-y-6">
          <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 text-gold-600" />
          </div>
          <div>
            <p className="text-overline text-gold-600 mb-1">Network Communication</p>
            <h1 className="font-serif text-display text-charcoal-900">Unable to Load Confirmation</h1>
            <p className="text-body-sm text-charcoal-500 mt-2">
              We encountered a temporary connection error while retrieving your order confirmation.
              Your transaction has not necessarily failed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => void refetch()}
              className="flex-1 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> RETRY
            </button>
            <Link
              to="/account/orders"
              className="flex-1 py-3.5 border border-charcoal-400 text-charcoal-800 text-body-sm font-semibold tracking-wider hover:border-charcoal-900 transition-colors flex items-center justify-center gap-2"
            >
              VIEW MY ORDERS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return <Navigate to={`/checkout/failure?orderId=${encodeURIComponent(orderId)}`} replace />;
  }

  // If backend marked order/payment as failed or cancelled, route to failure page
  if (order.paymentStatus === 'failed' || order.status === 'cancelled') {
    return <Navigate to={`/checkout/failure?orderId=${encodeURIComponent(orderId)}`} replace />;
  }

  // If payment verification is still pending
  if (!isConfirmed && (order.paymentStatus === 'pending' || order.status === 'pending')) {
    return (
      <div className="py-8 lg:py-16 max-w-xl mx-auto px-4">
        <div className="bg-ivory-100 p-8 sm:p-12 border border-ivory-300 shadow-subtle text-center space-y-6">
          <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Loader2 className="w-8 h-8 text-gold-600 animate-spin" />
          </div>

          <div>
            <p className="text-overline text-gold-600 mb-1">Bank Reconciliation</p>
            <h1 className="font-serif text-display text-charcoal-900">Verifying Your Payment</h1>
            <p className="text-body-sm text-charcoal-500 mt-2">
              Order Reference:{' '}
              <strong className="text-charcoal-900 font-mono tracking-wider">
                #{order.orderNumber}
              </strong>
            </p>
          </div>

          <p className="text-body text-charcoal-600 leading-relaxed text-left p-4 bg-ivory-50 border border-ivory-200 text-caption">
            We are confirming your transaction with the banking gateway. Your order will be confirmed as soon as payment authorization is finalized.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => void refetch()}
              className="flex-1 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> CHECK STATUS
            </button>
            <Link
              to="/account/orders"
              className="flex-1 py-3.5 border border-charcoal-400 text-charcoal-800 text-body-sm font-semibold tracking-wider hover:border-charcoal-900 transition-colors flex items-center justify-center gap-2"
            >
              VIEW ORDERS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 lg:py-16 max-w-2xl mx-auto">
      <div className="bg-ivory-100 p-8 sm:p-12 border border-ivory-300 shadow-subtle text-center space-y-6">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>

        <div>
          <p className="text-overline text-gold-600 mb-1">Confirmation Complete</p>
          <h1 className="font-serif text-display text-charcoal-900">Thank You for Your Order</h1>
          <p className="text-body-sm text-charcoal-500 mt-2">
            Order Reference:{' '}
            <strong className="text-charcoal-900 font-mono tracking-wider">
              #{order.orderNumber}
            </strong>
          </p>
        </div>

        <p className="text-body text-charcoal-600 leading-relaxed max-w-md mx-auto">
          We have received your order and our master tailoring team is preparing your garments for inspection and luxury air dispatch.
        </p>

        {/* Order Details Snippet */}
        <div className="p-6 bg-ivory-50 border border-ivory-200 text-left space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-ivory-200 text-caption text-charcoal-600">
            <span>Delivering To:</span>
            <span className="font-semibold text-charcoal-900">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-ivory-200 text-caption text-charcoal-600">
            <span>Address:</span>
            <span className="text-charcoal-800 text-right truncate max-w-xs">
              {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
            </span>
          </div>
          <div className="flex justify-between items-center text-caption text-charcoal-600">
            <span>Amount Paid:</span>
            <span className="font-serif text-heading text-charcoal-900">
              ₹{order.grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            to={`/account/orders/${order.id}/tracking`}
            className="flex-1 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" /> TRACK LIVE PACKAGE
          </Link>
          <Link
            to="/shop"
            className="flex-1 py-3.5 border border-charcoal-400 text-charcoal-800 text-body-sm font-semibold tracking-wider hover:border-charcoal-900 hover:text-charcoal-900 transition-colors flex items-center justify-center gap-2"
          >
            CONTINUE SHOPPING <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
