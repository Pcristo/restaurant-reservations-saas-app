import React, { useState, useEffect } from 'react';
import { 
  listAllRestaurants, 
  createRestaurant, 
  updateRestaurant, 
  updateRestaurantStatus, 
  archiveRestaurant,
  deleteRestaurant,
  generateSlug,
  updateRestaurantAdminCredentials
} from '../../services/tenantService';
import { Restaurant, RestaurantStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Store, 
  Search, 
  Plus, 
  MoreVertical, 
  ShieldAlert, 
  ExternalLink, 
  Edit, 
  Power, 
  Trash2, 
  Globe, 
  Calendar, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  Copy,
  Mail,
  Lock,
  User as UserIcon,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Building,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DEFAULT_PLANS } from '../../data/plans';
import { listAllPlans } from '../../services/planService';
import { Plan } from '../../types';
import { ImageUploadField } from '../../components/admin/ImageUploadField';
import { RestaurantGalleryManager } from '../../components/admin/RestaurantGalleryManager';

export const SuperAdminRestaurants: React.FC = () => {
  const { user } = useAuth();
  const { impersonateRestaurant } = useTenant();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(searchParams.get('action') === 'create');
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editTab, setEditTab] = useState<'general' | 'contact' | 'location' | 'plan' | 'admin' | 'media'>('general');
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);
  
  // Admin Credentials Modal state
  const [adminCredsRest, setAdminCredsRest] = useState<Restaurant | null>(null);
  const [adminCredsName, setAdminCredsName] = useState('');
  const [adminCredsEmail, setAdminCredsEmail] = useState('');
  const [adminCredsPassword, setAdminCredsPassword] = useState('');
  const [adminCredsConfirmPassword, setAdminCredsConfirmPassword] = useState('');
  const [showAdminCredsPassword, setShowAdminCredsPassword] = useState(false);
  const [showAdminCredsConfirmPassword, setShowAdminCredsConfirmPassword] = useState(false);
  const [isSavingAdminCreds, setIsSavingAdminCreds] = useState(false);

  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Form state for creation
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formCountry, setFormCountry] = useState('ireland');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formTimezone, setFormTimezone] = useState('Europe/Dublin');
  const [formLanguage, setFormLanguage] = useState<'en' | 'pt'>('en');
  const [formPlan, setFormPlan] = useState('professional');
  const [formStatus, setFormStatus] = useState<RestaurantStatus>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRestaurants();
  }, []);

  async function loadRestaurants() {
    setLoading(true);
    try {
      const [list, plans] = await Promise.all([
        listAllRestaurants(),
        listAllPlans(),
      ]);
      setRestaurants(list);
      if (plans && plans.length > 0) {
        setAvailablePlans(plans);
      }
      
      // Auto-open modals if requested via URL query params
      const editId = searchParams.get('edit');
      if (editId) {
        const target = list.find(r => r.id === editId || r.slug === editId);
        if (target) {
          setEditingRestaurant(target);
          setEditTab('general');
        }
      }
      const credsId = searchParams.get('credentials');
      if (credsId) {
        const target = list.find(r => r.id === credsId || r.slug === credsId);
        if (target) handleOpenCredentialsModal(target);
      }
    } catch (err) {
      toast.error('Failed to load restaurants.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCredentialsModal = (r: Restaurant) => {
    setAdminCredsRest(r);
    setAdminCredsName(r.ownerName || '');
    setAdminCredsEmail(r.ownerEmail || '');
    setAdminCredsPassword('');
    setAdminCredsConfirmPassword('');
    setShowAdminCredsPassword(false);
    setShowAdminCredsConfirmPassword(false);
  };

  const handleGenerateAdminPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminCredsPassword(generated);
    setAdminCredsConfirmPassword(generated);
    setShowAdminCredsPassword(true);
    setShowAdminCredsConfirmPassword(true);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(generated).then(() => {
        toast.success('Generated and copied 12-char secure password to clipboard!');
      }).catch(() => {
        toast.success('Generated 12-char password!');
      });
    } else {
      toast.success('Generated 12-char password!');
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCredsRest) return;
    if (!adminCredsEmail.trim()) {
      toast.error('Admin email is required.');
      return;
    }
    if (adminCredsPassword && adminCredsPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (adminCredsPassword && adminCredsPassword.trim() !== adminCredsConfirmPassword.trim()) {
      toast.error('Passwords do not match. Please verify both password fields.');
      return;
    }

    setIsSavingAdminCreds(true);
    try {
      const res = await updateRestaurantAdminCredentials({
        restaurantId: adminCredsRest.id,
        ownerEmail: adminCredsEmail.trim(),
        ownerName: adminCredsName.trim(),
        password: adminCredsPassword.trim() || undefined,
        ownerUid: adminCredsRest.ownerId,
      }, user);

      if (res.success) {
        toast.success(
          adminCredsPassword 
            ? `Admin credentials and password updated for ${adminCredsRest.name}!` 
            : `Admin credentials updated for ${adminCredsRest.name}!`
        );
        setAdminCredsRest(null);
        await loadRestaurants();
      } else {
        toast.error('Failed to update admin credentials.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating admin credentials.');
    } finally {
      setIsSavingAdminCreds(false);
    }
  };

  const handleSaveRestaurantDetails = async () => {
    if (!editingRestaurant) return;
    if (!editingRestaurant.name?.trim()) {
      toast.error('Restaurant name is required.');
      return;
    }
    setIsSavingRestaurant(true);
    try {
      await updateRestaurant(editingRestaurant.id, editingRestaurant, user);
      toast.success(`Restaurant "${editingRestaurant.name}" details updated successfully!`);
      setEditingRestaurant(null);
      await loadRestaurants();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update restaurant.');
    } finally {
      setIsSavingRestaurant(false);
    }
  };

  // Generate random secure password for tenant owner
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormPassword(generated);
    setFormConfirmPassword(generated);
    setShowPassword(true);
    setShowConfirmPassword(true);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(generated).then(() => {
        toast.success('Generated and copied 12-char secure password to clipboard!');
      }).catch(() => {
        toast.success('Generated 12-char password!');
      });
    } else {
      toast.success('Generated 12-char password!');
    }
  };

  // Handle auto slug from name
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!formSlug || formSlug === generateSlug(formName)) {
      setFormSlug(generateSlug(val));
    }
  };

  const handleCountryChange = (country: string) => {
    setFormCountry(country);
    if (country === 'portugal') {
      setFormCurrency('EUR');
      setFormTimezone('Europe/Lisbon');
      setFormLanguage('pt');
    } else if (country === 'ireland') {
      setFormCurrency('EUR');
      setFormTimezone('Europe/Dublin');
      setFormLanguage('en');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Restaurant name is required.');
      return;
    }
    if (!formOwnerEmail.trim()) {
      toast.error('Owner email is required.');
      return;
    }
    if (!formPassword.trim()) {
      toast.error('Password is required for the new tenant owner account.');
      return;
    }
    if (formPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (formPassword.trim() !== formConfirmPassword.trim()) {
      toast.error('Passwords do not match. Please verify both password fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRest = await createRestaurant({
        name: formName.trim(),
        slug: formSlug.trim() || generateSlug(formName),
        ownerName: formOwnerName.trim(),
        ownerEmail: formOwnerEmail.trim(),
        ownerPassword: formPassword.trim(),
        country: formCountry,
        currency: formCurrency,
        timezone: formTimezone,
        language: formLanguage,
        planId: formPlan,
        status: formStatus,
      }, user);

      toast.success(`Restaurant ${newRest.name} & owner account created successfully!`);
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadRestaurants();
    } catch (err: any) {
      toast.error(err.message || 'Error creating restaurant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setFormName('');
    setFormSlug('');
    setFormOwnerName('');
    setFormOwnerEmail('');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormCountry('ireland');
    setFormCurrency('EUR');
    setFormTimezone('Europe/Dublin');
    setFormLanguage('en');
    setFormPlan('professional');
    setFormStatus('active');
  };

  const handleImpersonate = async (r: Restaurant) => {
    try {
      await impersonateRestaurant(r.id);
      toast.success(`Now managing ${r.name} as Super Admin`);
      navigate(`/r/${r.slug}/admin`);
    } catch (err) {
      toast.error('Failed to impersonate tenant.');
    }
  };

  const handleToggleStatus = async (r: Restaurant) => {
    const newStatus: RestaurantStatus = r.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateRestaurantStatus(r.id, newStatus, `Super Admin toggled status to ${newStatus}`, user);
      toast.success(`Restaurant ${r.name} is now ${newStatus}.`);
      loadRestaurants();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteClick = (r: Restaurant) => {
    setRestaurantToDelete(r);
    setConfirmDeleteInput('');
  };

  const isDeleteConfirmationValid = () => {
    if (!restaurantToDelete || !confirmDeleteInput) return false;
    const input = confirmDeleteInput.trim().toLowerCase();
    if (!input) return false;
    const targetName = (restaurantToDelete.name || '').trim().toLowerCase();
    const targetSlug = (restaurantToDelete.slug || '').trim().toLowerCase();
    const targetId = (restaurantToDelete.id || '').trim().toLowerCase();

    return (
      input === 'delete' ||
      input === 'apagar' ||
      input === 'eliminar' ||
      input === targetName ||
      input === targetSlug ||
      input === targetId
    );
  };

  const handleConfirmDelete = async () => {
    if (!restaurantToDelete) return;
    setIsDeleting(true);
    try {
      const deletedName = restaurantToDelete.name;
      const deletedId = restaurantToDelete.id;
      await deleteRestaurant(deletedId, user);
      toast.success(`Restaurant "${deletedName}" was permanently deleted.`);
      setRestaurantToDelete(null);
      setConfirmDeleteInput('');
      await loadRestaurants();

      // Clean local storage if this tenant was active or impersonated
      if (typeof window !== 'undefined') {
        try {
          if (localStorage.getItem('active_restaurant_id') === deletedId) {
            localStorage.removeItem('active_restaurant_id');
          }
          if (sessionStorage.getItem('impersonated_restaurant_id') === deletedId) {
            sessionStorage.removeItem('impersonated_restaurant_id');
          }
        } catch {}
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete restaurant.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r => {
    const q = (searchQuery || '').toLowerCase();
    const matchSearch = 
      ((r.name || '').toLowerCase().includes(q)) ||
      ((r.slug || '').toLowerCase().includes(q)) ||
      (r.ownerEmail && r.ownerEmail.toLowerCase().includes(q)) ||
      (r.ownerName && r.ownerName.toLowerCase().includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.primaryDomain && r.primaryDomain.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchPlan = planFilter === 'all' || r.planId === planFilter;

    return matchSearch && matchStatus && matchPlan;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Restaurant Tenants</h1>
          <p className="text-sm text-slate-400">
            Manage, onboard, suspend, or impersonate restaurant tenants across the SaaS platform.
          </p>
        </div>

        <button
          onClick={() => {
            resetCreateForm();
            setIsCreateModalOpen(true);
          }}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={15} />
          <span>New Restaurant</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by restaurant name, slug, email, domain, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Plans</option>
            {availablePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Owner & Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4 text-center">Bookings</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRestaurants.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white text-sm">{r.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <a 
                        href={`/r/${r.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5 font-mono"
                      >
                        /r/{r.slug}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="font-medium text-slate-200">{r.ownerName || '—'}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{r.ownerEmail || '—'}</div>
                    <button
                      type="button"
                      onClick={() => handleOpenCredentialsModal(r)}
                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      <Key size={10} />
                      <span>Set Password / Admin</span>
                    </button>
                    {r.phone && <div className="text-[10px] text-slate-500 mt-0.5">{r.phone}</div>}
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="capitalize">{r.city || r.country || 'Ireland'}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono">{r.currency} &bull; {r.language}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                        r.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : r.status === 'trial'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {r.status}
                      </span>
                      {r.maintenanceModeEnabled && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Maintenance
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {r.planName || r.planId}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {r.primaryDomain ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-mono">
                        <Globe size={11} />
                        {r.primaryDomain}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Subdomain only</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-medium text-slate-200">
                    {r.stats?.totalReservations || 0}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Impersonate Button */}
                      <button
                        title="Impersonate & Manage Restaurant"
                        onClick={() => handleImpersonate(r)}
                        className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ShieldAlert size={12} />
                        <span>Impersonate</span>
                      </button>

                      {/* Manage Admin Credentials & Password */}
                      <button
                        title="Add/Update Restaurant Admin Password & Credentials"
                        onClick={() => handleOpenCredentialsModal(r)}
                        className="p-1.5 rounded transition-colors text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer"
                      >
                        <Key size={14} />
                      </button>

                      {/* Suspend / Reactivate */}
                      <button
                        title={r.status === 'suspended' ? 'Activate Restaurant' : 'Suspend Restaurant'}
                        onClick={() => handleToggleStatus(r)}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          r.status === 'suspended' 
                            ? 'text-emerald-400 hover:bg-emerald-950/50' 
                            : 'text-rose-400 hover:bg-rose-950/50'
                        }`}
                      >
                        <Power size={14} />
                      </button>

                      {/* Edit Restaurant Details */}
                      <button
                        title="Edit Restaurant Details"
                        onClick={() => {
                          setEditingRestaurant(r);
                          setEditTab('general');
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      >
                        <Edit size={14} />
                      </button>

                      {/* Delete Restaurant */}
                      <button
                        title="Delete Restaurant"
                        onClick={() => handleDeleteClick(r)}
                        className="p-1.5 rounded transition-colors text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRestaurants.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No restaurants match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Restaurant Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-white">Create Restaurant Tenant</h2>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trattoria Bella Vista"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">URL Slug *</label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                  <span className="px-3 text-slate-500 bg-slate-950 py-2 border-r border-slate-800 font-mono text-[11px]">
                    eataapp.com/r/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="bella-vista"
                    value={formSlug}
                    onChange={(e) => setFormSlug(generateSlug(e.target.value))}
                    className="flex-1 px-3 py-2 bg-transparent text-amber-400 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="Marco Rossi"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Owner Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@restaurant.com"
                    value={formOwnerEmail}
                    onChange={(e) => setFormOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Owner Account Password Section */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span>Owner Login Password *</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors"
                  >
                    <Key size={12} />
                    Generate Secure Password
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      Initial Password <span className="text-slate-500">(min 6 chars)</span> *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Set owner password"
                        minLength={6}
                        className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        placeholder="Confirm owner password"
                        minLength={6}
                        className={`w-full pl-3 pr-9 py-2 bg-slate-950 border rounded-lg text-white placeholder-slate-600 focus:outline-none text-xs font-mono ${
                          formConfirmPassword && formPassword !== formConfirmPassword 
                            ? 'border-red-500/80 focus:border-red-500' 
                            : 'border-slate-800 focus:border-amber-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {formPassword && formConfirmPassword && formPassword !== formConfirmPassword && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1.5 pt-0.5">
                    <AlertCircle size={13} /> Passwords do not match
                  </p>
                )}
                {formPassword && formPassword.length >= 6 && formPassword === formConfirmPassword && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-0.5">
                    <Check size={13} /> Passwords match! Credentials will be provisioned.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Country</label>
                  <select
                    value={formCountry}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ireland">Ireland</option>
                    <option value="portugal">Portugal</option>
                    <option value="other">Other / EU</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Currency</label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as 'en' | 'pt')}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">SaaS Plan</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  >
                    {availablePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.priceMonthly === 0 ? 'Free' : `€${p.priceMonthly}/mo`})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as RestaurantStatus)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow"
                >
                  {isSubmitting ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Edit Restaurant Details Modal */}
      {editingRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Store size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>Edit Restaurant Details</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      /r/{editingRestaurant.slug}
                    </span>
                    {editingRestaurant.maintenanceModeEnabled && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Maintenance Active
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Update profile, contact details, location, subscription, and admin account.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingRestaurant(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditTab('general')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editTab === 'general'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Store size={14} />
                <span>General & Info</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('contact')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editTab === 'contact'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Phone size={14} />
                <span>Contact & Web</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('location')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editTab === 'location'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <MapPin size={14} />
                <span>Location & Locale</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('plan')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editTab === 'plan'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Globe size={14} />
                <span>Plan & Status</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Key size={14} />
                <span>Admin Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('media')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  editTab === 'media'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ImageIcon size={14} />
                <span>Branding & Media</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-4 text-xs">
              {/* TAB 1: GENERAL */}
              {editTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Restaurant Name *</label>
                      <input
                        type="text"
                        required
                        value={editingRestaurant.name || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Legal / Company Name</label>
                      <input
                        type="text"
                        value={editingRestaurant.legalName || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, legalName: e.target.value })}
                        placeholder="e.g. Bella Italia Hospitality Ltd"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Public URL Slug</label>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                      <span className="px-3 text-slate-500 bg-slate-950 py-2 border-r border-slate-800 font-mono text-[11px]">
                        /r/
                      </span>
                      <input
                        type="text"
                        value={editingRestaurant.slug || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, slug: generateSlug(e.target.value) })}
                        className="flex-1 px-3 py-2 bg-transparent text-amber-400 font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Customer booking page is available at: <span className="text-amber-400 font-mono">/r/{editingRestaurant.slug}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Cuisine Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Italian, Contemporary Bistro, Seafood"
                        value={editingRestaurant.cuisine || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, cuisine: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Price Range</label>
                      <select
                        value={editingRestaurant.priceRange || '€€'}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, priceRange: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="€">€ (Inexpensive)</option>
                        <option value="€€">€€ (Moderate)</option>
                        <option value="€€€">€€€ (Upscale)</option>
                        <option value="€€€€">€€€€ (Fine Dining / Luxury)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Description / About</label>
                    <textarea
                      rows={3}
                      value={editingRestaurant.description || ''}
                      onChange={(e) => setEditingRestaurant({ ...editingRestaurant, description: e.target.value })}
                      placeholder="Brief description of the restaurant, ambiance, and dining specialties..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Maintenance Mode setting for this specific restaurant */}
                  <div className={`p-4 rounded-xl border transition-colors duration-200 space-y-3 ${
                    editingRestaurant.maintenanceModeEnabled 
                      ? 'bg-amber-950/20 border-amber-500/40' 
                      : 'bg-slate-900 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs">Maintenance Mode</span>
                          {editingRestaurant.maintenanceModeEnabled && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Active for {editingRestaurant.name || 'this restaurant'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Disable public booking exclusively for this specific restaurant (/r/{editingRestaurant.slug}) and display its maintenance screen. Other restaurants remain completely unaffected.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                        <input
                          type="checkbox"
                          checked={editingRestaurant.maintenanceModeEnabled ?? false}
                          onChange={(e) => setEditingRestaurant({
                            ...editingRestaurant,
                            maintenanceModeEnabled: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {editingRestaurant.maintenanceModeEnabled && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between gap-2">
                        <span>
                          Reservations are currently paused for <strong>{editingRestaurant.name}</strong> (/r/{editingRestaurant.slug}).
                        </span>
                        <a
                          href={`/r/${editingRestaurant.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Preview Screen</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACT & WEB */}
              {editTab === 'contact' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Restaurant Contact Phone</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="+351 213 456 789"
                          value={editingRestaurant.phone || ''}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Restaurant Public Email</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="email"
                          placeholder="info@restaurant.com"
                          value={editingRestaurant.email || ''}
                          onChange={(e) => setEditingRestaurant({ ...editingRestaurant, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Official Website URL</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="url"
                        placeholder="https://www.restaurant.com"
                        value={editingRestaurant.website || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, website: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATION & LOCALE */}
              {editTab === 'location' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Rua Augusta 120, Baixa"
                      value={editingRestaurant.address || ''}
                      onChange={(e) => setEditingRestaurant({ ...editingRestaurant, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">City</label>
                      <input
                        type="text"
                        placeholder="e.g. Lisboa"
                        value={editingRestaurant.city || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, city: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">County / District / State</label>
                      <input
                        type="text"
                        placeholder="e.g. Lisboa"
                        value={editingRestaurant.countyState || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, countyState: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Postal Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 1100-053"
                        value={editingRestaurant.postalCode || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, postalCode: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Country</label>
                      <select
                        value={editingRestaurant.country || 'ireland'}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, country: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="portugal">Portugal</option>
                        <option value="ireland">Ireland</option>
                        <option value="united-kingdom">United Kingdom</option>
                        <option value="spain">Spain</option>
                        <option value="france">France</option>
                        <option value="italy">Italy</option>
                        <option value="germany">Germany</option>
                        <option value="united-states">United States</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Currency</label>
                      <select
                        value={editingRestaurant.currency || 'EUR'}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, currency: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="USD">USD ($)</option>
                        <option value="BRL">BRL (R$)</option>
                        <option value="CHF">CHF (Fr)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Timezone</label>
                      <select
                        value={editingRestaurant.timezone || 'Europe/Dublin'}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, timezone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</option>
                        <option value="Europe/Dublin">Europe/Dublin (GMT/IST)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                        <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                        <option value="Europe/Paris">Europe/Paris (CET)</option>
                        <option value="Europe/Rome">Europe/Rome (CET)</option>
                        <option value="America/New_York">America/New_York (EST/EDT)</option>
                        <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Primary Language</label>
                      <select
                        value={editingRestaurant.language || 'en'}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, language: e.target.value as 'en' | 'pt' })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="en">English (EN)</option>
                        <option value="pt">Português (PT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PLAN & STATUS */}
              {editTab === 'plan' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">SaaS Subscription Plan</label>
                      <select
                        value={editingRestaurant.planId}
                        onChange={(e) => {
                          const selected = availablePlans.find(p => p.id === e.target.value);
                          setEditingRestaurant({ 
                            ...editingRestaurant, 
                            planId: e.target.value,
                            planName: selected?.name || e.target.value
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        {availablePlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.priceMonthly === 0 ? 'Free' : `€${p.priceMonthly}/mo`})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Operational Status</label>
                      <select
                        value={editingRestaurant.status}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, status: e.target.value as RestaurantStatus })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="active">Active (Operational & Open)</option>
                        <option value="trial">Trial (Evaluation Period)</option>
                        <option value="suspended">Suspended (Access Temporarily Blocked)</option>
                        <option value="cancelled">Cancelled (Terminated Subscription)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Primary Custom Domain</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="e.g. www.belaitalia.com"
                        value={editingRestaurant.primaryDomain || ''}
                        onChange={(e) => setEditingRestaurant({ ...editingRestaurant, primaryDomain: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Configure CNAME record pointing to <span className="font-mono text-purple-400">custom.eataapp.com</span> in Super Admin Domains section.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 5: ADMIN CREDENTIALS SHORTCUT */}
              {editTab === 'admin' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <Key className="text-amber-500" size={16} />
                        <span>Restaurant Administrator Account</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Tenant Owner
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Admin Name:</span>
                        <span className="font-semibold text-white">{editingRestaurant.ownerName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Admin Email:</span>
                        <span className="font-mono text-amber-400">{editingRestaurant.ownerEmail || '—'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <p className="text-[11px] text-slate-400">
                        Need to add or change password, or update admin email?
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const target = editingRestaurant;
                          setEditingRestaurant(null);
                          handleOpenCredentialsModal(target);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Key size={13} />
                        <span>Manage Admin Credentials & Password</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: BRANDING & MEDIA */}
              {editTab === 'media' && (
                <div className="space-y-5 animate-in fade-in duration-100">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <ImageIcon className="text-amber-500" size={16} />
                        <span>Brand Imagery for {editingRestaurant.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">
                        restaurants/{editingRestaurant.slug}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ImageUploadField
                        label="Restaurant Brand Logo"
                        sublabel="Displayed in login, headers, and reservation emails"
                        value={editingRestaurant.branding?.logoUrl || ''}
                        onChange={(url) => setEditingRestaurant({
                          ...editingRestaurant,
                          branding: { ...(editingRestaurant.branding || {}), logoUrl: url }
                        })}
                        restaurantSlug={editingRestaurant.slug}
                        restaurantName={editingRestaurant.name}
                        fieldId="logoUrl"
                        subfolder="logo"
                        theme="dark"
                        placeholder="https://example.com/logo.png"
                      />

                      <ImageUploadField
                        label="Custom Favicon"
                        sublabel="Browser tab icon (.ico, .png, .svg)"
                        value={editingRestaurant.branding?.faviconUrl || ''}
                        onChange={(url) => setEditingRestaurant({
                          ...editingRestaurant,
                          branding: { ...(editingRestaurant.branding || {}), faviconUrl: url }
                        })}
                        restaurantSlug={editingRestaurant.slug}
                        restaurantName={editingRestaurant.name}
                        fieldId="faviconUrl"
                        subfolder="favicon"
                        theme="dark"
                        placeholder="https://example.com/favicon.ico"
                      />
                    </div>

                    <div>
                      <ImageUploadField
                        label="Public Header & Cover Image"
                        sublabel="Hero background banner image on public booking page"
                        value={editingRestaurant.branding?.coverImageUrl || ''}
                        onChange={(url) => setEditingRestaurant({
                          ...editingRestaurant,
                          branding: { ...(editingRestaurant.branding || {}), coverImageUrl: url }
                        })}
                        restaurantSlug={editingRestaurant.slug}
                        restaurantName={editingRestaurant.name}
                        fieldId="coverImageUrl"
                        subfolder="cover"
                        theme="dark"
                        placeholder="https://example.com/dining-room.jpg"
                      />
                    </div>
                  </div>

                  <RestaurantGalleryManager
                    images={editingRestaurant.settings?.galleryImages || []}
                    onChange={(imgs) => setEditingRestaurant({
                      ...editingRestaurant,
                      settings: { ...(editingRestaurant.settings || {}), galleryImages: imgs }
                    })}
                    restaurantSlug={editingRestaurant.slug}
                    restaurantName={editingRestaurant.name}
                    theme="dark"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <a
                href={`/r/${editingRestaurant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono"
              >
                <span>View Public Booking Page</span>
                <ExternalLink size={12} />
              </a>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRestaurant(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingRestaurant}
                  onClick={handleSaveRestaurantDetails}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSavingRestaurant ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Restaurant Details</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Restaurant Admin Credentials & Password Modal */}
      {adminCredsRest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Restaurant Admin Credentials
                  </h2>
                  <p className="text-xs text-slate-400">
                    {adminCredsRest.name} &bull; <span className="font-mono text-amber-400">/r/{adminCredsRest.slug}/admin</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAdminCredsRest(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdminCredentials} className="space-y-4 text-xs">
              {/* Info notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-200/90 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">Tenant Access Security:</span>
                  <p className="mt-0.5 text-slate-300">
                    This sets or updates the login credentials for this restaurant's admin. They can sign in at <span className="font-mono text-amber-400 font-semibold">/login</span> or <span className="font-mono text-amber-400 font-semibold">/r/{adminCredsRest.slug}/admin</span> to access their restaurant management dashboard.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Admin Full Name</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marco Rossi"
                    value={adminCredsName}
                    onChange={(e) => setAdminCredsName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Admin Login Email *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="admin@restaurant.com"
                    value={adminCredsEmail}
                    onChange={(e) => setAdminCredsEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
                    <Lock size={13} className="text-amber-500" />
                    <span>Set / Add Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAdminPassword}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors cursor-pointer"
                  >
                    <Key size={12} />
                    <span>Generate Secure Password</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">
                      New Password <span className="text-slate-500">(minimum 6 characters)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminCredsPassword ? 'text' : 'password'}
                        placeholder="Enter new password (or leave blank to keep current)"
                        value={adminCredsPassword}
                        onChange={(e) => setAdminCredsPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-16 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                        {adminCredsPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator.clipboard.writeText(adminCredsPassword);
                                toast.success('Password copied to clipboard!');
                              }
                            }}
                            title="Copy Password"
                            className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAdminCredsPassword(!showAdminCredsPassword)}
                          className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                        >
                          {showAdminCredsPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {adminCredsPassword && (
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminCredsConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-type new password"
                          value={adminCredsConfirmPassword}
                          onChange={(e) => setAdminCredsConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminCredsConfirmPassword(!showAdminCredsConfirmPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showAdminCredsConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Restaurant Login Link */}
              <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800/80 rounded-lg text-[11px]">
                <span className="text-slate-400">Direct Admin Portal:</span>
                <a
                  href={`/r/${adminCredsRest.slug}/admin`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>/r/{adminCredsRest.slug}/admin</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdminCredsRest(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdminCreds}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSavingAdminCreds ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Key size={13} />
                      <span>Update Admin Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {restaurantToDelete && (
        <div 
          id="delete-restaurant-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-950 border border-rose-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-800/80 bg-rose-950/20">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Delete Restaurant?
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-sm text-slate-300">
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Restaurant:</span>
                  <span className="font-semibold text-white">{restaurantToDelete.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Slug / URL:</span>
                  <span className="font-mono text-amber-400">/r/{restaurantToDelete.slug}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tenant ID:</span>
                  <span className="font-mono text-slate-400">{restaurantToDelete.id}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Deleting this restaurant will permanently remove its configuration, dining areas, table layouts, and associated domains.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  To confirm, type <span className="text-rose-400 font-mono font-bold">{restaurantToDelete.name}</span> or <span className="text-rose-400 font-mono font-bold">DELETE</span>:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={confirmDeleteInput}
                  onChange={(e) => setConfirmDeleteInput(e.target.value)}
                  placeholder={`Type "${restaurantToDelete.name}" or "DELETE"`}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl text-white text-sm outline-none transition-colors"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setRestaurantToDelete(null);
                  setConfirmDeleteInput('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !isDeleteConfirmationValid()}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Yes, Delete Restaurant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
