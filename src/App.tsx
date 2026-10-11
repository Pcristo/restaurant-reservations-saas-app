import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';
import { NotificationProvider } from './hooks/useNotifications';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt';
import 'dayjs/locale/en';
import { useSettings } from './hooks/useSettings';
import Layout from './components/Layout';
import PublicBooking from './pages/PublicBooking';
import PublicCancel from './pages/PublicCancel';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import AdminTables from './pages/AdminTables';
import AdminReservations from './pages/AdminReservations';
import AdminPrintSection from './pages/AdminPrintSection';
import AdminCustomers from './pages/AdminCustomers';
import AdminUsers from './pages/AdminUsers';
import AdminLiveView from './pages/AdminLiveView';
import AdminInsights from './pages/AdminInsights';
import AdminCustomerStats from './pages/AdminCustomerStats';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import CookiePolicy from './pages/CookiePolicy';
import Maintenance from './pages/Maintenance';
import DevelopingApp from './pages/DevelopingApp';
import Instructions from './pages/Instructions';
import NotFound from './pages/NotFound';
import { TenantProvider, useTenant } from './hooks/useTenant';
import { isUserSuperAdmin } from './lib/permissions';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { DomainErrorPage } from './pages/DomainErrorPage';
import { SuspendedRestaurantPage } from './pages/SuspendedRestaurantPage';
import { SuperAdminLayout } from './pages/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { SuperAdminRestaurants } from './pages/superadmin/SuperAdminRestaurants';
import { SuperAdminDomains } from './pages/superadmin/SuperAdminDomains';
import { SuperAdminPlans } from './pages/superadmin/SuperAdminPlans';
import { SuperAdminFeatureFlags } from './pages/superadmin/SuperAdminFeatureFlags';
import { SuperAdminLogs } from './pages/superadmin/SuperAdminLogs';
import { SuperAdminSettings as SuperAdminSettingsPage } from './pages/superadmin/SuperAdminSettings';
import { SuperAdminMarketing } from './pages/superadmin/SuperAdminMarketing';
import { SuperAdminAdmins } from './pages/superadmin/SuperAdminAdmins';
import { SuperAdminLogin } from './pages/superadmin/SuperAdminLogin';
import { SuperAdminAccessDenied } from './pages/superadmin/SuperAdminAccessDenied';
import MarketingLandingPage from './pages/MarketingLandingPage';
import { getMarketingWebsiteSettings, DEFAULT_MARKETING_SETTINGS } from './services/marketingWebsiteService';
import { MarketingWebsiteSettings } from './types';

import toast, { Toaster, ToastBar, useToasterStore } from 'react-hot-toast';
import { X } from 'lucide-react';
import ScrollToTop from './components/ScrollToTop';
import { FreezeOverlay } from './components/FreezeOverlay';
import CookieConsent from './components/CookieConsent';
import { BookingNotificationListener } from './components/BookingNotificationListener';
import Preloader from './components/Preloader';
import { SyncIndicator } from './components/SyncIndicator';
import { updateFavicon } from './lib/utils';
import { APP_CONFIG } from './data/appConfig';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'staff' | 'customer' }) {
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
  // Emails associated with restaurant tenants must strictly and only access their own restaurant
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

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
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

  // Not authenticated -> Render dedicated Super Admin Login directly at /app/super-admin
  if (!user) {
    return <SuperAdminLogin />;
  }

  // Authenticated but not a Super Admin (e.g. restaurant tenant or customer) -> Render Access Denied directly at /app/super-admin
  if (!isSuperAdmin && !isUserSuperAdmin(user) && !isUserSuperAdmin(user.email)) {
    return <SuperAdminAccessDenied userEmail={user.email} />;
  }

  // Authenticated and Super Admin -> Render Super Admin application
  return <>{children}</>;
}

function LegacyAdminRedirect() {
  const { user, isSuperAdmin } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Resolve target restaurant slug
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

function RestaurantStaffRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const cleanPath = location.pathname.replace(new RegExp(`^/r/${slug}/staff/?`), '');
  const target = cleanPath ? `/r/${slug}/admin/${cleanPath}${location.search}` : `/r/${slug}/admin${location.search}`;
  return <Navigate to={target} replace />;
}


const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSettings();
  const transitionsEnabled = settings?.enablePageTransitions !== false;

  if (!transitionsEnabled) {
    return <div className="w-full h-full min-h-screen">{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full min-h-screen"
    >
      {children}
    </motion.div>
  );
};

function AppContent() {
  const { user, loading: authLoading, isAdmin, isStaff } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { tenant, tenantError } = useTenant();
  const [showPreloader, setShowPreloader] = React.useState(true);
  const [developingUnlocked, setDevelopingUnlocked] = React.useState(() => sessionStorage.getItem('app_developing_unlocked') === 'true');
  const location = useLocation();
  const { language } = useLanguage();

  const [marketingSettings, setMarketingSettings] = React.useState<MarketingWebsiteSettings>(() => {
    try {
      const cached = localStorage.getItem('dinemaster_marketing_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_MARKETING_SETTINGS;
  });

  useEffect(() => {
    getMarketingWebsiteSettings().then(setMarketingSettings);
  }, [location.pathname]);

  const prevEnabledRef = React.useRef<boolean | undefined>(undefined);
  const prevPasswordRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    if (settings) {
      if (!settings.developingModeEnabled) {
        sessionStorage.removeItem('app_developing_unlocked');
        setDevelopingUnlocked(false);
      } else {
        // If developing mode was just enabled, or if the password has changed, relock the app
        if (
          prevEnabledRef.current === false ||
          (prevPasswordRef.current !== undefined && settings.developingPassword !== prevPasswordRef.current)
        ) {
          sessionStorage.removeItem('app_developing_unlocked');
          setDevelopingUnlocked(false);
        }
      }
      prevEnabledRef.current = settings.developingModeEnabled;
      prevPasswordRef.current = settings.developingPassword;
    }
  }, [settings?.developingModeEnabled, settings?.developingPassword]);

  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 3)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  useEffect(() => {
    // Hide preloader when both are loaded OR after a max timeout
    if (!authLoading && !settingsLoading) {
      const timer = setTimeout(() => {
        setShowPreloader(false);
      }, 300); // Small buffer for smooth transition
      return () => clearTimeout(timer);
    }
    
    // Safety fallback: hide after 1.5 seconds regardless
    const safetyTimer = setTimeout(() => {
      setShowPreloader(false);
    }, 1500);

    return () => clearTimeout(safetyTimer);
  }, [authLoading, settingsLoading]);

  useEffect(() => {
    const isRestaurantRoute = location.pathname.startsWith('/r/') || (location.pathname.startsWith('/admin') && Boolean(user?.restaurantId));

    if (settings && isRestaurantRoute && tenant) {
      if (settings.name) {
        document.title = settings.name;
      }
      if (settings.fontFamily) {
        document.documentElement.style.setProperty('--font-family', `"${settings.fontFamily}"`);
      }
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      } else {
        document.documentElement.style.setProperty('--primary-color', '#f77408');
      }
      if (settings.buttonBorderRadius) {
        document.documentElement.style.setProperty('--button-radius', settings.buttonBorderRadius);
      } else {
        document.documentElement.style.removeProperty('--button-radius');
      }
      if (settings.boxBorderRadius) {
        document.documentElement.style.setProperty('--box-radius', settings.boxBorderRadius);
      } else {
        document.documentElement.style.removeProperty('--box-radius');
      }
      if (settings.inputBorderRadius) {
        document.documentElement.style.setProperty('--input-radius', settings.inputBorderRadius);
      } else {
        document.documentElement.style.removeProperty('--input-radius');
      }
      if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      updateFavicon(settings.faviconUrl, settings);
    } else {
      // DineMaster Pro platform context: clean & restaurant-neutral
      const path = location.pathname;
      if (path === '/login') {
        document.title = `Sign In | ${APP_CONFIG.appName}`;
      } else if (path === '/about') {
        document.title = `About Us | ${APP_CONFIG.appName}`;
      } else if (path === '/pricing') {
        document.title = `Pricing & Plans | ${APP_CONFIG.appName}`;
      } else if (path === '/contact') {
        document.title = `Contact Us | ${APP_CONFIG.appName}`;
      } else if (path === '/features' || path === '/services') {
        document.title = `Features & Operations | ${APP_CONFIG.appName}`;
      } else if (path === '/reviews') {
        document.title = `Customer Reviews | ${APP_CONFIG.appName}`;
      } else if (path.startsWith('/app/super-admin')) {
        document.title = `Super Admin | ${APP_CONFIG.appName}`;
      } else if (path === '/') {
        document.title = `${APP_CONFIG.appName} - Modern Restaurant Reservation & Table Management SaaS`;
      }
      document.documentElement.style.removeProperty('--font-family');
      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--button-radius');
      document.documentElement.style.removeProperty('--box-radius');
      document.documentElement.style.removeProperty('--input-radius');
      document.documentElement.setAttribute('data-theme', 'dark');
      updateFavicon(undefined, null);
    }
  }, [settings, tenant, location.pathname, user?.restaurantId]);

  const isLoginPage = location.pathname === '/login';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStaffOrAdmin = isAdmin || isStaff;
  const isDevelopingActive = settings?.developingModeEnabled && !developingUnlocked && !isLoginPage && !isAdminRoute;
  const isMaintenanceActive = settings?.maintenanceModeEnabled && !isStaffOrAdmin && !isLoginPage;

  if (isDevelopingActive) {
    return (
      <>
        <AnimatePresence>
          {showPreloader && <Preloader />}
        </AnimatePresence>
        <ScrollToTop />
        <DevelopingApp onUnlock={() => {
          setDevelopingUnlocked(true);
          sessionStorage.setItem('app_developing_unlocked', 'true');
        }} />
      </>
    );
  }

  if (isMaintenanceActive) {
    return (
      <>
        <AnimatePresence>
          {showPreloader && <Preloader />}
        </AnimatePresence>
        <ScrollToTop />
        <Maintenance />
      </>
    );
  }

  const isSuperAdminPath = location.pathname.startsWith('/app/super-admin');

  if (isSuperAdminPath) {
    return (
      <Routes>
        <Route
          path="/app/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdminLayout />
            </SuperAdminRoute>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="restaurants" element={<SuperAdminRestaurants />} />
          <Route path="domains" element={<SuperAdminDomains />} />
          <Route path="plans" element={<SuperAdminPlans />} />
          <Route path="features" element={<SuperAdminFeatureFlags />} />
          <Route path="admins" element={<SuperAdminAdmins />} />
          <Route path="marketing" element={<SuperAdminMarketing />} />
          <Route path="logs" element={<SuperAdminLogs />} />
          <Route path="settings" element={<SuperAdminSettingsPage />} />
          <Route path="*" element={<Navigate to="/app/super-admin" replace />} />
        </Route>
      </Routes>
    );
  }

  if (tenantError) {
    return <DomainErrorPage />;
  }

  if (tenant?.status === 'suspended' && !location.pathname.startsWith('/login')) {
    return <SuspendedRestaurantPage />;
  }

  return (
    <>
      <SyncIndicator />
      <AnimatePresence>
        {showPreloader && <Preloader />}
      </AnimatePresence>
      <ScrollToTop />
      <Toaster position="top-right">
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 ml-auto cursor-pointer flex items-center justify-center"
                    aria-label="Close"
                    id={`dismiss-toast-${t.id}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
      <FreezeOverlay />
      <CookieConsent />
      <BookingNotificationListener />
      {(() => {
        const searchParams = new URLSearchParams(location.search);
        const isExplicitBooking = searchParams.get('view') === 'booking' || searchParams.has('restaurant');
        const isPreviewMarketing = searchParams.get('preview') === 'true';
        const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('run.app');
        const isCustomDomain = !isLocalhost && !host.endsWith('dinemasterpro.com') && !host.endsWith('eataapp.com');
        const isSubdomain = !isLocalhost && host.split('.').length >= 3 && !['www', 'app', 'admin'].includes(host.split('.')[0]);

        const isPlatformLanding = 
          location.pathname === '/marketing' || 
          isPreviewMarketing ||
          (location.pathname === '/' && !isCustomDomain && !isSubdomain);

        return (
          <Layout isMarketing={isPlatformLanding}>
            <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname + '-' + language}>
            <Route path="/" element={
              isPlatformLanding ? (
                <MarketingLandingPage settings={marketingSettings} />
              ) : (
                <PageWrapper><PublicBooking /></PageWrapper>
              )
            } />
            <Route path="/about" element={<MarketingLandingPage settings={marketingSettings} initialSection="about" />} />
            <Route path="/features" element={<MarketingLandingPage settings={marketingSettings} initialSection="features" />} />
            <Route path="/services" element={<MarketingLandingPage settings={marketingSettings} initialSection="features" />} />
            <Route path="/pricing" element={<MarketingLandingPage settings={marketingSettings} initialSection="pricing" />} />
            <Route path="/reviews" element={<MarketingLandingPage settings={marketingSettings} initialSection="reviews" />} />
            <Route path="/contact" element={<MarketingLandingPage settings={marketingSettings} initialSection="contact" />} />
            <Route path="/register" element={<MarketingLandingPage settings={marketingSettings} initialSection="pricing" />} />
            <Route path="/marketing" element={<MarketingLandingPage settings={marketingSettings} />} />
            <Route path="/book" element={tenant ? <PageWrapper><PublicBooking /></PageWrapper> : <Navigate to="/" replace />} />
            <Route path="/reserve" element={tenant ? <PageWrapper><PublicBooking /></PageWrapper> : <Navigate to="/" replace />} />
            <Route path="/r/:slug" element={<PageWrapper><PublicBooking /></PageWrapper>} />
            <Route path="/r/:slug/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/r/:slug/admin/login" element={<PageWrapper><Login /></PageWrapper>} />
            
            {/* Restaurant Admin Routes with /r/:slug/admin prefix */}
            <Route path="/r/:slug/admin/dashboard" element={<Navigate to="" replace />} />
            <Route path="/r/:slug/admin" element={<PageWrapper><ProtectedRoute role="staff"><AdminDashboard /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/live" element={<PageWrapper><ProtectedRoute role="staff"><AdminLiveView /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/reservations" element={<PageWrapper><ProtectedRoute role="staff"><AdminReservations /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/tables" element={<PageWrapper><ProtectedRoute role="staff"><AdminTables /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/customers" element={<PageWrapper><ProtectedRoute role="staff"><AdminCustomers /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/insights" element={<PageWrapper><ProtectedRoute role="admin"><AdminInsights /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/customer-stats" element={<PageWrapper><ProtectedRoute role="admin"><AdminCustomerStats /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/settings" element={<PageWrapper><ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/users" element={<PageWrapper><ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/instructions" element={<PageWrapper><ProtectedRoute role="staff"><Instructions /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/print/section" element={<PageWrapper><ProtectedRoute role="staff"><AdminPrintSection /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/admin/print/section-document" element={<PageWrapper><ProtectedRoute role="staff"><AdminPrintSection /></ProtectedRoute></PageWrapper>} />

            {/* Restaurant /r/:slug/staff routes */}
            <Route path="/r/:slug/staff" element={<PageWrapper><ProtectedRoute role="staff"><AdminDashboard /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/staff/live" element={<PageWrapper><ProtectedRoute role="staff"><AdminLiveView /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/staff/reservations" element={<PageWrapper><ProtectedRoute role="staff"><AdminReservations /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/staff/tables" element={<PageWrapper><ProtectedRoute role="staff"><AdminTables /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/staff/customers" element={<PageWrapper><ProtectedRoute role="staff"><AdminCustomers /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/staff/instructions" element={<PageWrapper><ProtectedRoute role="staff"><Instructions /></ProtectedRoute></PageWrapper>} />
            <Route path="/r/:slug/staff/*" element={<RestaurantStaffRedirect />} />

            <Route path="/r/:slug/cancel/:id" element={<PageWrapper><PublicCancel /></PageWrapper>} />
            <Route path="/cancel/:id" element={<PageWrapper><PublicCancel /></PageWrapper>} />
            <Route path="/domain-error" element={<DomainErrorPage />} />
            <Route path="/suspended" element={<SuspendedRestaurantPage />} />
            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/privacy" element={<PageWrapper><PrivacyPolicy /></PageWrapper>} />
            <Route path="/terms" element={<PageWrapper><TermsAndConditions /></PageWrapper>} />
            <Route path="/cookies" element={<PageWrapper><CookiePolicy /></PageWrapper>} />
            
            {/* Customer Routes */}
            <Route path="/my-bookings" element={<PageWrapper>
              <ProtectedRoute role="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            </PageWrapper>} />

            <Route path="/print/shared-pdf" element={<PageWrapper><AdminPrintSection isPublicShared={true} /></PageWrapper>} />

            {/* Legacy /admin routes redirect to /r/:slug/admin */}
            <Route path="/admin" element={<LegacyAdminRedirect />} />
            <Route path="/admin/*" element={<LegacyAdminRedirect />} />

        {/* 404 Page Not Found */}
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
      </AnimatePresence>
    </Layout>
        );
      })()}
    </>
  );
}

function LocalizedApp() {
  const { language } = useLanguage();
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <TenantProvider>
              <ImpersonationBanner />
              <AppContent />
            </TenantProvider>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </LocalizationProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <LocalizedApp />
    </LanguageProvider>
  );
}
