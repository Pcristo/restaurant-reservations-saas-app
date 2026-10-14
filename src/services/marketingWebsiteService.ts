import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { MarketingWebsiteSettings, MarketingReview, Plan } from '../types';
import { APP_CONFIG } from '../data/appConfig';
import { DEFAULT_PLANS } from '../data/plans';

export const DEFAULT_MARKETING_SETTINGS: MarketingWebsiteSettings = {
  enabled: true,
  general: {
    siteName: APP_CONFIG.appName,
    tagline: 'Modern Restaurant Reservation & Table Management SaaS',
    logoUrl: '',
    contactEmail: APP_CONFIG.email,
    contactPhone: APP_CONFIG.phone,
    primaryCtaText: 'Start 14-Day Free Trial',
    primaryCtaUrl: '#pricing',
  },
  hero: {
    enabled: true,
    mode: 'video',
    headline: 'Restaurant Reservations Made Simple.',
    description: 'Manage tables, floor plans, real-time availability, and diners with zero cover commissions. One intelligent operating system built for modern restaurants.',
    primaryCtaText: 'Start Free Trial',
    primaryCtaUrl: '#pricing',
    secondaryCtaText: 'See How It Works',
    secondaryCtaUrl: '#about',
    badgeText: 'Next-Gen Restaurant Hospitality Engine',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  },
  about: {
    enabled: true,
    title: 'Everything Your Restaurant Needs to Run Smoothly',
    subtitle: 'Built for independent bistros, high-volume dining rooms, and multi-location hospitality groups.',
    description: 'DineMaster Pro eliminates chaotic host stands, double-bookings, and expensive per-seat cover fees. With real-time conflict checking, interactive visual floor plans, and automated guest communications, you retain 100% of your diner relationships.',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    features: [
      {
        title: 'Visual Floor Plans & Table Management',
        description: 'Design multi-room indoor and patio layouts. Drag-and-drop live seating, manage party sizes, and visualize table statuses instantly.',
        icon: 'LayoutGrid'
      },
      {
        title: 'Real-Time Availability & Overlap Protection',
        description: 'Smart conflict-detection prevents double bookings across lunch and dinner shifts. Instant online reservations with guaranteed confirmation.',
        icon: 'CalendarCheck'
      },
      {
        title: 'Automated SMS & WhatsApp Confirmations',
        description: 'Send instant booking confirmations, 24-hour reminders, and cancellation links directly via branded WhatsApp and SMS notifications.',
        icon: 'MessageSquare'
      },
      {
        title: 'Zero Cover Fees & Direct Guest Relationships',
        description: 'Stop paying €2-€5 per cover to third-party directories. Every diner is your direct customer with full dietary and preference profiles.',
        icon: 'Percent'
      },
      {
        title: 'Custom Subdomains & White-Label Branding',
        description: 'Bring your custom domain or get a dedicated restaurant slug. Your branding, logo, colors, and menu embed seamlessly.',
        icon: 'Globe'
      },
      {
        title: 'Waitlist & Walk-In Turn Management',
        description: 'Seamlessly capture walk-in guests during peak dinner rushes. Track estimated table wait times and notify guests when tables are ready.',
        icon: 'Clock'
      }
    ]
  },
  reviews: {
    showReviews: true,
    title: 'Trusted by Restaurateurs & General Managers',
    subtitle: 'See how hospitality professionals increase table turn rates and streamline daily service.',
    items: [
      {
        id: 'rev-1',
        name: 'Marco Rossi',
        restaurantName: 'Bella Vista Trattoria',
        role: 'Owner & Executive Chef',
        text: 'DineMaster Pro transformed our dinner rushes. We eliminated double bookings entirely and increased our table turnover by 22% in the first two months without paying a single cent in cover fees.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=200&q=80',
        isActive: true,
      },
      {
        id: 'rev-2',
        name: 'Sarah Jenkins',
        restaurantName: 'The Copper Oak Bistro',
        role: 'General Manager',
        text: 'The interactive floor plan and live availability are unmatched. Our host stand team loves how fast and intuitive it is to assign parties. Staff onboarding took less than ten minutes.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        isActive: true,
      },
      {
        id: 'rev-3',
        name: 'Carlos Mendes',
        restaurantName: 'Porto Cais Restaurant',
        role: 'Managing Partner',
        text: 'Switching from paper reservation books and expensive marketplace apps was the best decision for our bottom line. The automated WhatsApp reminders cut our weekend no-shows to near zero.',
        rating: 5,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        isActive: true,
      }
    ]
  },
  pricing: {
    showPricing: true,
    title: 'Predictable Flat Pricing. Zero Cover Fees.',
    subtitle: 'Choose the right tier for your restaurant. Every plan includes core table operations with zero per-diner booking commissions.'
  },
  contact: {
    enabled: true,
    title: 'Ready to Transform Your Restaurant Reservations?',
    description: 'Have questions, need a personalized demo, or want custom multi-location rollout assistance? Get in touch with our restaurant specialists.',
    destinationEmail: APP_CONFIG.email,
    phone: APP_CONFIG.phone
  },
  footer: {
    description: 'DineMaster Pro is an intelligent multi-tenant reservation and table management operating system designed for restaurants, bistros, and hospitality groups worldwide.',
    copyright: `© ${new Date().getFullYear()} ${APP_CONFIG.appName}. All rights reserved.`,
    socialLinks: {
      instagram: 'https://instagram.com',
      facebook: 'https://facebook.com',
      linkedin: 'https://linkedin.com',
      x: 'https://x.com'
    }
  }
};

const MARKETING_SETTINGS_CACHE_KEY = 'dinemaster_marketing_settings';

/**
 * Loads marketing website settings from Firestore `settings/marketing_website`,
 * falling back to local cache and DEFAULT_MARKETING_SETTINGS.
 */
export async function getMarketingWebsiteSettings(): Promise<MarketingWebsiteSettings> {
  // Check local cache first for instant render
  let cached: MarketingWebsiteSettings | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(MARKETING_SETTINGS_CACHE_KEY);
      if (raw) cached = JSON.parse(raw);
      if (cached) {
        if (!cached.hero) {
          cached.hero = { ...DEFAULT_MARKETING_SETTINGS.hero };
        } else if (!cached.hero.mode) {
          cached.hero.mode = 'video';
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const docRef = doc(db, 'settings', 'marketing_website');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const heroData = data.hero || {};
      if (heroData.headline === 'Powerful Restaurant Reservations, Simplified.') {
        heroData.headline = 'Restaurant Reservations Made Simple.';
      }
      const merged: MarketingWebsiteSettings = {
        enabled: data.enabled !== false,
        general: { ...DEFAULT_MARKETING_SETTINGS.general, ...(data.general || {}) },
        hero: { ...DEFAULT_MARKETING_SETTINGS.hero, ...heroData },
        about: { ...DEFAULT_MARKETING_SETTINGS.about, ...(data.about || {}) },
        reviews: {
          showReviews: data.reviews?.showReviews !== false,
          title: data.reviews?.title || DEFAULT_MARKETING_SETTINGS.reviews.title,
          subtitle: data.reviews?.subtitle || DEFAULT_MARKETING_SETTINGS.reviews.subtitle,
          items: Array.isArray(data.reviews?.items) ? data.reviews.items : DEFAULT_MARKETING_SETTINGS.reviews.items,
        },
        pricing: {
          showPricing: data.pricing?.showPricing !== false,
          title: data.pricing?.title || DEFAULT_MARKETING_SETTINGS.pricing.title,
          subtitle: data.pricing?.subtitle || DEFAULT_MARKETING_SETTINGS.pricing.subtitle,
        },
        contact: { ...DEFAULT_MARKETING_SETTINGS.contact, ...(data.contact || {}) },
        footer: {
          ...DEFAULT_MARKETING_SETTINGS.footer,
          ...(data.footer || {}),
          socialLinks: { ...DEFAULT_MARKETING_SETTINGS.footer.socialLinks, ...(data.footer?.socialLinks || {}) }
        }
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(MARKETING_SETTINGS_CACHE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('[MarketingService] Notice loading settings from Firestore:', err);
  }

  return cached || DEFAULT_MARKETING_SETTINGS;
}

export type DeepPartialMarketing<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? T[P] : T[P] extends object ? DeepPartialMarketing<T[P]> : T[P];
};

/**
 * Updates marketing website settings in Firestore `settings/marketing_website`
 * and updates local cache.
 */
export async function updateMarketingWebsiteSettings(
  settings: DeepPartialMarketing<MarketingWebsiteSettings>
): Promise<MarketingWebsiteSettings> {
  const current = await getMarketingWebsiteSettings();
  const updated: MarketingWebsiteSettings = {
    ...current,
    ...settings,
    general: { ...current.general, ...(settings.general || {}) },
    hero: { ...current.hero, ...(settings.hero || {}) },
    about: { ...current.about, ...(settings.about || {}) },
    reviews: { ...current.reviews, ...(settings.reviews || {}) },
    pricing: { ...current.pricing, ...(settings.pricing || {}) },
    contact: { ...current.contact, ...(settings.contact || {}) },
    footer: { ...current.footer, ...(settings.footer || {}) },
  };

  try {
    const docRef = doc(db, 'settings', 'marketing_website');
    await setDoc(docRef, { ...updated, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('[MarketingService] Notice saving settings to Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(MARKETING_SETTINGS_CACHE_KEY, JSON.stringify(updated));
  }

  return updated;
}

/**
 * Retrieves public plans directly from the single source of truth:
 * the existing SaaS Plans & Entitlements in Firestore `plans` or `DEFAULT_PLANS`.
 * Filters out inactive or private plans. Never duplicates plan models.
 */
export async function getPublicPlans(): Promise<Plan[]> {
  try {
    const plansColl = collection(db, 'plans');
    const snap = await getDocs(plansColl);
    if (!snap.empty) {
      const plansList: Plan[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Partial<Plan>;
        // Respect isActive and isPublic flags if present
        if (data.isActive !== false && data.isPublic !== false) {
          plansList.push({
            id: docSnap.id,
            name: data.name || docSnap.id,
            description: data.description || '',
            priceMonthly: data.priceMonthly ?? 0,
            currency: data.currency || 'EUR',
            isPopular: Boolean(data.isPopular),
            entitlements: {
              maxStaffUsers: data.entitlements?.maxStaffUsers ?? 5,
              maxTables: data.entitlements?.maxTables ?? 25,
              maxReservations: data.entitlements?.maxReservations ?? 500,
              customDomain: Boolean(data.entitlements?.customDomain),
              advancedAnalytics: Boolean(data.entitlements?.advancedAnalytics),
              whatsapp: Boolean(data.entitlements?.whatsapp),
              sms: Boolean(data.entitlements?.sms),
              advancedSEO: Boolean(data.entitlements?.advancedSEO),
              waitlist: Boolean(data.entitlements?.waitlist),
              apiAccess: Boolean(data.entitlements?.apiAccess),
            },
            customFeatures: Array.isArray(data.customFeatures) ? data.customFeatures : [],
          });
        }
      });

      if (plansList.length > 0) {
        return plansList.sort((a, b) => a.priceMonthly - b.priceMonthly);
      }
    }
  } catch (err) {
    console.warn('[MarketingService] Notice loading plans from Firestore, falling back to default plans:', err);
  }

  // Fallback to existing SaaS Plans & Entitlements definitions
  return DEFAULT_PLANS.filter((p) => p.isActive !== false && p.isPublic !== false);
}

/**
 * Submits the public contact form to `/api/contact`.
 */
export async function submitPublicContactForm(data: {
  name: string;
  email: string;
  restaurantName: string;
  phone?: string;
  message: string;
  hp?: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Failed to submit contact request');
  }

  return {
    success: true,
    message: result.message || 'Your inquiry was sent successfully!'
  };
}
