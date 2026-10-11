import { jsonResponse, errorResponse } from '../../lib/response';
import { 
  saveFirestoreDocRest, 
  verifyAuthToken, 
  createUserInAuth, 
  lookupUserByEmail, 
  updateUserInAuth 
} from '../../lib/firebaseAdmin';

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
      restaurantId, 
      ownerEmail, 
      ownerName, 
      password, 
      ownerUid: providedUid 
    } = body;

    if (!restaurantId || !restaurantId.trim()) {
      return errorResponse('Restaurant ID is required', 400);
    }
    if (!ownerEmail || !ownerEmail.trim()) {
      return errorResponse('Admin / Owner email is required', 400);
    }

    const cleanEmail = ownerEmail.trim().toLowerCase();
    const cleanName = (ownerName || '').trim() || 'Restaurant Admin';
    let finalUid = (providedUid || '').trim();

    // 1. Look up existing user in Firebase Auth
    const lookup = await lookupUserByEmail(cleanEmail, env);
    const authUser = lookup.success ? lookup.user : null;

    if (authUser?.localId) {
      finalUid = authUser.localId;
      // User exists in Firebase Auth -> update password and/or displayName
      const updates: { password?: string; displayName?: string } = {};
      if (password && password.trim()) {
        if (password.trim().length < 6) {
          return errorResponse('Password must be at least 6 characters long', 400);
        }
        updates.password = password.trim();
      }
      if (cleanName) {
        updates.displayName = cleanName;
      }

      if (Object.keys(updates).length > 0) {
        const updateRes = await updateUserInAuth(finalUid, updates, env);
        if (!updateRes.success) {
          return errorResponse(updateRes.error || 'Failed to update credentials in Auth', 400);
        }
      }
    } else {
      // User does NOT exist in Auth yet
      // If password provided, create user account in Firebase Auth
      if (password && password.trim()) {
        if (password.trim().length < 6) {
          return errorResponse('Password must be at least 6 characters long', 400);
        }
        const createRes = await createUserInAuth(cleanEmail, password.trim(), cleanName, env);
        if (!createRes.success || !createRes.uid) {
          return errorResponse(createRes.error || 'Failed to create user account in Firebase Auth', 400);
        }
        finalUid = createRes.uid;
      } else {
        // Fallback UID if no password provided yet
        finalUid = finalUid || `admin-${Date.now()}`;
      }
    }

    const now = new Date().toISOString();

    // 2. Update or create user document in Firestore `users` collection
    if (finalUid) {
      try {
        await saveFirestoreDocRest('users', finalUid, {
          id: finalUid,
          authUid: finalUid,
          email: cleanEmail,
          name: cleanName,
          role: 'restaurant_owner',
          restaurantId: restaurantId,
          restaurantIds: [restaurantId],
          status: 'active',
          updatedAt: now
        }, env, token);
      } catch (uErr) {
        console.warn('[UpdateAdminCredentials] Warning saving users doc:', uErr);
      }
    }

    // 3. Update restaurant document in Firestore `restaurants` collection
    try {
      await saveFirestoreDocRest('restaurants', restaurantId, {
        ownerEmail: cleanEmail,
        ownerName: cleanName,
        ownerId: finalUid || 'owner',
        updatedAt: now
      }, env, token);
    } catch (rErr) {
      console.warn('[UpdateAdminCredentials] Warning saving restaurant doc:', rErr);
    }

    return jsonResponse({
      success: true,
      ownerUid: finalUid,
      ownerEmail: cleanEmail,
      ownerName: cleanName,
      message: password ? 'Password and credentials updated successfully!' : 'Admin credentials updated successfully!'
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error updating admin credentials', 500);
  }
}
