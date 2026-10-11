import { jsonResponse, errorResponse } from '../../lib/response';
import fs from 'fs';
import path from 'path';

export async function onRequestGet(context: any) {
  try {
    const env = context.env || {};
    const key = (
      env.RESEND_API_KEY ||
      env.VITE_RESEND_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : '') ||
      ''
    ).trim();

    const fromEmail = (
      env.RESEND_FROM_EMAIL ||
      env.VITE_RESEND_FROM_EMAIL ||
      (typeof process !== 'undefined' ? process.env?.RESEND_FROM_EMAIL : '') ||
      'DineMaster Pro <reservations@wordwide.pro>'
    ).trim();

    let verifiedDomains: Array<{ name: string; status: string }> = [];
    let isValid = false;

    if (key && key.startsWith('re_')) {
      try {
        const res = await fetch('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${key}` }
        });
        if (res.ok) {
          isValid = true;
          const data: any = await res.json().catch(() => ({}));
          if (Array.isArray(data?.data)) {
            verifiedDomains = data.data.map((d: any) => ({
              name: d.name,
              status: d.status
            }));
          }
        }
      } catch (checkErr) {
        console.warn('[resend-config] Could not verify domains with Resend API:', checkErr);
      }
    }

    const maskedKey = key
      ? `${key.slice(0, 7)}${'•'.repeat(Math.max(0, key.length - 11))}${key.slice(-4)}`
      : '';

    return jsonResponse({
      success: true,
      hasKey: Boolean(key),
      isValid,
      maskedKey,
      rawKeyPreview: key ? `${key.slice(0, 7)}...` : '',
      senderEmail: fromEmail,
      verifiedDomains
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to fetch Resend config', 500);
  }
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const { resendApiKey, senderEmail, senderName } = body;

    if (!resendApiKey || !resendApiKey.trim()) {
      return errorResponse('Resend API key is required', 400);
    }

    const cleanKey = resendApiKey.trim();
    const cleanEmail = (senderEmail || '').trim();
    const cleanName = (senderName || '').trim();

    // Verify key against Resend API
    let verifiedDomains: Array<{ name: string; status: string }> = [];
    let isKeyValid = false;
    try {
      const testRes = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${cleanKey}` }
      });
      if (testRes.ok) {
        isKeyValid = true;
        const testData: any = await testRes.json().catch(() => ({}));
        if (Array.isArray(testData?.data)) {
          verifiedDomains = testData.data.map((d: any) => ({
            name: d.name,
            status: d.status
          }));
        }
      } else {
        const errJson: any = await testRes.json().catch(() => ({}));
        return errorResponse(errJson?.message || `Invalid Resend API key (HTTP ${testRes.status})`, 400);
      }
    } catch (netErr: any) {
      console.warn('[update-resend-config] Network check warning:', netErr);
      // Proceed if temporary network glitch
      isKeyValid = true;
    }

    // 1. Update runtime environment variables in Node process
    if (typeof process !== 'undefined' && process.env) {
      process.env.RESEND_API_KEY = cleanKey;
      if (cleanEmail && cleanEmail.includes('@') && !cleanEmail.startsWith('re_')) {
        process.env.RESEND_FROM_EMAIL = cleanName 
          ? `${cleanName} <${cleanEmail}>` 
          : cleanEmail;
      }
    }

    // 2. Persist to .env file on disk if writable
    try {
      const envPath = path.join(process.cwd(), '.env');
      let currentContent = '';
      if (fs.existsSync(envPath)) {
        currentContent = fs.readFileSync(envPath, 'utf8');
      }

      const lines = currentContent.split('\n');
      let hasKey = false;
      let hasFrom = false;

      const newFromVal = cleanEmail && cleanEmail.includes('@') && !cleanEmail.startsWith('re_')
        ? (cleanName ? `${cleanName} <${cleanEmail}>` : cleanEmail)
        : 'DineMaster Pro <reservations@wordwide.pro>';

      const newLines = lines.map(line => {
        if (line.startsWith('RESEND_API_KEY=')) {
          hasKey = true;
          return `RESEND_API_KEY="${cleanKey}"`;
        }
        if (line.startsWith('RESEND_FROM_EMAIL=')) {
          hasFrom = true;
          return `RESEND_FROM_EMAIL="${newFromVal}"`;
        }
        return line;
      });

      if (!hasKey) {
        newLines.push(`RESEND_API_KEY="${cleanKey}"`);
      }
      if (!hasFrom) {
        newLines.push(`RESEND_FROM_EMAIL="${newFromVal}"`);
      }

      fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
    } catch (fsErr) {
      console.warn('[update-resend-config] Could not write to .env:', fsErr);
    }

    return jsonResponse({
      success: true,
      message: 'Resend API key verified and updated successfully in server runtime and environment.',
      resendApiKey: `${cleanKey.slice(0, 7)}...`,
      senderEmail: cleanEmail || undefined,
      verifiedDomains
    });
  } catch (err: any) {
    return errorResponse(err?.message || 'Failed to update Resend API key', 500);
  }
}
