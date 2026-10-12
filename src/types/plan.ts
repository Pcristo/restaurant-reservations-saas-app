export interface PlanCustomFeature {
  id: string;
  title: string;
  description: string;
  enabled?: boolean;
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
  [key: string]: unknown;
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
