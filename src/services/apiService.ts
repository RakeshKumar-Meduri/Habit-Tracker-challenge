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
  CustomHabitLog,
  Group,
  Invite,
  InvitePreview
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
  deletedWorkoutIds?: string[];
  group?: Group;
  myRole?: 'owner' | 'member';
  invites?: Invite[];
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Retrieve saved session token for authenticating API requests
 */
export function getStoredAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('pulse_fitness_auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token || null;
  } catch {
    return null;
  }
}

/**
 * Central API fetch helper that attaches Authorization: Bearer <token>
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = getStoredAuthToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Check if backend API server is reachable
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
    const contentType = res.headers.get('content-type') || '';
    return res.ok && contentType.includes('application/json');
  } catch {
    return false;
  }
}

/**
 * Fetch group-scoped synchronized data from backend
 */
export async function fetchServerSync(): Promise<ServerSyncResponse | null> {
  try {
    const timestamp = Date.now();
    const res = await apiFetch(`/api/sync?_t=${timestamp}`, {
      method: 'GET',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return null;
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
 * Fetch fresh active members list for current group
 */
export async function fetchServerUsers(): Promise<User[] | null> {
  try {
    const timestamp = Date.now();
    const res = await apiFetch(`/api/users?_t=${timestamp}`, {
      method: 'GET',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return null;
    const json = await res.json();
    if (json.success && Array.isArray(json.users)) {
      return json.users;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch single member by ID or Username
 */
export async function fetchServerUserById(id: string): Promise<User | null> {
  try {
    const timestamp = Date.now();
    const res = await apiFetch(`/api/users/${encodeURIComponent(id)}?_t=${timestamp}`, {
      method: 'GET',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return null;
    const json = await res.json();
    if (json.success && json.user) {
      return json.user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Register user on backend server (supports optional inviteToken)
 */
export async function registerUserOnServer(data: {
  name?: string;
  username: string;
  password?: string;
  passwordPlain?: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  inviteToken?: string;
}): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
  try {
    const payload = {
      name: data.name,
      username: data.username,
      password: data.password || data.passwordPlain,
      height: data.height,
      weight: data.weight,
      age: data.age,
      gender: data.gender,
      inviteToken: data.inviteToken,
    };
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, error: 'Server returned an invalid response (non-JSON). Server might be down or misconfigured.' };
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      return { success: false, error: json.error || 'Server registration failed' };
    }
    return { success: true, token: json.token, user: json.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server unreachable. Try again.' };
  }
}

/**
 * Verify login credentials on backend server (returns session token)
 */
export async function loginUserOnServer(
  identifier: string, 
  passwordPlain: string, 
  passwordHash?: string
): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: passwordPlain, passwordHash }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, error: 'Cannot connect to authentication server' };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Invalid credentials' };
    }
    return { success: true, token: data.token, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching server' };
  }
}

/**
 * Update user profile on backend server
 */
export async function updateUserOnServer(user: User): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/users/${encodeURIComponent(user.id)}`, {
      method: 'PUT',
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
    const res = await apiFetch('/api/logs', {
      method: 'POST',
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
    const res = await apiFetch('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(workouts),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Delete workout on backend (creator-only enforcement)
 */
export async function deleteWorkoutOnServer(id: string): Promise<boolean> {
  try {
    const res = await apiFetch('/api/workouts/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn('[API] deleteWorkoutOnServer error:', data.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[API] deleteWorkoutOnServer error:', e);
    return false;
  }
}

export async function clearAllWorkoutsOnServer(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/workouts/clear-all', {
      method: 'POST',
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
    const res = await apiFetch('/api/weights', {
      method: 'POST',
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
    const res = await apiFetch('/api/missed-reasons', {
      method: 'POST',
      body: JSON.stringify(reason),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Delete missed reason from backend
 */
export async function deleteMissedReasonOnServer(id: string): Promise<boolean> {
  try {
    const res = await apiFetch('/api/missed-reasons/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
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
    const res = await apiFetch('/api/reactions', {
      method: 'POST',
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
    const res = await apiFetch('/api/badges', {
      method: 'POST',
      body: JSON.stringify(badges),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Supplements API
 */
export async function pushSupplementToServer(supplement: Supplement | Supplement[]): Promise<boolean> {
  try {
    const res = await apiFetch('/api/supplements', {
      method: 'POST',
      body: JSON.stringify(supplement),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteSupplementOnServer(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/supplements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushSupplementLogToServer(log: SupplementLog): Promise<boolean> {
  try {
    const res = await apiFetch('/api/supplement-logs', {
      method: 'POST',
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
export async function pushCustomHabitToServer(habit: CustomHabit | CustomHabit[]): Promise<boolean> {
  try {
    const res = await apiFetch('/api/custom-habits', {
      method: 'POST',
      body: JSON.stringify(habit),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCustomHabitOnServer(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/custom-habits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushCustomHabitLogToServer(log: CustomHabitLog): Promise<boolean> {
  try {
    const res = await apiFetch('/api/custom-habit-logs', {
      method: 'POST',
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
    const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}`, {
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
    const res = await apiFetch('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// Group & Invite Link Endpoints
// ----------------------------------------------------

/**
 * Create group invite link (owner only)
 */
export async function createGroupInvite(
  groupId: string, 
  options: { expiresInDays?: number; maxUses?: number } = {}
): Promise<{ success: boolean; token?: string; url?: string; invite?: Invite; error?: string }> {
  try {
    const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        expiresInDays: options.expiresInDays ?? 7,
        maxUses: options.maxUses ?? 10,
      }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create invite link' };
  }
}

/**
 * Public preview of an invite link (no auth required)
 */
export async function getInvitePreview(token: string): Promise<InvitePreview> {
  try {
    const res = await fetch(`${API_BASE}/api/invites/${encodeURIComponent(token)}`);
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, valid: false, reason: 'Failed to load invite link preview' };
  }
}

/**
 * Redeem invite for currently authenticated user
 */
export async function redeemInvite(token: string): Promise<{ success: boolean; message?: string; group?: Group; error?: string }> {
  try {
    const res = await apiFetch(`/api/invites/${encodeURIComponent(token)}/redeem`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || 'Failed to redeem invite' };
    }
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error redeeming invite' };
  }
}

/**
 * Revoke invite token (owner only)
 */
export async function revokeInvite(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/invites/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to revoke invite' };
  }
}

/**
 * Leave current group
 */
export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
      method: 'POST',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to leave group' };
  }
}

/**
 * Remove a member from group (owner only)
 */
export async function removeGroupMember(groupId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to remove group member' };
  }
}
