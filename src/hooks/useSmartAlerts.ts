import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format, parse } from 'date-fns';
import { Reservation, Table, Area, DEFAULT_RESTAURANT_ID } from '../types';
import { useAuth } from './useAuth';
import { useTenantSafe } from './useTenant';
import { useSettings } from './useSettings';
import { useLanguage } from './useLanguage';
import { useTables } from './useTables';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface SmartAlert {
  id: string;
  restaurantId?: string;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'viewed' | 'dismissed' | 'resolved' | 'expired';
  relatedReservationIds: string[];
  fingerprint: string;
  createdAt: string;
  viewedAt?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  expiresAt?: string;
  bookingDate?: string;
}

export function useSmartAlerts() {
  const [firestoreAlerts, setFirestoreAlerts] = useState<SmartAlert[]>([]);
  const { tables, areas } = useTables();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { isStaff, isAdmin, loading: authLoading } = useAuth();
  const tenant = useTenantSafe();
  const targetRestaurantId = tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID;
  const { settings } = useSettings();
  const { language } = useLanguage();

  // Fetch reservations from today onwards for memory alert computation (scoped to restaurant)
  useEffect(() => {
    if (authLoading || (!isStaff && !isAdmin)) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    let q;
    if (isDefault) {
      q = query(
        collection(db, 'reservations'),
        where('date', '>=', todayStr)
      );
    } else {
      q = query(
        collection(db, 'reservations'),
        where('restaurantId', '==', targetRestaurantId),
        where('date', '>=', todayStr)
      );
    }

    const unsubRes = onSnapshot(q, (snapshot) => {
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reservation))
        .filter(r => {
          if (isDefault) {
            return !r.restaurantId || r.restaurantId === DEFAULT_RESTAURANT_ID || r.restaurantId === 'main';
          }
          return r.restaurantId === targetRestaurantId;
        });
      setReservations(filtered);
    }, (err) => {
      console.warn("Reservations listener for alerts notice:", err);
    });
    return () => unsubRes();
  }, [isStaff, isAdmin, authLoading, targetRestaurantId]);

  // 1. Fetch persistent smart alerts from Firestore (scoped to restaurant)
  useEffect(() => {
    if (authLoading || (!isStaff && !isAdmin)) {
      if (!authLoading) {
        setFirestoreAlerts([]);
        setLoading(false);
      }
      return;
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const alertsRef = collection(db, `smart_alerts`);
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    const q = isDefault
      ? query(alertsRef)
      : query(alertsRef, where('restaurantId', '==', targetRestaurantId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(safetyTimer);
      const fetchedAlerts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SmartAlert))
        .filter(a => {
          if (isDefault) {
            return !a.restaurantId || a.restaurantId === DEFAULT_RESTAURANT_ID || a.restaurantId === 'main';
          }
          return a.restaurantId === targetRestaurantId;
        });
      setFirestoreAlerts(fetchedAlerts);
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimer);
      console.warn("Notice in smart alerts listener:", error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isStaff, isAdmin, authLoading, targetRestaurantId]);

  // 2. Compute dynamic smart alerts entirely in memory (0 Firestore write loops)
  const dynamicAlerts = useMemo(() => {
    if (!isStaff && !isAdmin) return [];

    const computedAlerts: SmartAlert[] = [];

    const getSessionFromTime = (time: string, date: string, manualSession?: string) => {
      if (manualSession) return manualSession;
      const hour = parseInt(time.split(':')[0], 10);
      return hour < 17 ? 'lunch' : 'dinner';
    };

    const formatDateStr = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    };

    // A. Duplicate reservations check
    const emailMap = new globalThis.Map<string, Reservation[]>();
    const nameMap = new globalThis.Map<string, Reservation[]>();

    reservations.forEach(res => {
      if (!res.date) return;
      if (res.isDeleted || res.isHistory) return;
      if (['cancelled', 'completed', 'no-show'].includes(res.status)) return;
      
      const session = getSessionFromTime(res.time, res.date, (res as any).manualSession);
      
      if (res.customerEmail) {
        const emailKey = `${res.date}_${session}_${res.customerEmail.trim().toLowerCase()}`;
        if (!emailMap.has(emailKey)) emailMap.set(emailKey, []);
        emailMap.get(emailKey)!.push(res);
      }

      if (res.customerName) {
        const nameKey = `${res.date}_${session}_${res.customerName.trim().toLowerCase()}`;
        if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
        nameMap.get(nameKey)!.push(res);
      }
    });

    const duplicateIds = new Set<string>();

    emailMap.forEach((resArr, key) => {
      if (resArr.length > 1) {
        const [date, session, email] = key.split('_');
        const fingerprint = `dup_email_${key}`;
        resArr.forEach((r: any) => duplicateIds.add(r.id));
        
        computedAlerts.push({
          id: fingerprint,
          type: 'duplicate_reservation',
          title: 'Possible Duplicate Reservations',
          message: `The system found ${resArr.length} reservations using the email ${resArr[0].customerEmail || email} for ${session} on ${formatDateStr(date)}.`,
          severity: 'medium',
          status: 'active',
          relatedReservationIds: resArr.map((r: any) => r.id),
          fingerprint,
          createdAt: resArr[0].createdAt || new Date().toISOString(),
          bookingDate: date
        });
      }
    });

    nameMap.forEach((resArr, key) => {
      if (resArr.length > 1) {
        const [date, session, name] = key.split('_');
        const fingerprint = `dup_name_${key}`;
        
        const allAlreadyFlagged = resArr.every((r: any) => duplicateIds.has(r.id));
        if (!allAlreadyFlagged) {
          resArr.forEach((r: any) => duplicateIds.add(r.id));
          
          const rawName = resArr[0].customerName || name;
          const capitalizedName = rawName.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

          computedAlerts.push({
            id: fingerprint,
            type: 'duplicate_reservation',
            title: 'Possible Duplicate Reservations',
            message: `The system found ${resArr.length} reservations using the name ${capitalizedName} for ${session} on ${formatDateStr(date)}.`,
            severity: 'medium',
            status: 'active',
            relatedReservationIds: resArr.map((r: any) => r.id),
            fingerprint,
            createdAt: resArr[0].createdAt || new Date().toISOString(),
            bookingDate: date
          });
        }
      }
    });

    // B. Time conflict check
    const tableSessionMap = new globalThis.Map<string, Reservation[]>();
    const gap = settings?.minReservationGap || 135;
    
    reservations.forEach(res => {
      if (!res.date || !res.tableId) return;
      if (res.isDeleted || res.isHistory) return;
      if (['cancelled', 'completed', 'no-show', 'waiting-list'].includes(res.status)) return;

      const session = getSessionFromTime(res.time, res.date, (res as any).manualSession);
      const key = `${res.date}_${session}_${res.tableId}`;
      if (!tableSessionMap.has(key)) tableSessionMap.set(key, []);
      tableSessionMap.get(key)!.push(res);
    });

    tableSessionMap.forEach((resList, key) => {
      if (resList.length > 1) {
        const overlappingPairs: Reservation[][] = [];

        for (let i = 0; i < resList.length; i++) {
          for (let j = i + 1; j < resList.length; j++) {
            const r1 = resList[i];
            const r2 = resList[j];
            try {
              const dummyDate = '2000-01-01';
              const t1 = parse(`${dummyDate} ${r1.time}`, 'yyyy-MM-dd HH:mm', new Date());
              const t2 = parse(`${dummyDate} ${r2.time}`, 'yyyy-MM-dd HH:mm', new Date());
              
              const diffMinutes = Math.abs((t1.getTime() - t2.getTime()) / (1000 * 60));
              if (diffMinutes < gap) {
                overlappingPairs.push([r1, r2]);
              }
            } catch (e) {
              console.warn("Time parse notice in conflict detection", e);
            }
          }
        }

        if (overlappingPairs.length > 0) {
          const [date, session, tableId] = key.split('_');
          const matchedTable = tables.find(t => t.id === tableId);
          const tableName = matchedTable?.name || 'a Table';
          
          const uniqueOverlaps = Array.from(new Set(overlappingPairs.flat().map(r => r.id)));
          const customerNames = uniqueOverlaps.map(id => {
            const r = resList.find(res => res.id === id);
            if (r && r.customerName) {
              return r.customerName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            }
            return 'Unknown';
          }).join(' and ');

          const fingerprint = `time_conflict_${key}`;
          
          computedAlerts.push({
            id: fingerprint,
            type: 'time_conflict',
            title: 'Time Conflict',
            message: `Time conflict detected on ${tableName} between the customers ${customerNames} during ${session} on ${formatDateStr(date)}.`,
            severity: 'high',
            status: 'active',
            relatedReservationIds: uniqueOverlaps,
            fingerprint,
            createdAt: new Date().toISOString(),
            bookingDate: date
          });
        }
      }
    });

    // C. Verify table assignments
    reservations.forEach(res => {
      if (res.isDeleted || res.isHistory) return;
      
      const isMissingTable = !res.tableId && (!(res as any).tableIds || (res as any).tableIds.length === 0);
      const needsVerification = res.verifyTableNumber || isMissingTable;
      
      if (needsVerification && !['cancelled', 'completed', 'no-show', 'waiting-list'].includes(res.status) && !duplicateIds.has(res.id)) {
        const fingerprint = `verify_${res.id}`;
        const formattedName = (res.customerName || '').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        
        const isPt = language === 'pt';
        const message = res.preferredTableUnavailable 
          ? (isPt 
              ? `A reserva de ${formattedName} para ${formatDateStr(res.date)} necessita de verificação de mesa. A(s) mesa(s) preferida(s) do cliente não estava(m) disponível(eis) e foi atribuída uma mesa alternativa.`
              : `Reservation for ${formattedName} on ${formatDateStr(res.date)} requires table verification. The customer's preferred table(s) were unavailable and an alternative table was assigned.`)
          : isMissingTable
          ? (isPt
              ? `A reserva de ${formattedName} para ${formatDateStr(res.date)} não está atribuída a nenhuma mesa e necessita de atribuição.`
              : `Reservation for ${formattedName} on ${formatDateStr(res.date)} is not assigned to any table and requires table assignment.`)
          : (isPt
              ? `A reserva de ${formattedName} para ${formatDateStr(res.date)} necessita de verificação de mesa.`
              : `Reservation for ${formattedName} on ${formatDateStr(res.date)} requires table verification.`);
          
        computedAlerts.push({
          id: fingerprint,
          type: 'table_assignment_verify',
          title: 'Table Assignment Verify',
          message,
          severity: 'low',
          status: 'active',
          relatedReservationIds: [res.id],
          fingerprint,
          createdAt: res.createdAt || new Date().toISOString(),
          bookingDate: res.date
        });
      }
    });

    // D. Capacity alert check
    if (tables.length > 0) {
      const totalRestaurantCapacity = tables
        .filter(t => t.isActive !== false)
        .reduce((sum, t) => sum + (Number(t.seats) || 0), 0);

      if (totalRestaurantCapacity > 0) {
        const dateSessionMap = new globalThis.Map<string, Reservation[]>();

        reservations.forEach(res => {
          if (!res.date) return;
          if (res.isDeleted || res.isHistory) return;
          if (['cancelled', 'completed', 'no-show'].includes(res.status)) return;

          const session = getSessionFromTime(res.time, res.date, (res as any).manualSession);
          const key = `${res.date}_${session}`;
          if (!dateSessionMap.has(key)) dateSessionMap.set(key, []);
          dateSessionMap.get(key)!.push(res);
        });

        dateSessionMap.forEach((resList, key) => {
          const totalBookedSeats = resList.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);
          const occupancyRate = (totalBookedSeats / totalRestaurantCapacity) * 100;

          if (occupancyRate >= 85) {
            const [date, session] = key.split('_');
            const fingerprint = `capacity_${key}`;
            const roundedOccupancy = Math.round(occupancyRate);
            
            const isPt = language === 'pt';
            const sessionPt = session.toLowerCase() === 'lunch' ? 'almoço' : 'jantar';
            const message = isPt
              ? `A capacidade do restaurante atingiu ${roundedOccupancy}% (${totalBookedSeats}/${totalRestaurantCapacity} lugares) para o turno de ${sessionPt} no dia ${formatDateStr(date)}.`
              : `Restaurant capacity has reached ${roundedOccupancy}% (${totalBookedSeats}/${totalRestaurantCapacity} seats) for ${session} on ${formatDateStr(date)}.`;

            computedAlerts.push({
              id: fingerprint,
              type: 'capacity_alert',
              title: isPt ? 'Alerta de Lotação' : 'High Capacity Alert',
              message,
              severity: occupancyRate >= 95 ? 'high' : 'medium',
              status: 'active',
              relatedReservationIds: resList.map(r => r.id),
              fingerprint,
              createdAt: new Date().toISOString(),
              bookingDate: date
            });
          }
        });
      }
    }

    return computedAlerts;
  }, [isStaff, isAdmin, reservations, tables, settings, language]);

  // Combine Firestore persistent/custom alerts with dynamic alerts and apply statuses
  const allAlerts = useMemo(() => {
    const firestoreMap = new Map<string, SmartAlert>();
    firestoreAlerts.forEach(a => {
      firestoreMap.set(a.fingerprint || a.id, a);
    });

    const combined: SmartAlert[] = [];
    const addedFingerprints = new Set<string>();

    // 1. Dynamic alerts with overrides from Firestore
    dynamicAlerts.forEach(dynAlert => {
      const key = dynAlert.fingerprint || dynAlert.id;
      addedFingerprints.add(key);

      const existing = firestoreMap.get(key);
      if (existing) {
        combined.push({
          ...dynAlert,
          status: existing.status,
          dismissedAt: existing.dismissedAt,
          dismissedBy: existing.dismissedBy,
          resolvedAt: (existing as any).resolvedAt,
          resolvedBy: (existing as any).resolvedBy
        });
      } else {
        combined.push(dynAlert);
      }
    });

    // 2. Custom or standalone Firestore alerts
    firestoreAlerts.forEach(fsAlert => {
      const key = fsAlert.fingerprint || fsAlert.id;
      if (!addedFingerprints.has(key)) {
        combined.push(fsAlert);
      }
    });

    return combined;
  }, [dynamicAlerts, firestoreAlerts]);

  const deleteAlert = useCallback(async (alertId: string) => {
    if (!auth.currentUser) return;
    try {
      const safeId = encodeURIComponent(alertId).replace(/\./g, '_').replace(/%/g, '_');
      const scopedId = `${targetRestaurantId}_${safeId}`;
      await deleteDoc(doc(db, `smart_alerts`, scopedId));
      await deleteDoc(doc(db, `smart_alerts`, safeId)).catch(() => {});
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `smart_alerts/${alertId}`);
    }
  }, [targetRestaurantId]);

  const dismissAlert = useCallback(async (alertId: string) => {
    if (!auth.currentUser) return;
    try {
      const safeId = encodeURIComponent(alertId).replace(/\./g, '_').replace(/%/g, '_');
      const scopedId = `${targetRestaurantId}_${safeId}`;
      const alertRef = doc(db, `smart_alerts`, scopedId);
      const now = new Date();
      const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      
      await setDoc(alertRef, {
        id: scopedId,
        restaurantId: targetRestaurantId,
        fingerprint: alertId,
        status: 'dismissed',
        dismissedAt: now.toISOString(),
        dismissedBy: auth.currentUser.uid,
        expiresAt: expires
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `smart_alerts/${alertId}`);
    }
  }, [targetRestaurantId]);

  const resolveAlert = useCallback(async (alertId: string) => {
    if (!auth.currentUser) return;
    try {
      const safeId = encodeURIComponent(alertId).replace(/\./g, '_').replace(/%/g, '_');
      const scopedId = `${targetRestaurantId}_${safeId}`;
      const alertRef = doc(db, `smart_alerts`, scopedId);
      const now = new Date();
      const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      
      await setDoc(alertRef, {
        id: scopedId,
        restaurantId: targetRestaurantId,
        fingerprint: alertId,
        status: 'resolved',
        resolvedAt: now.toISOString(),
        resolvedBy: auth.currentUser.uid,
        expiresAt: expires
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `smart_alerts/${alertId}`);
    }
  }, [targetRestaurantId]);

  const activeAlerts = useMemo(() => {
    return allAlerts
      .filter(a => a.status === 'active')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allAlerts]);

  return { 
    smartAlerts: activeAlerts, 
    allSmartAlerts: allAlerts, 
    dismissAlert,
    resolveAlert,
    deleteAlert,
    loading 
  };
}
