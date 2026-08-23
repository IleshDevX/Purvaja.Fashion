import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Shirt,
} from 'lucide-react';
import { DEVELOPMENT_SHIRTS } from '../../features/products/data/shirts.js';
import { Shirt as ShirtType } from '../../features/products/types/product.js';
import { useToast } from '../../app/providers.js';

export function AdminProductsPage() {
  const { addToast } = useToast();
  const [shirts, setShirts] = useState<ShirtType[]>(DEVELOPMENT_SHIRTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'new_arrivals' | 'deals'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating_desc'>('newest');
  const [deleteModalShirt, setDeleteModalShirt] = useState<ShirtType | null>(null);

  // Filtered and Sorted Shirts
  const filteredShirts = useMemo(() => {
    let result = [...shirts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.fabric.toLowerCase().includes(q) ||
          s.variants.some(v => v.sku.toLowerCase().includes(q)),
      );
    }

    if (statusFilter === 'in_stock') {
      result = result.filter(s => s.variants.some(v => (v.stockCount ?? 0) > 10));
    } else if (statusFilter === 'low_stock') {
      result = result.filter(s => s.variants.some(v => (v.stockCount ?? 0) > 0 && (v.stockCount ?? 0) <= 10));
    } else if (statusFilter === 'out_of_stock') {
      result = result.filter(s => s.variants.every(v => (v.stockCount ?? 0) <= 0));
    } else if (statusFilter === 'new_arrivals') {
      result = result.filter(s => s.isNewArrival);
    } else if (statusFilter === 'deals') {
      result = result.filter(s => s.compareAtPrice && s.compareAtPrice > s.price);
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating_desc') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'oldest') {
      result.reverse();
    }

    return result;
  }, [shirts, searchQuery, statusFilter, sortBy]);

  const handleDeleteConfirm = () => {
    if (!deleteModalShirt) return;
    setShirts(prev => prev.filter(s => s.id !== deleteModalShirt.id));
    addToast(`"${deleteModalShirt.name}" was removed from the development catalog.`, 'info');
    setDeleteModalShirt(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
            Catalog Inventory
          </span>
          <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl mt-0.5">
            Menswear Shirting Line
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Manage fabric specifications, collar cuts, pricing, and live variant SKU stock.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add New Shirt</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-2xl border border-ivory-300 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by shirt name, fabric, or SKU..."
            className="w-full rounded-xl bg-ivory-50 border border-ivory-300 pl-10 pr-4 py-2 text-xs text-charcoal-950 placeholder:text-charcoal-400 outline-none focus:border-charcoal-950 focus:bg-white"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs font-semibold text-charcoal-900 outline-none cursor-pointer hover:border-charcoal-400"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (≤10)</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="new_arrivals">New In Season</option>
            <option value="deals">Special Deals</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2 text-xs font-semibold text-charcoal-900 outline-none cursor-pointer hover:border-charcoal-400"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating_desc">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      {filteredShirts.length === 0 ? (
        <div className="p-16 rounded-2xl border border-ivory-300 bg-white text-center max-w-md mx-auto space-y-3 shadow-2xs">
          <Shirt className="h-10 w-10 text-charcoal-300 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-charcoal-950">No Matching Shirts Found</h3>
          <p className="text-xs text-charcoal-500">
            Try adjusting your search keywords or filter criteria.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl border border-ivory-300 bg-white overflow-hidden shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ivory-200 bg-ivory-50/80 text-charcoal-500 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Piece & Fabric</th>
                  <th className="py-3.5 px-4 font-bold">Fit & Collar</th>
                  <th className="py-3.5 px-4 font-bold">Price</th>
                  <th className="py-3.5 px-4 font-bold">Variants & Stock</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {filteredShirts.map(shirt => {
                  const totalStock = shirt.variants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0);
                  const isLow = totalStock > 0 && totalStock <= 15;
                  const isOut = totalStock <= 0;

                  return (
                    <tr key={shirt.id} className="hover:bg-ivory-50/60 transition-colors">
                      {/* Piece & Fabric */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={shirt.images[0]}
                            alt={shirt.name}
                            className="h-14 w-11 rounded-lg object-cover bg-ivory-100 border border-ivory-300 shrink-0"
                          />
                          <div>
                            <Link
                              to={`/admin/products/${shirt.id}`}
                              className="font-serif text-sm font-bold text-charcoal-950 hover:text-gold-700 transition-colors line-clamp-1"
                            >
                              {shirt.name}
                            </Link>
                            <p className="text-[11px] text-gold-800 font-medium">{shirt.fabric}</p>
                            <span className="font-mono text-[10px] text-charcoal-400 block mt-0.5">
                              ID: {shirt.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Fit & Collar */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-charcoal-900">{shirt.fit} Fit</p>
                        <p className="text-[11px] text-charcoal-500">{shirt.collar}</p>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4">
                        <p className="font-sans font-bold tabular-nums text-charcoal-950">
                          ₹{shirt.price.toLocaleString('en-IN')}
                        </p>
                        {shirt.compareAtPrice && (
                          <span className="text-[10px] text-charcoal-400 line-through tabular-nums">
                            ₹{shirt.compareAtPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* Variants & Stock */}
                      <td className="py-4 px-4">
                        <p className="font-semibold text-charcoal-900">{totalStock} Units total</p>
                        <p className="text-[11px] text-charcoal-500">{shirt.variants.length} SKU sizes</p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            isOut
                              ? 'border-rose-600/30 text-rose-800 bg-rose-50'
                              : isLow
                              ? 'border-amber-600/30 text-amber-800 bg-amber-50'
                              : 'border-emerald-600/30 text-emerald-800 bg-emerald-50'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/admin/products/${shirt.id}`}
                            className="p-1.5 text-charcoal-500 hover:text-charcoal-950 hover:bg-ivory-100 rounded-lg transition-colors"
                            title="Inspect Piece"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/admin/products/${shirt.id}/edit`}
                            className="p-1.5 text-charcoal-500 hover:text-gold-700 hover:bg-ivory-100 rounded-lg transition-colors"
                            title="Edit Shirt"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteModalShirt(shirt)}
                            className="p-1.5 text-charcoal-500 hover:text-rose-600 hover:bg-ivory-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-4">
            {filteredShirts.map(shirt => {
              const totalStock = shirt.variants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0);
              return (
                <div key={shirt.id} className="p-4 rounded-2xl border border-ivory-300 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <img
                      src={shirt.images[0]}
                      alt={shirt.name}
                      className="h-16 w-12 rounded-xl object-cover bg-ivory-100 border border-ivory-300 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm font-bold text-charcoal-950 line-clamp-1">{shirt.name}</h4>
                      <p className="text-[11px] text-gold-800 font-medium">{shirt.fabric}</p>
                      <p className="font-sans text-xs font-bold tabular-nums text-charcoal-950 mt-1">
                        ₹{shirt.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-ivory-200 text-xs">
                    <span className="text-charcoal-600 font-medium">{totalStock} units in stock</span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/products/${shirt.id}`}
                        className="p-2 rounded-lg bg-ivory-50 text-charcoal-700 hover:bg-ivory-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/admin/products/${shirt.id}/edit`}
                        className="p-2 rounded-lg bg-ivory-50 text-gold-800 hover:bg-ivory-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteModalShirt(shirt)}
                        className="p-2 rounded-lg bg-ivory-50 text-rose-700 hover:bg-ivory-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteModalShirt && (
        <div className="fixed inset-0 z-50 bg-charcoal-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-serif text-lg font-bold text-charcoal-950">Remove Shirting Record?</h3>
            </div>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-charcoal-950">"{deleteModalShirt.name}"</span> from the atelier catalog?
            </p>
            <p className="text-[11px] text-amber-900 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Note: This development-state deletion will remove the shirt during the active session.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalShirt(null)}
                className="rounded-xl border border-ivory-300 px-4 py-2 text-xs font-semibold text-charcoal-700 hover:bg-ivory-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
