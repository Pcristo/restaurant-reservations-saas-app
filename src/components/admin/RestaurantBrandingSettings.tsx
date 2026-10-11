import React, { useState, useEffect } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { RestaurantBranding, RestaurantGalleryImage } from '../../types';
import { Palette, Image as ImageIcon, Sparkles, Check, RefreshCw, Eye, Cloud, Settings, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ImageUploadField } from './ImageUploadField';
import { RestaurantGalleryManager } from './RestaurantGalleryManager';
import { 
  saveCloudinaryConfigLocally, 
  DEFAULT_CLOUDINARY_CLOUD_NAME, 
  DEFAULT_CLOUDINARY_UPLOAD_PRESET 
} from '../../services/cloudinaryService';

export const RestaurantBrandingSettings: React.FC = () => {
  const { tenant, updateBranding, updateProfile, updateSettings } = useTenant();

  const [primaryColor, setPrimaryColor] = useState(tenant?.branding?.primaryColor || '#f59e0b');
  const [secondaryColor, setSecondaryColor] = useState(tenant?.branding?.secondaryColor || '#1e293b');
  const [accentColor, setAccentColor] = useState(tenant?.branding?.accentColor || '#10b981');
  const [buttonStyle, setButtonStyle] = useState<'rounded' | 'pill' | 'square'>(tenant?.branding?.buttonStyle || 'rounded');
  const [logoUrl, setLogoUrl] = useState(tenant?.branding?.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(tenant?.branding?.faviconUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(tenant?.branding?.coverImageUrl || '');
  const [displayName, setDisplayName] = useState(tenant?.branding?.displayName || tenant?.name || '');
  const [galleryImages, setGalleryImages] = useState<RestaurantGalleryImage[]>(tenant?.settings?.galleryImages || []);
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(
    tenant?.settings?.cloudinaryCloudName || tenant?.branding?.cloudinaryCloudName || DEFAULT_CLOUDINARY_CLOUD_NAME
  );
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState(
    tenant?.settings?.cloudinaryUploadPreset || tenant?.branding?.cloudinaryUploadPreset || DEFAULT_CLOUDINARY_UPLOAD_PRESET
  );
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState(
    tenant?.settings?.cloudinaryApiKey || tenant?.branding?.cloudinaryApiKey || ''
  );
  const [showCloudinarySettings, setShowCloudinarySettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      if (tenant.branding?.primaryColor) setPrimaryColor(tenant.branding.primaryColor);
      if (tenant.branding?.secondaryColor) setSecondaryColor(tenant.branding.secondaryColor);
      if (tenant.branding?.accentColor) setAccentColor(tenant.branding.accentColor);
      if (tenant.branding?.buttonStyle) setButtonStyle(tenant.branding.buttonStyle);
      if (tenant.branding?.logoUrl) setLogoUrl(tenant.branding.logoUrl);
      if (tenant.branding?.faviconUrl) setFaviconUrl(tenant.branding.faviconUrl);
      if (tenant.branding?.coverImageUrl) setCoverImageUrl(tenant.branding.coverImageUrl);
      if (tenant.branding?.displayName || tenant.name) setDisplayName(tenant.branding?.displayName || tenant.name);
      if (tenant.settings?.galleryImages) setGalleryImages(tenant.settings.galleryImages);
      if (tenant.settings?.cloudinaryCloudName || tenant.branding?.cloudinaryCloudName) {
        setCloudinaryCloudName(tenant.settings?.cloudinaryCloudName || tenant.branding?.cloudinaryCloudName || DEFAULT_CLOUDINARY_CLOUD_NAME);
      }
      if (tenant.settings?.cloudinaryUploadPreset || tenant.branding?.cloudinaryUploadPreset) {
        setCloudinaryUploadPreset(tenant.settings?.cloudinaryUploadPreset || tenant.branding?.cloudinaryUploadPreset || DEFAULT_CLOUDINARY_UPLOAD_PRESET);
      }
      if (tenant.settings?.cloudinaryApiKey || tenant.branding?.cloudinaryApiKey) {
        setCloudinaryApiKey(tenant.settings?.cloudinaryApiKey || tenant.branding?.cloudinaryApiKey || '');
      }
    }
  }, [tenant]);

  const restaurantSlug = tenant?.slug || 'restaurant';
  const restaurantName = tenant?.name || displayName || 'Restaurant';

  const PRESET_PALETTES = [
    { name: 'Warm Amber (Default)', primary: '#f59e0b', secondary: '#1e293b', accent: '#10b981' },
    { name: 'Classic Burgundy', primary: '#881337', secondary: '#1c1917', accent: '#d97706' },
    { name: 'Mediterranean Olive', primary: '#4d7c0f', secondary: '#1e293b', accent: '#f59e0b' },
    { name: 'Navy & Gold', primary: '#1e3a8a', secondary: '#0f172a', accent: '#fbbf24' },
    { name: 'Charcoal & Rose', primary: '#e11d48', secondary: '#18181b', accent: '#06b6d4' },
  ];

  const handleApplyPreset = (p: typeof PRESET_PALETTES[0]) => {
    setPrimaryColor(p.primary);
    setSecondaryColor(p.secondary);
    setAccentColor(p.accent);
    toast.success(`Applied ${p.name} palette`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateBranding({
        primaryColor,
        secondaryColor,
        accentColor,
        buttonStyle,
        logoUrl: logoUrl.trim(),
        faviconUrl: faviconUrl.trim(),
        coverImageUrl: coverImageUrl.trim(),
        displayName: displayName.trim(),
        cloudinaryCloudName: cloudinaryCloudName.trim(),
        cloudinaryUploadPreset: cloudinaryUploadPreset.trim(),
        cloudinaryApiKey: cloudinaryApiKey.trim(),
      });
      if (displayName.trim() && displayName.trim() !== tenant?.name) {
        await updateProfile({ name: displayName.trim() });
      }
      await updateSettings({
        galleryImages,
        cloudinaryCloudName: cloudinaryCloudName.trim(),
        cloudinaryUploadPreset: cloudinaryUploadPreset.trim(),
        cloudinaryApiKey: cloudinaryApiKey.trim(),
      });
      if (cloudinaryCloudName.trim() && cloudinaryUploadPreset.trim()) {
        saveCloudinaryConfigLocally({
          cloudName: cloudinaryCloudName.trim(),
          uploadPreset: cloudinaryUploadPreset.trim(),
          apiKey: cloudinaryApiKey.trim(),
        });
      }
      toast.success('Branding and media settings updated successfully!');
    } catch {
      toast.error('Failed to update branding.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Live Brand Preview Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-semibold text-gray-900">Brand Identity & Color Palette</h3>
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Eye size={13} />
            Instant Live Preview
          </span>
        </div>

        {/* Live Preview Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Public Reservation Card Preview
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 max-w-sm mx-auto text-center space-y-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-14 h-14 mx-auto rounded-full object-cover border border-gray-200" />
            ) : (
              <div 
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {displayName.charAt(0) || 'R'}
              </div>
            )}

            <div className="font-bold text-gray-900 text-base">{displayName || 'Restaurant Name'}</div>
            <p className="text-xs text-gray-500">Select date, time, and guests to reserve your table.</p>

            <button
              type="button"
              className={`w-full py-2.5 text-white font-semibold text-xs shadow-sm transition-opacity ${
                buttonStyle === 'pill' ? 'rounded-full' : buttonStyle === 'square' ? 'rounded-none' : 'rounded-lg'
              }`}
              style={{ backgroundColor: primaryColor }}
            >
              Reserve Table Online
            </button>
          </div>
        </div>

        {/* Color Presets */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Preset Theme Palettes</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs text-gray-700 transition-colors"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: preset.primary }} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Primary Color (Buttons & Highlights)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Secondary / Dark Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Button Corner Radius Style</label>
            <select
              value={buttonStyle}
              onChange={(e) => setButtonStyle(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="rounded">Rounded Corners (8px)</option>
              <option value="pill">Pill Shape (Full Rounded)</option>
              <option value="square">Square Corners (0px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Media & Assets (Logo, Favicon, Cover) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-500" />
            <h3 className="text-base font-semibold text-gray-900">Brand Assets & Imagery</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
            <Cloud size={13} />
            <span>Cloudinary Folder: <strong className="font-mono">restaurants/{restaurantSlug}</strong></span>
          </div>
        </div>

        {/* Cloudinary Integration Card */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-gray-900">Cloudinary Media Storage</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-200">
                {cloudinaryCloudName && cloudinaryUploadPreset ? 'Configured' : 'Defaults Active'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCloudinarySettings(!showCloudinarySettings)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>{showCloudinarySettings ? 'Hide Settings' : 'Configure Cloud Name & Preset'}</span>
              {showCloudinarySettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed">
            Cloudinary manages image hosting for your logo, cover photo, and gallery. You can customize your restaurant's Cloud Name and Upload Preset here, or inherit the platform-wide configuration.
          </p>

          {showCloudinarySettings && (
            <div className="pt-2 border-t border-blue-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Cloud Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cloudinaryCloudName}
                    onChange={(e) => setCloudinaryCloudName(e.target.value)}
                    placeholder="e.g. dinemaster-pro"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Upload Preset (Unsigned) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cloudinaryUploadPreset}
                    onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                    placeholder="e.g. ml_default"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCloudinaryCloudName(DEFAULT_CLOUDINARY_CLOUD_NAME);
                    setCloudinaryUploadPreset(DEFAULT_CLOUDINARY_UPLOAD_PRESET);
                    toast.success('Applied platform default Cloudinary credentials');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium cursor-pointer"
                >
                  Use Platform Defaults ({DEFAULT_CLOUDINARY_CLOUD_NAME} / {DEFAULT_CLOUDINARY_UPLOAD_PRESET})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!cloudinaryCloudName.trim() || !cloudinaryUploadPreset.trim()) {
                      toast.error('Both Cloud Name and Upload Preset are required.');
                      return;
                    }
                    saveCloudinaryConfigLocally({
                      cloudName: cloudinaryCloudName.trim(),
                      uploadPreset: cloudinaryUploadPreset.trim(),
                      apiKey: cloudinaryApiKey.trim(),
                    });
                    toast.success('Cloudinary credentials saved to browser session!');
                  }}
                  className="text-[11px] px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">Restaurant Public Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Osteria Antica"
              className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageUploadField
              label="Restaurant Brand Logo"
              sublabel="Used across header, login page, emails, and reservation confirmation"
              value={logoUrl}
              onChange={setLogoUrl}
              restaurantSlug={restaurantSlug}
              restaurantName={restaurantName}
              fieldId="logoUrl"
              subfolder="logo"
              placeholder="https://example.com/logo.png"
              recommendedDimensions="Square (512x512px)"
              customSettings={{ ...tenant?.settings, ...tenant?.branding }}
            />

            <ImageUploadField
              label="Custom Favicon"
              sublabel="Browser tab icon (.ico, .png, .svg)"
              value={faviconUrl}
              onChange={setFaviconUrl}
              restaurantSlug={restaurantSlug}
              restaurantName={restaurantName}
              fieldId="faviconUrl"
              subfolder="favicon"
              placeholder="https://example.com/favicon.ico"
              recommendedDimensions="32x32px or 64x64px"
              customSettings={{ ...tenant?.settings, ...tenant?.branding }}
            />
          </div>

          <div>
            <ImageUploadField
              label="Public Header & Cover Image"
              sublabel="Primary hero banner image showcased on public reservation page"
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              restaurantSlug={restaurantSlug}
              restaurantName={restaurantName}
              fieldId="coverImageUrl"
              subfolder="cover"
              placeholder="https://example.com/dining-room.jpg"
              recommendedDimensions="Landscape (1920x1080px)"
              customSettings={{ ...tenant?.settings, ...tenant?.branding }}
            />
          </div>
        </div>
      </div>

      {/* Restaurant Photo Gallery Section */}
      <RestaurantGalleryManager
        images={galleryImages}
        onChange={setGalleryImages}
        restaurantSlug={restaurantSlug}
        restaurantName={restaurantName}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-sm transition-colors flex items-center gap-1.5"
        >
          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          <span>Save Branding Settings</span>
        </button>
      </div>
    </form>
  );
};
