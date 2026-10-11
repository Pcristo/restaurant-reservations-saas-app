import React, { useState, useEffect } from 'react';
import { 
  getMarketingWebsiteSettings, 
  updateMarketingWebsiteSettings, 
  DEFAULT_MARKETING_SETTINGS 
} from '../../services/marketingWebsiteService';
import { MarketingWebsiteSettings, MarketingReview } from '../../types';
import { 
  Sparkles, Save, Globe, Eye, MessageSquare, 
  HelpCircle, CreditCard, Mail, Phone, ExternalLink, 
  Plus, Trash2, Edit2, Check, Star, Upload, Image as ImageIcon,
  AlertCircle, ShieldCheck, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const SuperAdminMarketing: React.FC = () => {
  const [settings, setSettings] = useState<MarketingWebsiteSettings>(DEFAULT_MARKETING_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Review modal state
  const [editingReview, setEditingReview] = useState<MarketingReview | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    getMarketingWebsiteSettings().then((data) => {
      setSettings(data);
      setIsLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateMarketingWebsiteSettings(settings);
      toast.success('Marketing website configuration updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save marketing website settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check Cloudinary configuration
    let cloudName = '';
    let uploadPreset = '';
    try {
      const platformRaw = localStorage.getItem('dinemaster_platform_settings');
      if (platformRaw) {
        const parsed = JSON.parse(platformRaw);
        cloudName = parsed.cloudinaryCloudName || '';
        uploadPreset = parsed.cloudinaryUploadPreset || '';
      }
    } catch {
      // ignore
    }

    if (!cloudName) {
      cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
    }
    if (!uploadPreset) {
      uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';
    }

    setUploadingField(targetField);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.secure_url) {
        if (targetField === 'heroImage') {
          setSettings(prev => ({ ...prev, hero: { ...prev.hero, imageUrl: data.secure_url } }));
        } else if (targetField === 'aboutImage') {
          setSettings(prev => ({ ...prev, about: { ...prev.about, imageUrl: data.secure_url } }));
        } else if (targetField === 'logo') {
          setSettings(prev => ({ ...prev, general: { ...prev.general, logoUrl: data.secure_url } }));
        } else if (targetField === 'favicon') {
          setSettings(prev => ({ ...prev, general: { ...prev.general, faviconUrl: data.secure_url } }));
        } else if (targetField === 'reviewAvatar' && editingReview) {
          setEditingReview({ ...editingReview, avatarUrl: data.secure_url });
        }
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not upload image to Cloudinary. You can enter an image URL directly.');
    } finally {
      setUploadingField(null);
    }
  };

  // Review handlers
  const handleOpenAddReview = () => {
    setEditingReview({
      id: `rev-${Date.now()}`,
      name: '',
      restaurantName: '',
      role: 'Owner & General Manager',
      text: '',
      rating: 5,
      avatarUrl: '',
      isActive: true,
      createdAt: new Date().toISOString()
    });
    setIsReviewModalOpen(true);
  };

  const handleOpenEditReview = (rev: MarketingReview) => {
    setEditingReview({ ...rev });
    setIsReviewModalOpen(true);
  };

  const handleSaveReviewModal = () => {
    if (!editingReview || !editingReview.name.trim() || !editingReview.text.trim()) {
      toast.error('Reviewer name and review text are required.');
      return;
    }

    const currentItems = settings.reviews?.items || [];
    const index = currentItems.findIndex(r => r.id === editingReview.id);

    let updatedItems: MarketingReview[];
    if (index >= 0) {
      updatedItems = [...currentItems];
      updatedItems[index] = editingReview;
    } else {
      updatedItems = [...currentItems, editingReview];
    }

    setSettings(prev => ({
      ...prev,
      reviews: {
        ...prev.reviews,
        items: updatedItems
      }
    }));

    setIsReviewModalOpen(false);
    setEditingReview(null);
    toast.success('Review saved to list. Remember to save platform settings!');
  };

  const handleDeleteReview = (id: string) => {
    const updated = (settings.reviews?.items || []).filter(r => r.id !== id);
    setSettings(prev => ({
      ...prev,
      reviews: {
        ...prev.reviews,
        items: updated
      }
    }));
    toast.success('Review removed.');
  };

  const handleToggleReviewActive = (id: string) => {
    const updated = (settings.reviews?.items || []).map(r => {
      if (r.id === id) return { ...r, isActive: !r.isActive };
      return r;
    });
    setSettings(prev => ({
      ...prev,
      reviews: {
        ...prev.reviews,
        items: updated
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Marketing Website</h1>
            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
              settings.enabled 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {settings.enabled ? 'Live Public Page' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Configure the public SaaS homepage, hero headlines, testimonials, and section visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/?preview=true"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Eye size={14} />
            <span>Preview Landing Page</span>
            <ExternalLink size={12} className="text-slate-500" />
          </a>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* ============================================================== */}
        {/* 1. General Settings */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Globe className="w-4 h-4 text-amber-500" />
              <span>General Platform & Branding</span>
            </div>

            {/* Enable/Disable Landing Page Master Switch */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">Enable Public Landing Page:</span>
              <div 
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-4.5' : 'translate-x-1'
                }`} />
              </div>
              <span className={`text-[11px] font-bold ${settings.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {settings.enabled ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">SaaS Product Name</label>
              <input
                type="text"
                value={settings.general?.siteName || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, siteName: e.target.value }
                })}
                placeholder="DineMaster Pro"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tagline</label>
              <input
                type="text"
                value={settings.general?.tagline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, tagline: e.target.value }
                })}
                placeholder="Restaurant Reservation & Hospitality Engine"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.general?.contactEmail || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, contactEmail: e.target.value }
                })}
                placeholder="hello@dinemasterpro.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.general?.contactPhone || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, contactPhone: e.target.value }
                })}
                placeholder="+353 1 555 0100"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Primary CTA Button Text</label>
              <input
                type="text"
                value={settings.general?.primaryCtaText || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, primaryCtaText: e.target.value }
                })}
                placeholder="Start 14-Day Free Trial"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Primary CTA Target URL / Anchor</label>
              <input
                type="text"
                value={settings.general?.primaryCtaUrl || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, primaryCtaUrl: e.target.value }
                })}
                placeholder="#pricing or /login"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">SaaS Logo Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.general?.logoUrl || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, logoUrl: e.target.value }
                  })}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
                <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload size={13} />
                  <span>{uploadingField === 'logo' ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                  />
                </label>
              </div>
              {settings.general?.logoUrl && (
                <div className="mt-2 p-2 w-24 h-12 rounded border border-slate-800 bg-slate-900 flex items-center justify-center">
                  <img src={settings.general.logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Favicon URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.general?.faviconUrl || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, faviconUrl: e.target.value }
                  })}
                  placeholder="https://.../favicon.ico"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
                <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload size={13} />
                  <span>{uploadingField === 'favicon' ? '...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'favicon')}
                  />
                </label>
              </div>
              {settings.general?.faviconUrl && (
                <div className="mt-2 p-1.5 w-8 h-8 rounded border border-slate-800 bg-slate-900 flex items-center justify-center">
                  <img src={settings.general.faviconUrl} alt="Favicon preview" className="w-5 h-5 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. Hero Section */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Hero Section</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">Show Hero:</span>
              <div 
                onClick={() => setSettings({
                  ...settings,
                  hero: { ...settings.hero, enabled: !settings.hero?.enabled }
                })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.hero?.enabled !== false ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.hero?.enabled !== false ? 'translate-x-4.5' : 'translate-x-1'
                }`} />
              </div>
              <span className={`text-[11px] font-bold ${settings.hero?.enabled !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                {settings.hero?.enabled !== false ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Hero Pill / Badge Text</label>
              <input
                type="text"
                value={settings.hero?.badgeText || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  hero: { ...settings.hero, badgeText: e.target.value }
                })}
                placeholder="Intelligent Restaurant Operations • Zero Commissions"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Headline (Main Title)</label>
              <input
                type="text"
                value={settings.hero?.headline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  hero: { ...settings.hero, headline: e.target.value }
                })}
                placeholder="Restaurant Reservations Made Simple."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-semibold text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Subtitle / Supporting Description</label>
              <textarea
                rows={3}
                value={settings.hero?.description || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  hero: { ...settings.hero, description: e.target.value }
                })}
                placeholder="Manage tables, floor plans, real-time availability, and diners with zero cover commissions..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary CTA Text</label>
                <input
                  type="text"
                  value={settings.hero?.primaryCtaText || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, primaryCtaText: e.target.value }
                  })}
                  placeholder="Start Free Trial"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary CTA Target URL</label>
                <input
                  type="text"
                  value={settings.hero?.primaryCtaUrl || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, primaryCtaUrl: e.target.value }
                  })}
                  placeholder="#pricing"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Secondary CTA Text</label>
                <input
                  type="text"
                  value={settings.hero?.secondaryCtaText || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, secondaryCtaText: e.target.value }
                  })}
                  placeholder="See How It Works"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Secondary CTA Target URL</label>
                <input
                  type="text"
                  value={settings.hero?.secondaryCtaUrl || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, secondaryCtaUrl: e.target.value }
                  })}
                  placeholder="#about"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            {/* Hero Image */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Hero Visual / Dashboard Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.hero?.imageUrl || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, imageUrl: e.target.value }
                  })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
                <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload size={13} />
                  <span>{uploadingField === 'heroImage' ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'heroImage')}
                  />
                </label>
              </div>
              {settings.hero?.imageUrl && (
                <div className="mt-2 relative w-32 h-20 rounded border border-slate-800 overflow-hidden bg-slate-900">
                  <img src={settings.hero.imageUrl} alt="Hero preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. About / Product Section */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>About & Product Capabilities</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">Show About:</span>
              <div 
                onClick={() => setSettings({
                  ...settings,
                  about: { ...settings.about, enabled: !settings.about?.enabled }
                })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.about?.enabled !== false ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.about?.enabled !== false ? 'translate-x-4.5' : 'translate-x-1'
                }`} />
              </div>
              <span className={`text-[11px] font-bold ${settings.about?.enabled !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                {settings.about?.enabled !== false ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Section Title</label>
              <input
                type="text"
                value={settings.about?.title || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  about: { ...settings.about, title: e.target.value }
                })}
                placeholder="Everything Your Restaurant Needs to Run Smoothly"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Subtitle</label>
              <input
                type="text"
                value={settings.about?.subtitle || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  about: { ...settings.about, subtitle: e.target.value }
                })}
                placeholder="Built for independent bistros, high-volume dining rooms, and multi-location groups."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Description</label>
              <textarea
                rows={3}
                value={settings.about?.description || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  about: { ...settings.about, description: e.target.value }
                })}
                placeholder="DineMaster Pro eliminates chaotic host stands, double-bookings, and expensive per-seat cover fees..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Showcase Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.about?.imageUrl || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    about: { ...settings.about, imageUrl: e.target.value }
                  })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
                <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload size={13} />
                  <span>{uploadingField === 'aboutImage' ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'aboutImage')}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. Reviews / Testimonials Management */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Customer Reviews & Testimonials</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Show Reviews Boolean Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-300 text-xs font-semibold">Show Reviews Section:</span>
                <div 
                  onClick={() => setSettings({
                    ...settings,
                    reviews: { ...settings.reviews, showReviews: !settings.reviews?.showReviews }
                  })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    settings.reviews?.showReviews ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.reviews?.showReviews ? 'translate-x-4.5' : 'translate-x-1'
                  }`} />
                </div>
                <span className={`text-[11px] font-bold ${settings.reviews?.showReviews ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {settings.reviews?.showReviews ? 'ON — Visible' : 'OFF — Hidden'}
                </span>
              </label>

              <button
                type="button"
                onClick={handleOpenAddReview}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Review</span>
              </button>
            </div>
          </div>

          <p className="text-slate-400 text-xs">
            When turned OFF, the testimonials section and its navigation link will not be rendered on the landing page.
          </p>

          {/* List of Reviews */}
          <div className="space-y-2.5 pt-1">
            {(!settings.reviews?.items || settings.reviews.items.length === 0) ? (
              <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No customer reviews created yet. Click "Add Review" to create one.
              </div>
            ) : (
              settings.reviews.items.map((r) => (
                <div 
                  key={r.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-wrap items-center justify-between gap-3 ${
                    r.isActive 
                      ? 'bg-slate-900 border-slate-800 text-slate-200' 
                      : 'bg-slate-900/40 border-slate-800/50 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt={r.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {r.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{r.name}</span>
                        <span className="text-slate-400 font-normal">• {r.restaurantName}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={11} 
                            className={i < (r.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} 
                          />
                        ))}
                        <span className="text-[10px] text-slate-400 ml-1">({r.role || 'Restaurateur'})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 text-slate-300 text-xs italic line-clamp-1 max-w-md">
                    "{r.text}"
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleReviewActive(r.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                        r.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                      title={r.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditReview(r)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Edit review"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(r.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      title="Delete review"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. Pricing Visibility (Single Source of Truth) */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span>Pricing & Plans Visibility</span>
            </div>

            {/* showPricing Boolean Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-300 text-xs font-semibold">Show Pricing on Public Website:</span>
              <div 
                onClick={() => setSettings({
                  ...settings,
                  pricing: { ...settings.pricing, showPricing: !settings.pricing?.showPricing }
                })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.pricing?.showPricing ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.pricing?.showPricing ? 'translate-x-4.5' : 'translate-x-1'
                }`} />
              </div>
              <span className={`text-[11px] font-bold ${settings.pricing?.showPricing ? 'text-emerald-400' : 'text-slate-500'}`}>
                {settings.pricing?.showPricing ? 'ON — Pricing Visible' : 'OFF — Pricing Hidden'}
              </span>
            </label>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-300 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <AlertCircle size={14} />
              <span>Zero Plan Duplication Guarantee</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Pricing details, plan names, limits, and feature entitlements are <strong>never duplicated</strong> here. 
              The public marketing website queries the existing <strong>SaaS Plans & Entitlements</strong> engine dynamically.
            </p>
            <div className="pt-1">
              <Link 
                to="/app/super-admin/plans" 
                className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold hover:underline"
              >
                <span>Manage SaaS Plans & Entitlements</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 6. Contact Form Section Configuration */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Contact Inquiries Section</span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-slate-400 text-xs">Show Contact Form:</span>
              <div 
                onClick={() => setSettings({
                  ...settings,
                  contact: { ...settings.contact, enabled: !settings.contact?.enabled }
                })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.contact?.enabled !== false ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.contact?.enabled !== false ? 'translate-x-4.5' : 'translate-x-1'
                }`} />
              </div>
              <span className={`text-[11px] font-bold ${settings.contact?.enabled !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                {settings.contact?.enabled !== false ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Section Title</label>
              <input
                type="text"
                value={settings.contact?.title || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  contact: { ...settings.contact, title: e.target.value }
                })}
                placeholder="Ready to Upgrade Your Dining Room?"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Destination Inbox Email</label>
              <input
                type="email"
                value={settings.contact?.destinationEmail || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  contact: { ...settings.contact, destinationEmail: e.target.value }
                })}
                placeholder="sales@dinemasterpro.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">All public contact form submissions will be delivered here.</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Direct Contact Phone (Optional)</label>
              <input
                type="text"
                value={settings.contact?.phone || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  contact: { ...settings.contact, phone: e.target.value }
                })}
                placeholder="+353 1 555 0100"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Section Subtitle / Description</label>
              <textarea
                rows={2}
                value={settings.contact?.description || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  contact: { ...settings.contact, description: e.target.value }
                })}
                placeholder="Have questions or need a personalized demo? Our team responds within 24 hours."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 7. Footer Configuration */}
        {/* ============================================================== */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Public Footer Configuration</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Footer Brand Statement</label>
              <textarea
                rows={2}
                value={settings.footer?.description || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  footer: { ...settings.footer, description: e.target.value }
                })}
                placeholder="DineMaster Pro is an intelligent multi-tenant reservation and table management operating system..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Copyright Text</label>
              <input
                type="text"
                value={settings.footer?.copyright || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  footer: { ...settings.footer, copyright: e.target.value }
                })}
                placeholder="© 2026 DineMaster Pro. All rights reserved."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Instagram URL</label>
              <input
                type="url"
                value={settings.footer?.socialLinks?.instagram || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  footer: {
                    ...settings.footer,
                    socialLinks: { ...settings.footer?.socialLinks, instagram: e.target.value }
                  }
                })}
                placeholder="https://instagram.com/yourhandle"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={settings.footer?.socialLinks?.linkedin || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  footer: {
                    ...settings.footer,
                    socialLinks: { ...settings.footer?.socialLinks, linkedin: e.target.value }
                  }
                })}
                placeholder="https://linkedin.com/company/yourcompany"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">X / Twitter URL</label>
              <input
                type="url"
                value={settings.footer?.socialLinks?.x || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  footer: {
                    ...settings.footer,
                    socialLinks: { ...settings.footer?.socialLinks, x: e.target.value }
                  }
                })}
                placeholder="https://x.com/yourhandle"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-xl">
          <div className="text-slate-400 text-xs">
            Review your changes before saving. Marketing configurations publish live immediately.
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Marketing Website'}</span>
          </button>
        </div>
      </form>

      {/* Review Add/Edit Modal */}
      {isReviewModalOpen && editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Star className="text-amber-500" size={16} />
              <span>{editingReview.name ? 'Edit Review' : 'Add New Customer Review'}</span>
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer / Manager Name *</label>
                  <input
                    type="text"
                    value={editingReview.name}
                    onChange={(e) => setEditingReview({ ...editingReview, name: e.target.value })}
                    placeholder="Marco Rossi"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    value={editingReview.restaurantName}
                    onChange={(e) => setEditingReview({ ...editingReview, restaurantName: e.target.value })}
                    placeholder="Bella Vista Trattoria"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Role / Title</label>
                  <input
                    type="text"
                    value={editingReview.role || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, role: e.target.value })}
                    placeholder="Executive Chef & Owner"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Star Rating (1-5)</label>
                  <select
                    value={editingReview.rating}
                    onChange={(e) => setEditingReview({ ...editingReview, rating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value={5}>★★★★★ (5 Stars)</option>
                    <option value={4}>★★★★☆ (4 Stars)</option>
                    <option value={3}>★★★☆☆ (3 Stars)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Review Testimonial Text *</label>
                <textarea
                  rows={3}
                  value={editingReview.text}
                  onChange={(e) => setEditingReview({ ...editingReview, text: e.target.value })}
                  placeholder="DineMaster Pro transformed our dinner rushes. We eliminated double bookings entirely..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Avatar / Photo URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editingReview.avatarUrl || ''}
                    onChange={(e) => setEditingReview({ ...editingReview, avatarUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                  <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload size={13} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'reviewAvatar')}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reviewActive"
                  checked={editingReview.isActive}
                  onChange={(e) => setEditingReview({ ...editingReview, isActive: e.target.checked })}
                  className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 bg-slate-950"
                />
                <label htmlFor="reviewActive" className="text-slate-300 cursor-pointer">
                  Active (display on public marketing website)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReviewModal}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
              >
                Save Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
