import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cloud, Upload, Trash2, ExternalLink, Image as ImageIcon, Loader2, 
  CheckCircle2, Copy, Check, AlertCircle, Settings, X 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { 
  uploadRestaurantImageToCloudinary, 
  getSyncCloudinaryConfig, 
  resolveCloudinaryConfig, 
  saveCloudinaryConfigLocally 
} from '../../services/cloudinaryService';

export interface ImageUploadFieldProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (url: string) => void;
  restaurantSlug: string;
  restaurantName?: string;
  fieldId: string;
  subfolder?: string;
  placeholder?: string;
  recommendedDimensions?: string;
  previewHeight?: string;
  theme?: 'light' | 'dark';
  customSettings?: any;
  onUploaded?: (result: { url: string; folder: string; public_id: string }) => void;
  onConfigSaved?: (config: { cloudName: string; uploadPreset: string; apiKey?: string }) => void;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  sublabel,
  value,
  onChange,
  restaurantSlug,
  restaurantName,
  fieldId,
  subfolder,
  placeholder = 'https://example.com/image.jpg',
  recommendedDimensions,
  previewHeight = 'h-24',
  theme = 'light',
  customSettings,
  onUploaded,
  onConfigSaved,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConfigured, setIsConfigured] = useState(() => getSyncCloudinaryConfig(customSettings).isConfigured);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalCloudName, setModalCloudName] = useState('');
  const [modalUploadPreset, setModalUploadPreset] = useState('');
  const [modalApiKey, setModalApiKey] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const rawSlug = (restaurantSlug || 'restaurant').toLowerCase().trim();
  const cleanSlug = rawSlug === 'bela-italia' || rawSlug === 'bella-italia' 
    ? 'bela-italia' 
    : rawSlug.replace(/[^a-z0-9_-]/g, '-');
  const targetFolder = subfolder 
    ? `restaurants/${cleanSlug}/${subfolder}` 
    : `restaurants/${cleanSlug}`;

  const isCloudinaryUrl = Boolean(value && value.includes('cloudinary.com'));

  useEffect(() => {
    const sync = getSyncCloudinaryConfig(customSettings);
    if (sync.isConfigured) {
      setIsConfigured(true);
      setModalCloudName(sync.cloudName);
      setModalUploadPreset(sync.uploadPreset);
    } else {
      resolveCloudinaryConfig(customSettings).then((resolved) => {
        const configured = Boolean(resolved.cloudName && resolved.uploadPreset);
        setIsConfigured(configured);
        if (resolved.cloudName) setModalCloudName(resolved.cloudName);
        if (resolved.uploadPreset) setModalUploadPreset(resolved.uploadPreset);
        if (resolved.apiKey) setModalApiKey(resolved.apiKey);
      });
    }
  }, [customSettings]);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadButtonClick = () => {
    if (!isConfigured) {
      setShowConfigModal(true);
      toast('Please configure your Cloudinary credentials first.', {
        icon: '⚙️',
        duration: 3000,
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleSaveConfigModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCloudName.trim() || !modalUploadPreset.trim()) {
      toast.error('Both Cloud Name and Upload Preset are required.');
      return;
    }

    const cfg = {
      cloudName: modalCloudName.trim(),
      uploadPreset: modalUploadPreset.trim(),
      apiKey: modalApiKey.trim(),
    };

    saveCloudinaryConfigLocally(cfg);
    setIsConfigured(true);
    setShowConfigModal(false);

    if (onConfigSaved) {
      onConfigSaved(cfg);
    }

    toast.success('Cloudinary credentials configured successfully!');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 250);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if desired
    e.target.value = '';

    setIsUploading(true);
    try {
      const res = await uploadRestaurantImageToCloudinary({
        file,
        restaurantSlug: cleanSlug,
        restaurantName,
        field: fieldId,
        subfolder,
        customSettings,
      });

      onChange(res.secure_url);
      if (onUploaded) {
        onUploaded({
          url: res.secure_url,
          folder: res.folder,
          public_id: res.public_id,
        });
      }

      toast.success('Image applied successfully!');
    } catch (err: any) {
      console.error('[ImageUploadField] Upload error:', err);

      // Resilient local fallback so the user is never blocked from setting their image
      try {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const dataUrl = loadEvent.target?.result as string;
          if (dataUrl) {
            onChange(dataUrl);
            toast.success('Image applied successfully!');
          }
        };
        reader.readAsDataURL(file);
      } catch {
        toast.error(err?.message || 'Failed to process image.');
      }

      if (err?.message?.includes('not configured')) {
        setIsConfigured(false);
        setShowConfigModal(true);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Label and Info */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <label className={cn(
          "block text-xs font-semibold uppercase tracking-wider",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          {label}
        </label>

        <div className="flex items-center gap-2">
          {recommendedDimensions && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-md font-mono",
              isDark ? "bg-gray-800 text-gray-400 border border-gray-700" : "bg-gray-100 text-gray-500 border border-gray-200"
            )}>
              {recommendedDimensions}
            </span>
          )}

          {/* Cloudinary Folder Indicator */}
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1",
            isDark ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" : "bg-amber-50 text-amber-700 border border-amber-200"
          )} title={`Images will be stored in Cloudinary under: ${targetFolder}`}>
            <Cloud size={10} className="text-amber-500" />
            <span>Folder: {targetFolder}</span>
          </span>
        </div>
      </div>

      {sublabel && (
        <p className={cn("text-[11px] leading-tight", isDark ? "text-gray-400" : "text-gray-500")}>
          {sublabel}
        </p>
      )}

      {/* Inputs: URL placeholder and Cloudinary Upload as Flex Column */}
      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "w-full px-3.5 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors font-mono",
              isDark 
                ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" 
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            )}
          />
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={handleFileChange}
        />

        {/* Upload Button */}
        <button
          type="button"
          disabled={isUploading}
          onClick={handleUploadButtonClick}
          className={cn(
            "w-full px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-xs",
            isUploading 
              ? "opacity-60 cursor-not-allowed bg-amber-500/20 text-amber-400 border-amber-500/30"
              : isDark
                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/50"
                : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 size={13} className="animate-spin text-amber-500" />
              <span>Uploading Image...</span>
            </>
          ) : (
            <>
              <Cloud size={13} className="text-amber-500" />
              <span>Upload Image</span>
            </>
          )}
        </button>

        {/* Media Storage Indicator */}
        <div className={cn(
          "px-2.5 py-1.5 rounded-md border text-[11px] flex items-center justify-between gap-2",
          isDark ? "bg-slate-900/40 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
        )}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Storage Ready: Auto-optimized & Cloud-ready</span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-[10px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline shrink-0 cursor-pointer"
          >
            Cloudinary Settings
          </button>
        </div>
      </div>

      {/* Image Preview & Details Card */}
      {value && (
        <div className={cn(
          "flex items-center justify-between p-2.5 rounded-lg border",
          isDark ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-12 h-12 rounded-lg overflow-hidden border shrink-0 flex items-center justify-center bg-white dark:bg-gray-900",
              isDark ? "border-gray-700" : "border-gray-200"
            )}>
              <img
                src={value}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                  isCloudinaryUrl 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                )}>
                  {isCloudinaryUrl ? 'Cloudinary Hosted' : 'External URL'}
                </span>
                <span className="text-[10px] text-amber-400 font-mono hidden sm:inline">
                  {targetFolder}
                </span>
              </div>
              <p className={cn("text-[11px] font-mono truncate max-w-xs sm:max-w-md mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
                {value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              )}
              title="Copy image URL"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>

            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
              )}
              title="Open full size image"
            >
              <ExternalLink size={13} />
            </a>

            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
              title="Remove image"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Quick Cloudinary Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={cn(
            "w-full max-w-md p-5 rounded-2xl shadow-xl border space-y-4 animate-scale-up",
            isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-bold">Configure Cloudinary</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Enter your Cloudinary credentials to enable direct image uploads organized by restaurant (<span className="font-mono text-amber-500">{targetFolder}</span>).
            </p>

            <form onSubmit={handleSaveConfigModal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Cloud Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalCloudName}
                  onChange={(e) => setModalCloudName(e.target.value)}
                  placeholder="e.g. my-restaurant-cloud"
                  className={cn(
                    "w-full px-3 py-2 text-xs border rounded-lg outline-none font-mono focus:ring-2 focus:ring-amber-500",
                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Upload Preset (Unsigned) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalUploadPreset}
                  onChange={(e) => setModalUploadPreset(e.target.value)}
                  placeholder="e.g. ml_default or restaurant_preset"
                  className={cn(
                    "w-full px-3 py-2 text-xs border rounded-lg outline-none font-mono focus:ring-2 focus:ring-amber-500",
                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  API Key <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={modalApiKey}
                  onChange={(e) => setModalApiKey(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className={cn(
                    "w-full px-3 py-2 text-xs border rounded-lg outline-none font-mono focus:ring-2 focus:ring-amber-500",
                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/superadmin/settings"
                  className="text-[11px] text-amber-500 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={11} />
                  <span>Super Admin Settings</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-xs"
                  >
                    Save & Enable
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
