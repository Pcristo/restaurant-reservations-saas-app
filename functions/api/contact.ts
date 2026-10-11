import { jsonResponse, errorResponse } from '../lib/response';
import { sendEmailViaResend } from '../lib/resend';
import { getPlatformSettings, getMarketingWebsiteSettingsRest } from '../lib/firebaseAdmin';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};

    const { name, email, restaurantName, phone, message, hp } = body;

    // Honeypot anti-spam check
    if (hp) {
      return jsonResponse({ success: true, message: 'Message received' });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return errorResponse('A valid name is required', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return errorResponse('A valid email address is required', 400);
    }

    if (!restaurantName || typeof restaurantName !== 'string' || restaurantName.trim().length < 2) {
      return errorResponse('Restaurant or business name is required', 400);
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return errorResponse('Message must be at least 5 characters long', 400);
    }

    // Determine destination email
    let destinationEmail = 'hello@dinemasterpro.com';
    let apiKey = (env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : '') || '').trim();
    let fromEmail = (env.RESEND_FROM_EMAIL || env.VITE_RESEND_FROM_EMAIL || (typeof process !== 'undefined' ? process.env?.RESEND_FROM_EMAIL : '') || '').trim();

    try {
      const platformSettings = await getPlatformSettings(env);
      if (platformSettings?.supportEmail) {
        destinationEmail = platformSettings.supportEmail;
      }
      if (platformSettings?.resendApiKey && !platformSettings.resendApiKey.startsWith('re_Yuqc') && platformSettings.resendApiKey !== 're_BhHd1XYg_HoaEBLAvnEPC3ES46ygkLjzJ') {
        apiKey = platformSettings.resendApiKey.trim();
      }
      if (platformSettings?.senderEmail && platformSettings.senderEmail.includes('@') && !platformSettings.senderEmail.startsWith('re_')) {
        fromEmail = platformSettings.senderEmail.trim();
      }
    } catch (e) {
      console.warn('[Contact Edge] Notice loading platform settings:', e);
    }

    try {
      const marketingSettings = await getMarketingWebsiteSettingsRest(env);
      if (marketingSettings?.contact?.destinationEmail) {
        destinationEmail = marketingSettings.contact.destinationEmail;
      } else if (marketingSettings?.general?.contactEmail) {
        destinationEmail = marketingSettings.general.contactEmail;
      }
    } catch (e) {
      console.warn('[Contact Edge] Notice loading marketing settings:', e);
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanRestaurant = restaurantName.trim();
    const cleanPhone = (phone || '').trim();
    const cleanMessage = message.trim();

    const subject = `New Inquiry: ${cleanRestaurant} (${cleanName})`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 24px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #f59e0b; }
          .header p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
          .content { padding: 28px; }
          .field { margin-bottom: 18px; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; margin-bottom: 4px; }
          .value { font-size: 15px; color: #0f172a; font-weight: 500; }
          .message-box { background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; font-size: 14px; color: #334155; white-space: pre-wrap; }
          .footer { padding: 18px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DineMaster Pro • New Contact Submission</h1>
            <p>A restaurant operator submitted an inquiry via the public marketing page</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Contact Name</div>
              <div class="value">${cleanName}</div>
            </div>
            <div class="field">
              <div class="label">Email Address</div>
              <div class="value"><a href="mailto:${cleanEmail}" style="color: #d97706; text-decoration: none;">${cleanEmail}</a></div>
            </div>
            <div class="field">
              <div class="label">Restaurant / Business Name</div>
              <div class="value">${cleanRestaurant}</div>
            </div>
            ${cleanPhone ? `
            <div class="field">
              <div class="label">Phone Number</div>
              <div class="value">${cleanPhone}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="label">Inquiry Message</div>
              <div class="message-box">${cleanMessage}</div>
            </div>
          </div>
          <div class="footer">
            Submitted from DineMaster Pro Marketing Website on ${new Date().toUTCString()}
          </div>
        </div>
      </body>
      </html>
    `;

    // Attempt to send email via Resend if credentials are configured
    let emailSent = false;
    if (apiKey) {
      try {
        const sendResult = await sendEmailViaResend({
          to: destinationEmail,
          subject,
          html,
          apiKey,
          fromEmail,
          restaurantName: 'DineMaster Pro SaaS'
        }, env);
        emailSent = sendResult.success;
      } catch (sendErr) {
        console.warn('[Contact Edge] Warning sending email via Resend:', sendErr);
      }
    } else {
      console.log('[Contact Edge] Resend API key not configured, inquiry received and logged.');
    }

    return jsonResponse({
      success: true,
      message: 'Thank you for contacting us! Our team will get back to you shortly.',
      emailSent
    });
  } catch (err: any) {
    console.error('[Contact Edge] Unexpected error:', err);
    return errorResponse(err?.message || 'Internal server error processing contact request', 500);
  }
}
