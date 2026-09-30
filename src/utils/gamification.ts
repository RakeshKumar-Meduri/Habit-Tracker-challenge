import type { DailyLog, Workout, WeightLog, Badge, User } from '../types';

export function calculateUserPoints(dailyLogs: DailyLog[], userId: string): number {
  return dailyLogs
    .filter(log => log.user_id === userId)
    .reduce((total, log) => {
      let points = 0;
      if (log.gym_done) points += 1;
      
      // Step points allocation based on count range (6k, 8k, 10k+)
      const steps = log.steps_value || 0;
      if (steps >= 10000) {
        points += 3;
      } else if (steps >= 8000) {
        points += 2;
      } else if (steps >= 6000) {
        points += 1;
      } else if (log.steps_done) {
        points += 1;
      }

      if (log.sleep_done) points += 1;
      if (log.junk_food_avoided) points += 1;
      if (log.water_done) points += 1;

      // Bonus 3 points for completing all core daily goals
      const hasStepGoal = steps >= 6000 || log.steps_done;
      if (log.gym_done && hasStepGoal && log.sleep_done && log.junk_food_avoided && log.water_done) {
        points += 3;
      }
      return total + points;
    }, 0);
}

export function calculateGoalStreak(dailyLogs: DailyLog[], userId: string, goalType: 'gym' | 'steps' | 'sleep' | 'junk_food' | 'water'): number {
  const userLogs = dailyLogs
    .filter(log => log.user_id === userId)
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
  existingBadges: Badge[]
): Badge[] {
  const userBadges = [...existingBadges.filter(b => b.user_id === user.id)];
  const existingTypes = new Set(userBadges.map(b => b.badge_type));

  const gymStreak = calculateGoalStreak(dailyLogs, user.id, 'gym');
  const stepStreak = calculateGoalStreak(dailyLogs, user.id, 'steps');
  const junkStreak = calculateGoalStreak(dailyLogs, user.id, 'junk_food');

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
    .filter(w => w.user_id === user.id)
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
  const userWorkoutCount = workouts.filter(w => w.user_id === user.id).length;
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
