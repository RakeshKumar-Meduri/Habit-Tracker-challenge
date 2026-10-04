import type { User, DailyLog, Workout, WeightLog, MissedReason, Supplement, CustomHabit } from '../types';

/**
 * Standardize an identifier for resilient matching:
 * Trims whitespace, lowercases, and strips any leading '@' symbols.
 */
export function cleanIdentifier(id: string | null | undefined): string {
  if (!id) return '';
  return String(id).trim().toLowerCase().replace(/^@+/, '');
}

/**
 * Robustly checks if an entity's user identifier belongs to targetUser.
 * 
 * Supports:
 * 1. Exact ID match (case-insensitive & trimmed)
 * 2. Username match (e.g. log.user_id === 'hitesh' while user.id === 'user_179...')
 * 3. Display name match (e.g. 'hitesh' or 'Hitesh')
 * 4. Entity ID embedding (e.g. log.id 'dl_hitesh_2026-10-02' or 'wo_hitesh_123')
 * 5. Cross-user aliasing (if another User record in allUsers has the same username/name as targetUser)
 */
export function isUserMatch(
  entityUserId: string | null | undefined,
  targetUser: User | null | undefined,
  allUsers?: User[],
  entityId?: string
): boolean {
  if (!targetUser) return false;

  const cleanEntityId = cleanIdentifier(entityUserId);
  const cleanTargetId = cleanIdentifier(targetUser.id);
  const cleanTargetUsername = cleanIdentifier(targetUser.username);
  const cleanTargetName = cleanIdentifier(targetUser.name);

  // 1. Direct ID match
  if (cleanEntityId && cleanTargetId && cleanEntityId === cleanTargetId) {
    return true;
  }

  // 2. Direct Username or Display Name match
  if (cleanEntityId) {
    if (cleanTargetUsername && cleanEntityId === cleanTargetUsername) return true;
    if (cleanTargetName && cleanEntityId === cleanTargetName) return true;
  }

  // 3. Entity ID contains target user ID or username
  if (entityId) {
    const cleanEid = cleanIdentifier(entityId);
    if (cleanTargetId && cleanEid.includes(cleanTargetId)) return true;
    if (cleanTargetUsername && cleanEid.includes(cleanTargetUsername)) return true;
    if (cleanEntityId && cleanEid.includes(cleanEntityId)) {
      // If the entity ID embeds the entityUserId, also check if entityUserId matches target
      if (cleanTargetUsername && cleanEntityId === cleanTargetUsername) return true;
    }
  }

  // 4. Aliased User resolution across allUsers
  if (allUsers && allUsers.length > 0) {
    // Find any user in allUsers whose username or name matches targetUser
    const aliases = allUsers.filter(u => 
      (cleanTargetUsername && cleanIdentifier(u.username) === cleanTargetUsername) ||
      (cleanTargetName && cleanIdentifier(u.name) === cleanTargetName) ||
      (cleanTargetId && cleanIdentifier(u.id) === cleanTargetId)
    );

    for (const alias of aliases) {
      const aliasId = cleanIdentifier(alias.id);
      const aliasUsername = cleanIdentifier(alias.username);
      const aliasName = cleanIdentifier(alias.name);

      if (cleanEntityId && (cleanEntityId === aliasId || cleanEntityId === aliasUsername || cleanEntityId === aliasName)) {
        return true;
      }
      if (entityId) {
        const cleanEid = cleanIdentifier(entityId);
        if (aliasId && cleanEid.includes(aliasId)) return true;
        if (aliasUsername && cleanEid.includes(aliasUsername)) return true;
      }
    }
  }

  return false;
}

/**
 * Check if a DailyLog belongs to a User
 */
export function isLogForUser(
  log: DailyLog | null | undefined, 
  user: User | null | undefined, 
  allUsers?: User[]
): boolean {
  if (!log || !user) return false;
  return isUserMatch(log.user_id, user, allUsers, log.id);
}

/**
 * Check if a Workout belongs to a User
 */
export function isWorkoutForUser(
  workout: Workout | null | undefined, 
  user: User | null | undefined, 
  allUsers?: User[]
): boolean {
  if (!workout || !user) return false;
  return isUserMatch(workout.user_id, user, allUsers, workout.id);
}

/**
 * Check if a WeightLog belongs to a User
 */
export function isWeightForUser(
  weightLog: WeightLog | null | undefined, 
  user: User | null | undefined, 
  allUsers?: User[]
): boolean {
  if (!weightLog || !user) return false;
  return isUserMatch(weightLog.user_id, user, allUsers, weightLog.id);
}

/**
 * Check if a MissedReason belongs to a User
 */
export function isReasonForUser(
  reason: MissedReason | null | undefined, 
  user: User | null | undefined, 
  allUsers?: User[]
): boolean {
  if (!reason || !user) return false;
  return isUserMatch(reason.user_id, user, allUsers, reason.id || reason.daily_log_id);
}

/**
 * Check if a Supplement belongs to a User
 */
export function isSupplementForUser(
  supp: Supplement | null | undefined,
  user: User | null | undefined,
  allUsers?: User[]
): boolean {
  if (!supp || !user) return false;
  return isUserMatch(supp.user_id, user, allUsers, supp.id);
}

/**
 * Check if a CustomHabit belongs to a User
 */
export function isHabitForUser(
  habit: CustomHabit | null | undefined,
  user: User | null | undefined,
  allUsers?: User[]
): boolean {
  if (!habit || !user) return false;
  return isUserMatch(habit.user_id, user, allUsers, habit.id);
}

/**
 * Find the matching User from users list for a given entity user_id or entity ID
 */
export function findUserForEntity(
  entityUserId: string | null | undefined,
  users: User[],
  entityId?: string
): User | undefined {
  if (!entityUserId && !entityId) return undefined;
  return users.find(u => isUserMatch(entityUserId, u, users, entityId));
}

/**
 * Get canonical user ID for any identifier (resolves aliases and usernames to primary user.id)
 */
export function getCanonicalUserId(
  idOrUsername: string | null | undefined,
  users: User[]
): string {
  if (!idOrUsername) return '';
  const found = findUserForEntity(idOrUsername, users);
  return found ? found.id : idOrUsername;
}
