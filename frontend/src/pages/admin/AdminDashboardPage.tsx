import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Shirt,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Eye,
  Package,
} from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import { AdminDashboardMetrics } from '../../features/admin/types/admin.js';
import { Order } from '../../features/orders/types/order.js';
import { ORDER_STATUS_CONFIG } from '../../features/orders/utils/orderStatus.js';

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartData, setChartData] = useState<{ label: string; revenue: number; orders: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topShirts, setTopShirts] = useState<Array<{ product: { id: string; name: string; images: string[]; price: number }; unitsSold: number; totalRevenue: number }>>([]);

  useEffect(() => {
    void Promise.all([
      adminService.getDashboardMetrics(),
      adminService.getSalesChartData(timeframe),
      adminService.listOrders(),
      adminService.getTopProducts(),
    ]).then(([nextMetrics, nextChartData, orders, topProducts]) => {
      setMetrics(nextMetrics);
      setChartData(nextChartData);
      setRecentOrders(orders.slice(0, 5));
      setTopShirts(topProducts);
    });
  }, [timeframe]);

  const maxRevenue = chartData.length ? Math.max(...chartData.map(d => d.revenue)) : 100000;


  return (
    <div className="space-y-8 animate-fade-in text-charcoal-900">
      {/* ── Top Overview Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
              Operations Control Center
            </span>
          </div>
          <h1 className="font-serif text-3xl font-light tracking-tight text-charcoal-950 sm:text-4xl">
            Atelier Executive Dashboard
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time menswear shirting metrics, order workflows, and catalog stock status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
          >
            <Shirt className="h-4 w-4" />
            <span>+ Add New Shirt</span>
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-charcoal-800 shadow-2xs hover:bg-ivory-100 transition-colors"
          >
            <span>Review Orders</span>
          </Link>
        </div>
      </div>

      {/* ── 6 High-Level Operational KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-ivory-300 bg-white p-3.5 sm:p-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between text-charcoal-400 mb-1.5 sm:mb-2">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em]">Total Revenue</span>
            <TrendingUp className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-emerald-600" />
          </div>
          <p className="font-sans text-xl font-bold tabular-nums text-charcoal-950">
            ₹{metrics?.totalRevenue.toLocaleString('en-IN') ?? '3,48,900'}
          </p>
          <span className="inline-block text-[10px] font-semibold text-emerald-700 mt-1">
            +18.4% vs last period
          </span>
        </div>

        <div className="rounded-2xl border border-ivory-300 bg-white p-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between text-charcoal-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Total Orders</span>
            <ShoppingBag className="h-4 w-4 text-gold-600" />
          </div>
          <p className="font-sans text-xl font-bold tabular-nums text-charcoal-950">
            {metrics?.totalOrders ?? '142'}
          </p>
          <span className="inline-block text-[10px] font-semibold text-charcoal-500 mt-1">
            Tailored & Dispatched
          </span>
        </div>

        <div className="rounded-2xl border border-ivory-300 bg-white p-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between text-charcoal-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Shirts Sold</span>
            <Shirt className="h-4 w-4 text-sky-600" />
          </div>
          <p className="font-sans text-xl font-bold tabular-nums text-charcoal-950">
            {metrics?.shirtsSold ?? '386'}
          </p>
          <span className="inline-block text-[10px] font-semibold text-charcoal-500 mt-1">
            Egyptian Cotton & Linen
          </span>
        </div>

        <div className="rounded-2xl border border-ivory-300 bg-white p-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between text-charcoal-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Active Patrons</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="font-sans text-xl font-bold tabular-nums text-charcoal-950">
            {metrics?.activeCustomers ?? '6'}
          </p>
          <span className="inline-block text-[10px] font-semibold text-gold-800 mt-1">
            Private Member Tier
          </span>
        </div>

        <div className="rounded-2xl border border-ivory-300 bg-white p-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between text-charcoal-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">In Atelier Queue</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-sans text-xl font-bold tabular-nums text-charcoal-950">
            {metrics?.pendingOrders ?? '8'}
          </p>
          <span className="inline-block text-[10px] font-semibold text-amber-700 mt-1">
            Awaiting Final Stitch
          </span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Low Stock Alert</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="font-sans text-xl font-bold tabular-nums text-rose-950">
            {metrics?.lowStockCount ?? '3'} SKUs
          </p>
          <Link
            to="/admin/inventory"
            className="inline-block text-[10px] font-bold text-rose-700 hover:underline mt-1"
          >
            Review inventory →
          </Link>
        </div>
      </div>

      {/* ── 2-Column: Sales Chart + Order Status Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Performance Chart (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-ivory-300 bg-white p-6 space-y-6 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-950">Sartorial Revenue Performance</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Gross order turnover tracking
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 rounded-xl bg-ivory-100 p-1 border border-ivory-300 self-start sm:self-auto">
              {(['daily', 'weekly', 'monthly'] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    timeframe === tf ? 'bg-charcoal-950 text-white font-bold shadow-xs' : 'text-charcoal-600 hover:text-charcoal-950'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Lightweight Responsive Chart Visualization */}
          <div className="pt-2">
            <div className="relative h-64 w-full flex flex-col justify-between">
              {/* Background Reference Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[10px] text-charcoal-400">
                <div className="border-b border-ivory-200 w-full flex justify-between">
                  <span>₹{(maxRevenue).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-b border-ivory-200/80 border-dashed w-full flex justify-between">
                  <span>₹{(maxRevenue * 0.75).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-b border-ivory-200/80 border-dashed w-full flex justify-between">
                  <span>₹{(maxRevenue * 0.5).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-b border-ivory-200/80 border-dashed w-full flex justify-between">
                  <span>₹{(maxRevenue * 0.25).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-b border-ivory-300 w-full flex justify-between">
                  <span>₹0</span>
                </div>
              </div>

              {/* Bars Layer */}
              <div className="relative z-10 h-52 w-full flex items-end gap-3 sm:gap-6 px-8">
                {chartData.map((item, idx) => {
                  const heightPercent = Math.max(15, Math.min(100, Math.round((item.revenue / maxRevenue) * 100)));
                  return (
                    <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-charcoal-950 text-white rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-xl pointer-events-none whitespace-nowrap z-20">
                        <p className="text-gold-300">₹{item.revenue.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-white/70">{item.orders} tailored orders</p>
                      </div>

                      {/* Bar Track & Filled Bar */}
                      <div className="w-full max-w-[48px] h-full rounded-t-xl bg-ivory-100/90 flex flex-col justify-end p-1 border border-ivory-200/60 overflow-hidden">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-gold-600 via-gold-500 to-gold-400 group-hover:from-gold-700 group-hover:to-gold-300 transition-all duration-500 shadow-sm"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* X-Axis Label */}
                      <span className="text-[11px] font-bold text-charcoal-700 mt-2.5 block">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div>
            <h3 className="font-serif text-lg font-bold text-charcoal-950">Order Pipeline Health</h3>
            <p className="text-xs text-charcoal-500 mt-0.5">Current state of client tailoring orders</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-charcoal-700">Delivered & Completed</span>
                <span className="text-emerald-700 font-bold">65%</span>
              </div>
              <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-charcoal-700">In Transit / Shipped</span>
                <span className="text-gold-700 font-bold">18%</span>
              </div>
              <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
                <div className="h-full bg-gold-500 rounded-full" style={{ width: '18%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-charcoal-700">Processing in Atelier</span>
                <span className="text-amber-700 font-bold">12%</span>
              </div>
              <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '12%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-charcoal-700">Cancelled / Exchanged</span>
                <span className="text-rose-700 font-bold">5%</span>
              </div>
              <div className="h-2 rounded-full bg-ivory-200 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '5%' }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ivory-200 bg-ivory-50 p-4 text-xs text-charcoal-600 space-y-1">
            <p className="font-bold text-charcoal-950">Delivery Reliability</p>
            <p className="text-[11px]">Average dispatch turnaround is currently 22.4 hours.</p>
          </div>
        </div>
      </div>

      {/* ── 2-Column: Recent Orders + Top Selling Shirts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders Table (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-950">Recent Client Orders</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">Latest shirting purchases and tailoring tickets</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold uppercase tracking-wider text-gold-800 hover:text-charcoal-950 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-ivory-200 overflow-x-auto">
            {recentOrders.map(order => {
              const statusMeta = ORDER_STATUS_CONFIG[order.status] || {
                label: order.status,
              };

              return (
                <div key={order.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-ivory-100 border border-ivory-300 flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-gold-700" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-charcoal-950">#{order.orderNumber}</p>
                      <p className="text-[11px] text-charcoal-500">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''} · {order.paymentMethod?.name || (order.paymentMethod?.id === 'cod' ? 'Cash on Delivery' : 'PhonePe Secure')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-sans text-xs font-bold tabular-nums text-charcoal-950">
                      ₹{order.grandTotal.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        order.status === 'delivered'
                          ? 'border-emerald-600/30 text-emerald-800 bg-emerald-50'
                          : order.status === 'cancelled'
                          ? 'border-rose-600/30 text-rose-800 bg-rose-50'
                          : 'border-gold-500/40 text-gold-800 bg-gold-50'
                      }`}
                    >
                      {statusMeta.label}
                    </span>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="p-1.5 text-charcoal-400 hover:text-charcoal-950 hover:bg-ivory-100 rounded-lg"
                      title="Inspect Order"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Shirts (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-charcoal-950">Top-Selling Pieces</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">Best performing menswear shirts by volume</p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-bold uppercase tracking-wider text-gold-800 hover:text-charcoal-950 flex items-center gap-1"
            >
              Catalog <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topShirts.map(({ product, unitsSold, totalRevenue }, idx) => (
              <div
                key={product.id}
                className="p-3 rounded-xl border border-ivory-200 bg-ivory-50/60 flex items-center justify-between gap-3 hover:bg-ivory-100/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-serif text-xs font-bold text-gold-800 w-4">{idx + 1}.</span>
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-10 w-8 rounded-lg object-cover bg-white shrink-0 border border-ivory-300"
                  />
                  <div className="min-w-0">
                    <p className="font-serif text-xs font-bold text-charcoal-950 truncate">{product.name}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-sans text-xs font-bold tabular-nums text-charcoal-950">
                    ₹{totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold">{unitsSold} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
