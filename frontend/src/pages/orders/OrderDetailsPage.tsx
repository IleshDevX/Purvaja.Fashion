import { useParams, Link } from 'react-router-dom';
import {
  Truck,
  ArrowLeft,
  Printer,
} from 'lucide-react';
import { useOrderQuery } from '../../features/orders/hooks/useOrders.js';
import { ORDER_STATUS_CONFIG } from '../../features/orders/utils/orderStatus.js';

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isPending: loading } = useOrderQuery(orderId);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-overline text-charcoal-400">Loading Order Details</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-6">
        <h2 className="font-serif text-display text-charcoal-900 mb-4">Order Not Found</h2>
        <p className="text-body text-charcoal-500 mb-8">
          We could not locate this order reference in our records.
        </p>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold hover:bg-charcoal-800"
        >
          Return to Orders
        </Link>
      </div>
    );
  }

  const statusMeta = ORDER_STATUS_CONFIG[order.status] || {
    label: order.status,
    variant: 'neutral',
  };

  return (
    <div className="py-8 lg:py-16">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        {/* Back Link */}
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-2 text-caption text-charcoal-500 hover:text-charcoal-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Orders
        </Link>

        {/* Invoice Header Card */}
        <div className="bg-ivory-100 p-6 sm:p-10 border border-ivory-300 shadow-subtle space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-ivory-300">
            <div>
              <p className="text-overline text-gold-600 mb-1">Tailored Invoice</p>
              <h1 className="font-serif text-heading-xl text-charcoal-900">
                Order #{order.orderNumber}
              </h1>
              <p className="text-caption text-charcoal-500 mt-1">
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-overline px-3 py-1 border ${
                  order.status === 'delivered'
                    ? 'border-success text-success bg-success/10'
                    : order.status === 'cancelled'
                    ? 'border-error text-error bg-error/10'
                    : 'border-gold-600 text-gold-700 bg-gold-100'
                }`}
              >
                {statusMeta.label}
              </span>
              <button
                onClick={() => window.print()}
                className="p-2 border border-ivory-300 text-charcoal-600 hover:text-charcoal-900 hover:border-charcoal-900 transition-colors"
                title="Print Invoice"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer & Shipping Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-6 bg-ivory-50 border border-ivory-200 text-body-sm text-charcoal-600">
            <div>
              <span className="text-overline text-charcoal-400 block mb-2">Shipping Details</span>
              <p className="font-semibold text-charcoal-900">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="mt-1 text-caption text-charcoal-500">Phone: {order.shippingAddress.phone}</p>
            </div>

            <div>
              <span className="text-overline text-charcoal-400 block mb-2">Payment & Transit</span>
              <p>
                Method:{' '}
                <strong className="text-charcoal-900 font-medium">{order.paymentMethod.name}</strong>
              </p>
              <p className="mt-1">
                Speed:{' '}
                <strong className="text-charcoal-900 font-medium">{order.deliveryOption.name}</strong>
              </p>
              {order.trackingNumber && (
                <p className="mt-2 text-caption">
                  Tracking:{' '}
                  <span className="font-mono font-semibold text-gold-700">
                    {order.trackingNumber}
                  </span>{' '}
                  ({order.courierName})
                </p>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div>
            <h3 className="font-serif text-heading-lg text-charcoal-900 mb-4">Garments</h3>
            <div className="divide-y divide-ivory-200">
              {order.items.map(item => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-20 object-cover bg-ivory-200 flex-shrink-0"
                    />
                    <div>
                      <Link
                        to={`/shirts/${item.slug}`}
                        className="font-serif text-heading text-charcoal-900 hover:text-gold-600 transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-caption text-charcoal-500 mt-0.5">
                        Color: {item.color.name} · Size: {item.size} · Qty: {item.quantity}
                      </p>
                      <p className="text-caption text-charcoal-400">
                        ₹{item.unitPrice.toLocaleString('en-IN')} each
                      </p>
                    </div>
                  </div>
                  <span className="font-serif text-heading text-charcoal-900">
                    ₹{item.lineTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="pt-4 border-t border-ivory-300 space-y-2.5 max-w-xs ml-auto text-body-sm text-charcoal-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-charcoal-900">
                ₹{order.subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-gold-700">
                <span>Coupon Discount</span>
                <span>−₹{order.couponDiscount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{order.deliveryFee === 0 ? 'Complimentary' : `₹${order.deliveryFee}`}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-ivory-300">
              <span className="text-body font-semibold text-charcoal-900">Grand Total</span>
              <span className="font-serif text-heading-xl text-charcoal-900">
                ₹{order.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Tracking CTA */}
          <div className="pt-6 border-t border-ivory-300 flex justify-between items-center">
            <Link
              to={`/account/orders/${order.id}/tracking`}
              className="px-6 py-3 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors inline-flex items-center gap-2"
            >
              <Truck className="w-4 h-4" /> VIEW PROGRESS TIMELINE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
