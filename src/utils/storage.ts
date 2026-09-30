import type { User, DailyLog, Workout, WeightLog, MissedReason, Reaction, Badge, WeeklyChallenge, AdminSettings } from '../types';

const STORAGE_KEYS = {
  USERS: 'pulse_fitness_users',
  CURRENT_USER_ID: 'pulse_fitness_current_user_id',
  DAILY_LOGS: 'pulse_fitness_daily_logs',
  WORKOUTS: 'pulse_fitness_workouts',
  WEIGHT_LOGS: 'pulse_fitness_weight_logs',
  MISSED_REASONS: 'pulse_fitness_missed_reasons',
  REACTIONS: 'pulse_fitness_reactions',
  BADGES: 'pulse_fitness_badges',
  CHALLENGE: 'pulse_fitness_challenge',
  THEME: 'pulse_fitness_theme',
  ADMIN_SETTINGS: 'pulse_fitness_admin_settings',
  AUTH_SESSION: 'pulse_fitness_auth_session',
  SUPPLEMENTS: 'pulse_fitness_supplements',
  SUPPLEMENT_LOGS: 'pulse_fitness_supplement_logs',
  CUSTOM_HABITS: 'pulse_fitness_custom_habits',
  CUSTOM_HABIT_LOGS: 'pulse_fitness_custom_habit_logs',
  WEIGHT_ANNOUNCEMENTS: 'pulse_fitness_weight_announcements',
};

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  step_target: 10000,
  sleep_min_hours: 7.0,
  sleep_max_hours: 9.0,
  water_target_ml: 2500,
  invite_code: 'PULSE2026',
  cheat_days_enabled: true,
  day_cutoff_hour: 0,
};

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateOffsetString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const memoryFallback = new Map<string, string>();

export function getStoredItemSafely<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key) || memoryFallback.get(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function initializeStorageIfEmpty(): {
  users: User[];
  currentUserId: string;
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs: WeightLog[];
  missedReasons: MissedReason[];
  reactions: Reaction[];
  badges: Badge[];
  challenge: WeeklyChallenge;
  adminSettings: AdminSettings;
} {
  let users: User[] = getStoredItemSafely<User[]>(STORAGE_KEYS.USERS, [])
    .filter(u => u.username !== 'testuser123' && u.id !== 'user_1790589874177_elgx')
    .map(u => ({
      ...u,
      username: u.username || u.name.toLowerCase().replace(/\s+/g, '_'),
      role: 'member' as const,
      is_active: u.is_active !== undefined ? u.is_active : true,
      must_change_password: u.must_change_password || false,
    }));

  // Resolve current logged in user STRICTLY from valid unexpired auth session
  let currentUserId = '';
  const sessionStr = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session && session.user_id) {
        const isExpired = session.expires_at && new Date(session.expires_at).getTime() < Date.now();
        if (!isExpired) {
          const exists = users.some(u => u.id === session.user_id && u.is_active !== false);
          if (exists) {
            currentUserId = session.user_id;
          }
        }
      }
    } catch {}
  }

  // If session is invalid or user was removed, clear auth storage completely
  if (!currentUserId) {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    } catch {}
  }

  const dailyLogs: DailyLog[] = getStoredItemSafely<DailyLog[]>(STORAGE_KEYS.DAILY_LOGS, []);
  const workouts: Workout[] = getStoredItemSafely<Workout[]>(STORAGE_KEYS.WORKOUTS, []);
  const weightLogs: WeightLog[] = getStoredItemSafely<WeightLog[]>(STORAGE_KEYS.WEIGHT_LOGS, []);
  const missedReasons: MissedReason[] = getStoredItemSafely<MissedReason[]>(STORAGE_KEYS.MISSED_REASONS, []);
  const reactions: Reaction[] = getStoredItemSafely<Reaction[]>(STORAGE_KEYS.REACTIONS, []);
  const badges: Badge[] = getStoredItemSafely<Badge[]>(STORAGE_KEYS.BADGES, []);
  const challengeRaw = getStoredItemSafely<WeeklyChallenge>(STORAGE_KEYS.CHALLENGE, createDefaultChallenge());
  const challenge: WeeklyChallenge = {
    ...challengeRaw,
    current_count: 0,
  };
  const adminSettings: AdminSettings = getStoredItemSafely<AdminSettings>(STORAGE_KEYS.ADMIN_SETTINGS, DEFAULT_ADMIN_SETTINGS);

  // If users were retrieved, ensure they stay persisted
  if (users.length > 0) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  if (currentUserId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }

  return {
    users,
    currentUserId,
    dailyLogs,
    workouts,
    weightLogs,
    missedReasons,
    reactions,
    badges,
    challenge,
    adminSettings,
  };
}

function createDefaultChallenge(): WeeklyChallenge {
  return {
    id: 'challenge_week_1',
    title: '🔥 Group 150-Goal Clean Sweep Challenge',
    description: 'Together as a group, complete 150 daily goals this week!',
    target_type: 'total_goals',
    target_count: 150,
    current_count: 0,
    start_date: getDateOffsetString(6),
    end_date: getDateOffsetString(-1),
  };
}

export function saveStateToStorage(key: string, data: any) {
  try {
    const serialized = JSON.stringify(data);
    memoryFallback.set(key, serialized);

    try {
      localStorage.setItem(key, serialized);
    } catch {
      // LocalStorage is full on this origin; store in sessionStorage without throwing
      try {
        sessionStorage.setItem(key, serialized);
      } catch {
        // Memory fallback holds it
      }
    }
  } catch (err) {
    console.error('Storage serialization error:', err);
  }
}

export function saveUserDirectly(newUser: User): User[] {
  const existingUsers: User[] = getStoredItemSafely<User[]>(STORAGE_KEYS.USERS, []);
  const updatedUsers = [...existingUsers.filter(u => u.id !== newUser.id), newUser];
  saveStateToStorage(STORAGE_KEYS.USERS, updatedUsers);
  return updatedUsers;
}

export { STORAGE_KEYS };
