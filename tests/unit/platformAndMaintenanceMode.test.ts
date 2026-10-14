import { describe, it, expect } from 'bun:test';
import { DEFAULT_PLATFORM_SETTINGS } from '../../src/data/plans';
import { DEFAULT_SETTINGS } from '../../src/constants';
import { RestaurantSettings, PlatformSettings } from '../../src/types';

describe('Platform Development Mode & Restaurant Maintenance Mode Scoping', () => {
  it('platform settings default development mode to disabled', () => {
    expect(DEFAULT_PLATFORM_SETTINGS.developingModeEnabled).toBe(false);
    expect(DEFAULT_PLATFORM_SETTINGS.developingPassword).toBe('');
  });

  it('allows enabling platform development mode with custom password', () => {
    const customPlatform: PlatformSettings = {
      ...DEFAULT_PLATFORM_SETTINGS,
      developingModeEnabled: true,
      developingPassword: 'super-secret-pass',
    };

    expect(customPlatform.developingModeEnabled).toBe(true);
    expect(customPlatform.developingPassword).toBe('super-secret-pass');
  });

  it('restaurant settings default maintenance mode to disabled and do not contain platform development mode', () => {
    expect(DEFAULT_SETTINGS.maintenanceModeEnabled).toBe(false);
    expect((DEFAULT_SETTINGS as any).developingModeEnabled).toBeUndefined();
    expect((DEFAULT_SETTINGS as any).developingPassword).toBeUndefined();
  });

  it('scopes maintenance mode strictly to individual restaurant settings without mutating platform defaults', () => {
    const restaurantASettings: RestaurantSettings = {
      ...DEFAULT_SETTINGS,
      id: 'restaurant-a',
      restaurantId: 'restaurant-a',
      name: 'Restaurant A',
      maintenanceModeEnabled: true,
      maintenanceMessage: 'Restaurant A is undergoing maintenance',
    };

    const restaurantBSettings: RestaurantSettings = {
      ...DEFAULT_SETTINGS,
      id: 'restaurant-b',
      restaurantId: 'restaurant-b',
      name: 'Restaurant B',
      maintenanceModeEnabled: false,
    };

    expect(restaurantASettings.maintenanceModeEnabled).toBe(true);
    expect(restaurantBSettings.maintenanceModeEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.maintenanceModeEnabled).toBe(false);
  });
});
