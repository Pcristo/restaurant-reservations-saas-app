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
