export type Gender = 'male' | 'female' | 'other' | '';
export type UserRole = 'member' | 'admin' | 'moderator';

export interface User {
  id: string;
  name: string;
  username: string; // unique, lowercase, no spaces
  password_hash?: string;
  role: UserRole;
  height: number; // in cm
  weight_current: number; // in kg
  age: number;
  birthday?: string; // YYYY-MM-DD
  gender: Gender;
  photo_url?: string;
  body_shape_photo?: string; // Data URL or Image URL for body shape tracking
  is_private: boolean;
  avatar_color?: string;
  created_at: string;
  onboarded?: boolean;
  is_active: boolean; // soft-delete status (default true)
  must_change_password?: boolean;
  plan?: string;
  planTier?: 'none' | 'base' | 'pro';
}

export interface AuthSession {
  user_id: string;
  username: string;
  name: string;
  role: UserRole;
  token: string; // simulated httpOnly JWT
  expires_at: string; // 30 days maxAge ISO string
}

export interface LoginResult {
  success: boolean;
  error?: string;
  isLockout?: boolean;
  lockoutSeconds?: number;
  mustChangePassword?: boolean;
  user?: User;
  session?: AuthSession;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO format
}

export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  dosage?: string;
  timing?: string; // e.g. "Morning", "Pre-workout"
}

export interface SupplementLog {
  id: string;
  user_id: string;
  supplement_id: string;
  date: string; // YYYY-MM-DD
  taken: boolean;
}

export interface CustomHabit {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_private: boolean; // default true
  created_at: string;
}

export interface CustomHabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface WeightAnnouncement {
  id: string;
  user_id: string;
  username: string;
  name: string;
  change_type: 'loss' | 'gain';
  amount_kg: number;
  new_weight: number;
  date: string;
  timestamp: string;
}

export type GoalType = 'gym' | 'steps' | 'sleep' | 'junk_food' | 'water';

export interface DailyLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  gym_done: boolean;
  steps_done: boolean;
  steps_value?: number; // e.g. 8500
  steps_target?: number; // e.g. 8000
  sleep_done: boolean;
  junk_food_avoided: boolean;
  cheat_day_used?: boolean;
  water_done: boolean;
  water_intake_ml?: number; // e.g. 2500 ml target
  water_target_ml?: number;
  sleep_start?: string; // HH:mm
  sleep_end?: string; // HH:mm
  sleep_duration?: number; // hours
  points_earned?: number;
}

export type ReasonTag = 'Tired' | 'Work' | 'Travel' | 'Lazy' | 'Sick' | 'Weather' | 'Sore' | 'Cheat Day' | 'Other';

export interface MissedReason {
  id: string;
  daily_log_id: string;
  user_id: string;
  date: string;
  goal_type: GoalType;
  reason_tag: ReasonTag;
  reason_text?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  exercise_name: string;
  exercise_type?: 'strength' | 'cardio' | 'other';
  sets: number;
  reps: number;
  weight?: number; // in kg or lb
  weight_unit?: 'kg' | 'lb';
  duration: number; // minutes
  notes?: string;
  is_private: boolean;
  created_at: string;
}

export interface Reaction {
  id: string;
  from_user_id: string;
  target_id: string; // daily_log_id or workout_id
  target_type: 'daily_log' | 'workout';
  emoji: string; // 🔥, 👏, 😂, 💪, 🎯
  created_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: string;
  title: string;
  description: string;
  icon: string;
  earned_date: string;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target_type: 'gym' | 'steps' | 'total_goals';
  target_count: number;
  current_count: number;
  start_date: string;
  end_date: string;
}

export interface CelebrationEvent {
  type: 'weight_loss' | 'streak_milestone' | 'clean_sweep' | 'badge_unlocked';
  title: string;
  message: string;
  badge_icon?: string;
}

export interface AdminSettings {
  step_target: number;
  sleep_min_hours: number;
  sleep_max_hours: number;
  water_target_ml: number;
  invite_code?: string;
  cheat_days_enabled: boolean;
  day_cutoff_hour: number; // e.g. 0 for midnight, 3 for 3 AM
}

export interface GroupMemberInfo {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  name: string;
  username: string;
  avatar_color?: string;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  step_target?: number;
  members?: GroupMemberInfo[];
}

export interface Membership {
  user_id: string;
  group_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Invite {
  token: string;
  group_id: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  revoked: boolean;
}

export interface InvitePreview {
  success: boolean;
  valid: boolean;
  reason?: string;
  groupName?: string;
  inviterName?: string;
  memberCount?: number;
}


