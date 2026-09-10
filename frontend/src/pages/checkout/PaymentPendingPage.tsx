import { useCallback, useEffect, useRef, useState } from 'react';
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
  const checkingRef = useRef(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!paymentId || checkingRef.current) return false;
    checkingRef.current = true;
    setChecking(true);
    try {
      const response = await apiClient.get(`/payments/${encodeURIComponent(paymentId)}/status`);
      if (!response?.data) return false;
      const data = unwrapApiData<PaymentStatusResponse>(response.data);
      setError(null);
      setIsRateLimited(false);
      if (data.paymentStatus === 'SUCCESS' || data.paymentStatus === 'PAID') {
        navigate(`/checkout/success?orderId=${encodeURIComponent(data.orderId)}`, { replace: true });
        return true;
      } else if (['FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'].includes(data.paymentStatus)) {
        navigate(`/checkout/failure?orderId=${encodeURIComponent(data.orderId)}`, { replace: true });
        return true;
      }
      return false;
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes('429')) {
        setIsRateLimited(true);
        setError('Rate limit reached. Please wait before refreshing.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Payment status could not be checked.');
      }
      return false;
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [navigate, paymentId]);


  useEffect(() => {
    if (!paymentId) return;

    let isMounted = true;
    let timeoutId: number | undefined;
    let delay = 2500;
    const startTime = Date.now();
    const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes max

    const poll = async () => {
      if (!isMounted) return;
      if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
        setError('Payment verification is taking longer than expected. You can check manually or view your order history.');
        return;
      }

      const isTerminal = await checkStatus();
      if (!isMounted || isTerminal || isRateLimited) return;

      // Exponential backoff: 2.5s -> 5s -> 10s -> max 15s
      delay = Math.min(delay * 1.5, 15000);
      timeoutId = window.setTimeout(() => void poll(), delay);
    };

    void poll();

    return () => {
      isMounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [paymentId, checkStatus, isRateLimited]);


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
