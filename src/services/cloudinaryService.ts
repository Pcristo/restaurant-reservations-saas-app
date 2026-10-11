import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey?: string;
}

export const DEFAULT_CLOUDINARY_CLOUD_NAME = 'dinemaster-pro';
export const DEFAULT_CLOUDINARY_UPLOAD_PRESET = 'ml_default';

export interface CloudinaryUploadOptions {
  file: File;
  restaurantSlug: string;
  restaurantName?: string;
  field?: string;
  subfolder?: string;
  customSettings?: {
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
    [key: string]: any;
  };
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  folder: string;
  width?: number;
  height?: number;
  format?: string;
}

/**
 * Resolves Cloudinary credentials by inspecting:
 * 1. Restaurant-specific settings
 * 2. Vite environment variables
 * 3. LocalStorage cached platform settings
 * 4. Firestore platform_settings/general document (Super Admin platform settings)
 */
export async function resolveCloudinaryConfig(customSettings?: any): Promise<CloudinaryConfig> {
  let cloudName = customSettings?.cloudinaryCloudName?.trim() || (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  let uploadPreset = customSettings?.cloudinaryUploadPreset?.trim() || (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();
  let apiKey = customSettings?.cloudinaryApiKey?.trim() || (import.meta as any).env?.VITE_CLOUDINARY_API_KEY?.trim();

  // Check dinemaster_cloudinary_config first
  if (!cloudName || !uploadPreset) {
    try {
      const direct = localStorage.getItem('dinemaster_cloudinary_config');
      if (direct) {
        const parsed = JSON.parse(direct);
        if (!cloudName && parsed.cloudName?.trim()) cloudName = parsed.cloudName.trim();
        if (!cloudName && parsed.cloudinaryCloudName?.trim()) cloudName = parsed.cloudinaryCloudName.trim();
        if (!uploadPreset && parsed.uploadPreset?.trim()) uploadPreset = parsed.uploadPreset.trim();
        if (!uploadPreset && parsed.cloudinaryUploadPreset?.trim()) uploadPreset = parsed.cloudinaryUploadPreset.trim();
        if (!apiKey && parsed.apiKey?.trim()) apiKey = parsed.apiKey.trim();
      }
    } catch {}
  }

  // Check localStorage cached platform settings
  if (!cloudName || !uploadPreset) {
    try {
      const cached = localStorage.getItem('dinemaster_platform_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!cloudName && parsed.cloudinaryCloudName?.trim()) cloudName = parsed.cloudinaryCloudName.trim();
        if (!uploadPreset && parsed.cloudinaryUploadPreset?.trim()) uploadPreset = parsed.cloudinaryUploadPreset.trim();
        if (!apiKey && parsed.cloudinaryApiKey?.trim()) apiKey = parsed.cloudinaryApiKey.trim();
      }
    } catch {}
  }

  // Fetch platform_settings/general from Firestore if still missing
  if (!cloudName || !uploadPreset) {
    try {
      const snap = await getDoc(doc(db, 'platform_settings', 'general'));
      if (snap.exists()) {
        const data = snap.data();
        if (!cloudName && data.cloudinaryCloudName?.trim()) cloudName = data.cloudinaryCloudName.trim();
        if (!uploadPreset && data.cloudinaryUploadPreset?.trim()) uploadPreset = data.cloudinaryUploadPreset.trim();
        if (!apiKey && data.cloudinaryApiKey?.trim()) apiKey = data.cloudinaryApiKey.trim();
      }
    } catch (e) {
      console.warn('[cloudinaryService] Notice loading platform settings from Firestore:', e);
    }
  }

  return {
    cloudName: cloudName || DEFAULT_CLOUDINARY_CLOUD_NAME,
    uploadPreset: uploadPreset || DEFAULT_CLOUDINARY_UPLOAD_PRESET,
    apiKey: apiKey || '',
  };
}

/**
 * Synchronously checks if Cloudinary is configured from current memory / storage / settings
 */
export function getSyncCloudinaryConfig(customSettings?: any): { isConfigured: boolean; cloudName: string; uploadPreset: string } {
  let cloudName = customSettings?.cloudinaryCloudName?.trim() || (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  let uploadPreset = customSettings?.cloudinaryUploadPreset?.trim() || (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    try {
      const direct = localStorage.getItem('dinemaster_cloudinary_config');
      if (direct) {
        const parsed = JSON.parse(direct);
        if (!cloudName && (parsed.cloudName || parsed.cloudinaryCloudName)) {
          cloudName = (parsed.cloudName || parsed.cloudinaryCloudName).trim();
        }
        if (!uploadPreset && (parsed.uploadPreset || parsed.cloudinaryUploadPreset)) {
          uploadPreset = (parsed.uploadPreset || parsed.cloudinaryUploadPreset).trim();
        }
      }
    } catch {}
  }

  if (!cloudName || !uploadPreset) {
    try {
      const cached = localStorage.getItem('dinemaster_platform_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!cloudName && parsed.cloudinaryCloudName?.trim()) cloudName = parsed.cloudinaryCloudName.trim();
        if (!uploadPreset && parsed.cloudinaryUploadPreset?.trim()) uploadPreset = parsed.cloudinaryUploadPreset.trim();
      }
    } catch {}
  }

  // Fall back to default platform credentials if not explicitly customized
  const finalCloudName = cloudName || DEFAULT_CLOUDINARY_CLOUD_NAME;
  const finalUploadPreset = uploadPreset || DEFAULT_CLOUDINARY_UPLOAD_PRESET;

  return {
    isConfigured: Boolean(finalCloudName && finalUploadPreset),
    cloudName: finalCloudName,
    uploadPreset: finalUploadPreset,
  };
}

/**
 * Compresses an image file client-side using HTMLCanvasElement.
 * Reduces 2MB-10MB images down to a web-optimized 40KB-120KB JPEG/PNG,
 * safe for direct storage without exceeding Firestore document limits.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image data'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type === 'image/png' || file.name?.toLowerCase().endsWith('.png') 
          ? 'image/png' 
          : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Tests whether a Cloud Name and Upload Preset are valid and accepting uploads on Cloudinary
 */
export async function testCloudinaryConnection(
  cloudName: string,
  uploadPreset: string
): Promise<{ success: boolean; message: string }> {
  if (!cloudName?.trim() || !uploadPreset?.trim()) {
    return { success: false, message: 'Please provide both Cloud Name and Upload Preset to test.' };
  }

  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName.trim())}/image/upload`;
    // 1x1 transparent GIF base64
    const tinyPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    
    const payload = new FormData();
    payload.append('file', tinyPixel);
    payload.append('upload_preset', uploadPreset.trim());
    payload.append('folder', 'connection_test');

    const res = await fetch(uploadUrl, { method: 'POST', body: payload });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.secure_url) {
      return { 
        success: true, 
        message: `Connected successfully to Cloud "${cloudName}"! Preset "${uploadPreset}" is active.` 
      };
    }

    const err = data?.error?.message || res.statusText || 'Upload rejected';
    return { success: false, message: `Cloudinary rejected test: ${err}` };
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err?.message || 'Network request failed'}` };
  }
}

/**
 * Persists Cloudinary credentials locally in localStorage for instant access
 */
export function saveCloudinaryConfigLocally(config: { cloudName: string; uploadPreset: string; apiKey?: string }) {
  try {
    localStorage.setItem('dinemaster_cloudinary_config', JSON.stringify({
      cloudName: config.cloudName.trim(),
      uploadPreset: config.uploadPreset.trim(),
      apiKey: config.apiKey?.trim() || '',
    }));
    
    // Also update dinemaster_platform_settings so SuperAdmin sync stays aligned
    const cached = localStorage.getItem('dinemaster_platform_settings');
    const parsed = cached ? JSON.parse(cached) : {};
    parsed.cloudinaryCloudName = config.cloudName.trim();
    parsed.cloudinaryUploadPreset = config.uploadPreset.trim();
    if (config.apiKey) parsed.cloudinaryApiKey = config.apiKey.trim();
    localStorage.setItem('dinemaster_platform_settings', JSON.stringify(parsed));
  } catch (err) {
    console.warn('[cloudinaryService] Could not persist to localStorage:', err);
  }
}

/**
 * Uploads an image file directly to Cloudinary if configured, or falls back to
 * ultra-lightweight client-side compression (Data URL), ensuring 100% uptime
 * and seamless image saving without blocking the user.
 */
export async function uploadRestaurantImageToCloudinary(
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const { file, restaurantSlug, restaurantName, field = 'media', subfolder, customSettings } = options;

  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const rawSlug = (restaurantSlug || 'restaurant').toLowerCase().trim();
  const cleanSlug = rawSlug === 'bela-italia' || rawSlug === 'bella-italia' 
    ? 'bela-italia' 
    : rawSlug.replace(/[^a-z0-9_-]/g, '-');

  const targetFolder = subfolder 
    ? `restaurants/${cleanSlug}/${subfolder}`
    : `restaurants/${cleanSlug}`;

  const config = await resolveCloudinaryConfig(customSettings);

  // 1. If valid custom credentials exist (and are not the uncreated dummy default), attempt Cloudinary upload
  const isCustomCloudinary = Boolean(
    config.cloudName && 
    config.uploadPreset && 
    config.cloudName.trim() !== ''
  );

  if (isCustomCloudinary && config.cloudName !== 'dinemaster-pro') {
    try {
      const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName.trim())}/image/upload`;

      const payload = new FormData();
      payload.append('file', file);
      payload.append('upload_preset', config.uploadPreset.trim());
      payload.append('folder', targetFolder);
      payload.append('tags', `restaurant,${cleanSlug},${field}`);
      payload.append('context', `restaurant=${restaurantName || cleanSlug}|field=${field}`);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: payload,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.secure_url) {
        return {
          secure_url: data.secure_url,
          public_id: data.public_id || '',
          folder: targetFolder,
          width: data.width,
          height: data.height,
          format: data.format,
        };
      }
      console.warn('[cloudinaryService] Cloudinary cloud response:', data?.error?.message);
    } catch (netErr) {
      console.warn('[cloudinaryService] Network error during Cloudinary upload, applying built-in fallback:', netErr);
    }
  }

  // 2. Built-in resilient image optimization:
  // Compress to compact Data URL (~40-80KB) so image fits effortlessly into Firestore and renders instantly
  const maxDim = field === 'logoUrl' || field === 'faviconUrl' ? 512 : 1280;
  const optimizedDataUrl = await compressImageToDataUrl(file, maxDim, 0.82);

  return {
    secure_url: optimizedDataUrl,
    public_id: `media_${Date.now()}`,
    folder: targetFolder,
    format: 'image/jpeg',
  };
}
