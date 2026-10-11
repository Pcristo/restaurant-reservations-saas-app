import React, { useState, useRef } from 'react';
import { 
  Cloud, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { RestaurantGalleryImage } from '../../types';
import { uploadRestaurantImageToCloudinary } from '../../services/cloudinaryService';

export interface RestaurantGalleryManagerProps {
  images: RestaurantGalleryImage[];
  onChange: (images: RestaurantGalleryImage[]) => void;
  restaurantSlug: string;
  restaurantName?: string;
  theme?: 'light' | 'dark';
  customSettings?: any;
}

export const RestaurantGalleryManager: React.FC<RestaurantGalleryManagerProps> = ({
  images = [],
  onChange,
  restaurantSlug,
  restaurantName,
  theme = 'light',
  customSettings,
}) => {
  const isDark = theme === 'dark';
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawSlug = (restaurantSlug || 'restaurant').toLowerCase().trim();
  const cleanSlug = rawSlug === 'bela-italia' || rawSlug === 'bella-italia' 
    ? 'bela-italia' 
    : rawSlug.replace(/[^a-z0-9_-]/g, '-');
  const targetFolder = `restaurants/${cleanSlug}/gallery`;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const addedImages: RestaurantGalleryImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadRestaurantImageToCloudinary({
          file,
          restaurantSlug: cleanSlug,
          restaurantName,
          field: 'gallery',
          subfolder: 'gallery',
          customSettings,
        });

        const newImg: RestaurantGalleryImage = {
          id: `img-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          url: res.secure_url,
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          folder: res.folder,
          cloudinaryPublicId: res.public_id,
          createdAt: new Date().toISOString(),
        };

        addedImages.push(newImg);
      }

      onChange([...images, ...addedImages]);
      toast.success(
        addedImages.length === 1 
          ? `Image uploaded to Cloudinary folder "${targetFolder}"!`
          : `${addedImages.length} images uploaded to Cloudinary folder "${targetFolder}"!`
      );
    } catch (err: any) {
      console.error('[RestaurantGalleryManager] Upload error:', err);
      toast.error(err?.message || 'Failed to upload image to Cloudinary.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast.error('Please enter an image URL.');
      return;
    }

    const newImg: RestaurantGalleryImage = {
      id: `img-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      url: newUrl.trim(),
      title: newTitle.trim() || 'Restaurant Photo',
      folder: newUrl.includes('cloudinary.com') ? targetFolder : 'external',
      createdAt: new Date().toISOString(),
    };

    onChange([...images, newImg]);
    setNewUrl('');
    setNewTitle('');
    setIsAddingUrl(false);
    toast.success('Image added to restaurant gallery!');
  };

  const handleRemoveImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
    toast.success('Image removed from gallery.');
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Image URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={cn(
      "border rounded-2xl p-5 sm:p-6 space-y-5 transition-colors",
      isDark ? "bg-gray-800/40 border-gray-700/80" : "bg-white border-gray-200"
    )}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-500" />
            <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-gray-900")}>
              Restaurant Photo Gallery & Media
            </h3>
            {images.length > 0 && (
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
              </span>
            )}
          </div>
          <p className={cn("text-xs mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
            Upload photos of dining rooms, dishes, and ambience. Images uploaded to Cloudinary are automatically organized under <span className="font-mono text-amber-500 font-semibold">{targetFolder}</span>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Add by URL toggle button */}
          <button
            type="button"
            onClick={() => setIsAddingUrl(!isAddingUrl)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border",
              isAddingUrl
                ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                : isDark
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300"
            )}
          >
            <Plus size={13} />
            <span>Add via URL</span>
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={handleFileUpload}
          />

          {/* Upload to Cloudinary Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border",
              isUploading
                ? "opacity-60 cursor-not-allowed bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/10"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 size={13} className="animate-spin text-slate-950" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Cloud size={13} className="text-slate-950" />
                <span>Upload to Cloudinary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add via URL Form Expandable */}
      {isAddingUrl && (
        <form onSubmit={handleAddFromUrl} className={cn(
          "p-4 rounded-xl border space-y-3 animate-fade-in",
          isDark ? "bg-gray-900/60 border-gray-700" : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus size={13} />
              Add Image from URL
            </span>
            <button
              type="button"
              onClick={() => setIsAddingUrl(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Image URL *
              </label>
              <input
                type="url"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className={cn(
                  "w-full px-3 py-1.5 text-xs rounded-lg border font-mono outline-none focus:ring-2 focus:ring-amber-500",
                  isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Caption / Description (Optional)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Main Dining Room, Homemade Pasta"
                className={cn(
                  "w-full px-3 py-1.5 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-amber-500",
                  isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Add to Gallery
            </button>
          </div>
        </form>
      )}

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className={cn(
          "p-8 rounded-xl border border-dashed text-center",
          isDark ? "bg-gray-900/40 border-gray-700" : "bg-gray-50/60 border-gray-200"
        )}>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 mb-3">
            <ImageIcon size={22} />
          </div>
          <p className={cn("text-xs font-semibold", isDark ? "text-gray-300" : "text-gray-700")}>
            No gallery photos added yet for this restaurant
          </p>
          <p className={cn("text-[11px] max-w-sm mx-auto mt-1", isDark ? "text-gray-500" : "text-gray-500")}>
            Click <strong className="text-amber-500 font-semibold cursor-pointer" onClick={() => fileInputRef.current?.click()}>"Upload to Cloudinary"</strong> or <strong className="text-amber-500 font-semibold cursor-pointer" onClick={() => setIsAddingUrl(true)}>"Add via URL"</strong> to add restaurant images. Uploads are organized in Cloudinary under <span className="font-mono text-amber-500">{targetFolder}</span>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {images.map((img) => {
            const isCloudinary = Boolean(img.url && img.url.includes('cloudinary.com'));

            return (
              <div
                key={img.id}
                className={cn(
                  "group relative rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-md",
                  isDark ? "bg-gray-900/70 border-gray-700/80 hover:border-amber-500/50" : "bg-white border-gray-200 hover:border-amber-400"
                )}
              >
                {/* Image Box */}
                <div className="aspect-video w-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={img.url}
                    alt={img.title || 'Restaurant image'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Cloudinary Badge overlay */}
                  <div className="absolute top-2 left-2">
                    <span className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-md shadow-sm",
                      isCloudinary 
                        ? "bg-slate-950/80 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-950/80 text-blue-400 border border-blue-500/30"
                    )}>
                      {isCloudinary ? 'Cloudinary' : 'URL'}
                    </span>
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-slate-950/80 text-gray-300 hover:text-white backdrop-blur-sm transition-colors"
                      title="Open full size"
                    >
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyUrl(img.url, img.id)}
                      className="p-1 rounded bg-slate-950/80 text-gray-300 hover:text-white backdrop-blur-sm transition-colors cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedId === img.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="p-1 rounded bg-slate-950/80 text-rose-400 hover:text-rose-300 backdrop-blur-sm transition-colors cursor-pointer"
                      title="Delete photo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Caption / Title */}
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <p className={cn(
                    "text-xs font-semibold truncate",
                    isDark ? "text-gray-200" : "text-gray-800"
                  )} title={img.title || img.url}>
                    {img.title || 'Untitled Photo'}
                  </p>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                    <span className="font-mono truncate max-w-[120px]">
                      {img.folder || targetFolder}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-rose-500 hover:underline cursor-pointer font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
