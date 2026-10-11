import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { isUserSuperAdmin } from '../../lib/permissions';
import { SuperAdminAccessDenied } from './SuperAdminAccessDenied';
import { 
  LayoutDashboard, 
  Store, 
  Globe, 
  CreditCard, 
  ToggleLeft, 
  FileText, 
  Settings, 
  ShieldCheck, 
  Search, 
  Bell, 
  ExternalLink, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { APP_CONFIG } from '../../data/appConfig';
import { toast } from 'react-hot-toast';

export const SuperAdminLayout: React.FC = () => {
  const { user, logout, isSuperAdmin } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Toast notification for the logged in super admin
  useEffect(() => {
    if (user && (isSuperAdmin || isUserSuperAdmin(user))) {
      const shownKey = `sa_welcome_shown_${user.id || user.email}`;
      if (!sessionStorage.getItem(shownKey)) {
        sessionStorage.setItem(shownKey, 'true');
        const adminName = user.name || user.email?.split('@')[0] || 'Super Admin';
        toast.success(
          `Welcome back, ${adminName}! You are logged in as ${adminName}.`,
          { id: 'sa-welcome-toast', icon: '👤', duration: 4500 }
        );
      }
    }
  }, [user, isSuperAdmin]);

  // Strict Super Admin Access Guard: Tenant accounts and unauthorized users cannot view this layout
  if (!isSuperAdmin && !isUserSuperAdmin(user) && !isUserSuperAdmin(user?.email)) {
    return <SuperAdminAccessDenied userEmail={user?.email} />;
  }

  const handleConfirmLeave = async () => {
    setIsLeaving(true);
    try {
      if (user?.email) {
        sessionStorage.removeItem(`sa_welcome_shown_${user.id || user.email}`);
      }
      await logout();
      setShowLeaveModal(false);
      toast.success('You have safely left the Super Admin section.', { id: 'sa-logout-success' });
      navigate('/app/super-admin');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const navItems = [
    { label: 'Overview', to: '/app/super-admin', icon: LayoutDashboard, end: true },
    { label: 'Restaurants', to: '/app/super-admin/restaurants', icon: Store },
    { label: 'Custom Domains', to: '/app/super-admin/domains', icon: Globe },
    { label: 'Plans & Billing', to: '/app/super-admin/plans', icon: CreditCard },
    { label: 'Feature Flags', to: '/app/super-admin/features', icon: ToggleLeft },
    { label: 'Super Admins', to: '/app/super-admin/admins', icon: ShieldCheck },
    { label: 'Marketing Website', to: '/app/super-admin/marketing', icon: Sparkles },
    { label: 'System Logs', to: '/app/super-admin/logs', icon: FileText },
    { label: 'Platform Settings', to: '/app/super-admin/settings', icon: Settings },
  ];

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/super-admin/restaurants?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-lg flex items-center justify-center text-slate-950 font-bold text-lg shadow">
              {APP_CONFIG.appName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-white tracking-tight text-base">
                <span>{APP_CONFIG.appName}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5">Multi-Tenant Platform Control</p>
            </div>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={handleGlobalSearch} className="hidden md:flex items-center relative max-w-md w-full mx-8">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search restaurants, owners, slugs, domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />
        </form>

        {/* User / Actions */}
        <div className="flex items-center gap-3">
          <a
            href={tenant?.slug ? `/r/${tenant.slug}` : '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900"
          >
            <span>{tenant?.name ? `View ${tenant.name}` : 'Platform Website'}</span>
            <ExternalLink size={12} />
          </a>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold flex items-center justify-center text-xs">
              SA
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-white leading-tight">
                {user?.name || 'Super Admin'}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                {user?.email || APP_CONFIG.email}
              </div>
            </div>

            {/* Quick Leave Section button in Top Bar */}
            <button
              onClick={() => setShowLeaveModal(true)}
              title="Exit Super Admin section"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/30 cursor-pointer ml-1"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline font-medium">Exit Section</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 bg-slate-950 border-r border-slate-800 pt-16 md:pt-0 transform md:transform-none transition-transform duration-200 ease-in-out md:static md:flex md:flex-col md:justify-between",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
              Platform Administration
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                      isActive
                        ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Bottom Sidebar Info */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="font-medium text-slate-300">Platform Status</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-400">All SaaS multi-tenant services operational.</p>
            </div>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/30 cursor-pointer font-medium"
            >
              <LogOut size={14} />
              <span>Exit Super Admin Section</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Confirmation Modal: Exit Section */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-left"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button top right */}
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Icon & Title */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Exit Super Admin Section?
                </h3>
                <p className="text-xs text-slate-400">
                  Confirmation required to close section
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-300 leading-relaxed">
                Are you sure you want to leave the Super Admin section? Your administrative session will be safely ended.
              </p>

              {/* Current user badge */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-400">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">
                  SA
                </div>
                <div className="truncate">
                  <span className="text-white font-medium block truncate">
                    {user?.name || 'Super Admin'}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] truncate block">
                    {user?.email || APP_CONFIG.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isLeaving}
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel / Stay in Section
              </button>

              <button
                type="button"
                disabled={isLeaving}
                onClick={handleConfirmLeave}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLeaving ? (
                  <>
                    <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Closing Section...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={14} />
                    <span>Yes, Close Section</span>
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
