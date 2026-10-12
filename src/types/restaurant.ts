import { DomainRecord } from './domain';

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

export interface RestaurantGalleryImage {
  id: string;
  url: string;
  title?: string;
  caption?: string;
  folder?: string;
  cloudinaryPublicId?: string;
  createdAt?: string;
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
  seoTitle?: string;
  seoTitleEn?: string;
  seoTitlePt?: string;
  metaDescription?: string;
  metaDescriptionEn?: string;
  metaDescriptionPt?: string;
  keywords?: string;
  keywordsPt?: string;
  siteName?: string;
  ogUrl?: string;
  cuisineType?: string;
  priceRange?: string;
  city?: string;
  stateCounty?: string;
  postalCode?: string;
  country?: string;
  streetAddress?: string;
  googleBusinessUrl?: string;
  googleMapsUrl?: string;
  latitude?: number | string;
  longitude?: number | string;
  socialTitle?: string;
  socialTitlePt?: string;
  socialDescription?: string;
  socialDescriptionPt?: string;
  socialImageUrl?: string;
  cloudinarySocialImageUrl?: string;
  socialPreviewCardBg?: string;
  allowIndexing?: boolean;
  canonicalUrl?: string;
  customJsonLd?: string;
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
  branding?: RestaurantBranding;
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
  recurringClosedDays?: string[];
  reservationInterval?: number;
  defaultTurnDuration?: number;
  minReservationGap?: number;
  compactAdminViews?: boolean;
  cronogramaTimeRange?: 'service' | '24h';
  cronogramaStartTime?: string;
  lastOnlineReservationMinutes?: number;
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
  freezeTime?: number;
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
  areaId?: string;
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
  joinedTables?: string[];
  joinedSeats?: number;
  dailyJoins?: Record<string, {
    lunch?: { joinedTables: string[]; joinedSeats: number };
    dinner?: { joinedTables: string[]; joinedSeats: number };
    default?: { joinedTables: string[]; joinedSeats: number };
  }>;
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
  openingHours?: Record<string, any>;
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

export type Tenant = Restaurant;

export const DEFAULT_RESTAURANT_ID = 'default-restaurant';
