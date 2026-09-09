import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient, unwrapApiData } from '../../services/api/client.js';

interface PaymentStatusResponse {
  orderId: string;
  paymentStatus: string;
}

export function PaymentPendingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = params.get('paymentId');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!paymentId) return;
    setChecking(true);
    try {
      const data = unwrapApiData<PaymentStatusResponse>(
        (await apiClient.get(`/payments/${encodeURIComponent(paymentId)}/status`)).data,
      );
      setError(null);
      if (data.paymentStatus === 'SUCCESS' || data.paymentStatus === 'PAID') {
        navigate(`/checkout/success?orderId=${encodeURIComponent(data.orderId)}`, { replace: true });
      } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(data.paymentStatus)) {
        navigate(`/checkout/failure?orderId=${encodeURIComponent(data.orderId)}`, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment status could not be checked.');
    } finally {
      setChecking(false);
    }
  }, [navigate, paymentId]);

  useEffect(() => {
    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 2500);
    return () => window.clearInterval(timer);
  }, [checkStatus]);

  if (!paymentId) return <Navigate to="/cart" replace />;

  return (
    <div className="py-12 max-w-xl mx-auto px-4">
      <section className="bg-ivory-100 border border-ivory-300 p-8 text-center space-y-6 rounded-sm shadow-subtle">
        <div className="relative w-12 h-12 mx-auto">
          <ShieldCheck className="w-12 h-12 text-gold-600" />
          <Loader2 className="absolute -right-2 -bottom-2 w-5 h-5 animate-spin text-charcoal-700" />
        </div>
        <div>
          <p className="text-overline text-gold-700 tracking-wider">PAYMENT STATUS</p>
          <h1 className="font-serif text-display text-charcoal-900 mt-1">Confirming your payment session</h1>
        </div>
        <p className="text-body-sm text-charcoal-600">
          The payment request may still be processing. This page checks the server record safely without creating another provider request.
        </p>
        {error && <p role="alert" className="text-error text-body-sm">{error}</p>}
        <button
          type="button"
          disabled={checking}
          onClick={() => void checkStatus()}
          className="w-full py-3 bg-charcoal-900 text-ivory-100 text-xs font-semibold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'CHECKING...' : 'CHECK STATUS'}
        </button>
      </section>
    </div>
  );
}
