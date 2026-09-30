import type { 
  User, 
  DailyLog, 
  Workout, 
  WeightLog, 
  MissedReason, 
  Reaction, 
  Badge,
  Supplement,
  SupplementLog,
  CustomHabit,
  CustomHabitLog
} from '../types';

export interface ServerSyncResponse {
  users: User[];
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs: WeightLog[];
  missedReasons: MissedReason[];
  reactions: Reaction[];
  badges: Badge[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  customHabits: CustomHabit[];
  customHabitLogs: CustomHabitLog[];
}

/**
 * Check if backend API server is reachable
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch synchronized data from shared backend
 */
export async function fetchServerSync(): Promise<ServerSyncResponse | null> {
  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Push newly registered user to backend server
 */
export async function registerUserOnServer(user: User): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error || 'Server registration failed' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching server' };
  }
}

/**
 * Verify login credentials on backend server
 */
export async function loginUserOnServer(identifier: string, passwordPlain: string, passwordHash?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: passwordPlain, passwordHash }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Invalid credentials' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching server' };
  }
}

/**
 * Update user profile on backend server
 */
export async function updateUserOnServer(user: User): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push individual updated log to backend
 */
export async function pushDailyLogToServer(log: DailyLog): Promise<boolean> {
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push workouts to backend
 */
export async function pushWorkoutsToServer(workouts: Workout[]): Promise<boolean> {
  try {
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workouts),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push weight log to backend
 */
export async function pushWeightLogToServer(weightLog: WeightLog): Promise<boolean> {
  try {
    const res = await fetch('/api/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weightLog),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push missed reason to backend
 */
export async function pushMissedReasonToServer(reason: MissedReason): Promise<boolean> {
  try {
    const res = await fetch('/api/missed-reasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push reaction to backend
 */
export async function pushReactionToServer(reaction: Reaction): Promise<boolean> {
  try {
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reaction),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Push badges to backend
 */
export async function pushBadgesToServer(badges: Badge[]): Promise<boolean> {
  try {
    const res = await fetch('/api/badges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badges),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Supplement API
 */
export async function pushSupplementToServer(supplement: Supplement): Promise<boolean> {
  try {
    const res = await fetch('/api/supplements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplement),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSupplementOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/supplements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushSupplementLogToServer(log: SupplementLog): Promise<boolean> {
  try {
    const res = await fetch('/api/supplement-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Custom Habit API
 */
export async function pushCustomHabitToServer(habit: CustomHabit): Promise<boolean> {
  try {
    const res = await fetch('/api/custom-habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCustomHabitOnServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/custom-habits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushCustomHabitLogToServer(log: CustomHabitLog): Promise<boolean> {
  try {
    const res = await fetch('/api/custom-habit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Delete a user account from backend server
 */
export async function deleteUserOnServer(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Broadcast local state updates to backend server
 */
export async function pushStateToServer(payload: {
  users?: User[];
  dailyLogs?: DailyLog[];
  workouts?: Workout[];
  weightLogs?: WeightLog[];
  missedReasons?: MissedReason[];
  reactions?: Reaction[];
  badges?: Badge[];
  supplements?: Supplement[];
  supplementLogs?: SupplementLog[];
  customHabits?: CustomHabit[];
  customHabitLogs?: CustomHabitLog[];
}): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
