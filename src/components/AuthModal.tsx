import React, { useState, useEffect } from 'react';
import type { User, Gender, InvitePreview } from '../types';
import { authorizeCredentials, createAuthSession } from '../services/authService';
import { loginUserOnServer, registerUserOnServer, redeemInvite } from '../services/apiService';
import { Lock, User as UserIcon, X, Clock, AlertTriangle, Scale, Ruler, Calendar, Ticket } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (newUser: User) => void;
  isMandatory?: boolean;
  initialMode?: 'login' | 'register';
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
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
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
  const [regPassword, setRegPassword] = useState('');
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(70);
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<Gender>('male');

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
    const cleanPassword = regPassword.trim();

    if (!cleanUsername) {
      setError('Please enter a username.');
      return;
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inviteToken = sessionStorage.getItem('pulse_invite_token') || undefined;

      // Persist to server with whitelist fields
      const serverRes = await registerUserOnServer({
        name: fullName.trim() || cleanUsername,
        username: cleanUsername,
        passwordPlain: cleanPassword,
        height,
        weight,
        age,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-xl p-5 sm:p-8 shadow-2xl my-4 sm:my-8">
        
        {/* Close button only shown if not mandatory screen */}
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#F4F4F5] p-1.5 rounded-lg hover:bg-[#1B1B20] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-5 sm:mb-6">
          <img 
            src="/logo.png" 
            alt="PULSE" 
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl object-cover shadow-xl shadow-cyan-500/10 border border-white/10" 
          />
          <h3 className="text-xl sm:text-2xl font-black text-[#F4F4F5]">
            {mode === 'login' ? 'Sign In to PULSE' : 'Create Account'}
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
            {mode === 'login'
              ? 'Enter your credentials to access your fitness tracker.'
              : 'Sign up to log your workouts, track habits, and view analytics.'}
          </p>
        </div>

        {/* Invite Preview Banner */}
        {invitePreview && invitePreview.valid && (
          <div className="mb-4 p-3 bg-[#D98B4A]/10 border border-[#D98B4A]/30 rounded-xl text-xs text-[#F4F4F5] flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-[#D98B4A] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#D98B4A] truncate">
                {invitePreview.inviterName} invited you to {invitePreview.groupName}
              </p>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                {invitePreview.memberCount} member{invitePreview.memberCount === 1 ? '' : 's'} in this group
              </p>
            </div>
          </div>
        )}

        {/* Lockout Warning Banner */}
        {lockoutTimer > 0 && (
          <div className="mb-4 p-3 bg-[#D98B4A]/10 border border-[#D98B4A]/30 rounded-xl text-xs text-[#E69A5C] flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Server Lockout Active: Retry allowed in <strong>{lockoutTimer}s</strong></span>
          </div>
        )}

        {error && lockoutTimer === 0 && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your username"
                  disabled={lockoutTimer > 0}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={lockoutTimer > 0}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A] disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || lockoutTimer > 0}
              className="w-full py-3 bg-gradient-to-r from-[#D98B4A] to-[#D98B4A] hover:from-[#D98B4A] hover:to-[#B45F1E] text-[#1B1B20] font-black rounded-xl text-sm transition shadow-lg shadow-[#D98B4A]/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Signing in...' : (lockoutTimer > 0 ? `Locked Out (${lockoutTimer}s)` : 'Sign In')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#D98B4A] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-3 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Choose unique username (e.g. johndoe)"
                  className="w-full pl-10 pr-3 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                  required
                />
              </div>
            </div>

            {/* Profile Metrics (Height, Weight, Age, Gender) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">Height (cm)</label>
                <div className="relative">
                  <Ruler className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min="100"
                    max="250"
                    className="w-full pl-8 pr-2 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-xs focus:outline-none focus:border-[#D98B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">Weight (kg)</label>
                <div className="relative">
                  <Scale className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min="30"
                    max="300"
                    className="w-full pl-8 pr-2 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-xs focus:outline-none focus:border-[#D98B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">Age</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min="10"
                    max="100"
                    className="w-full pl-8 pr-2 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-xs focus:outline-none focus:border-[#D98B4A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-2 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-xs focus:outline-none focus:border-[#D98B4A]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-[#A1A1AA] text-center my-2">
              Have an invite link? Opening an invite link joins that private group automatically.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 min-h-[44px] mt-2 bg-gradient-to-r from-[#D98B4A] to-[#D98B4A] hover:from-[#D98B4A] hover:to-[#B45F1E] text-[#1B1B20] font-black rounded-xl text-sm transition shadow-lg shadow-[#D98B4A]/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="mt-5 text-center pt-3 border-t border-[#26262C]/60">
          <button
            onClick={() => {
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="text-xs text-[#E69A5C] hover:underline font-semibold cursor-pointer"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

