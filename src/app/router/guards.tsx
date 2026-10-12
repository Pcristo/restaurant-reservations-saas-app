import React from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useTenant } from '../../hooks/useTenant';
import { isUserSuperAdmin } from '../../lib/permissions';
import { SuperAdminLogin } from '../../pages/superadmin/SuperAdminLogin';
import { SuperAdminAccessDenied } from '../../pages/superadmin/SuperAdminAccessDenied';
import toast from 'react-hot-toast';

export function ProtectedRoute({ 
  children, 
  role 
}: { 
  children: React.ReactNode; 
  role?: 'admin' | 'staff' | 'customer';
}) {
  const { user, loading, isAdmin, isStaff, isCustomer, isSuperAdmin, logout } = useAuth();
  const { tenant } = useTenant();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { language } = useLanguage();
  const isSuper = isSuperAdmin || isUserSuperAdmin(user);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-12">
        <div className="animate-spin w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full mb-2" />
      </div>
    );
  }

  if (!user) {
    const isStaffRoute = location.pathname.includes('/admin') || location.pathname.includes('/staff');
    const targetSlug = slug || tenant?.slug || 'bela-italia';
    const dest = isStaffRoute 
      ? `/r/${targetSlug}/login?role=admin&returnUrl=${encodeURIComponent(location.pathname + location.search)}`
      : `/r/${targetSlug}/login?role=customer`;
    return <Navigate to={dest} state={{ from: location }} replace />;
  }
  
  if (isSuper) {
    return <>{children}</>;
  }

  // Cross-tenant guard for restaurant admin/staff routes
  const targetRestaurantSlug = (slug || tenant?.slug || '').toLowerCase();
  const normalizedTargetSlug = targetRestaurantSlug === 'bella-italia' ? 'bela-italia' : targetRestaurantSlug;

  if (role !== 'customer') {
    const userRest = (user.restaurantId || (user.restaurantIds && user.restaurantIds[0]) || '').toLowerCase();
    const normalizedUserRest = userRest === 'bella-italia' ? 'bela-italia' : userRest;
    const userRestIds = (user.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());
    const restId = (tenant?.id || '').toLowerCase();
    const restSlug = (tenant?.slug || '').toLowerCase();
    const normalizedTenantSlug = restSlug === 'bella-italia' ? 'bela-italia' : restSlug;

    const isMatch = Boolean(
      normalizedUserRest && normalizedTargetSlug && (
        normalizedUserRest === normalizedTargetSlug ||
        normalizedUserRest === restId ||
        normalizedUserRest === normalizedTenantSlug ||
        userRestIds.includes(normalizedTargetSlug) ||
        (tenant && (userRestIds.includes(restId) || userRestIds.includes(normalizedTenantSlug)))
      )
    );

    if (!isMatch) {
      logout(true);
      setTimeout(() => {
        toast.error(
          language === 'pt'
            ? 'Acesso negado: Só tem permissão para aceder à gestão do seu próprio restaurante. Inicie sessão com credenciais válidas.'
            : 'Access Denied: You can only access your own restaurant management system. Please sign in with valid credentials.',
          { id: 'cross-tenant-blocked' }
        );
      }, 50);
      const destSlug = normalizedTargetSlug || 'bela-italia';
      return <Navigate to={`/r/${destSlug}/login?role=admin`} replace />;
    }
  }

  if (role === 'admin' && !isAdmin) {
    const targetSlug = slug || tenant?.slug || 'bela-italia';
    const dest = `/r/${targetSlug}/staff`;
    return <Navigate to={dest} replace />;
  }

  if (role === 'staff' && !isStaff) {
    setTimeout(() => {
      toast.error(language === 'pt' ? 'O acesso à área de Administração é restrito.' : 'Access to the Admin area is restricted.', { id: 'admin-restricted' });
    }, 100);
    const dest = slug ? `/r/${slug}` : '/';
    return <Navigate to={dest} replace />;
  }

  if (role === 'customer' && !isCustomer && !isStaff) {
    const dest = slug ? `/r/${slug}` : '/';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20 mb-4 animate-pulse">
          D
        </div>
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full" />
          <span>Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SuperAdminLogin />;
  }

  if (!isSuperAdmin && !isUserSuperAdmin(user) && !isUserSuperAdmin(user.email)) {
    return <SuperAdminAccessDenied userEmail={user.email} />;
  }

  return <>{children}</>;
}

export function LegacyAdminRedirect() {
  const { user, isSuperAdmin } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const queryRest = searchParams.get('restaurant');
  const targetSlug = queryRest || user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]) || tenant?.slug || 'bela-italia';

  if (!user) {
    return <Navigate to={`/r/${targetSlug}/login?role=admin`} state={{ from: location }} replace />;
  }

  const cleanPath = location.pathname.replace(/^\/admin\/?/, '');
  const searchStr = location.search;

  const isStaffOnly = (user.role === 'staff' || user.role === 'restaurant_staff') && !isSuperAdmin;
  const adminBase = isStaffOnly ? `/r/${targetSlug}/staff` : `/r/${targetSlug}/admin`;

  const dest = cleanPath 
    ? `${adminBase}/${cleanPath}${searchStr}`
    : `${adminBase}${searchStr}`;

  return <Navigate to={dest} replace />;
}

export function RestaurantStaffRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const cleanPath = location.pathname.replace(new RegExp(`^/r/${slug}/staff/?`), '');
  const target = cleanPath ? `/r/${slug}/admin/${cleanPath}${location.search}` : `/r/${slug}/admin${location.search}`;
  return <Navigate to={target} replace />;
}
