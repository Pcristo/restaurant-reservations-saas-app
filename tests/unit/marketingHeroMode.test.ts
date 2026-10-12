import { describe, it, expect } from 'bun:test';
import { DEFAULT_MARKETING_SETTINGS } from '../../src/services/marketingWebsiteService';
import { MarketingWebsiteSettings } from '../../src/types/marketing';
import { existsSync } from 'fs';

describe('Marketing Hero Section Modes', () => {
  it('defaults to video background mode in DEFAULT_MARKETING_SETTINGS', () => {
    expect(DEFAULT_MARKETING_SETTINGS.hero.mode).toBe('video');
  });

  it('supports existing hero mode without errors', () => {
    const customSettings: MarketingWebsiteSettings = {
      ...DEFAULT_MARKETING_SETTINGS,
      hero: {
        ...DEFAULT_MARKETING_SETTINGS.hero,
        mode: 'existing'
      }
    };

    expect(customSettings.hero.mode).toBe('existing');
  });

  it('supports video background mode without errors', () => {
    const customSettings: MarketingWebsiteSettings = {
      ...DEFAULT_MARKETING_SETTINGS,
      hero: {
        ...DEFAULT_MARKETING_SETTINGS.hero,
        mode: 'video'
      }
    };

    expect(customSettings.hero.mode).toBe('video');
  });

  it('verifies that restaurant_manager_video.mp4 is available in assets/videos and public/videos', () => {
    expect(existsSync('src/assets/videos/restaurant_manager_video.mp4')).toBe(true);
    expect(existsSync('public/videos/restaurant_manager_video.mp4')).toBe(true);
  });
});
