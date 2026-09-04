import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminOrder, AdminOrderTransition, AdminPage } from '../../features/admin/types/admin.js';

const transitions: Record<AdminOrder['status'], AdminOrderTransition[]> = {
  PENDING: [],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: [],
  RETURNED: [],
};

export function AdminOrdersPage() {
  const [data, setData] = useState<AdminPage<AdminOrder> | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async (searchQuery: string, page = 1) => {
    try {
      setError('');
      setData(await adminService.listOrders(searchQuery, page));
    } catch {
      setError('Unable to load orders.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(search), 250);
    return () => window.clearTimeout(timer);
  }, [search, load]);

  const change = async (id: string, status: AdminOrderTransition) => {
    try {
      setUpdating(id);
      await adminService.updateOrderStatus(id, status);
      await load(search, data?.page ?? 1);
    } catch {
      setError('The requested order transition is not valid.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      <div className="border-b border-ivory-300 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-800">Fulfilment</p>
        <h1 className="mt-1 font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
          Tailored Orders
        </h1>
        <p className="mt-1 text-xs text-charcoal-500">
          Client order status, financial balances, and dispatch pipeline transitions.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-charcoal-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search order number or customer email..."
          className="w-full rounded-xl border border-ivory-300 bg-white py-2 pl-9 pr-3 text-xs text-charcoal-950 outline-none focus:border-charcoal-950"
        />
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {!data ? (
        <div className="rounded-xl bg-white p-6 text-sm text-charcoal-500">Loading orders…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-50 text-charcoal-500">
              <tr>
                <th className="p-4">Order # / Placed</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Dispatch Stage</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(o => {
                const nextOptions = transitions[o.status] ?? [];
                return (
                  <tr key={o.id} className="border-t hover:bg-ivory-50/50 transition-colors">
                    <td className="p-4 font-mono">
                      <span className="font-bold text-charcoal-950">{o.orderNumber}</span>
                      <br />
                      <span className="text-[10px] text-charcoal-400">
                        {new Date(o.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-charcoal-900">
                        {o.customer.firstName || o.customer.lastName
                          ? `${o.customer.firstName ?? ''} ${o.customer.lastName ?? ''}`.trim()
                          : 'Customer'}
                      </p>
                      <p className="font-mono text-[10px] text-charcoal-500">{o.customer.email}</p>
                    </td>
                    <td className="p-4">
                      {o.items.reduce((sum, item) => sum + item.quantity, 0)} units
                    </td>
                    <td className="p-4 font-sans font-semibold tabular-nums text-charcoal-950">
                      ₹{(o.totalPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className="inline-block rounded-md bg-ivory-100 px-2 py-0.5 text-[10px] font-bold text-charcoal-800">
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        disabled={updating === o.id || nextOptions.length === 0}
                        value=""
                        onChange={e => {
                          if (e.target.value) void change(o.id, e.target.value as AdminOrderTransition);
                        }}
                        className="rounded-lg border border-ivory-300 bg-white p-1 text-[11px] font-semibold text-charcoal-900 outline-none disabled:opacity-50"
                      >
                        <option value="">{o.status}</option>
                        {nextOptions.map(next => (
                          <option key={next} value={next}>
                            → {next}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="font-bold text-gold-800 hover:text-charcoal-950 transition-colors"
                      >
                        View Ticket
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!data.items.length && (
            <p className="p-8 text-center text-sm text-charcoal-500">No orders found.</p>
          )}

          <div className="flex items-center justify-between border-t border-ivory-200 p-4 text-xs text-charcoal-600">
            <span>{data.total} total orders</span>
            <div className="space-x-2">
              <button
                type="button"
                disabled={data.page === 1}
                onClick={() => void load(search, data.page - 1)}
                className="rounded-lg border border-ivory-300 px-3 py-1 font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[11px] text-charcoal-400">
                Page {data.page} of {Math.max(data.totalPages, 1)}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => void load(search, data.page + 1)}
                className="rounded-lg border border-ivory-300 px-3 py-1 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
