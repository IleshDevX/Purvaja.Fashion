import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../app/providers.js';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminCategory, AdminProductInput } from '../../features/admin/types/admin.js';

const emptyProduct: AdminProductInput = {
  name: '', slug: '', tagline: null, description: '', brand: 'Purvaja', basePricePaise: 0,
  compareAtPricePaise: null, discountPercent: 0, fit: null, fabric: null, collar: null,
  sleeve: null, pattern: null, careInstructions: [], isFeatured: false, isNewArrival: false,
  isDeal: false, status: 'DRAFT', categoryIds: [], images: [],
};
const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (paise: number | null | undefined) => paise == null ? '' : String(paise / 100);
const toPaise = (value: string) => value === '' ? null : Math.round(Number(value) * 100);

export function AdminProductFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [value, setValue] = useState<AdminProductInput>(emptyProduct);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true); setError('');
    try {
      const [available, product] = await Promise.all([
        adminService.listCategories(),
        productId ? adminService.getProduct(productId) : Promise.resolve(null),
      ]);
      if (generation !== loadGeneration.current) return;
      setCategories(available);
      if (product) setValue({
        name: product.name, slug: product.slug, tagline: product.tagline ?? null,
        description: product.description, brand: product.brand ?? 'Purvaja',
        basePricePaise: product.basePricePaise, compareAtPricePaise: product.compareAtPricePaise ?? null,
        discountPercent: product.discountPercent ?? 0, fit: product.fit as AdminProductInput['fit'],
        fabric: product.fabric ?? null, collar: product.collar ?? null, sleeve: product.sleeve ?? null,
        pattern: product.pattern ?? null, careInstructions: product.careInstructions ?? [],
        isFeatured: product.isFeatured ?? false, isNewArrival: product.isNewArrival ?? false,
        isDeal: product.isDeal ?? false, status: product.status,
        categoryIds: product.categories.map(category => category.id),
        images: product.images.slice().sort((a,b) => a.sortOrder-b.sortOrder)
          .map(image => ({ url: image.url, isPrimary: image.isPrimary })),
      });
      else setValue(emptyProduct);
    } catch (cause) {
      if (generation === loadGeneration.current) setError(cause instanceof Error ? cause.message : 'The product editor could not be loaded.');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [productId]);
  useEffect(() => {
    void load();
    return () => { loadGeneration.current += 1; };
  }, [load]);

  const set = <K extends keyof AdminProductInput>(key: K, next: AdminProductInput[K]) =>
    setValue(current => ({ ...current, [key]: next }));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) return setError('Use a lowercase slug with single hyphens.');
    const images = (value.images ?? []).filter(x => x.url.trim()).map(x => ({...x,url:x.url.trim()}));
    if (images.length && images.filter(x => x.isPrimary).length !== 1) return setError('Select exactly one primary image.');
    try {
      setSaving(true);
      const saved = productId
        ? await adminService.updateProduct(productId, {...value,images})
        : await adminService.createProduct({...value,images});
      addToast(productId ? 'Product updated.' : 'Draft product created.', 'success');
      navigate(`/admin/products/${saved.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The product could not be saved.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="rounded-2xl border bg-white p-12 text-center">Loading product editor…</div>;
  if (error && !value.name && productId) return <div className="space-y-3 rounded-2xl border bg-white p-8 text-center"><p>{error}</p><button type="button" onClick={() => void load()} className="font-bold text-gold-800">Retry</button></div>;

  return <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6 pb-12">
    <div><Link to="/admin/products" className="mb-3 inline-flex items-center gap-1 text-xs font-bold"><ArrowLeft className="h-4 w-4" /> Products</Link><h1 className="font-serif text-4xl">{productId ? 'Edit product' : 'Create product draft'}</h1><p className="mt-2 text-sm text-charcoal-500">Active products require attributes, an active category, a primary image, and an active variant.</p></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    <section className="grid gap-4 rounded-2xl border border-ivory-300 bg-white p-6 sm:grid-cols-2">
      <Field label="Name"><input required minLength={2} value={value.name} onChange={e => { const name=e.target.value; setValue(c => ({...c,name,slug:!productId&&(!c.slug||c.slug===slugify(c.name))?slugify(name):c.slug})); }} /></Field>
      <Field label="URL slug"><input required value={value.slug} onChange={e => set('slug',e.target.value.toLowerCase())} /></Field>
      <Field label="Tagline"><input value={value.tagline ?? ''} onChange={e => set('tagline',e.target.value||null)} /></Field>
      <Field label="Brand"><input required value={value.brand ?? ''} onChange={e => set('brand',e.target.value)} /></Field>
      <Field label="Description" wide><textarea required minLength={10} rows={5} value={value.description} onChange={e => set('description',e.target.value)} /></Field>
      <Field label="Base price (INR)"><input required min="0" step="0.01" type="number" value={money(value.basePricePaise)} onChange={e => set('basePricePaise',toPaise(e.target.value)??0)} /></Field>
      <Field label="Compare-at price (INR)"><input min="0" step="0.01" type="number" value={money(value.compareAtPricePaise)} onChange={e => set('compareAtPricePaise',toPaise(e.target.value))} /></Field>
      <Field label="Discount percent"><input min="0" max="100" type="number" value={value.discountPercent ?? 0} onChange={e => set('discountPercent',Number(e.target.value))} /></Field>
      <Field label="Fit"><select value={value.fit ?? ''} onChange={e => set('fit',(e.target.value||null) as AdminProductInput['fit'])}><option value="">Select fit</option><option>Slim</option><option>Regular</option><option>Relaxed</option></select></Field>
      {(['fabric','collar','sleeve','pattern'] as const).map(key => <Field key={key} label={key[0].toUpperCase()+key.slice(1)}><input value={value[key] ?? ''} onChange={e => set(key,e.target.value||null)} /></Field>)}
      <Field label="Care instructions (one per line)" wide><textarea rows={3} value={(value.careInstructions ?? []).join('\n')} onChange={e => set('careInstructions',e.target.value.split('\n').map(x=>x.trim()).filter(Boolean))} /></Field>
      <Field label="Publication status"><select value={value.status} onChange={e => set('status',e.target.value as AdminProductInput['status'])}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></Field>
      <div className="flex flex-wrap items-end gap-4">{(['isFeatured','isNewArrival','isDeal'] as const).map(key => <label key={key} className="flex gap-2 text-xs"><input type="checkbox" checked={Boolean(value[key])} onChange={e => set(key,e.target.checked)} />{key.replace(/^is/,'')}</label>)}</div>
    </section>
    <section className="space-y-3 rounded-2xl border border-ivory-300 bg-white p-6"><h2 className="font-serif text-xl">Categories</h2><p className="text-xs text-charcoal-500">Saving with none selected explicitly clears all assignments.</p><div className="flex flex-wrap gap-2">{categories.map(category => <label key={category.id} className="rounded-lg border px-3 py-2 text-xs"><input className="mr-2" type="checkbox" checked={(value.categoryIds ?? []).includes(category.id)} onChange={e => set('categoryIds',e.target.checked?[...(value.categoryIds??[]),category.id]:(value.categoryIds??[]).filter(id=>id!==category.id))} />{category.name}{!category.isActive&&' (inactive)'}</label>)}{!categories.length&&<span className="text-sm text-charcoal-500">No categories exist.</span>}</div></section>
    <section className="space-y-3 rounded-2xl border border-ivory-300 bg-white p-6"><div className="flex justify-between"><div><h2 className="font-serif text-xl">Product images</h2><p className="text-xs text-charcoal-500">Use an HTTPS or site-relative URL and select one primary image.</p></div><button type="button" onClick={() => set('images',[...(value.images??[]),{url:'',isPrimary:!(value.images??[]).length}])} className="text-xs font-bold"><Plus className="inline h-4 w-4" /> Add image</button></div>{(value.images??[]).map((image,index)=><div key={index} className="flex gap-2"><input aria-label={`Image ${index+1} URL`} className="min-w-0 flex-1" value={image.url} onChange={e=>set('images',(value.images??[]).map((x,i)=>i===index?{...x,url:e.target.value}:x))} placeholder="https://… or /images/…" /><label className="flex items-center gap-1 text-xs"><input type="radio" name="primary-image" checked={image.isPrimary} onChange={()=>set('images',(value.images??[]).map((x,i)=>({...x,isPrimary:i===index})))} />Primary</label><button aria-label={`Remove image ${index+1}`} type="button" onClick={()=>{const rest=(value.images??[]).filter((_,i)=>i!==index);if(rest.length&&!rest.some(x=>x.isPrimary))rest[0]={...rest[0],isPrimary:true};set('images',rest);}}><Trash2 className="h-4 w-4" /></button></div>)}</section>
    <div className="flex justify-end gap-3"><Link to="/admin/products" className="rounded-xl border px-5 py-3 text-xs font-bold">Cancel</Link><button disabled={saving} className="rounded-xl bg-charcoal-950 px-6 py-3 text-xs font-bold text-white"><Save className="mr-2 inline h-4 w-4" />{saving?'Saving…':'Save product'}</button></div>
  </form>;
}

function Field({label,wide=false,children}:{label:string;wide?:boolean;children:React.ReactNode}) {
  return <label className={`space-y-1 text-xs font-bold ${wide?'sm:col-span-2':''}`}><span>{label}</span>{children}</label>;
}
