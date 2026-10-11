import React, { useState, useEffect } from 'react';
import type { User, Gender, InvitePreview } from '../types';
import { authorizeCredentials, createAuthSession } from '../services/authService';
import { loginUserOnServer, registerUserOnServer, redeemInvite, requestPasswordReset } from '../services/apiService';
import { Lock, User as UserIcon, X, Clock, AlertTriangle, Scale, Ruler, Calendar, Ticket, Mail, ArrowLeft } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (newUser: User) => void;
  isMandatory?: boolean;
  initialMode?: 'login' | 'register' | 'forgot';
  invitePreview?: InvitePreview | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  onRegisterSuccess,
  isMandatory = false,
  initialMode = 'login',
  invitePreview,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);

  if (initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
  }

  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTimer]);

  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!usernameInput.trim()) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Authenticate with backend server FIRST (primary source of truth)
      const serverResult = await loginUserOnServer(usernameInput, password);
      if (serverResult.success && serverResult.user) {
        createAuthSession(serverResult.user, serverResult.token);

        // If an invite token was saved in sessionStorage, redeem it after login
        const storedInvite = sessionStorage.getItem('pulse_invite_token');
        if (storedInvite) {
          const redeemRes = await redeemInvite(storedInvite);
          if (!redeemRes.success && redeemRes.error) {
            console.warn('[Invite Redeem Notice]', redeemRes.error);
          }
          sessionStorage.removeItem('pulse_invite_token');
        }

        onLoginSuccess(serverResult.user);
        onClose();
        return;
      }

      // If server returned a definitive authentication failure
      const isNetworkError = serverResult.error && (
        serverResult.error.toLowerCase().includes('connect') ||
        serverResult.error.toLowerCase().includes('network') ||
        serverResult.error.toLowerCase().includes('failed to fetch') ||
        serverResult.error.toLowerCase().includes('offline')
      );

      if (!isNetworkError && serverResult.error) {
        setError(serverResult.error);
        return;
      }

      // 2. Offline fallback ONLY if server is completely unreachable
      const localResult = await authorizeCredentials(users, usernameInput, password);
      if (localResult.success && localResult.user) {
        onLoginSuccess(localResult.user);
        onClose();
        return;
      }

      setError(serverResult.error || localResult.error || 'Authentication failed. Please verify your username and password.');
      if (localResult.isLockout && localResult.lockoutSeconds) {
        setLockoutTimer(localResult.lockoutSeconds);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = regUsername.trim().replace(/^@+/, '').toLowerCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPassword = regPassword.trim();

    if (!cleanUsername) {
      setError('Please enter a username.');
      return;
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!/[A-Z]/.test(cleanPassword)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(cleanPassword)) {
      setError('Password must contain at least one special character (e.g. !@#$%^&*).');
      return;
    }
    if (cleanPassword.toLowerCase() === cleanUsername) {
      setError('Password cannot match your username.');
      return;
    }

    const parsedHeight = height.trim() ? Number(height) : undefined;
    const parsedWeight = weight.trim() ? Number(weight) : undefined;
    const parsedAge = age.trim() ? Number(age) : undefined;

    if (parsedHeight !== undefined && (isNaN(parsedHeight) || parsedHeight < 50 || parsedHeight > 300)) {
      setError('Please enter a valid height between 50 and 300 cm.');
      return;
    }
    if (parsedWeight !== undefined && (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 500)) {
      setError('Please enter a valid weight between 20 and 500 kg.');
      return;
    }
    if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120)) {
      setError('Please enter a valid age between 10 and 120.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteToken = sessionStorage.getItem('pulse_invite_token') || undefined;

      // Persist to server with whitelist fields
      const serverRes = await registerUserOnServer({
        name: fullName.trim() || cleanUsername,
        username: cleanUsername,
        email: cleanEmail,
        passwordPlain: cleanPassword,
        height: parsedHeight,
        weight: parsedWeight,
        age: parsedAge,
        gender,
        inviteToken,
      });

      if (!serverRes.success || !serverRes.user) {
        setError(serverRes.error || 'Server registration failed. Please try again.');
        return;
      }

      // Server confirmed registration: create session with server token and complete login
      createAuthSession(serverRes.user, serverRes.token);
      sessionStorage.removeItem('pulse_invite_token');
      onRegisterSuccess(serverRes.user);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim().toLowerCase());
      setForgotSuccess(true);
      setForgotSuccessMessage(res.message);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-8 shadow-2xl my-4 sm:my-8 text-zinc-900 dark:text-zinc-100">
        
        {/* Close button only shown if not mandatory screen */}
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-5 sm:mb-6">
          <img 
            src="/logo.png" 
            alt="PULSE" 
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-800" 
          />
          <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50">
            {mode === 'login' && 'Sign In to PULSE'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            {mode === 'login' && 'Enter your credentials to access your fitness tracker.'}
            {mode === 'register' && 'Sign up to log your workouts, track habits, and view analytics.'}
            {mode === 'forgot' && 'Enter your account email to receive a secure recovery link.'}
          </p>
        </div>

        {/* Invite Preview Banner */}
        {invitePreview && invitePreview.valid && (
          <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-zinc-800 dark:text-zinc-200 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {invitePreview.inviterName} invited you to {invitePreview.groupName}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {invitePreview.memberCount} member{invitePreview.memberCount === 1 ? '' : 's'} in this group
              </p>
            </div>
          </div>
        )}

        {/* Lockout Warning Banner */}
        {lockoutTimer > 0 && (
          <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 animate-pulse text-zinc-800 dark:text-zinc-200" />
            <span>Server Lockout Active: Retry allowed in <strong>{lockoutTimer}s</strong></span>
          </div>
        )}

        {error && lockoutTimer === 0 && (
          <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-800 dark:text-zinc-200" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'forgot' ? (
          <div>
            {forgotSuccess ? (
              <div className="space-y-4 text-center py-2 animate-fadeIn">
                <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl flex items-center justify-center mx-auto text-zinc-900 dark:text-zinc-100">
                  <Mail className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Check Your Inbox</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    {forgotSuccessMessage || "If an account matches that email, we'll send a password-reset link."}
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-left text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">Next Steps:</p>
                  <p>• Click the link in your email to choose a new password.</p>
                  <p>• The reset link is single-use and expires in <strong>1 hour</strong>.</p>
                  <p>• Be sure to check your spam/junk folder if it doesn't appear in a minute.</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting || resendCooldown > 0}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-xl text-xs transition border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                      ? 'Sending...'
                      : resendCooldown > 0
                      ? `Resend link in ${resendCooldown}s`
                      : 'Resend Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setForgotSuccess(false);
                      setMode('login');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 text-xs text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email address"
                      className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    If an account matches this email, we'll send a secure password reset link valid for 1 hour.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 min-h-[46px] bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2 border border-transparent"
                >
                  {isSubmitting ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMode('login');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your username"
                  disabled={lockoutTimer > 0}
                  className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotSuccess(false);
                    setMode('forgot');
                  }}
                  className="text-xs text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 font-semibold cursor-pointer transition underline underline-offset-2"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={lockoutTimer > 0}
                  className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || lockoutTimer > 0}
              className="w-full py-3 min-h-[46px] bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2 border border-transparent"
            >
              {isSubmitting ? 'Signing in...' : (lockoutTimer > 0 ? `Locked Out (${lockoutTimer}s)` : 'Sign In')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Choose unique username (e.g. johndoe)"
                  className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. athlete@example.com"
                  className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Required for verification, paid upgrades, and receipt delivery.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 chars, 1 uppercase, 1 special char"
                  className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                Min 6 chars, at least 1 uppercase & 1 special symbol, cannot match username.
              </p>
            </div>

            {/* Profile Metrics (Height, Weight, Age, Gender) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Height (cm)</label>
                <div className="relative">
                  <Ruler className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 175"
                    min="50"
                    max="300"
                    className="w-full pl-8 pr-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Weight (kg)</label>
                <div className="relative">
                  <Scale className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 70"
                    min="20"
                    max="500"
                    className="w-full pl-8 pr-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Age</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 25"
                    min="10"
                    max="120"
                    className="w-full pl-8 pr-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-2 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center my-2">
              Have an invite link? Opening an invite link joins that private group automatically.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 min-h-[46px] mt-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center border border-transparent"
            >
              {isSubmitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {mode !== 'forgot' && (
          <div className="mt-5 text-center pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                setError('');
                setMode(mode === 'login' ? 'register' : 'login');
              }}
              className="text-xs text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:underline font-semibold cursor-pointer underline underline-offset-2"
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Sign In'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

