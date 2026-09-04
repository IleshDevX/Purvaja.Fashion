import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Boxes, ShoppingBag, Users, Plus } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminDashboardMetrics } from '../../features/admin/types/admin.js';

interface MetricProps {
  label: string;
  value: string | number;
  icon: typeof Boxes;
  href?: string;
}

const Metric = ({ label, value, icon: Icon, href }: MetricProps) => (
  <div className="rounded-2xl border border-ivory-300 bg-white p-5 shadow-2xs">
    <div className="flex items-center justify-between text-charcoal-500">
      <span className="text-[10px] font-bold uppercase tracking-[.16em]">{label}</span>
      <Icon className="h-4 w-4 text-gold-700" />
    </div>
    <p className="mt-3 text-2xl font-bold tabular-nums text-charcoal-950">{value}</p>
    {href && (
      <Link to={href} className="mt-2 inline-block text-xs font-bold text-gold-800 hover:underline">
        Review →
      </Link>
    )}
  </div>
);

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void adminService
      .getDashboardMetrics()
      .then(setMetrics)
      .catch(() => setError('Dashboard data could not be loaded.'));
  }, []);

  if (error) return <div className="rounded-2xl bg-white p-8 text-sm text-rose-800">{error}</div>;
  if (!metrics)
    return (
      <div className="rounded-2xl bg-white p-8 text-sm text-charcoal-500">
        Loading operations dashboard…
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      <div className="flex flex-col justify-between gap-4 border-b border-ivory-300 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-800">
            Operations control
          </p>
          <h1 className="mt-1 font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
            Atelier Dashboard
          </h1>
          <p className="mt-1 text-xs text-charcoal-500">
            Live figures from orders, customers, products, and inventory.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal-950 px-4 py-2 text-xs font-bold text-white uppercase tracking-wider hover:bg-gold-500 hover:text-charcoal-950 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Revenue from paid orders"
          value={`₹${metrics.totalRevenue.toLocaleString('en-IN')}`}
          icon={ShoppingBag}
        />
        <Metric
          label="Total orders"
          value={metrics.totalOrders}
          icon={ShoppingBag}
          href="/admin/orders"
        />
        <Metric
          label="Customers"
          value={metrics.totalCustomers}
          icon={Users}
          href="/admin/customers"
        />
        <Metric
          label="Low-stock variants"
          value={metrics.lowStockVariants}
          icon={AlertTriangle}
          href="/admin/inventory"
        />
        <Metric label="Pending payments" value={metrics.pendingPayments} icon={ShoppingBag} />
        <Metric label="Confirmed orders" value={metrics.confirmedOrders} icon={ShoppingBag} />
        <Metric label="Processing orders" value={metrics.processingOrders} icon={Boxes} />
        <Metric
          label="Out of stock"
          value={metrics.outOfStockVariants}
          icon={AlertTriangle}
          href="/admin/inventory"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-ivory-200 p-5">
          <h2 className="font-serif text-lg font-bold text-charcoal-950">Recent Tailored Orders</h2>
          <Link to="/admin/orders" className="text-xs font-bold text-gold-800 hover:underline">
            All orders →
          </Link>
        </div>
        {metrics.recentOrders.length ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-50 text-charcoal-500">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentOrders.map(order => (
                <tr key={order.id} className="border-t hover:bg-ivory-50/50 transition-colors">
                  <td className="p-4 font-mono font-bold text-charcoal-950">
                    <Link to={`/admin/orders/${order.id}`} className="hover:text-gold-800">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-charcoal-900">
                      {order.customer?.firstName || order.customer?.lastName
                        ? `${order.customer.firstName ?? ''} ${order.customer.lastName ?? ''}`.trim()
                        : 'Customer'}
                    </p>
                    <p className="font-mono text-[10px] text-charcoal-400">
                      {order.customer?.email ?? '—'}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="rounded-md bg-ivory-100 px-2 py-0.5 text-[10px] font-semibold text-charcoal-700">
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 font-sans font-bold tabular-nums text-charcoal-950">
                    ₹{(order.totalPaise / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <span className="rounded-md bg-gold-50 border border-gold-300 text-gold-800 px-2 py-0.5 text-[10px] font-bold">
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="font-bold text-gold-800 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-sm text-charcoal-500">No orders have been created.</p>
        )}
      </section>
    </div>
  );
}
