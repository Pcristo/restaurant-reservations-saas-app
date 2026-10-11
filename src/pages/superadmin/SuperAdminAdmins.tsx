import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { 
  listSuperAdmins, 
  listSuperAdminInvitations, 
  inviteSuperAdmin, 
  createSuperAdminWithPassword, 
  toggleSuperAdminStatus, 
  removeSuperAdmin, 
  revokeInvitation,
  manuallyActivateInvitation 
} from '../../services/superAdminManagementService';
import { 
  listAllRestaurants, 
  updateRestaurantAdminCredentials 
} from '../../services/tenantService';
import { User, SuperAdminInvitation, Restaurant } from '../../types';
import { APP_CONFIG } from '../../data/appConfig';
import { 
  Shield, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock, 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Clock, 
  Eye, 
  EyeOff, 
  Send, 
  RefreshCw, 
  Crown, 
  X, 
  Loader2, 
  MoreVertical, 
  ExternalLink,
  Ban,
  UserCheck,
  Store,
  ShieldAlert,
  Edit,
  User as UserIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SuperAdminAdmins: React.FC = () => {
  const { user: currentUser, resetPassword } = useAuth();
  const { impersonateRestaurant } = useTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeAdminTab, setActiveAdminTab] = useState<'super_admins' | 'restaurant_admins'>(
    searchParams.get('tab') === 'restaurants' ? 'restaurant_admins' : 'super_admins'
  );

  const [admins, setAdmins] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<SuperAdminInvitation[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Restaurant Admin Credentials Modal State
  const [adminCredsRest, setAdminCredsRest] = useState<Restaurant | null>(null);
  const [adminCredsName, setAdminCredsName] = useState('');
  const [adminCredsEmail, setAdminCredsEmail] = useState('');
  const [adminCredsPassword, setAdminCredsPassword] = useState('');
  const [adminCredsConfirmPassword, setAdminCredsConfirmPassword] = useState('');
  const [showAdminCredsPassword, setShowAdminCredsPassword] = useState(false);
  const [showAdminCredsConfirmPassword, setShowAdminCredsConfirmPassword] = useState(false);
  const [isSavingAdminCreds, setIsSavingAdminCreds] = useState(false);

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [adminToToggle, setAdminToToggle] = useState<{ user: User; nextStatus: 'active' | 'suspended' } | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = useState<SuperAdminInvitation | null>(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Create Form
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Success summary modal after inviting or creating
  const [createdResult, setCreatedResult] = useState<{ email: string; inviteUrl?: string; tempPassword?: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminList, inviteList, restList] = await Promise.all([
        listSuperAdmins(),
        listSuperAdminInvitations(),
        listAllRestaurants(),
      ]);
      setAdmins(adminList);
      setInvitations(inviteList);
      setRestaurants(restList);
    } catch (err) {
      console.error('[SuperAdminAdmins] Error loading administrators:', err);
      toast.error('Failed to load administrator list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      }, currentUser);

      if (res.success) {
        toast.success(
          adminCredsPassword 
            ? `Admin credentials and password updated for ${adminCredsRest.name}!` 
            : `Admin credentials updated for ${adminCredsRest.name}!`
        );
        setAdminCredsRest(null);
        await loadData();
      } else {
        toast.error('Failed to update admin credentials.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating admin credentials.');
    } finally {
      setIsSavingAdminCreds(false);
    }
  };

  const handleImpersonate = async (r: Restaurant) => {
    try {
      await impersonateRestaurant(r.id);
      toast.success(`Now managing ${r.name} as Super Admin`);
      navigate(`/r/${r.slug}/admin`);
    } catch (err) {
      toast.error('Failed to impersonate restaurant.');
    }
  };

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return admins;
    return admins.filter(a => 
      (a.name || '').toLowerCase().includes(q) || 
      (a.email || '').toLowerCase().includes(q)
    );
  }, [admins, searchQuery]);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return restaurants;
    return restaurants.filter(r => 
      (r.name || '').toLowerCase().includes(q) || 
      (r.slug || '').toLowerCase().includes(q) ||
      (r.ownerName || '').toLowerCase().includes(q) || 
      (r.ownerEmail || '').toLowerCase().includes(q)
    );
  }, [restaurants, searchQuery]);

  const pendingInvitations = useMemo(() => {
    return invitations.filter(i => i.status === 'pending');
  }, [invitations]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    toast.success('Copied to clipboard');
    setTimeout(() => {
      setCopiedLink(null);
    }, 2000);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address.');
      return;
    }

    setIsInviting(true);
    try {
      const res = await inviteSuperAdmin(
        { email: inviteEmail, name: inviteName, notes: inviteNotes },
        currentUser
      );
      toast.success('Super Admin invitation created successfully!');
      setIsInviteModalOpen(false);
      setCreatedResult({ email: inviteEmail.trim().toLowerCase(), inviteUrl: res.inviteUrl });
      setInviteEmail('');
      setInviteName('');
      setInviteNotes('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim()) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (createPassword !== createConfirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (createPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsCreating(true);
    try {
      await createSuperAdminWithPassword(
        { email: createEmail, name: createName, password: createPassword },
        currentUser
      );
      toast.success('Super Admin created successfully!');
      setIsCreateModalOpen(false);
      setCreatedResult({ 
        email: createEmail.trim().toLowerCase(), 
        tempPassword: createPassword,
        inviteUrl: `${window.location.origin}/app/super-admin` 
      });
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateConfirmPassword('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create Super Admin.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!adminToToggle) return;
    try {
      await toggleSuperAdminStatus(adminToToggle.user, adminToToggle.nextStatus, currentUser);
      toast.success(`Administrator ${adminToToggle.nextStatus === 'active' ? 'activated' : 'suspended'} successfully.`);
      setAdminToToggle(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    try {
      await removeSuperAdmin(adminToDelete, currentUser);
      toast.success('Super Admin removed successfully.');
      setAdminToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove Super Admin.');
    }
  };

  const handleRevokeInvite = async () => {
    if (!inviteToRevoke) return;
    try {
      await revokeInvitation(inviteToRevoke.id, inviteToRevoke.email, currentUser);
      toast.success('Invitation revoked.');
      setInviteToRevoke(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke invitation.');
    }
  };

  const [activatingInviteId, setActivatingInviteId] = useState<string | null>(null);

  const handleActivateInvitation = async (inv: SuperAdminInvitation) => {
    setActivatingInviteId(inv.id);
    try {
      await manuallyActivateInvitation(inv, currentUser);
      toast.success(`Invitation accepted! ${inv.email} is now an active Super Administrator.`);
      await loadData();
    } catch (err: any) {
      console.error('Error activating invitation:', err);
      toast.error(err?.message || 'Failed to activate invitation.');
    } finally {
      setActivatingInviteId(null);
    }
  };

  const handleSendResetEmail = async (email: string) => {
    try {
      await resetPassword(email);
      toast.success(`Password reset email sent to ${email}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset email.');
    }
  };

  const isMasterAdmin = (email?: string | null) => {
    return (email || '').trim().toLowerCase() === 'pcristo35@gmail.com';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Administrators & Credentials
            </h1>
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Security & Access
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Control platform-wide access, invite Super Admins, and configure passwords and credentials for restaurant tenant administrators.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeAdminTab === 'super_admins' ? (
            <>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Mail size={15} className="text-amber-400" />
                <span>Invite via Email</span>
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Add Super Admin</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/app/super-admin/restaurants?action=create')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Store size={15} />
              <span>New Restaurant Tenant</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher: Platform Super Admins vs Restaurant Admins */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveAdminTab('super_admins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'super_admins'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield size={14} />
          <span>Platform Super Admins ({admins.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveAdminTab('restaurant_admins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'restaurant_admins'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key size={14} />
          <span>Restaurant Administrators ({restaurants.length})</span>
        </button>
      </div>

      {/* TAB 1: PLATFORM SUPER ADMINS */}
      {activeAdminTab === 'super_admins' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Super Admins</p>
                <h3 className="text-2xl font-bold text-white mt-1">{admins.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Active Accounts</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                  {admins.filter(a => a.status !== 'suspended' && a.status !== 'inactive').length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Pending Invitations</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1">{pendingInvitations.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Platform Owner</p>
                <h3 className="text-xs font-mono font-bold text-white mt-1.5 truncate max-w-[150px]">
                  pcristo35@gmail.com
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Crown size={20} />
              </div>
            </div>
          </div>

      {/* Pending Invitations Section (if any) */}
      {pendingInvitations.length > 0 && (
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Pending Super Admin Invitations ({pendingInvitations.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-400/90 font-mono">
              Invited users can sign in at /app/super-admin
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {inv.name ? inv.name.charAt(0).toUpperCase() : inv.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{inv.name || 'Invited Administrator'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{inv.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleActivateInvitation(inv)}
                    disabled={activatingInviteId === inv.id}
                    className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Accept and activate this administrator immediately"
                  >
                    {activatingInviteId === inv.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <UserCheck size={12} />
                    )}
                    <span>{activatingInviteId === inv.id ? 'Activating...' : 'Activate Now'}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(`${window.location.origin}/app/super-admin?invited=${encodeURIComponent(inv.email)}&inviteId=${encodeURIComponent(inv.id)}`, inv.id)}
                    className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copy invite link to send to the administrator"
                  >
                    {copiedLink === inv.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedLink === inv.id ? 'Copied Link' : 'Copy Invite Link'}</span>
                  </button>

                  <button
                    onClick={() => setInviteToRevoke(inv)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Decline / Revoke invitation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Decision Guide Box (How to Say YES or NO) */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>How to Accept or Decline (Say Yes or No):</span>
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                <strong className="text-emerald-400">Say YES:</strong> Click <span className="text-emerald-400 font-bold">Activate Now</span> above, or the user opens the invite link and clicks <span className="text-white font-semibold">&quot;Accept with Google&quot;</span> / <span className="text-white font-semibold">&quot;Set Password&quot;</span>.
              </span>
              <span>
                <strong className="text-rose-400">Say NO:</strong> Click the <span className="text-rose-400 font-bold">Trash (Revoke)</span> button above, or the user clicks <span className="text-white font-semibold">&quot;Decline&quot;</span> on the invite page.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Super Admins List Card */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by administrator name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 sm:px-6">Administrator</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Auth Method</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-amber-500" size={24} />
                      <span>Loading Super Administrators...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No administrators match your search.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isMaster = isMasterAdmin(admin.email);
                  const isSelf = currentUser?.email && admin.email && currentUser.email.toLowerCase() === admin.email.toLowerCase();
                  const isSuspended = admin.status === 'suspended' || admin.status === 'inactive';

                  return (
                    <tr key={admin.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isMaster 
                              ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20' 
                              : 'bg-slate-800 border border-slate-700 text-amber-400'
                          }`}>
                            {admin.name ? admin.name.charAt(0).toUpperCase() : (admin.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{admin.name || 'Super Admin'}</span>
                              {isSelf && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 font-mono text-[11px] block">{admin.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Access */}
                      <td className="py-3.5 px-4">
                        {isMaster ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            <Crown size={12} />
                            <span>Platform Owner</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                            <Shield size={12} className="text-amber-400" />
                            <span>Super Admin</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            <Ban size={11} />
                            <span>Suspended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      {/* Auth Provider */}
                      <td className="py-3.5 px-4 text-slate-400 capitalize">
                        {admin.authProvider || 'Firebase Auth'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy Direct URL */}
                          <button
                            onClick={() => handleCopy(`${window.location.origin}/app/super-admin`, admin.id)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy Super Admin URL"
                          >
                            {copiedLink === admin.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>

                          {/* Send Password Reset Email */}
                          {admin.email && (
                            <button
                              onClick={() => handleSendResetEmail(admin.email!)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Send password reset email"
                            >
                              <Key size={14} />
                            </button>
                          )}

                          {/* Toggle Active / Suspended (Master Admin & Self cannot be suspended) */}
                          {!isMaster && !isSelf && (
                            <button
                              onClick={() => setAdminToToggle({
                                user: admin,
                                nextStatus: isSuspended ? 'active' : 'suspended'
                              })}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isSuspended 
                                  ? 'text-emerald-400 hover:bg-emerald-500/10' 
                                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                              }`}
                              title={isSuspended ? 'Activate account' : 'Suspend account'}
                            >
                              {isSuspended ? <UserCheck size={14} /> : <Ban size={14} />}
                            </button>
                          )}

                          {/* Remove Admin (Master Admin & Self cannot be removed) */}
                          {!isMaster && !isSelf && (
                            <button
                              onClick={() => setAdminToDelete(admin)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove Super Admin privileges"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* TAB 2: RESTAURANT ADMINISTRATORS */}
      {activeAdminTab === 'restaurant_admins' && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Restaurant Tenants</p>
                <h3 className="text-2xl font-bold text-white mt-1">{restaurants.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Store size={20} />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Configured Admins</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                  {restaurants.filter(r => r.ownerEmail).length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Active Tenants</p>
                <h3 className="text-2xl font-bold text-amber-400 mt-1">
                  {restaurants.filter(r => r.status === 'active').length}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Direct Access URLs</p>
                <h3 className="text-xs font-mono font-bold text-white mt-1.5 truncate">
                  /r/[slug]/admin
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Key size={20} />
              </div>
            </div>
          </div>

          {/* Restaurant Admins Table Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search by restaurant name, slug, or admin email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/app/super-admin/restaurants?action=create')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Store size={14} />
                  <span>Add Restaurant Tenant</span>
                </button>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4 sm:px-6">Restaurant Tenant</th>
                    <th className="py-3 px-4">Admin / Owner</th>
                    <th className="py-3 px-4">Direct Admin Portal</th>
                    <th className="py-3 px-4">Plan & Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="animate-spin text-amber-500" size={24} />
                          <span>Loading Restaurant Administrators...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No restaurant administrators match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurants.map((r) => {
                      const adminLoginUrl = `${window.location.origin}/r/${r.slug}/admin`;
                      return (
                        <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                          {/* Restaurant Tenant */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                                <Store size={16} />
                              </div>
                              <div>
                                <div className="font-semibold text-white">{r.name}</div>
                                <a
                                  href={`/r/${r.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:underline text-[11px] font-mono inline-flex items-center gap-0.5"
                                >
                                  <span>/r/{r.slug}</span>
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            </div>
                          </td>

                          {/* Admin / Owner */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-200">{r.ownerName || '—'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{r.ownerEmail || 'No email configured'}</div>
                            <button
                              type="button"
                              onClick={() => handleOpenCredentialsModal(r)}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                            >
                              <Key size={10} />
                              <span>Set Password / Credentials</span>
                            </button>
                          </td>

                          {/* Direct Admin Portal */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`/r/${r.slug}/admin`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <span>/r/{r.slug}/admin</span>
                                <ExternalLink size={11} />
                              </a>
                              <button
                                onClick={() => handleCopy(adminLoginUrl, r.id)}
                                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                                title="Copy Admin Login URL"
                              >
                                {copiedLink === r.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Accessible at /login and /r/{r.slug}/admin
                            </span>
                          </td>

                          {/* Plan & Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {r.planName || r.planId || 'Basic'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                r.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : r.status === 'trial'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}>
                                {r.status}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Impersonate */}
                              <button
                                onClick={() => handleImpersonate(r)}
                                className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                title="Impersonate & Manage Restaurant"
                              >
                                <ShieldAlert size={12} />
                                <span>Impersonate</span>
                              </button>

                              {/* Set Password / Credentials Modal */}
                              <button
                                onClick={() => handleOpenCredentialsModal(r)}
                                className="p-1.5 rounded transition-colors text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer"
                                title="Add/Update Restaurant Admin Password & Credentials"
                              >
                                <Key size={14} />
                              </button>

                              {/* Edit Restaurant Details */}
                              <button
                                onClick={() => navigate(`/app/super-admin/restaurants?edit=${r.id}`)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Edit Restaurant Details in Tenant Management"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: Invite Super Admin via Email                            */}
      {/* ================================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <h3 className="text-lg font-bold text-white">Invite Super Admin</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Invite a trusted team member. Once invited, they can access <span className="font-mono text-amber-400">/app/super-admin</span> directly using Google Sign-In or set their password.
            </p>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="admin.colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Alexandre Costa"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead DevOps / Co-Founder"
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  {isInviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{isInviting ? 'Inviting...' : 'Create Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: Create Super Admin Account with Password                 */}
      {/* ================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <h3 className="text-lg font-bold text-white">Create Super Admin Account</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Creates a direct email & password authentication account for a Super Admin without signing out of your current session.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Pedro Santos"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin.ops@dinemasterpro.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Initial Password * (min. 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={createConfirmPassword}
                  onChange={(e) => setCreateConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isCreating ? 'Creating Account...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: Success Result Dialog with Link / Credentials            */}
      {/* ================================================================= */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Super Admin Configured!
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Super Admin access has been granted for <span className="font-mono text-emerald-400 font-semibold">{createdResult.email}</span>.
            </p>

            {createdResult.tempPassword && (
              <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-slate-500 block">Initial Password</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white font-semibold">{createdResult.tempPassword}</span>
                  <button
                    onClick={() => handleCopy(createdResult.tempPassword!, 'pw')}
                    className="text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
                  >
                    {copiedLink === 'pw' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {createdResult.inviteUrl && (
              <div className="mb-5 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-slate-500 block">Direct Login URL</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-slate-300 text-[11px] truncate">{createdResult.inviteUrl}</span>
                  <button
                    onClick={() => handleCopy(createdResult.inviteUrl!, 'url')}
                    className="shrink-0 text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
                  >
                    {copiedLink === 'url' ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setCreatedResult(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: Delete Confirmation Dialog                               */}
      {/* ================================================================= */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-left">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle size={20} />
            </div>

            <h3 className="text-base font-bold text-white mb-1.5">
              Remove Super Admin?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Are you sure you want to revoke Super Admin privileges for <span className="font-mono text-white">{adminToDelete.email}</span>? This will revoke access to the Super Admin area immediately.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setAdminToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: Suspend / Activate Confirmation Dialog                   */}
      {/* ================================================================= */}
      {adminToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-left">
            <h3 className="text-base font-bold text-white mb-1.5">
              {adminToToggle.nextStatus === 'active' ? 'Reactivate Super Admin?' : 'Suspend Super Admin?'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {adminToToggle.nextStatus === 'active'
                ? `Restore Super Admin access for ${adminToToggle.user.email}?`
                : `Temporarily suspend Super Admin access for ${adminToToggle.user.email}?`}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setAdminToToggle(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-lg cursor-pointer ${
                  adminToToggle.nextStatus === 'active'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {adminToToggle.nextStatus === 'active' ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 6: Revoke Invitation Dialog                                 */}
      {/* ================================================================= */}
      {inviteToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-left">
            <h3 className="text-base font-bold text-white mb-1.5">
              Revoke Invitation?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Cancel the pending invitation for <span className="font-mono text-white">{inviteToRevoke.email}</span>?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setInviteToRevoke(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeInvite}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 7: Restaurant Admin Credentials & Password Modal            */}
      {/* ================================================================= */}
      {adminCredsRest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 text-left">
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
                    This sets or updates login credentials for this restaurant's admin. They can sign in at <span className="font-mono text-amber-400 font-semibold">/login</span> or <span className="font-mono text-amber-400 font-semibold">/r/{adminCredsRest.slug}/admin</span> to manage reservations, tables, staff, and settings.
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
    </div>
  );
};
