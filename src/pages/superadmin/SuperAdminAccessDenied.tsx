import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG } from '../../data/appConfig';
import { ShieldAlert, LogOut, ArrowLeft, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuperAdminAccessDeniedProps {
  userEmail?: string | null;
}

export const SuperAdminAccessDenied: React.FC<SuperAdminAccessDeniedProps> = ({ userEmail }) => {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();

  const isTenantUser = !!user?.restaurantId || (isAdmin && !user?.role?.includes('super'));

  const handleSignOut = async () => {
    try {
      await logout();
      // On logout, auth updates and SuperAdminRoute switches back to SuperAdminLogin
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Background Subtle Red/Amber Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-3xl -mt-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-500/5">
            <ShieldAlert size={32} />
          </div>

          {/* Badge */}
          <span className="inline-block text-[11px] font-mono uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-3">
            {isTenantUser ? 'Restaurant Tenant Account' : 'Access Restricted'}
          </span>

          {/* Heading */}
          <h1 className="text-xl font-bold text-white mb-2 tracking-tight">
            {isTenantUser ? 'Super Admin Access Restricted' : 'Access Denied'}
          </h1>

          {/* Message */}
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {isTenantUser ? (
              <>
                Your account is associated with a <strong>restaurant tenant</strong>.
                Restaurant accounts are strictly isolated and do not have access to the platform Super Admin area.
              </>
            ) : (
              <>
                You do not have permission to access the Super Admin area.
                Only administrators added through the Super Admin panel can log in here.
              </>
            )}
          </p>

          {/* Current Account Card */}
          {userEmail && (
            <div className="mb-6 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-400">
              <span className="text-slate-500 block mb-0.5">Signed in as</span>
              <span className="text-white font-mono font-medium break-all">{userEmail}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {isTenantUser ? (
              <>
                <button
                  onClick={() => {
                    const targetSlug = user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]);
                    navigate(targetSlug ? `/r/${targetSlug}/admin` : '/login');
                  }}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Store size={16} />
                  <span>Go to Your Restaurant Portal</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Sign Out & Switch Account</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Sign Out & Switch Account</span>
                </button>
              </>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Return to {APP_CONFIG.appName} Home</span>
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          Strict tenant isolation is active. All platform actions are audited.
        </div>
      </div>
    </div>
  );
};
