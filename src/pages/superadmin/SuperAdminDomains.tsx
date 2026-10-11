import React, { useState, useEffect } from 'react';
import { 
  listAllDomains, 
  listAllRestaurants,
  verifyRestaurantDomain, 
  setPrimaryDomain, 
  deleteRestaurantDomain 
} from '../../services/tenantService';
import { DomainRecord, Restaurant } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { 
  Globe, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  ShieldCheck, 
  Star,
  Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

export const SuperAdminDomains: React.FC = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, Restaurant>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [domList, restList] = await Promise.all([
        listAllDomains(),
        listAllRestaurants(),
      ]);
      setDomains(domList);

      const map: Record<string, Restaurant> = {};
      restList.forEach(r => { map[r.id] = r; });
      setRestaurants(map);
    } catch (err) {
      toast.error('Failed loading domain records.');
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = async (dom: DomainRecord) => {
    setVerifyingId(dom.id);
    try {
      const result = await verifyRestaurantDomain(dom.id, user);
      if (result.verified) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Verification check failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleTogglePrimary = async (dom: DomainRecord) => {
    try {
      await setPrimaryDomain(dom.restaurantId, dom.id, user);
      toast.success(`${dom.domain} is now the primary domain for ${restaurants[dom.restaurantId]?.name || 'restaurant'}`);
      loadData();
    } catch (err) {
      toast.error('Failed to update primary domain.');
    }
  };

  const handleDelete = async (dom: DomainRecord) => {
    if (!window.confirm(`Are you sure you want to remove ${dom.domain}?`)) return;
    try {
      await deleteRestaurantDomain(dom.id, user);
      toast.success(`Domain ${dom.domain} removed.`);
      loadData();
    } catch (err) {
      toast.error('Failed to delete domain.');
    }
  };

  const filteredDomains = domains.filter(d => {
    const q = (searchQuery || '').toLowerCase();
    const restName = (restaurants[d.restaurantId]?.name || '').toLowerCase();
    const matchSearch = ((d.domain || '').toLowerCase().includes(q)) || restName.includes(q);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Custom Domain Routing</h1>
          <p className="text-sm text-slate-400">
            Global SSL certificates, DNS verification status, and tenant host routing.
          </p>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Info Card: SaaS Ingress Target */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">SaaS Domain Ingress Target</div>
            <p className="text-xs text-slate-400">
              Restaurants must create a <strong>CNAME</strong> record pointing to <span className="font-mono text-amber-400">cname.eataapp.com</span> or an <strong>A</strong> record pointing to <span className="font-mono text-amber-400">76.76.21.21</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search domain or restaurant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active & Verified</option>
          <option value="verification_required">Verification Required</option>
          <option value="pending">Pending DNS</option>
          <option value="error">Configuration Error</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-4">Domain Name</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Type & Record</th>
                <th className="py-3 px-4">DNS Status</th>
                <th className="py-3 px-4">SSL Cert</th>
                <th className="py-3 px-4">Last Checked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDomains.map((dom) => {
                const rest = restaurants[dom.restaurantId];
                return (
                  <tr key={dom.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{dom.domain}</span>
                        {dom.isPrimary && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                            <Star size={9} fill="currentColor" />
                            Primary
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="font-semibold text-white">{rest?.name || dom.restaurantId}</div>
                      <div className="text-[11px] text-slate-500 font-mono">/r/{rest?.slug || dom.restaurantId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono uppercase text-[11px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                        {dom.dnsRecordType || (dom.type === 'apex' ? 'A' : 'CNAME')}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        &rarr; {dom.dnsTarget}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {dom.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 size={11} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          <AlertTriangle size={11} />
                          Verification Required
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {dom.sslStatus === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <ShieldCheck size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {dom.lastCheckedAt ? format(parseISO(dom.lastCheckedAt), 'dd MMM HH:mm') : 'Just now'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Verify DNS status now"
                          disabled={verifyingId === dom.id}
                          onClick={() => handleVerify(dom)}
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={11} className={verifyingId === dom.id ? 'animate-spin' : ''} />
                          <span>Verify</span>
                        </button>

                        {!dom.isPrimary && (
                          <button
                            title="Make primary domain"
                            onClick={() => handleTogglePrimary(dom)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Star size={13} />
                          </button>
                        )}

                        <button
                          title="Delete domain"
                          onClick={() => handleDelete(dom)}
                          className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDomains.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No custom domains found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
