import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { sanitizeInternalRedirect } from '../../features/auth/utils/redirect.js';
import { useToast } from '../../app/providers.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const redirectTarget = sanitizeInternalRedirect(searchParams.get('redirect'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

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
      navigate(redirectTarget);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-overline text-gold-600 mb-1">New Membership</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Create an Account</h2>
        <p className="text-body-sm text-charcoal-500 mt-1">
          Enjoy complimentary sizing replacements, early collection access, and private styling.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/30 text-caption text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-caption text-charcoal-700 font-medium mb-1">First Name</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Alexander"
              className="w-full px-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
          </div>
          <div>
            <label className="block text-caption text-charcoal-700 font-medium mb-1">Last Name</label>
            <input
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
          <label className="block text-caption text-charcoal-700 font-medium mb-1">Email Address</label>
          <div className="relative">
            <input
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
          <label className="block text-caption text-charcoal-700 font-medium mb-1">Phone Number (Optional)</label>
          <div className="relative">
            <input
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
            <label className="block text-caption text-charcoal-700 font-medium mb-1">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
          </div>
          <div>
            <label className="block text-caption text-charcoal-700 font-medium mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
            />
          </div>
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
