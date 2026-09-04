import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { apiClient, unwrapApiData } from '../../services/api/client.js';
import { useCartStore } from '../../store/cartStore.js';

type Outcome = 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export function DemoPaymentPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const clearCart = useCartStore(s => s.clearCart);
  const paymentId = params.get('paymentId'); const [busy, setBusy] = useState(false);
  if (!paymentId) return <Navigate to="/cart" replace />;
  const submit = async (result: Outcome) => { setBusy(true); try { const data = unwrapApiData<{ orderId: string; paymentStatus: string }>((await apiClient.post(`/payments/${encodeURIComponent(paymentId)}/demo-result`, { result })).data); if (data.paymentStatus === 'SUCCESS') { clearCart(); navigate(`/checkout/success?orderId=${encodeURIComponent(data.orderId)}`); } else navigate(`/checkout/failure?orderId=${encodeURIComponent(data.orderId)}`); } finally { setBusy(false); } };
  return <div className="py-12 max-w-xl mx-auto"><section className="bg-ivory-100 border border-ivory-300 p-8 text-center space-y-6"><ShieldCheck className="w-10 h-10 mx-auto text-gold-600" /><p className="text-overline text-gold-700">DEMO PAYMENT - NO REAL MONEY WILL BE CHARGED</p><h1 className="font-serif text-display text-charcoal-900">PhonePe UPI Payment</h1><p className="text-body-sm text-charcoal-600">Choose a simulated provider result. The backend validates ownership and performs the payment transition.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><button disabled={busy} onClick={() => submit('SUCCESS')} className="py-3 bg-charcoal-900 text-ivory-100">SIMULATE SUCCESS</button><button disabled={busy} onClick={() => submit('FAILED')} className="py-3 border border-charcoal-700">SIMULATE FAILURE</button><button disabled={busy} onClick={() => submit('EXPIRED')} className="py-3 border border-charcoal-700">SIMULATE EXPIRY</button><button disabled={busy} onClick={() => submit('CANCELLED')} className="py-3 border border-charcoal-700">CANCEL PAYMENT</button></div></section></div>;
}
