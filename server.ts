import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { onRequestGet as healthHandler } from "./functions/api/health";
import { onRequestPost as sendSmsHandler } from "./functions/api/send-sms";
import { onRequestPost as confirmEmailHandler } from "./functions/api/email/confirmation";
import { onRequestPost as reminderEmailHandler } from "./functions/api/email/reminder";
import { onRequestPost as cancelEmailHandler } from "./functions/api/email/cancellation";
import { onRequestPost as updateEmailHandler } from "./functions/api/email/update";
import { onRequestPost as testEmailHandler } from "./functions/api/email/test";
import { onRequestPost as deleteUserByEmailHandler } from "./functions/api/admin/delete-user-by-email";
import { onRequestPost as deleteUserHandler } from "./functions/api/admin/delete-user";
import { onRequestPost as updatePasswordHandler } from "./functions/api/admin/update-password";
import { onRequestPost as updateAdminCredentialsHandler } from "./functions/api/admin/update-admin-credentials";
import { onRequestPost as createTenantHandler } from "./functions/api/admin/create-tenant";
import { onRequestPost as deleteRestaurantHandler } from "./functions/api/admin/delete-restaurant";
import { onRequestPost as contactHandler } from "./functions/api/contact";
import { onRequestPost as verifyRecaptchaHandler } from "./functions/api/verify-recaptcha";
import { onRequest as cronRemindersHandler } from "./functions/api/cron/reminders";
import { 
  onRequestPost as updateResendConfigHandler,
  onRequestGet as getResendConfigHandler 
} from "./functions/api/admin/update-resend-config";

// Preserve existing environment secrets by setting override: false
dotenv.config({ override: false });

// Sanitize from email if misconfigured or mistakenly set to API key
if (!process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL.startsWith('re_') || !process.env.RESEND_FROM_EMAIL.includes('@')) {
  process.env.RESEND_FROM_EMAIL = 'DineMaster Pro <reservations@wordwide.pro>';
}

// Adapter to execute Cloudflare Pages Function handlers inside Express for local development
function adaptFunction(handler: (context: any) => Promise<Response>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const url = `${req.protocol}://${req.get('host') || 'localhost:3000'}${req.originalUrl}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v) {
          if (Array.isArray(v)) {
            v.forEach(val => headers.append(k, val));
          } else {
            headers.set(k, v);
          }
        }
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const webRequest = new Request(url, init);
      const context = {
        request: webRequest,
        env: process.env,
        params: req.params,
        data: {}
      };

      const webResponse = await handler(context);
      
      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const responseBody = await webResponse.text();
      res.send(responseBody);
    } catch (err: any) {
      console.error('[Local Dev Functions Adapter Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Internal server error executing function' });
    }
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Cloudflare Pages Function Routes
  app.get('/api/health', adaptFunction(healthHandler));
  app.post('/api/send-sms', adaptFunction(sendSmsHandler));
  app.post('/api/email/confirmation', adaptFunction(confirmEmailHandler));
  app.post('/api/email/reminder', adaptFunction(reminderEmailHandler));
  app.post('/api/email/cancellation', adaptFunction(cancelEmailHandler));
  app.post('/api/email/update', adaptFunction(updateEmailHandler));
  app.post('/api/email/test', adaptFunction(testEmailHandler));
  app.post('/api/admin/delete-user-by-email', adaptFunction(deleteUserByEmailHandler));
  app.post('/api/admin/delete-user', adaptFunction(deleteUserHandler));
  app.post('/api/admin/update-password', adaptFunction(updatePasswordHandler));
  app.post('/api/admin/update-admin-credentials', adaptFunction(updateAdminCredentialsHandler));
  app.post('/api/admin/create-tenant', adaptFunction(createTenantHandler));
  app.post('/api/admin/delete-restaurant', adaptFunction(deleteRestaurantHandler));
  app.post('/api/contact', adaptFunction(contactHandler));
  app.post('/api/verify-recaptcha', adaptFunction(verifyRecaptchaHandler));
  app.all('/api/cron/reminders', adaptFunction(cronRemindersHandler));
  app.post('/api/admin/update-resend-config', adaptFunction(updateResendConfigHandler));
  app.get('/api/admin/update-resend-config', adaptFunction(getResendConfigHandler));
  app.get('/api/admin/resend-config', adaptFunction(getResendConfigHandler));


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Ensure Service Worker and Web Manifest are not aggressively cached
        if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    // Important: Use * for Express v4 to handle SPA routing properly
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
