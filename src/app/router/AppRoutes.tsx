import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import toast, { Toaster, ToastBar, useToasterStore } from 'react-hot-toast';
import { X } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useSettings } from '../../hooks/useSettings';
import { useTenant } from '../../hooks/useTenant';

import Layout from '../../components/Layout';
import ScrollToTop from '../../components/ScrollToTop';
import Preloader from '../../components/Preloader';
import { FreezeOverlay } from '../../components/FreezeOverlay';
import CookieConsent from '../../components/CookieConsent';
import { BookingNotificationListener } from '../../components/BookingNotificationListener';
import { SyncIndicator } from '../../components/SyncIndicator';

import PublicBooking from '../../pages/PublicBooking';
import PublicCancel from '../../pages/PublicCancel';
import Login from '../../pages/Login';
import CustomerDashboard from '../../pages/CustomerDashboard';
import AdminDashboard from '../../pages/AdminDashboard';
import AdminSettings from '../../pages/AdminSettings';
import AdminTables from '../../pages/AdminTables';
import AdminReservations from '../../pages/AdminReservations';
import AdminPrintSection from '../../pages/AdminPrintSection';
import AdminCustomers from '../../pages/AdminCustomers';
import AdminUsers from '../../pages/AdminUsers';
import AdminLiveView from '../../pages/AdminLiveView';
import AdminInsights from '../../pages/AdminInsights';
import AdminCustomerStats from '../../pages/AdminCustomerStats';
import PrivacyPolicy from '../../pages/PrivacyPolicy';
import TermsAndConditions from '../../pages/TermsAndConditions';
import CookiePolicy from '../../pages/CookiePolicy';
import Maintenance from '../../pages/Maintenance';
import DevelopingApp from '../../pages/DevelopingApp';
import Instructions from '../../pages/Instructions';
import NotFound from '../../pages/NotFound';
import { DomainErrorPage } from '../../pages/DomainErrorPage';
import { SuspendedRestaurantPage } from '../../pages/SuspendedRestaurantPage';

import { SuperAdminLayout } from '../../pages/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from '../../pages/superadmin/SuperAdminDashboard';
import { SuperAdminRestaurants } from '../../pages/superadmin/SuperAdminRestaurants';
import { SuperAdminDomains } from '../../pages/superadmin/SuperAdminDomains';
import { SuperAdminPlans } from '../../pages/superadmin/SuperAdminPlans';
import { SuperAdminFeatureFlags } from '../../pages/superadmin/SuperAdminFeatureFlags';
import { SuperAdminLogs } from '../../pages/superadmin/SuperAdminLogs';
import { SuperAdminSettings as SuperAdminSettingsPage } from '../../pages/superadmin/SuperAdminSettings';
import { SuperAdminMarketing } from '../../pages/superadmin/SuperAdminMarketing';
import { SuperAdminAdmins } from '../../pages/superadmin/SuperAdminAdmins';

import MarketingLandingPage from '../../pages/MarketingLandingPage';
import { getMarketingWebsiteSettings, DEFAULT_MARKETING_SETTINGS } from '../../services/marketingWebsiteService';
import { MarketingWebsiteSettings } from '../../types';
import { updateFavicon, isPlatformHost, isTenantSubdomain } from '../../lib/utils';
import { APP_CONFIG } from '../../data/appConfig';

import { 
  ProtectedRoute, 
  SuperAdminRoute, 
  LegacyAdminRedirect, 
  RestaurantStaffRedirect 
} from './guards';

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

export function AppRoutes() {
  const { user, loading: authLoading, isAdmin, isStaff } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { tenant, tenantError } = useTenant();
  const [showPreloader, setShowPreloader] = useState(true);
  const [developingUnlocked, setDevelopingUnlocked] = useState(() => sessionStorage.getItem('app_developing_unlocked') === 'true');
  const location = useLocation();
  const { language } = useLanguage();

  const [marketingSettings, setMarketingSettings] = useState<MarketingWebsiteSettings>(() => {
    try {
      const cached = localStorage.getItem('dinemaster_marketing_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_MARKETING_SETTINGS;
  });

  useEffect(() => {
    getMarketingWebsiteSettings().then(setMarketingSettings);
  }, [location.pathname]);

  const prevEnabledRef = useRef<boolean | undefined>(undefined);
  const prevPasswordRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (settings) {
      if (!settings.developingModeEnabled) {
        sessionStorage.removeItem('app_developing_unlocked');
        setDevelopingUnlocked(false);
      } else {
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
    if (!authLoading && !settingsLoading) {
      const timer = setTimeout(() => {
        setShowPreloader(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    
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

  if (location.pathname.startsWith('/app/super-admin')) {
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
        const isPlatform = isPlatformHost(host);
        const isSubdomain = isTenantSubdomain(host);
        const isCustomDomain = !isPlatform;

        const isPlatformLanding = 
          location.pathname === '/marketing' || 
          isPreviewMarketing ||
          (location.pathname === '/' && !isCustomDomain && !isSubdomain && !isExplicitBooking);

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
                
                {/* Restaurant Admin Routes */}
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

                {/* Restaurant Staff Routes */}
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
                <Route path="/my-bookings" element={
                  <PageWrapper>
                    <ProtectedRoute role="customer">
                      <CustomerDashboard />
                    </ProtectedRoute>
                  </PageWrapper>
                } />

                <Route path="/print/shared-pdf" element={<PageWrapper><AdminPrintSection isPublicShared={true} /></PageWrapper>} />

                {/* Legacy /admin redirects */}
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
export default AppRoutes;
