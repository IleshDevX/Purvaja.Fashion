import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Eye,
} from 'lucide-react';
import { developmentOrderStore } from '../../features/orders/store/developmentOrderStore.js';
import { Order, OrderStatus } from '../../features/orders/types/order.js';
import { ORDER_STATUS_CONFIG } from '../../features/orders/utils/orderStatus.js';
import { useToast } from '../../app/providers.js';

export function AdminOrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const loadOrders = async () => {
    const list = await developmentOrderStore.getOrders({
      status: statusFilter,
      searchQuery,
    });
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchQuery]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const res = await developmentOrderStore.updateOrderStatus(orderId, newStatus);
    if (res.success) {
      addToast(res.message, 'success');
      loadOrders();
    } else {
      addToast(res.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
            Tailoring Operations
          </span>
          <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl mt-0.5">
            Client Orders & Invoices
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Track order dispatch lifecycles, manage shipment status, and review customer invoices.
          </p>
        </div>

        <span className="text-xs font-semibold text-charcoal-700 bg-white px-4 py-2 rounded-xl border border-ivory-300 shadow-2xs self-start sm:self-auto">
          Total: <span className="font-bold text-charcoal-950">{orders.length}</span> Tailored Tickets
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-ivory-300 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Order # or item name..."
            className="w-full rounded-xl bg-ivory-50 border border-ivory-300 pl-10 pr-4 py-2 text-xs text-charcoal-950 placeholder:text-charcoal-400 outline-none focus:border-charcoal-950 focus:bg-white"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(
            st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                  statusFilter === st
                    ? 'bg-charcoal-950 text-white font-bold shadow-xs'
                    : 'bg-ivory-50 text-charcoal-700 hover:text-charcoal-950 hover:bg-ivory-100'
                }`}
              >
                {st}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="p-16 rounded-2xl border border-ivory-300 bg-white text-center max-w-md mx-auto space-y-3 shadow-2xs">
          <Package className="h-10 w-10 text-charcoal-300 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-charcoal-950">No Orders Found</h3>
          <p className="text-xs text-charcoal-500">There are no orders matching your current filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-ivory-300 bg-white overflow-x-auto shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ivory-200 bg-ivory-50/80 text-charcoal-500 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Order Ref</th>
                <th className="py-3.5 px-4 font-bold">Client Items</th>
                <th className="py-3.5 px-4 font-bold">Date Placed</th>
                <th className="py-3.5 px-4 font-bold">Total (INR)</th>
                <th className="py-3.5 px-4 font-bold">Payment</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {orders.map(order => {
                const statusMeta = ORDER_STATUS_CONFIG[order.status] || {
                  label: order.status,
                };

                return (
                  <tr key={order.id} className="hover:bg-ivory-50/60 transition-colors">
                    {/* Order Ref */}
                    <td className="py-4 px-4 font-mono font-bold text-charcoal-950">
                      #{order.orderNumber}
                    </td>

                    {/* Items */}
                    <td className="py-4 px-4">
                      <p className="font-serif text-xs font-bold text-charcoal-950 line-clamp-1">
                        {order.items[0]?.name}
                        {order.items.length > 1 && ` +${order.items.length - 1} more`}
                      </p>
                      <p className="text-[10px] text-charcoal-500">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} total pieces
                      </p>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-charcoal-700">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Total */}
                    <td className="py-4 px-4 font-sans font-bold tabular-nums text-charcoal-950">
                      ₹{order.grandTotal.toLocaleString('en-IN')}
                    </td>

                    {/* Payment */}
                    <td className="py-4 px-4">
                      <span className="text-[11px] font-semibold text-charcoal-800">
                        {order.paymentMethod?.name || (order.paymentMethod?.id === 'cod' ? 'Cash on Delivery' : 'PhonePe Secure')}
                      </span>
                    </td>

                    {/* Status with Quick Transition Selector */}
                    <td className="py-4 px-4">
                      <select
                        value={order.status}
                        onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className={`appearance-none rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border outline-none cursor-pointer ${
                          order.status === 'delivered'
                            ? 'border-emerald-600/30 text-emerald-800 bg-emerald-50'
                            : order.status === 'cancelled'
                            ? 'border-rose-600/30 text-rose-800 bg-rose-50'
                            : 'border-gold-500/40 text-gold-800 bg-gold-50'
                        }`}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 p-2 text-charcoal-400 hover:text-charcoal-950 hover:bg-ivory-100 rounded-lg transition-colors"
                        title="View Full Order Dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
