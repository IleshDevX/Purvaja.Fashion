import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService.js';
import { AdminStoreSettings } from '../../features/admin/types/admin.js';
import { useToast } from '../../app/providers.js';

export function AdminSettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AdminStoreSettings | null>(null);

  useEffect(() => {
    void adminService.getSettings().then(setSettings);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const saved = await adminService.updateSettings(settings);
      setSettings(saved);
      addToast('Atelier operational preferences updated.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to save preferences.', 'error');
    }
  };

  if (!settings) return null;

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12 text-charcoal-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-300 pb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
            System Preferences
          </span>
          <h1 className="font-serif text-3xl font-light text-charcoal-950 sm:text-4xl mt-0.5">
            Atelier Store Settings
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Configure luxury store metadata, threshold alerts, and shirting catalog preferences.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors self-start sm:self-auto"
        >
          <Save className="h-4 w-4" />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* 1. Store Identity */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <h3 className="font-serif text-lg font-bold text-charcoal-950">
          Store Identity & Concierge
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Atelier Store Name
            </label>
            <input
              type="text"
              value={settings.storeName}
              onChange={e => setSettings({ ...settings, storeName: e.target.value })}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Concierge Support Email
            </label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Base Operating Currency
            </label>
            <input
              type="text"
              disabled
              value={settings.currency}
              className="w-full rounded-xl bg-ivory-100 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Dispatch Turnaround Window (Hours)
            </label>
            <input
              type="number"
              value={settings.orderDispatchWindowHours}
              onChange={e => setSettings({ ...settings, orderDispatchWindowHours: Number(e.target.value) })}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 2. Inventory & Stock Alerts */}
      <div className="rounded-2xl border border-ivory-300 bg-white p-6 space-y-5 shadow-[0_4px_20px_rgba(26,26,26,0.02)]">
        <h3 className="font-serif text-lg font-bold text-charcoal-950">Stock Alert Parameters</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Low Stock Alert Threshold (Units)
            </label>
            <input
              type="number"
              value={settings.lowStockThreshold}
              onChange={e => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
              min={1}
              max={50}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-4 py-2.5 text-xs text-charcoal-950 outline-none focus:border-charcoal-950 focus:bg-white"
            />
            <p className="text-[10px] text-charcoal-500 mt-1.5">
              SKUs with stock count equal to or below this number trigger visual alerts in Dashboard and Matrix.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal-600 mb-2">
              Default Customer Fit
            </label>
            <select
              value={settings.defaultFit}
              onChange={e => setSettings({ ...settings, defaultFit: e.target.value })}
              className="w-full rounded-xl bg-ivory-50 border border-ivory-300 px-3 py-2.5 text-xs font-semibold text-charcoal-950 outline-none"
            >
              <option value="Slim">Slim Fit</option>
              <option value="Regular">Regular Fit</option>
              <option value="Relaxed">Relaxed Fit</option>
            </select>
          </div>
        </div>
      </div>

    </form>
  );
}
