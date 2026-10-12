import { onRequestGet as healthHandler } from "../functions/api/health";
import { onRequestPost as sendSmsHandler } from "../functions/api/send-sms";
import { onRequestPost as confirmEmailHandler } from "../functions/api/email/confirmation";
import { onRequestPost as reminderEmailHandler } from "../functions/api/email/reminder";
import { onRequestPost as cancelEmailHandler } from "../functions/api/email/cancellation";
import { onRequestPost as updateEmailHandler } from "../functions/api/email/update";
import { onRequestPost as testEmailHandler } from "../functions/api/email/test";
import { onRequestPost as deleteUserByEmailHandler } from "../functions/api/admin/delete-user-by-email";
import { onRequestPost as deleteUserHandler } from "../functions/api/admin/delete-user";
import { onRequestPost as updatePasswordHandler } from "../functions/api/admin/update-password";
import { onRequestPost as updateAdminCredentialsHandler } from "../functions/api/admin/update-admin-credentials";
import { onRequestPost as createTenantHandler } from "../functions/api/admin/create-tenant";
import { onRequestPost as deleteRestaurantHandler } from "../functions/api/admin/delete-restaurant";
import { onRequestPost as contactHandler } from "../functions/api/contact";
import { onRequestPost as verifyRecaptchaHandler } from "../functions/api/verify-recaptcha";
import { onRequest as cronRemindersHandler } from "../functions/api/cron/reminders";
import { 
  onRequestPost as updateResendConfigHandler,
  onRequestGet as getResendConfigHandler 
} from "../functions/api/admin/update-resend-config";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  [key: string]: any;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException?(): void;
}

export interface ScheduledController {
  scheduledTime: number;
  cron: string;
  noRetry(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const context = {
      request,
      env,
      params: {},
      data: {},
      waitUntil: ctx.waitUntil ? ctx.waitUntil.bind(ctx) : () => {}
    };

    try {
      if (request.method === 'GET' && path === '/api/health') {
        return await healthHandler(context);
      }
      if (request.method === 'POST' && path === '/api/send-sms') {
        return await sendSmsHandler(context);
      }
      if (request.method === 'POST' && path === '/api/email/confirmation') {
        return await confirmEmailHandler(context);
      }
      if (request.method === 'POST' && path === '/api/email/reminder') {
        return await reminderEmailHandler(context);
      }
      if (request.method === 'POST' && path === '/api/email/cancellation') {
        return await cancelEmailHandler(context);
      }
      if (request.method === 'POST' && path === '/api/email/update') {
        return await updateEmailHandler(context);
      }
      if (request.method === 'POST' && path === '/api/email/test') {
        return await testEmailHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/delete-user-by-email') {
        return await deleteUserByEmailHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/delete-user') {
        return await deleteUserHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/update-password') {
        return await updatePasswordHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/update-admin-credentials') {
        return await updateAdminCredentialsHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/create-tenant') {
        return await createTenantHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/delete-restaurant') {
        return await deleteRestaurantHandler(context);
      }
      if (request.method === 'POST' && path === '/api/contact') {
        return await contactHandler(context);
      }
      if (request.method === 'POST' && path === '/api/verify-recaptcha') {
        return await verifyRecaptchaHandler(context);
      }
      if (path === '/api/cron/reminders') {
        return await cronRemindersHandler(context);
      }
      if (request.method === 'POST' && path === '/api/admin/update-resend-config') {
        return await updateResendConfigHandler(context);
      }
      if (request.method === 'GET' && (path === '/api/admin/update-resend-config' || path === '/api/admin/resend-config')) {
        return await getResendConfigHandler(context);
      }

      // Block unmapped /api/ routes
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: "Not Found" }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      // Serve static assets for anything else
      return env.ASSETS.fetch(request);
    } catch (error: any) {
      console.error("Worker fetch error:", error);
      return new Response(JSON.stringify({ success: false, error: error.message || "Internal Server Error" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const context = {
      request: new Request("http://localhost/api/cron/reminders", { method: 'POST' }),
      env,
      params: {},
      data: {},
      waitUntil: ctx.waitUntil ? ctx.waitUntil.bind(ctx) : () => {}
    };
    
    try {
      await cronRemindersHandler(context);
    } catch (error) {
      console.error("Scheduled task error:", error);
    }
  }
};
