import React from 'react';
import { Globe, AlertTriangle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { APP_CONFIG } from '../data/appConfig';
import { isPlatformHost } from '../lib/utils';

export const DomainErrorPage: React.FC = () => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'custom-domain.com';
  const isPlatform = isPlatformHost(currentHost);
  const portalUrl = isPlatform ? '/' : `https://${APP_CONFIG.companyName.toLowerCase()}.com`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Globe className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Domain Configuration Required
        </h1>

        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          The domain <strong className="text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{currentHost}</strong> is pointing to our SaaS servers, but has not yet been connected to an active restaurant account.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 text-xs text-slate-700 space-y-2">
          <div className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Are you the restaurant owner?
          </div>
          <p>
            1. Log in to your restaurant dashboard at <span className="font-mono text-amber-600">{APP_CONFIG.companyName.toLowerCase()}.com</span>.
          </p>
          <p>
            2. Go to <strong>Settings &gt; Domains</strong> and add this domain name.
          </p>
          <p>
            3. Verify your DNS CNAME / A records as instructed in the setup wizard.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={portalUrl}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            Go to Platform Portal
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={`mailto:${APP_CONFIG.email}`}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mt-2"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Contact Platform Support ({APP_CONFIG.email})
          </a>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        Powered by {APP_CONFIG.appName} &bull; Strict Tenant Isolation Protected
      </div>
    </div>
  );
};
