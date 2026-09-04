import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminPage, AdminProduct } from '../../features/admin/types/admin.js';

export function AdminProductsPage() {
  const [data, setData] = useState<AdminPage<AdminProduct> | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (query: string, page = 1) => {
    try {
      setError('');
      setData(await adminService.listProducts(query, page));
    } catch {
      setError('Unable to load products.');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(search), 250);
    return () => window.clearTimeout(timer);
  }, [search, load]);

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      <div className="flex flex-col justify-between gap-4 border-b border-ivory-300 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-800">Catalog</p>
          <h1 className="mt-1 font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
            Shirting Products
          </h1>
          <p className="mt-1 text-xs text-charcoal-500">
            Authoritative catalog models, variant counts, and live storefront publishing status.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal-950 px-4 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-gold-500 hover:text-charcoal-950 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-charcoal-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product name or slug..."
          className="w-full rounded-xl border border-ivory-300 bg-white py-2 pl-9 pr-3 text-xs text-charcoal-950 outline-none focus:border-charcoal-950"
        />
      </div>

      {error ? (
        <div className="rounded-xl bg-white p-6 text-sm text-rose-800">{error}</div>
      ) : !data ? (
        <div className="rounded-xl bg-white p-6 text-sm text-charcoal-500">Loading products…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-50 text-charcoal-500">
              <tr>
                <th className="p-4">Product Name / Slug</th>
                <th className="p-4">Categories</th>
                <th className="p-4">Base Price</th>
                <th className="p-4">Variants / Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(item => {
                const stock = item.variants.reduce((total, v) => total + v.stockQuantity, 0);
                return (
                  <tr key={item.id} className="border-t hover:bg-ivory-50/50 transition-colors">
                    <td className="p-4 font-semibold text-charcoal-950">
                      {item.name}
                      <p className="mt-0.5 font-mono text-[10px] text-charcoal-400">{item.slug}</p>
                    </td>
                    <td className="p-4">
                      {item.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.categories.map(c => (
                            <span
                              key={c.id}
                              className="rounded-md bg-ivory-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-700"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-charcoal-400">Uncategorised</span>
                      )}
                    </td>
                    <td className="p-4 font-sans font-medium text-charcoal-950">
                      ₹{(item.basePricePaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-charcoal-700">
                      <span className="font-semibold text-charcoal-950">{item.variants.length}</span> SKUs{' '}
                      <span className="text-charcoal-400">({stock} units)</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : item.status === 'ARCHIVED'
                              ? 'bg-charcoal-100 text-charcoal-600'
                              : 'bg-gold-50 text-gold-800 border border-gold-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/admin/products/${item.id}`}
                        className="inline-flex items-center gap-1 font-bold text-gold-800 hover:text-charcoal-950 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!data.items.length && (
            <p className="p-8 text-center text-sm text-charcoal-500">No products found.</p>
          )}

          <div className="flex items-center justify-between border-t border-ivory-200 p-4 text-xs text-charcoal-600">
            <span>{data.total} total products</span>
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
