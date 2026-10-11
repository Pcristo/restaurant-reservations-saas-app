import React, { useState, useEffect } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { 
  addRestaurantDomain, 
  verifyRestaurantDomain, 
  setPrimaryDomain, 
  deleteRestaurantDomain 
} from '../../services/tenantService';
import { DomainRecord } from '../../types';
import { APP_CONFIG } from '../../data/appConfig';
import { 
  Globe, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Star,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const RestaurantDomainSettings: React.FC = () => {
  const { tenant, domains, refreshTenant, entitlements } = useTenant();
  const { user } = useAuth();

  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedDomainForInstructions, setSelectedDomainForInstructions] = useState<DomainRecord | null>(null);

  const platformDomain = `${APP_CONFIG.companyName.toLowerCase()}.com`;
  const eataSubdomainUrl = tenant ? `https://${platformDomain}/r/${tenant.slug}` : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!newDomain.trim()) {
      toast.error('Please enter a domain name.');
      return;
    }

    try {
      const added = await addRestaurantDomain(tenant.id, newDomain.trim(), user);
      toast.success(`Domain ${added.domain} registered! Configure your DNS records next.`);
      setNewDomain('');
      setIsAdding(false);
      setSelectedDomainForInstructions(added);
      await refreshTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add domain.');
    }
  };

  const handleVerify = async (dom: DomainRecord) => {
    setVerifyingId(dom.id);
    try {
      const res = await verifyRestaurantDomain(dom.id, user);
      if (res.verified) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      await refreshTenant();
    } catch (err: any) {
      toast.error(err.message || 'Verification check failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetPrimary = async (dom: DomainRecord) => {
    if (!tenant) return;
    try {
      await setPrimaryDomain(tenant.id, dom.id, user);
      toast.success(`${dom.domain} is now your primary domain!`);
      await refreshTenant();
    } catch {
      toast.error('Failed to set primary domain.');
    }
  };

  const handleDelete = async (dom: DomainRecord) => {
    if (!window.confirm(`Are you sure you want to disconnect ${dom.domain}?`)) return;
    try {
      await deleteRestaurantDomain(dom.id, user);
      toast.success(`Domain ${dom.domain} disconnected.`);
      if (selectedDomainForInstructions?.id === dom.id) {
        setSelectedDomainForInstructions(null);
      }
      await refreshTenant();
    } catch {
      toast.error('Failed to delete domain.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Platform Subdomain Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Your {APP_CONFIG.appName} Platform URL</h3>
              <p className="text-xs text-gray-500">
                Always active and available for online reservations.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 size={12} />
            Active & Secured
          </span>
        </div>

        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs">
          <span className="font-mono text-gray-800 font-medium truncate">{eataSubdomainUrl}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(eataSubdomainUrl)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              title="Copy URL"
            >
              <Copy size={14} />
            </button>
            <a
              href={`/r/${tenant?.slug}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
              title="Open Live Website"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Custom Domains Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Connect Your Custom Domain</h3>
            <p className="text-xs text-gray-500">
              Link your restaurant's website (e.g. <code>www.restaurantname.com</code>) with automatic SSL.
            </p>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Connect Domain</span>
            </button>
          )}
        </div>

        {/* Add Domain Form */}
        {isAdding && (
          <form onSubmit={handleAddDomain} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-gray-900">Add New Domain</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                placeholder="e.g. www.mybistro.com or mybistro.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Add Domain
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              We recommend using a subdomain like <strong>www.yourname.com</strong> or <strong>reservations.yourname.com</strong>.
            </p>
          </form>
        )}

        {/* Domain List */}
        <div className="space-y-3">
          {domains.map((dom) => (
            <div 
              key={dom.id}
              className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{dom.domain}</span>
                  {dom.isPrimary && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200 flex items-center gap-0.5">
                      <Star size={10} fill="currentColor" />
                      Primary Domain
                    </span>
                  )}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {dom.type === 'apex' ? 'Apex (A)' : 'CNAME'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  {dom.status === 'active' ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={13} />
                      DNS Verified &bull; SSL Active
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1 font-medium">
                      <AlertTriangle size={13} />
                      DNS Verification Required
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedDomainForInstructions(dom)}
                    className="text-amber-600 hover:underline font-medium text-xs"
                  >
                    View DNS Instructions
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => handleVerify(dom)}
                  disabled={verifyingId === dom.id}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} className={verifyingId === dom.id ? 'animate-spin' : ''} />
                  <span>Verify DNS</span>
                </button>

                {!dom.isPrimary && dom.status === 'active' && (
                  <button
                    onClick={() => handleSetPrimary(dom)}
                    className="px-3 py-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium rounded-lg transition-colors"
                  >
                    Make Primary
                  </button>
                )}

                <button
                  onClick={() => handleDelete(dom)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove Domain"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {domains.length === 0 && !isAdding && (
            <div className="text-center py-6 text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
              No custom domains configured yet. Click <strong>Connect Domain</strong> above to link your own web address.
            </div>
          )}
        </div>
      </div>

      {/* DNS Instructions Modal */}
      {selectedDomainForInstructions && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-bold text-amber-950">
                DNS Configuration for {selectedDomainForInstructions.domain}
              </h4>
            </div>
            <button
              onClick={() => setSelectedDomainForInstructions(null)}
              className="text-xs font-semibold text-amber-800 hover:underline"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.) and add the following DNS record:
          </p>

          <div className="bg-white border border-amber-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-amber-100/60 border-b border-amber-200 font-semibold text-amber-950">
                <tr>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Host / Name</th>
                  <th className="py-2 px-3">Target / Value</th>
                  <th className="py-2 px-3">TTL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-mono text-gray-800">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-700">
                    {selectedDomainForInstructions.type === 'apex' ? 'A' : 'CNAME'}
                  </td>
                  <td className="py-2.5 px-3">
                    {selectedDomainForInstructions.type === 'apex' ? '@' : selectedDomainForInstructions.domain.split('.')[0]}
                  </td>
                  <td className="py-2.5 px-3 flex items-center justify-between">
                    <span>{selectedDomainForInstructions.dnsTarget}</span>
                    <button
                      onClick={() => copyToClipboard(selectedDomainForInstructions.dnsTarget)}
                      className="text-gray-400 hover:text-gray-700 ml-2"
                    >
                      <Copy size={12} />
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">Auto / 3600</td>
                </tr>
                {selectedDomainForInstructions.verificationToken && (
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-amber-700">TXT</td>
                    <td className="py-2.5 px-3">_eata-verify</td>
                    <td className="py-2.5 px-3 flex items-center justify-between">
                      <span className="truncate max-w-[220px]">{selectedDomainForInstructions.verificationToken}</span>
                      <button
                        onClick={() => copyToClipboard(selectedDomainForInstructions.verificationToken)}
                        className="text-gray-400 hover:text-gray-700 ml-2"
                      >
                        <Copy size={12} />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">Auto</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-amber-800">
              Note: DNS propagation typically takes between 2 to 30 minutes.
            </span>
            <button
              onClick={() => handleVerify(selectedDomainForInstructions)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Verify Records Now</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
