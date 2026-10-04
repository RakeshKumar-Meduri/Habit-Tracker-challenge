import type { DailyLog, Workout, WeightLog, Badge, User } from '../types';
import { isLogForUser, isWorkoutForUser, isWeightForUser, isUserMatch } from './userMatcher';

export function calculateUserPoints(dailyLogs: DailyLog[], userIdOrUser: string | User, allUsers?: User[]): number {
  const targetUser: User | null = typeof userIdOrUser === 'object' && userIdOrUser !== null
    ? userIdOrUser
    : (allUsers?.find(u => isUserMatch(userIdOrUser, u, allUsers)) || { id: String(userIdOrUser), username: String(userIdOrUser), name: String(userIdOrUser) } as User);

  return dailyLogs
    .filter(log => isLogForUser(log, targetUser, allUsers))
    .reduce((total, log) => {
      // Determine if the day is Sunday (Healing day)
      let isSunday = false;
      if (log.date) {
        const [y, m, d] = log.date.split('-').map(Number);
        isSunday = new Date(y, m - 1, d).getDay() === 0;
      }

      let coreDone = 0;
      // 1. Gym / Workout (Sunday healing automatically counts)
      if (log.gym_done || (isSunday && log.gym_done !== false)) coreDone += 1;
      // 2. Steps goal
      if (log.steps_done || (log.steps_value || 0) >= 6000) coreDone += 1;
      // 3. Sleep goal
      if (log.sleep_done) coreDone += 1;
      // 4. Junk food avoided
      if (log.junk_food_avoided) coreDone += 1;
      // 5. Water target
      if (log.water_done) coreDone += 1;

      // 10 points per completed goal (Max 50 points/day)
      const earned = (log.points_earned !== undefined && log.points_earned !== null && log.points_earned > 0)
        ? Math.max(log.points_earned, coreDone * 10)
        : coreDone * 10;

      return total + earned;
    }, 0);
}

export function calculateGoalStreak(
  dailyLogs: DailyLog[], 
  userIdOrUser: string | User, 
  goalType: 'gym' | 'steps' | 'sleep' | 'junk_food' | 'water',
  allUsers?: User[]
): number {
  const targetUser: User | null = typeof userIdOrUser === 'object' && userIdOrUser !== null
    ? userIdOrUser
    : (allUsers?.find(u => isUserMatch(userIdOrUser, u, allUsers)) || { id: String(userIdOrUser), username: String(userIdOrUser), name: String(userIdOrUser) } as User);

  const userLogs = dailyLogs
    .filter(log => isLogForUser(log, targetUser, allUsers))
    .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

  if (userLogs.length === 0) return 0;

  let streak = 0;
  for (const log of userLogs) {
    let isDone = false;
    if (goalType === 'gym') isDone = log.gym_done;
    if (goalType === 'steps') isDone = log.steps_done;
    if (goalType === 'sleep') isDone = log.sleep_done;
    if (goalType === 'junk_food') isDone = log.junk_food_avoided;
    if (goalType === 'water') isDone = log.water_done;

    if (isDone) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function evaluateBadges(
  user: User,
  dailyLogs: DailyLog[],
  workouts: Workout[],
  weightLogs: WeightLog[],
  existingBadges: Badge[],
  allUsers?: User[]
): Badge[] {
  const userBadges = [...existingBadges.filter(b => isUserMatch(b.user_id, user, allUsers))];
  const existingTypes = new Set(userBadges.map(b => b.badge_type));

  const gymStreak = calculateGoalStreak(dailyLogs, user, 'gym', allUsers);
  const stepStreak = calculateGoalStreak(dailyLogs, user, 'steps', allUsers);
  const junkStreak = calculateGoalStreak(dailyLogs, user, 'junk_food', allUsers);

  const today = new Date().toISOString().split('T')[0];

  // 1. Gym Streak Badge
  if (gymStreak >= 7 && !existingTypes.has('gym_streak_7')) {
    userBadges.push({
      id: `b_${user.id}_gym_7`,
      user_id: user.id,
      badge_type: 'gym_streak_7',
      title: '7-Day Gym Beast',
      description: 'Hit the gym 7 consecutive days',
      icon: '🏋️‍♂️',
      earned_date: today,
    });
  }

  // 2. Steps Streak Badge
  if (stepStreak >= 7 && !existingTypes.has('steps_streak_7')) {
    userBadges.push({
      id: `b_${user.id}_steps_7`,
      user_id: user.id,
      badge_type: 'steps_streak_7',
      title: 'Road Runner',
      description: 'Hit 8,000 steps 7 days in a row',
      icon: '👟',
      earned_date: today,
    });
  }

  // 3. Clean Eating Badge
  if (junkStreak >= 7 && !existingTypes.has('no_junk_7')) {
    userBadges.push({
      id: `b_${user.id}_junk_7`,
      user_id: user.id,
      badge_type: 'no_junk_7',
      title: 'Iron Discipline',
      description: 'No junk food for 7 consecutive days',
      icon: '🥗',
      earned_date: today,
    });
  }

  // 4. Weight Loss Badge
  const userWeights = weightLogs
    .filter(w => isWeightForUser(w, user, allUsers))
    .sort((a, b) => a.date.localeCompare(b.date));
    
  if (userWeights.length >= 2) {
    const initialWeight = userWeights[0].weight;
    const latestWeight = userWeights[userWeights.length - 1].weight;
    const weightLoss = initialWeight - latestWeight;

    if (weightLoss >= 3 && !existingTypes.has('weight_loss_3')) {
      userBadges.push({
        id: `b_${user.id}_wl_3`,
        user_id: user.id,
        badge_type: 'weight_loss_3',
        title: '3kg Weight Loss Hero',
        description: 'Lost 3kg from starting weight',
        icon: '🎉',
        earned_date: today,
      });
    }

    if (weightLoss >= 5 && !existingTypes.has('weight_loss_5')) {
      userBadges.push({
        id: `b_${user.id}_wl_5`,
        user_id: user.id,
        badge_type: 'weight_loss_5',
        title: '5kg Transformer',
        description: 'Lost 5kg from starting weight',
        icon: '🔥',
        earned_date: today,
      });
    }
  }

  // 5. Total Workouts Badge
  const userWorkoutCount = workouts.filter(w => isWorkoutForUser(w, user, allUsers)).length;
  if (userWorkoutCount >= 10 && !existingTypes.has('workouts_10')) {
    userBadges.push({
      id: `b_${user.id}_wo_10`,
      user_id: user.id,
      badge_type: 'workouts_10',
      title: 'Workout Veteran',
      description: 'Logged 10 total workout sessions',
      icon: '💪',
      earned_date: today,
    });
  }

  return userBadges;
}
