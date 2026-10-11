import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Table, Area } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useTenantSafe } from './useTenant';
import { DEFAULT_RESTAURANT_ID } from '../services/tenantService';

const generateFriendlyId = (text: string) => {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export const DEFAULT_TABLES: Table[] = [
  { id: 'table-1', name: 'Table 1', seats: 2, x: 60, y: 80, shape: 'round', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-2', name: 'Table 2', seats: 2, x: 180, y: 80, shape: 'round', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-3', name: 'Table 3', seats: 4, x: 300, y: 80, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-4', name: 'Table 4', seats: 4, x: 60, y: 200, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-5', name: 'Table 5', seats: 6, x: 180, y: 200, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
  { id: 'table-6', name: 'Table 6', seats: 8, x: 300, y: 200, shape: 'rectangle', status: 'available', allowOnlineReservations: true, isActive: true },
];

export const DEFAULT_AREAS: Area[] = [
  { id: 'area-main', name: 'Main Dining Room', order: 1, allowOnlineReservations: true, bookingMode: 'online' }
];

export function useTables(restaurantIdOverride?: string) {
  const tenantCtx = useTenantSafe();
  const activeRestaurant = tenantCtx?.tenant;
  const isSuperAdmin = tenantCtx?.isSuperAdmin;

  // Resolve target restaurant ID: staff cannot override unless superadmin
  const targetRestaurantId = useMemo(() => {
    if (restaurantIdOverride && isSuperAdmin) return restaurantIdOverride;
    if (activeRestaurant?.id) return activeRestaurant.id;
    if (tenantCtx?.restaurantId) return tenantCtx.restaurantId;
    if (typeof window !== 'undefined' && isSuperAdmin) {
      const stored = localStorage.getItem('eata_active_restaurant_id') || localStorage.getItem('active_restaurant_id');
      if (stored) return stored;
    }
    return DEFAULT_RESTAURANT_ID;
  }, [restaurantIdOverride, activeRestaurant?.id, tenantCtx?.restaurantId, isSuperAdmin]);

  const tablesCacheKey = `cached_tables_${targetRestaurantId}`;
  const areasCacheKey = `cached_areas_${targetRestaurantId}`;

  const defaultTenantTables = useMemo(() => {
    return DEFAULT_TABLES.map(t => ({ ...t, restaurantId: targetRestaurantId }));
  }, [targetRestaurantId]);

  const defaultTenantAreas = useMemo(() => {
    return DEFAULT_AREAS.map(a => ({ ...a, id: `area-${targetRestaurantId}-main`, restaurantId: targetRestaurantId }));
  }, [targetRestaurantId]);

  const [tables, setTables] = useState<Table[]>(() => {
    try {
      const cached = localStorage.getItem(tablesCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_tables') : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return defaultTenantTables;
    } catch {
      return defaultTenantTables;
    }
  });

  const [areas, setAreas] = useState<Area[]>(() => {
    try {
      const cached = localStorage.getItem(areasCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_areas') : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return defaultTenantAreas;
    } catch {
      return defaultTenantAreas;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When target restaurant ID changes, reload from cache immediately
    try {
      const cachedT = localStorage.getItem(tablesCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_tables') : null);
      setTables(cachedT ? JSON.parse(cachedT) : []);

      const cachedA = localStorage.getItem(areasCacheKey) || (targetRestaurantId === DEFAULT_RESTAURANT_ID ? localStorage.getItem('cached_areas') : null);
      setAreas(cachedA ? JSON.parse(cachedA) : []);
    } catch {}

    let tablesLoaded = false;
    let areasLoaded = false;

    // Database query-level tenant isolation: never query all tables across tenants
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    const tablesQuery = isDefault
      ? query(collection(db, 'tables'))
      : query(collection(db, 'tables'), where('restaurantId', '==', targetRestaurantId));

    const unsubscribeTables = onSnapshot(tablesQuery, (snapshot) => {
      const tenantTables = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Table))
        .filter(t => {
          if (isDefault) {
            return !t.restaurantId || t.restaurantId === DEFAULT_RESTAURANT_ID || t.restaurantId === 'main';
          }
          return t.restaurantId === targetRestaurantId;
        });

      if (tenantTables.length > 0) {
        setTables(tenantTables);
        try {
          localStorage.setItem(tablesCacheKey, JSON.stringify(tenantTables));
        } catch (e) {}
      } else {
        setTables((prev) => (prev && prev.length > 0 ? prev : defaultTenantTables));
      }

      tablesLoaded = true;
      if (areasLoaded) setLoading(false);
    }, (error) => {
      setLoading(false);
      setTables((prev) => (prev && prev.length > 0 ? prev : defaultTenantTables));
      console.warn('[useTables] Notice on tables sync:', error);
    });

    const areasQuery = isDefault
      ? query(collection(db, 'areas'))
      : query(collection(db, 'areas'), where('restaurantId', '==', targetRestaurantId));

    const unsubscribeAreas = onSnapshot(areasQuery, (snapshot) => {
      const tenantAreas = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Area))
        .filter(a => {
          if (isDefault) {
            return !a.restaurantId || a.restaurantId === DEFAULT_RESTAURANT_ID || a.restaurantId === 'main';
          }
          return a.restaurantId === targetRestaurantId;
        });
      tenantAreas.sort((a, b) => (a.order || 0) - (b.order || 0));

      if (tenantAreas.length > 0) {
        setAreas(tenantAreas);
        try {
          localStorage.setItem(areasCacheKey, JSON.stringify(tenantAreas));
        } catch (e) {}
      } else {
        setAreas((prev) => (prev && prev.length > 0 ? prev : defaultTenantAreas));
      }

      areasLoaded = true;
      if (tablesLoaded) setLoading(false);
    }, (error) => {
      setAreas((prev) => (prev && prev.length > 0 ? prev : defaultTenantAreas));
      areasLoaded = true;
      if (tablesLoaded) setLoading(false);
      console.warn('[useTables] Notice on areas sync:', error);
    });

    return () => {
      unsubscribeTables();
      unsubscribeAreas();
    };
  }, [targetRestaurantId, tablesCacheKey, areasCacheKey]);

  const addTable = async (table: Omit<Table, 'id'>) => {
    let friendlyId = 'table-' + generateFriendlyId(table.name || '');
    if (friendlyId === 'table-') friendlyId = 'table-' + Date.now();
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);
    
    await setDoc(doc(db, 'tables', friendlyId), { 
      ...table, 
      id: friendlyId,
      restaurantId: targetRestaurantId,
    });
  };

  const updateTable = async (id: string, table: Partial<Table>) => {
    // IDOR Protection: verify table belongs to this restaurant
    const existing = tables.find(t => t.id === id);
    if (!existing) {
      throw new Error(`Unauthorized: Table ${id} does not belong to the current restaurant.`);
    }
    const { id: _, ...data } = table as any;
    await updateDoc(doc(db, 'tables', id), {
      ...data,
      restaurantId: targetRestaurantId,
    });
  };

  const deleteTable = async (id: string) => {
    // IDOR Protection: verify table belongs to this restaurant
    const existing = tables.find(t => t.id === id);
    if (!existing) {
      throw new Error(`Unauthorized: Table ${id} does not belong to the current restaurant.`);
    }
    await deleteDoc(doc(db, 'tables', id));
  };

  const addArea = async (area: Omit<Area, 'id'>) => {
    let friendlyId = generateFriendlyId(area.name || '');
    if (!friendlyId) friendlyId = 'area-' + Date.now();
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);
    await setDoc(doc(db, 'areas', friendlyId), { 
      ...area, 
      id: friendlyId,
      restaurantId: targetRestaurantId,
    });
  };

  const updateArea = async (id: string, area: Partial<Area>) => {
    // IDOR Protection: verify area belongs to this restaurant
    const existing = areas.find(a => a.id === id);
    if (!existing) {
      throw new Error(`Unauthorized: Area ${id} does not belong to the current restaurant.`);
    }
    const { id: _, ...data } = area as any;
    await updateDoc(doc(db, 'areas', id), {
      ...data,
      restaurantId: targetRestaurantId,
    });
  };

  const deleteArea = async (id: string) => {
    // IDOR Protection: verify area belongs to this restaurant
    const existing = areas.find(a => a.id === id);
    if (!existing) {
      throw new Error(`Unauthorized: Area ${id} does not belong to the current restaurant.`);
    }
    await deleteDoc(doc(db, 'areas', id));
  };

  return { tables, areas, loading, addTable, updateTable, deleteTable, addArea, updateArea, deleteArea, restaurantId: targetRestaurantId };
}

