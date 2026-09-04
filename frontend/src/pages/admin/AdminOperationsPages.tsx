import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Save } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminCategory, AdminCoupon, AdminPage, AdminVariant, AuditLog, InventoryMovement, InventoryReservation } from '../../features/admin/types/admin.js';

const date = (value: string | null) => value ? new Date(value).toLocaleString('en-IN') : '—';
const PageState = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl border border-ivory-300 bg-white p-8 text-center text-sm text-charcoal-600">{children}</div>;
const Header = ({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) => <div className="flex flex-col gap-3 border-b border-ivory-300 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-800">{eyebrow}</p><h1 className="mt-1 font-serif text-3xl text-charcoal-950">{title}</h1></div>{children}</div>;
function Pager<T>({ value, onPage }: { value: AdminPage<T>; onPage: (page: number) => void }) { return <div className="flex items-center justify-between text-xs text-charcoal-600"><span>{value.total} records</span><div className="flex items-center gap-2"><button type="button" disabled={value.page === 1} onClick={() => onPage(value.page - 1)} className="rounded-lg border border-ivory-300 p-1 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Page {value.page} of {Math.max(value.totalPages, 1)}</span><button type="button" disabled={value.page >= value.totalPages} onClick={() => onPage(value.page + 1)} className="rounded-lg border border-ivory-300 p-1 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>; }

export function AdminCategoriesPage() {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setItems(await adminService.listCategories());
    } catch {
      setError('Unable to load categories.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = {
      name: String(form.get('name')).trim(),
      slug: String(form.get('slug')).trim(),
      description: String(form.get('description')).trim() || undefined,
      isActive: form.get('isActive') === 'on',
    };
    try {
      setBusy(true);
      if (editing?.id) await adminService.updateCategory(editing.id, value);
      else await adminService.createCategory(value);
      setEditing(null);
      e.currentTarget.reset();
      await load();
    } catch {
      setError('Category could not be saved. Check the name and slug.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header eyebrow="Catalog taxonomy" title="Categories">
        <button
          type="button"
          onClick={() =>
            setEditing({ id: '', name: '', slug: '', description: null, isActive: true, createdAt: '' })
          }
          className="rounded-xl bg-charcoal-950 px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="mr-1 inline h-4 w-4" />
          New category
        </button>
      </Header>
      {error && <PageState>{error}</PageState>}
      {editing && (
        <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-ivory-300 bg-white p-5 sm:grid-cols-2">
          <input name="name" required defaultValue={editing.name} placeholder="Name" className="rounded-lg border p-2" />
          <input name="slug" required defaultValue={editing.slug} placeholder="slug" className="rounded-lg border p-2" />
          <input name="description" defaultValue={editing.description ?? ''} placeholder="Description" className="rounded-lg border p-2 sm:col-span-2" />
          <label className="text-xs">
            <input name="isActive" type="checkbox" defaultChecked={editing.isActive} /> Active
          </label>
          <div className="flex gap-2">
            <button disabled={busy} className="rounded-lg bg-charcoal-950 px-3 py-2 text-xs font-bold text-white">
              <Save className="mr-1 inline h-3 w-3" />
              Save
            </button>
            <button type="button" onClick={() => setEditing(null)} className="text-xs">Cancel</button>
          </div>
        </form>
      )}
      <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-ivory-50 text-charcoal-500">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-4 font-semibold">
                  {item.name}
                  <p className="mt-1 font-normal text-charcoal-500">{item.description ?? 'No description'}</p>
                </td>
                <td className="p-4 font-mono">{item.slug}</td>
                <td className="p-4">{item.isActive ? 'Active' : 'Inactive'}</td>
                <td className="p-4 text-right">
                  <button onClick={() => setEditing(item)} className="text-gold-800">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && !error && <PageState>No categories exist yet.</PageState>}
      </div>
    </div>
  );
}

export function AdminVariantsPage() {
  const [data, setData] = useState<AdminPage<AdminVariant> | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (query = '', page = 1) => {
    try {
      setError('');
      setData(await adminService.listVariants(query, page));
    } catch {
      setError('Unable to load variants.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Header eyebrow="SKU catalogue" title="Variants">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SKU, colour or product"
            className="rounded-lg border p-2 text-xs"
          />
          <button onClick={() => void load(search, 1)} className="rounded-lg border p-2">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </Header>
      {error ? (
        <PageState>{error}</PageState>
      ) : !data ? (
        <PageState>Loading variants…</PageState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-50 text-charcoal-500">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Size / colour</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="p-4 font-semibold">{v.product.name}</td>
                  <td className="p-4 font-mono">{v.sku}</td>
                  <td className="p-4">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: v.colorHex }} /> {v.size} / {v.colorName}
                  </td>
                  <td className="p-4">{v.stockQuantity}</td>
                  <td className="p-4">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && <PageState>No variants match this search.</PageState>}
          <div className="p-4">
            <Pager value={data} onPage={p => void load(search, p)} />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminCouponsPage() {
  const [items, setItems] = useState<AdminCoupon[]>([]);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setItems(await adminService.listCoupons());
    } catch {
      setError('Unable to load coupons.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await adminService.createCoupon({
        code: String(f.get('code')).toUpperCase(),
        discountType: String(f.get('discountType')) as 'PERCENTAGE' | 'FIXED',
        discountValue: Number(f.get('discountValue')),
        minimumOrderPaise: null,
        maximumDiscountPaise: null,
        usageLimit: null,
        startsAt: null,
        endsAt: null,
        isActive: true,
      });
      setFormOpen(false);
      await load();
    } catch {
      setError('Coupon could not be created.');
    }
  };

  return (
    <div className="space-y-6">
      <Header eyebrow="Promotions" title="Coupons">
        <button onClick={() => setFormOpen(true)} className="rounded-xl bg-charcoal-950 px-4 py-2 text-xs font-bold text-white">
          <Plus className="mr-1 inline h-4 w-4" />
          New coupon
        </button>
      </Header>
      {formOpen && (
        <form onSubmit={submit} className="flex flex-wrap gap-3 rounded-2xl border border-ivory-300 bg-white p-5">
          <input required name="code" placeholder="CODE" className="rounded-lg border p-2 text-xs" />
          <select name="discountType" className="rounded-lg border p-2 text-xs">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed rupees</option>
          </select>
          <input required min="1" type="number" name="discountValue" placeholder="Value" className="rounded-lg border p-2 text-xs" />
          <button className="rounded-lg bg-charcoal-950 px-3 text-xs font-bold text-white">Create</button>
        </form>
      )}
      {error && <PageState>{error}</PageState>}
      <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-ivory-50 text-charcoal-500">
            <tr>
              <th className="p-4">Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Validity</th>
              <th className="p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-4 font-mono font-bold">{c.code}</td>
                <td className="p-4">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                <td className="p-4">{date(c.endsAt)}</td>
                <td className="p-4">{c.isActive ? 'Active' : 'Inactive'}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      await adminService.updateCoupon(c.id, { isActive: !c.isActive });
                      await load();
                    }}
                    className="text-gold-800"
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && !error && <PageState>No coupons exist yet.</PageState>}
      </div>
    </div>
  );
}

function ReadOnlyPage<T>({
  eyebrow,
  title,
  load,
  render,
}: {
  eyebrow: string;
  title: string;
  load: (page: number) => Promise<AdminPage<T>>;
  render: (item: T) => React.ReactNode;
}) {
  const [data, setData] = useState<AdminPage<T> | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    load(page)
      .then(res => {
        if (active) {
          setError('');
          setData(res);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load this operational history.');
        }
      });
    return () => {
      active = false;
    };
  }, [load, page]);

  return (
    <div className="space-y-6">
      <Header eyebrow={eyebrow} title={title} />
      {error ? (
        <PageState>{error}</PageState>
      ) : !data ? (
        <PageState>Loading…</PageState>
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((item, index) => (
              <div key={index} className="rounded-xl border border-ivory-300 bg-white p-4 text-xs">
                {render(item)}
              </div>
            ))}
            {!data.items.length && <PageState>No records found.</PageState>}
          </div>
          <Pager value={data} onPage={p => setPage(p)} />
        </>
      )}
    </div>
  );
}

const listMovements = (p: number) => adminService.listMovements(p);
const listReservations = (p: number) => adminService.listReservations(p);
const listAuditLogs = (p: number) => adminService.listAuditLogs(p);

export function AdminMovementsPage() {
  return (
    <ReadOnlyPage
      eyebrow="Inventory audit"
      title="Stock movements"
      load={listMovements}
      render={(m: InventoryMovement) => (
        <div className="flex flex-wrap justify-between gap-2">
          <span className="font-semibold">{m.variant.product.name} · {m.variant.sku}</span>
          <span>{m.type} {m.quantity > 0 ? '+' : ''}{m.quantity} ({m.previousQuantity} → {m.resultingQuantity})</span>
          <span>{m.reason ?? 'No reason'} · {date(m.createdAt)}</span>
        </div>
      )}
    />
  );
}

export function AdminReservationsPage() {
  return (
    <ReadOnlyPage
      eyebrow="Checkout holds"
      title="Inventory reservations"
      load={listReservations}
      render={(r: InventoryReservation) => (
        <div className="flex flex-wrap justify-between gap-2">
          <span className="font-semibold">{r.variant.product.name} · {r.variant.sku}</span>
          <span>{r.quantity} units · {r.status}</span>
          <span>Order {r.order.orderNumber} · expires {date(r.expiresAt)}</span>
        </div>
      )}
    />
  );
}

export function AdminAuditLogsPage() {
  return (
    <ReadOnlyPage
      eyebrow="Security trail"
      title="Audit logs"
      load={listAuditLogs}
      render={(log: AuditLog) => (
        <div className="flex flex-wrap justify-between gap-2">
          <span className="font-semibold">{log.action}</span>
          <span>{log.entityType} {log.entityId ?? '—'}</span>
          <span>{log.actor?.email ?? 'System'} · {date(log.createdAt)}</span>
        </div>
      )}
    />
  );
}
