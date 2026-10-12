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

export type HeroMode = 'existing' | 'video';

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
    mode?: HeroMode;
    videoUrl?: string;
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
