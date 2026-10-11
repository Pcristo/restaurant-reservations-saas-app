import { jsonResponse, errorResponse } from '../../lib/response';
import { saveFirestoreDocRest, verifyAuthToken, createUserInAuth, lookupUserByEmail, updateUserPasswordInAuth } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const authHeader = context.request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Verify token if provided
    if (token) {
      const authCheck = await verifyAuthToken(token, env);
      if (!authCheck.success) {
        return errorResponse(authCheck.error || 'Unauthorized', 401);
      }
    }

    const { 
      name, 
      ownerEmail, 
      ownerName, 
      ownerPassword,
      ownerUid: providedOwnerUid,
      onlyLookupAuth,
      country, 
      currency, 
      timezone, 
      language, 
      planId, 
      status, 
      slug 
    } = body;

    // Special quick action: auth lookup / password set
    if (onlyLookupAuth && ownerEmail) {
      const cleanEmail = ownerEmail.trim().toLowerCase();
      const lookup = await lookupUserByEmail(cleanEmail, env);
      if (lookup.success && lookup.user) {
        if (ownerPassword) {
          await updateUserPasswordInAuth(lookup.user.localId, ownerPassword, env);
        }
        return jsonResponse({ success: true, ownerUid: lookup.user.localId });
      }
      return errorResponse('User not found', 404);
    }

    if (!name || !name.trim()) {
      return errorResponse('Restaurant name is required', 400);
    }
    if (!ownerEmail || !ownerEmail.trim()) {
      return errorResponse('Owner email is required', 400);
    }

    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) || `rest-${Date.now()}`;
    const id = cleanSlug;
    const now = new Date().toISOString();

    let ownerUid = providedOwnerUid || '';

    // Create or link Firebase Auth user for the tenant owner if password is provided
    if (ownerPassword && ownerPassword.trim()) {
      try {
        const authRes = await createUserInAuth(
          ownerEmail.trim().toLowerCase(), 
          ownerPassword.trim(), 
          (ownerName || name).trim(), 
          env
        );
        if (authRes.success && authRes.uid) {
          ownerUid = authRes.uid;
        } else {
          console.warn('[CreateTenant] Auth user creation warning:', authRes.error);
        }
      } catch (authErr: any) {
        console.warn('[CreateTenant] Error creating auth user:', authErr?.message);
      }
    } else if (!ownerUid) {
      // Look up existing UID by email
      try {
        const lookup = await lookupUserByEmail(ownerEmail.trim().toLowerCase(), env);
        if (lookup.success && lookup.user?.localId) {
          ownerUid = lookup.user.localId;
        }
      } catch (lookupErr) {
        console.warn('[CreateTenant] Lookup by email notice:', lookupErr);
      }
    }

    const newRestaurant = {
      id,
      name: name.trim(),
      slug: cleanSlug,
      ownerId: ownerUid || 'owner',
      ownerEmail: ownerEmail.trim().toLowerCase(),
      ownerName: (ownerName || 'Owner').trim(),
      country: country || 'ireland',
      currency: currency || 'EUR',
      timezone: timezone || 'Europe/Dublin',
      language: language || 'en',
      planId: planId || 'professional',
      status: status || 'active',
      createdAt: now,
      updatedAt: now,
      branding: {
        primaryColor: '#f59e0b',
        secondaryColor: '#1e293b',
        accentColor: '#10b981',
        displayName: name.trim(),
        theme: 'light',
        buttonStyle: 'rounded'
      }
    };

    // 1. If ownerUid exists, save/update the user profile in Firestore
    if (ownerUid) {
      try {
        await saveFirestoreDocRest('users', ownerUid, {
          id: ownerUid,
          authUid: ownerUid,
          email: ownerEmail.trim().toLowerCase(),
          name: (ownerName || 'Owner').trim(),
          role: 'restaurant_owner',
          restaurantId: id,
          restaurantIds: [id],
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }, env, token);
      } catch (uErr) {
        console.warn('[CreateTenant] Notice saving user doc in Firestore:', uErr);
      }
    }

    // 2. Save restaurant doc
    const restRes = await saveFirestoreDocRest('restaurants', id, newRestaurant, env, token);
    if (!restRes.success) {
      return errorResponse(restRes.error || 'Failed to create restaurant document', 500);
    }

    // 3. Save main area doc
    const mainAreaId = `area-${id}-main`;
    await saveFirestoreDocRest('areas', mainAreaId, {
      id: mainAreaId,
      restaurantId: id,
      name: 'Main Dining Room',
      order: 1,
      allowOnlineReservations: true,
      bookingMode: 'online'
    }, env, token);

    // 4. Save initial settings doc
    await saveFirestoreDocRest('settings', id, {
      id,
      restaurantId: id,
      name: name.trim(),
      email: ownerEmail.trim(),
      timezone: timezone || 'Europe/Dublin',
      description: `${name.trim()} is pleased to welcome you for an exceptional dining experience.`,
      descriptionEn: `${name.trim()} is pleased to welcome you for an exceptional dining experience.`,
      branding: {
        primaryColor: '#f59e0b',
        secondaryColor: '#1e293b',
        accentColor: '#10b981',
        displayName: name.trim(),
        theme: 'light',
        buttonStyle: 'rounded'
      }
    }, env, token);

    return jsonResponse({
      success: true,
      restaurant: newRestaurant,
      ownerUid: ownerUid || undefined,
      message: 'Restaurant tenant and owner account created successfully'
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error creating restaurant', 500);
  }
}
