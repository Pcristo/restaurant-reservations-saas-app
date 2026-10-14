import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Calendar, 
  Users, 
  CreditCard, 
  Globe, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Database,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Video,
  LayoutGrid,
  Save
} from 'lucide-react';
import { listAllRestaurants, listAllDomains, listAuditLogs } from '../../services/tenantService';
import { Restaurant, DomainRecord, AuditLogEntry, MarketingWebsiteSettings } from '../../types';
import { runMultiTenantMigration, MigrationSummary } from '../../lib/migration';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { cn } from '../../lib/utils';
import { getMarketingWebsiteSettings, updateMarketingWebsiteSettings } from '../../services/marketingWebsiteService';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationSummary | null>(null);

  // Platform Development Mode state
  const [devModeEnabled, setDevModeEnabled] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [isSavingDevMode, setIsSavingDevMode] = useState(false);

  // Marketing Hero Section Mode state
  const [heroMode, setHeroMode] = useState<'existing' | 'video'>('video');
  const [marketingSettings, setMarketingSettings] = useState<MarketingWebsiteSettings | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [rests, doms, audit, mkt] = await Promise.all([
          listAllRestaurants(),
          listAllDomains(),
          listAuditLogs({ limit: 10 }),
          getMarketingWebsiteSettings(),
        ]);
        setRestaurants(rests);
        setDomains(doms);
        setLogs(audit);
        setMarketingSettings(mkt);
        setHeroMode((mkt.hero?.mode || 'video') as 'existing' | 'video');

        // Initial read of platform settings for development mode
        try {
          const platDoc = await getDoc(doc(db, 'platform_settings', 'general'));
          if (platDoc.exists()) {
            const data = platDoc.data();
            setDevModeEnabled(Boolean(data.developingModeEnabled));
            setDevPassword(data.developingPassword || '');
          } else {
            const cached = localStorage.getItem('dinemaster_platform_settings');
            if (cached) {
              const parsed = JSON.parse(cached);
              setDevModeEnabled(Boolean(parsed.developingModeEnabled));
              setDevPassword(parsed.developingPassword || '');
            }
          }
        } catch (err) {
          console.warn('Notice loading platform settings:', err);
        }
      } catch (err) {
        console.error('Failed loading Super Admin metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Real-time synchronization for Development Mode platform settings
    const unsubPlatform = onSnapshot(doc(db, 'platform_settings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDevModeEnabled(Boolean(data.developingModeEnabled));
        setDevPassword(data.developingPassword || '');
      }
    }, (err) => {
      console.warn('Notice onSnapshot platform settings:', err);
    });

    return () => unsubPlatform();
  }, []);

  const totalRestaurants = restaurants.length;
  const activeRestaurants = restaurants.filter(r => r.status === 'active').length;
  const trialRestaurants = restaurants.filter(r => r.status === 'trial').length;
  const suspendedRestaurants = restaurants.filter(r => r.status === 'suspended').length;

  const totalReservations = restaurants.reduce((sum, r) => sum + (r.stats?.totalReservations || 0), 0);
  const reservationsToday = restaurants.reduce((sum, r) => sum + (r.stats?.reservationsToday || 0), 0);
  const totalCustomers = restaurants.reduce((sum, r) => sum + (r.stats?.totalCustomers || 0), 0);

  // Calculate MRR from active plans
  const mrr = restaurants.reduce((sum, r) => {
    if (r.status !== 'active') return sum;
    if (r.planId === 'enterprise') return sum + 149;
    if (r.planId === 'business') return sum + 59;
    if (r.planId === 'professional') return sum + 29;
    return sum;
  }, 0);

  const activeDomains = domains.filter(d => d.status === 'active').length;
  const pendingDomains = domains.filter(d => d.status === 'verification_required' || d.status === 'pending').length;

  const handleRunMigration = async () => {
    if (!window.confirm('Run multi-tenant data migration? This will scope unassigned reservations, customers, tables, and settings to the default restaurant.')) {
      return;
    }
    setIsMigrating(true);
    try {
      const res = await runMultiTenantMigration();
      setMigrationResult(res);
      toast.success('Multi-tenant data migration completed successfully!');
      const [rests, doms, audit] = await Promise.all([
        listAllRestaurants(),
        listAllDomains(),
        listAuditLogs({ limit: 10 })
      ]);
      setRestaurants(rests);
      setDomains(doms);
      setLogs(audit);
    } catch (err: any) {
      console.error('Migration error:', err);
      toast.error(`Migration failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSaveDevMode = async () => {
    setIsSavingDevMode(true);
    try {
      await setDoc(doc(db, 'platform_settings', 'general'), {
        developingModeEnabled: devModeEnabled,
        developingPassword: devPassword,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      try {
        const cachedRaw = localStorage.getItem('dinemaster_platform_settings');
        const prev = cachedRaw ? JSON.parse(cachedRaw) : {};
        localStorage.setItem('dinemaster_platform_settings', JSON.stringify({
          ...prev,
          developingModeEnabled: devModeEnabled,
          developingPassword: devPassword
        }));
      } catch {}

      toast.success(
        devModeEnabled
          ? 'Development Mode ENABLED. Platform is now password protected.'
          : 'Development Mode DISABLED. Public access is open.'
      );
    } catch (err: any) {
      console.error('Failed to save Development Mode:', err);
      toast.error(err?.message || 'Failed to save Development Mode');
    } finally {
      setIsSavingDevMode(false);
    }
  };

  const handleHeroModeChange = async (newMode: 'existing' | 'video') => {
    setHeroMode(newMode);
    try {
      const updated = await updateMarketingWebsiteSettings({
        hero: {
          ...(marketingSettings?.hero || {}),
          mode: newMode
        }
      });
      setMarketingSettings(updated);
      toast.success(
        newMode === 'video'
          ? 'Hero section mode set to Video Background!'
          : 'Hero section mode set to Existing Hero!'
      );
    } catch (err: any) {
      console.warn('Notice saving hero mode:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Overview</h1>
          <p className="text-sm text-slate-400">
            Real-time multi-tenant health, reservation metrics, and tenant distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/super-admin/admins')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Invite and manage super administrators"
          >
            <ShieldCheck size={15} className="text-amber-400" />
            <span>Manage Super Admins</span>
          </button>

          <button
            onClick={handleRunMigration}
            disabled={isMigrating}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Scope existing single-tenant records to multi-tenant structure"
          >
            <Database size={15} className={isMigrating ? "animate-spin" : ""} />
            <span>{isMigrating ? 'Migrating Data...' : 'Migrate Legacy Data'}</span>
          </button>

          <button
            onClick={() => navigate('/app/super-admin/restaurants?action=create')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Restaurant</span>
          </button>
        </div>
      </div>

      {/* Migration Result Banner */}
      {migrationResult && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex items-start justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-emerald-400">Migration Run Finished Successfully</p>
              <p>
                {migrationResult.reservationsMigrated} reservations, {migrationResult.customersMigrated} customers, {migrationResult.tablesMigrated} tables, and {migrationResult.usersMigrated} staff users scoped. Plans seeded: {migrationResult.plansSeeded}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setMigrationResult(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform Development Mode Alert Banner */}
      {devModeEnabled && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Lock size={18} />
            </div>
            <div className="text-xs text-slate-300 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">Platform Development Lock Screen Active</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Global Zarco Studios Protection
                </span>
              </div>
              <p className="text-slate-400">
                All public visitors and guests are presented with the development lock screen. Super Admin dashboard remains accessible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-amber-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              Pass: {devPassword ? '••••••••' : 'No password set'}
            </span>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Restaurants */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-300">Total Restaurants</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Store size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalRestaurants}</div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
              {activeRestaurants} Active
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-amber-400">{trialRestaurants} Trial</span>
            {suspendedRestaurants > 0 && (
              <>
                <span className="text-slate-600">&bull;</span>
                <span className="text-rose-400">{suspendedRestaurants} Suspended</span>
              </>
            )}
          </div>
        </div>

        {/* Platform Bookings */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-300">Total Bookings</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Calendar size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalReservations}</div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
            <TrendingUp size={14} />
            <span>+{reservationsToday} bookings recorded today</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-300">SaaS Revenue (MRR)</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">€{mrr}</div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>{restaurants.filter(r => r.planId !== 'trial').length} paid restaurant plans</span>
          </div>
        </div>

        {/* Domains & Tenants */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium text-slate-300">Custom Domains</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Globe size={18} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{domains.length}</div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400">{activeDomains} Verified</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-amber-400">{pendingDomains} Pending DNS</span>
          </div>
        </div>
      </div>

      {/* Platform & System Controls: Development Mode and Homepage Hero Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control 1: Platform Development Mode */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Platform Development Mode</h2>
                <p className="text-[11px] text-slate-400">Private development lock screen protection (Zarco Studios)</p>
              </div>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
              devModeEnabled 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {devModeEnabled ? 'Lock Screen Active' : 'Public Access Open'}
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <div className="font-semibold text-white">Enable Development Lock Screen</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  When enabled, visitors must enter the access password to use the platform. Super Admin routes remain accessible.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={devModeEnabled}
                  onChange={(e) => setDevModeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {devModeEnabled && (
              <div className="space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 animate-in fade-in">
                <label className="block text-[11px] font-medium text-slate-300">
                  Access Password to Unlock Platform
                </label>
                <div className="relative">
                  <input
                    type={showDevPassword ? 'text' : 'password'}
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Enter access password"
                    className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDevPassword(!showDevPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-0.5"
                  >
                    {showDevPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  Leaving blank allows any user to unlock without password verification.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveDevMode}
                disabled={isSavingDevMode}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save size={13} />
                <span>{isSavingDevMode ? 'Saving...' : 'Save Development Mode'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Control 2: Homepage Hero Section Mode */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Homepage Hero Section Mode</h2>
                <p className="text-[11px] text-slate-400">Configure public SaaS homepage appearance</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {heroMode === 'video' ? 'Video Background Active' : 'Existing Hero Active'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Option 1: Existing Hero */}
            <button
              type="button"
              onClick={() => handleHeroModeChange('existing')}
              className={cn(
                "p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between",
                heroMode === 'existing'
                  ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>Existing Hero</span>
                  </div>
                  {heroMode === 'existing' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Display the original hero section exactly as it is now with the dark background, glow, and inline floor plan mockup.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                Height: Responsive
              </div>
            </button>

            {/* Option 2: Video Background */}
            <button
              type="button"
              onClick={() => handleHeroModeChange('video')}
              className={cn(
                "p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between",
                heroMode === 'video'
                  ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>Video Background</span>
                  </div>
                  {heroMode === 'video' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Display the hero section with background video from assets/videos, 50% dark overlay, 100vh height, and transparent navbar.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-amber-400 font-semibold">
                Height: 100vh Viewport
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <span className="truncate">Updates saved and synced to public marketing page automatically</span>
            <a
              href="/?preview=true"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium shrink-0 ml-2"
            >
              <span>View Landing Page</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      {/* Operational Highlights & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Restaurants Table */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Active Tenants</h2>
              <p className="text-xs text-slate-400">Recently onboarded and managed restaurants.</p>
            </div>
            <button
              onClick={() => navigate('/app/super-admin/restaurants')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3 font-semibold">Restaurant</th>
                  <th className="pb-3 font-semibold">Owner</th>
                  <th className="pb-3 font-semibold">Plan</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {restaurants.slice(0, 5).map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => navigate(`/app/super-admin/restaurants?id=${r.id}`)}
                    className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-white">{r.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">/r/{r.slug}</div>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-300">
                      <div>{r.ownerName || 'Admin'}</div>
                      <div className="text-[11px] text-slate-500">{r.ownerEmail || '—'}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
                        {r.planName || r.planId}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                        r.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : r.status === 'trial'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-300 font-medium">
                      {r.stats?.totalReservations || 0}
                    </td>
                  </tr>
                ))}
                {restaurants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No restaurants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time System Audit Feed */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">System Audit Log</h2>
              <button
                onClick={() => navigate('/app/super-admin/logs')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                View Logs
              </button>
            </div>

            <div className="space-y-3.5">
              {logs.slice(0, 6).map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-amber-500/60 pl-3 py-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                    <span className="font-mono text-amber-400 font-medium">{log.action}</span>
                    <span>{log.timestamp ? format(parseISO(log.timestamp), 'HH:mm') : ''}</span>
                  </div>
                  <p className="text-slate-200 font-medium truncate">
                    {log.userName || log.userEmail || 'System'}: {log.resource}
                  </p>
                  {log.details && (
                    <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              ))}

              {logs.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No system logs recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck size={14} />
              Tenant Scoping Enforced
            </span>
            <span>v2.4 SaaS Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
