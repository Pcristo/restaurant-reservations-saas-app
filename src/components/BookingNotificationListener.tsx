import React, { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useTenantSafe } from '../hooks/useTenant';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../hooks/useSettings';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Reservation, DEFAULT_RESTAURANT_ID } from '../types';

export const BookingNotificationListener: React.FC = () => {
  const { isStaff, isAdmin } = useAuth();
  const tenant = useTenantSafe();
  const targetRestaurantId = tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID;
  const location = useLocation();
  const { setHasNewBookings, addNotificationBooking } = useNotifications();
  const { settings } = useSettings();
  const isInitialLoad = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenerStartTime = useRef<number>(Date.now());
  const silentBellRef = useRef(false);

  useEffect(() => {
    silentBellRef.current = !!settings?.silentBell;
  }, [settings?.silentBell]);

  useEffect(() => {
    // Reset initial load flag when restaurant changes
    isInitialLoad.current = true;
    // Record start time whenever the listener is established to avoid historical toasts
    listenerStartTime.current = Date.now();
    
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;

    // Only listen if staff or admin
    if (!isStaff && !isAdmin) return;
    if (!location.pathname.startsWith('/admin')) return;

    // Filter to latest bookings with a simple single-field order by to avoid composite index crashes
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    let q;
    if (isDefault) {
      q = query(
        collection(db, 'reservations'),
        orderBy('createdAt', 'desc'),
        limit(15)
      );
    } else {
      q = query(
        collection(db, 'reservations'),
        where('restaurantId', '==', targetRestaurantId),
        orderBy('createdAt', 'desc'),
        limit(15)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // The first fire of onSnapshot contains existing data.
      // We skip it to avoid the "10 toasts on login" issue.
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const reservation = { id: change.doc.id, ...data } as Reservation;
          
          // Check tenant match
          const isTenantMatch = isDefault
            ? (!reservation.restaurantId || reservation.restaurantId === DEFAULT_RESTAURANT_ID || reservation.restaurantId === 'main')
            : reservation.restaurantId === targetRestaurantId;
          if (!isTenantMatch) return;

          // Only notify for public guest bookings
          if (reservation.source !== 'public') return;
          
          // CRITICAL: Ensure we only notify for bookings created AFTER this session started.
          // This provides a double-layer of protection against the flood.
          let createdAtMs = 0;
          if (data.createdAt) {
            // Handle Firestore Timestamp object or Date string/Date object
            if (typeof data.createdAt.toMillis === 'function') {
              createdAtMs = data.createdAt.toMillis();
            } else {
              createdAtMs = new Date(data.createdAt).getTime();
            }
          } else {
            // Fallback if createdAt is not yet set (local creation)
            createdAtMs = Date.now();
          }

          // Only notify if created after we started listening (with a small buffer for server sync)
          if (createdAtMs > listenerStartTime.current - 5000) {
            // Set new bookings flag
            setHasNewBookings(true);
            addNotificationBooking(reservation);

            // Play sound
            if (audioRef.current && !silentBellRef.current) {
              audioRef.current.play().catch(err => console.error('Error playing notification sound:', err));
            }

            // Show toast
            const dateStr = reservation.date;
            // Format date to show day of week
            let dayName = '';
            try {
              const dateObj = new Date(dateStr);
              dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
            } catch (e) {
              dayName = dateStr;
            }

            toast.success(`New booking: ${reservation.customerName} for ${dayName} (${dateStr})`, {
              duration: 8000,
              icon: '🔔',
              style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#1a1a1a',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontWeight: 'bold',
              },
            });
          }
        }
      });
    }, (error) => {
      console.error("Error listening to reservations:", error);
    });

    return () => unsubscribe();
  }, [isStaff, isAdmin, location.pathname, targetRestaurantId]);

  return null;
};
