import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Send,
  User,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminOrder, AdminOrderTransition } from '../../features/admin/types/admin.js';
import { useToast } from '../../app/providers.js';

const transitions: Record<AdminOrder['status'], AdminOrderTransition[]> = {
  PENDING: [],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: [],
};

export function AdminOrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { addToast } = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderTransition | ''>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setLoading(true);
    void adminService
      .getOrder(orderId)
      .then(found => {
        if (!active) return;
        setOrder(found);
        const validNext = found.allowedActions?.length ? found.allowedActions : (transitions[found.status] ?? []);
        setSelectedStatus(validNext[0] ?? '');
      })
      .catch(() => {
        if (active) setOrder(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="p-16 rounded-2xl border border-ivory-300 bg-white text-center max-w-md mx-auto space-y-4 shadow-2xs">
        <Package className="h-10 w-10 text-charcoal-300 mx-auto animate-pulse" />
        <h2 className="font-serif text-2xl font-light text-charcoal-950">Loading Order Ticket…</h2>
        <p className="text-xs text-charcoal-500">Retrieving authoritative database record.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-16 rounded-2xl border border-ivory-300 bg-white text-center max-w-md mx-auto space-y-4 shadow-2xs">
        <Package className="h-10 w-10 text-charcoal-300 mx-auto" />
        <h2 className="font-serif text-2xl font-light text-charcoal-950">Order Record Not Found</h2>
        <p className="text-xs text-charcoal-500">
          The requested order ticket does not exist in the active tailoring log.
        </p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider"
        >
          Return to Orders
        </Link>
      </div>
    );
  }

  const validTransitions = transitions[order.status] ?? [];

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    try {
      setUpdating(true);
      const updated = await adminService.updateOrderStatus(order.id, selectedStatus);
      setOrder(updated);
      const nextAllowed = transitions[updated.status] ?? [];
      setSelectedStatus(nextAllowed[0] ?? '');
      addToast(`Order transitioned to ${updated.status}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to update order status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const statusColorClass = (status: AdminOrder['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-gold-50 border-gold-400/50 text-gold-800';
      case 'PROCESSING':
        return 'bg-amber-50 border-amber-400/50 text-amber-800';
      case 'SHIPPED':
        return 'bg-blue-50 border-blue-400/50 text-blue-800';
      case 'DELIVERED':
        return 'bg-emerald-50 border-emerald-400/50 text-emerald-800';
      case 'CANCELLED':
        return 'bg-rose-50 border-rose-400/50 text-rose-800';
      default:
        return 'bg-ivory-100 border-ivory-300 text-charcoal-700';
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
            <span
              className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColorClass(order.status)}`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleString('en-IN', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-xl border border-ivory-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-charcoal-700 shadow-2xs self-start sm:self-auto">
          <Clock className="h-4 w-4 text-gold-700" />
          <span>Last Updated: {new Date(order.updatedAt).toLocaleDateString('en-IN')}</span>
        </span>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Items & Pricing Summary (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchased Items List */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <h3 className="font-serif text-lg font-bold text-charcoal-950">
              Tailored Shirting Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)} units)
            </h3>
            <div className="divide-y divide-ivory-200">
              {order.items.map(item => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-serif text-sm font-bold text-charcoal-950">
                      {item.productName}
                    </p>
                    <p className="text-xs text-charcoal-600">
                      Colour: <span className="font-medium text-charcoal-900">{item.colorName}</span> · Size:{' '}
                      <span className="font-medium text-charcoal-900">{item.size}</span> · Quantity:{' '}
                      <span className="font-medium text-charcoal-900">{item.quantity}</span>
                    </p>
                    <p className="font-mono text-[10px] text-charcoal-400">SKU: {item.sku}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-sans text-sm font-bold tabular-nums text-charcoal-950">
                      ₹{(item.lineTotalPaise / 100).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-charcoal-400">
                      @ ₹{(item.unitPricePaise / 100).toLocaleString('en-IN')} each
                    </p>
                  </div>
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
                  ₹{(order.subtotalPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promotional Privilege Discount</span>
                  <span className="font-sans font-medium tabular-nums">
                    −₹{(order.discountPaise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-charcoal-600">
                <span>Insured Atelier Delivery</span>
                <span className="font-sans font-medium tabular-nums text-charcoal-950">
                  {order.shippingChargePaise === 0
                    ? 'Complimentary'
                    : `₹${(order.shippingChargePaise / 100).toLocaleString('en-IN')}`}
                </span>
              </div>
              {order.taxPaise > 0 && (
                <div className="flex justify-between text-charcoal-600">
                  <span>Applicable GST / Taxes</span>
                  <span className="font-sans font-medium tabular-nums text-charcoal-950">
                    ₹{(order.taxPaise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-ivory-200 flex justify-between text-sm font-bold text-charcoal-950">
                <span>Grand Total</span>
                <span className="font-sans text-base text-gold-800 tabular-nums">
                  ₹{(order.totalPaise / 100).toLocaleString('en-IN')}
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
            <p className="text-xs text-charcoal-600">
              Current stage: <strong className="text-charcoal-950">{order.status}</strong>
            </p>

            {validTransitions.length > 0 ? (
              <>
                <label htmlFor="admin-order-status-select" className="sr-only">Select new dispatch status</label>
                <select
                  id="admin-order-status-select"
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as AdminOrderTransition)}
                  className="w-full rounded-xl bg-white border border-ivory-300 px-3 py-2.5 text-xs font-bold text-charcoal-950 outline-none cursor-pointer min-h-[44px]"
                >
                  {validTransitions.map(next => (
                    <option key={next} value={next}>
                      {next}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={updating || !selectedStatus}
                  onClick={handleUpdateStatus}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-charcoal-950 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{updating ? 'Applying…' : 'Apply Status Transition'}</span>
                </button>
              </>
            ) : (
              <div className="rounded-xl bg-white/80 p-3 border border-ivory-300 text-xs text-charcoal-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 inline mr-1" />
                This order is in a final dispatch state ({order.status}).
              </div>
            )}
          </div>

          {/* Return Request Details Card (if present) */}
          {order.returnRequest && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50/50 p-6 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-charcoal-950">Return Ticket Details</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  order.returnRequest.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.returnRequest.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-gold-100 text-gold-800'
                }`}>
                  {order.returnRequest.status}
                </span>
              </div>
              <div className="text-xs space-y-1 text-charcoal-700">
                <p><span className="font-semibold text-charcoal-900">Reason:</span> {order.returnRequest.reason}</p>
                <p><span className="font-semibold text-charcoal-900">Requested:</span> {new Date(order.returnRequest.createdAt).toLocaleString('en-IN')}</p>
                {order.returnRequest.processedAt && (
                  <p><span className="font-semibold text-charcoal-900">Processed:</span> {new Date(order.returnRequest.processedAt).toLocaleString('en-IN')}</p>
                )}
                {order.returnRequest.items?.length > 0 && (
                  <div className="pt-2">
                    <span className="font-semibold text-charcoal-900 block mb-1">Return Lines:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                      {order.returnRequest.items.map(ri => {
                        const matchedItem = order.items.find(it => it.id === ri.orderItemId);
                        return (
                          <li key={ri.id}>
                            {ri.quantity} × {matchedItem?.productName ?? ri.orderItemId}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Patron & Client Account */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div className="flex items-center gap-2 text-gold-800">
              <User className="h-4 w-4" />
              <h3 className="font-serif text-base font-bold text-charcoal-950">Patron Account</h3>
            </div>
            <div className="text-xs space-y-1 text-charcoal-700">
              <p className="font-bold text-charcoal-950">
                {order.customer.firstName || ''} {order.customer.lastName || ''}
              </p>
              <p className="font-mono text-charcoal-600">{order.customer.email}</p>
              {order.customer.status && (
                <p className="text-[11px] text-charcoal-500">Account status: {order.customer.status}</p>
              )}
              <div className="pt-2">
                <Link
                  to={`/admin/customers/${order.customer.id}`}
                  className="text-xs font-bold text-gold-800 hover:underline"
                >
                  View Patron Profile →
                </Link>
              </div>
            </div>
          </div>

          {/* Delivery Destination */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div className="flex items-center gap-2 text-gold-800">
              <MapPin className="h-4 w-4" />
              <h3 className="font-serif text-base font-bold text-charcoal-950">Delivery Destination</h3>
            </div>
            <div className="text-xs space-y-1 text-charcoal-700">
              <p className="font-bold text-charcoal-950">
                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
              </p>
              <p>{order.shippingAddress?.addressLine1}</p>
              {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} —{' '}
                {order.shippingAddress?.postalCode}
              </p>
              <p className="text-charcoal-500">{order.shippingAddress?.country || 'India'}</p>
              <p className="pt-1 text-[11px] text-charcoal-500">
                Contact: {order.shippingAddress?.phone}
              </p>
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
                {order.paymentProvider === 'COD'
                  ? 'Cash on Delivery (Pay upon Receipt)'
                  : order.paymentProvider === 'PHONEPE'
                    ? 'PhonePe UPI / Digital Gateway'
                    : order.paymentProvider || 'Direct Tailoring Invoice'}
              </p>
              <p className="text-[11px] text-charcoal-500">Payment Status: {order.paymentStatus}</p>
              {order.payments?.[0] && (
                <div className="pt-3 border-t border-ivory-200 space-y-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await adminService.reconcilePayment(order.payments[0].id);
                        addToast('Payment state reconciled successfully with provider.', 'success');
                        const refreshed = await adminService.getOrder(order.id);
                        setOrder(refreshed);
                      } catch (err) {
                        addToast(err instanceof Error ? err.message : 'Reconciliation failed', 'error');
                      }
                    }}
                    className="w-full text-center rounded-lg border border-ivory-300 py-1.5 text-[11px] font-bold text-charcoal-800 hover:bg-ivory-100 transition-colors"
                  >
                    Reconcile Payment State
                  </button>
                  {order.payments[0]?.refunds?.map(rf => (
                    <div key={rf.id} className="text-[11px] p-2 bg-ivory-50 rounded-lg space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>Refund ₹{(rf.amountPaise / 100).toLocaleString('en-IN')}</span>
                        <span className="uppercase">{rf.status}</span>
                      </div>
                      {['REQUESTED', 'FAILED', 'PENDING'].includes(rf.status) && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await adminService.processRefund(rf.id);
                              addToast('Refund status updated. Check the ledger result below.', 'success');
                              const refreshed = await adminService.getOrder(order.id);
                              setOrder(refreshed);
                            } catch (err) {
                              addToast(err instanceof Error ? err.message : 'Refund execution failed', 'error');
                            }
                          }}
                          className="w-full rounded bg-charcoal-900 text-white py-1 text-[10px] font-bold hover:bg-gold-600 transition-colors"
                        >
                          {rf.status === 'PENDING' ? 'Check refund status' : rf.status === 'FAILED' ? 'Retry refund' : 'Process refund'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
