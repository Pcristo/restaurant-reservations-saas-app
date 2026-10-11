import React from 'react';
import { useTenant } from '../hooks/useTenant';
import { ShieldAlert, LogOut, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, tenant, exitImpersonation } = useTenant();
  const navigate = useNavigate();

  if (!isImpersonating || !tenant) return null;

  return (
    <div 
      id="superadmin-impersonation-banner"
      className="bg-amber-600 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between shadow-md relative z-50 animate-in fade-in slide-in-from-top duration-200"
    >
      <div className="flex items-center gap-2.5 max-w-4xl truncate">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-200" />
        <span className="truncate">
          Super Admin Mode: You are managing <strong>{tenant.name}</strong> ({tenant.slug})
        </span>
        <span className="hidden sm:inline-block px-2 py-0.5 text-xs bg-amber-700/60 rounded font-mono">
          Tenant ID: {tenant.id}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <button
          id="btn-impersonation-super-admin"
          onClick={() => navigate('/app/super-admin')}
          className="px-2.5 py-1 text-xs bg-amber-700 hover:bg-amber-800 rounded transition-colors flex items-center gap-1.5"
        >
          Super Admin Panel
        </button>
        <button
          id="btn-impersonation-exit"
          onClick={() => {
            exitImpersonation();
            navigate('/app/super-admin');
          }}
          className="px-3 py-1 text-xs bg-white text-amber-800 hover:bg-amber-50 font-semibold rounded transition-colors flex items-center gap-1 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit Impersonation
        </button>
      </div>
    </div>
  );
};
