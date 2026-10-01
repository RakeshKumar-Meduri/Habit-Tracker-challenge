import React from 'react';
import type { User, DailyLog, Workout, WeightLog } from '../types';
import { Sparkles, Trophy, Flame, Dumbbell, TrendingDown, X } from 'lucide-react';

interface WeeklyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs: WeightLog[];
}

export const WeeklyRecapModal: React.FC<WeeklyRecapModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  dailyLogs,
  workouts,
  weightLogs,
}) => {
  if (!isOpen) return null;

  // Filter logs for past 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const userLogs = dailyLogs.filter(l => l.user_id === currentUser.id && l.date >= cutoff);
  const userWorkouts = workouts.filter(w => w.user_id === currentUser.id && w.date >= cutoff);

  const totalPossibleGoals = userLogs.length * 5 || 35;
  const completedGoals = userLogs.reduce((acc, l) => {
    let c = 0;
    if (l.gym_done) c++;
    if (l.steps_done) c++;
    if (l.sleep_done) c++;
    if (l.junk_food_avoided) c++;
    if (l.water_done) c++;
    return acc + c;
  }, 0);

  const weeklyPercent = Math.round((completedGoals / totalPossibleGoals) * 100) || 0;
  const cleanSweeps = userLogs.filter(l => l.gym_done && l.steps_done && l.sleep_done && l.junk_food_avoided && l.water_done).length;

  const userWeights = weightLogs
    .filter(w => w.user_id === currentUser.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  let weightDelta = 0;
  if (userWeights.length >= 2) {
    weightDelta = parseFloat((userWeights[0].weight - userWeights[userWeights.length - 1].weight).toFixed(1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-[#26201b] border-2 border-[#c68b59]/60 rounded-2xl p-5 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#c5b4a5] hover:text-[#f5efe6] p-1.5 rounded-lg hover:bg-[#322a24] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#c68b59] to-[#b87b4b] flex items-center justify-center shadow-lg shadow-[#c68b59]/30">
            <Sparkles className="w-7 h-7 text-[#1c1815]" />
          </div>
          <h3 className="text-xl font-black text-[#f5efe6]">Your Weekly Auto-Recap</h3>
          <p className="text-xs text-[#c5b4a5] mt-1">Here is how you performed over the past 7 days, {currentUser.name}!</p>
        </div>

        <div className="space-y-3">
          
          <div className="flex items-center justify-between p-3.5 bg-[#1c1815] rounded-xl border border-[#3d322a]">
            <span className="text-xs font-bold text-[#f5efe6] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#c68b59]" /> Goal Completion Rate
            </span>
            <strong className="text-base sm:text-lg font-black text-[#d4a373] font-mono">{weeklyPercent}%</strong>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1c1815] rounded-xl border border-[#3d322a]">
            <span className="text-xs font-bold text-[#f5efe6] flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#c68b59]" /> Workouts Completed
            </span>
            <strong className="text-base sm:text-lg font-black text-[#d4a373] font-mono">{userWorkouts.length} sessions</strong>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1c1815] rounded-xl border border-[#3d322a]">
            <span className="text-xs font-bold text-[#f5efe6] flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" /> 5/5 Clean Sweeps
            </span>
            <strong className="text-base sm:text-lg font-black text-rose-400 font-mono">{cleanSweeps} days</strong>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1c1815] rounded-xl border border-[#3d322a]">
            <span className="text-xs font-bold text-[#f5efe6] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" /> Net Weight Progress
            </span>
            <strong className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {weightDelta >= 0 ? `-${weightDelta} kg` : `+${Math.abs(weightDelta)} kg`}
            </strong>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full py-3 min-h-[44px] mt-6 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-sm transition shadow-lg shadow-[#c68b59]/20 cursor-pointer flex items-center justify-center"
        >
          Let's Crush This Week! 💪
        </button>
      </div>
    </div>
  );
};
