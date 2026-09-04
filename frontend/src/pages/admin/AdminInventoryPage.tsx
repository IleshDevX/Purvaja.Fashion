import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
} from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminPage, InventoryItem } from '../../features/admin/types/admin.js';
import { useToast } from '../../app/providers.js';

export function AdminInventoryPage() {
  const { addToast } = useToast();
  const [pageData, setPageData] = useState<AdminPage<InventoryItem> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadInventory = useCallback(
    async (currentFilter: typeof filter, search: string, currentPage: number) => {
      try {
        setLoading(true);
        setError('');
        const data = await adminService.getInventory(currentFilter, currentPage, 25, search);
        setPageData(data);
      } catch {
        setError('Unable to load inventory matrix.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInventory(filter, searchQuery, page);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filter, searchQuery, page, loadInventory]);

  const handleFilterChange = (nextFilter: typeof filter) => {
    setFilter(nextFilter);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStockAdjust = async (variantId: string, currentStock: number, delta: number) => {
    const target = Math.max(0, currentStock + delta);
    try {
      await adminService.updateVariantStock(variantId, target);
      addToast(`Updated stock level to ${target} units.`, 'success');
      void loadInventory(filter, searchQuery, page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to update stock.', 'error');
    }
  };

  const items = pageData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
            Stock Management
          </span>
          <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl mt-0.5">
            SKU Inventory Matrix
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time stock units by size and weave colorway. Threshold alert set at ≤10 units.
          </p>
        </div>

        <span className="text-xs font-semibold text-charcoal-700 bg-white px-4 py-2 rounded-xl border border-ivory-300 shadow-2xs self-start sm:self-auto">
          Total: <span className="font-bold text-charcoal-950">{pageData?.total ?? 0}</span> Active SKUs
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-ivory-300 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-inventory-search"
            aria-label="Search inventory"
            type="text"
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search SKU code, shirt, or colorway..."
            className="w-full rounded-xl bg-ivory-50 border border-ivory-300 pl-10 pr-4 py-2 text-xs text-charcoal-950 placeholder:text-charcoal-400 outline-none focus:border-charcoal-950 focus:bg-white"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilterChange(f)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                filter === f
                  ? 'bg-charcoal-950 text-white font-bold shadow-xs'
                  : 'bg-ivory-50 text-charcoal-700 hover:text-charcoal-950 hover:bg-ivory-100'
              }`}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {/* Inventory Matrix Table */}
      <div className="rounded-2xl border border-ivory-300 bg-white overflow-x-auto shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-ivory-200 bg-ivory-50/80 text-charcoal-500 uppercase tracking-widest text-[10px]">
            <tr>
              <th className="py-3.5 px-4 font-bold">Shirting Model</th>
              <th className="py-3.5 px-4 font-bold">SKU Code</th>
              <th className="py-3.5 px-4 font-bold">Colorway</th>
              <th className="py-3.5 px-4 font-bold">Size</th>
              <th className="py-3.5 px-4 font-bold">Stock Status</th>
              <th className="py-3.5 px-4 font-bold">Current Units</th>
              <th className="py-3.5 px-4 font-bold text-right">Adjust Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {loading && !pageData ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-charcoal-500">
                  Loading inventory matrix…
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-ivory-50/60 transition-colors">
                <td className="py-4 px-4 font-serif text-sm font-bold text-charcoal-950">
                  {item.shirtName}
                </td>
                <td className="py-4 px-4 font-mono text-[11px] text-gold-800 font-semibold">
                  {item.sku}
                </td>
                <td className="py-4 px-4 text-charcoal-800 font-medium">
                  {item.color}
                </td>
                <td className="py-4 px-4 text-charcoal-900 font-semibold">
                  {item.size}
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                      item.status === 'out_of_stock'
                        ? 'border-rose-600/30 text-rose-800 bg-rose-50'
                        : item.status === 'low_stock'
                        ? 'border-amber-600/30 text-amber-800 bg-amber-50'
                        : 'border-emerald-600/30 text-emerald-800 bg-emerald-50'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-4 px-4 font-sans text-sm font-bold tabular-nums text-charcoal-950">
                  {item.stock} Units
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(item.id, item.stock, -1)}
                      className="p-1.5 rounded-lg bg-ivory-100 text-charcoal-700 hover:bg-ivory-200 hover:text-charcoal-950"
                      title="Decrease Stock"
                      aria-label="Decrease stock"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(item.id, item.stock, 5)}
                      className="px-2.5 py-1 rounded-lg bg-ivory-100 text-charcoal-800 hover:bg-ivory-200 text-[11px] font-bold"
                      title="+5 Units"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(item.id, item.stock, 1)}
                      className="p-1.5 rounded-lg bg-ivory-100 text-charcoal-700 hover:bg-ivory-200 hover:text-charcoal-950"
                      title="Increase Stock"
                      aria-label="Increase stock"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pageData && !pageData.items.length && (
          <p className="p-8 text-center text-sm text-charcoal-500">
            No SKUs match this filter or search query.
          </p>
        )}

        {pageData && (
          <div className="flex items-center justify-between border-t border-ivory-200 p-4 text-xs text-charcoal-600">
            <span>{pageData.total} total SKUs</span>
            <div className="space-x-2">
              <button
                type="button"
                disabled={pageData.page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded-lg border border-ivory-300 px-3 py-1 font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[11px] text-charcoal-400">
                Page {pageData.page} of {Math.max(pageData.totalPages, 1)}
              </span>
              <button
                type="button"
                disabled={pageData.page >= pageData.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg border border-ivory-300 px-3 py-1 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
