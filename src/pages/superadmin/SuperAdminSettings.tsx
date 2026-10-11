import React, { useState, useEffect } from 'react';
import { DEFAULT_PLATFORM_SETTINGS } from '../../data/plans';
import { PlatformSettings } from '../../types';
import { 
  Settings, Save, Globe, Mail, Shield, Server, Check, 
  Lock, Unlock, Eye, EyeOff, Copy, Key, Smartphone, MapPin, Loader2, Sparkles,
  Send, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { testCloudinaryConnection, saveCloudinaryConfigLocally } from '../../services/cloudinaryService';

interface ApiFieldConfig {
  key: keyof PlatformSettings;
  label: string;
  placeholder?: string;
  description?: string;
  isSecret?: boolean;
}

export const SuperAdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingCloudinary, setIsTestingCloudinary] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Resend API Key status and verification
  const [resendStatus, setResendStatus] = useState<{
    hasKey: boolean;
    isValid: boolean;
    maskedKey: string;
    rawKeyPreview: string;
    senderEmail: string;
    verifiedDomains: Array<{ name: string; status: string }>;
  } | null>(null);
  const [isCheckingResend, setIsCheckingResend] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('pcristo35@gmail.com');
  const [showTestInline, setShowTestInline] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Field-level Lock/Unlock state: record of field key -> boolean (true = locked)
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>(() => {
    // Default all API keys to locked for security
    return {
      firebaseProjectId: true,
      firebaseAppId: true,
      firebaseApiKey: true,
      firebaseAuthDomain: true,
      firebaseDatabaseId: true,
      firebaseStorageBucket: true,
      firebaseMessagingSenderId: true,
      resendApiKey: false,
      cloudinaryCloudName: false,
      cloudinaryApiKey: false,
      cloudinaryApiSecret: true,
      cloudinaryUploadPreset: false,
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioPhoneNumber: true,
      recaptchaSiteKey: true,
      recaptchaSecretKey: true,
      googleMapsApiKey: true,
    };
  });

  // Field-level Visibility state: record of field key -> boolean (true = visible / unmasked)
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(() => {
    // Secrets default to hidden, identifiers default to visible or hidden
    return {
      firebaseProjectId: true,
      firebaseAppId: false,
      firebaseApiKey: false,
      firebaseAuthDomain: true,
      firebaseDatabaseId: true,
      firebaseStorageBucket: true,
      firebaseMessagingSenderId: true,
      resendApiKey: true,
      cloudinaryCloudName: true,
      cloudinaryApiKey: false,
      cloudinaryApiSecret: false,
      cloudinaryUploadPreset: true,
      twilioAccountSid: false,
      twilioAuthToken: false,
      twilioPhoneNumber: true,
      recaptchaSiteKey: true,
      recaptchaSecretKey: false,
      googleMapsApiKey: false,
    };
  });

  // Section-level visibility state: whether the entire details block for an API is shown or collapsed
  const [sectionDetailsVisible, setSectionDetailsVisible] = useState<Record<string, boolean>>({
    firebase: true,
    resend: true,
    cloudinary: true,
    twilio: true,
    google: true,
  });

  // Load platform settings from Firestore & LocalStorage on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const cached = localStorage.getItem('dinemaster_platform_settings');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch {
            // ignore JSON parse error
          }
        }

        const docRef = doc(db, 'platform_settings', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<PlatformSettings>;
          setSettings(prev => {
            const merged = { ...prev, ...remoteData };
            if (!merged.cloudinaryCloudName) merged.cloudinaryCloudName = 'dinemaster-pro';
            if (!merged.cloudinaryUploadPreset) merged.cloudinaryUploadPreset = 'ml_default';
            localStorage.setItem('dinemaster_platform_settings', JSON.stringify(merged));
            return merged;
          });
        } else {
          setSettings(prev => ({
            ...prev,
            cloudinaryCloudName: prev.cloudinaryCloudName || 'dinemaster-pro',
            cloudinaryUploadPreset: prev.cloudinaryUploadPreset || 'ml_default',
          }));
        }
      } catch (err) {
        console.warn('[PlatformSettings] Notice loading settings:', err);
      }
    };

    loadSettings();
    fetchResendStatus();
  }, []);

  const fetchResendStatus = async () => {
    setIsCheckingResend(true);
    try {
      const res = await fetch('/api/admin/update-resend-config');
      if (res.ok) {
        const data = await res.json();
        setResendStatus({
          hasKey: data.hasKey,
          isValid: data.isValid,
          maskedKey: data.maskedKey,
          rawKeyPreview: data.rawKeyPreview,
          senderEmail: data.senderEmail,
          verifiedDomains: data.verifiedDomains || []
        });
        if (data.senderEmail && (!settings.senderEmail || settings.senderEmail.startsWith('re_'))) {
          setSettings(prev => ({ ...prev, senderEmail: data.senderEmail }));
        }
      }
    } catch (e) {
      console.warn('[Resend Status] Error fetching status:', e);
    } finally {
      setIsCheckingResend(false);
    }
  };

  const handleQuickSaveResend = async () => {
    const keyToSave = (settings.resendApiKey || '').trim();
    if (!keyToSave) {
      toast.error('Please enter a Resend API key to save');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/update-resend-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resendApiKey: keyToSave,
          senderEmail: settings.senderEmail || 'reservations@wordwide.pro',
          senderName: settings.senderName || 'DineMaster Pro'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success('Resend API key verified & saved!');
        await fetchResendStatus();
      } else {
        toast.error(data.error || 'Failed to update Resend API key');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save Resend API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }
    setIsSendingTestEmail(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmailAddress.trim(),
          apiKey: settings.resendApiKey && settings.resendApiKey.startsWith('re_') ? settings.resendApiKey : undefined,
          fromEmail: settings.senderEmail || undefined,
          language: settings.defaultLanguage || 'en'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Verification email delivered! Message ID: ${data.messageId || 'Success'}`
        });
        toast.success(`Test email delivered to ${testEmailAddress}!`);
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test email. Check API key permissions.'
        });
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error sending test email'
      });
      toast.error('Network error sending test email');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleCopy = (key: string, value?: string) => {
    if (!value) {
      toast.error('No value to copy');
      return;
    }
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  const toggleFieldLock = (key: string) => {
    setLockedFields(prev => {
      const nextState = !prev[key];
      toast(nextState ? `Input locked` : `Input unlocked for editing`, {
        icon: nextState ? '🔒' : '🔓',
        duration: 1500
      });
      return { ...prev, [key]: nextState };
    });
  };

  const toggleFieldVisibility = (key: string) => {
    setVisibleFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSectionDetails = (section: string) => {
    setSectionDetailsVisible(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const setSectionLock = (sectionKeys: string[], lock: boolean) => {
    setLockedFields(prev => {
      const updated = { ...prev };
      sectionKeys.forEach(k => {
        updated[k] = lock;
      });
      return updated;
    });
    toast(lock ? 'All inputs in section locked' : 'All inputs in section unlocked', {
      icon: lock ? '🔒' : '🔓',
      duration: 1500
    });
  };

  const setSectionVisibility = (sectionKeys: string[], show: boolean) => {
    setVisibleFields(prev => {
      const updated = { ...prev };
      sectionKeys.forEach(k => {
        updated[k] = show;
      });
      return updated;
    });
    toast(show ? 'All secrets in section revealed' : 'All secrets in section masked', {
      icon: show ? '👁️' : '🙈',
      duration: 1500
    });
  };

  // Group definitions for section actions
  const apiSections = {
    firebase: [
      'firebaseProjectId', 'firebaseAppId', 'firebaseApiKey', 'firebaseAuthDomain', 
      'firebaseDatabaseId', 'firebaseStorageBucket', 'firebaseMessagingSenderId'
    ],
    resend: ['resendApiKey'],
    cloudinary: ['cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret', 'cloudinaryUploadPreset'],
    twilio: ['twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber'],
    google: ['recaptchaSiteKey', 'recaptchaSecretKey', 'googleMapsApiKey']
  };

  const allApiKeys = Object.values(apiSections).flat();
  const allAreLocked = allApiKeys.every(k => lockedFields[k]);
  const allAreVisible = allApiKeys.every(k => visibleFields[k]);

  const toggleAllApisLock = () => {
    const nextLock = !allAreLocked;
    const updated: Record<string, boolean> = {};
    allApiKeys.forEach(k => {
      updated[k] = nextLock;
    });
    setLockedFields(prev => ({ ...prev, ...updated }));
    toast(nextLock ? 'All API inputs are now locked' : 'All API inputs are now unlocked for editing', {
      icon: nextLock ? '🔒' : '🔓',
      duration: 2000
    });
  };

  const toggleAllApisVisibility = () => {
    const nextVis = !allAreVisible;
    const updated: Record<string, boolean> = {};
    allApiKeys.forEach(k => {
      updated[k] = nextVis;
    });
    setVisibleFields(prev => ({ ...prev, ...updated }));
    toast(nextVis ? 'All API details are now visible' : 'All API details are now masked', {
      icon: nextVis ? '👁️' : '🙈',
      duration: 2000
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      // 1. Save to Firestore
      try {
        await setDoc(doc(db, 'platform_settings', 'general'), updatedSettings, { merge: true });
      } catch (firestoreErr) {
        console.warn('[PlatformSettings] Firestore save error (using local persistence):', firestoreErr);
      }

      // 2. Save to localStorage
      localStorage.setItem('dinemaster_platform_settings', JSON.stringify(updatedSettings));

      if (updatedSettings.cloudinaryCloudName || updatedSettings.cloudinaryUploadPreset) {
        localStorage.setItem('dinemaster_cloudinary_config', JSON.stringify({
          cloudName: updatedSettings.cloudinaryCloudName || 'dinemaster-pro',
          uploadPreset: updatedSettings.cloudinaryUploadPreset || 'ml_default',
          apiKey: updatedSettings.cloudinaryApiKey || '',
          apiSecret: updatedSettings.cloudinaryApiSecret || '',
        }));
      }

      // 3. Sync Resend API key to server environment if provided
      if (updatedSettings.resendApiKey && !updatedSettings.resendApiKey.includes('Loaded from Secrets')) {
        try {
          await fetch('/api/admin/update-resend-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resendApiKey: updatedSettings.resendApiKey,
              senderEmail: updatedSettings.senderEmail || 'reservations@wordwide.pro',
              senderName: updatedSettings.senderName || 'DineMaster Pro'
            })
          });
          fetchResendStatus();
        } catch (apiErr) {
          console.warn('[PlatformSettings] Backend sync error for Resend key:', apiErr);
        }
      }

      toast.success('Platform settings & API credentials updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save platform settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render helper for single API input
  const renderApiInput = (
    fieldKey: keyof PlatformSettings,
    label: string,
    placeholder = '',
    description?: string,
    isSecret = false
  ) => {
    const keyStr = String(fieldKey);
    const value = (settings[fieldKey] as string) || '';
    const isLocked = lockedFields[keyStr] !== false; // defaults to true
    const isVisible = visibleFields[keyStr] === true; // secrets default to false

    return (
      <div key={keyStr} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-slate-300 font-medium text-xs flex items-center gap-1.5">
            <span>{label}</span>
            {isSecret && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Secret Key
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <span 
              className={`text-[10px] font-medium flex items-center gap-1 transition-colors ${
                isLocked ? 'text-amber-400/90' : 'text-emerald-400'
              }`}
            >
              {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
              <span>{isLocked ? 'Locked' : 'Editable'}</span>
            </span>
          </div>
        </div>

        <div 
          className={`relative flex items-center rounded-lg border transition-all ${
            isLocked 
              ? 'bg-slate-900/60 border-slate-800 text-slate-400' 
              : 'bg-slate-900 border-amber-500/60 ring-1 ring-amber-500/20 text-white shadow-sm'
          }`}
        >
          <input
            type={isVisible ? 'text' : 'password'}
            value={value}
            readOnly={isLocked}
            onChange={(e) => setSettings({ ...settings, [fieldKey]: e.target.value })}
            placeholder={placeholder || (isLocked ? '••••••••••••••••' : 'Enter API value...')}
            className={`w-full px-3 py-2 bg-transparent text-xs font-mono outline-none pr-24 transition-colors ${
              isLocked 
                ? 'cursor-not-allowed text-slate-400 select-all' 
                : 'text-amber-300 cursor-text'
            }`}
          />

          {/* Action buttons inside input */}
          <div className="absolute right-1.5 flex items-center gap-1 bg-slate-950/80 px-1 py-0.5 rounded border border-slate-800/80 shadow-sm backdrop-blur-sm">
            {/* Eye Icon Button: Show / Hide API detail */}
            <button
              type="button"
              onClick={() => toggleFieldVisibility(keyStr)}
              title={isVisible ? 'Hide API details (mask with dots)' : 'Show API details (reveal value)'}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isVisible 
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-500/15' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>

            {/* Locker / Unlocker Icon Button: Lock / Unlock input editing */}
            <button
              type="button"
              onClick={() => toggleFieldLock(keyStr)}
              title={isLocked ? 'Input is locked. Click to unlock and edit' : 'Input is editable. Click to lock and protect'}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isLocked 
                  ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10' 
                  : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/20 ring-1 ring-emerald-500/40'
              }`}
            >
              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => handleCopy(keyStr, value)}
              title="Copy value"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copiedKey === keyStr ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
    );
  };

  // Helper to render API Section Header with section-level Eye and Locker controls
  const renderSectionHeader = (
    title: string,
    sectionKey: 'firebase' | 'resend' | 'cloudinary' | 'twilio' | 'google',
    icon: React.ReactNode,
    sectionKeys: string[]
  ) => {
    const isExpanded = sectionDetailsVisible[sectionKey] !== false;
    const isAllLocked = sectionKeys.every(k => lockedFields[k]);
    const isAllVisible = sectionKeys.every(k => visibleFields[k]);

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          {icon}
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Eye Icon Button: Show / Hide section details */}
          <button
            type="button"
            onClick={() => toggleSectionDetails(sectionKey)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isExpanded 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title={isExpanded ? 'Hide details for this API' : 'Show details for this API'}
          >
            {isExpanded ? <EyeOff size={12} className="text-slate-400" /> : <Eye size={12} className="text-amber-400" />}
            <span>{isExpanded ? 'Hide Section' : 'Show Section'}</span>
          </button>

          {/* Reveal / Mask all keys in this section */}
          <button
            type="button"
            onClick={() => setSectionVisibility(sectionKeys, !isAllVisible)}
            className="px-2 py-1 text-[11px] font-medium rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            title={isAllVisible ? 'Mask all keys in this API' : 'Reveal all keys in this API'}
          >
            {isAllVisible ? <EyeOff size={11} className="text-amber-400" /> : <Eye size={11} className="text-slate-400" />}
            <span>{isAllVisible ? 'Mask All' : 'Reveal All'}</span>
          </button>

          {/* Locker / Unlocker: Lock / Unlock all in this section */}
          <button
            type="button"
            onClick={() => setSectionLock(sectionKeys, !isAllLocked)}
            className={`px-2 py-1 text-[11px] font-medium rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
              isAllLocked
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
            }`}
            title={isAllLocked ? 'Unlock all inputs in this API' : 'Lock all inputs in this API'}
          >
            {isAllLocked ? <Unlock size={11} className="text-emerald-400" /> : <Lock size={11} className="text-amber-400" />}
            <span>{isAllLocked ? 'Unlock All' : 'Lock All'}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Settings</h1>
          <p className="text-sm text-slate-400">
            Global domain ingress, platform branding, email provider, and secure API credentials.
          </p>
        </div>

        {/* Global Toolbar for API Credentials */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAllApisVisibility}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={allAreVisible ? 'Mask all secret API details' : 'Reveal all secret API details'}
          >
            {allAreVisible ? <EyeOff size={13} className="text-amber-400" /> : <Eye size={13} className="text-slate-400" />}
            <span>{allAreVisible ? 'Mask All APIs' : 'Reveal All APIs'}</span>
          </button>

          <button
            type="button"
            onClick={toggleAllApisLock}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              allAreLocked
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
            }`}
            title={allAreLocked ? 'Unlock all API inputs for editing' : 'Lock all API inputs to protect from changes'}
          >
            {allAreLocked ? <Unlock size={13} className="text-emerald-400" /> : <Lock size={13} className="text-amber-400" />}
            <span>{allAreLocked ? 'Unlock All APIs' : 'Lock All APIs'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* General SaaS Info */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
            <Settings className="w-4 h-4 text-amber-500" />
            <span>General Platform Identity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={settings.saasName}
                onChange={(e) => setSettings({ ...settings, saasName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Platform URL</label>
              <input
                type="url"
                value={settings.platformUrl}
                onChange={(e) => setSettings({ ...settings, platformUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Default Timezone</label>
              <select
                value={settings.defaultTimezone}
                onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              >
                <option value="Europe/Dublin">Europe/Dublin (Ireland)</option>
                <option value="Europe/Lisbon">Europe/Lisbon (Portugal)</option>
                <option value="Europe/London">Europe/London</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {/* Domain Routing Targets */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-purple-400" />
            <span>Multi-Tenant Ingress Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">CNAME Target for Tenants</label>
              <input
                type="text"
                value={settings.cnameTarget}
                onChange={(e) => setSettings({ ...settings, cnameTarget: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Given to restaurants when adding custom subdomains.</p>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Apex A-Record Target</label>
              <input
                type="text"
                value={settings.apexTarget}
                onChange={(e) => setSettings({ ...settings, apexTarget: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-amber-400 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">IP address for root apex domain A-records.</p>
            </div>
          </div>
        </div>

        {/* Outbound Email Settings */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>Outbound Transactional Email Gateway</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Sender Name</label>
              <input
                type="text"
                value={settings.senderName}
                onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">From Email Address</label>
              <input
                type="email"
                value={settings.senderEmail}
                onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* API 1: Firebase Configuration */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          {renderSectionHeader(
            'Firebase API & Cloud Configuration',
            'firebase',
            <Server className="w-4 h-4 text-orange-500" />,
            apiSections.firebase
          )}

          {sectionDetailsVisible.firebase ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {renderApiInput('firebaseProjectId', 'Project ID', 'my-firebase-project', 'Unique Firebase Project identifier')}
              {renderApiInput('firebaseAppId', 'App ID', '1:123456789:web:abcdef', 'Web application ID', true)}
              {renderApiInput('firebaseApiKey', 'API Key', 'AIzaSy...', 'Firebase Web Client API Key', true)}
              {renderApiInput('firebaseAuthDomain', 'Auth Domain', 'project.firebaseapp.com', 'Domain used for OAuth and authentication')}
              {renderApiInput('firebaseDatabaseId', 'Firestore Database ID', '(default) or custom database name', 'Default is (default)')}
              {renderApiInput('firebaseStorageBucket', 'Storage Bucket', 'project.appspot.com', 'Bucket for photos and assets')}
              {renderApiInput('firebaseMessagingSenderId', 'Messaging Sender ID', '123456789012', 'Cloud messaging sender ID')}
            </div>
          ) : (
            <div className="py-4 px-4 bg-slate-900/40 rounded-lg border border-slate-800/60 text-center flex items-center justify-between">
              <span className="text-slate-400 text-xs">
                Firebase configuration details are hidden.
              </span>
              <button
                type="button"
                onClick={() => toggleSectionDetails('firebase')}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Eye size={12} />
                <span>Show Details</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* API 2: Resend API Configuration */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Resend Email API Configuration</span>
              {resendStatus?.hasKey && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={11} />
                  <span>Key Active in Secrets</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchResendStatus}
                disabled={isCheckingResend}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer transition-colors"
                title="Refresh backend status"
              >
                <RefreshCw size={12} className={isCheckingResend ? 'animate-spin text-emerald-400' : ''} />
                <span>{isCheckingResend ? 'Checking...' : 'Check Status'}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleSectionDetails('resend')}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                {sectionDetailsVisible.resend ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {sectionDetailsVisible.resend ? (
            <div className="space-y-4 pt-1">
              {/* Status Banner */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">Runtime Status:</span>
                    {resendStatus?.hasKey ? (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Configured & Active
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                        <AlertCircle size={12} />
                        No Key Configured
                      </span>
                    )}
                    {resendStatus?.maskedKey && (
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {resendStatus.maskedKey}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                    <span>
                      Sender:{' '}
                      <strong className="text-slate-300 font-mono">
                        {resendStatus?.senderEmail || settings.senderEmail || 'reservations@wordwide.pro'}
                      </strong>
                    </span>
                    {resendStatus?.verifiedDomains && resendStatus.verifiedDomains.length > 0 && (
                      <span className="text-emerald-400 font-medium">
                        Verified Domain: {resendStatus.verifiedDomains.map(d => d.name).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTestInline(prev => !prev)}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Send size={12} />
                    <span>{showTestInline ? 'Hide Test Form' : 'Send Test Email'}</span>
                  </button>
                </div>
              </div>

              {/* Inline Test Email Tool */}
              {showTestInline && (
                <div className="p-3.5 bg-slate-900 border border-emerald-500/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Send size={13} className="text-emerald-400" />
                      Send Live Test Email via Resend
                    </span>
                    <span className="text-[11px] text-slate-400">Verifies deliverability instantly</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="recipient@example.com"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 font-mono focus:border-emerald-500/50 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                    >
                      {isSendingTestEmail ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Send Test</span>
                        </>
                      )}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`text-xs p-2.5 rounded-lg flex items-center gap-2 border ${
                        testResult.success
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderApiInput(
                  'resendApiKey',
                  'Resend API Key',
                  're_123456789abcdef...',
                  'Required for transactional booking confirmation emails. You can update it here or in Workspace Secrets.',
                  true
                )}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-medium text-xs">Verified Sender Email</label>
                    <span className="text-[10px] text-slate-500 font-mono">Resend From Address</span>
                  </div>
                  <input
                    type="email"
                    value={settings.senderEmail || 'reservations@wordwide.pro'}
                    onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="reservations@wordwide.pro"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must match a verified sending domain in your Resend account (e.g. wordwide.pro).
                  </p>
                </div>
              </div>

              {/* Quick Save Resend Action */}
              <div className="flex items-center justify-end pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={handleQuickSaveResend}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Save size={13} />
                  <span>Update & Verify Resend Key</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 px-4 bg-slate-900/40 rounded-lg border border-slate-800/60 text-center flex items-center justify-between">
              <span className="text-slate-400 text-xs flex items-center gap-2">
                <Mail size={13} className="text-slate-500" />
                Resend API details are hidden.
                {resendStatus?.hasKey && (
                  <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => toggleSectionDetails('resend')}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer text-xs"
              >
                <Eye size={12} />
                <span>Show Details</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* API 3: Cloudinary Media API */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          {renderSectionHeader(
            'Cloudinary Media API Settings',
            'cloudinary',
            <Shield className="w-4 h-4 text-blue-400" />,
            apiSections.cloudinary
          )}

          {sectionDetailsVisible.cloudinary ? (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-lg text-xs text-blue-300 flex items-start justify-between gap-3">
                <p className="leading-relaxed">
                  Cloudinary provides scalable cloud image storage and transformations for restaurant logos, hero covers, gallery photos, and floor plans. Create an <strong>Unsigned Upload Preset</strong> in your Cloudinary Dashboard under <em>Settings → Upload → Upload Presets</em> (default is often <code className="bg-blue-900/40 px-1 py-0.5 rounded font-mono text-blue-200">ml_default</code>).
                </p>
                <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-blue-900/40 border border-blue-700/50 text-[10px] font-mono text-blue-200">
                  <Check size={11} className="text-emerald-400" />
                  <span>{settings.cloudinaryCloudName && settings.cloudinaryUploadPreset ? 'Configured' : 'Needs Config'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderApiInput('cloudinaryCloudName', 'Cloud Name', 'e.g. dinemaster-pro', 'Your Cloudinary cloud name')}
                {renderApiInput('cloudinaryUploadPreset', 'Upload Preset (Unsigned)', 'e.g. ml_default', 'Unsigned upload preset for browser uploads')}
                {renderApiInput('cloudinaryApiKey', 'API Key (Optional)', '123456789012345', 'Public API credential')}
                {renderApiInput('cloudinaryApiSecret', 'API Secret (Optional)', 'abcdef123456...', 'Master secret for administrative operations', true)}
              </div>

              {/* Action Toolbar for Cloudinary */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTestingCloudinary}
                    onClick={async () => {
                      setIsTestingCloudinary(true);
                      try {
                        const result = await testCloudinaryConnection(
                          settings.cloudinaryCloudName || '',
                          settings.cloudinaryUploadPreset || ''
                        );
                        if (result.success) {
                          toast.success(result.message, { duration: 4000 });
                        } else {
                          toast.error(result.message, { duration: 5000 });
                        }
                      } finally {
                        setIsTestingCloudinary(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isTestingCloudinary ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-blue-400" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-blue-400" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        cloudinaryCloudName: 'dinemaster-pro',
                        cloudinaryUploadPreset: 'ml_default',
                      }));
                      toast.success('Applied platform defaults (dinemaster-pro / ml_default)');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Use Defaults
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const cfg = {
                      cloudName: (settings.cloudinaryCloudName || 'dinemaster-pro').trim(),
                      uploadPreset: (settings.cloudinaryUploadPreset || 'ml_default').trim(),
                      apiKey: (settings.cloudinaryApiKey || '').trim(),
                      apiSecret: (settings.cloudinaryApiSecret || '').trim(),
                    };
                    saveCloudinaryConfigLocally(cfg);
                    try {
                      await setDoc(doc(db, 'platform_settings', 'general'), {
                        cloudinaryCloudName: cfg.cloudName,
                        cloudinaryUploadPreset: cfg.uploadPreset,
                        cloudinaryApiKey: cfg.apiKey,
                        cloudinaryApiSecret: cfg.apiSecret,
                        updatedAt: new Date().toISOString()
                      }, { merge: true });
                    } catch {}
                    toast.success('Cloudinary credentials saved & broadcasted platform-wide!');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  <span>Save Cloudinary Settings</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 px-4 bg-slate-900/40 rounded-lg border border-slate-800/60 text-center flex items-center justify-between">
              <span className="text-slate-400 text-xs">
                Cloudinary API details are hidden.
              </span>
              <button
                type="button"
                onClick={() => toggleSectionDetails('cloudinary')}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Eye size={12} />
                <span>Show Details</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* API 4: Twilio SMS / WhatsApp API */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          {renderSectionHeader(
            'Twilio Communications API (SMS & WhatsApp)',
            'twilio',
            <Smartphone className="w-4 h-4 text-indigo-400" />,
            apiSections.twilio
          )}

          {sectionDetailsVisible.twilio ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {renderApiInput('twilioAccountSid', 'Account SID', 'ACabcdef0123456789...', 'Account identifier', true)}
              {renderApiInput('twilioAuthToken', 'Auth Token', '••••••••••••••••••••••••••••••••', 'Primary API token', true)}
              {renderApiInput('twilioPhoneNumber', 'Sender Phone Number', '+1234567890', 'Twilio verified caller ID or number')}
            </div>
          ) : (
            <div className="py-4 px-4 bg-slate-900/40 rounded-lg border border-slate-800/60 text-center flex items-center justify-between">
              <span className="text-slate-400 text-xs">
                Twilio API details are hidden.
              </span>
              <button
                type="button"
                onClick={() => toggleSectionDetails('twilio')}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Eye size={12} />
                <span>Show Details</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* API 5: Google Services & Maps API */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          {renderSectionHeader(
            'Google Services & Maps API Configuration',
            'google',
            <MapPin className="w-4 h-4 text-rose-400" />,
            apiSections.google
          )}

          {sectionDetailsVisible.google ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {renderApiInput('recaptchaSiteKey', 'reCAPTCHA v3 Site Key', '6Ldxxxxxxxxxx...', 'Public key loaded in frontend client')}
              {renderApiInput('recaptchaSecretKey', 'reCAPTCHA v3 Secret Key', '6Ldxxxxxxxxxx...', 'Backend verification secret key', true)}
              {renderApiInput('googleMapsApiKey', 'Google Maps API Key', 'AIzaSyxxxxxxxxx...', 'Places Autocomplete and Maps Embed API key', true)}
            </div>
          ) : (
            <div className="py-4 px-4 bg-slate-900/40 rounded-lg border border-slate-800/60 text-center flex items-center justify-between">
              <span className="text-slate-400 text-xs">
                Google Services API details are hidden.
              </span>
              <button
                type="button"
                onClick={() => toggleSectionDetails('google')}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Eye size={12} />
                <span>Show Details</span>
              </button>
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-xl">
          <div className="text-slate-400 text-xs flex items-center gap-2">
            <Key size={14} className="text-amber-400" />
            <span>Lock credentials when done editing to prevent accidental changes.</span>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving Platform Settings...' : 'Save Platform Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
