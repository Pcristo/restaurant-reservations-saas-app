import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Check, AlertTriangle, Sparkles, Shield, Globe, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
}

export const SuperAdminFeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([
    {
      id: 'custom_domains',
      name: 'Custom Domain Ingress & SSL',
      description: 'Allows restaurants to link their own apex and CNAME domains with automatic HTTPS resolution.',
      enabled: true,
      category: 'Infrastructure',
    },
    {
      id: 'whatsapp_actions',
      name: 'WhatsApp Customer Communication',
      description: 'One-click WhatsApp button on reservation cards with IE (+353) and PT (+351) number normalization.',
      enabled: true,
      category: 'Communications',
    },
    {
      id: 'advanced_seo',
      name: 'Dynamic Schema.org & SEO Meta',
      description: 'Injects dynamic JSON-LD Restaurant schemas, OpenGraph images, and meta tags for search engines.',
      enabled: true,
      category: 'SEO & Marketing',
    },
    {
      id: 'waitlist_management',
      name: 'Waitlist & Overflow Engine',
      description: 'Allows guest queueing when full house conditions are met for lunch or dinner shifts.',
      enabled: true,
      category: 'Operations',
    },
    {
      id: 'sms_notifications',
      name: 'SMS Reminders (Twilio Gateway)',
      description: 'Sends automated 2-hour pre-arrival booking reminders to guests via SMS.',
      enabled: false,
      category: 'Communications',
    },
    {
      id: 'multi_language',
      name: 'Bilingual Locale Support (EN / PT)',
      description: 'Full dual-language interface, email templates, and localized public booking flows.',
      enabled: true,
      category: 'Localization',
    },
  ]);

  const toggleFlag = (id: string) => {
    setFlags(prev => prev.map(f => {
      if (f.id === id) {
        const next = !f.enabled;
        toast.success(`Feature "${f.name}" ${next ? 'enabled' : 'disabled'}`);
        return { ...f, enabled: next };
      }
      return f;
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Feature Flags</h1>
        <p className="text-sm text-slate-400">
          Control global SaaS capabilities and rollout toggles across all tenant restaurants.
        </p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800">
        {flags.map((f) => (
          <div key={f.id} className="p-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{f.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                  {f.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {f.description}
              </p>
            </div>

            <button
              onClick={() => toggleFlag(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                f.enabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.enabled ? (
                <>
                  <ToggleRight size={16} className="text-emerald-400" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={16} className="text-slate-500" />
                  <span>Disabled</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
