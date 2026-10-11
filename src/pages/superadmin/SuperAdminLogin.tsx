import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG } from '../../data/appConfig';
import { checkSuperAdminAccess, declineSuperAdminInvitation } from '../../services/superAdminManagementService';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Store, Crown, Check, X, KeyRound, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SuperAdminLogin: React.FC = () => {
  const { signInWithEmail, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [tenantRedirectInfo, setTenantRedirectInfo] = useState<{ isTenant: boolean; restaurantName?: string } | null>(null);

  // Invitation decision states
  const [isDeclining, setIsDeclining] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showInvitePasswordForm, setShowInvitePasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // Check URL query parameters for invitation
  useEffect(() => {
    try {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const invited = params.get('invited');
        const id = params.get('inviteId');
        if (invited) {
          const clean = decodeURIComponent(invited).trim();
          setEmail(clean);
          setInvitedEmail(clean);
        }
        if (id) {
          setInviteId(decodeURIComponent(id).trim());
        }
      }
    } catch {}
  }, []);

  // Forgot Password Mode
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setTenantRedirectInfo(null);
    setLoading(true);

    try {
      await signInWithEmail(email.trim(), password);

      // Verify whether authenticated email is an authorized Super Admin added through panel
      const check = await checkSuperAdminAccess(email.trim());
      if (!check.isAuthorizedSuperAdmin) {
        await signOut(auth);
        if (check.isRestaurantTenant) {
          setTenantRedirectInfo({ isTenant: true, restaurantName: check.restaurantName });
          setError(
            `Access Denied: The account "${email.trim()}" is associated with the restaurant tenant "${check.restaurantName || 'Restaurant Account'}". Restaurant tenant accounts cannot access the Super Admin area. Please log in at your restaurant portal.`
          );
        } else {
          setTenantRedirectInfo(null);
          setError(
            `Access Denied: The account "${email.trim()}" is not authorized. Only administrators added through the Super Admin panel can log in to the Super Admin area.`
          );
        }
        return;
      }
      // On success, Firebase Auth updates state, and SuperAdminRoute handles authorization
      const adminName = auth.currentUser?.displayName || email.split('@')[0] || 'Super Admin';
      toast.success(`Welcome back, ${adminName}! You are logged in as ${adminName}.`, { id: 'sa-welcome-toast', icon: '👤', duration: 4500 });
      sessionStorage.setItem(`sa_welcome_shown_${auth.currentUser?.uid || email.toLowerCase()}`, 'true');
    } catch (err: any) {
      console.error('Super Admin sign in error:', err);
      let msg = 'Authentication failed. Please verify your credentials.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err?.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again later.';
      } else if (err?.message && !err.message.includes('Firebase:')) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setTenantRedirectInfo(null);
    setLoading(true);
    try {
      await signIn();
      const currentEmail = auth.currentUser?.email || '';
      if (currentEmail) {
        const check = await checkSuperAdminAccess(currentEmail);
        if (!check.isAuthorizedSuperAdmin) {
          await signOut(auth);
          if (check.isRestaurantTenant) {
            setTenantRedirectInfo({ isTenant: true, restaurantName: check.restaurantName });
            setError(
              `Access Denied: The Google account "${currentEmail}" is associated with the restaurant tenant "${check.restaurantName || 'Restaurant Account'}". Restaurant tenant accounts cannot access the Super Admin area. Please log in at your restaurant portal.`
            );
          } else {
            setTenantRedirectInfo(null);
            setError(
              `Access Denied: The Google account "${currentEmail}" is not authorized. Only administrators added through the Super Admin panel can log in to the Super Admin area.`
            );
          }
          return;
        }
      }
      // On success, Firebase Auth updates state, and SuperAdminRoute handles authorization
      const adminName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Super Admin';
      toast.success(`Welcome back, ${adminName}! You are logged in as ${adminName}.`, { id: 'sa-welcome-toast', icon: '👤', duration: 4500 });
      sessionStorage.setItem(`sa_welcome_shown_${auth.currentUser?.uid || auth.currentUser?.email?.toLowerCase()}`, 'true');
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in could not be completed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your administrator email address.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
    } finally {
      setResetLoading(false);
    }
  };

  const handleAcceptWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setError(null);
    setIsSettingPassword(true);
    try {
      const targetEmail = (invitedEmail || email).trim();
      try {
        await createUserWithEmailAndPassword(auth, targetEmail, newPassword);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          await signInWithEmail(targetEmail, newPassword);
        } else {
          throw authErr;
        }
      }
      toast.success('Invitation accepted! Welcome to DineMaster Pro Super Admin.');
    } catch (err: any) {
      console.error('Error accepting invitation with password:', err);
      let msg = err?.message || 'Failed to set password and accept invitation.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'This email account is already registered. Please sign in with your password below.';
        setShowInvitePasswordForm(false);
      }
      setError(msg);
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitedEmail) return;
    setIsDeclining(true);
    setError(null);
    try {
      await declineSuperAdminInvitation(invitedEmail, inviteId || undefined);
      setIsDeclined(true);
      setShowDeclineConfirm(false);
      toast.success('Invitation declined.');
    } catch (err: any) {
      console.error('Error declining invitation:', err);
      setError(err?.message || 'Failed to decline invitation.');
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Background Subtle Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl -mt-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 mb-4 border border-amber-300/40">
            {APP_CONFIG.appName.charAt(0)}
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {APP_CONFIG.appName}
            </h1>
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Super Admin
            </span>
          </div>

          <p className="text-sm text-slate-400">
            Sign in to manage the DineMaster Pro platform.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {isDeclined ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
                <XCircle size={32} className="text-rose-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Invitation Declined</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
                You have declined the Super Administrator invitation for{' '}
                <strong className="text-white font-mono">{invitedEmail}</strong>. You will not have access to the Super Admin area.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsDeclined(false);
                  setInvitedEmail(null);
                  navigate('/');
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Return to Home Page
              </button>
            </div>
          ) : (
            <>
              {invitedEmail && (
                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border border-amber-500/30 text-amber-300 text-xs shadow-lg animate-fade-in">
                  <div className="flex items-start gap-3 mb-3.5">
                    <Crown size={20} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm text-white block">Super Administrator Invitation</span>
                      <span className="text-slate-300 text-xs">
                        You have been invited to join DineMaster Pro administration as{' '}
                        <strong className="font-mono text-amber-300">{invitedEmail}</strong>.
                      </span>
                    </div>
                  </div>

                  {/* Decision Action Buttons (Say YES or NO) */}
                  <div className="space-y-2.5 pt-3 border-t border-amber-500/20">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Choose your response:
                    </div>

                    {/* YES Option 1: One-click Google Sign-in */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleSignIn}
                      className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
                    >
                      <Check size={15} />
                      <span>Accept &amp; Continue with Google</span>
                    </button>

                    {/* YES Option 2: Set Password */}
                    {!showInvitePasswordForm ? (
                      <button
                        type="button"
                        onClick={() => setShowInvitePasswordForm(true)}
                        className="w-full py-2.5 px-3.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <KeyRound size={14} />
                        <span>Accept &amp; Set a Password</span>
                      </button>
                    ) : (
                      <form onSubmit={handleAcceptWithPassword} className="p-3 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-2.5 mt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <span>Set Your Admin Password</span>
                          <button
                            type="button"
                            onClick={() => setShowInvitePasswordForm(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Create a password (min 6 chars)"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="text-[11px] text-slate-400 hover:text-slate-200"
                          >
                            {showNewPassword ? 'Hide password' : 'Show password'}
                          </button>

                          <button
                            type="submit"
                            disabled={isSettingPassword}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isSettingPassword ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            <span>{isSettingPassword ? 'Creating...' : 'Accept & Enter'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* NO Option: Decline Invitation */}
                    {!showDeclineConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeclineConfirm(true)}
                        className="w-full py-2 px-3 text-slate-400 hover:text-rose-400 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>Decline Invitation (Say No)</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 mt-2">
                        <p className="text-xs text-rose-300 leading-snug">
                          Are you sure you want to decline this invitation? You will not become a Super Administrator.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDeclineConfirm(false)}
                            className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isDeclining}
                            onClick={handleDeclineInvitation}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isDeclining ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                            <span>{isDeclining ? 'Declining...' : 'Yes, Decline'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

          {error && (
            <div className="mb-6 space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>

              {tenantRedirectInfo?.isTenant && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Store size={15} className="text-amber-400 shrink-0" />
                    <span>Restaurant tenant account detected</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Go to Restaurant Login
                  </button>
                </div>
              )}
            </div>
          )}

          {!isForgotMode ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="superadmin@dinemasterpro.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        setResetEmail(email);
                        setError(null);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="shrink mx-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
                  or
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800/80 active:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
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
                <span>Continue with Google</span>
              </button>
            </>
          ) : (
            /* Forgot Password Form */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-white font-semibold text-base">
                <Shield size={18} className="text-amber-400" />
                <span>Reset Administrator Password</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your Super Admin email address. We will send a secure password reset link to your inbox.
              </p>

              {resetSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <span className="font-semibold block mb-0.5">Reset Link Sent</span>
                    Check your email inbox for instructions to reset your administrator credentials.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="superadmin@dinemasterpro.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resetLoading ? 'Sending...' : 'Send Password Reset Link'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false);
                  setResetSuccess(false);
                  setError(null);
                }}
                className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer text-center block"
              >
                Back to Sign In
              </button>
            </div>
          )}
            </>
          )}
        </div>

        {/* Security Notice Footer */}
        <div className="mt-8 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Shield size={13} className="text-slate-500" />
          <span>Restricted administrative access. All actions are logged and audited.</span>
        </div>
      </div>
    </div>
  );
};
