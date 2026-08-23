import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  Check,
} from 'lucide-react';
import { DEVELOPMENT_SHIRTS } from '../../features/products/data/shirts.js';
import {
  Shirt,
  ShirtFit,
  ShirtFabric,
  ShirtCollar,
  ShirtSleeve,
  ShirtPattern,
  ShirtSize,
  ShirtVariant,
} from '../../features/products/types/product.js';
import {
  productFormSchema,
  FITS,
  FABRICS,
  COLLARS,
  SLEEVES,
  PATTERNS,
  SIZES,
} from '../../features/admin/schemas/productFormSchema.js';
import { useToast } from '../../app/providers.js';

export function AdminProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEditing = Boolean(productId);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>(2999);
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>('');
  const [fit, setFit] = useState<ShirtFit>('Slim');
  const [fabric, setFabric] = useState<ShirtFabric>('100% Egyptian Cotton');
  const [collar, setCollar] = useState<ShirtCollar>('Spread Collar');
  const [sleeve, setSleeve] = useState<ShirtSleeve>('Full Sleeve');
  const [pattern, setPattern] = useState<ShirtPattern>('Solid');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isDeal, setIsDeal] = useState(false);

  // Images state
  const [images, setImages] = useState<string[]>([
    '/images/products/artisan-mandala-brown-1.jpg',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Variants state
  const [variants, setVariants] = useState<ShirtVariant[]>([
    {
      id: 'v-1',
      color: { name: 'White Crisp', hex: '#FFFFFF' },
      size: '39 (M)',
      sku: 'PUR-SHIRT-WHT-39',
      stockCount: 20,
      inStock: true,
    },
    {
      id: 'v-2',
      color: { name: 'White Crisp', hex: '#FFFFFF' },
      size: '40 (M)',
      sku: 'PUR-SHIRT-WHT-40',
      stockCount: 15,
      inStock: true,
    },
  ]);

  // Variant addition form fields
  const [varColorName, setVarColorName] = useState('White Crisp');
  const [varColorHex, setVarColorHex] = useState('#FFFFFF');
  const [varSize, setVarSize] = useState<ShirtSize>('42 (L)');
  const [varStock, setVarStock] = useState<number>(25);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Prefill when editing
  useEffect(() => {
    if (isEditing && productId) {
      const existing = DEVELOPMENT_SHIRTS.find(s => s.id === productId);
      if (existing) {
        setName(existing.name);
        setSlug(existing.slug);
        setTagline(existing.tagline);
        setDescription(existing.description);
        setPrice(existing.price);
        setCompareAtPrice(existing.compareAtPrice || '');
        setFit(existing.fit);
        setFabric(existing.fabric);
        setCollar(existing.collar);
        setSleeve(existing.sleeve);
        setPattern(existing.pattern);
        setIsFeatured(Boolean(existing.isFeatured));
        setIsNewArrival(Boolean(existing.isNewArrival));
        setIsDeal(Boolean(existing.compareAtPrice && existing.compareAtPrice > existing.price));
        setImages(existing.images);
        setVariants(existing.variants);
      } else {
        addToast('Shirt not found in catalog.', 'error');
        navigate('/admin/products');
      }
    }
  }, [isEditing, productId]);

  // Auto-generate slug from name if creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddVariant = () => {
    const exists = variants.some(
      v => v.color.name.toLowerCase() === varColorName.toLowerCase() && v.size === varSize,
    );
    if (exists) {
      addToast(`Variant with ${varColorName} and size ${varSize} already exists.`, 'error');
      return;
    }

    const newSku = `PUR-${slug.slice(0, 5).toUpperCase()}-${varColorName.slice(0, 3).toUpperCase()}-${varSize.slice(0, 2)}`;
    const newVar: ShirtVariant = {
      id: `v-${Date.now().toString().slice(-4)}`,
      color: { name: varColorName, hex: varColorHex },
      size: varSize,
      sku: newSku,
      stockCount: varStock,
      inStock: varStock > 0,
    };
    setVariants(prev => [...prev, newVar]);
    addToast(`Added variant SKU: ${newSku}`, 'info');
  };

  const handleRemoveVariant = (id: string) => {
    if (variants.length <= 1) {
      addToast('At least one variant is required.', 'error');
      return;
    }
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const formData = {
      name,
      slug,
      tagline,
      description,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      fit,
      fabric,
      collar,
      sleeve,
      pattern,
      isFeatured,
      isNewArrival,
      isDeal,
      images,
      variants,
    };

    const validation = productFormSchema.safeParse(formData);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        errMap[path] = issue.message;
      });
      setFormErrors(errMap);
      addToast('Please correct form validation errors before saving.', 'error');
      return;
    }

    const uniqueColors = Array.from(new Map(variants.map(v => [v.color.name, v.color])).values());
    const uniqueSizes = Array.from(new Set(variants.map(v => v.size)));
    const careInstructions = [
      'Machine wash cold (30°C) on delicate cycle with mild detergent',
      'Warm steam iron while slightly damp for crisp sartorial finish',
      'Hang dry away from direct sunlight',
    ];

    if (isEditing && productId) {
      const idx = DEVELOPMENT_SHIRTS.findIndex(s => s.id === productId);
      if (idx !== -1) {
        DEVELOPMENT_SHIRTS[idx] = {
          ...DEVELOPMENT_SHIRTS[idx],
          ...formData,
          colors: uniqueColors,
          sizes: uniqueSizes,
          careInstructions,
        };
      }
      addToast(`Updated "${name}" successfully.`, 'success');
    } else {
      const newShirt: Shirt = {
        id: `shirt-${Date.now().toString().slice(-4)}`,
        rating: 4.9,
        reviewCount: 1,
        colors: uniqueColors,
        sizes: uniqueSizes,
        careInstructions,
        ...formData,
      };
      DEVELOPMENT_SHIRTS.unshift(newShirt);
      addToast(`Created new shirt "${name}" in catalog.`, 'success');
    }

    navigate('/admin/products');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12 text-charcoal-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal-500 hover:text-charcoal-950 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
          </Link>
          <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
            {isEditing ? `Edit: ${name || 'Shirt Piece'}` : 'Craft New Menswear Shirting Record'}
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Configure luxury atelier fabric cut, collar profile, SKU variant matrix, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-xs font-semibold text-charcoal-700 hover:bg-ivory-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>{isEditing ? 'Save Changes' : 'Create Shirting Record'}</span>
          </button>
        </div>
      </div>

      {/* 1. Basic Information */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <h3 className="font-serif text-lg font-bold text-charcoal-950">
          1. Basic Shirting Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Shirt Title *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Royal Giza Oxford Evening Shirt"
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
              required
            />
            {formErrors.name && <p className="text-[11px] text-rose-600 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              URL Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="e.g. royal-giza-oxford-evening-shirt"
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs font-mono text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
              required
            />
            {formErrors.slug && <p className="text-[11px] text-rose-600 mt-1">{formErrors.slug}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Editorial Tagline *
            </label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Handcrafted from rare Egyptian long-staple cotton with mother-of-pearl buttons"
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
              required
            />
            {formErrors.tagline && <p className="text-[11px] text-rose-600 mt-1">{formErrors.tagline}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Detailed Sartorial Description *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe weave properties, fabric drape, bespoke tailoring construction..."
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 p-4 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white leading-relaxed"
              required
            />
            {formErrors.description && <p className="text-[11px] text-rose-600 mt-1">{formErrors.description}</p>}
          </div>
        </div>
      </div>

      {/* 2. Pricing & Commercials */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <h3 className="font-serif text-lg font-bold text-charcoal-950">2. Pricing & Commercials (INR ₹)</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="2999"
              min={1}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs font-bold tabular-nums text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
              required
            />
            {formErrors.price && <p className="text-[11px] text-rose-600 mt-1">{formErrors.price}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Original Price / Compare At (₹)
            </label>
            <input
              type="number"
              value={compareAtPrice}
              onChange={e => setCompareAtPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="3999"
              min={1}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs font-bold tabular-nums text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            />
            {formErrors.compareAtPrice && <p className="text-[11px] text-rose-600 mt-1">{formErrors.compareAtPrice}</p>}
          </div>
        </div>
      </div>

      {/* 3. Sartorial Fabric & Tailoring Attributes */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <h3 className="font-serif text-lg font-bold text-charcoal-950">3. Sartorial Architecture</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Fit Profile *
            </label>
            <select
              value={fit}
              onChange={e => setFit(e.target.value as ShirtFit)}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs font-semibold text-charcoal-950 outline-none"
            >
              {FITS.map(f => (
                <option key={f} value={f}>{f} Fit</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Luxury Fabric *
            </label>
            <select
              value={fabric}
              onChange={e => setFabric(e.target.value as ShirtFabric)}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs font-semibold text-charcoal-950 outline-none"
            >
              {FABRICS.map(fab => (
                <option key={fab} value={fab}>{fab}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Collar Profile *
            </label>
            <select
              value={collar}
              onChange={e => setCollar(e.target.value as ShirtCollar)}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs font-semibold text-charcoal-950 outline-none"
            >
              {COLLARS.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Sleeve Cut *
            </label>
            <select
              value={sleeve}
              onChange={e => setSleeve(e.target.value as ShirtSleeve)}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs font-semibold text-charcoal-950 outline-none"
            >
              {SLEEVES.map(sl => (
                <option key={sl} value={sl}>{sl}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Pattern / Texture *
            </label>
            <select
              value={pattern}
              onChange={e => setPattern(e.target.value as ShirtPattern)}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs font-semibold text-charcoal-950 outline-none"
            >
              {PATTERNS.map(pat => (
                <option key={pat} value={pat}>{pat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-charcoal-950">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={e => setIsNewArrival(e.target.checked)}
                className="rounded accent-charcoal-950"
              />
              <span>New In Season</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-charcoal-950">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                className="rounded accent-charcoal-950"
              />
              <span>Featured</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. SKU Variant Management */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-charcoal-950">4. SKU Variant Matrix</h3>
            <p className="text-xs text-charcoal-500 mt-0.5">Define colorways, collar sizing, and initial stock quantities</p>
          </div>
          <span className="text-xs font-bold text-gold-800">{variants.length} Variants Configured</span>
        </div>

        {/* Existing Variants Table */}
        <div className="rounded-xl border border-ivory-300 overflow-x-auto bg-ivory-50/50">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ivory-200 bg-ivory-100/80 text-charcoal-500 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Color Shade</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">SKU Code</th>
                <th className="py-2.5 px-4">Stock Units</th>
                <th className="py-2.5 px-4 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200">
              {variants.map(v => (
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
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="text-charcoal-400 hover:text-rose-600 p-1"
                      title="Remove variant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Variant Form Row */}
        <div className="p-4 rounded-xl border border-ivory-300 bg-ivory-50 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-700">+ Add Variant Row</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={varColorName}
              onChange={e => setVarColorName(e.target.value)}
              placeholder="Color (e.g. Ice Blue)"
              className="rounded-xl bg-white border border-ivory-300 px-3 py-2 text-xs text-charcoal-950"
            />
            <select
              value={varSize}
              onChange={e => setVarSize(e.target.value as ShirtSize)}
              className="rounded-xl bg-white border border-ivory-300 px-3 py-2 text-xs text-charcoal-950"
            >
              {SIZES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="number"
              value={varStock}
              onChange={e => setVarStock(Number(e.target.value))}
              placeholder="Stock units"
              min={0}
              className="rounded-xl bg-white border border-ivory-300 px-3 py-2 text-xs font-bold text-charcoal-950"
            />
            <button
              type="button"
              onClick={handleAddVariant}
              className="rounded-xl bg-charcoal-950 px-4 py-2 text-xs font-bold text-white hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
            >
              + Add Variant
            </button>
          </div>
        </div>
      </div>

      {/* 5. Product Image URLs */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <h3 className="font-serif text-lg font-bold text-charcoal-950">5. Product Gallery Media</h3>

        {/* Image Grid Previews */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="group relative rounded-xl border border-ivory-300 overflow-hidden aspect-[0.9] bg-ivory-50">
              <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-charcoal-950/80 text-white hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={newImageUrl}
            onChange={e => setNewImageUrl(e.target.value)}
            placeholder="Paste high-res image URL or local path (e.g. /images/products/...)..."
            className="flex-1 rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="rounded-xl border border-ivory-300 bg-ivory-50 px-5 py-2 text-xs font-bold text-charcoal-800 hover:bg-ivory-100 transition-colors"
          >
            Add Image
          </button>
        </div>
      </div>
    </form>
  );
}
