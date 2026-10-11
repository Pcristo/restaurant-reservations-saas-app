import { jsonResponse } from '../../lib/response';

export async function onRequest(_context?: any) {
  // Automated background cron emails are completely disabled to prevent unintended recurring emails
  return jsonResponse({
    success: true,
    message: 'Automated background reminder emails are disabled.',
    processed: 0,
    sent: 0
  });
}

