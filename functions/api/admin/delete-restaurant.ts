import { jsonResponse, errorResponse } from '../../lib/response';
import { 
  deleteFirestoreDocRest, 
  deleteMatchingDocsRest, 
  verifyAuthToken 
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
        console.warn('[DeleteRestaurant] Token verification warning:', authCheck.error);
      }
    }

    const restaurantId = (body.restaurantId || body.id || '').trim();
    if (!restaurantId) {
      return errorResponse('Restaurant ID is required', 400);
    }

    console.log(`[DeleteRestaurant] Processing deletion for restaurant tenant: ${restaurantId}`);

    // 1. Delete main restaurant document
    const delRest = await deleteFirestoreDocRest('restaurants', restaurantId, env, token);
    if (!delRest.success) {
      console.warn(`[DeleteRestaurant] Warning deleting restaurant ${restaurantId}:`, delRest.error);
    }

    // 2. Delete settings document
    await deleteFirestoreDocRest('settings', restaurantId, env, token).catch(() => {});

    // 3. Delete dining areas
    await deleteMatchingDocsRest('areas', 'restaurantId', restaurantId, env, token).catch(() => {});

    // 4. Delete tables
    await deleteMatchingDocsRest('tables', 'restaurantId', restaurantId, env, token).catch(() => {});

    // 5. Delete custom domain records
    await deleteMatchingDocsRest('restaurant_domains', 'restaurantId', restaurantId, env, token).catch(() => {});
    await deleteMatchingDocsRest('domains', 'restaurantId', restaurantId, env, token).catch(() => {});

    // 6. Delete reservations
    await deleteMatchingDocsRest('reservations', 'restaurantId', restaurantId, env, token).catch(() => {});

    // 7. Delete customers
    await deleteMatchingDocsRest('customers', 'restaurantId', restaurantId, env, token).catch(() => {});

    // 8. Delete smart alerts
    await deleteMatchingDocsRest('smart_alerts', 'restaurantId', restaurantId, env, token).catch(() => {});

    return jsonResponse({
      success: true,
      restaurantId,
      message: `Restaurant "${restaurantId}" and its associated data were permanently deleted.`
    });
  } catch (err: any) {
    console.error('[DeleteRestaurant] Unexpected error:', err);
    return errorResponse(err?.message || 'Internal server error deleting restaurant', 500);
  }
}
