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
      <div className="relative w-full max-w-md bg-[#131316] border-2 border-[#D98B4A]/60 rounded-xl p-5 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#F4F4F5] p-1.5 rounded-lg hover:bg-[#1B1B20] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-tr from-[#D98B4A] to-[#D98B4A] flex items-center justify-center shadow-lg shadow-[#D98B4A]/30">
            <Sparkles className="w-7 h-7 text-[#1B1B20]" />
          </div>
          <h3 className="text-xl font-black text-[#F4F4F5]">Your Weekly Auto-Recap</h3>
          <p className="text-xs text-[#A1A1AA] mt-1">Here is how you performed over the past 7 days, {currentUser.name}!</p>
        </div>

        <div className="space-y-3">
          
          <div className="flex items-center justify-between p-3.5 bg-[#1B1B20] rounded-xl border border-[#26262C]">
            <span className="text-xs font-bold text-[#F4F4F5] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D98B4A]" /> Goal Completion Rate
            </span>
            <strong className="text-base sm:text-lg font-black text-[#E69A5C] font-mono">{weeklyPercent}%</strong>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1B1B20] rounded-xl border border-[#26262C]">
            <span className="text-xs font-bold text-[#F4F4F5] flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#D98B4A]" /> Workouts Completed
            </span>
            <strong className="text-base sm:text-lg font-black text-[#E69A5C] font-mono">{userWorkouts.length} sessions</strong>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1B1B20] rounded-xl border border-[#26262C]">
            <span className="text-xs font-bold text-[#F4F4F5] flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" /> 5/5 Clean Sweeps
            </span>
            <strong className="text-base sm:text-lg font-black text-rose-400 font-mono">{cleanSweeps} days</strong>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#1B1B20] rounded-xl border border-[#26262C]">
            <span className="text-xs font-bold text-[#F4F4F5] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" /> Net Weight Progress
            </span>
            <strong className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {weightDelta >= 0 ? `-${weightDelta} kg` : `+${Math.abs(weightDelta)} kg`}
            </strong>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full py-3 min-h-[44px] mt-6 bg-gradient-to-r from-[#D98B4A] to-[#D98B4A] hover:from-[#D98B4A] hover:to-[#B45F1E] text-[#1B1B20] font-black rounded-xl text-sm transition shadow-lg shadow-[#D98B4A]/20 cursor-pointer flex items-center justify-center"
        >
          Let's Crush This Week! 💪
        </button>
      </div>
    </div>
  );
};
