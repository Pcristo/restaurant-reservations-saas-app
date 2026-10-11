export type UserRole = 
  | 'super_admin' 
  | 'restaurant_owner' 
  | 'restaurant_manager' 
  | 'restaurant_staff' 
  | 'admin' 
  | 'staff' 
  | 'customer';

export type Permission =
  | 'reservations.view'
  | 'reservations.create'
  | 'reservations.edit'
  | 'reservations.cancel'
  | 'customers.view'
  | 'customers.edit'
  | 'tables.view'
  | 'tables.manage'
  | 'restaurant.settings'
  | 'restaurant.staff'
  | 'restaurant.analytics'
  | 'restaurant.billing'
  | 'seo.manage'
  | 'branding.manage'
  | 'domains.manage'
  | 'superadmin.manage';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  name?: string;
  phone?: string;
  staffNumber?: string;
  authUid?: string;
  authProvider?: string;
  restaurantId?: string;
  restaurantIds?: string[];
  permissions?: Permission[];
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  invitedBy?: string;
  invitedAt?: any;
}

export type RestaurantStatus = 'active' | 'trial' | 'suspended' | 'cancelled' | 'archived';

export interface RestaurantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  buttonStyle?: 'rounded' | 'pill' | 'square';
  displayName?: string;
  theme?: 'light' | 'dark';
  fontFamily?: 'Inter' | 'Playfair Display' | 'Montserrat' | 'Open Sans' | 'Poppins';
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryApiKey?: string;
}

export interface DomainRecord {
  id: string;
  restaurantId: string;
  domain: string;
  type: 'cname' | 'apex';
  status: 'pending' | 'verification_required' | 'verified' | 'active' | 'ssl_pending' | 'error' | 'disabled';
  isPrimary: boolean;
  verificationToken: string;
  verifiedAt?: string;
  sslStatus: 'active' | 'pending' | 'failed' | 'unverified';
  dnsRecordType: 'CNAME' | 'A' | 'TXT';
  dnsTarget: string;
  lastCheckedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanCustomFeature {
  id: string;
  title: string;
  description: string;
  enabled?: boolean;
}

export interface RestaurantGalleryImage {
  id: string;
  url: string;
  title?: string;
  caption?: string;
  folder?: string;
  cloudinaryPublicId?: string;
  createdAt?: string;
}

export interface PlanEntitlements {
  maxStaffUsers: number;
  maxTables: number;
  maxReservations: number;
  customDomain: boolean;
  advancedAnalytics: boolean;
  whatsapp: boolean;
  sms: boolean;
  advancedSEO: boolean;
  waitlist: boolean;
  apiAccess: boolean;
  [key: string]: any;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  isPopular?: boolean;
  isActive?: boolean;
  isPublic?: boolean;
  entitlements: PlanEntitlements;
  customFeatures?: PlanCustomFeature[];
}

export interface Restaurant {
  id: string;
  name: string;
  legalName?: string;
  slug: string;
  subdomain?: string;
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
  status: RestaurantStatus;
  planId: string;
  planName?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  country: string;
  currency: string;
  timezone: string;
  language: 'en' | 'pt';
  description?: string;
  descriptionPt?: string;
  cuisine?: string;
  priceRange?: string;
  address?: string;
  city?: string;
  countyState?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  googleBusinessUrl?: string;
  googleMapsUrl?: string;
  latitude?: number | string;
  longitude?: number | string;
  branding?: RestaurantBranding;
  seo?: RestaurantSEO;
  settings?: Partial<RestaurantSettings>;
  openingHours?: any;
  primaryDomain?: string;
  domains?: DomainRecord[];
  stats?: {
    totalReservations: number;
    totalCustomers: number;
    activeTables: number;
    reservationsToday?: number;
    revenueThisMonth?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_RESTAURANT_ID = 'default-restaurant';

export interface SuperAdminInvitation {
  id: string;
  email: string;
  name?: string;
  role: 'super_admin';
  status: 'pending' | 'accepted' | 'revoked' | 'declined';
  invitedBy: string;
  createdAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  timestamp: string;
  ip?: string;
  result: 'success' | 'failure';
}

export interface PlatformNotification {
  id: string;
  restaurantId?: string;
  type: 
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

export interface MarketingReview {
  id: string;
  name: string;
  restaurantName: string;
  role?: string;
  text: string;
  rating: number; // 1 to 5
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface MarketingWebsiteSettings {
  enabled: boolean;
  general: {
    siteName: string;
    tagline?: string;
    logoUrl?: string;
    faviconUrl?: string;
    contactEmail: string;
    contactPhone?: string;
    primaryCtaText: string;
    primaryCtaUrl: string;
  };
  hero: {
    enabled: boolean;
    headline: string;
    description: string;
    primaryCtaText: string;
    primaryCtaUrl: string;
    secondaryCtaText?: string;
    secondaryCtaUrl?: string;
    imageUrl?: string;
    badgeText?: string;
  };
  about: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    description: string;
    imageUrl?: string;
    features?: Array<{
      title: string;
      description: string;
      icon?: string;
    }>;
  };
  reviews: {
    showReviews: boolean;
    title?: string;
    subtitle?: string;
    items: MarketingReview[];
  };
  pricing: {
    showPricing: boolean;
    title?: string;
    subtitle?: string;
  };
  contact: {
    enabled: boolean;
    title: string;
    description: string;
    destinationEmail: string;
    phone?: string;
  };
  footer: {
    description?: string;
    copyright?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      x?: string;
    };
  };
}

export interface SpecialSchedule {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: string[]; // e.g. ['Monday', 'Tuesday', ...] or ['monday', 'tuesday', ...]
  active?: boolean;
  closed?: boolean;
  lunch?: {
    open: string;
    close: string;
    active: boolean;
    fullHouse?: boolean;
  };
  dinner?: {
    open: string;
    close: string;
    active: boolean;
    fullHouse?: boolean;
  };
  open?: string;
  close?: string;
  reservationInterval?: number;
  note?: string;
}

export interface RestaurantSEO {
  // Basic SEO & OpenGraph Meta
  seoTitle?: string;
  seoTitleEn?: string;
  seoTitlePt?: string;
  metaDescription?: string;
  metaDescriptionEn?: string;
  metaDescriptionPt?: string;
  keywords?: string;
  keywordsPt?: string;
  siteName?: string; // og:site_name
  ogUrl?: string; // og:url

  // Local SEO & Rich Snippets
  cuisineType?: string;
  priceRange?: string; // '€' | '€€' | '€€€' | '€€€€' | '$' | '$$' | '$$$' | '$$$$'
  city?: string;
  stateCounty?: string;
  postalCode?: string;
  country?: string;
  streetAddress?: string;
  googleBusinessUrl?: string;
  googleMapsUrl?: string;
  latitude?: number | string;
  longitude?: number | string;

  // Social Sharing
  socialTitle?: string;
  socialTitlePt?: string;
  socialDescription?: string;
  socialDescriptionPt?: string;
  socialImageUrl?: string;
  cloudinarySocialImageUrl?: string;
  socialPreviewCardBg?: string; // Custom background color for admin social preview box

  // Indexing & Canonical Controls
  allowIndexing?: boolean; // default true
  canonicalUrl?: string;

  // Structured Data / Custom JSON-LD
  customJsonLd?: string;
}

export interface RestaurantSettings {
  id?: string;
  restaurantId?: string;
  name: string;
  timezone?: string;
  autoSendManualReservationsEmails?: boolean;
  description?: string;
  descriptionEn?: string;
  address: string;
  city?: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  websiteUrl?: string;
  branding?: any;
  socialLinks?: { platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'tripadvisor', url: string }[];
  logoUrl?: string;
  logoSize?: number;
  showLogo?: boolean;
  showRestaurantName?: boolean;
  faviconUrl?: string;
  heroImageUrl?: string;
  footerImageUrl?: string;
  heroOverlay?: string;
  heroOverlayOpacity?: number;
  footerOverlay?: string;
  footerOverlayOpacity?: number;
  openingHours: Record<string, { 
    open: string; 
    close: string; 
    closed: boolean;
    lunch?: { open: string; close: string; active: boolean; fullHouse?: boolean };
    dinner?: { open: string; close: string; active: boolean; fullHouse?: boolean };
  }>;
  promotionPopups?: PromotionPopup[];
  closedDays: string[];
  closedPeriods?: { startDate: string; endDate: string; note?: string }[];
  recurringClosedDays?: string[]; // For MM-DD format
  reservationInterval?: number; // in minutes, e.g., 15, 30, 60
  defaultTurnDuration?: number; // in minutes, e.g., 90, 120
  minReservationGap?: number;
  compactAdminViews?: boolean;
  cronogramaTimeRange?: 'service' | '24h'; // in minutes, e.g., 135 (2h15m)
  cronogramaStartTime?: string; // e.g., '11:00'
  lastOnlineReservationMinutes?: number; // minutes before close for last online reservation
  allowOnlineReservations?: boolean;
  phoneVerificationEnabled?: boolean;
  defaultCountryCode?: string;
  maxOnlineGuests?: number;
  maxMonthsAhead?: number;
  fullHouseDates?: string[];
  fullHouseLunchDates?: string[];
  fullHouseDinnerDates?: string[];
  showCustomerInsights?: boolean;
  tripadvisorWidget?: string;
  showTripadvisorWidget?: boolean;
  googleMapsWidget?: string;
  showGoogleMapsWidget?: boolean;
  showLiveUpcomingBox?: boolean;
  showLanguageSwitch?: boolean;
  freezeEnabled?: boolean;
  freezePassword?: string;
  freezeTime?: number; // in minutes
  cloudinaryLogoUrl?: string;
  cloudinaryFaviconUrl?: string;
  cloudinaryHeroImageUrl?: string;
  cloudinaryFooterImageUrl?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryApiKey?: string;
  useCloudinary?: boolean;
  galleryImages?: RestaurantGalleryImage[];
  dataHistoryPassword?: string;
  appUnlockPin?: string;
  protectPdfWithPassword?: boolean;
  pdfPassword?: string;
  fontFamily?: 'Inter' | 'Playfair Display' | 'Montserrat' | 'Open Sans' | 'Poppins';
  theme?: 'light' | 'dark';
  enablePageTransitions?: boolean;
  preloaderBg?: 'white' | 'dark' | 'brand';
  timeFormat?: '12h' | '24h';
  heroHeight?: '50vh' | '60vh' | '75vh' | '100vh';
  containerWidth?: 'default' | '1480px';
  primaryColor?: string;
  buttonBorderRadius?: string;
  boxBorderRadius?: string;
  inputBorderRadius?: string;
  showFloorPlanBg?: boolean;
  floorPlanBgUrl?: string;
  useDefaultFloorPlanBg?: boolean;
  floorPlanOpacity?: number;
  silentBell?: boolean;
  specialDays?: Record<string, {
    open?: string;
    close?: string;
    closed?: boolean;
    reservationInterval?: number;
    active: boolean;
    lunch?: { open: string; close: string; active: boolean; fullHouse?: boolean };
    dinner?: { open: string; close: string; active: boolean; fullHouse?: boolean };
  }>;
  recurringSpecialDays?: Record<string, {
    open?: string;
    close?: string;
    closed?: boolean;
    reservationInterval?: number;
    active: boolean;
    lunch?: { open: string; close: string; active: boolean; fullHouse?: boolean };
    dinner?: { open: string; close: string; active: boolean; fullHouse?: boolean };
  }>;
  specialSchedulesActive?: boolean;
  specialSchedules?: SpecialSchedule[];
  maintenanceModeEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceMessageEn?: string;
  maintenanceShowHero?: boolean;
  maintenanceHeroImageUrl?: string;
  developingModeEnabled?: boolean;
  developingPassword?: string;
  gracePeriod?: number;
  enableBookingNumber?: boolean;
  bookingNumberPrefix?: string;
  bookingNumberResetDate?: string;
  region?: 'portugal' | 'ireland';
  seo?: RestaurantSEO;
}

export interface PromotionPopup {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string;
  title: string;
  titlePt?: string;
  subtitle?: string;
  subtitlePt?: string;
  message: string;
  messagePt?: string;
  imageUrl?: string;
}

export interface Area {
  id: string;
  restaurantId?: string;
  name: string;
  allowOnlineReservations?: boolean;
  bookingMode?: 'online' | 'manual' | 'closed' | 'special_event' | 'permanently_closed';
  closedStartDate?: string;
  closedEndDate?: string;
  closedSessions?: ('lunch' | 'dinner')[];
  sessionMode?: 'both' | 'lunch' | 'dinner';
  order?: number;
  specialEventName?: string;
  specialEventSessions?: ('lunch' | 'dinner')[];
  color?: string;
  dateOverrides?: Record<string, {
    bookingMode?: 'online' | 'manual' | 'closed' | 'special_event' | 'permanently_closed';
    allowOnlineReservations?: boolean;
    specialEventName?: string;
    specialEventSessions?: ('lunch' | 'dinner')[];
    sessionMode?: 'both' | 'lunch' | 'dinner';
    closedSessions?: ('lunch' | 'dinner')[];
    x?: number;
    y?: number;
  }>;
}

export type TableShape = 'round' | 'square' | 'rectangle';

export interface Table {
  id: string;
  restaurantId?: string;
  name: string;
  seats: number;
  x: number;
  y: number;
  status: 'available' | 'reserved' | 'occupied';
  shape?: TableShape;
  rotation?: number;
  isBlocked?: boolean;
  areaId?: string; // Related area ID
  blockedDates?: Record<string, { lunch?: boolean; dinner?: boolean; default?: boolean }>;
  allowOnlineReservations?: boolean;
  onlineSessions?: {
    lunch: boolean;
    dinner: boolean;
  };
  isActive?: boolean;
  activeSessions?: {
    lunch: boolean;
    dinner: boolean;
  };
  availableDate?: string;
  availableDates?: string[];
  isExtra?: boolean;
  extraStartDate?: string;
  extraEndDate?: string;
  extraSessions?: {
    lunch: boolean;
    dinner: boolean;
  };
  extraAvailability?: Record<string, { lunch: boolean; dinner: boolean }>;
  positions?: {
    lunch?: { x: number; y: number };
    dinner?: { x: number; y: number };
  };
  dailyPositions?: Record<string, {
    lunch?: { x: number; y: number };
    dinner?: { x: number; y: number };
    default?: { x: number; y: number };
  }>;
  joinedTables?: string[]; // IDs of tables joined with this one
  joinedSeats?: number; // Total seats when joined
  dailyJoins?: Record<string, {
    lunch?: { joinedTables: string[]; joinedSeats: number };
    dinner?: { joinedTables: string[]; joinedSeats: number };
    default?: { joinedTables: string[]; joinedSeats: number };
  }>;
}

export interface Reservation {
  id: string;
  restaurantId?: string;
  bookingNumber?: string;
  customerUid?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  language?: 'pt' | 'en';
  date: string;
  time: string;
  guests: number;
  tableId?: string;
  tableName?: string;
  notes?: string;
  status: 'pending' | 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'blocked' | 'arrived' | 'no-show' | 'waiting-list' | 'delayed' | 'history';
  isWaitlist?: boolean;
  isDeleted?: boolean;
  isHistory?: boolean;
  createdAt?: string;
  source?: 'public' | 'admin';
  bookedByStaffNumber?: string;
  showInUpcomingReports?: boolean;
  verifyTableNumber?: boolean;
  preferredTableUnavailable?: boolean;
  isRegularCustomer?: boolean;
  isDeletedByCustomer?: boolean;
  manualSession?: 'lunch' | 'dinner';
  session?: 'lunch' | 'dinner' | string;
  confirmationEmail?: {
    sent: boolean;
    sentAt?: string | null;
    messageId?: string;
    failed?: boolean;
    error?: string;
    lastAttemptAt?: string;
  };
  reminderEmail?: {
    scheduled: boolean;
    scheduledAt?: string | null;
    scheduledFor?: string | null;
    sent: boolean;
    sentAt?: string | null;
    messageId?: string | null;
  };
}

export interface Customer {
  id: string;
  restaurantId?: string;
  name: string;
  phone?: string;
  email?: string;
  language?: 'pt' | 'en';
  notes?: string;
  tags?: string[];
  lastVisit?: string;
  noShowCount?: number;
  totalVisits?: number;
  isRegular?: boolean;
  favoriteTables?: string[];
  isRegistered?: boolean;
  authUid?: string;
  status?: 'active' | 'inactive';
  isDeleted?: boolean;
  isHistory?: boolean;
  createdAt?: string;
}
