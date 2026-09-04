import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminCustomer, AdminPage } from '../../features/admin/types/admin.js';

export function AdminCustomersPage() {
  const [result, setResult] = useState<AdminPage<AdminCustomer> | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      adminService
        .getCustomers(search)
        .then(data => {
          if (active) {
            setError('');
            setResult(data);
          }
        })
        .catch(() => {
          if (active) {
            setError('Unable to load customers.');
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-ivory-300 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold-800">
          Customer registry
        </p>
        <h1 className="mt-1 font-serif text-3xl text-charcoal-950">Customers</h1>
        <p className="mt-1 text-xs text-charcoal-500">
          Server-authorized customer accounts and order histories.
        </p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-charcoal-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email"
          className="w-full rounded-xl border border-ivory-300 bg-white py-2 pl-9 pr-3 text-xs"
        />
      </div>
      {error ? (
        <div className="rounded-xl bg-white p-6 text-sm">{error}</div>
      ) : !result ? (
        <div className="rounded-xl bg-white p-6 text-sm">Loading customers…</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory-50 text-charcoal-500">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Account</th>
                <th className="p-4">Orders</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {result.items.map(customer => (
                <tr key={customer.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {customer.firstName ?? ''} {customer.lastName ?? ''}
                  </td>
                  <td className="p-4 font-mono">
                    {customer.email}
                    <br />
                    {customer.phone ?? 'No phone'}
                  </td>
                  <td className="p-4">
                    {customer.status}
                    <br />
                    <span className="text-charcoal-500">
                      Joined {new Date(customer.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </td>
                  <td className="p-4">{customer._count.orders}</td>
                  <td className="p-4 text-right">
                    <Link to={`/admin/customers/${customer.id}`} className="text-gold-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.items.length && (
            <p className="p-8 text-center text-sm text-charcoal-500">
              No customers match this search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
