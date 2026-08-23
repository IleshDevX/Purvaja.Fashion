import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Eye,
  X,
} from 'lucide-react';
import { adminDevelopmentService } from '../../features/admin/services/adminDevelopmentService.js';
import { SyntheticCustomer } from '../../features/admin/data/syntheticCustomers.js';

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<SyntheticCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<SyntheticCustomer | null>(null);

  useEffect(() => {
    adminDevelopmentService.getCustomers(searchQuery).then(setCustomers);
  }, [searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in text-charcoal-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
            Patronage Registry
          </span>
          <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl mt-0.5">
            Private Client Directory
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Review registered clientele, sartorial sizing profiles, and patronage loyalty tiers.
          </p>
        </div>

        <span className="text-xs font-semibold text-charcoal-700 bg-white px-4 py-2 rounded-xl border border-ivory-300 shadow-2xs self-start sm:self-auto">
          Total: <span className="font-bold text-charcoal-950">{customers.length}</span> Patrons
        </span>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-ivory-300 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by patron name, email, or city..."
            className="w-full rounded-xl bg-ivory-50 border border-ivory-300 pl-10 pr-4 py-2 text-xs text-charcoal-950 placeholder:text-charcoal-400 outline-none focus:border-charcoal-950 focus:bg-white"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-ivory-300 bg-white overflow-x-auto shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-ivory-200 bg-ivory-50/80 text-charcoal-500 uppercase tracking-widest text-[10px]">
            <tr>
              <th className="py-3.5 px-4 font-bold">Patron Name</th>
              <th className="py-3.5 px-4 font-bold">Contact Email</th>
              <th className="py-3.5 px-4 font-bold">City & Region</th>
              <th className="py-3.5 px-4 font-bold">Loyalty Tier</th>
              <th className="py-3.5 px-4 font-bold">Orders</th>
              <th className="py-3.5 px-4 font-bold">Lifetime Spend</th>
              <th className="py-3.5 px-4 font-bold">Preferred Fit</th>
              <th className="py-3.5 px-4 font-bold text-right">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ivory-200">
            {customers.map(client => (
              <tr key={client.id} className="hover:bg-ivory-50/60 transition-colors">
                {/* Name */}
                <td className="py-4 px-4 font-serif text-sm font-bold text-charcoal-950">
                  {client.firstName} {client.lastName}
                </td>

                {/* Email */}
                <td className="py-4 px-4 text-charcoal-700 font-mono text-[11px]">
                  {client.email}
                </td>

                {/* City */}
                <td className="py-4 px-4 text-charcoal-600">
                  {client.city}, {client.state}
                </td>

                {/* Tier */}
                <td className="py-4 px-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                      client.tier === 'VIP Connoisseur'
                        ? 'border-gold-500/50 text-gold-900 bg-gold-50 font-bold'
                        : 'border-ivory-300 text-charcoal-700 bg-ivory-50'
                    }`}
                  >
                    {client.tier}
                  </span>
                </td>

                {/* Orders */}
                <td className="py-4 px-4 font-bold text-charcoal-950">
                  {client.ordersCount}
                </td>

                {/* Spend */}
                <td className="py-4 px-4 font-sans font-bold tabular-nums text-gold-800">
                  ₹{client.totalSpend.toLocaleString('en-IN')}
                </td>

                {/* Preferred Fit */}
                <td className="py-4 px-4 text-charcoal-800 font-medium">
                  {client.preferredFit} Fit
                </td>

                {/* Action */}
                <td className="py-4 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(client)}
                    className="p-1.5 text-charcoal-400 hover:text-charcoal-950 hover:bg-ivory-100 rounded-lg transition-colors"
                    title="View Patron Dossier"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Patron Detail Dossier Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-charcoal-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-md w-full rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ivory-200 pb-4">
              <div className="flex items-center gap-2 text-gold-800">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-serif text-lg font-bold text-charcoal-950">Patron Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-charcoal-400 hover:text-charcoal-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
                <span className="text-charcoal-500">Full Name</span>
                <span className="font-serif font-bold text-charcoal-950 text-sm">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
                <span className="text-charcoal-500">Email Address</span>
                <span className="font-mono text-charcoal-900">{selectedCustomer.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
                <span className="text-charcoal-500">Phone Number</span>
                <span className="font-mono text-charcoal-900">{selectedCustomer.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
                <span className="text-charcoal-500">Residence</span>
                <span className="text-charcoal-900 font-medium">{selectedCustomer.city}, {selectedCustomer.state}</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
                <span className="text-charcoal-500">Sartorial Preference</span>
                <span className="text-gold-800 font-bold">{selectedCustomer.preferredFit} Fit</span>
              </div>
              <div className="p-3 rounded-xl bg-ivory-50 border border-ivory-200 flex items-center justify-between">
                <span className="text-charcoal-500">Gross Lifetime Spend</span>
                <span className="font-sans text-sm font-bold text-charcoal-950 tabular-nums">
                  ₹{selectedCustomer.totalSpend.toLocaleString('en-IN')} ({selectedCustomer.ordersCount} orders)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="w-full rounded-xl bg-charcoal-950 py-2.5 text-xs font-bold text-white hover:bg-gold-500 hover:text-charcoal-950 transition-colors uppercase tracking-wider"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
