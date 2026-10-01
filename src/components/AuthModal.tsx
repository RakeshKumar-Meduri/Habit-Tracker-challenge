import React, { useState, useEffect } from 'react';
import type { User, Gender } from '../types';
import { authorizeCredentials, registerNewUser, createAuthSession } from '../services/authService';
import { loginUserOnServer, registerUserOnServer } from '../services/apiService';
import { ShieldCheck, Lock, User as UserIcon, X, Clock, AlertTriangle, UserPlus, Scale, Ruler, Calendar } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (newUser: User) => void;
  isMandatory?: boolean;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onLoginSuccess,
  onRegisterSuccess,
  isMandatory = false,
  initialMode = 'login',
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
      // 1. Check local credentials cache
      const localResult = await authorizeCredentials(users, usernameInput, password);
      if (localResult.success && localResult.user) {
        onLoginSuccess(localResult.user);
        onClose();
        return;
      }

      // 2. Check directly against backend server (cross-device user authentication)
      const serverResult = await loginUserOnServer(usernameInput, password);
      if (serverResult.success && serverResult.user) {
        createAuthSession(serverResult.user);
        onLoginSuccess(serverResult.user);
        onClose();
        return;
      }

      setError(localResult.error || serverResult.error || 'Authentication failed. Please verify your username and password.');
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

    setIsSubmitting(true);
    try {
      const regResult = await registerNewUser(users, {
        fullName,
        username: regUsername,
        passwordPlain: regPassword,
        height,
        weight,
        age,
        gender,
      });

      if (!regResult.success || !regResult.user) {
        setError(regResult.error || 'Registration failed. Please check your inputs.');
        return;
      }

      // Synchronize with backend server (non-blocking for network errors)
      const serverRes = await registerUserOnServer(regResult.user);
      if (!serverRes.success && serverRes.error && !serverRes.error.toLowerCase().includes('network') && !serverRes.error.toLowerCase().includes('connect')) {
        setError(serverRes.error);
        return;
      }

      onRegisterSuccess(regResult.user);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-5 sm:p-8 shadow-2xl my-4 sm:my-8">
        
        {/* Close button only shown if not mandatory screen */}
        {!isMandatory && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#c5b4a5] hover:text-[#f5efe6] p-1.5 rounded-lg hover:bg-[#322a24] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-5 sm:mb-6">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#c68b59] via-[#b87b4b] to-[#d4a373] flex items-center justify-center shadow-lg shadow-[#c68b59]/30">
            {mode === 'login' ? (
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#1c1815]" />
            ) : (
              <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-[#1c1815]" />
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#f5efe6]">
            {mode === 'login' ? 'Sign In to PULSE' : 'Create Account'}
          </h3>
          <p className="text-xs text-[#c5b4a5] mt-1.5 leading-relaxed">
            {mode === 'login'
              ? 'Enter your credentials to access your fitness tracker.'
              : 'Sign up to log your workouts, track habits, and view analytics.'}
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutTimer > 0 && (
          <div className="mb-4 p-3 bg-[#c68b59]/10 border border-[#c68b59]/30 rounded-xl text-xs text-[#d4a373] flex items-center gap-2">
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
              <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#c5b4a5] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your username"
                  disabled={lockoutTimer > 0}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#c5b4a5] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={lockoutTimer > 0}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59] disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || lockoutTimer > 0}
              className="w-full py-3 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-sm transition shadow-lg shadow-[#c68b59]/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Signing in...' : (lockoutTimer > 0 ? `Locked Out (${lockoutTimer}s)` : 'Sign In')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#c68b59] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#c5b4a5] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Choose unique username (e.g. johndoe)"
                  className="w-full pl-10 pr-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#c5b4a5] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                  required
                />
              </div>
            </div>

            {/* Profile Metrics (Height, Weight, Age, Gender) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1">Height (cm)</label>
                <div className="relative">
                  <Ruler className="w-3.5 h-3.5 text-[#c5b4a5] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    min="100"
                    max="250"
                    className="w-full pl-8 pr-2 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1">Weight (kg)</label>
                <div className="relative">
                  <Scale className="w-3.5 h-3.5 text-[#c5b4a5] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min="30"
                    max="300"
                    className="w-full pl-8 pr-2 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1">Age</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#c5b4a5] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min="10"
                    max="100"
                    className="w-full pl-8 pr-2 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-2 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 min-h-[44px] mt-3 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-sm transition shadow-lg shadow-[#c68b59]/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="mt-5 text-center pt-3 border-t border-[#3d322a]/60">
          <button
            onClick={() => {
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="text-xs text-[#d4a373] hover:underline font-semibold cursor-pointer"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already registered? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

