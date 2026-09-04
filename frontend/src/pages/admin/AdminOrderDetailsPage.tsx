import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Send,
} from 'lucide-react';
import { OrderStatus } from '../../features/orders/types/order.js';
import { adminService } from '../../features/admin/services/adminService.js';
import { useToast } from '../../app/providers.js';

export function AdminOrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Awaited<ReturnType<typeof adminService.getOrder>> | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('processing');

  useEffect(() => {
    if (!orderId) return;
    void adminService.getOrder(orderId)
      .then(found => {
        setOrder(found);
        setSelectedStatus(found.status);
      })
      .catch(() => setOrder(null));
  }, [orderId]);

  if (!order) {
    return (
      <div className="p-16 rounded-2xl border border-ivory-300 bg-white text-center max-w-md mx-auto space-y-4 shadow-2xs">
        <Package className="h-10 w-10 text-charcoal-300 mx-auto" />
        <h2 className="font-serif text-2xl font-light text-charcoal-950">Order Record Not Found</h2>
        <p className="text-xs text-charcoal-500">The requested order ticket does not exist in the active tailoring log.</p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider"
        >
          Return to Orders
        </Link>
      </div>
    );
  }

  const handleUpdateStatus = async () => {
    try {
      await adminService.updateOrderStatus(order.id, selectedStatus);
      addToast('Order status updated.', 'success');
      const updated = await adminService.getOrder(order.id);
      setOrder(updated);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to update order status.', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12 text-charcoal-900">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal-500 hover:text-charcoal-950 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
              Order #{order.orderNumber}
            </h1>
            <span className="rounded-full bg-gold-50 border border-gold-400/50 text-gold-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        {/* Live Tracking Link */}
        <Link
          to={`/account/orders/${order.id}/tracking`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-charcoal-800 hover:bg-ivory-100 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Truck className="h-4 w-4 text-gold-700" />
          <span>Customer Tracking View</span>
        </Link>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Items & Pricing Summary (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchased Items List */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <h3 className="font-serif text-lg font-bold text-charcoal-950">Tailored Shirting Items</h3>
            <div className="divide-y divide-ivory-200">
              {order.items.map(item => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-12 rounded-xl object-cover bg-ivory-50 border border-ivory-300 shrink-0"
                    />
                    <div>
                      <Link
                        to={`/shirts/${item.slug}`}
                        className="font-serif text-sm font-bold text-charcoal-950 hover:text-gold-700 transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-charcoal-500 mt-0.5">
                        {item.color.name} · Size {item.size} · Qty {item.quantity}
                      </p>
                      <span className="font-mono text-[10px] text-charcoal-400 block mt-0.5">
                        Item ID: {item.id}
                      </span>
                    </div>
                  </div>

                  <span className="font-sans text-sm font-bold tabular-nums text-charcoal-950 shrink-0">
                    ₹{item.lineTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing & Commercial Breakdown */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <h3 className="font-serif text-base font-bold text-charcoal-950 mb-4">Financial Ledger</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-600">
                <span>Items Subtotal</span>
                <span className="font-sans font-medium tabular-nums text-charcoal-950">
                  ₹{order.subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              {(order.couponDiscount > 0 || order.productSavings > 0) && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promotional Privilege Discount</span>
                  <span className="font-sans font-medium tabular-nums">
                    −₹{(order.couponDiscount + order.productSavings).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-charcoal-600">
                <span>Insured Atelier Delivery</span>
                <span className="font-sans font-medium tabular-nums text-charcoal-950">
                  {order.deliveryFee === 0 ? 'Complimentary' : `₹${order.deliveryFee}`}
                </span>
              </div>
              <div className="pt-3 border-t border-ivory-200 flex justify-between text-sm font-bold text-charcoal-950">
                <span>Grand Total Paid</span>
                <span className="font-sans text-base text-gold-800 tabular-nums">
                  ₹{order.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Customer Info & Status Transition Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Order Status Action Card */}
          <div className="rounded-2xl border border-gold-400/50 bg-gold-50/60 p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <h3 className="font-serif text-base font-bold text-charcoal-950">Update Dispatch Stage</h3>
            <p className="text-xs text-charcoal-600">Select target pipeline state to advance the order lifecycle.</p>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as OrderStatus)}
              className="w-full rounded-xl bg-white border border-ivory-300 px-3 py-2.5 text-xs font-bold text-charcoal-950 outline-none cursor-pointer"
            >
              <option value="confirmed">Confirmed (Pattern Allocated)</option>
              <option value="processing">Processing (In Atelier Tailoring)</option>
              <option value="shipped">Shipped (Dispatched to Courier)</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered (Completed)</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="button"
              onClick={handleUpdateStatus}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-charcoal-950 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Apply Status Transition</span>
            </button>
          </div>

          {/* Delivery Destination */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div className="flex items-center gap-2 text-gold-800">
              <MapPin className="h-4 w-4" />
              <h3 className="font-serif text-base font-bold text-charcoal-950">Delivery Destination</h3>
            </div>
            <div className="text-xs space-y-1 text-charcoal-700">
              <p className="font-bold text-charcoal-950">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}
              </p>
              <p className="pt-1 text-[11px] text-charcoal-500">Contact: {order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div className="flex items-center gap-2 text-gold-800">
              <CreditCard className="h-4 w-4" />
              <h3 className="font-serif text-base font-bold text-charcoal-950">Payment Method</h3>
            </div>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-charcoal-950">
                {order.paymentMethod?.name || (order.paymentMethod?.id === 'cod' ? 'Cash on Delivery (Pay upon Receipt)' : 'PhonePe Digital Gateway')}
              </p>
              <p className="text-[11px] text-charcoal-500">Payment Status: Verified Authenticated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
