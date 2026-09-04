import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  MapPin,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useOrderQuery } from '../../features/orders/hooks/useOrders.js';

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isPending: loading } = useOrderQuery(orderId);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-overline text-charcoal-400">Locating Package</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-6">
        <h2 className="font-serif text-display text-charcoal-900 mb-4">Tracking Not Found</h2>
        <p className="text-body text-charcoal-500 mb-8">
          Unable to find tracking records for this reference.
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

  const milestones = order.trackingMilestones;

  return (
    <div className="py-8 lg:py-16">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <Link
          to={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-2 text-caption text-charcoal-500 hover:text-charcoal-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Order Invoice
        </Link>

        {/* Tracking Main Card */}
        <div className="bg-ivory-100 p-6 sm:p-10 border border-ivory-300 shadow-subtle space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-ivory-300">
            <div>
              <p className="text-overline text-gold-600 mb-1">Live Transit Status</p>
              <h1 className="font-serif text-heading-xl text-charcoal-900">
                Package #{order.trackingNumber || 'TRK-EXP-48201'}
              </h1>
              <p className="text-caption text-charcoal-500 mt-1">
                Courier Carrier:{' '}
                <strong className="text-charcoal-800">{order.courierName || 'BlueDart Air Express'}</strong>
              </p>
            </div>

            <div className="p-4 bg-ivory-50 border border-ivory-200 text-right">
              <span className="text-overline text-charcoal-400 block mb-0.5">Estimated Arrival</span>
              <span className="font-serif text-heading text-charcoal-900">
                {order.estimatedDelivery || '3 - 4 Business Days'}
              </span>
            </div>
          </div>

          {/* ── DESKTOP HORIZONTAL PROGRESSION SYSTEM ── */}
          <div className="hidden md:block py-6">
            <div className="flex items-center justify-between relative">
              {milestones.map((m, idx) => {
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center text-center relative z-10">
                    {/* Circle Node */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        m.current
                          ? 'border-gold-600 bg-gold-500 text-ivory-100 ring-4 ring-gold-200'
                          : m.completed
                          ? 'border-charcoal-900 bg-charcoal-900 text-ivory-100'
                          : 'border-ivory-300 bg-ivory-50 text-charcoal-300'
                      }`}
                    >
                      {m.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="text-caption font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Milestone Info */}
                    <div className="mt-3 max-w-[130px]">
                      <span
                        className={`text-caption-editorial block ${
                          m.current
                            ? 'text-gold-800 font-bold'
                            : m.completed
                            ? 'text-charcoal-900 font-semibold'
                            : 'text-charcoal-400'
                        }`}
                      >
                        {m.title}
                      </span>
                      {m.timestamp && (
                        <span className="text-[11px] text-charcoal-500 block mt-1">
                          {m.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Connecting Line */}
              <div className="absolute top-5 left-10 right-10 h-0.5 bg-ivory-300 -z-0" />
            </div>
          </div>

          {/* ── MOBILE VERTICAL TIMELINE ── */}
          <div className="md:hidden space-y-6 pl-4 border-l-2 border-ivory-300 ml-3">
            {milestones.map((m, idx) => (
              <div key={idx} className="relative pl-6">
                <div
                  className={`absolute -left-[23px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    m.current
                      ? 'border-gold-600 bg-gold-500 text-ivory-100 ring-2 ring-gold-200'
                      : m.completed
                      ? 'border-charcoal-900 bg-charcoal-900 text-ivory-100'
                      : 'border-ivory-300 bg-ivory-50 text-charcoal-300'
                  }`}
                >
                  {m.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-caption">{idx + 1}</span>
                  )}
                </div>
                <div>
                  <h4
                    className={`text-body-sm ${
                      m.current
                        ? 'font-bold text-gold-800'
                        : m.completed
                        ? 'font-semibold text-charcoal-900'
                        : 'text-charcoal-400'
                    }`}
                  >
                    {m.title}
                  </h4>
                  <p className="text-caption text-charcoal-500 mt-0.5">{m.description}</p>
                  {m.timestamp && (
                    <span className="text-[11px] text-charcoal-400 block mt-1">{m.timestamp}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Details & Support */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-ivory-300">
            <div className="p-4 bg-ivory-50 border border-ivory-200 text-body-sm text-charcoal-600">
              <div className="flex items-center gap-2 text-charcoal-900 font-semibold mb-2">
                <MapPin className="w-4 h-4 text-gold-600" />
                <span>Destination Address</span>
              </div>
              <p>{order.shippingAddress.addressLine1}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-caption text-charcoal-500 mt-2">
                Recipient: {order.shippingAddress.firstName} {order.shippingAddress.lastName} (
                {order.shippingAddress.phone})
              </p>
            </div>

            <div className="p-4 bg-ivory-50 border border-ivory-200 text-body-sm text-charcoal-600 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-charcoal-900 font-semibold mb-2">
                  <ShieldCheck className="w-4 h-4 text-gold-600" />
                  <span>Doorstep Inspection Assistance</span>
                </div>
                <p className="text-caption text-charcoal-500">
                  Our courier partners are authorized to facilitate instant size verification and doorstep
                  replacement scheduling if required.
                </p>
              </div>
              <p className="text-caption font-semibold text-charcoal-900 mt-2">
                Support Helpline: +91 98765 43210
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
