import { describe, it, expect } from 'bun:test';
import { hasPermission, isUserSuperAdmin, ROLE_DEFAULT_PERMISSIONS } from '../../src/lib/permissions';
import { User } from '../../src/types';

describe('User Permissions and Authorization', () => {
  it('identifies super admin correctly', () => {
    const superAdminUser: User = {
      id: 'usr-1',
      email: 'admin@platform.com',
      role: 'super_admin',
      status: 'active'
    };

    expect(isUserSuperAdmin(superAdminUser)).toBe(true);
    expect(hasPermission(superAdminUser, 'superadmin.manage')).toBe(true);
    expect(hasPermission(superAdminUser, 'reservations.view')).toBe(true);
  });

  it('prevents restaurant tenants from acting as super admins', () => {
    const restaurantUser: User = {
      id: 'usr-2',
      email: 'owner@restaurant.com',
      role: 'restaurant_owner',
      status: 'active',
      restaurantId: 'rest-1'
    };

    expect(isUserSuperAdmin(restaurantUser)).toBe(false);
    expect(hasPermission(restaurantUser, 'superadmin.manage')).toBe(false);
    expect(hasPermission(restaurantUser, 'reservations.edit')).toBe(true);
  });

  it('checks custom granular permissions when assigned', () => {
    const staffUser: User = {
      id: 'usr-3',
      email: 'staff@restaurant.com',
      role: 'staff',
      status: 'active',
      restaurantId: 'rest-1',
      permissions: ['reservations.view', 'tables.view']
    };

    expect(hasPermission(staffUser, 'reservations.view')).toBe(true);
    expect(hasPermission(staffUser, 'restaurant.settings')).toBe(false);
  });

  it('rejects suspended users from having super admin privileges', () => {
    const suspendedAdmin: User = {
      id: 'usr-4',
      email: 'badactor@platform.com',
      role: 'super_admin',
      status: 'suspended'
    };

    expect(isUserSuperAdmin(suspendedAdmin)).toBe(false);
  });
});
