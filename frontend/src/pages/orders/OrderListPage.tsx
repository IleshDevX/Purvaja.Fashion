import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  Truck,
  Search,
  X,
  AlertTriangle,
  ArrowLeft,
  User,
  Heart,
} from 'lucide-react';
import { Order, OrderStatus } from '../../features/orders/types/order.js';
import { useOrdersQuery } from '../../features/orders/hooks/useOrders.js';
import { orderService } from '../../features/orders/services/orderService.js';
import {
  ORDER_STATUS_CONFIG,
  canCancelOrder,
  canReturnOrder,
  canTrackOrder,
} from '../../features/orders/utils/orderStatus.js';
import { useToast } from '../../app/providers.js';

export function OrderListPage() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Ordered wrong size or color');
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('Size fit issue — need exchange');

  const queryClient = useQueryClient();
  const { data: orders = [] } = useOrdersQuery({ status: statusFilter, searchQuery });
  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

  const handleCancelOrderConfirm = async () => {
    if (!cancelModalOrder) return;
    try {
      await orderService.cancel(cancelModalOrder.id, cancelReason);
      addToast('Order cancellation request submitted.', 'success');
      setCancelModalOrder(null);
      void refreshOrders();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to cancel this order.', 'error');
    }
  };

  const handleReturnOrderConfirm = async () => {
    if (!returnModalOrder) return;
    try {
      await orderService.requestReturn(returnModalOrder.id, returnReason);
      addToast('Return request submitted.', 'success');
      setReturnModalOrder(null);
      void refreshOrders();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to request a return.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-ivory-100 py-8 lg:py-14 text-charcoal-900">
      <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-10 xl:px-12">
        {/* Back to Profile Navigation & Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 rounded-full border border-ivory-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-charcoal-800 shadow-2xs transition-all hover:border-charcoal-950 hover:bg-charcoal-950 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Profile</span>
          </Link>

          {/* Quick Account Navigation Tabs */}
          <div className="flex items-center gap-2">
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 rounded-full border border-ivory-300 bg-white px-4 py-2 text-xs font-medium text-charcoal-700 hover:border-charcoal-950 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              <span>Personal Details</span>
            </Link>
            <Link
              to="/wishlist"
              className="inline-flex items-center gap-1.5 rounded-full border border-ivory-300 bg-white px-4 py-2 text-xs font-medium text-charcoal-700 hover:border-charcoal-950 transition-colors"
            >
              <Heart className="h-3.5 w-3.5" />
              <span>Wishlist</span>
            </Link>
          </div>
        </div>

        {/* Page Title & Count */}
        <div className="mb-8 border-b border-ivory-300 pb-6 lg:mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold-700">
            Private Order History
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-charcoal-950 sm:text-4xl lg:text-5xl">
                Your Tailored Orders
              </h1>
              <p className="mt-1.5 text-xs text-charcoal-500 sm:text-sm">
                Track status, access digital invoices, or manage bespoke alterations.
              </p>
            </div>
            <span className="text-xs font-medium text-charcoal-500">
              Showing <span className="font-bold text-charcoal-950">{orders.length}</span> orders placed
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-ivory-300 bg-white p-4 shadow-[0_8px_20px_rgba(26,26,26,0.02)] sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {(['all', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(
              status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-all ${
                    statusFilter === status
                      ? 'bg-charcoal-950 text-white shadow-sm'
                      : 'border border-ivory-300 bg-ivory-50 text-charcoal-700 hover:border-charcoal-900/30 hover:bg-white'
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Order # or shirt..."
              className="w-full rounded-full border border-ivory-300 bg-ivory-50 py-2 pl-9 pr-4 text-xs font-medium text-charcoal-900 placeholder:text-charcoal-400 outline-none transition-colors focus:border-charcoal-950 focus:bg-white"
            />
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal-400" />
          </div>
        </div>

        {/* Order List */}
        {orders.length === 0 ? (
          <div className="rounded-[26px] border border-ivory-300 bg-white p-12 text-center max-w-md mx-auto shadow-[0_12px_32px_rgba(26,26,26,0.03)]">
            <Package className="h-12 w-12 text-charcoal-300 mx-auto mb-3" />
            <h3 className="font-serif text-2xl font-light text-charcoal-950 mb-2">No Orders Found</h3>
            <p className="text-xs text-charcoal-500 mb-6">
              You do not have any orders matching the current filter criteria.
            </p>
            <Link
              to="/shop"
              className="inline-flex rounded-full bg-charcoal-950 px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-md hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              const statusMeta = ORDER_STATUS_CONFIG[order.status] || {
                label: order.status,
                variant: 'neutral',
              };

              return (
                <div
                  key={order.id}
                  className="rounded-[26px] border border-ivory-300 bg-white p-6 sm:p-8 shadow-[0_12px_32px_rgba(26,26,26,0.03)] transition-all duration-300 hover:border-gold-500/40 hover:shadow-[0_20px_50px_rgba(26,26,26,0.06)] space-y-6"
                >
                  {/* Header Row */}
                  <div className="flex flex-col gap-4 border-b border-ivory-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 block mb-0.5">
                          Order Reference
                        </span>
                        <span className="font-mono text-xs font-bold text-charcoal-950">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 block mb-0.5">
                          Date Placed
                        </span>
                        <span className="text-xs font-medium text-charcoal-700">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal-400 block mb-0.5">
                          Total Paid
                        </span>
                        <span className="font-sans text-base font-bold tabular-nums text-charcoal-950">
                          ₹{order.grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="self-start sm:self-center">
                      <span
                        className={`rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] border ${
                          order.status === 'delivered'
                            ? 'border-emerald-600/30 text-emerald-800 bg-emerald-50'
                            : order.status === 'cancelled'
                            ? 'border-rose-600/30 text-rose-800 bg-rose-50'
                            : order.status === 'shipped' || order.status === 'out_for_delivery'
                            ? 'border-gold-500/40 text-gold-800 bg-gold-50'
                            : 'border-charcoal-300 text-charcoal-800 bg-ivory-100'
                        }`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="divide-y divide-ivory-100">
                    {order.items.map(item => (
                      <div key={item.id} className="flex items-center gap-4 py-3 sm:gap-6">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-20 w-16 rounded-xl object-cover bg-ivory-200 flex-shrink-0 border border-ivory-300"
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/shirts/${item.slug}`}
                            className="font-serif text-base font-bold text-charcoal-950 hover:text-gold-700 transition-colors line-clamp-1 sm:text-lg"
                          >
                            {item.name}
                          </Link>
                          <span className="text-xs text-charcoal-500 block mt-0.5">
                            {item.color.name} · Size {item.size} · Qty {item.quantity}
                          </span>
                        </div>
                        <span className="font-sans text-base font-bold tabular-nums text-charcoal-950 pr-2">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ivory-200 pt-5">
                    <div className="flex flex-wrap gap-2.5">
                      {canTrackOrder(order) && (
                        <Link
                          to={`/account/orders/${order.id}/tracking`}
                          className="inline-flex items-center gap-2 rounded-full bg-charcoal-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Live Tracking</span>
                        </Link>
                      )}
                      <Link
                        to={`/account/orders/${order.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-charcoal-900/15 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-charcoal-900 hover:border-charcoal-950 hover:bg-ivory-50 transition-colors"
                      >
                        Invoice & Details
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      {canCancelOrder(order) && (
                        <button
                          type="button"
                          onClick={() => setCancelModalOrder(order)}
                          className="text-xs font-semibold text-rose-700 hover:underline transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}
                      {canReturnOrder(order) && (
                        <button
                          onClick={() => setReturnModalOrder(order)}
                          className="px-3 py-1.5 text-caption text-charcoal-600 hover:text-charcoal-900 underline transition-colors"
                        >
                          Request Return / Swap
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Modal */}
        {cancelModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-ivory-100 w-full max-w-md p-6 shadow-overlay border border-ivory-300 relative animate-scale-in space-y-4">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-serif text-heading-lg text-charcoal-900">Cancel Order</h3>
              </div>
              <p className="text-body-sm text-charcoal-600">
                Are you sure you want to cancel Order{' '}
                <strong className="text-charcoal-900">#{cancelModalOrder.orderNumber}</strong>?
              </p>
              <div>
                <label htmlFor="cancel-reason" className="block text-caption text-charcoal-700 font-medium mb-1">
                  Reason for Cancellation
                </label>
                <select
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full p-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 outline-none"
                >
                  <option value="Ordered wrong size or color">Ordered wrong size or color</option>
                  <option value="Found alternative piece">Found alternative piece</option>
                  <option value="Changed delivery schedule">Changed delivery schedule</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCancelModalOrder(null)}
                  className="flex-1 py-2.5 border border-ivory-400 text-charcoal-700 text-body-sm font-medium hover:border-charcoal-900"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrderConfirm}
                  className="flex-1 py-2.5 bg-error text-white text-body-sm font-semibold hover:bg-error/90"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Modal */}
        {returnModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-ivory-100 w-full max-w-md p-6 shadow-overlay border border-ivory-300 relative animate-scale-in space-y-4">
              <button
                onClick={() => setReturnModalOrder(null)}
                className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-serif text-heading-lg text-charcoal-900">Request Return / Swap</h3>
              <p className="text-body-sm text-charcoal-600">
                Order <strong className="text-charcoal-900">#{returnModalOrder.orderNumber}</strong> · 7-Day Guarantee
              </p>
              <div>
                <label htmlFor="return-reason" className="block text-caption text-charcoal-700 font-medium mb-1">
                  Reason for Return
                </label>
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full p-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 outline-none"
                >
                  <option value="Size fit issue — need exchange">Size fit issue — need exchange</option>
                  <option value="Fabric color differs slightly from screen">Fabric color differs slightly</option>
                  <option value="Defect or stitching issue">Defect or stitching issue</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setReturnModalOrder(null)}
                  className="flex-1 py-2.5 border border-ivory-400 text-charcoal-700 text-body-sm font-medium hover:border-charcoal-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnOrderConfirm}
                  className="flex-1 py-2.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold hover:bg-charcoal-800"
                >
                  Schedule Return
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
