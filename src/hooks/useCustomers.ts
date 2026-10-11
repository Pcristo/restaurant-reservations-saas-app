import { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { useTenantSafe } from './useTenant';
import { Customer, DEFAULT_RESTAURANT_ID } from '../types';

const generateFriendlyId = (text: string) => {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const deleteCustomerAuth = async (id: string) => {
  try {
    const custDoc = await getDoc(doc(db, 'customers', id));
    if (custDoc.exists()) {
      const data = custDoc.data();
      if (data.authUid || data.email) {
        try {
          await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: data.authUid || null, email: data.email || null })
          });
        } catch (e) {
          console.error('Error deleting customer auth:', e);
        }
      }
    }
  } catch (err) {
    console.error('Error checking auth for customer:', err);
  }
};

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { isStaff, isAdmin, loading: authLoading } = useAuth();
  const tenant = useTenantSafe();
  const targetRestaurantId = tenant?.targetRestaurantId || DEFAULT_RESTAURANT_ID;

  useEffect(() => {
    if (authLoading || (!isStaff && !isAdmin)) {
      if (!authLoading) setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    // Query-level multi-tenant isolation
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    const customersQuery = isDefault
      ? query(collection(db, 'customers'))
      : query(
          collection(db, 'customers'),
          where('restaurantId', '==', targetRestaurantId)
        );

    const unsubscribe = onSnapshot(customersQuery, (snapshot) => {
      clearTimeout(safetyTimer);
      const customersData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Customer))
        .filter(c => {
          if (isDefault) {
            return !c.restaurantId || c.restaurantId === DEFAULT_RESTAURANT_ID || c.restaurantId === 'main';
          }
          return c.restaurantId === targetRestaurantId;
        });
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimer);
      console.error('Error in customers listener:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isStaff, isAdmin, authLoading, targetRestaurantId]);

  const activeCustomers = customers.filter(c => !c.isDeleted && !c.isHistory);
  const deletedCustomers = customers.filter(c => c.isDeleted && !c.isHistory);
  const historyCustomers = customers.filter(c => c.isHistory);

  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    if (customer.email && customer.email.trim() !== '') {
      const emailLower = customer.email.trim().toLowerCase();
      // Check scoped activeCustomers first
      const existing = activeCustomers.find(c => c.email?.trim().toLowerCase() === emailLower);
      if (existing) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }
      
      // Database check scoped to this restaurant using single-field email index
      const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
      const qCust = query(
        collection(db, 'customers'),
        where('email', '==', emailLower)
      );
      const snapCust = await getDocs(qCust);
      const hasConflict = snapCust.docs.some(docSnap => {
        const d = docSnap.data();
        const matchesTenant = isDefault
          ? (!d.restaurantId || d.restaurantId === DEFAULT_RESTAURANT_ID || d.restaurantId === 'main')
          : d.restaurantId === targetRestaurantId;
        return matchesTenant;
      });
      if (hasConflict) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }
    }
    const cleanCustomer = Object.fromEntries(
      Object.entries(customer).filter(([_, v]) => v !== undefined)
    );
    
    let friendlyId = cleanCustomer.email ? generateFriendlyId(String(cleanCustomer.email).split('@')[0]) : (cleanCustomer.phone ? generateFriendlyId(String(cleanCustomer.phone)) : 'customer');
    if (!friendlyId) friendlyId = 'customer';
    friendlyId += '-' + Math.random().toString(36).substring(2, 6);
    
    await setDoc(doc(db, 'customers', friendlyId), { 
      ...cleanCustomer, 
      id: friendlyId,
      restaurantId: targetRestaurantId,
      createdAt: new Date().toISOString().split('T')[0] 
    });
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    // IDOR Protection: Verify customer belongs to current restaurant
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }

    if (customer.email && customer.email.trim() !== '') {
      const emailLower = customer.email.trim().toLowerCase();
      const existing = activeCustomers.find(c => c.email?.trim().toLowerCase() === emailLower && c.id !== id);
      if (existing) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }

      // Database check scoped to this restaurant using single-field email index
      const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
      const qCust = query(
        collection(db, 'customers'),
        where('email', '==', emailLower)
      );
      const snapCust = await getDocs(qCust);
      let isDuplicate = false;
      snapCust.docs.forEach(docSnap => {
        if (docSnap.id !== id) {
          const d = docSnap.data();
          const matchesTenant = isDefault
            ? (!d.restaurantId || d.restaurantId === DEFAULT_RESTAURANT_ID || d.restaurantId === 'main')
            : d.restaurantId === targetRestaurantId;
          if (matchesTenant) isDuplicate = true;
        }
      });
      if (isDuplicate) {
        throw new Error("A customer with this email already exists in this restaurant.");
      }
    }
    const cleanCustomer = Object.fromEntries(
      Object.entries(customer).filter(([_, v]) => v !== undefined)
    );
    cleanCustomer.restaurantId = targetRestaurantId;

    await updateDoc(doc(db, 'customers', id), cleanCustomer);
  };

  const deleteCustomer = async (id: string, soft: boolean = true) => {
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }

    if (soft) {
      await updateDoc(doc(db, 'customers', id), { isDeleted: true });
    } else {
      await deleteCustomerAuth(id);
      await deleteDoc(doc(db, 'customers', id));
    }
  };

  const restoreCustomer = async (id: string) => {
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }
    await updateDoc(doc(db, 'customers', id), { isDeleted: false, isHistory: false });
  };

  const moveToHistoryCustomer = async (id: string) => {
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }
    await updateDoc(doc(db, 'customers', id), { isHistory: true });
  };

  const bulkMoveToHistoryCustomers = async (ids: string[]) => {
    await Promise.all(ids.map(id => {
      const existingCust = customers.find(c => c.id === id);
      if (!existingCust) throw new Error(`Unauthorized customer ${id}`);
      return updateDoc(doc(db, 'customers', id), { isHistory: true });
    }));
  };

  const forceDeleteCustomer = async (id: string) => {
    const existingCust = customers.find(c => c.id === id);
    if (!existingCust) {
      throw new Error(`Unauthorized: Customer ${id} does not belong to the current restaurant.`);
    }
    await deleteCustomerAuth(id);
    await deleteDoc(doc(db, 'customers', id));
  };

  const bulkForceDeleteCustomers = async (ids: string[]) => {
    await Promise.all(ids.map(async (id) => {
      const existingCust = customers.find(c => c.id === id);
      if (!existingCust) throw new Error(`Unauthorized customer ${id}`);
      await deleteCustomerAuth(id);
      await deleteDoc(doc(db, 'customers', id));
    }));
  };

  const bulkRestoreCustomers = async (ids: string[]) => {
    await Promise.all(ids.map(id => {
      const existingCust = customers.find(c => c.id === id);
      if (!existingCust) throw new Error(`Unauthorized customer ${id}`);
      return updateDoc(doc(db, 'customers', id), { isDeleted: false, isHistory: false });
    }));
  };

  return { 
    customers: activeCustomers, 
    allCustomers: customers,
    deletedCustomers,
    loading, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    restoreCustomer,
    forceDeleteCustomer,
    bulkForceDeleteCustomers,
    moveToHistoryCustomer,
    bulkMoveToHistoryCustomers,
    historyCustomers,
    bulkRestoreCustomers
  };
}
