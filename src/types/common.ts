/**
 * Common primitive types, timestamps, and utility types
 */

export type ISODateString = string; // e.g. 'YYYY-MM-DD'
export type ISOTimeString = string; // e.g. 'HH:mm'
export type ISODateTimeString = string; // e.g. 'YYYY-MM-DDTHH:mm:ss.sssZ'

export type SupportedLanguage = 'en' | 'pt';
export type SupportedTheme = 'light' | 'dark';

export type TimestampLike = 
  | string 
  | number 
  | Date 
  | { toDate?: () => Date; seconds?: number; nanoseconds?: number; [key: string]: any };
