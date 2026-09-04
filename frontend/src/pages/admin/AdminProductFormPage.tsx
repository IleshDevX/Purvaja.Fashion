import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminCategory, AdminProduct, AdminProductInput } from '../../features/admin/types/admin.js';
import { useToast } from '../../app/providers.js';

const empty: AdminProductInput = {
  name: '',
  slug: '',
  description: '',
  basePricePaise: 0,
  status: 'DRAFT',
  categoryIds: [],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AdminProductFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [value, setValue] = useState<AdminProductInput>(empty);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    void adminService.listCategories().then(setCategories);
    if (productId) {
      setLoading(true);
      void adminService
        .getProduct(productId)
        .then((p: AdminProduct) => {
          setValue({
            name: p.name,
            slug: p.slug,
            description: p.description,
            basePricePaise: p.basePricePaise,
            status: p.status,
            categoryIds: p.categories.map(c => c.id),
          });
        })
        .catch(() => setError('Product was not found or could not be loaded.'))
        .finally(() => setLoading(false));
    }
  }, [productId]);

  const handleNameChange = (name: string) => {
    if (!productId && (!value.slug || value.slug === slugify(value.name))) {
      setValue({ ...value, name, slug: slugify(name) });
    } else {
      setValue({ ...value, name });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Slug validation check
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(value.slug)) {
      setError('Slug must be lower-case alphanumeric with single hyphens (e.g. "classic-linen-shirt").');
      return;
    }

    if (value.description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }

    try {
      setSaving(true);
      if (productId) {
        await adminService.updateProduct(productId, value);
        addToast('Product updated successfully.', 'success');
      } else {
        await adminService.createProduct(value);
        addToast('Product created successfully.', 'success');
      }
      navigate('/admin/products');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Product could not be saved. Check required fields and unique slug.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-ivory-300 bg-white p-12 text-center text-sm text-charcoal-500">
        Loading product editor…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6 animate-fade-in text-charcoal-900 pb-12">
      <div>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal-500 hover:text-charcoal-950 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-800">
          Catalog editor
        </p>
        <h1 className="mt-1 font-serif text-3xl font-light text-charcoal-950 sm:text-4xl">
          {productId ? 'Edit Product' : 'New Shirting Product'}
        </h1>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-5 rounded-2xl border border-ivory-300 bg-white p-6 shadow-2xs">
        <div className="space-y-1">
          <label className="text-xs font-bold text-charcoal-900">Product Name *</label>
          <input
            required
            minLength={2}
            value={value.name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Royal Oxford Button-Down Shirt"
            className="w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-charcoal-900">URL Slug *</label>
          <input
            required
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            value={value.slug}
            onChange={e => setValue({ ...value, slug: e.target.value.toLowerCase() })}
            placeholder="e.g. royal-oxford-button-down-shirt"
            className="w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2 font-mono text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
          />
          <p className="text-[10px] text-charcoal-400">Lowercase letters, numbers, and hyphens only.</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-charcoal-900">Description *</label>
          <textarea
            required
            rows={4}
            minLength={10}
            value={value.description}
            onChange={e => setValue({ ...value, description: e.target.value })}
            placeholder="Detailed narrative, fabric composition, tailoring specifications..."
            className="w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-charcoal-900">Base Price (INR ₹) *</label>
            <input
              required
              min="0"
              step="1"
              type="number"
              value={value.basePricePaise ? value.basePricePaise / 100 : ''}
              onChange={e =>
                setValue({
                  ...value,
                  basePricePaise: Math.max(0, Math.round(Number(e.target.value) * 100)),
                })
              }
              placeholder="e.g. 2999"
              className="w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-charcoal-900">Publishing Status *</label>
            <select
              value={value.status}
              onChange={e =>
                setValue({ ...value, status: e.target.value as AdminProductInput['status'] })
              }
              className="w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2 text-xs font-semibold text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            >
              <option value="DRAFT">Draft (Unpublished)</option>
              <option value="ACTIVE">Active (Storefront Visible)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <fieldset className="pt-2 border-t border-ivory-200">
          <legend className="text-xs font-bold text-charcoal-900 mb-2">Assign Categories</legend>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {categories.map(c => {
                const checked = value.categoryIds?.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                      checked
                        ? 'bg-charcoal-950 border-charcoal-950 text-white'
                        : 'bg-ivory-50 border-ivory-300 text-charcoal-700 hover:bg-ivory-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={e => {
                        const current = value.categoryIds ?? [];
                        const next = e.target.checked
                          ? [...current, c.id]
                          : current.filter(id => id !== c.id);
                        setValue({ ...value, categoryIds: next });
                      }}
                    />
                    {checked && <Check className="h-3 w-3" />}
                    <span>{c.name}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-charcoal-400">No categories found in system.</p>
          )}
        </fieldset>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          to="/admin/products"
          className="rounded-xl border border-ivory-300 bg-white px-5 py-2.5 text-xs font-bold text-charcoal-700 hover:bg-ivory-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{saving ? 'Saving…' : 'Save Product'}</span>
        </button>
      </div>
    </form>
  );
}
