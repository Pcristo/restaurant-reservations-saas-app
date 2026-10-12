import { describe, it, expect } from 'bun:test';
import { APP_CONFIG } from '../../src/data/appConfig';
import { CONFIG } from '../../src/config';

describe('E2E Configuration and Metadata Smoke Test', () => {
  it('has consistent application configuration', () => {
    expect(APP_CONFIG.appName).toBe('DineMaster Pro');
    expect(CONFIG.app.appName).toBe('DineMaster Pro');
    expect(CONFIG.defaults.minReservationGap).toBe(135);
  });

  it('validates supported day schedules in configuration', () => {
    expect(CONFIG.daysOfWeek.length).toBe(7);
    expect(CONFIG.daysOfWeek).toContain('Monday');
    expect(CONFIG.daysOfWeek).toContain('Sunday');
  });
});
