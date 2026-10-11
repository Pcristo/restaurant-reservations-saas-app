import React from 'react';
import { ShieldX, HelpCircle, ArrowLeft, Mail } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import { APP_CONFIG } from '../data/appConfig';

export const SuspendedRestaurantPage: React.FC = () => {
  const { tenant } = useTenant();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldX className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Restaurant Service Suspended
        </h1>

        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          The reservation services for <strong>{tenant?.name || 'this restaurant'}</strong> are currently suspended. Online bookings and live availability are temporarily unavailable.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6 text-xs text-amber-900 space-y-1.5">
          <p className="font-semibold">Restaurant Administrator:</p>
          <p>
            Please check your account billing status or contact platform support to reactivate your restaurant services. Your reservation data and table layouts remain safe and preserved.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={`mailto:${APP_CONFIG.email}`}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Mail className="w-4 h-4" />
            Contact {APP_CONFIG.appName} Support
          </a>
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Homepage
          </a>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        {APP_CONFIG.appName} Platform &bull; Secure Multi-Tenant Architecture
      </div>
    </div>
  );
};
