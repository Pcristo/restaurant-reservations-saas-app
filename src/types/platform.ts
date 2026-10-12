export interface AuditLogEntry {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
  result: 'success' | 'failure';
}

export type PlatformNotificationType =
  | 'new_reservation' 
  | 'reservation_cancellation' 
  | 'reservation_modified' 
  | 'customer_arrived' 
  | 'no_show' 
  | 'waitlist_available' 
  | 'capacity_warning' 
  | 'system_alert' 
  | 'subscription_warning' 
  | 'domain_issue';

export interface PlatformNotification {
  id: string;
  restaurantId?: string;
  type: PlatformNotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface PlatformSettings {
  // Platform Credentials
  firebaseProjectId?: string;
  firebaseAppId?: string;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseDatabaseId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  resendApiKey?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryUploadPreset?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  recaptchaSiteKey?: string;
  recaptchaSecretKey?: string;
  googleMapsApiKey?: string;

  saasName: string;
  platformUrl: string;
  supportEmail: string;
  defaultPlatformDomain: string;
  cnameTarget: string;
  apexTarget: string;
  defaultLanguage: 'en' | 'pt';
  defaultTimezone: string;
  emailProvider: 'resend' | 'smtp';
  senderName: string;
  senderEmail: string;
  featureFlags: {
    customDomains: boolean;
    advancedSEO: boolean;
    analytics: boolean;
    whatsapp: boolean;
    sms: boolean;
    waitlist: boolean;
    advancedFloorPlans: boolean;
    api: boolean;
  };
}
