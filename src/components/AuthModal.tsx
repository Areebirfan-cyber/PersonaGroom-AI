import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  Check,
  ShieldCheck,
  Database,
  Sparkles,
  Mail,
  Lock,
  UserPlus,
  ArrowRight,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isCompulsory?: boolean;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, isCompulsory = false }) => {
  const {
    user,
    guestUser,
    currentUser,
    isAuthenticated,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'guest'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen && (!isCompulsory || isAuthenticated)) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setErrorMsg('Domain not yet authorized in Firebase Console. (Add domain in Firebase Console -> Auth -> Settings -> Authorized domains). Meanwhile, you can enter immediately via 1-Click Guest Mode or Email login!');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up window was blocked. Attempting redirect sign-in, or switch to 1-Click Guest Mode below.');
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup was closed before completing. You can try again or use 1-Click Guest Mode.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg('Google Sign-In is not enabled in Firebase Console. Please use 1-Click Guest Mode or Email sign in.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg('Network error. Please check your connection or continue via 1-Click Guest Mode.');
      } else {
        setErrorMsg(err.message || 'Google authentication encountered an issue. You can use 1-Click Guest Mode.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signUpWithEmail(email, password, displayName);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestSignIn = () => {
    signInAsGuest(guestName || 'Guest Stylist');
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-3xl backdrop-saturate-200 animate-in fade-in duration-300">
      <div className="relative flex w-full max-w-md flex-col rounded-3xl border border-white/20 bg-slate-950/80 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-3xl overflow-hidden [box-shadow:inset_0_1px_2px_0_rgba(255,255,255,0.35)]">
        {/* Top Glow Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-emerald-500 to-amber-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-emerald-500 text-white shadow-lg border border-white/20">
              <Sparkles size={20} className="text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>PersonaGroom AI</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Auth Gate
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pakistani Fashion Intelligence & Studio Vault
              </p>
            </div>
          </div>

          {/* Only allow closing if already authenticated or not compulsory */}
          {(!isCompulsory || isAuthenticated) && (
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {isAuthenticated ? (
            /* Authenticated Profile View */
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={currentUser?.displayName || 'User'}
                    className="h-12 w-12 rounded-full border-2 border-primary/60 object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600/30 to-emerald-600/30 text-purple-300 border border-white/20">
                    <UserIcon size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-white truncate">
                    {currentUser?.displayName || 'Fashion Stylist'}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mt-1">
                    <Check size={12} />
                    {user ? 'Synced with Firestore Cloud DB' : 'Guest Vault (Local State Active)'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>Encrypted session with XSS sanitization safeguards</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-purple-400 shrink-0" />
                  <span>3D Runway looks, Lookbook & Darzi slips auto-synced</span>
                </div>
                <div className="flex items-center gap-2">
                  <Fingerprint size={14} className="text-amber-400 shrink-0" />
                  <span>AI Stylist ratings memory & learning profile active</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 transition cursor-pointer"
                >
                  Enter Studio Workspace
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated Auth Tabs */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
                  className={`rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                    activeTab === 'signin'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('signup'); setErrorMsg(null); }}
                  className={`rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('guest'); setErrorMsg(null); }}
                  className={`rounded-lg py-1.5 font-semibold transition cursor-pointer ${
                    activeTab === 'guest'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Guest Mode
                </button>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs text-rose-300 leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Google 1-Click Fast Auth */}
              {activeTab !== 'guest' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white py-3 px-4 text-xs font-bold text-slate-900 shadow-xl hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>{isSubmitting ? 'Connecting...' : 'Continue with Google (1-Click)'}</span>
                  </button>

                  <div className="relative flex items-center justify-center text-[10px] uppercase font-bold text-slate-500">
                    <span className="w-full border-t border-white/10" />
                    <span className="bg-slate-950 px-3 text-slate-400 shrink-0">or with email</span>
                    <span className="w-full border-t border-white/10" />
                  </div>
                </>
              )}

              {/* Tab 1: Sign In Form */}
              {activeTab === 'signin' && (
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mail size={12} className="text-primary" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock size={12} className="text-primary" /> Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 transition cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <LogIn size={14} />
                    <span>{isSubmitting ? 'Signing In...' : 'Sign In to Workspace'}</span>
                  </button>
                </form>
              )}

              {/* Tab 2: Register Form */}
              {activeTab === 'signup' && (
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <UserIcon size={12} className="text-primary" /> Your Name / Title
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Areeb Irfan"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mail size={12} className="text-primary" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock size={12} className="text-primary" /> Create Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-2.5 text-xs font-bold text-white shadow-lg hover:opacity-90 transition cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <UserPlus size={14} />
                    <span>{isSubmitting ? 'Creating Profile...' : 'Register Studio Account'}</span>
                  </button>
                </form>
              )}

              {/* Tab 3: Guest Mode Option */}
              {activeTab === 'guest' && (
                <div className="space-y-3.5">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-200 leading-relaxed space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <ShieldCheck size={14} />
                      <span>Instant Access with Local Storage Vault</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Guest mode unlocks all 9 modules immediately without requiring email or password. Your 3D looks, ratings, and chat history are securely stored in your local browser storage.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Stylist Alias (Optional)
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Guest Connoisseur"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-bold text-white shadow-xl hover:opacity-90 transition cursor-pointer"
                  >
                    <span>Continue as Guest Stylist</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
