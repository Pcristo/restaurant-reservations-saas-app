import { jsonResponse, errorResponse } from '../../lib/response';
import { buildReminderEmail } from '../../lib/emailTemplates';
import { sendEmailViaResend } from '../../lib/resend';
import { getFirestoreSettings, getPlatformSettings } from '../../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};

    if (!body.email) {
      return errorResponse('Recipient email address is required', 400);
    }

    // SECURITY REQUIREMENT: Do NOT trust frontend parameters for contact/branding info.
    // ALWAYS load from Firestore based on the reservation's restaurantId.
    let resendApiKey = (env.VITE_RESEND_API_KEY || env.RESEND_API_KEY || (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : '') || '').trim();
    let resendFromEmail = (env.VITE_RESEND_FROM_EMAIL || env.RESEND_FROM_EMAIL || (typeof process !== 'undefined' ? process.env?.RESEND_FROM_EMAIL : '') || '').trim();
    let restaurantName = (body.restaurantName || '').trim() || 'DineMaster Bistro';
    let logoUrl = (body.logoUrl || '').trim();
    let restaurantEmail = (body.restaurantEmail || '').trim();
    let restaurantPhone = (body.restaurantPhone || '').trim();
    let restaurantAddress = (body.restaurantAddress || '').trim();
    let restaurantWebsite = (body.restaurantWebsite || '').trim();
    let timezone = (body.timezone || '').trim() || 'Europe/Lisbon';

    try {
      const platformSettings = await getPlatformSettings(env);
      if (platformSettings?.resendApiKey && !platformSettings.resendApiKey.startsWith('re_Yuqc') && platformSettings.resendApiKey !== 're_BhHd1XYg_HoaEBLAvnEPC3ES46ygkLjzJ') {
        resendApiKey = platformSettings.resendApiKey.trim();
      }
      if (platformSettings?.senderEmail && platformSettings.senderEmail.includes('@') && !platformSettings.senderEmail.startsWith('re_')) {
        resendFromEmail = platformSettings.senderEmail.trim();
      }

      const settings = await getFirestoreSettings(env, body.restaurantId);
      if (settings?.resendApiKey && settings.resendApiKey.startsWith('re_')) {
        resendApiKey = settings.resendApiKey.trim();
      }
      if (settings?.resendFromEmail && settings.resendFromEmail.includes('@') && !settings.resendFromEmail.startsWith('re_')) {
        resendFromEmail = settings.resendFromEmail.trim();
      }
      if (settings?.name || settings?.restaurantName) {
        restaurantName = (settings.name || settings.restaurantName).trim();
      }
      if (settings?.logoUrl) {
        logoUrl = settings.logoUrl.trim();
      } else if (settings?.cloudinaryLogoUrl) {
        logoUrl = settings.cloudinaryLogoUrl.trim();
      } else if (settings?.branding?.logoUrl) {
        logoUrl = settings.branding.logoUrl.trim();
      }
      if (logoUrl && logoUrl.includes('vecteezy.com')) {
        logoUrl = '';
      }
      if (settings?.email) restaurantEmail = settings.email.trim();
      if (settings?.phone) restaurantPhone = settings.phone.trim();
      if (settings?.address) {
        restaurantAddress = settings.address.trim();
        if (settings.city && !restaurantAddress.includes(settings.city)) {
          restaurantAddress += `, ${settings.city.trim()}`;
        }
      }
      if (settings?.websiteUrl || settings?.website) {
        restaurantWebsite = (settings.websiteUrl || settings.website).trim();
      }
      if (settings?.timezone) timezone = settings.timezone.trim();
    } catch (e) {
      console.warn('[Reminder Edge] Failed to fetch settings:', e);
    }

    const { subject, html } = buildReminderEmail({
      ...body,
      resendApiKey,
      resendFromEmail,
      restaurantName,
      logoUrl,
      restaurantEmail,
      restaurantPhone,
      restaurantAddress,
      restaurantWebsite,
      timezone
    });

    const result = await sendEmailViaResend({
      to: body.email,
      subject,
      html,
      apiKey: resendApiKey,
      fromEmail: resendFromEmail,
      restaurantName: restaurantName
    }, env);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send reminder email', result.status || 400);
    }

    return jsonResponse({
      success: true,
      messageId: result.messageId
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error sending reminder email', 500);
  }
}
