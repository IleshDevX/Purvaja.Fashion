import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
} from 'lucide-react';
import { adminDevelopmentService } from '../../features/admin/services/adminDevelopmentService.js';
import { InventoryItem } from '../../features/admin/types/admin.js';
import { useToast } from '../../app/providers.js';

export function AdminInventoryPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  const loadInventory = async () => {
    const list = await adminDevelopmentService.getInventory(filter);
    setItems(list);
  };

  useEffect(() => {
    loadInventory();
  }, [filter]);

  const handleStockAdjust = async (variantId: string, currentStock: number, delta: number) => {
    const target = Math.max(0, currentStock + delta);
    const res = await adminDevelopmentService.updateVariantStock(variantId, target);
    if (res.success) {
      addToast(res.message, 'success');
      loadInventory();
    } else {
      addToast(res.message, 'error');
    }
  };

  const filteredItems = items.filter(
    i =>
      i.shirtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.color.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
          Total: <span className="font-bold text-charcoal-950">{filteredItems.length}</span> Active SKUs
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
              onClick={() => setFilter(f)}
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
            {filteredItems.map(item => (
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
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
