import { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, setDoc, serverTimestamp, getDoc, query, where } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebase';
import { useAuth } from './useAuth';
import { useTenantSafe } from './useTenant';
import { User, DEFAULT_RESTAURANT_ID } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { isStaff, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
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

    let q;
    const isDefault = targetRestaurantId === DEFAULT_RESTAURANT_ID || targetRestaurantId === 'main';
    
    if (isSuperAdmin) {
      q = collection(db, 'users');
    } else if (isDefault) {
       // A non-super-admin on the default tenant probably shouldn't be querying the whole db, but we'll try to restrict it
       q = collection(db, 'users');
    } else {
      q = query(collection(db, 'users'), where('restaurantId', '==', targetRestaurantId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(safetyTimer);

      const usersData = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => u.role !== 'customer')
        .filter(u => {
          // Super admins can view all users
          if (isSuperAdmin) return true;
          // Scoped admin/staff can only see users belonging to their restaurant
          if (isDefault) {
            return !u.restaurantId || u.restaurantId === DEFAULT_RESTAURANT_ID || u.restaurantId === 'main';
          }
          return u.restaurantId === targetRestaurantId || (u.restaurantIds && u.restaurantIds.includes(targetRestaurantId));
        });

      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      clearTimeout(safetyTimer);
      console.error('Error in users listener:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isStaff, isAdmin, isSuperAdmin, authLoading, targetRestaurantId]);

  const verifyUserAccess = (id: string) => {
    if (isSuperAdmin) return true;
    const exists = users.find(u => u.id === id);
    if (!exists) {
      throw new Error(`Unauthorized: User ${id} does not belong to your restaurant.`);
    }
    return true;
  };

  const updateUserRole = async (id: string, role: string) => {
    verifyUserAccess(id);
    await updateDoc(doc(db, 'users', id), { role });
  };

  const updateUserStatus = async (id: string, status: 'active' | 'inactive') => {
    verifyUserAccess(id);
    await updateDoc(doc(db, 'users', id), { status });
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    verifyUserAccess(id);
    const updateData = { ...data };
    if (!isSuperAdmin) {
      // Prevent changing restaurantId away from target restaurant
      updateData.restaurantId = targetRestaurantId;
    }
    await updateDoc(doc(db, 'users', id), updateData);
  };

  const addUser = async (userData: Omit<User, 'id'>, password?: string) => {
    const finalRestaurantId = isSuperAdmin ? (userData.restaurantId || targetRestaurantId) : targetRestaurantId;
    const userToSave = {
      ...userData,
      restaurantId: finalRestaurantId
    };

    if (password) {
      // Create or reuse a secondary app to avoid logging out the admin
      const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        let result;
        try {
          result = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
        } catch (initialErr: any) {
          if (initialErr.code === 'auth/email-already-in-use') {
            // It's possible the user was deleted from the db but orphaned in Auth.
            try {
              const res = await fetch('/api/admin/delete-user-by-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email })
              });
              if (res.ok) {
                result = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
              } else {
                throw initialErr;
              }
            } catch (cleanupErr) {
               throw initialErr;
            }
          } else {
            throw initialErr;
          }
        }
        
        const uid = result.user.uid;
        await setDoc(doc(db, 'users', uid), {
          ...userToSave,
          id: uid,
          authUid: uid,
          createdAt: serverTimestamp(),
        });
        
        await signOut(secondaryAuth);
      } catch (error: any) {
        console.error('Error adding user:', error);
        throw error;
      }
    } else {
      let friendlyId = userData.email ? userData.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'user';
      friendlyId += '-' + Math.random().toString(36).substring(2, 6);
      
      await setDoc(doc(db, 'users', friendlyId), {
        ...userToSave,
        id: friendlyId,
        createdAt: serverTimestamp(),
      });
    }
  };

  const deleteUser = async (id: string) => {
    verifyUserAccess(id);
    try {
      let authUid = null;
      let email = null;
      
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        authUid = userDoc.data().authUid || userDoc.data().id;
        email = userDoc.data().email;
      }
      
      if (!authUid && !email) {
        const custDoc = await getDoc(doc(db, 'customers', id));
        if (custDoc.exists()) {
          authUid = custDoc.data().authUid;
          email = custDoc.data().email;
        }
      }

      if ((authUid && authUid.length > 10) || email) { 
        try {
          const res = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: authUid || null, email: email || null })
          });
          if (!res.ok) {
            console.error('Failed to delete auth user');
          }
        } catch (e) {
          console.error('Error calling delete API:', e);
        }
      }

      await deleteDoc(doc(db, 'users', id));
      await deleteDoc(doc(db, 'customers', id));
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  return { users, loading, updateUserRole, updateUserStatus, updateUser, addUser, deleteUser };
}
