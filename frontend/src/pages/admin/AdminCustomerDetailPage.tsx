import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminService } from '../../features/admin/services/adminService.js';
import type { AdminCustomerDetail } from '../../features/admin/types/admin.js';

export function AdminCustomerDetailPage() {
  const { customerId = '' } = useParams();
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void adminService
      .getCustomer(customerId)
      .then(setCustomer)
      .catch(() => setError('Customer was not found or could not be loaded.'));
  }, [customerId]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/admin/customers" className="text-xs text-gold-800 hover:underline">
          ← Customers
        </Link>
        <div className="rounded-xl bg-white p-8 text-sm border border-ivory-300 text-charcoal-700">
          {error}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-xl bg-white p-8 text-sm border border-ivory-300 text-charcoal-500 animate-pulse">
        Loading customer archive...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/customers"
        className="inline-flex items-center text-xs font-bold text-gold-800 hover:underline"
      >
        ← Back to Customers
      </Link>

      <div className="rounded-2xl border border-ivory-300 bg-white p-6 shadow-subtle">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold-800">Customer Profile</p>
        <h1 className="mt-1 font-serif text-3xl text-charcoal-900">
          {customer.firstName ?? ''} {customer.lastName ?? ''}
        </h1>
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3 pt-4 border-t border-ivory-200">
          <div>
            <span className="text-xs uppercase tracking-wider text-charcoal-400 font-medium">Email</span>
            <p className="font-medium text-charcoal-900 mt-0.5">{customer.email}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-charcoal-400 font-medium">Phone</span>
            <p className="font-medium text-charcoal-900 mt-0.5">{customer.phone ?? 'Not provided'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-charcoal-400 font-medium">Account Status</span>
            <p className="font-medium text-charcoal-900 mt-0.5">
              <span className="capitalize">{customer.status.toLowerCase()}</span> · {customer.emailVerifiedAt ? 'Verified' : 'Unverified'}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white shadow-subtle">
        <div className="border-b border-ivory-200 p-5">
          <h2 className="font-serif text-lg font-semibold text-charcoal-900">Order History</h2>
        </div>
        {customer.orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory-50 text-charcoal-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200">
                {customer.orders.map(order => (
                  <tr className="hover:bg-ivory-50/60 transition-colors" key={order.id}>
                    <td className="p-4 font-mono font-medium text-charcoal-900">{order.orderNumber}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ivory-100 text-charcoal-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4">{order.paymentStatus}</td>
                    <td className="p-4 font-semibold text-charcoal-900">
                      ₹{(order.totalPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-charcoal-500">
                      {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-charcoal-500">No orders have been placed by this customer.</p>
        )}
      </div>
    </div>
  );
}
