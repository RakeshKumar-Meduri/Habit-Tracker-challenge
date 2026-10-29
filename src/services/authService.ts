import type { User, AuthSession, LoginResult } from '../types';
import { STORAGE_KEYS } from '../utils/storage';
import bcrypt from 'bcryptjs';

const LEGACY_SALT = '_PULSE_SALT_2026';

// Rate Limiting Config: 5 failures within 60 seconds -> Lockout for 60 seconds
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

interface FailedAttemptTracker {
  count: number;
  lockoutUntil: number | null;
}

const failedAttemptsMap: Record<string, FailedAttemptTracker> = {};

/**
 * SHA-256 Hashing helper using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password.trim(), salt);
}

/**
 * Verify plaintext password against stored hash.
 * Supports modern bcrypt hashes with fallback to legacy SHA-256 hashes.
 */
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  if (!inputPassword || !storedHash) return false;
  const cleanPass = inputPassword.trim();

  // Modern bcrypt hash ($2a$, $2b$, $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(cleanPass, storedHash);
    } catch {
      return false;
    }
  }

  // Legacy SHA-256 with static salt
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanPass + LEGACY_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const legacyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  if (legacyHash === storedHash) {
    return true;
  }

  // Legacy SHA-256 without salt
  const plainData = encoder.encode(cleanPass);
  const plainBuffer = await crypto.subtle.digest('SHA-256', plainData);
  const plainArray = Array.from(new Uint8Array(plainBuffer));
  const plainHash = plainArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return plainHash === storedHash;
}

/**
 * Rate limit checker for login requests
 */
export function checkRateLimit(username: string): { isLockedOut: boolean; remainingSeconds: number } {
  const normalizedKey = username.trim().toLowerCase();
  const record = failedAttemptsMap[normalizedKey];

  if (!record || !record.lockoutUntil) {
    return { isLockedOut: false, remainingSeconds: 0 };
  }

  const now = Date.now();
  if (now < record.lockoutUntil) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { isLockedOut: true, remainingSeconds };
  }

  // Lockout expired, reset tracker
  failedAttemptsMap[normalizedKey] = { count: 0, lockoutUntil: null };
  return { isLockedOut: false, remainingSeconds: 0 };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(username: string): { isLockedOut: boolean; remainingSeconds: number; attemptsLeft: number } {
  const normalizedKey = username.trim().toLowerCase();
  const now = Date.now();

  if (!failedAttemptsMap[normalizedKey]) {
    failedAttemptsMap[normalizedKey] = { count: 0, lockoutUntil: null };
  }

  const tracker = failedAttemptsMap[normalizedKey];
  tracker.count += 1;

  if (tracker.count >= MAX_FAILED_ATTEMPTS) {
    tracker.lockoutUntil = now + LOCKOUT_DURATION_MS;
    const remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return { isLockedOut: true, remainingSeconds, attemptsLeft: 0 };
  }

  return {
    isLockedOut: false,
    remainingSeconds: 0,
    attemptsLeft: MAX_FAILED_ATTEMPTS - tracker.count,
  };
}

/**
 * Reset failed attempt counter on successful login
 */
export function clearFailedLogin(username: string) {
  const normalizedKey = username.trim().toLowerCase();
  delete failedAttemptsMap[normalizedKey];
}

/**
 * Check if a username already exists (case-insensitive, trims & strips leading @)
 */
export function checkUsernameExists(users: User[], username: string): boolean {
  const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();
  return users.some(u => u && u.is_active !== false && u.username.trim().replace(/^@+/, '').toLowerCase() === cleanUsername);
}

/**
 * Credentials provider authorize() function
 * Performs user lookup, active status check, rate limiting, and password verification
 */
export async function authorizeCredentials(
  users: User[],
  identifier: string, // username or display name
  passwordInput: string
): Promise<LoginResult> {
  const rawInput = identifier.trim();
  const searchKey = rawInput.replace(/^@+/, '').toLowerCase();

  // 1. Check Rate Limiter
  const rateLimitStatus = checkRateLimit(searchKey);
  if (rateLimitStatus.isLockedOut) {
    return {
      success: false,
      error: `Too many failed login attempts. Server lockout active for ${rateLimitStatus.remainingSeconds}s.`,
      isLockout: true,
      lockoutSeconds: rateLimitStatus.remainingSeconds,
    };
  }

  // Ensure newly registered users on this device are always available even if React props are stale
  let storedUsers: User[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) storedUsers = JSON.parse(raw);
  } catch {}

  const allCandidateUsers = [...users];
  storedUsers.forEach(su => {
    if (!allCandidateUsers.some(u => u.id === su.id)) {
      allCandidateUsers.push(su);
    }
  });

  // 2. User Lookup (by username with or without '@', display name, or exact ID)
  const targetUser = allCandidateUsers.find(
    u => u.username.trim().replace(/^@+/, '').toLowerCase() === searchKey ||
         u.name.trim().toLowerCase() === searchKey ||
         u.id === searchKey ||
         u.username.trim().toLowerCase() === rawInput.toLowerCase()
  );

  if (!targetUser) {
    const failedInfo = recordFailedLogin(searchKey);
    if (failedInfo.isLockedOut) {
      return {
        success: false,
        error: `Too many failed attempts! Account locked for 60 seconds.`,
        isLockout: true,
        lockoutSeconds: failedInfo.remainingSeconds,
      };
    }
    return {
      success: false,
      error: `Invalid credentials. (${failedInfo.attemptsLeft} attempts remaining before server lockout)`,
    };
  }

  // 3. Active Status Check (Soft Delete Enforcement)
  if (targetUser.is_active === false) {
    return {
      success: false,
      error: `Account '${targetUser.name}' is deactivated.`,
    };
  }

  // 4. Password Verification (tests both exact password and trimmed password for mobile keyboard autocorrect tolerance)
  if (!targetUser.password_hash) {
    return {
      success: false,
      error: 'Credentials not cached locally. Please log in with an active server connection.',
    };
  }

  let isMatch = await verifyPassword(passwordInput, targetUser.password_hash);
  if (!isMatch && passwordInput.trim() !== passwordInput) {
    isMatch = await verifyPassword(passwordInput.trim(), targetUser.password_hash);
  }

  if (!isMatch) {
    const failedInfo = recordFailedLogin(searchKey);
    if (failedInfo.isLockedOut) {
      return {
        success: false,
        error: `Too many failed attempts! Account locked for 60 seconds.`,
        isLockout: true,
        lockoutSeconds: failedInfo.remainingSeconds,
      };
    }
    return {
      success: false,
      error: `Incorrect password. (${failedInfo.attemptsLeft} attempts remaining before server lockout)`,
    };
  }

  // Clear failed rate limit state on success
  clearFailedLogin(searchKey);

  // 5. Create 30-Day Session JWT Token
  const session = createAuthSession(targetUser);

  return {
    success: true,
    user: targetUser,
    session,
    mustChangePassword: !!targetUser.must_change_password,
  };
}

/**
 * Generate and store an AuthSession for a given User
 */
export function createAuthSession(user: User, serverToken?: string): AuthSession {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sessionToken = serverToken || `jwt_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const session: AuthSession = {
    user_id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    token: sessionToken,
    expires_at: expiresAt,
  };

  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
  } catch (e) {
    console.error('Failed to store auth session:', e);
  }

  return session;
}

/**
 * Register a brand new user, hash password, generate session, and save directly to storage
 */
export async function registerNewUser(
  existingUsers: User[],
  userData: {
    fullName: string;
    username: string;
    passwordPlain: string;
    height?: number;
    weight?: number;
    age?: number;
    gender?: 'male' | 'female' | 'other' | '';
  }
): Promise<{ success: boolean; error?: string; user?: User; session?: AuthSession }> {
  const cleanUsername = userData.username.trim().replace(/^@+/, '').toLowerCase();
  const cleanName = userData.fullName.trim() || cleanUsername;
  const cleanPassword = userData.passwordPlain.trim();

  if (!cleanUsername) {
    return { success: false, error: 'Please enter a username.' };
  }
  if (cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  if (!/[A-Z]/.test(cleanPassword)) {
    return { success: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[^A-Za-z0-9]/.test(cleanPassword)) {
    return { success: false, error: 'Password must contain at least one special character.' };
  }
  if (cleanPassword.toLowerCase() === cleanUsername) {
    return { success: false, error: 'Password cannot match your username.' };
  }

  // Cross check with in-memory users
  if (checkUsernameExists(existingUsers, cleanUsername)) {
    return { success: false, error: `Username '@${cleanUsername}' is already taken. Please choose another.` };
  }

  const hashed = await hashPassword(cleanPassword);

  const gradients = [
    'from-[#D98B4A] to-[#B45F1E]',
    'from-emerald-500 to-teal-700',
    'from-violet-500 to-purple-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-blue-700',
    'from-rose-500 to-pink-700'
  ];
  const avatarColor = gradients[Math.floor(Math.random() * gradients.length)];

  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    username: cleanUsername,
    password_hash: hashed,
    role: 'member',
    height: Number(userData.height) || 175,
    weight_current: Number(userData.weight) || 70,
    age: Number(userData.age) || 25,
    gender: userData.gender || 'male',
    is_private: false,
    avatar_color: avatarColor,
    created_at: new Date().toISOString().split('T')[0],
    is_active: true,
    must_change_password: false,
  };

  return {
    success: true,
    user: newUser,
  };
}

/**
 * Handle Forced Password Change
 */
export async function changeUserPassword(
  user: User,
  newPasswordPlain: string
): Promise<{ success: boolean; error?: string; updatedUser?: User }> {
  if (!newPasswordPlain || newPasswordPlain.trim().length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  const cleanPass = newPasswordPlain.trim();
  if (!/[A-Z]/.test(cleanPass)) {
    return { success: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[^A-Za-z0-9]/.test(cleanPass)) {
    return { success: false, error: 'Password must contain at least one special character.' };
  }
  if (cleanPass.toLowerCase() === user.username.toLowerCase()) {
    return { success: false, error: 'Password cannot match your username.' };
  }

  const newHash = await hashPassword(newPasswordPlain.trim());
  const updatedUser: User = {
    ...user,
    password_hash: newHash,
    must_change_password: false,
  };

  return { success: true, updatedUser };
}

/**
 * Clear Auth Session (Sign Out)
 */
export function logoutSession() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  localStorage.removeItem('pulse_fitness_current_group');
  localStorage.removeItem('pulse_invite_token');
  sessionStorage.removeItem('pulse_invite_token');
  sessionStorage.removeItem('pulse_fitness_current_group');
  localStorage.removeItem(STORAGE_KEYS.DAILY_LOGS);
  localStorage.removeItem(STORAGE_KEYS.WORKOUTS);
  localStorage.removeItem(STORAGE_KEYS.WEIGHT_LOGS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_HABITS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_HABIT_LOGS);
  localStorage.removeItem(STORAGE_KEYS.SUPPLEMENTS);
  localStorage.removeItem(STORAGE_KEYS.SUPPLEMENT_LOGS);
  localStorage.removeItem('pulse_fitness_deleted_workout_ids');
}
