import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { isUserSuperAdmin } from '../lib/permissions';
import { 
  Restaurant, 
  DomainRecord, 
  Plan, 
  PlanEntitlements, 
  RestaurantBranding, 
  RestaurantSEO, 
  RestaurantSettings 
} from '../types';
import { 
  getRestaurant, 
  getRestaurantBySlug, 
  getRestaurantByDomain, 
  listRestaurantDomains, 
  listAllRestaurants,
  updateRestaurant, 
  ensureDefaultRestaurant, 
  DEFAULT_RESTAURANT_ID,
  logAuditAction
} from '../services/tenantService';
import { DEFAULT_PLANS } from '../data/plans';
import { APP_CONFIG } from '../data/appConfig';
import { useAuth } from './useAuth';
import { updateFavicon, isPlatformHost, isTenantSubdomain } from '../lib/utils';

export interface TenantContextType {
  tenant: Restaurant | null;
  restaurantId: string;
  targetRestaurantId: string;
  slug: string;
  name: string;
  domains: DomainRecord[];
  plan: Plan;
  entitlements: PlanEntitlements;
  isSuspended: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  impersonatedRestaurantId: string | null;
  impersonateRestaurant: (restaurantId: string) => Promise<void>;
  exitImpersonation: () => void;
  switchRestaurant: (restaurantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  updateBranding: (branding: Partial<RestaurantBranding>) => Promise<void>;
  updateSEO: (seo: Partial<RestaurantSEO>) => Promise<void>;
  updateSettings: (settings: Partial<RestaurantSettings>) => Promise<void>;
  updateProfile: (profile: Partial<Restaurant>) => Promise<void>;
  availableRestaurants: Restaurant[];
  loading: boolean;
  domainError: boolean;
  tenantError: boolean;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);

const IMPERSONATION_KEY = 'eata_impersonated_tenant_id';
const ACTIVE_RESTAURANT_KEY = 'eata_active_restaurant_id';

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isSuperAdmin = useMemo(() => {
    return isUserSuperAdmin(user);
  }, [user]);

  const [tenant, setTenant] = useState<Restaurant | null>(null);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [availableRestaurants, setAvailableRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainError, setDomainError] = useState(false);
  const [impersonatedRestaurantId, setImpersonatedRestaurantId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(IMPERSONATION_KEY);
    } catch {
      return null;
    }
  });

  // Determine current active restaurant ID from multiple sources
  const resolveTargetRestaurant = useCallback(async (): Promise<{ restaurant: Restaurant | null; isDomainError: boolean }> => {
    if (typeof window === 'undefined') {
      return { restaurant: null, isDomainError: false };
    }

    const host = window.location.hostname.toLowerCase();
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const queryRestaurant = searchParams.get('restaurant');

    // 1. Explicit path prefix /r/:slug (e.g. /r/bela-italia, /r/bela-italia/admin, /r/bela-italia/staff)
    // ALWAYS takes absolute priority when visiting a restaurant-specific URL!
    const matchSlug = pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
    if (matchSlug && matchSlug[1]) {
      const rawSlug = matchSlug[1].toLowerCase();
      const cleanSlug = rawSlug === 'bella-italia' ? 'bela-italia' : rawSlug;
      const bySlug = await getRestaurantBySlug(cleanSlug);
      if (bySlug) return { restaurant: bySlug, isDomainError: false };
      const byId = await getRestaurant(cleanSlug);
      if (byId) return { restaurant: byId, isDomainError: false };
      return { restaurant: null, isDomainError: false };
    }

    // 1b. Query param ?restaurant=slug (e.g. ?restaurant=bela-italia)
    if (queryRestaurant) {
      const cleanSlug = queryRestaurant.toLowerCase() === 'bella-italia' ? 'bela-italia' : queryRestaurant.toLowerCase();
      const bySlug = await getRestaurantBySlug(cleanSlug);
      if (bySlug) return { restaurant: bySlug, isDomainError: false };
      const byId = await getRestaurant(cleanSlug);
      if (byId) return { restaurant: byId, isDomainError: false };
    }

    // 2. Platform host vs tenant subdomain vs external custom domain check
    const isPlatform = isPlatformHost(host);
    const isSubdomain = isTenantSubdomain(host);

    if (isSubdomain) {
      // Subdomain on a platform base domain: e.g. bela-italia.dinemasterpro.com
      const parts = host.split('.');
      const subdomain = parts[0];
      const bySubdomain = await getRestaurantBySlug(subdomain);
      if (bySubdomain) return { restaurant: bySubdomain, isDomainError: false };
      return { restaurant: null, isDomainError: true };
    }

    if (!isPlatform) {
      // External Custom domain pointed to SaaS: e.g. www.bella-italia.com or myrestaurant.com
      const byDomain = await getRestaurantByDomain(host);
      if (byDomain) return { restaurant: byDomain, isDomainError: false };
      // Only unregistered external custom domains trigger domain configuration error
      return { restaurant: null, isDomainError: true };
    }

    // 3. Management Route (/admin or /staff) without /r/:slug in path
    const isStaffOrAdmin = user && user.role && user.role !== 'customer';
    const isManagementRoute = pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/dashboard');

    if (isManagementRoute) {
      // 3a. Super Admin impersonation or query param
      if (isSuperAdmin) {
        const impersonated = sessionStorage.getItem(IMPERSONATION_KEY);
        if (impersonated) {
          const impRest = await getRestaurant(impersonated);
          if (impRest) return { restaurant: impRest, isDomainError: false };
        }
        if (queryRestaurant) {
          const byQuery = (await getRestaurantBySlug(queryRestaurant)) || (await getRestaurant(queryRestaurant));
          if (byQuery) return { restaurant: byQuery, isDomainError: false };
        }
      }

      // 3b. Authenticated restaurant administrator/staff bound to user.restaurantId
      const targetId = user?.restaurantId || (user?.restaurantIds && user.restaurantIds[0]);
      if (isStaffOrAdmin && targetId) {
        const userRest = (await getRestaurant(targetId)) || (await getRestaurantBySlug(targetId));
        if (userRest) return { restaurant: userRest, isDomainError: false };
      }

      // 3c. Stored active restaurant in localStorage for authenticated management
      const storedId = localStorage.getItem(ACTIVE_RESTAURANT_KEY);
      if (storedId) {
        const storedRest = await getRestaurant(storedId);
        if (storedRest) return { restaurant: storedRest, isDomainError: false };
      }
    }

    // 4. DineMaster Pro Marketing & Platform Context
    // On all platform routes (/, /login, /register, /about, /pricing, /contact, /404, etc.):
    // NO restaurant context is loaded. Strictly restaurant-neutral!
    return { restaurant: null, isDomainError: false };
  }, [isSuperAdmin, user, location.pathname, location.search]);

  const loadTenantData = useCallback(async () => {
    setLoading(true);
    try {
      const { restaurant, isDomainError } = await resolveTargetRestaurant();
      setDomainError(isDomainError);
      
      if (restaurant) {
        // TENANT SESSION ISOLATION CHECK:
        // A restaurant admin/staff session is tied to the specific restaurant/tenant.
        // Switching to another restaurant does NOT keep the existing authenticated session.
        // Only a super-admin should be able to move between/access different restaurants.
        if (user && !isSuperAdmin) {
          const userRest = (user.restaurantId || (user.restaurantIds && user.restaurantIds[0]) || '').toLowerCase();
          const normalizedUserRest = userRest === 'bella-italia' ? 'bela-italia' : userRest;
          const userRestIds = (user.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());
          const restId = (restaurant.id || '').toLowerCase();
          const restSlug = (restaurant.slug || '').toLowerCase();
          const normalizedRestSlug = restSlug === 'bella-italia' ? 'bela-italia' : restSlug;
          const isStaffOrAdminUser = user.role !== 'customer' || Boolean(userRest);
          
          if (isStaffOrAdminUser && userRest) {
            const isMatch = 
              normalizedUserRest === restId || 
              normalizedUserRest === normalizedRestSlug || 
              userRestIds.includes(restId) || 
              userRestIds.includes(normalizedRestSlug);

            if (!isMatch) {
              // User from another restaurant switched to this restaurant!
              // Terminate existing session so the previous restaurant's session is not retained.
              console.warn(`[useTenant] Tenant mismatch: user belongs to ${userRest} but switched to ${restaurant.slug}. Terminating session.`);
              await logout(true);
              sessionStorage.removeItem(ACTIVE_RESTAURANT_KEY);
              localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
              try {
                localStorage.removeItem('cached_user_profile');
              } catch {}
            }
          }
        }

        setTenant(restaurant);
        const domList = await listRestaurantDomains(restaurant.id);
        setDomains(domList);
      } else {
        setTenant(null);
        setDomains([]);
      }
      
      // If Super Admin, load all restaurants for switcher
      if (isSuperAdmin) {
        const all = await listAllRestaurants();
        setAvailableRestaurants(all);
      }
    } catch (err) {
      console.error('[useTenant] Error resolving tenant:', err);
    } finally {
      setLoading(false);
    }
  }, [resolveTargetRestaurant, isSuperAdmin, user, logout]);

  // Immediate synchronous route listener for restaurant session isolation
  useEffect(() => {
    if (user && !isSuperAdmin) {
      const match = location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const rawSlug = match[1].toLowerCase();
        const currentTargetSlug = rawSlug === 'bella-italia' ? 'bela-italia' : rawSlug;
        const userRest = (user.restaurantId || (user.restaurantIds && user.restaurantIds[0]) || '').toLowerCase();
        const normalizedUserRest = userRest === 'bella-italia' ? 'bela-italia' : userRest;
        const userRestIds = (user.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());
        const isStaffOrAdminUser = user.role !== 'customer' || Boolean(userRest);

        if (isStaffOrAdminUser && userRest) {
          const isMatch = normalizedUserRest === currentTargetSlug || userRestIds.includes(currentTargetSlug);
          if (!isMatch) {
            console.warn(`[useTenant] Immediate route mismatch: user is from ${userRest} but visited ${currentTargetSlug}. Terminating session.`);
            logout(true);
            try {
              sessionStorage.removeItem(ACTIVE_RESTAURANT_KEY);
              localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
              localStorage.removeItem('cached_user_profile');
            } catch {}
          }
        }
      }
    }
  }, [location.pathname, user, isSuperAdmin, logout]);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData, location.pathname, location.search]);

  // Apply theme & favicon dynamically when tenant changes
  useEffect(() => {
    if (!tenant) return;

    // Apply primary color CSS variable
    const primaryColor = tenant.branding?.primaryColor || '#f59e0b';
    document.documentElement.style.setProperty('--tenant-primary', primaryColor);

    // Apply favicon
    const fav = tenant.branding?.faviconUrl || tenant.branding?.logoUrl || '/favicon.svg';
    updateFavicon(fav, { name: tenant.name, primaryColor });
  }, [tenant]);

  const plan = useMemo(() => {
    if (!tenant) return DEFAULT_PLANS[0];
    return DEFAULT_PLANS.find(p => p.id === tenant.planId) || DEFAULT_PLANS[1];
  }, [tenant]);

  const isSuspended = useMemo(() => {
    return tenant?.status === 'suspended' || tenant?.status === 'cancelled';
  }, [tenant]);

  const isImpersonating = !!impersonatedRestaurantId && isSuperAdmin;

  const impersonateRestaurant = useCallback(async (targetRestaurantId: string) => {
    if (!isSuperAdmin) return;
    const target = await getRestaurant(targetRestaurantId);
    if (!target) return;

    sessionStorage.setItem(IMPERSONATION_KEY, targetRestaurantId);
    setImpersonatedRestaurantId(targetRestaurantId);
    setTenant(target);
    const domList = await listRestaurantDomains(target.id);
    setDomains(domList);

    await logAuditAction({
      restaurantId: targetRestaurantId,
      restaurantName: target.name,
      userId: user?.id || 'super_admin',
      userName: user?.name || 'Super Admin',
      userEmail: user?.email || '',
      action: 'superadmin.impersonate_start',
      resource: `restaurants/${targetRestaurantId}`,
      details: { impersonatedAt: new Date().toISOString() },
      result: 'success',
    });
  }, [isSuperAdmin, user]);

  const exitImpersonation = useCallback(() => {
    const currentImpId = impersonatedRestaurantId;
    sessionStorage.removeItem(IMPERSONATION_KEY);
    setImpersonatedRestaurantId(null);

    if (currentImpId) {
      logAuditAction({
        restaurantId: currentImpId,
        userId: user?.id || 'super_admin',
        userName: user?.name || 'Super Admin',
        userEmail: user?.email || '',
        action: 'superadmin.impersonate_end',
        resource: `restaurants/${currentImpId}`,
        result: 'success',
      });
    }

    loadTenantData();
  }, [impersonatedRestaurantId, user, loadTenantData]);

  const switchRestaurant = useCallback(async (newRestaurantId: string) => {
    if (!isSuperAdmin) {
      console.warn('[useTenant] Unauthorized attempt to switch restaurant tenant blocked');
      return;
    }
    // Clear tenant-specific caches
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cached_restaurant_settings_') || key.startsWith('cached_tables_') || key.startsWith('cached_areas_') || key.startsWith('eata_')) {
          localStorage.removeItem(key);
        }
      });
    }
    localStorage.setItem(ACTIVE_RESTAURANT_KEY, newRestaurantId);
    const newRest = await getRestaurant(newRestaurantId);
    if (newRest) {
      setTenant(newRest);
      const domList = await listRestaurantDomains(newRest.id);
      setDomains(domList);
    }
  }, [isSuperAdmin]);

  const updateBranding = useCallback(async (branding: Partial<RestaurantBranding>) => {
    if (!tenant) return;
    const newBranding = { ...tenant.branding, ...branding };
    await updateRestaurant(tenant.id, { branding: newBranding }, user);
    setTenant(prev => prev ? { ...prev, branding: newBranding } : null);
  }, [tenant, user]);

  const updateSEO = useCallback(async (seo: Partial<RestaurantSEO>) => {
    if (!tenant) return;
    const newSeo = { ...tenant.seo, ...seo };
    await updateRestaurant(tenant.id, { seo: newSeo }, user);
    setTenant(prev => prev ? { ...prev, seo: newSeo } : null);
  }, [tenant, user]);

  const updateSettings = useCallback(async (settings: Partial<RestaurantSettings>) => {
    if (!tenant) return;
    const newSettings = { ...tenant.settings, ...settings };
    await updateRestaurant(tenant.id, { settings: newSettings }, user);
    setTenant(prev => prev ? { ...prev, settings: newSettings } : null);
  }, [tenant, user]);

  const updateProfile = useCallback(async (profile: Partial<Restaurant>) => {
    if (!tenant) return;
    await updateRestaurant(tenant.id, profile, user);
    setTenant(prev => prev ? { ...prev, ...profile } : null);
  }, [tenant, user]);

  const refreshTenant = useCallback(async () => {
    await loadTenantData();
  }, [loadTenantData]);

  const effectiveRestaurantId = (!isSuperAdmin && user?.restaurantId) ? user.restaurantId : (tenant?.id || '');

  return (
    <TenantContext.Provider value={{
      tenant,
      restaurantId: effectiveRestaurantId,
      targetRestaurantId: effectiveRestaurantId,
      slug: tenant?.slug || '',
      name: tenant?.name || APP_CONFIG.appName,
      domains,
      plan,
      entitlements: plan.entitlements,
      isSuspended,
      isSuperAdmin,
      isImpersonating,
      impersonatedRestaurantId,
      impersonateRestaurant,
      exitImpersonation,
      switchRestaurant,
      refreshTenant,
      updateBranding,
      updateSEO,
      updateSettings,
      updateProfile,
      availableRestaurants,
      loading,
      domainError,
      tenantError: domainError,
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export function useTenantSafe(): TenantContextType | null {
  return useContext(TenantContext) || null;
}
