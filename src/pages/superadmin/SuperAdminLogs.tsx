import React, { useState, useEffect } from 'react';
import { listAuditLogs } from '../../services/tenantService';
import { AuditLogEntry } from '../../types';
import { Search, FileText, Filter, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

export const SuperAdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await listAuditLogs({ limit: 100 });
      setLogs(data);
    } catch {
      toast.error('Failed loading audit logs.');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(l => {
    const q = (searchQuery || '').toLowerCase();
    return (
      ((l.action || '').toLowerCase().includes(q)) ||
      ((l.resource || '').toLowerCase().includes(q)) ||
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(q)) ||
      (l.restaurantName && l.restaurantName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Audit Logs</h1>
          <p className="text-sm text-slate-400">
            Immutable audit record of administrative, tenant, domain, and reservation operations.
          </p>
        </div>

        <button
          onClick={() => loadLogs()}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search action, user, restaurant, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {log.timestamp ? format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-sans">
                    <div className="font-medium">{log.userName || log.userEmail || 'System'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{log.userEmail}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans">
                    {log.restaurantName || log.restaurantId || 'Platform'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 truncate max-w-[200px]">
                    {log.resource}
                  </td>
                  <td className="py-3 px-4">
                    {log.result === 'success' ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-sans text-[11px]">
                        <CheckCircle2 size={12} />
                        Success
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 font-sans text-[11px]">
                        <AlertCircle size={12} />
                        Failure
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    No log records match your filter.
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
