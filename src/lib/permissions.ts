import { User, UserRole, Permission } from '../types';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
    'restaurant.billing',
    'seo.manage',
    'branding.manage',
    'domains.manage',
    'superadmin.manage',
  ],
  restaurant_owner: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
    'restaurant.billing',
    'seo.manage',
    'branding.manage',
    'domains.manage',
  ],
  admin: [
    // Legacy support
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
    'restaurant.billing',
    'seo.manage',
    'branding.manage',
    'domains.manage',
  ],
  restaurant_manager: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'customers.edit',
    'tables.view',
    'tables.manage',
    'restaurant.settings',
    'restaurant.staff',
    'restaurant.analytics',
  ],
  restaurant_staff: [
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'tables.view',
  ],
  staff: [
    // Legacy support
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.cancel',
    'customers.view',
    'tables.view',
  ],
  customer: [
    'reservations.view',
  ],
};

export function hasPermission(
  user: User | null,
  permission: Permission,
  targetRestaurantId?: string
): boolean {
  if (!user) return false;

  // Master Super Admin check (strictly non-tenant users only)
  const isSuperAdmin = 
    !user.restaurantId &&
    (user.role === 'super_admin' || (user.email && user.email.toLowerCase() === 'pcristo35@gmail.com')) &&
    user.status !== 'suspended' &&
    user.status !== 'inactive';

  if (isSuperAdmin) {
    return true;
  }

  // If a target restaurant is specified, ensure user has access to that restaurant
  if (targetRestaurantId && user.restaurantId && user.restaurantId !== targetRestaurantId) {
    // Check if user has access to multiple restaurants
    if (!user.restaurantIds || !user.restaurantIds.includes(targetRestaurantId)) {
      return false;
    }
  }

  // Custom assigned permissions override
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }

  // Fallback to role-based default permissions
  const rolePermissions = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

export function isUserSuperAdmin(userOrEmail: User | string | null | undefined): boolean {
  if (!userOrEmail) return false;

  if (typeof userOrEmail === 'string') {
    const email = userOrEmail.toLowerCase().trim();
    if (email === 'pcristo35@gmail.com') return true;
    try {
      const cached = localStorage.getItem('dinemaster_superadmin_emails');
      if (cached) {
        const emailList: string[] = JSON.parse(cached);
        return emailList.some(e => e.toLowerCase() === email);
      }
    } catch {}
    return false;
  }

  if (userOrEmail.status === 'suspended' || userOrEmail.status === 'inactive') {
    return false;
  }

  // Emails associated with restaurant tenants can NEVER be Super Admins
  if (userOrEmail.restaurantId || (userOrEmail.restaurantIds && userOrEmail.restaurantIds.length > 0)) {
    return false;
  }

  if (userOrEmail.email && userOrEmail.email.toLowerCase().trim() === 'pcristo35@gmail.com') {
    return true;
  }

  if (userOrEmail.role === 'super_admin' || (userOrEmail.role as any) === 'superadmin') {
    return true;
  }

  // Check cached emails from Super Admin panel invitations / creations
  if (userOrEmail.email) {
    try {
      const cleanEmail = userOrEmail.email.toLowerCase().trim();
      const cached = localStorage.getItem('dinemaster_superadmin_emails');
      if (cached) {
        const emailList: string[] = JSON.parse(cached);
        return emailList.some(e => e.toLowerCase() === cleanEmail);
      }
    } catch {}
  }

  return false;
}

export function isUserRestaurantAdmin(user: User | null, restaurantId?: string): boolean {
  if (!user) return false;
  if (isUserSuperAdmin(user)) return true;
  const isOwnerOrAdmin = user.role === 'restaurant_owner' || user.role === 'admin' || user.role === 'restaurant_manager';
  if (!isOwnerOrAdmin) return false;
  if (restaurantId && user.restaurantId && user.restaurantId !== restaurantId) {
    return !!user.restaurantIds?.includes(restaurantId);
  }
  return true;
}

export function isUserStaff(user: User | null, restaurantId?: string): boolean {
  if (!user) return false;
  if (isUserSuperAdmin(user)) return true;
  const isStaffRole = [
    'restaurant_owner', 
    'restaurant_manager', 
    'restaurant_staff', 
    'admin', 
    'staff'
  ].includes(user.role);
  if (!isStaffRole) return false;
  if (restaurantId && user.restaurantId && user.restaurantId !== restaurantId) {
    return !!user.restaurantIds?.includes(restaurantId);
  }
  return true;
}
