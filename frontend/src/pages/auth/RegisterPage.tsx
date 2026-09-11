import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Phone, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { useToast } from '../../app/providers.js';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { register, isLoading, error, fieldErrors, clearError } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!isPasswordValid) {
      addToast('Password must be at least 12 characters and include uppercase, lowercase, and a number.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    const success = await register({
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
    });

    if (success) {
      addToast(`Welcome to Purvaja Fashion, ${firstName}!`, 'success');
      // GuestRoute owns navigation when the authenticated state is committed.
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-overline text-gold-600 mb-1">New Membership</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Create an Account</h2>
        <p className="text-body-sm text-charcoal-500 mt-1">
          Create an account to manage orders, addresses, your cart, and wishlist.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-error/10 border border-error/30 text-caption text-error space-y-1">
          <p className="font-medium">{error}</p>
          {fieldErrors && Object.entries(fieldErrors).length > 0 && (
            <ul className="list-disc list-inside text-xs opacity-90 pl-1">
              {Object.entries(fieldErrors).flatMap(([field, msgs]) =>
                msgs.map((msg, i) => (
                  <li key={`${field}-${i}`}>
                    <span className="capitalize">{field}</span>: {msg}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="register-first-name" className="block text-caption text-charcoal-700 font-medium mb-1">First Name</label>
            <input
              id="register-first-name"
              type="text"
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Alexander"
              className="w-full px-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
          </div>
          <div>
            <label htmlFor="register-last-name" className="block text-caption text-charcoal-700 font-medium mb-1">Last Name</label>
            <input
              id="register-last-name"
              type="text"
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Wright"
              className="w-full px-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="block text-caption text-charcoal-700 font-medium mb-1">Email Address</label>
          <div className="relative">
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alexander@example.com"
              className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
            <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label htmlFor="register-phone" className="block text-caption text-charcoal-700 font-medium mb-1">Phone Number (Optional)</label>
          <div className="relative">
            <input
              id="register-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
            <Phone className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="register-password" className="block text-caption text-charcoal-700 font-medium mb-1">Password</label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-3 pr-10 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="register-confirm-password" className="block text-caption text-charcoal-700 font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <input
                id="register-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-3 pr-10 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Password Requirements Checklist */}
        <div className="p-3 bg-ivory-100 border border-ivory-200 text-caption rounded-sm space-y-2">
          <p className="font-medium text-charcoal-700 text-xs">Security Standards:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <span className={`inline-flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-charcoal-400'}`}>
              {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-charcoal-300" />}
              12+ Chars
            </span>
            <span className={`inline-flex items-center gap-1.5 transition-colors ${hasUpper ? 'text-emerald-700 font-medium' : 'text-charcoal-400'}`}>
              {hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-charcoal-300" />}
              Uppercase
            </span>
            <span className={`inline-flex items-center gap-1.5 transition-colors ${hasLower ? 'text-emerald-700 font-medium' : 'text-charcoal-400'}`}>
              {hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-charcoal-300" />}
              Lowercase
            </span>
            <span className={`inline-flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-700 font-medium' : 'text-charcoal-400'}`}>
              {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-charcoal-300" />}
              Number (0-9)
            </span>
          </div>
          {confirmPassword.length > 0 && (
            <div className={`text-xs inline-flex items-center gap-1.5 pt-1 border-t border-ivory-200 w-full ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-error'}`}>
              {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-error" />}
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-60"
        >
          {isLoading ? 'CREATING ACCOUNT...' : 'REGISTER ACCOUNT'}
        </button>
      </form>

      <div className="text-center pt-2 text-body-sm text-charcoal-500">
        Already registered?{' '}
        <Link
          to={`/auth/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
          className="font-semibold text-charcoal-900 underline underline-offset-4 hover:text-gold-600 transition-colors"
        >
          Sign In Here
        </Link>
      </div>
    </div>
  );
}
