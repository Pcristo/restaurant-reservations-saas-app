import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RestaurantSettings } from '../types';
import { DEFAULT_SETTINGS, APP_CONFIG } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useTenantSafe } from './useTenant';
import { DEFAULT_RESTAURANT_ID } from '../services/tenantService';

export function useSettings(restaurantIdOverride?: string) {
  const tenantCtx = useTenantSafe();
  const activeRestaurant = tenantCtx?.tenant;

  // Resolve target restaurant ID: explicit override -> current tenant -> URL route slug -> /admin management route only
  const targetRestaurantId = useMemo(() => {
    if (restaurantIdOverride) return restaurantIdOverride;
    if (activeRestaurant?.id) return activeRestaurant.id;
    // Extract restaurant slug directly from /r/:slug in route path if present
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const rawSlug = match[1].toLowerCase();
        return rawSlug === 'bella-italia' ? 'bela-italia' : rawSlug;
      }
      // Only resolve stored restaurant ID if inside admin management context
      if (window.location.pathname.startsWith('/admin') || window.location.pathname.includes('/admin')) {
        const stored = localStorage.getItem('eata_active_restaurant_id') || localStorage.getItem('active_restaurant_id');
        if (stored) return stored;
      }
    }
    return '';
  }, [restaurantIdOverride, activeRestaurant?.id]);

  const cacheKey = targetRestaurantId ? `cached_restaurant_settings_${targetRestaurantId}` : 'cached_restaurant_settings';

  // Default fallback seeded with active restaurant info or APP_CONFIG
  const fallbackSettings = useMemo<RestaurantSettings>(() => {
    const restaurantName = activeRestaurant?.name || DEFAULT_SETTINGS.name || APP_CONFIG.appName;
    const restaurantAddress = activeRestaurant?.address || DEFAULT_SETTINGS.address || APP_CONFIG.address;
    const restaurantPhone = activeRestaurant?.phone || DEFAULT_SETTINGS.phone || APP_CONFIG.phone;
    const restaurantEmail = activeRestaurant?.email || activeRestaurant?.ownerEmail || DEFAULT_SETTINGS.email || APP_CONFIG.email;
    const restaurantTimezone = activeRestaurant?.timezone || DEFAULT_SETTINGS.timezone || 'Europe/Dublin';
    const restaurantWebsite = activeRestaurant?.website || DEFAULT_SETTINGS.websiteUrl || `https://${APP_CONFIG.companyName.toLowerCase()}.com`;

    // Strict restaurant scoping for maintenance mode
    const isTargetActiveRestaurant = Boolean(
      targetRestaurantId && activeRestaurant && (activeRestaurant.id === targetRestaurantId || activeRestaurant.slug === targetRestaurantId)
    );
    const maintenanceEnabled = isTargetActiveRestaurant ? Boolean(activeRestaurant?.maintenanceModeEnabled) : false;
    const maintenanceMessage = isTargetActiveRestaurant ? (activeRestaurant?.maintenanceMessage || '') : '';

    return {
      ...DEFAULT_SETTINGS,
      id: targetRestaurantId,
      restaurantId: targetRestaurantId,
      name: restaurantName,
      address: restaurantAddress,
      city: activeRestaurant?.city || 'Dublin',
      phone: restaurantPhone,
      email: restaurantEmail,
      timezone: restaurantTimezone,
      websiteUrl: restaurantWebsite,
      maintenanceModeEnabled: maintenanceEnabled,
      maintenanceMessage: maintenanceMessage,
      description: activeRestaurant?.seo?.metaDescription || `${restaurantName} is pleased to welcome you for an exceptional dining experience.`,
      descriptionEn: activeRestaurant?.seo?.metaDescription || `${restaurantName} is pleased to welcome you for an exceptional dining experience.`,
      primaryColor: activeRestaurant?.branding?.primaryColor || (DEFAULT_SETTINGS as any).primaryColor || '#f59e0b',
      openingHours: activeRestaurant?.openingHours || DEFAULT_SETTINGS.openingHours,
      branding: {
        primaryColor: activeRestaurant?.branding?.primaryColor || '#f59e0b',
        secondaryColor: activeRestaurant?.branding?.secondaryColor || '#1e293b',
        accentColor: activeRestaurant?.branding?.accentColor || '#10b981',
        displayName: activeRestaurant?.branding?.displayName || restaurantName,
        theme: activeRestaurant?.branding?.theme || 'light',
        buttonStyle: activeRestaurant?.branding?.buttonStyle || 'rounded',
      },
    } as unknown as RestaurantSettings;
  }, [activeRestaurant, targetRestaurantId]);

  const [settings, setSettings] = useState<RestaurantSettings | null>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
      // Backwards compatibility for default restaurant
      if (targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main') {
        const legacyCached = localStorage.getItem('cached_restaurant_settings');
        if (legacyCached) return JSON.parse(legacyCached);
      }
      return fallbackSettings;
    } catch {
      return fallbackSettings;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!targetRestaurantId) {
      setSettings(fallbackSettings);
      setLoading(false);
      return;
    }
    setLoading(true);

    const docRef = doc(db, 'settings', targetRestaurantId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (!isMounted) return;

      if (docSnap.exists()) {
        const docData = docSnap.data() || {};
        const isTargetActiveRestaurant = Boolean(
          targetRestaurantId && activeRestaurant && (activeRestaurant.id === targetRestaurantId || activeRestaurant.slug === targetRestaurantId)
        );
        const isMaintenance = docData.maintenanceModeEnabled !== undefined
          ? Boolean(docData.maintenanceModeEnabled)
          : (isTargetActiveRestaurant ? Boolean(activeRestaurant?.maintenanceModeEnabled) : false);

        const data = { 
          ...fallbackSettings,
          ...docData,
          id: docSnap.id, 
          restaurantId: targetRestaurantId,
          maintenanceModeEnabled: isMaintenance,
          ...(docData.maintenanceMessage !== undefined 
            ? { maintenanceMessage: docData.maintenanceMessage } 
            : (isTargetActiveRestaurant && activeRestaurant?.maintenanceMessage ? { maintenanceMessage: activeRestaurant.maintenanceMessage } : {})),
        } as unknown as RestaurantSettings;

        setSettings(data);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {}
        setLoading(false);
      } else {
        // If specific tenant settings doc does not exist yet:
        // 1. Check legacy 'main' if it's the default restaurant
        if (targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main') {
          try {
            const legacySnap = await getDoc(doc(db, 'settings', 'main'));
            if (legacySnap.exists()) {
              const legacyData = { 
                id: targetRestaurantId, 
                restaurantId: targetRestaurantId, 
                ...(legacySnap.data() || {}) 
              } as unknown as RestaurantSettings;
              if (isMounted) {
                setSettings(legacyData);
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(legacyData));
                } catch (e) {}
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.warn('[useSettings] Legacy settings lookup failed:', err);
          }
        }

        // 2. Initialize with tenant-specific fallback
        if (isMounted) {
          setSettings(fallbackSettings);
          setLoading(false);
        }
      }
    }, (error) => {
      if (!isMounted) return;
      setSettings((prev) => prev || fallbackSettings);
      setLoading(false);
      console.warn(`[useSettings] Settings sync notice for ${targetRestaurantId}:`, error);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetRestaurantId, cacheKey, fallbackSettings]);

  const updateSettings = useCallback(async (newSettings: RestaurantSettings) => {
    const payload = {
      ...newSettings,
      id: targetRestaurantId,
      restaurantId: targetRestaurantId,
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to tenant-specific settings document
    await setDoc(doc(db, 'settings', targetRestaurantId), payload);

    // 2. For default restaurant, keep legacy settings/main synchronized
    if (targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main') {
      try {
        await setDoc(doc(db, 'settings', 'main'), { ...payload, id: 'main' });
      } catch (err) {
        console.warn('[useSettings] Synced legacy settings/main note:', err);
      }
    }

    // 3. Sync essential metadata to restaurants/{targetRestaurantId}
    try {
      const restaurantRef = doc(db, 'restaurants', targetRestaurantId);
      const restaurantSnap = await getDoc(restaurantRef);
      if (restaurantSnap.exists()) {
        await updateDoc(restaurantRef, {
          name: newSettings.name,
          address: newSettings.address || '',
          city: newSettings.city || '',
          phone: newSettings.phone || '',
          email: newSettings.email || '',
          timezone: newSettings.timezone || 'Europe/Dublin',
          openingHours: newSettings.openingHours,
          maintenanceModeEnabled: Boolean(newSettings.maintenanceModeEnabled),
          ...(newSettings.maintenanceMessage !== undefined ? { maintenanceMessage: newSettings.maintenanceMessage } : {}),
          branding: {
            ...(activeRestaurant?.branding || {}),
            primaryColor: newSettings.primaryColor || newSettings.branding?.primaryColor || '#f59e0b',
            secondaryColor: newSettings.branding?.secondaryColor || '#1e293b',
            accentColor: newSettings.branding?.accentColor || '#10b981',
            displayName: newSettings.name,
            theme: newSettings.branding?.theme || 'light',
            logoUrl: newSettings.logoUrl || newSettings.cloudinaryLogoUrl || activeRestaurant?.branding?.logoUrl || '',
            faviconUrl: newSettings.faviconUrl || newSettings.cloudinaryFaviconUrl || activeRestaurant?.branding?.faviconUrl || '',
            coverImageUrl: newSettings.heroImageUrl || newSettings.cloudinaryHeroImageUrl || newSettings.branding?.coverImageUrl || activeRestaurant?.branding?.coverImageUrl || '',
          },
          ...(newSettings.galleryImages ? {
            settings: {
              ...(activeRestaurant?.settings || {}),
              galleryImages: newSettings.galleryImages,
            }
          } : {}),
          updatedAt: new Date().toISOString(),
        });

        if (tenantCtx?.refreshTenant) {
          await tenantCtx.refreshTenant();
        }
      }
    } catch (restSyncErr) {
      console.warn('[useSettings] Note syncing restaurant document:', restSyncErr);
    }

    // 4. Update local state and cache
    setSettings(payload);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (e) {}
  }, [targetRestaurantId, cacheKey, activeRestaurant, tenantCtx]);

  return { settings, loading, updateSettings, restaurantId: targetRestaurantId };
}
