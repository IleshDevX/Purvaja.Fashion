import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Layers, Package } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminProduct } from '../../features/admin/types/admin.js';
import { useToast } from '../../app/providers.js';

export function AdminProductDetailsPage() {
  const { productId = '' } = useParams();
  const { addToast } = useToast();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    void adminService
      .getProduct(productId)
      .then(setProduct)
      .catch(() => setError('Product was not found or could not be loaded.'));
  }, [productId]);

  const handleStatusChange = async (newStatus: AdminProduct['status']) => {
    if (!product) return;
    try {
      setUpdating(true);
      const updated = await adminService.updateProduct(product.id, { status: newStatus });
      setProduct(updated);
      addToast(`Product status updated to ${newStatus}.`, 'success');
    } catch {
      addToast('Unable to update product status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl bg-white border border-ivory-300 p-8 text-center max-w-md mx-auto space-y-4">
        <Package className="h-10 w-10 text-charcoal-400 mx-auto" />
        <h2 className="font-serif text-xl font-light text-charcoal-950">{error}</h2>
        <Link to="/admin/products" className="inline-block text-xs font-bold text-gold-800">
          ← Return to Products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-2xl bg-white border border-ivory-300 p-12 text-center text-sm text-charcoal-500">
        Loading product specification…
      </div>
    );
  }

  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900 max-w-6xl mx-auto pb-12">
      <div>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal-500 hover:text-charcoal-950 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
                {product.name}
              </h1>
              <span
                className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  product.status === 'ACTIVE'
                    ? 'bg-emerald-50 border-emerald-400/50 text-emerald-800'
                    : product.status === 'ARCHIVED'
                      ? 'bg-charcoal-100 border-charcoal-300 text-charcoal-600'
                      : 'bg-gold-50 border-gold-400/50 text-gold-800'
                }`}
              >
                {product.status}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-charcoal-400">Slug: {product.slug}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-ivory-300 bg-white p-1 text-xs">
              {(['DRAFT', 'ACTIVE', 'ARCHIVED'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  disabled={updating || product.status === st}
                  onClick={() => void handleStatusChange(st)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    product.status === st
                      ? 'bg-charcoal-950 text-white shadow-2xs'
                      : 'text-charcoal-600 hover:text-charcoal-950 disabled:opacity-40'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <Link
              to={`/admin/products/${product.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal-950 px-4 py-2 text-xs font-bold text-white uppercase tracking-wider hover:bg-gold-500 hover:text-charcoal-950 transition-colors shadow-2xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left 2 Cols: Details, Categories, Variants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-2xs">
            <h2 className="font-serif text-lg font-bold text-charcoal-950">Overview & Narrative</h2>
            <p className="text-sm text-charcoal-700 leading-relaxed">{product.description}</p>
            {product.tagline && (
              <p className="text-xs italic text-charcoal-500">Tagline: "{product.tagline}"</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-ivory-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400">Brand</span>
                <p className="font-semibold text-charcoal-950 mt-0.5">{product.brand || 'Purvaja'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400">Base Price</span>
                <p className="font-sans font-bold text-charcoal-950 mt-0.5">
                  ₹{(product.basePricePaise / 100).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400">Total Stock</span>
                <p className="font-semibold text-charcoal-950 mt-0.5">{totalStock} units</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400">Variants</span>
                <p className="font-semibold text-charcoal-950 mt-0.5">{product.variants.length} SKUs</p>
              </div>
            </div>
          </div>

          {/* Variants Table */}
          <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-ivory-200 p-5">
              <h2 className="font-serif text-lg font-bold text-charcoal-950">SKU Variants Matrix</h2>
              <Link to="/admin/variants" className="text-xs font-bold text-gold-800 hover:underline">
                Manage Variants →
              </Link>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-50 text-charcoal-500">
                <tr>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Size & Colour</th>
                  <th className="p-4">Price Override</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map(v => (
                  <tr key={v.id} className="border-t hover:bg-ivory-50/50">
                    <td className="p-4 font-mono font-medium text-charcoal-950">{v.sku}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-charcoal-300 shadow-2xs"
                          style={{ backgroundColor: v.colorHex }}
                        />
                        <span className="font-medium text-charcoal-900">{v.colorName}</span> · Size {v.size}
                      </span>
                    </td>
                    <td className="p-4 font-sans">
                      {v.priceOverridePaise !== null
                        ? `₹${(v.priceOverridePaise / 100).toLocaleString('en-IN')}`
                        : 'Base Price'}
                    </td>
                    <td className="p-4 font-semibold text-charcoal-950">{v.stockQuantity}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-charcoal-100 text-charcoal-600'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Categories, Images */}
        <div className="space-y-6">
          {/* Categories */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-3 shadow-2xs">
            <h2 className="font-serif text-base font-bold text-charcoal-950 flex items-center gap-2">
              <Layers className="h-4 w-4 text-gold-700" />
              <span>Assigned Categories</span>
            </h2>
            <div className="flex flex-wrap gap-2 pt-1">
              {product.categories.length > 0 ? (
                product.categories.map(c => (
                  <span
                    key={c.id}
                    className="rounded-lg bg-ivory-100 border border-ivory-300 px-2.5 py-1 text-xs font-semibold text-charcoal-800"
                  >
                    {c.name}
                  </span>
                ))
              ) : (
                <p className="text-xs text-charcoal-500">No category tags assigned.</p>
              )}
            </div>
          </div>

          {/* Product Gallery */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-2xs">
            <h2 className="font-serif text-base font-bold text-charcoal-950">Visual Gallery</h2>
            {product.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {product.images
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(img => (
                    <div key={img.id} className="relative rounded-xl overflow-hidden border border-ivory-300 group">
                      <img
                        src={img.url}
                        alt="Product visual"
                        className="h-32 w-full object-cover bg-ivory-50"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-charcoal-950/80 backdrop-blur-xs text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-charcoal-500">No visual assets attached.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
