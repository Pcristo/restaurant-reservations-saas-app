import { jsonResponse, errorResponse } from '../lib/response';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const { token, action } = body;

    if (!token) {
      return errorResponse('reCAPTCHA token is required', 400);
    }

    const secretKey = env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      // If no secret key is configured, we assume it's mock/disabled
      return jsonResponse({ success: true, score: 0.9, mock: true });
    }

    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const res = await fetch(verifyUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data: any = await res.json();

    if (!data.success) {
      return errorResponse('reCAPTCHA verification failed', 400, { codes: data['error-codes'] });
    }

    if (action && data.action !== action) {
      return errorResponse('reCAPTCHA action mismatch', 400);
    }

    if (data.score !== undefined && data.score < 0.5) {
      return errorResponse('reCAPTCHA score too low, suspected bot', 403, { score: data.score });
    }

    return jsonResponse({
      success: true,
      score: data.score,
      action: data.action
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Internal server error verifying reCAPTCHA', 500);
  }
}
