import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { apiClient, unwrapApiData } from '../../services/api/client.js';
import { useCartStore } from '../../store/cartStore.js';
import { useCheckoutStore } from '../../features/checkout/store/checkoutStore.js';

type Outcome = 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export function DemoPaymentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const syncCart = useCartStore(s => s.syncWithServer);
  const resetCheckout = useCheckoutStore(s => s.resetCheckout);
  const paymentId = params.get('paymentId');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!paymentId) return <Navigate to="/cart" replace />;

  const submit = async (result: Outcome) => {
    setBusy(true);
    setError(null);
    try {
      const data = unwrapApiData<{ orderId: string; paymentStatus: string }>(
        (await apiClient.post(`/payments/${encodeURIComponent(paymentId)}/demo-result`, { result })).data,
      );
      resetCheckout();
      if (data.paymentStatus === 'SUCCESS') {
        await syncCart();
        navigate(`/checkout/success?orderId=${encodeURIComponent(data.orderId)}`);
      } else {
        navigate(`/checkout/failure?orderId=${encodeURIComponent(data.orderId)}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The simulated payment could not be completed. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-12 max-w-xl mx-auto px-4">
      <section className="bg-ivory-100 border border-ivory-300 p-8 text-center space-y-6 rounded-sm shadow-subtle">
        <ShieldCheck className="w-10 h-10 mx-auto text-gold-600" />
        <div>
          <p className="text-overline text-gold-700 tracking-wider">
            DEMO GATEWAY · NO REAL MONEY WILL BE CHARGED
          </p>
          <h1 className="font-serif text-display text-charcoal-900 mt-1">PhonePe Payment Simulation</h1>
        </div>
        <p className="text-body-sm text-charcoal-600 max-w-md mx-auto">
          Choose a simulated provider result. The backend validates transaction ownership and executes atomic state transitions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {error && <p role="alert" className="sm:col-span-2 text-error">{error}</p>}
          <button
            disabled={busy}
            onClick={() => submit('SUCCESS')}
            className="py-3 bg-charcoal-900 text-ivory-100 text-xs font-semibold tracking-wider hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
          >
            {busy ? 'PROCESSING...' : 'SIMULATE SUCCESS'}
          </button>
          <button
            disabled={busy}
            onClick={() => submit('FAILED')}
            className="py-3 border border-charcoal-700 bg-white text-charcoal-900 text-xs font-semibold tracking-wider hover:bg-ivory-50 disabled:opacity-50 transition-colors"
          >
            SIMULATE FAILURE
          </button>
          <button
            disabled={busy}
            onClick={() => submit('EXPIRED')}
            className="py-3 border border-charcoal-700 bg-white text-charcoal-900 text-xs font-semibold tracking-wider hover:bg-ivory-50 disabled:opacity-50 transition-colors"
          >
            SIMULATE EXPIRY
          </button>
          <button
            disabled={busy}
            onClick={() => submit('CANCELLED')}
            className="py-3 border border-charcoal-700 bg-white text-charcoal-900 text-xs font-semibold tracking-wider hover:bg-ivory-50 disabled:opacity-50 transition-colors"
          >
            CANCEL PAYMENT
          </button>
        </div>
      </section>
    </div>
  );
}
