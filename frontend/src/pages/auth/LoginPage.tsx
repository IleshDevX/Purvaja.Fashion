import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { sanitizeInternalRedirect } from '../../features/auth/utils/redirect.js';
import { useToast } from '../../app/providers.js';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const redirectTarget = sanitizeInternalRedirect(searchParams.get('redirect'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login({ email, password, rememberMe });
    if (success) {
      addToast('Welcome back to Purvaja Fashion.', 'success');
      navigate(redirectTarget);
    }
  };

  const handleQuickDemoCustomer = async () => {
    setEmail('customer@purvajafashion.com');
    setPassword('Customer@12345');
    const success = await login({
      email: 'customer@purvajafashion.com',
      password: 'Customer@12345',
      rememberMe: true,
    });
    if (success) {
      addToast('Logged in as Alexander Wright (Customer).', 'success');
      navigate(redirectTarget);
    }
  };

  const handleQuickDemoAdmin = async () => {
    setEmail('admin@purvajafashion.com');
    setPassword('Admin@12345');
    const success = await login({
      email: 'admin@purvajafashion.com',
      password: 'Admin@12345',
      rememberMe: true,
    });
    if (success) {
      addToast('Logged in as Purvaja Admin.', 'success');
      navigate(redirectTarget);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-overline text-gold-600 mb-1">Client Sanctuary</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Sign In to Your Account</h2>
        <p className="text-body-sm text-charcoal-500 mt-1">
          Access your orders, saved measurements, and bespoke wishlist.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/30 text-caption text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-caption text-charcoal-700 font-medium mb-1">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
            <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-caption text-charcoal-700 font-medium">Password</label>
            <Link
              to="/auth/forgot-password"
              className="text-caption text-charcoal-500 hover:text-charcoal-900 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
            <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="rounded-xs border-ivory-400 accent-charcoal-900"
          />
          <label htmlFor="remember" className="text-caption text-charcoal-600 cursor-pointer">
            Remember me on this browser
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-60"
        >
          {isLoading ? 'AUTHENTICATING...' : 'SIGN IN'}
        </button>
      </form>

      {/* Quick Demo Logins for Vercel & Client Testing */}
      <div className="p-4 bg-ivory-200 border border-ivory-300 rounded-xl space-y-3">
        <div>
          <span className="text-overline text-gold-700 block font-bold">Instant Vercel Access Credentials</span>
          <p className="text-[11px] text-charcoal-600 mt-0.5">
            Click below or type credentials to test Customer or Admin features (Add products, Inventory, Orders):
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleQuickDemoCustomer}
            type="button"
            className="px-3 py-2 bg-ivory-50 border border-ivory-300 rounded-lg text-caption font-medium text-charcoal-800 hover:border-charcoal-900 hover:bg-white transition-colors text-left flex flex-col gap-0.5"
          >
            <span className="font-bold flex items-center gap-1">👤 Demo Customer</span>
            <span className="text-[10px] text-charcoal-500 font-mono">customer@purvajafashion.com</span>
          </button>

          <button
            onClick={handleQuickDemoAdmin}
            type="button"
            className="px-3 py-2 bg-charcoal-950 text-white rounded-lg text-caption font-medium hover:bg-gold-600 hover:text-charcoal-950 transition-colors text-left flex flex-col gap-0.5"
          >
            <span className="font-bold flex items-center gap-1 text-gold-300 hover:text-charcoal-950">🛡️ Demo Admin</span>
            <span className="text-[10px] opacity-80 font-mono">admin@purvajafashion.com</span>
          </button>
        </div>

        <div className="text-[10px] text-charcoal-500 pt-1 border-t border-ivory-300/60">
          💡 <span className="font-semibold text-charcoal-700">Admin Tip:</span> Logging in with any email containing <code className="bg-ivory-100 px-1 py-0.5 rounded text-charcoal-900 font-mono">admin</code> grants access to <span className="font-bold text-charcoal-900">/admin</span> (Product Management, Adding Products, Orders).
        </div>
      </div>

      <div className="text-center pt-2 text-body-sm text-charcoal-500">
        New to Purvaja Fashion?{' '}
        <Link
          to={`/auth/register${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
          className="font-semibold text-charcoal-900 underline underline-offset-4 hover:text-gold-600 transition-colors"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}
