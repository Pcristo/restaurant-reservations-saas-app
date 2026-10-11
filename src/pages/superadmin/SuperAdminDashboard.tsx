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
  RefreshCw
} from 'lucide-react';
import { listAllRestaurants, listAllDomains, listAuditLogs } from '../../services/tenantService';
import { Restaurant, DomainRecord, AuditLogEntry } from '../../types';
import { runMultiTenantMigration, MigrationSummary } from '../../lib/migration';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationSummary | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [rests, doms, audit] = await Promise.all([
          listAllRestaurants(),
          listAllDomains(),
          listAuditLogs({ limit: 10 })
        ]);
        setRestaurants(rests);
        setDomains(doms);
        setLogs(audit);
      } catch (err) {
        console.error('Failed loading Super Admin metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
