import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  writeBatch, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_RESTAURANT_ID } from '../services/tenantService';

export interface MigrationSummary {
  defaultRestaurantCreated: boolean;
  reservationsMigrated: number;
  customersMigrated: number;
  tablesMigrated: number;
  areasMigrated: number;
  usersMigrated: number;
  plansSeeded: number;
  platformSettingsSeeded: boolean;
}

/**
 * Migrates existing legacy single-tenant data to be scoped under a restaurantId
 * and provisions initial SaaS platform records (plans, platform settings, default restaurant).
 */
export async function runMultiTenantMigration(
  targetRestaurantId: string = DEFAULT_RESTAURANT_ID
): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    defaultRestaurantCreated: false,
    reservationsMigrated: 0,
    customersMigrated: 0,
    tablesMigrated: 0,
    areasMigrated: 0,
    usersMigrated: 0,
    plansSeeded: 0,
    platformSettingsSeeded: false,
  };

  // 1. Check or initialize default restaurant doc
  const restaurantRef = doc(db, 'restaurants', targetRestaurantId);
  const restaurantSnap = await getDoc(restaurantRef);

  if (!restaurantSnap.exists()) {
    // Read from settings/main if available to retain existing name, logo, etc.
    let initialName = 'Default Restaurant';
    let initialEmail = 'contact@eataapp.com';
    let initialPhone = '+351 912 345 678';
    let initialAddress = 'Av. da Liberdade, Lisboa, Portugal';
    let initialLogo = '';
    let initialHero = '';

    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
      if (settingsSnap.exists()) {
        const d = settingsSnap.data();
        if (d.name) initialName = d.name;
        if (d.email) initialEmail = d.email;
        if (d.phone) initialPhone = d.phone;
        if (d.address) initialAddress = d.address;
        if (d.logoUrl) initialLogo = d.logoUrl;
        if (d.heroImageUrl) initialHero = d.heroImageUrl;
      }
    } catch {
      // Ignore reading error if settings doesn't exist
    }

    await setDoc(restaurantRef, {
      id: targetRestaurantId,
      name: initialName,
      slug: 'default',
      subdomain: 'default',
      email: initialEmail,
      phone: initialPhone,
      address: initialAddress,
      country: 'PT',
      timezone: 'Europe/Lisbon',
      currency: 'EUR',
      status: 'active',
      planId: 'business',
      branding: {
        logoUrl: initialLogo,
        coverImageUrl: initialHero,
        primaryColor: '#D97706',
        accentColor: '#B45309',
        fontFamily: 'Plus Jakarta Sans',
        theme: 'light',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    summary.defaultRestaurantCreated = true;
  }

  // 2. Migrate reservations missing restaurantId
  try {
    const resSnap = await getDocs(collection(db, 'reservations'));
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of resSnap.docs) {
      const data = docSnap.data();
      if (!data.restaurantId) {
        batch.update(docSnap.ref, { restaurantId: targetRestaurantId });
        count++;
        summary.reservationsMigrated++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
    }
    if (count % 400 !== 0 && count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Migration warning for reservations:', err);
  }

  // 3. Migrate customers missing restaurantId
  try {
    const custSnap = await getDocs(collection(db, 'customers'));
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of custSnap.docs) {
      const data = docSnap.data();
      if (!data.restaurantId) {
        batch.update(docSnap.ref, { restaurantId: targetRestaurantId });
        count++;
        summary.customersMigrated++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
    }
    if (count % 400 !== 0 && count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Migration warning for customers:', err);
  }

  // 4. Migrate tables missing restaurantId
  try {
    const tabSnap = await getDocs(collection(db, 'tables'));
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of tabSnap.docs) {
      const data = docSnap.data();
      if (!data.restaurantId) {
        batch.update(docSnap.ref, { restaurantId: targetRestaurantId });
        count++;
        summary.tablesMigrated++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
    }
    if (count % 400 !== 0 && count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Migration warning for tables:', err);
  }

  // 5. Migrate areas missing restaurantId
  try {
    const areaSnap = await getDocs(collection(db, 'areas'));
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of areaSnap.docs) {
      const data = docSnap.data();
      if (!data.restaurantId) {
        batch.update(docSnap.ref, { restaurantId: targetRestaurantId });
        count++;
        summary.areasMigrated++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
    }
    if (count % 400 !== 0 && count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Migration warning for areas:', err);
  }

  // 6. Migrate staff users missing restaurantId
  try {
    const userSnap = await getDocs(collection(db, 'users'));
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnap of userSnap.docs) {
      const data = docSnap.data();
      const isSuperAdminEmail = 
        data.email === 'pcristo35@gmail.com' || 
        data.role === 'superadmin';

      if (!isSuperAdminEmail && !data.restaurantId && (data.role === 'admin' || data.role === 'staff')) {
        batch.update(docSnap.ref, { restaurantId: targetRestaurantId });
        count++;
        summary.usersMigrated++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
    }
    if (count % 400 !== 0 && count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('Migration warning for users:', err);
  }

  // 7. Seed initial SaaS plans if none exist
  try {
    const plansSnap = await getDocs(collection(db, 'plans'));
    if (plansSnap.empty) {
      const defaultPlans = [
        {
          id: 'starter',
          name: 'Starter',
          priceMonthly: 19,
          priceYearly: 190,
          currency: 'EUR',
          maxReservationsMonthly: 200,
          maxTables: 15,
          customDomainEnabled: false,
          smsNotificationsEnabled: false,
          analyticsEnabled: false,
          multiLanguageEnabled: true,
          apiAccessEnabled: false,
          supportLevel: 'community',
        },
        {
          id: 'professional',
          name: 'Professional',
          priceMonthly: 49,
          priceYearly: 490,
          currency: 'EUR',
          maxReservationsMonthly: 1000,
          maxTables: 40,
          customDomainEnabled: true,
          smsNotificationsEnabled: true,
          analyticsEnabled: true,
          multiLanguageEnabled: true,
          apiAccessEnabled: false,
          supportLevel: 'standard',
        },
        {
          id: 'business',
          name: 'Business Pro',
          priceMonthly: 99,
          priceYearly: 990,
          currency: 'EUR',
          maxReservationsMonthly: 5000,
          maxTables: 100,
          customDomainEnabled: true,
          smsNotificationsEnabled: true,
          analyticsEnabled: true,
          multiLanguageEnabled: true,
          apiAccessEnabled: true,
          supportLevel: 'priority',
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          priceMonthly: 199,
          priceYearly: 1990,
          currency: 'EUR',
          maxReservationsMonthly: -1,
          maxTables: -1,
          customDomainEnabled: true,
          smsNotificationsEnabled: true,
          analyticsEnabled: true,
          multiLanguageEnabled: true,
          apiAccessEnabled: true,
          supportLevel: 'dedicated',
        },
      ];

      for (const p of defaultPlans) {
        await setDoc(doc(db, 'plans', p.id), p);
        summary.plansSeeded++;
      }
    }
  } catch (err) {
    console.warn('Migration warning for plans:', err);
  }

  // 8. Seed platform settings if not existing
  try {
    const settingsSnap = await getDoc(doc(db, 'platform_settings', 'general'));
    if (!settingsSnap.exists()) {
      await setDoc(doc(db, 'platform_settings', 'general'), {
        platformName: 'EataApp SaaS',
        platformDomain: 'eataapp.com',
        cnameTarget: 'cname.eataapp.com',
        cloudflareCname: 'domains.eataapp.com',
        allowSelfRegistration: true,
        trialDurationDays: 14,
        supportEmail: 'support@eataapp.com',
        updatedAt: new Date().toISOString(),
      });
      summary.platformSettingsSeeded = true;
    }
  } catch (err) {
    console.warn('Migration warning for platform settings:', err);
  }

  return summary;
}
