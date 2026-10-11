import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Reservation, DEFAULT_RESTAURANT_ID } from '../types';
import { useTenantSafe } from './useTenant';

interface NotificationContextType {
  hasNewBookings: boolean;
  setHasNewBookings: (val: boolean) => void;
  newBookingsList: Reservation[];
  addNotificationBooking: (res: Reservation) => void;
  removeNotificationBooking: (id: string) => void;
  clearNotificationBookings: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const tenant = useTenantSafe();
  const targetRestaurantId = tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID;
  const storageKey = `new_bookings_list_${targetRestaurantId}`;

  const [newBookingsList, setNewBookingsList] = React.useState<Reservation[]>(() => {
    const saved = localStorage.getItem(`new_bookings_list_${targetRestaurantId}`) || localStorage.getItem('new_bookings_list');
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        const todayStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
        return parsed.filter(res => {
          if (res.date < todayStr) return false;
          if (isDefault) return !res.restaurantId || res.restaurantId === DEFAULT_RESTAURANT_ID || res.restaurantId === 'main';
          return res.restaurantId === targetRestaurantId;
        });
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [hasNewBookings, setHasNewBookings] = React.useState(() => {
    return newBookingsList.length > 0;
  });

  // Reload when targetRestaurantId changes
  React.useEffect(() => {
    const saved = localStorage.getItem(`new_bookings_list_${targetRestaurantId}`);
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        const todayStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
        const filtered = parsed.filter(res => {
          if (res.date < todayStr) return false;
          if (isDefault) return !res.restaurantId || res.restaurantId === DEFAULT_RESTAURANT_ID || res.restaurantId === 'main';
          return res.restaurantId === targetRestaurantId;
        });
        setNewBookingsList(filtered);
        setHasNewBookings(filtered.length > 0);
      } else {
        setNewBookingsList([]);
        setHasNewBookings(false);
      }
    } catch {
      setNewBookingsList([]);
      setHasNewBookings(false);
    }
  }, [targetRestaurantId]);

  React.useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    
    const valid = newBookingsList.filter(res => res.date >= todayStr);
    if (valid.length !== newBookingsList.length) {
      setNewBookingsList(valid);
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(newBookingsList));
    setHasNewBookings(newBookingsList.length > 0);
  }, [newBookingsList, storageKey]);

  const addNotificationBooking = (res: Reservation) => {
    // Only accept if belongs to current tenant
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    const matchesTenant = isDefault 
      ? (!res.restaurantId || res.restaurantId === DEFAULT_RESTAURANT_ID || res.restaurantId === 'main')
      : res.restaurantId === targetRestaurantId;
    if (!matchesTenant) return;

    setNewBookingsList((prev) => {
      if (prev.some((item) => item.id === res.id)) return prev;
      return [res, ...prev];
    });
  };

  const removeNotificationBooking = (id: string) => {
    setNewBookingsList((prev) => prev.filter((item) => item.id !== id));
  };

  const clearNotificationBookings = () => {
    setNewBookingsList([]);
  };

  return (
    <NotificationContext.Provider value={{ 
      hasNewBookings, 
      setHasNewBookings,
      newBookingsList,
      addNotificationBooking,
      removeNotificationBooking,
      clearNotificationBookings
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

