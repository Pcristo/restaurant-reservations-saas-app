import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword as firebaseUpdatePassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, or, serverTimestamp, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';
import { isUserSuperAdmin } from '../lib/permissions';
import { useLanguage } from './useLanguage';
import { ShieldAlert, Copy, Check, ExternalLink, X, Globe } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (role?: UserRole, isSignup?: boolean) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: (silent?: boolean) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cachedStr = localStorage.getItem('cached_user_profile');
      if (!cachedStr) return null;
      const cached = JSON.parse(cachedStr) as User;

      // URL Tenant Session Isolation on initial load:
      // If current route is restaurant-specific (/r/:slug), ensure session belongs to this restaurant
      if (typeof window !== 'undefined') {
        const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          const rawSlug = match[1].toLowerCase();
          const targetSlug = rawSlug === 'bella-italia' ? 'bela-italia' : rawSlug;
          const isSuper = isUserSuperAdmin(cached);

          if (!isSuper) {
            const userRest = (cached.restaurantId || (cached.restaurantIds && cached.restaurantIds[0]) || '').toLowerCase();
            const normalizedUserRest = userRest === 'bella-italia' ? 'bela-italia' : userRest;
            const userRestIds = (cached.restaurantIds || []).map(id => {
              const lower = id.toLowerCase();
              return lower === 'bella-italia' ? 'bela-italia' : lower;
            });
            const isStaffOrAdminUser = cached.role !== 'customer' || Boolean(userRest);

            if (isStaffOrAdminUser && userRest) {
              const isMatch = normalizedUserRest === targetSlug || userRestIds.includes(targetSlug);
              if (!isMatch) {
                // Tenant mismatch: user belongs to another restaurant! Terminate immediately
                try {
                  localStorage.removeItem('cached_user_profile');
                  localStorage.removeItem('eata_active_restaurant_id');
                  sessionStorage.removeItem('eata_active_restaurant_id');
                } catch {}
                return null;
              }
            }
          }
        }
      }

      return cached;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [unauthorizedDomainModal, setUnauthorizedDomainModal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { t, language } = useLanguage();

  const updateUserWithCache = (newUser: User | null) => {
    setUser(newUser);
    try {
      if (newUser) {
        localStorage.setItem('cached_user_profile', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('cached_user_profile');
      }
    } catch (e) {}
  };

  const syncExistingCustomerDetails = async (uid: string, email: string, defaultName: string) => {
    try {
      if (!email && !uid) return null;
      const emailLower = (email || '').trim().toLowerCase();
      const customersRef = collection(db, 'customers');
      let existingData: any = {};
      const docsToDelete = new Set<string>();

      // 1. Search by email to find ALL existing manual or duplicate records
      if (emailLower) {
        try {
          const qLower = query(customersRef, where('email', '==', emailLower));
          const snapLower = await getDocs(qLower);
          const qExact = query(customersRef, where('email', '==', email));
          const snapExact = await getDocs(qExact);
          
          const allDocs = [...snapLower.docs, ...snapExact.docs];
          const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());
          
          uniqueDocs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.name && !existingData.name) existingData.name = data.name;
            if (data.phone && !existingData.phone) existingData.phone = data.phone;
            if (data.notes && !existingData.notes) existingData.notes = data.notes;
            if (data.isRegular !== undefined) existingData.isRegular = data.isRegular;
            if (data.favoriteTables?.length) existingData.favoriteTables = data.favoriteTables;
            
            if (docSnap.id !== uid) {
              docsToDelete.add(docSnap.id);
            }
          });
        } catch (e) {
          console.warn('Could not read existing customer records by email:', e);
        }
      }

      // 2. Search by authUid == uid (if they have an old record pointing to this authUid)
      try {
        const qAuth = query(customersRef, where('authUid', '==', uid));
        const snapAuth = await getDocs(qAuth);
        snapAuth.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.name && !existingData.name) existingData.name = data.name;
          if (data.phone && !existingData.phone) existingData.phone = data.phone;
          if (docSnap.id !== uid) docsToDelete.add(docSnap.id);
        });
      } catch (e) {}

      // 3. Check direct doc (uid)
      try {
        const directDoc = await getDoc(doc(db, 'customers', uid));
        if (directDoc.exists()) {
          const data = directDoc.data();
          if (data.name && !existingData.name) existingData.name = data.name;
          if (data.phone && !existingData.phone) existingData.phone = data.phone;
        }
      } catch (e) {}

      // 4. If still missing phone or name, check users/{uid} collection
      try {
        const userDocSnap = await getDoc(doc(db, 'users', uid));
        if (userDocSnap.exists()) {
          const uData = userDocSnap.data();
          if (uData.phone && !existingData.phone) existingData.phone = uData.phone;
          if (uData.name && !existingData.name) existingData.name = uData.name;
        }
      } catch (e) {}

      const finalCustomerData = { 
        id: uid,
        authUid: uid,
        name: existingData.name || defaultName || 'Customer',
        email: email,
        phone: existingData.phone || '',
        notes: existingData.notes || '',
        isRegular: existingData.isRegular !== undefined ? existingData.isRegular : false,
        favoriteTables: existingData.favoriteTables || [],
        isRegistered: true
      };

      // 5. Delete duplicate documents to enforce email uniqueness
      for (const docId of docsToDelete) {
        try {
          await deleteDoc(doc(db, 'customers', docId));
        } catch (delErr) {
          console.warn(`Could not delete duplicate customer doc ${docId}:`, delErr);
        }
      }

      // Always save canonical customer record
      await setDoc(doc(db, 'customers', uid), finalCustomerData, { merge: true });

      // Mirror customer user record in users/{uid}
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        authUid: uid,
        email: finalCustomerData.email,
        name: finalCustomerData.name,
        phone: finalCustomerData.phone,
        role: 'customer',
        status: 'active'
      }, { merge: true });

      // Link reservations with this email to customerUid
      if (email) {
        try {
          const resRef = collection(db, 'reservations');
          const resQuery = query(resRef, where('customerEmail', '==', email));
          const resSnapshot = await getDocs(resQuery);
          for (const resDoc of resSnapshot.docs) {
            const rData = resDoc.data();
            if (!rData.customerUid || rData.customerUid !== uid) {
              await setDoc(doc(db, 'reservations', resDoc.id), { customerUid: uid }, { merge: true });
            }
          }
        } catch (resErr) {
          console.warn('Error linking reservations to customerUid:', resErr);
        }
      }

      return finalCustomerData;
    } catch (err) {
      console.error('Error syncing existing customer details:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check for redirect result from Google Sign-In if applicable
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          console.log('Redirect sign-in completed for:', res.user.email);
        }
      })
      .catch((err) => {
        if (err?.code === 'auth/unauthorized-domain') {
          setUnauthorizedDomainModal(window.location.hostname);
        } else if (err?.code !== 'auth/credential-already-in-use') {
          console.warn('Redirect sign-in check notice:', err);
        }
      });

    let unsubscribeProfile: (() => void) | null = null;

    // Safety fallback: if Firebase Auth is offline, slow, or doesn't fire within 800ms, unlock loading state
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 800);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      try {
        if (firebaseUser) {
          const userEmail = (firebaseUser.email || '').trim().toLowerCase();
          const isAdminEmail = userEmail === "pcristo35@gmail.com";
          const intendedRole = (localStorage.getItem('intendedRole') as UserRole) || 'customer';
          
          const isEmailProvider = firebaseUser.providerData.some(p => p.providerId === 'password');
          const isGoogleProvider = firebaseUser.providerData.some(p => p.providerId === 'google.com');
          const currentAuthProvider = isGoogleProvider ? 'google' : 'email';

          // 1. MASTER ADMIN BYPASS (pcristo35@gmail.com)
          if (isAdminEmail) {
            const adminUser: User = {
              id: firebaseUser.uid,
              authUid: firebaseUser.uid,
              email: firebaseUser.email || 'pcristo35@gmail.com',
              name: firebaseUser.displayName || 'Admin',
              role: 'super_admin',
              status: 'active',
              authProvider: currentAuthProvider
            };

            updateUserWithCache(adminUser);
            localStorage.removeItem('intendedRole');
            setLoading(false);

            // Keep user document updated in Firestore at users/{uid}
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...adminUser,
                id: firebaseUser.uid,
                authUid: firebaseUser.uid,
                role: 'super_admin',
                status: 'active',
                authProvider: currentAuthProvider
              }, { merge: true });
            } catch (e) {
              console.warn('Admin user doc sync note:', e);
            }

            unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
              if (snap.exists()) {
                const liveData = snap.data();
                updateUserWithCache({ id: snap.id, ...liveData, role: 'super_admin', authProvider: currentAuthProvider } as User);
              }
            }, (err) => {
              console.warn('Admin profile listener warning:', err);
            });
            return;
          }

          // 2. CHECK IF USER IS IN `users` COLLECTION (Staff / Other Admins)
          let staffDocSnap: any = null;
          try {
            const directDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (directDoc.exists()) {
              staffDocSnap = directDoc;
            }
          } catch (e) {}

          if (!staffDocSnap) {
            try {
              const qAuth = query(collection(db, 'users'), where('authUid', '==', firebaseUser.uid));
              const snapAuth = await getDocs(qAuth);
              if (!snapAuth.empty) {
                staffDocSnap = snapAuth.docs[0];
              }
            } catch (e) {}
          }

          if (!staffDocSnap && userEmail) {
            try {
              const qEmail = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const snapEmail = await getDocs(qEmail);
              if (!snapEmail.empty) {
                staffDocSnap = snapEmail.docs[0];
              } else {
                const qEmailLower = query(collection(db, 'users'), where('email', '==', userEmail));
                const snapEmailLower = await getDocs(qEmailLower);
                if (!snapEmailLower.empty) {
                  staffDocSnap = snapEmailLower.docs[0];
                }
              }
            } catch (e) {}
          }

          // 2b. CHECK IF USER HAS A SUPER ADMIN INVITATION OR IS PRE-APPROVED SUPER ADMIN
          if (!staffDocSnap && userEmail) {
            try {
              let isInvitedSuperAdmin = false;
              let invitedName = '';

              // Check localStorage cached super admin emails
              try {
                const cachedSuperAdmins = localStorage.getItem('dinemaster_superadmin_emails');
                if (cachedSuperAdmins) {
                  const emailList: string[] = JSON.parse(cachedSuperAdmins);
                  if (emailList.some(e => e.toLowerCase() === userEmail)) {
                    isInvitedSuperAdmin = true;
                  }
                }
              } catch {}

              // Check super_admin_invitations collection
              if (!isInvitedSuperAdmin) {
                try {
                  const qInv = query(
                    collection(db, 'super_admin_invitations'),
                    where('email', '==', userEmail)
                  );
                  const snapInv = await getDocs(qInv);
                  if (!snapInv.empty) {
                    const inv = snapInv.docs[0].data();
                    if (inv.status !== 'revoked') {
                      isInvitedSuperAdmin = true;
                      invitedName = inv.name || '';
                      if (inv.status === 'pending') {
                        try {
                          await updateDoc(doc(db, 'super_admin_invitations', snapInv.docs[0].id), {
                            status: 'accepted',
                            acceptedAt: new Date().toISOString()
                          });
                        } catch {}
                      }
                    }
                  }
                } catch {}
              }

              if (isInvitedSuperAdmin) {
                const newSuperAdmin: User = {
                  id: firebaseUser.uid,
                  authUid: firebaseUser.uid,
                  name: firebaseUser.displayName || invitedName || 'Super Admin',
                  email: userEmail,
                  role: 'super_admin',
                  status: 'active',
                  authProvider: currentAuthProvider,
                  createdAt: new Date().toISOString(),
                };

                try {
                  await setDoc(doc(db, 'users', firebaseUser.uid), {
                    ...newSuperAdmin,
                    createdAt: serverTimestamp(),
                  }, { merge: true });
                } catch (e) {
                  console.warn('Could not persist invited super admin user doc:', e);
                }

                updateUserWithCache(newSuperAdmin);
                localStorage.removeItem('intendedRole');
                setLoading(false);
                return;
              }
            } catch (e) {
              console.warn('Super admin invite lookup notice:', e);
            }
          }

          // If found in `users` (Staff / Admin)
          if (staffDocSnap && staffDocSnap.exists()) {
            const userData = staffDocSnap.data() as User;
            if (userData.status === 'inactive') {
              await signOut(auth);
              updateUserWithCache(null);
              toast.error(t('common.account_suspended') || 'Account suspended');
              setLoading(false);
              return;
            }

            const staffUser: User = {
              ...userData,
              id: staffDocSnap.id,
              authUid: firebaseUser.uid,
              email: userData.email || firebaseUser.email || '',
              name: userData.name || firebaseUser.displayName || 'Staff Member',
              role: userData.role || 'staff',
              status: userData.status || 'active',
              restaurantId: userData.restaurantId || (userData.restaurantIds && userData.restaurantIds[0]),
              restaurantIds: userData.restaurantIds,
              permissions: userData.permissions,
              staffNumber: userData.staffNumber,
              authProvider: currentAuthProvider
            };

            // Ensure document at users/{uid} is synced
            if (staffDocSnap.id !== firebaseUser.uid || !userData.authUid) {
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                  ...staffUser,
                  id: firebaseUser.uid,
                  authUid: firebaseUser.uid,
                  authProvider: currentAuthProvider
                }, { merge: true });
              } catch (e) {
                console.warn('Could not sync staff uid document:', e);
              }
            }

            // Enforce tenant session isolation against current URL
            if (typeof window !== 'undefined') {
              const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
              if (match && match[1]) {
                const rawSlug = match[1].toLowerCase();
                const targetSlug = rawSlug === 'bella-italia' ? 'bela-italia' : rawSlug;
                const userRest = (staffUser.restaurantId || (staffUser.restaurantIds && staffUser.restaurantIds[0]) || '').toLowerCase();
                const normalizedUserRest = userRest === 'bella-italia' ? 'bela-italia' : userRest;
                const userRestIds = (staffUser.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());
                
                if (userRest && normalizedUserRest !== targetSlug && !userRestIds.includes(targetSlug)) {
                  console.warn(`[useAuth] Staff user ${staffUser.email} belongs to ${userRest} but is visiting ${targetSlug}. Rejecting cross-tenant session.`);
                  await signOut(auth);
                  updateUserWithCache(null);
                  setLoading(false);
                  return;
                }
              }
            }

            updateUserWithCache(staffUser);
            localStorage.removeItem('intendedRole');
            setLoading(false);

            unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
              if (snap.exists()) {
                updateUserWithCache({ id: snap.id, ...snap.data(), authProvider: currentAuthProvider } as User);
              }
            }, (err) => {
              console.warn('Staff profile listener warning:', err);
            });
            return;
          }

          // 2c. CHECK IF USER IS AN OWNER IN `restaurants` COLLECTION
          if (!staffDocSnap && userEmail) {
            try {
              const qRest = query(collection(db, 'restaurants'), where('ownerEmail', '==', userEmail), limit(1));
              const snapRest = await getDocs(qRest);
              if (!snapRest.empty) {
                const restDoc = snapRest.docs[0];
                const restData = restDoc.data();
                const ownerUser: User = {
                  id: firebaseUser.uid,
                  authUid: firebaseUser.uid,
                  email: userEmail,
                  name: restData.ownerName || firebaseUser.displayName || 'Restaurant Owner',
                  role: 'restaurant_owner',
                  status: 'active',
                  restaurantId: restDoc.id,
                  restaurantIds: [restDoc.id],
                  authProvider: currentAuthProvider
                };

                try {
                  await setDoc(doc(db, 'users', firebaseUser.uid), {
                    ...ownerUser,
                    createdAt: serverTimestamp(),
                  }, { merge: true });
                } catch (e) {}

                // Enforce tenant session isolation against current URL
                if (typeof window !== 'undefined') {
                  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/);
                  if (match && match[1]) {
                    const rawSlug = match[1].toLowerCase();
                    const targetSlug = rawSlug === 'bella-italia' ? 'bela-italia' : rawSlug;
                    const userRest = (ownerUser.restaurantId || (ownerUser.restaurantIds && ownerUser.restaurantIds[0]) || '').toLowerCase();
                    const normalizedUserRest = userRest === 'bella-italia' ? 'bela-italia' : userRest;
                    const userRestIds = (ownerUser.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());
                    
                    if (userRest && normalizedUserRest !== targetSlug && !userRestIds.includes(targetSlug)) {
                      console.warn(`[useAuth] Owner user ${ownerUser.email} belongs to ${userRest} but is visiting ${targetSlug}. Rejecting cross-tenant session.`);
                      await signOut(auth);
                      updateUserWithCache(null);
                      setLoading(false);
                      return;
                    }
                  }
                }

                updateUserWithCache(ownerUser);
                localStorage.removeItem('intendedRole');
                setLoading(false);
                return;
              }
            } catch (rErr) {
              console.warn('Restaurant owner lookup note:', rErr);
            }
          }

          // 3. If NOT found in `users` and user intended to log in specifically as Staff
          if (intendedRole === 'staff') {
            await signOut(auth);
            updateUserWithCache(null);
            localStorage.removeItem('intendedRole');
            toast.error(
              language === 'pt'
                ? 'Conta de funcionário não encontrada para este email Google. Solicite ao administrador para adicionar o seu email.'
                : 'Staff account not found for this Google email. Please ask an administrator to add your email.'
            );
            setLoading(false);
            return;
          }

          // 4. CUSTOMER AUTHENTICATION (Google or Email)
          if (isEmailProvider && !firebaseUser.emailVerified) {
            const justSignedUp = localStorage.getItem('justSignedUp') === 'true';
            await signOut(auth);
            setUser(null);
            if (justSignedUp) {
              toast.success(t('auth.verify_email_sent'));
              localStorage.removeItem('justSignedUp');
            } else {
              toast.error(t('auth.verify_email_first'));
            }
            setLoading(false);
            return;
          }

          // Sync / fetch customer profile
          const syncedData = await syncExistingCustomerDetails(
            firebaseUser.uid, 
            firebaseUser.email || userEmail, 
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer'
          );

          const customerUser: User = {
            id: firebaseUser.uid,
            authUid: firebaseUser.uid,
            email: syncedData?.email || firebaseUser.email || '',
            name: syncedData?.name || firebaseUser.displayName || 'Customer',
            phone: syncedData?.phone || '',
            role: 'customer',
            status: 'active',
            authProvider: isGoogleProvider ? 'google' : 'email'
          };

          updateUserWithCache(customerUser);
          localStorage.removeItem('intendedRole');
          setLoading(false);

          // Realtime listener for customer profile changes
          unsubscribeProfile = onSnapshot(doc(db, 'customers', firebaseUser.uid), (snap) => {
            if (snap.exists()) {
              const liveData = snap.data();
              updateUserWithCache({
                id: firebaseUser.uid,
                authUid: firebaseUser.uid,
                email: liveData.email || firebaseUser.email || '',
                name: liveData.name || firebaseUser.displayName || 'Customer',
                phone: liveData.phone || '',
                role: 'customer',
                status: liveData.status || 'active',
                authProvider: isGoogleProvider ? 'google' : 'email'
              });
            }
          }, (err) => {
            console.warn('Customer profile listener warning:', err);
          });
        } else {
          // Firebase user is null
          updateUserWithCache(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        updateUserWithCache(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = async (role: UserRole = 'customer', isSignup: boolean = false) => {
    try {
      localStorage.setItem('intendedRole', role);
      if (isSignup) {
        localStorage.setItem('isGoogleSignup', 'true');
      } else {
        localStorage.removeItem('isGoogleSignup');
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      try {
        await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        console.warn('Popup sign-in notice, attempting redirect fallback if necessary:', popupErr);
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/cancelled-popup-request' ||
          popupErr?.code === 'auth/operation-not-supported-in-this-environment' ||
          popupErr?.code === 'auth/internal-error'
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error?.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomainModal(window.location.hostname);
        toast.error(
          language === 'pt'
            ? 'Domínio não autorizado no Firebase Auth. Adicione este domínio na consola Firebase.'
            : 'Unauthorized domain in Firebase Auth. Please add this domain in Firebase Console Authentication settings.'
        );
      } else if (error?.code !== 'auth/popup-closed-by-user') {
        toast.error(t('auth.login_error') || 'Error signing in');
      }
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error('Sign in error:', error);
      let message = t('auth.login_error');
      
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password') {
        message = t('auth.invalid_credentials');
      } else if (error.message && !error.message.includes('Firebase:')) {
        message = error.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      // Use customer role by default for email signup
      localStorage.setItem('intendedRole', 'customer');
      localStorage.setItem('justSignedUp', 'true');
      let result;
      try {
        result = await createUserWithEmailAndPassword(auth, email, pass);
      } catch (initialErr: any) {
        if (initialErr.code === 'auth/email-already-in-use') {
          // It's possible the user was deleted from the db but orphaned in Auth.
          // Let's attempt to cleanup the orphan and retry.
          try {
            const res = await fetch('/api/admin/delete-user-by-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            if (res.ok) {
              // Retry creation
              result = await createUserWithEmailAndPassword(auth, email, pass);
            } else {
              throw initialErr; // API failed, throw original error
            }
          } catch (cleanupErr) {
            throw initialErr; // Network/fetch failed, throw original error
          }
        } else {
          throw initialErr;
        }
      }
      
      const uid = result.user.uid;
      
      // Send verification email
      await sendEmailVerification(result.user);
      
      await syncExistingCustomerDetails(uid, email, name);
    } catch (error: any) {
      console.error('Sign up error:', error);
      let message = t('auth.login_error');
      
      if (error.code === 'auth/email-already-in-use') {
        message = t('auth.email_in_use');
      } else if (error.message && !error.message.includes('Firebase:')) {
        message = error.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const logout = async (silent: boolean = false) => {
    try {
      updateUserWithCache(null);
      try {
        sessionStorage.removeItem('eata_active_restaurant_id');
        localStorage.removeItem('eata_active_restaurant_id');
        localStorage.removeItem('intendedRole');
        localStorage.removeItem('cached_user_profile');
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cached_restaurant_settings_') || key.startsWith('cached_tables_') || key.startsWith('cached_areas_')) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch {}
      await signOut(auth);
      if (!silent) {
        toast.success(t('auth.logged_out'));
      }
    } catch (error) {
      console.error('Logout error:', error);
      updateUserWithCache(null);
      if (!silent) {
        toast.error(t('auth.logout_error'));
      }
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      toast.success(t('common.save_success'));
    } catch (error: any) {
      console.error('Update password error:', error);
      toast.error(error.message || t('res.cancel_error'));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(t('public.success_title'));
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || t('res.cancel_error'));
      throw error;
    }
  };

  const isSuperAdmin = !user?.restaurantId && (user?.role === 'super_admin' || (user?.email?.trim().toLowerCase() === 'pcristo35@gmail.com'));
  const isAdmin = isSuperAdmin || user?.role === 'admin' || user?.role === 'restaurant_owner' || user?.role === 'restaurant_manager';
  const isStaff = user?.role === 'staff' || user?.role === 'restaurant_staff' || isAdmin;
  const isCustomer = user?.role === 'customer' && !isAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signInWithEmail,
      signUpWithEmail,
      logout, 
      updatePassword,
      resetPassword,
      isSuperAdmin,
      isAdmin, 
      isStaff, 
      isCustomer 
    }}>
      {children}

      {unauthorizedDomainModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200 dark:border-gray-800 relative text-left">
            <button 
              onClick={() => setUnauthorizedDomainModal(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {language === 'pt' ? 'Domínio Não Autorizado no Firebase' : 'Unauthorized Domain in Firebase'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {language === 'pt' ? 'Configuração necessária para Google Sign-In' : 'Configuration required for Google Sign-In'}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {language === 'pt'
                ? 'Para fazer login com a Google nesta versão online, o domínio atual deve ser adicionado à lista de domínios autorizados na consola do Firebase.'
                : 'To log in with Google on this live version, your current domain must be added to the authorized domains list in your Firebase Console.'}
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                {language === 'pt' ? 'Domínio Atual a Copiar' : 'Current Domain to Copy'}
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                <Globe size={18} className="text-gray-400 flex-shrink-0" />
                <span className="font-mono text-xs sm:text-sm font-semibold text-gray-900 dark:text-white flex-1 truncate select-all">
                  {unauthorizedDomainModal}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomainModal);
                    setCopied(true);
                    toast.success(language === 'pt' ? 'Domínio copiado!' : 'Domain copied!');
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? (language === 'pt' ? 'Copiado' : 'Copied') : (language === 'pt' ? 'Copiar' : 'Copy')}
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/50 mb-5 text-xs text-gray-700 dark:text-gray-300 space-y-2">
              <p className="font-bold text-amber-900 dark:text-amber-300">
                {language === 'pt' ? 'Como Resolver em 3 Passos Rápidos:' : 'How to Fix in 3 Quick Steps:'}
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600 dark:text-gray-400">
                <li>
                  {language === 'pt' 
                    ? 'Abra a Consola Firebase > Authentication > Definições (Settings).' 
                    : 'Open Firebase Console > Authentication > Settings.'}
                </li>
                <li>
                  {language === 'pt' 
                    ? 'Clique na secção "Domínios Autorizados" (Authorized domains).' 
                    : 'Click on the "Authorized domains" section.'}
                </li>
                <li>
                  {language === 'pt' 
                    ? 'Clique em "Adicionar domínio", cole o domínio acima e clique em Guardar.' 
                    : 'Click "Add domain", paste the domain above, and click Save.'}
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow transition-colors"
              >
                <span>{language === 'pt' ? 'Abrir Consola Firebase' : 'Open Firebase Console'}</span>
                <ExternalLink size={15} />
              </a>
              <button
                type="button"
                onClick={() => setUnauthorizedDomainModal(null)}
                className="py-2.5 px-5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                {language === 'pt' ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
