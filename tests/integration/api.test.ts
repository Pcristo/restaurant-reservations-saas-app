import { describe, it, expect } from 'bun:test';
import { onRequestGet as healthHandler } from '../../functions/api/health';
import { onRequestPost as sendSmsHandler } from '../../functions/api/send-sms';
import { onRequestPost as emailConfirmationHandler } from '../../functions/api/email/confirmation';

describe('Functions API Integration Tests', () => {
  it('handles /api/health check request', async () => {
    const request = new Request('http://localhost:3000/api/health', {
      method: 'GET'
    });

    const context = {
      request,
      env: {},
      params: {},
      data: {},
      waitUntil: () => {}
    };

    const response = await healthHandler(context);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.environment).toBe('cloudflare-pages');
  });

  it('validates missing email on /api/email/confirmation', async () => {
    const request = new Request('http://localhost:3000/api/email/confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // missing email
        customerName: 'Test Customer'
      })
    });

    const context = {
      request,
      env: {},
      params: {},
      data: {},
      waitUntil: () => {}
    };

    const response = await emailConfirmationHandler(context);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Recipient email address is required');
  });

  it('validates missing payload on /api/send-sms', async () => {
    const request = new Request('http://localhost:3000/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const context = {
      request,
      env: {},
      params: {},
      data: {},
      waitUntil: () => {}
    };

    const response = await sendSmsHandler(context);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
