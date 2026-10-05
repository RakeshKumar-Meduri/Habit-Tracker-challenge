import { SCORING } from '../config/constants';

export interface DailyLogInput {
  date: string;
  gym_done?: boolean;
  steps_done?: boolean;
  steps_value?: number;
  steps_target?: number;
  sleep_done?: boolean;
  junk_food_avoided?: boolean;
  water_done?: boolean;
}

/**
 * Server-authoritative points calculation.
 * Preserves 5-pillar rules:
 * - Gym: 10 pts (Sunday healing day auto-counts unless explicitly false)
 * - Sleep: 10 pts
 * - Clean Eating (junk food avoided): 10 pts
 * - Water: 10 pts
 * - Steps: Proportional up to 10 pts based on step_target
 * Max 50 pts/day.
 */
export function calculateServerPoints(log: DailyLogInput, groupStepTarget: number = SCORING.DEFAULT_STEP_TARGET): number {
  let isSunday = false;
  if (log.date) {
    const [y, m, d] = log.date.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      isSunday = new Date(y, m - 1, d).getDay() === 0;
    }
  }

  let points = 0;

  // 1. Gym / Workout (Sunday healing automatically counts)
  if (log.gym_done || (isSunday && log.gym_done !== false)) {
    points += SCORING.GYM_POINTS;
  }

  // 2. Sleep
  if (log.sleep_done) {
    points += SCORING.SLEEP_POINTS;
  }

  // 3. Clean Eating
  if (log.junk_food_avoided) {
    points += SCORING.CLEAN_EATING_POINTS;
  }

  // 4. Water
  if (log.water_done) {
    points += SCORING.WATER_POINTS;
  }

  // 5. Steps (proportional partial calculation)
  const target = Math.max(1000, Number(log.steps_target) || groupStepTarget || SCORING.DEFAULT_STEP_TARGET);
  const stepsVal = Math.max(0, Number(log.steps_value) || 0);

  const stepPoints = (log.steps_done || stepsVal >= target)
    ? SCORING.MAX_STEPS_POINTS
    : Math.min(SCORING.MAX_STEPS_POINTS, Math.round((stepsVal / target) * 100) / 10);

  const total = Math.min(SCORING.MAX_DAILY_POINTS, points + stepPoints);
  return Math.round(total * 10) / 10;
}
