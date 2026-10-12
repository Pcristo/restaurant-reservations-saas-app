import { APP_CONFIG } from '../data/appConfig';
import { DAYS_OF_WEEK, DEFAULT_SETTINGS } from '../constants';

export { APP_CONFIG, DAYS_OF_WEEK, DEFAULT_SETTINGS };

export const CONFIG = {
  app: APP_CONFIG,
  daysOfWeek: DAYS_OF_WEEK,
  defaultSettings: DEFAULT_SETTINGS,
  defaults: {
    minReservationGap: 135,
    timezone: 'Europe/Lisbon',
    language: 'pt' as const,
    maxOnlineGuests: 10,
    maxMonthsAhead: 2
  }
};

export default CONFIG;
