import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plan, User } from '../types';
import { DEFAULT_PLANS } from '../data/plans';
import { logAuditAction } from './tenantService';
import { APP_CONFIG } from '../data/appConfig';

const PLANS_COLLECTION = 'plans';

/**
 * Lists all SaaS subscription plans from Firestore.
 * If the collection is empty, seeds the initial DEFAULT_PLANS into Firestore.
 */
export async function listAllPlans(): Promise<Plan[]> {
  try {
    const coll = collection(db, PLANS_COLLECTION);
    const snap = await getDocs(coll);

    if (snap.empty) {
      // Seed default plans into Firestore so they can be managed and edited
      const seededPlans: Plan[] = [];
      for (const p of DEFAULT_PLANS) {
        const planWithFlags: Plan = {
          ...p,
          isActive: p.isActive !== false,
          isPublic: p.isPublic !== false,
        };
        try {
          await setDoc(doc(db, PLANS_COLLECTION, p.id), planWithFlags);
        } catch (e) {
          console.warn('[planService] Notice seeding default plan:', p.id, e);
        }
        seededPlans.push(planWithFlags);
      }
      return seededPlans.sort((a, b) => a.priceMonthly - b.priceMonthly);
    }

    const plans: Plan[] = [];
    snap.forEach((d) => {
      const data = d.data() as Partial<Plan>;
      plans.push({
        id: d.id,
        name: data.name || d.id,
        description: data.description || '',
        priceMonthly: Number(data.priceMonthly ?? 0),
        currency: data.currency || 'EUR',
        isPopular: Boolean(data.isPopular),
        isActive: data.isActive !== false,
        isPublic: data.isPublic !== false,
        entitlements: {
          maxStaffUsers: Number(data.entitlements?.maxStaffUsers ?? 5),
          maxTables: Number(data.entitlements?.maxTables ?? 25),
          maxReservations: Number(data.entitlements?.maxReservations ?? 500),
          customDomain: Boolean(data.entitlements?.customDomain),
          advancedAnalytics: Boolean(data.entitlements?.advancedAnalytics),
          whatsapp: Boolean(data.entitlements?.whatsapp),
          sms: Boolean(data.entitlements?.sms),
          advancedSEO: Boolean(data.entitlements?.advancedSEO),
          waitlist: Boolean(data.entitlements?.waitlist),
          apiAccess: Boolean(data.entitlements?.apiAccess),
          ...(data.entitlements || {}),
        },
        customFeatures: Array.isArray(data.customFeatures) ? data.customFeatures : [],
      });
    });

    return plans.sort((a, b) => a.priceMonthly - b.priceMonthly);
  } catch (err) {
    console.error('[planService] Error listing plans from Firestore:', err);
    // Fallback to in-memory DEFAULT_PLANS with visibility defaults
    return DEFAULT_PLANS.map(p => ({
      ...p,
      isActive: p.isActive !== false,
      isPublic: p.isPublic !== false,
      customFeatures: Array.isArray(p.customFeatures) ? p.customFeatures : [],
    }));
  }
}

/**
 * Creates or updates a SaaS Plan with its full entitlements and visibility flags.
 */
export async function savePlan(plan: Plan, actor?: User | null): Promise<Plan> {
  const planId = plan.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (!planId) {
    throw new Error('Plan ID must not be empty.');
  }

  const cleanPlan: Plan = {
    ...plan,
    id: planId,
    name: plan.name.trim(),
    description: plan.description.trim(),
    priceMonthly: Math.max(0, Number(plan.priceMonthly)),
    currency: plan.currency || 'EUR',
    isPopular: Boolean(plan.isPopular),
    isActive: plan.isActive !== false,
    isPublic: plan.isPublic !== false,
    entitlements: {
      maxStaffUsers: Number(plan.entitlements.maxStaffUsers),
      maxTables: Number(plan.entitlements.maxTables),
      maxReservations: Number(plan.entitlements.maxReservations),
      customDomain: Boolean(plan.entitlements.customDomain),
      advancedAnalytics: Boolean(plan.entitlements.advancedAnalytics),
      whatsapp: Boolean(plan.entitlements.whatsapp),
      sms: Boolean(plan.entitlements.sms),
      advancedSEO: Boolean(plan.entitlements.advancedSEO),
      waitlist: Boolean(plan.entitlements.waitlist),
      apiAccess: Boolean(plan.entitlements.apiAccess),
      ...(plan.entitlements || {}),
    },
    customFeatures: (plan.customFeatures || []).map(f => ({
      id: f.id || `feat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: f.title?.trim() || '',
      description: f.description?.trim() || '',
      enabled: f.enabled !== false,
    })).filter(f => Boolean(f.title)),
  };

  const planRef = doc(db, PLANS_COLLECTION, planId);
  await setDoc(planRef, {
    ...cleanPlan,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: 'superadmin.plan_saved',
    resource: `plans/${planId}`,
    details: {
      planName: cleanPlan.name,
      priceMonthly: cleanPlan.priceMonthly,
      isVisible: cleanPlan.isPublic && cleanPlan.isActive,
    },
    result: 'success',
  });

  return cleanPlan;
}

/**
 * Toggles whether a plan is displayed or hidden on the marketing website & registration.
 */
export async function togglePlanVisibility(
  planId: string, 
  isVisible: boolean, 
  actor?: User | null
): Promise<void> {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  await updateDoc(planRef, {
    isActive: isVisible,
    isPublic: isVisible,
    updatedAt: new Date().toISOString(),
  });

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: isVisible ? 'superadmin.plan_published' : 'superadmin.plan_hidden',
    resource: `plans/${planId}`,
    details: { isVisible },
    result: 'success',
  });
}

/**
 * Deletes a custom subscription plan from Firestore.
 */
export async function deletePlan(planId: string, actor?: User | null): Promise<void> {
  const planRef = doc(db, PLANS_COLLECTION, planId);
  await deleteDoc(planRef);

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: 'superadmin.plan_deleted',
    resource: `plans/${planId}`,
    details: { planId },
    result: 'success',
  });
}

/**
 * Resets plans in Firestore back to DEFAULT_PLANS.
 */
export async function resetPlansToDefault(actor?: User | null): Promise<Plan[]> {
  for (const p of DEFAULT_PLANS) {
    const planWithFlags: Plan = {
      ...p,
      isActive: true,
      isPublic: true,
    };
    await setDoc(doc(db, PLANS_COLLECTION, p.id), {
      ...planWithFlags,
      updatedAt: new Date().toISOString(),
    });
  }

  await logAuditAction({
    restaurantId: 'platform',
    restaurantName: APP_CONFIG.appName,
    userId: actor?.id || 'super_admin',
    userName: actor?.name || 'Super Admin',
    userEmail: actor?.email || 'admin@dinemasterpro.com',
    action: 'superadmin.plans_reset_defaults',
    resource: 'plans',
    details: { count: DEFAULT_PLANS.length },
    result: 'success',
  });

  return listAllPlans();
}
