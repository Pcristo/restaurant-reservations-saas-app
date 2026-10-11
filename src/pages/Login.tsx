import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, limit, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useTenantSafe } from '../hooks/useTenant';
import { getRestaurant, getRestaurantBySlug, DEFAULT_RESTAURANT_ID } from '../services/tenantService';
import { getMarketingWebsiteSettings } from '../services/marketingWebsiteService';
import { isUserSuperAdmin } from '../lib/permissions';
import { User, MarketingWebsiteSettings, Restaurant, RestaurantSettings } from '../types';
import { getOptimizedUrl } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Utensils, 
  ShieldCheck,
  Store,
  Users,
  User as UserIcon,
  Phone,
  ArrowRight
} from 'lucide-react';

export default function Login() {
  const { user, loading: authLoading, resetPassword, signIn, signUpWithEmail, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const tenantCtx = useTenantSafe();
  const tenant = tenantCtx?.tenant;

  // Determine restaurant context & requested role
  const searchParams = new URLSearchParams(location.search);
  const rawRestaurantSlug = slug || searchParams.get('restaurant') || tenant?.slug || '';
  const restaurantSlug = rawRestaurantSlug.toLowerCase() === 'bella-italia' ? 'bela-italia' : rawRestaurantSlug;
  const roleParam = searchParams.get('role');
  const modeParam = searchParams.get('mode');

  // Role detection
  const isAdminLogin = 
    roleParam === 'admin' || 
    roleParam === 'staff' || 
    location.pathname.includes('/admin');

  const isCustomerLogin = 
    roleParam === 'customer' || 
    (!isAdminLogin && Boolean(restaurantSlug));

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(modeParam === 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restaurant details
  const [targetRestaurant, setTargetRestaurant] = useState<Restaurant | null>(() => {
    if (tenant && (tenant.slug === restaurantSlug || tenant.id === restaurantSlug)) {
      return tenant;
    }
    return null;
  });
  const [loadingRestaurant, setLoadingRestaurant] = useState(Boolean(restaurantSlug && !targetRestaurant));

  // Restaurant Settings from Firestore 'settings' collection for this restaurant
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(() => {
    try {
      if (restaurantSlug) {
        const cached = localStorage.getItem(`cached_restaurant_settings_${restaurantSlug}`);
        if (cached) return JSON.parse(cached);
      }
    } catch {}
    return null;
  });

  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  // Forgot password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  // DineMaster Pro Branding from settings
  const [marketingSettings, setMarketingSettings] = useState<MarketingWebsiteSettings | null>(null);

  useEffect(() => {
    getMarketingWebsiteSettings()
      .then((s) => setMarketingSettings(s))
      .catch((e) => console.warn('[Login] Notice loading branding settings:', e));
  }, []);

  // Sync modeParam
  useEffect(() => {
    if (modeParam === 'signup' && !isAdminLogin) {
      setIsSignUp(true);
    }
  }, [modeParam, isAdminLogin]);

  // Load target restaurant if slug or restaurant query param is provided
  useEffect(() => {
    let isMounted = true;
    if (restaurantSlug) {
      if (!targetRestaurant || (targetRestaurant.slug !== restaurantSlug && targetRestaurant.id !== restaurantSlug)) {
        setLoadingRestaurant(true);
      }
      (async () => {
        try {
          let r = await getRestaurantBySlug(restaurantSlug);
          if (!r) {
            r = await getRestaurant(restaurantSlug);
          }
          if (isMounted) {
            setTargetRestaurant(r);
          }
        } catch (err) {
          console.warn('[Login] Error loading restaurant:', err);
        } finally {
          if (isMounted) {
            setLoadingRestaurant(false);
          }
        }
      })();
    } else {
      setTargetRestaurant(null);
      setLoadingRestaurant(false);
    }
    return () => { isMounted = false; };
  }, [restaurantSlug]);

  // Load and listen to restaurant settings in real-time from Firestore
  useEffect(() => {
    let isMounted = true;
    const targetId = targetRestaurant?.id || restaurantSlug;
    if (!targetId) {
      setRestaurantSettings(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'settings', targetId), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as RestaurantSettings;
        setRestaurantSettings(data);
        try {
          localStorage.setItem(`cached_restaurant_settings_${targetId}`, JSON.stringify(data));
        } catch {}
      } else {
        // Fallback: check if stored under slug if targetRestaurant.slug differs from id
        if (targetRestaurant?.slug && targetRestaurant.slug !== targetId) {
          getDoc(doc(db, 'settings', targetRestaurant.slug)).then((s) => {
            if (isMounted && s.exists()) {
              const d = { id: s.id, ...s.data() } as RestaurantSettings;
              setRestaurantSettings(d);
            }
          }).catch(() => {});
        } else if (targetId === 'main' || targetId === DEFAULT_RESTAURANT_ID) {
          getDoc(doc(db, 'settings', 'main')).then((s) => {
            if (isMounted && s.exists()) {
              const d = { id: s.id, ...s.data() } as RestaurantSettings;
              setRestaurantSettings(d);
            }
          }).catch(() => {});
        }
      }
    }, (err) => {
      console.warn('[Login] Settings sync note:', err);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [targetRestaurant?.id, targetRestaurant?.slug, restaurantSlug]);

  // Pre-fill forgot password email if user already typed their email
  useEffect(() => {
    if (email && !forgotEmail) {
      setForgotEmail(email);
    }
  }, [email, forgotEmail]);

  // Handle already-authenticated users
  useEffect(() => {
    if (user && !authLoading) {
      // 1. If currently in a restaurant context (/r/:slug/...):
      const effectiveSlug = (targetRestaurant?.slug || restaurantSlug || '').toLowerCase();
      const normalizedTargetSlug = effectiveSlug === 'bella-italia' ? 'bela-italia' : effectiveSlug;

      if (normalizedTargetSlug) {
        const isSuper = isUserSuperAdmin(user);
        const userRestId = (user.restaurantId || (user.restaurantIds && user.restaurantIds[0]) || '').toLowerCase();
        const normalizedUserRest = userRestId === 'bella-italia' ? 'bela-italia' : userRestId;
        const userRestIds = (user.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());
        const isStaffOrAdminUser = user.role !== 'customer' || Boolean(userRestId);

        const hasAccess = isSuper || Boolean(
          normalizedUserRest && (
            normalizedUserRest === normalizedTargetSlug ||
            normalizedUserRest === targetRestaurant?.id?.toLowerCase() ||
            userRestIds.includes(normalizedTargetSlug) ||
            (targetRestaurant && userRestIds.includes(targetRestaurant.id.toLowerCase()))
          )
        );

        if (!hasAccess && isStaffOrAdminUser) {
          // Logged in with an account belonging to ANOTHER restaurant!
          // Terminate this session so user is not logged in across restaurants
          console.warn(`[Login] Session belongs to restaurant ${userRestId}, not ${normalizedTargetSlug}. Resetting session.`);
          logout(true);
          return;
        }

        if (isAdminLogin || isStaffOrAdminUser) {
          const isStaffOnly = (user.role === 'staff' || user.role === 'restaurant_staff' || roleParam === 'staff') && user.role !== 'restaurant_owner' && user.role !== 'restaurant_manager' && user.role !== 'admin';
          const targetBase = isStaffOnly ? `/r/${normalizedTargetSlug}/staff` : `/r/${normalizedTargetSlug}/admin`;
          const returnUrl = searchParams.get('returnUrl');
          if (returnUrl && returnUrl.startsWith(`/r/${normalizedTargetSlug}`)) {
            navigate(returnUrl, { replace: true });
          } else {
            navigate(targetBase, { replace: true });
          }
          return;
        }

        if (user.role === 'customer' || isCustomerLogin) {
          navigate(`/r/${normalizedTargetSlug}`, { replace: true });
          return;
        }
      }

      // 2. If Customer role or on Customer Login page without restaurant context:
      if (user.role === 'customer' || isCustomerLogin) {
        const fromPath = (location.state as any)?.from?.pathname;
        if (fromPath && fromPath.startsWith('/my-bookings')) {
          navigate(fromPath, { replace: true });
        } else {
          navigate('/my-bookings', { replace: true });
        }
        return;
      }

      // 3. Platform Super Admin (strictly without restaurant context)
      if (isUserSuperAdmin(user) && !targetRestaurant && !isAdminLogin) {
        navigate('/app/super-admin', { replace: true });
        return;
      }

      // 4. Restaurant Admin / Staff with restaurant association
      const rawRestSlug = user.restaurantId || (user.restaurantIds && user.restaurantIds[0]);
      if (rawRestSlug) {
        const restSlug = rawRestSlug.toLowerCase() === 'bella-italia' ? 'bela-italia' : rawRestSlug;
        try {
          sessionStorage.setItem('eata_active_restaurant_id', restSlug);
          localStorage.setItem('eata_active_restaurant_id', restSlug);
        } catch (e) {}

        const isStaffOnly = (user.role === 'staff' || user.role === 'restaurant_staff' || roleParam === 'staff') && user.role !== 'restaurant_owner' && user.role !== 'restaurant_manager' && user.role !== 'admin';
        const targetBase = isStaffOnly ? `/r/${restSlug}/staff` : `/r/${restSlug}/admin`;

        const fromPath = (location.state as any)?.from?.pathname;
        if (fromPath && fromPath.startsWith(targetBase)) {
          navigate(fromPath, { replace: true });
        } else {
          navigate(targetBase, { replace: true });
        }
        return;
      }

      // 5. Authenticated user without restaurant association
      setErrorMessage(
        language === 'pt'
          ? 'A sua conta não está associada a nenhum restaurante. Por favor, contacte o seu administrador.'
          : 'Your account is not associated with a restaurant. Please contact your administrator.'
      );
    }
  }, [user, authLoading, navigate, location.state, language, isAdminLogin, isCustomerLogin, targetRestaurant, restaurantSlug, roleParam, searchParams, logout]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await signIn();
      // On success, useEffect handles customer redirection
    } catch (err: any) {
      console.error('[Login] Google sign in error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(
          language === 'pt'
            ? 'Não foi possível iniciar sessão com o Google. Por favor, tente novamente.'
            : 'Could not complete Google sign-in. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage(language === 'pt' ? 'Por favor, insira o seu nome.' : 'Please enter your name.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage(language === 'pt' ? 'Por favor, insira o seu email.' : 'Please enter your email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage(
        language === 'pt' 
          ? 'A palavra-passe deve ter pelo menos 6 caracteres.' 
          : 'Password must be at least 6 characters long.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(
        language === 'pt' 
          ? 'As palavras-passe não coincidem.' 
          : 'Passwords do not match.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(cleanEmail, password, cleanName);

      // If phone provided, save to customer record
      if (phone.trim() && auth.currentUser) {
        try {
          await setDoc(doc(db, 'customers', auth.currentUser.uid), {
            phone: phone.trim()
          }, { merge: true });
        } catch (phoneErr) {}
      }

      toast.success(
        language === 'pt' 
          ? `Conta criada com sucesso! Bem-vindo ao ${targetRestaurant?.name || 'Portal de Clientes'}.`
          : `Account created successfully! Welcome to ${targetRestaurant?.name || 'Customer Portal'}.`
      );

      if (targetRestaurant?.slug) {
        navigate(`/r/${targetRestaurant.slug}`, { replace: true });
      } else {
        navigate('/my-bookings', { replace: true });
      }
    } catch (err: any) {
      console.error('[Login] Sign up error:', err);
      let msg = language === 'pt' ? 'Erro ao criar conta.' : 'Failed to create account.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = language === 'pt' ? 'Este email já está registado. Por favor, inicie sessão.' : 'This email is already registered. Please log in.';
      } else if (err?.message && !err.message.includes('Firebase:')) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(
        language === 'pt' ? 'Por favor, insira o seu email.' : 'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        language === 'pt' ? 'Por favor, insira a sua palavra-passe.' : 'Please enter your password.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Authenticate with Firebase Authentication
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const firebaseUser = credential.user;

      if (!firebaseUser) {
        throw new Error('Authentication failed: no user returned.');
      }

      const userEmail = (firebaseUser.email || '').trim().toLowerCase();

      // 2. Query Firestore for User Record & Restaurant Association
      let userData: User | null = null;

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          userData = userDocSnap.data() as User;
        }
      } catch (docErr) {
        console.warn('[Login] Error fetching direct user doc:', docErr);
      }

      // Fallback query by authUid
      if (!userData) {
        try {
          const qAuth = query(collection(db, 'users'), where('authUid', '==', firebaseUser.uid));
          const snapAuth = await getDocs(qAuth);
          if (!snapAuth.empty) {
            userData = snapAuth.docs[0].data() as User;
          }
        } catch (authQErr) {
          console.warn('[Login] Error querying users by authUid:', authQErr);
        }
      }

      // Fallback query by email
      if (!userData && userEmail) {
        try {
          const qEmail = query(collection(db, 'users'), where('email', '==', userEmail));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            userData = snapEmail.docs[0].data() as User;
          }
        } catch (emailQErr) {
          console.warn('[Login] Error querying users by email:', emailQErr);
        }
      }

      // Check if user account is deactivated or suspended
      if (userData?.status === 'inactive' || userData?.status === 'suspended') {
        await signOut(auth);
        setErrorMessage(
          language === 'pt'
            ? 'A sua conta foi desativada ou suspensa. Por favor, contacte o suporte.'
            : 'Your account has been deactivated or suspended. Please contact support.'
        );
        setIsSubmitting(false);
        return;
      }

      // Check if user is actually restaurant staff or admin
      let userRestaurantId = userData?.restaurantId || (userData?.restaurantIds && userData.restaurantIds[0]);
      if (!userRestaurantId && userEmail) {
        try {
          const qRest = query(collection(db, 'restaurants'), where('ownerEmail', '==', userEmail), limit(1));
          const restSnap = await getDocs(qRest);
          if (!restSnap.empty) {
            userRestaurantId = restSnap.docs[0].id;
          }
        } catch (rErr) {
          console.warn('[Login] Error querying restaurants by ownerEmail:', rErr);
        }
      }

      const isStaffOrAdminAccount = (userData?.role && userData.role !== 'customer') || Boolean(userRestaurantId);

      // =========================================================================
      // FLOW A: RESTAURANT CUSTOMER LOGIN
      // =========================================================================
      if (isCustomerLogin && !isStaffOrAdminAccount) {
        const custName = userData?.name || firebaseUser.displayName || userEmail.split('@')[0] || 'Customer';
        toast.success(
          language === 'pt' ? `Bem-vindo, ${custName}!` : `Welcome back, ${custName}!`
        );

        if (targetRestaurant?.slug) {
          navigate(`/r/${targetRestaurant.slug}`, { replace: true });
        } else {
          navigate('/my-bookings', { replace: true });
        }
        return;
      }

      // =========================================================================
      // FLOW B: RESTAURANT ADMIN / STAFF LOGIN FOR A SPECIFIC RESTAURANT
      // The admin MUST access the restaurant's management system, NOT Super Admin!
      // =========================================================================
      if ((isAdminLogin || isStaffOrAdminAccount) && (targetRestaurant || restaurantSlug)) {
        const targetId = targetRestaurant?.id || restaurantSlug;
        const rawTargetSlug = targetRestaurant?.slug || restaurantSlug;
        const targetSlug = rawTargetSlug.toLowerCase() === 'bella-italia' ? 'bela-italia' : rawTargetSlug;

        // Check if user is Super Admin logging in specifically to manage this restaurant
        const isSuper = (userData?.role === 'super_admin' && !userData?.restaurantId) || userEmail === 'pcristo35@gmail.com';
        if (isSuper) {
          try {
            sessionStorage.setItem('eata_active_restaurant_id', targetId);
            localStorage.setItem('eata_active_restaurant_id', targetId);
          } catch (e) {}

          toast.success(
            language === 'pt'
              ? `Sessão iniciada na gestão de ${targetRestaurant?.name || targetSlug}`
              : `Logged in to manage ${targetRestaurant?.name || targetSlug}`
          );

          navigate(`/r/${targetSlug}/admin`, { replace: true });
          return;
        }

        // Restaurant admin / staff check
        const userRestId = userRestaurantId;
        const normalizedUserRest = userRestId?.toLowerCase() === 'bella-italia' ? 'bela-italia' : userRestId;
        const userRestIds = (userData?.restaurantIds || []).map(id => id.toLowerCase() === 'bella-italia' ? 'bela-italia' : id.toLowerCase());

        // Verify that the admin belongs to THIS restaurant
        const hasAccessToThisRestaurant = 
          normalizedUserRest === targetId.toLowerCase() || 
          normalizedUserRest === targetSlug.toLowerCase() ||
          userRestIds.includes(targetId.toLowerCase()) || 
          userRestIds.includes(targetSlug.toLowerCase());

        if (!hasAccessToThisRestaurant) {
          // Account belongs to another restaurant! Enforce strict tenant boundary
          await logout(true);
          setErrorMessage(
            language === 'pt'
              ? `Acesso negado: A sua conta pertence a outro restaurante. Só tem permissão para aceder à gestão do seu próprio restaurante.`
              : `Access Denied: Your account belongs to another restaurant. You can only access your own restaurant's management system.`
          );
          setIsSubmitting(false);
          return;
        }

        // Bind active restaurant context
        try {
          sessionStorage.setItem('eata_active_restaurant_id', targetId);
          localStorage.setItem('eata_active_restaurant_id', targetId);
        } catch (e) {}

        toast.success(
          language === 'pt' ? `Bem-vindo à gestão de ${targetRestaurant?.name || targetSlug}` : `Welcome back to ${targetRestaurant?.name || targetSlug}`
        );

        const isStaffOnly = (userData?.role === 'staff' || userData?.role === 'restaurant_staff' || roleParam === 'staff') && userData?.role !== 'restaurant_owner' && userData?.role !== 'restaurant_manager' && userData?.role !== 'admin';
        const targetPath = isStaffOnly ? `/r/${targetSlug}/staff` : `/r/${targetSlug}/admin`;
        navigate(targetPath, { replace: true });
        return;
      }

      // =========================================================================
      // FLOW C: GENERAL PLATFORM LOGIN (NO RESTAURANT CONTEXT SPECIFIED)
      // =========================================================================

      // Super Admin on general login
      if ((userData?.role === 'super_admin' && !userData?.restaurantId) || userEmail === 'pcristo35@gmail.com' || isUserSuperAdmin(userEmail)) {
        const adminName = userData?.name || firebaseUser.displayName || userEmail.split('@')[0] || 'Super Admin';
        toast.success(`Welcome back, ${adminName}! You are logged in as ${adminName}.`);
        navigate('/app/super-admin', { replace: true });
        return;
      }

      // Customer role on general login
      if (userData?.role === 'customer') {
        toast.success(language === 'pt' ? 'Sessão iniciada com sucesso' : 'Signed in successfully');
        navigate('/my-bookings', { replace: true });
        return;
      }

      // Restaurant staff/admin on general login
      let restaurantId = userData?.restaurantId || (userData?.restaurantIds && userData.restaurantIds[0]);

      // If user doc didn't have restaurantId directly, check if this email is an owner in `restaurants`
      if (!restaurantId && userEmail) {
        try {
          const qRest = query(collection(db, 'restaurants'), where('ownerEmail', '==', userEmail), limit(1));
          const restSnap = await getDocs(qRest);
          if (!restSnap.empty) {
            restaurantId = restSnap.docs[0].id;
          }
        } catch (rErr) {
          console.warn('[Login] Error querying restaurants by ownerEmail:', rErr);
        }
      }

      if (!restaurantId) {
        await signOut(auth);
        setErrorMessage(
          language === 'pt'
            ? 'A sua conta não está associada a nenhum restaurante. Por favor, contacte o seu administrador.'
            : 'Your account is not associated with a restaurant. Please contact your administrator.'
        );
        setIsSubmitting(false);
        return;
      }

      const restaurant = (await getRestaurant(restaurantId)) || (await getRestaurantBySlug(restaurantId));
      if (!restaurant) {
        await signOut(auth);
        setErrorMessage(
          language === 'pt'
            ? 'A sua conta não está associada a nenhum restaurante válido.'
            : 'Your account is not associated with a valid restaurant.'
        );
        setIsSubmitting(false);
        return;
      }

      if (restaurant.status === 'suspended') {
        await signOut(auth);
        setErrorMessage(
          language === 'pt'
            ? `O restaurante "${restaurant.name}" está suspenso. Por favor, contacte o suporte.`
            : `The restaurant "${restaurant.name}" is currently suspended. Please contact support.`
        );
        setIsSubmitting(false);
        return;
      }

      // Bind active restaurant context
      try {
        sessionStorage.setItem('eata_active_restaurant_id', restaurant.id);
        localStorage.setItem('eata_active_restaurant_id', restaurant.id);
      } catch (storageErr) {}

      toast.success(
        language === 'pt' ? `Bem-vindo a ${restaurant.name}` : `Welcome back to ${restaurant.name}`
      );

      const isStaffOnly = (userData?.role === 'staff' || userData?.role === 'restaurant_staff');
      const cleanSlug = (restaurant.slug || restaurant.id).toLowerCase() === 'bella-italia' ? 'bela-italia' : (restaurant.slug || restaurant.id);
      const targetBase = isStaffOnly ? `/r/${cleanSlug}/staff` : `/r/${cleanSlug}/admin`;
      navigate(targetBase, { replace: true });
    } catch (err: any) {
      console.error('[Login] Authentication error:', err);
      let msg = language === 'pt' 
        ? 'Falha ao iniciar sessão. Verifique as suas credenciais.' 
        : 'Failed to sign in. Please verify your credentials.';

      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-email'
      ) {
        msg = language === 'pt'
          ? 'Email ou palavra-passe incorretos. Por favor, tente novamente.'
          : 'Invalid email or password. Please try again.';
      } else if (err?.code === 'auth/too-many-requests') {
        msg = language === 'pt'
          ? 'Acesso temporariamente bloqueado devido a tentativas falhadas. Tente mais tarde.'
          : 'Access temporarily disabled due to failed login attempts. Please try again later.';
      } else if (err?.message && !err.message.includes('Firebase:')) {
        msg = err.message;
      }

      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMessage(null);
    setResetSuccessMessage(null);

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setResetErrorMessage(
        language === 'pt' ? 'Por favor, insira o seu email.' : 'Please enter your email address.'
      );
      return;
    }

    setIsSendingReset(true);
    try {
      await resetPassword(cleanEmail);
      setResetSuccessMessage(
        language === 'pt'
          ? 'Enviámos um link de recuperação para o seu email. Por favor, verifique a sua caixa de entrada.'
          : 'A password reset link has been sent to your email. Please check your inbox.'
      );
    } catch (err: any) {
      let msg = language === 'pt'
        ? 'Erro ao enviar email de recuperação.'
        : 'Error sending password reset email.';
      if (err?.code === 'auth/user-not-found') {
        msg = language === 'pt' ? 'Não existe conta com este email.' : 'No account found with this email.';
      }
      setResetErrorMessage(msg);
    } finally {
      setIsSendingReset(false);
    }
  };

  // Display texts and branding based on mode and target restaurant
  const isRestaurantPortal = Boolean(restaurantSlug || targetRestaurant);

  const fallbackRestName = restaurantSlug
    ? (restaurantSlug.toLowerCase() === 'bela-italia' ? 'Bela Itália' : restaurantSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '))
    : '';

  const siteName = restaurantSettings?.name || targetRestaurant?.name || fallbackRestName || marketingSettings?.general?.siteName || 'DineMaster Pro';

  // Resolve restaurant logo from Settings, fallback to letter initial for restaurants or platform logo for SaaS
  const logoUrl = useMemo(() => {
    if (isRestaurantPortal) {
      // 1. Restaurant Settings from Firestore (the Settings page configured by restaurant admin)
      if (restaurantSettings && restaurantSettings.showLogo !== false) {
        const rawUrl = restaurantSettings.logoUrl || (restaurantSettings.useCloudinary ? restaurantSettings.cloudinaryLogoUrl : '') || restaurantSettings.cloudinaryLogoUrl || restaurantSettings.branding?.logoUrl;
        const opt = getOptimizedUrl(rawUrl, restaurantSettings, 'logo');
        if (opt && typeof opt === 'string' && opt.trim()) return opt.trim();
        if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) return rawUrl.trim();
      }

      // 2. Cached restaurant settings in localStorage (offline / zero-flicker instant load)
      try {
        const restId = targetRestaurant?.id || restaurantSlug;
        const cachedStr = localStorage.getItem(`cached_restaurant_settings_${restId}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached.showLogo !== false) {
            const rawUrl = cached.logoUrl || (cached.useCloudinary ? cached.cloudinaryLogoUrl : '') || cached.cloudinaryLogoUrl || cached.branding?.logoUrl;
            const opt = getOptimizedUrl(rawUrl, cached, 'logo');
            if (opt && typeof opt === 'string' && opt.trim()) return opt.trim();
            if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) return rawUrl.trim();
          }
        }
      } catch {}

      // 3. Restaurant object branding (e.g. from restaurants collection)
      if (targetRestaurant?.branding?.logoUrl && typeof targetRestaurant.branding.logoUrl === 'string' && targetRestaurant.branding.logoUrl.trim()) {
        return targetRestaurant.branding.logoUrl.trim();
      }

      // 4. Tenant branding
      if (tenant?.branding?.logoUrl && typeof tenant.branding.logoUrl === 'string' && tenant.branding.logoUrl.trim()) {
        return tenant.branding.logoUrl.trim();
      }

      // For restaurant login, if NO logo is configured in settings or branding,
      // return null so it keeps the existing letter/initial fallback (e.g. "B" for Bela Italia)
      return null;
    }

    // Platform SaaS Login: use marketing website logo
    return marketingSettings?.general?.logoUrl || null;
  }, [isRestaurantPortal, restaurantSettings, targetRestaurant, tenant, restaurantSlug, marketingSettings]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

  const backUrl = targetRestaurant?.slug ? `/r/${targetRestaurant.slug}` : (restaurantSlug ? `/r/${restaurantSlug}` : '/');
  const backLabel = targetRestaurant?.name ? `← Back to ${targetRestaurant.name}` : `← Back to ${siteName}`;

  if (authLoading || (loadingRestaurant && !targetRestaurant && !restaurantSettings)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20 mb-4 animate-pulse">
          {isRestaurantPortal ? (siteName.charAt(0).toUpperCase() || 'R') : 'D'}
        </div>
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <Loader2 size={16} className="animate-spin text-amber-400" />
          <span>{language === 'pt' ? 'A carregar...' : 'Loading portal...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden font-sans">
      {/* Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between">
        <Link
          to={backUrl}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>{backLabel}</span>
        </Link>

        {/* Portal Type Badge */}
        {isAdminLogin ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm">
            <Store size={12} className="text-amber-400" />
            <span>Restaurant Admin Portal</span>
          </div>
        ) : restaurantSlug ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full shadow-sm">
            <Users size={12} className="text-emerald-400" />
            <span>Customer Portal</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm">
            <ShieldCheck size={12} className="text-amber-400" />
            <span>Super Admin &bull; Restaurant Admin &bull; Customer</span>
          </div>
        )}
      </header>

      {/* Main Form Card */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
            {/* Header / Restaurant Branding */}
            <div className="flex flex-col items-center text-center mb-6">
              <Link to={backUrl} className="inline-block group mb-3">
                {logoUrl && !logoLoadFailed ? (
                  <div className="w-[110px] h-[110px] rounded-2xl border border-slate-800 shadow-xl shadow-amber-500/10 group-hover:scale-105 transition-all overflow-hidden bg-slate-900 flex items-center justify-center p-2">
                    <img
                      src={logoUrl}
                      alt={siteName}
                      className="max-w-full max-h-full w-auto"
                      onError={() => setLogoLoadFailed(true)}
                    />
                  </div>
                ) : (
                  <div 
                    className="w-[110px] h-[110px] rounded-2xl flex items-center justify-center text-slate-950 font-black text-5xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform"
                    style={{
                      background: targetRestaurant?.branding?.primaryColor 
                        ? `linear-gradient(135deg, ${targetRestaurant.branding.primaryColor}, #f59e0b)`
                        : 'linear-gradient(to top right, #f59e0b, #fbbf24, #fcd34d)'
                    }}
                  >
                    {isRestaurantPortal ? (siteName.charAt(0).toUpperCase() || 'R') : <Utensils size={44} className="text-slate-950" />}
                  </div>
                )}
              </Link>

              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{siteName}</span>
              </h1>

              {/* Sub-badge indicating area */}
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase mt-0.5">
                {isAdminLogin 
                  ? 'Management & Staff Portal' 
                  : restaurantSlug 
                  ? 'Guest Reservations & Bookings' 
                  : 'SaaS Platform & Admin Access'}
              </p>

              <div className="w-full border-t border-slate-800/80 my-4" />

              {/* Section Heading */}
              <h2 className="text-lg font-semibold text-slate-100">
                {isAdminLogin
                  ? (language === 'pt' ? 'Acesso da Gerência' : 'Management Sign In')
                  : restaurantSlug
                  ? (isSignUp
                    ? (language === 'pt' ? 'Criar Conta de Cliente' : 'Create Customer Account')
                    : (language === 'pt' ? 'Acesso de Clientes' : 'Customer Sign In'))
                  : (language === 'pt' ? 'Iniciar Sessão' : 'Platform Sign In')}
              </h2>

              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                {isAdminLogin
                  ? (language === 'pt'
                      ? `Insira as suas credenciais para aceder ao sistema de gestão de ${siteName}.`
                      : `Enter your credentials to access ${siteName}'s restaurant management system.`)
                  : restaurantSlug
                  ? (isSignUp
                    ? (language === 'pt'
                        ? `Crie a sua conta para gerir facilmente as suas reservas no ${siteName}.`
                        : `Create an account to easily track and manage your reservations at ${siteName}.`)
                    : (language === 'pt'
                        ? `Inicie sessão para consultar e gerir as suas reservas no ${siteName}.`
                        : `Sign in to view and manage your table reservations at ${siteName}.`))
                  : (language === 'pt'
                      ? 'Inicie sessão com as suas credenciais de Super Admin, Administrador de Restaurante ou Cliente.'
                      : 'Sign in with your Super Admin, Restaurant Admin, or Customer account.')}
              </p>
            </div>

            {/* Customer Mode: Tab Switcher between Sign In and Sign Up */}
            {isCustomerLogin && (
              <div className="mb-5 p-1 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMessage(null); }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    !isSignUp 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'pt' ? 'Iniciar Sessão' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMessage(null); }}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${
                    isSignUp 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'pt' ? 'Criar Conta' : 'Create Account'}
                </button>
              </div>
            )}

            {/* Error Message Box */}
            {errorMessage && (
              <div 
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fade-in"
              >
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p className="font-semibold text-red-200">
                    {language === 'pt' ? 'Erro de autenticação' : 'Authentication error'}
                  </p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* If user is already authenticated with another account, provide switch/sign-out option */}
            {user && (
              <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                <span>
                  {language === 'pt' ? 'Sessão iniciada como' : 'Signed in as'}: <strong>{user.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 cursor-pointer"
                >
                  {language === 'pt' ? 'Terminar' : 'Sign Out'}
                </button>
              </div>
            )}

            {/* SIGN UP FORM (Customer Registration) */}
            {isCustomerLogin && isSignUp ? (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'pt' ? 'Nome Completo *' : 'Full Name *'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <UserIcon size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maria Silva"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'pt' ? 'Endereço de Email *' : 'Email Address *'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maria@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'pt' ? 'Telemóvel (Opcional)' : 'Phone Number (Optional)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+351 912 345 678"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'pt' ? 'Palavra-passe *' : 'Password *'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {language === 'pt' ? 'Confirmar Palavra-passe *' : 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-slate-950" />
                        <span>{language === 'pt' ? 'A criar conta...' : 'Creating Account...'}</span>
                      </>
                    ) : (
                      <span>{language === 'pt' ? 'Registar Conta de Cliente' : 'Create Customer Account'}</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* LOGIN FORM (Admin or Customer Sign In) */
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label 
                    htmlFor="email"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    {language === 'pt' ? 'Endereço de email' : 'Email address'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail size={16} />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isAdminLogin ? 'admin@restaurant.com' : 'guest@example.com'}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label 
                      htmlFor="password"
                      className="block text-xs font-medium text-slate-300"
                    >
                      {language === 'pt' ? 'Palavra-passe' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotOpen(true);
                        setResetErrorMessage(null);
                        setResetSuccessMessage(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                    >
                      {language === 'pt' ? 'Esqueceu-se da palavra-passe?' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-slate-950" />
                        <span>{language === 'pt' ? 'A autenticar...' : 'Signing in...'}</span>
                      </>
                    ) : (
                      <span>
                        {isAdminLogin 
                          ? (language === 'pt' ? `Entrar na Gestão de ${siteName}` : `Sign In to ${siteName} Management`)
                          : (language === 'pt' ? 'Iniciar Sessão' : 'Sign In')}
                      </span>
                    )}
                  </button>
                </div>

                {/* Customer Login Google Option */}
                {isCustomerLogin && (
                  <>
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-800" />
                      <span className="shrink mx-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
                        {language === 'pt' ? 'ou' : 'or'}
                      </span>
                      <div className="flex-grow border-t border-slate-800" />
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleGoogleSignIn}
                      className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 active:bg-slate-750 border border-slate-800 rounded-xl text-slate-200 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>{language === 'pt' ? 'Continuar com o Google' : 'Continue with Google'}</span>
                    </button>
                  </>
                )}
              </form>
            )}

            {/* Bottom Cross-Navigation Links */}
            <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
              {isAdminLogin && targetRestaurant?.slug && (
                <Link
                  to={`/r/${targetRestaurant.slug}/login?role=customer`}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <span>Looking for your customer reservations? Customer Login</span>
                  <ArrowRight size={13} />
                </Link>
              )}

              {isCustomerLogin && targetRestaurant?.slug && (
                <Link
                  to={`/r/${targetRestaurant.slug}/login?role=admin`}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
                >
                  <span>Are you restaurant staff? Restaurant Management Login</span>
                  <ArrowRight size={13} />
                </Link>
              )}

              <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                {isAdminLogin
                  ? `Access strictly restricted to authorized staff of ${siteName}. Actions are monitored & audited.`
                  : `Secure customer portal for ${siteName}.`}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-left">
            <h3 id="forgot-password-title" className="text-lg font-bold text-white mb-1">
              {language === 'pt' ? 'Recuperar Palavra-passe' : 'Reset your password'}
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {language === 'pt'
                ? 'Insira o email associado à sua conta. Enviaremos um link para criar uma nova palavra-passe.'
                : "Enter the email associated with your account, and we'll send you instructions to reset your password."}
            </p>

            {resetSuccessMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">{resetSuccessMessage}</p>
              </div>
            )}

            {resetErrorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">{resetErrorMessage}</p>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label 
                  htmlFor="forgot-email"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  {language === 'pt' ? 'Endereço de email' : 'Email address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  {language === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{language === 'pt' ? 'A enviar...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <span>{language === 'pt' ? 'Enviar Link' : 'Send Reset Link'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
