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
