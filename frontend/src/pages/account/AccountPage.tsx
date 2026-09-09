import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Package,
  Heart,
  MapPin,
  LogOut,
  ChevronRight,
  Plus,
  Sparkles,
  Pencil,
  Check,
  X,
  ShieldCheck,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { useWishlistStore } from '../../store/wishlistStore.js';
import { addressService, type AddressInput } from '../../services/api/addressService.js';
import { Dialog } from '../../components/ui/Dialog.js';
import { useToast } from '../../app/providers.js';

export function AccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout, updateProfile, isLoading: profileSaving } = useAuthStore();
  const wishlistCount = useWishlistStore(s => s.getItemCount());

  const initialTab = (searchParams.get('tab') as 'profile' | 'addresses') || 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>(initialTab);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [preferredFit, setPreferredFit] = useState<NonNullable<typeof user>['preferredFit']>(user?.preferredFit ?? null);
  const [preferredCollar, setPreferredCollar] = useState<NonNullable<typeof user>['preferredCollar']>(user?.preferredCollar ?? null);

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [modalRecipient, setModalRecipient] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalLine1, setModalLine1] = useState('');
  const [modalLine2, setModalLine2] = useState('');
  const [modalCity, setModalCity] = useState('');
  const [modalState, setModalState] = useState('');
  const [modalPostalCode, setModalPostalCode] = useState('');
  const [modalIsDefault, setModalIsDefault] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setPhone(user.phone ?? '');
      setPreferredFit(user.preferredFit);
      setPreferredCollar(user.preferredCollar);
    }
  }, [user]);

  const isAdmin = user?.role === 'admin';

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.list(),
  });

  const createAddressMutation = useMutation({
    mutationFn: (input: AddressInput) => addressService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddressModalOpen(false);
      setModalRecipient('');
      setModalPhone('');
      setModalLine1('');
      setModalLine2('');
      setModalCity('');
      setModalState('');
      setModalPostalCode('');
      setModalIsDefault(false);
      addToast('Delivery destination added successfully.', 'success');
    },
    onError: () => addToast('Failed to add address.', 'error'),
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => addressService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      addToast('Address deleted successfully.', 'success');
    },
    onError: () => addToast('Failed to delete address.', 'error'),
  });

  const handleLogout = async () => {
    if (!await logout()) {
      addToast('Sign out could not be confirmed. Please try again.', 'error');
      return;
    }
    addToast('Signed out of Purvaja Fashion.', 'info');
    navigate('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestedEmailChange = Boolean(user && email.trim().toLowerCase() !== user.email.toLowerCase());
    const saved = await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      preferredFit,
      preferredCollar,
    });
    if (!saved) {
      addToast('Unable to update profile. Please try again.', 'error');
      return;
    }
    setIsEditing(false);
    addToast(requestedEmailChange
      ? 'Profile saved. The new email will apply after verification.'
      : 'Profile details updated successfully.', 'success');
  };

  const handleCancelEdit = () => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setPhone(user.phone ?? '');
      setPreferredFit(user.preferredFit);
      setPreferredCollar(user.preferredCollar);
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-ivory-100 py-8 lg:py-14 text-charcoal-900">
      <div className="mx-auto max-w-[1720px] px-4 sm:px-6 lg:px-10 xl:px-12">
        {/* Header */}
        <div className="mb-8 border-b border-ivory-300 pb-6 lg:mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-50 px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-gold-800">
              <Sparkles className="h-3 w-3 text-gold-600" />
              Private Client Sanctuary
            </span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-950 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300 border border-gold-500/40">
                <ShieldCheck className="h-3 w-3 text-gold-400" />
                Atelier Master Admin
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-charcoal-950 sm:text-4xl lg:text-5xl">
                Welcome, {firstName}
              </h1>
              <p className="mt-1.5 text-xs text-charcoal-500 sm:text-sm">
                {email} · Status:{' '}
                <span className="font-semibold text-gold-700">
                  {isAdmin ? 'System Administrator' : 'Atelier Private Member'}
                </span>
              </p>
            </div>

            {/* Top Header Actions */}
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full bg-charcoal-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-gold-300 border border-gold-500/40 hover:bg-gold-500 hover:text-charcoal-950 transition-all shadow-sm group"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-gold-400 group-hover:text-charcoal-950" />
                  <span>Admin Panel</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-ivory-300 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-charcoal-800 shadow-2xs transition-all hover:border-charcoal-950 hover:bg-charcoal-950 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Sanctuary Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
          {/* Left: Navigation Sidebar (4 cols) */}
          {/* Left: Navigation Sidebar (4 cols) */}
          <aside className="lg:col-span-4">
            <div className="rounded-[24px] sm:rounded-[26px] border border-ivory-300 bg-white p-3 sm:p-5 shadow-[0_12px_32px_rgba(26,26,26,0.03)] flex flex-row lg:flex-col overflow-x-auto gap-2 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-shrink-0 lg:w-full flex items-center justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] transition-all text-left ${
                  activeTab === 'profile'
                    ? 'bg-charcoal-950 text-white shadow-sm'
                    : 'text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950'
                }`}
              >
                <span className="flex items-center gap-2 sm:gap-3">
                  <User className="h-4 w-4 text-gold-400 shrink-0" /> Personal Info
                </span>
                <ChevronRight className="h-4 w-4 opacity-60 hidden lg:block" />
              </button>

              <Link
                to="/account/orders"
                className="flex-shrink-0 lg:w-full flex items-center justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950 transition-all"
              >
                <span className="flex items-center gap-2 sm:gap-3">
                  <Package className="h-4 w-4 text-gold-600 shrink-0" /> Orders & Invoices
                </span>
                <ChevronRight className="h-4 w-4 opacity-60 hidden lg:block" />
              </Link>

              <Link
                to="/wishlist"
                className="flex-shrink-0 lg:w-full flex items-center justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950 transition-all"
              >
                <span className="flex items-center gap-2 sm:gap-3">
                  <Heart className="h-4 w-4 text-gold-600 shrink-0" /> Wishlist ({wishlistCount})
                </span>
                <ChevronRight className="h-4 w-4 opacity-60 hidden lg:block" />
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`flex-shrink-0 lg:w-full flex items-center justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] transition-all text-left ${
                  activeTab === 'addresses'
                    ? 'bg-charcoal-950 text-white shadow-sm'
                    : 'text-charcoal-700 hover:bg-ivory-100 hover:text-charcoal-950'
                }`}
              >
                <span className="flex items-center gap-2 sm:gap-3">
                  <MapPin className="h-4 w-4 text-gold-400 shrink-0" /> Addresses ({addresses.length})
                </span>
                <ChevronRight className="h-4 w-4 opacity-60 hidden lg:block" />
              </button>

              {isAdmin && (
                <div className="flex-shrink-0 lg:w-full lg:pt-2">
                  <Link
                    to="/admin"
                    className="flex-shrink-0 lg:w-full flex items-center justify-between rounded-xl sm:rounded-2xl p-3 sm:p-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] transition-all text-left bg-charcoal-950 text-gold-300 border border-gold-500/40 hover:bg-gold-500 hover:text-charcoal-950 shadow-sm group"
                  >
                    <span className="flex items-center gap-2 sm:gap-3">
                      <ShieldCheck className="h-4 w-4 text-gold-400 group-hover:text-charcoal-950 shrink-0" />
                      Admin Control
                    </span>
                    <ArrowUpRight className="h-4 w-4 opacity-70 group-hover:opacity-100 hidden lg:block" />
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* Right: Tab Content (8 cols) */}
          <main className="lg:col-span-8">
            <div className="rounded-[26px] border border-ivory-300 bg-white p-6 sm:p-10 shadow-[0_12px_32px_rgba(26,26,26,0.03)]">
              {/* Profile Details Tab */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ivory-200 pb-5">
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-charcoal-950">Personal Details</h3>
                      <p className="text-xs text-charcoal-500 mt-1">
                        Manage your contact details, bespoke shirting profile, and sartorial preferences.
                      </p>
                    </div>

                    {/* Interactive Edit / Save Changes Action */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-950 bg-charcoal-950 px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-2xs hover:bg-gold-500 hover:text-charcoal-950 hover:border-gold-500 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit Profile</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="inline-flex items-center gap-1.5 rounded-full border border-ivory-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-charcoal-600 hover:bg-ivory-100 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-2xs hover:bg-emerald-800 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{profileSaving ? 'Saving…' : 'Save Changes'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label htmlFor="account-first-name" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-500 mb-2">
                        First Name
                      </label>
                      <input
                        id="account-first-name"
                        type="text"
                        disabled={!isEditing}
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors outline-none ${
                          isEditing
                            ? 'border-2 border-charcoal-950 bg-white text-charcoal-950 shadow-2xs'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-800 cursor-not-allowed opacity-90'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="account-last-name" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-500 mb-2">
                        Last Name
                      </label>
                      <input
                        id="account-last-name"
                        type="text"
                        disabled={!isEditing}
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors outline-none ${
                          isEditing
                            ? 'border-2 border-charcoal-950 bg-white text-charcoal-950 shadow-2xs'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-800 cursor-not-allowed opacity-90'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="account-email" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-500 mb-2">
                        Email Address
                      </label>
                      <input
                        id="account-email"
                        type="email"
                        disabled={!isEditing}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors outline-none ${
                          isEditing
                            ? 'border-2 border-charcoal-950 bg-white text-charcoal-950 shadow-2xs'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-800 cursor-not-allowed opacity-90'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="account-phone" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-500 mb-2">
                        Phone Number
                      </label>
                      <input
                        id="account-phone"
                        type="tel"
                        disabled={!isEditing}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors outline-none ${
                          isEditing
                            ? 'border-2 border-charcoal-950 bg-white text-charcoal-950 shadow-2xs'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-800 cursor-not-allowed opacity-90'
                        }`}
                      />
                    </div>

                    <div>
                      <label htmlFor="account-fit" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-500 mb-2">
                        Preferred Fit Profile
                      </label>
                      <select
                        id="account-fit"
                        disabled={!isEditing}
                        value={preferredFit ?? ''}
                        onChange={e => setPreferredFit((e.target.value || null) as typeof preferredFit)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors outline-none ${
                          isEditing
                            ? 'border-2 border-charcoal-950 bg-white text-charcoal-950 cursor-pointer shadow-2xs'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-800 cursor-not-allowed opacity-90'
                        }`}
                      >
                        <option value="">No preference</option>
                        <option value="Slim">Slim Fit (Tapered Chest & Waist)</option>
                        <option value="Regular">Regular Fit (Classic Atelier Drape)</option>
                        <option value="Relaxed">Relaxed Fit (Contemporary Silhouette)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="account-collar" className="block text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-500 mb-2">
                        Preferred Collar Style
                      </label>
                      <select
                        id="account-collar"
                        disabled={!isEditing}
                        value={preferredCollar ?? ''}
                        onChange={e => setPreferredCollar((e.target.value || null) as typeof preferredCollar)}
                        className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors outline-none ${
                          isEditing
                            ? 'border-2 border-charcoal-950 bg-white text-charcoal-950 cursor-pointer shadow-2xs'
                            : 'border border-ivory-300 bg-ivory-50 text-charcoal-800 cursor-not-allowed opacity-90'
                        }`}
                      >
                        <option value="">No preference</option>
                        <option value="Spread Collar">Spread Collar</option>
                        <option value="Button-Down Collar">Button-Down Collar</option>
                        <option value="Mandarin Collar">Mandarin Collar</option>
                        <option value="Cuban Collar">Cuban Collar</option>
                        <option value="Cutaway Collar">Cutaway Collar</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}

              {/* Saved Addresses Tab */}
              {activeTab === 'addresses' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-2xl font-bold text-charcoal-950">Saved Addresses</h3>
                      <p className="text-xs text-charcoal-500 mt-1">
                        Manage your residential and business delivery destinations.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddressModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-charcoal-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm hover:bg-gold-500 hover:text-charcoal-950 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Address
                    </button>
                  </div>

                  {addressesLoading ? (
                    <div className="p-8 text-center text-xs text-charcoal-500">Loading delivery addresses…</div>
                  ) : addresses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-ivory-300 p-8 text-center space-y-3">
                      <MapPin className="h-8 w-8 text-charcoal-400 mx-auto" />
                      <p className="text-sm font-medium text-charcoal-800">No saved addresses yet</p>
                      <p className="text-xs text-charcoal-500">Add a delivery destination for a seamless, expedited checkout.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.map(addr => (
                        <div
                          key={addr.id}
                          className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif text-lg font-bold text-charcoal-950">{addr.recipientName}</span>
                            <div className="flex items-center gap-3">
                              {addr.isDefault && (
                                <span className="rounded-full bg-gold-100 border border-gold-400/50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-800">
                                  Default
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteAddressMutation.mutate(addr.id)}
                                disabled={deleteAddressMutation.isPending}
                                className="p-1.5 text-charcoal-400 hover:text-error transition-colors"
                                title="Delete address"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-charcoal-600">
                            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                          </p>
                          <p className="text-xs text-charcoal-600">
                            {addr.city}, {addr.state} — {addr.postalCode}
                          </p>
                          <p className="text-xs font-medium text-charcoal-500 pt-1">Contact: {addr.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Address Modal */}
                  <Dialog open={addressModalOpen} onClose={() => setAddressModalOpen(false)} labelledBy="add-address-modal-title"
                    overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/50 p-4 backdrop-blur-xs overflow-y-auto"
                    panelClassName="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-5 animate-fade-in border border-ivory-300 my-auto">
                        <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
                          <h4 id="add-address-modal-title" className="font-serif text-xl font-bold text-charcoal-950">Add Delivery Destination</h4>
                          <button
                            type="button"
                            onClick={() => setAddressModalOpen(false)}
                            aria-label="Close address modal"
                            className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal-400 hover:text-charcoal-800 transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!modalRecipient || !modalPhone || !modalLine1 || !modalCity || !modalState || !modalPostalCode) {
                              addToast('Please complete all required fields.', 'error');
                              return;
                            }
                            createAddressMutation.mutate({
                              recipientName: modalRecipient.trim(),
                              phone: modalPhone.trim(),
                              line1: modalLine1.trim(),
                              line2: modalLine2.trim() || undefined,
                              city: modalCity.trim(),
                              state: modalState.trim(),
                              postalCode: modalPostalCode.trim(),
                              country: 'IN',
                              isDefault: modalIsDefault,
                            });
                          }}
                          className="space-y-4 text-xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="modal-recipient" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">Recipient Name *</label>
                              <input
                                id="modal-recipient"
                                required
                                value={modalRecipient}
                                onChange={e => setModalRecipient(e.target.value)}
                                placeholder="Full Name"
                                className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                              />
                            </div>
                            <div>
                              <label htmlFor="modal-phone" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">Phone *</label>
                              <input
                                id="modal-phone"
                                required
                                value={modalPhone}
                                onChange={e => setModalPhone(e.target.value)}
                                placeholder="10-digit number"
                                className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="modal-line1" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">Address Line 1 *</label>
                            <input
                              id="modal-line1"
                              required
                              value={modalLine1}
                              onChange={e => setModalLine1(e.target.value)}
                              placeholder="Flat/House No., Building, Street"
                              className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                            />
                          </div>
                          <div>
                            <label htmlFor="modal-line2" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">Address Line 2</label>
                            <input
                              id="modal-line2"
                              value={modalLine2}
                              onChange={e => setModalLine2(e.target.value)}
                              placeholder="Apartment, suite, landmark (optional)"
                              className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label htmlFor="modal-city" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">City *</label>
                              <input
                                id="modal-city"
                                required
                                value={modalCity}
                                onChange={e => setModalCity(e.target.value)}
                                placeholder="City"
                                className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                              />
                            </div>
                            <div>
                              <label htmlFor="modal-state" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">State *</label>
                              <input
                                id="modal-state"
                                required
                                value={modalState}
                                onChange={e => setModalState(e.target.value)}
                                placeholder="State"
                                className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                              />
                            </div>
                            <div>
                              <label htmlFor="modal-postal-code" className="block font-bold uppercase tracking-wider text-charcoal-600 mb-1">Postal Code *</label>
                              <input
                                id="modal-postal-code"
                                required
                                value={modalPostalCode}
                                onChange={e => setModalPostalCode(e.target.value)}
                                placeholder="PIN Code"
                                className="w-full rounded-lg border border-ivory-300 p-2.5 outline-none focus:border-charcoal-900"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 pt-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={modalIsDefault}
                              onChange={e => setModalIsDefault(e.target.checked)}
                              className="rounded border-ivory-300 text-charcoal-950"
                            />
                            <span className="text-charcoal-700">Set as primary delivery address</span>
                          </label>
                          <div className="flex justify-end gap-3 pt-3 border-t border-ivory-200">
                            <button
                              type="button"
                              onClick={() => setAddressModalOpen(false)}
                              className="px-4 py-2.5 min-h-[44px] text-charcoal-600 hover:text-charcoal-950"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={createAddressMutation.isPending}
                              className="rounded-full bg-charcoal-950 px-6 py-2.5 min-h-[44px] font-bold uppercase tracking-wider text-white hover:bg-gold-500 hover:text-charcoal-950 disabled:opacity-50 transition-colors"
                            >
                              {createAddressMutation.isPending ? 'Saving…' : 'Save Address'}
                            </button>
                          </div>
                        </form>
                  </Dialog>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
