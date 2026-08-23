import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Eye,
  Shirt,
  Star,
  ExternalLink,
} from 'lucide-react';
import { DEVELOPMENT_SHIRTS } from '../../features/products/data/shirts.js';

export function AdminProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const shirt = DEVELOPMENT_SHIRTS.find(s => s.id === productId);

  if (!shirt) {
    return (
      <div className="p-16 rounded-2xl border border-ivory-300 bg-white text-center max-w-md mx-auto space-y-4 shadow-2xs">
        <Shirt className="h-10 w-10 text-charcoal-300 mx-auto" />
        <h2 className="font-serif text-2xl font-light text-charcoal-950">Shirt Not Found</h2>
        <p className="text-xs text-charcoal-500">The requested shirting piece does not exist in the active catalog.</p>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider"
        >
          Return to Products
        </Link>
      </div>
    );
  }

  const totalStock = shirt.variants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0);
  const totalInventoryValue = totalStock * shirt.price;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12 text-charcoal-900">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal-500 hover:text-charcoal-950 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
              {shirt.name}
            </h1>
            {shirt.isNewArrival && (
              <span className="rounded-full bg-gold-50 border border-gold-400/50 text-gold-800 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                New Season
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal-500 mt-1">{shirt.tagline}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/shirts/${shirt.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-xs font-semibold text-charcoal-800 hover:bg-ivory-100 transition-colors shadow-2xs"
          >
            <span>Live Store View</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Link>
          <Link
            to={`/admin/products/${shirt.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            <span>Edit Piece</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Gallery & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Product Images & Key Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Images Grid */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-4 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div className="rounded-xl overflow-hidden aspect-[0.92] bg-ivory-50 border border-ivory-200">
              <img src={shirt.images[0]} alt={shirt.name} className="w-full h-full object-cover" />
            </div>
            {shirt.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {shirt.images.slice(1).map((img, idx) => (
                  <div key={idx} className="rounded-lg overflow-hidden aspect-square border border-ivory-200 bg-ivory-50">
                    <img src={img} alt={`${shirt.name} ${idx + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Metrics Card */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-5 space-y-3 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <h4 className="font-serif text-sm font-bold text-charcoal-950">Commercial Inventory Stats</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Total Stock</span>
                <span className="font-sans text-lg font-bold text-charcoal-950 tabular-nums">{totalStock} Units</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Valuation</span>
                <span className="font-sans text-lg font-bold text-gold-800 tabular-nums">
                  ₹{totalInventoryValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Sartorial Specs & Variant Table (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Price & Commercials Banner */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 flex items-center justify-between shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block mb-1">
                Selling Price
              </span>
              <div className="flex items-baseline gap-3">
                <span className="font-sans text-3xl font-bold tabular-nums text-charcoal-950">
                  ₹{shirt.price.toLocaleString('en-IN')}
                </span>
                {shirt.compareAtPrice && (
                  <span className="font-sans text-sm font-semibold tabular-nums text-charcoal-400 line-through">
                    ₹{shirt.compareAtPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block mb-1">
                Rating & Reviews
              </span>
              <div className="flex items-center gap-1.5 text-gold-700 font-bold text-sm">
                <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
                <span className="text-charcoal-950">{shirt.rating}</span>
                <span className="text-charcoal-400 text-xs font-normal">({shirt.reviewCount})</span>
              </div>
            </div>
          </div>

          {/* Sartorial Attributes */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <h3 className="font-serif text-lg font-bold text-charcoal-950">Sartorial Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Fit</span>
                <span className="font-semibold text-charcoal-900">{shirt.fit} Fit</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Fabric</span>
                <span className="font-semibold text-charcoal-900">{shirt.fabric}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Collar</span>
                <span className="font-semibold text-charcoal-900">{shirt.collar}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Sleeve</span>
                <span className="font-semibold text-charcoal-900">{shirt.sleeve}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Pattern</span>
                <span className="font-semibold text-charcoal-900">{shirt.pattern}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1">Weave Origin</span>
                <span className="font-semibold text-gold-800">Biella & Como, Italy</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase text-charcoal-400 block mb-1.5">Description</span>
              <p className="text-xs text-charcoal-700 leading-relaxed">{shirt.description}</p>
            </div>
          </div>

          {/* Variants Table */}
          <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-4 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-charcoal-950">Variant SKUs</h3>
              <span className="text-xs font-bold text-gold-800">{shirt.variants.length} Available</span>
            </div>

            <div className="rounded-xl border border-ivory-300 overflow-x-auto bg-ivory-50/50">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ivory-200 bg-ivory-100/80 text-charcoal-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Color Shade</th>
                    <th className="py-2.5 px-4">Size</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Stock Units</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {shirt.variants.map(v => (
                    <tr key={v.id} className="bg-white">
                      <td className="py-3 px-4 font-semibold text-charcoal-950 flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-ivory-300"
                          style={{ backgroundColor: v.color.hex }}
                        />
                        <span>{v.color.name}</span>
                      </td>
                      <td className="py-3 px-4 text-charcoal-900 font-medium">{v.size}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gold-800 font-semibold">{v.sku}</td>
                      <td className="py-3 px-4 font-bold tabular-nums text-charcoal-950">{v.stockCount ?? 0}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                            (v.stockCount ?? 0) > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-600/30'
                              : 'bg-rose-50 text-rose-800 border-rose-600/30'
                          }`}
                        >
                          {(v.stockCount ?? 0) > 0 ? 'In Stock' : 'Sold Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
