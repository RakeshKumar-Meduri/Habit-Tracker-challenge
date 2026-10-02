import React, { useState } from 'react';
import type { User, DailyLog, Workout, WeightLog } from '../types';
import { calculateUserPoints, calculateGoalStreak } from '../utils/gamification';
import { Swords, Trophy, Flame, Dumbbell, TrendingDown, Zap, Sparkles, RefreshCw } from 'lucide-react';

interface HeadToHeadProps {
  users: User[];
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs: WeightLog[];
  onRefreshMembers?: () => void;
  isRefreshingMembers?: boolean;
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({
  users,
  dailyLogs,
  workouts,
  weightLogs,
  onRefreshMembers,
  isRefreshingMembers = false,
}) => {
  const [userAId, setUserAId] = useState<string>(users[0]?.id || '');
  const [userBId, setUserBId] = useState<string>(users[1]?.id || users[0]?.id || '');

  if (users.length < 2) {
    return (
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-6 sm:p-8 shadow-xl text-center max-w-xl mx-auto my-6 sm:my-8 font-sans">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#D98B4A]/10 border border-[#D98B4A]/30 flex items-center justify-center">
          <Swords className="w-6 h-6 text-[#D98B4A]" />
        </div>
        <h3 className="text-lg sm:text-xl font-black text-[#F4F4F5]">Head-to-Head Face-Off</h3>
        <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
          At least 2 registered members are required for a side-by-side comparison. If your friend recently registered, tap below to sync.
        </p>
        {onRefreshMembers && (
          <div className="mt-5">
            <button
              type="button"
              onClick={onRefreshMembers}
              disabled={isRefreshingMembers}
              className="px-4 py-2 bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 mx-auto active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
              <span>{isRefreshingMembers ? 'Checking for Teammates...' : 'Sync Members Now'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const userA = users.find(u => u.id === userAId) || users[0];
  const userB = users.find(u => u.id === userBId) || (users[1] || users[0]);

  const getStats = (user: User) => {
    if (!user) return {
      totalPoints: 0,
      totalGoalsCompleted: 0,
      workoutCount: 0,
      weightLoss: 0,
      gymStreak: 0,
      stepsStreak: 0,
      cleanSweeps: 0,
    };
    const uLogs = dailyLogs.filter(l => l.user_id === user.id);
    const uWorkouts = workouts.filter(w => w.user_id === user.id);
    const uWeights = weightLogs.filter(w => w.user_id === user.id).sort((a, b) => a.date.localeCompare(b.date));

    const totalPoints = calculateUserPoints(dailyLogs, user.id);
    const gymStreak = calculateGoalStreak(dailyLogs, user.id, 'gym');
    const stepsStreak = calculateGoalStreak(dailyLogs, user.id, 'steps');
    
    let weightLoss = 0;
    if (uWeights.length >= 2) {
      weightLoss = parseFloat((uWeights[0].weight - uWeights[uWeights.length - 1].weight).toFixed(1));
    }

    const totalGoalsCompleted = uLogs.reduce((acc, log) => {
      let c = 0;
      if (log.gym_done) c++;
      if (log.steps_done) c++;
      if (log.sleep_done) c++;
      if (log.junk_food_avoided) c++;
      if (log.water_done) c++;
      return acc + c;
    }, 0);

    const cleanSweeps = uLogs.filter(l => l.gym_done && l.steps_done && l.sleep_done && l.junk_food_avoided && l.water_done).length;

    return {
      totalPoints,
      totalGoalsCompleted,
      workoutCount: uWorkouts.length,
      weightLoss,
      gymStreak,
      stepsStreak,
      cleanSweeps,
    };
  };

  const statsA = getStats(userA);
  const statsB = getStats(userB);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Header */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl text-center">
        <h2 className="text-xl sm:text-2xl font-black text-[#F4F4F5] flex items-center justify-center gap-2">
          <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-[#D98B4A]" />
          Head-to-Head Member Face-Off
        </h2>
        <p className="text-xs text-[#A1A1AA] mt-1 max-w-md mx-auto">
          Pick any two group members to compare consistency, streaks, and performance metrics side-by-side.
        </p>

        {/* User Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto mt-5">
          <div className="bg-[#1B1B20] p-3 rounded-xl border border-[#26262C] text-left">
            <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D98B4A]"></span> Competitor A
            </label>
            <select
              value={userAId}
              onChange={(e) => setUserAId(e.target.value)}
              className="w-full bg-[#131316] border border-[#26262C] text-[#F4F4F5] font-bold text-xs sm:text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#D98B4A] cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} disabled={u.id === userBId}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#1B1B20] p-3 rounded-xl border border-[#26262C] text-left">
            <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E69A5C]"></span> Competitor B
            </label>
            <select
              value={userBId}
              onChange={(e) => setUserBId(e.target.value)}
              className="w-full bg-[#131316] border border-[#26262C] text-[#F4F4F5] font-bold text-xs sm:text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#D98B4A] cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} disabled={u.id === userAId}>
                  {u.name} (@{u.username})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* User A Card */}
        <div className="bg-[#131316] border-2 border-[#D98B4A]/50 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3.5 border-b border-[#26262C] pb-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr ${userA.avatar_color || 'from-[#D98B4A] to-[#B45F1E]'} text-lg sm:text-xl font-black text-[#F4F4F5] flex items-center justify-center shadow-lg shrink-0`}>
              {userA.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-[#F4F4F5] truncate">{userA.name}</h3>
              <span className="text-xs text-[#A1A1AA] block">Current Weight: <strong className="text-[#E69A5C]">{userA.weight_current} kg</strong></span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#D98B4A]" /> Total Points:
              </span>
              <div className="flex items-center gap-2">
                {statsA.totalPoints > statsB.totalPoints && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#E69A5C] font-mono text-sm sm:text-base">{statsA.totalPoints} pts</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Completed Goals:
              </span>
              <div className="flex items-center gap-2">
                {statsA.totalGoalsCompleted > statsB.totalGoalsCompleted && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 font-bold">Ahead</span>
                )}
                <strong className="text-emerald-400 font-mono text-sm sm:text-base">{statsA.totalGoalsCompleted}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#D98B4A]" /> Logged Workouts:
              </span>
              <div className="flex items-center gap-2">
                {statsA.workoutCount > statsB.workoutCount && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#F4F4F5] font-mono text-sm sm:text-base">{statsA.workoutCount} sessions</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> Net Weight Progress:
              </span>
              <strong className="text-emerald-400 font-mono text-sm sm:text-base">-{statsA.weightLoss} kg</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#D98B4A]" /> Active Gym Streak:
              </span>
              <div className="flex items-center gap-2">
                {statsA.gymStreak > statsB.gymStreak && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#F4F4F5] font-mono text-sm sm:text-base">{statsA.gymStreak} days</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E69A5C]" /> Clean Sweeps:
              </span>
              <div className="flex items-center gap-2">
                {statsA.cleanSweeps > statsB.cleanSweeps && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#E69A5C] font-mono text-sm sm:text-base">{statsA.cleanSweeps} days</strong>
              </div>
            </div>
          </div>
        </div>

        {/* User B Card */}
        <div className="bg-[#131316] border-2 border-[#E69A5C]/50 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3.5 border-b border-[#26262C] pb-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr ${userB.avatar_color || 'from-[#D98B4A] to-[#26262C]'} text-lg sm:text-xl font-black text-[#F4F4F5] flex items-center justify-center shadow-lg shrink-0`}>
              {userB.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-[#F4F4F5] truncate">{userB.name}</h3>
              <span className="text-xs text-[#A1A1AA] block">Current Weight: <strong className="text-[#E69A5C]">{userB.weight_current} kg</strong></span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#D98B4A]" /> Total Points:
              </span>
              <div className="flex items-center gap-2">
                {statsB.totalPoints > statsA.totalPoints && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#E69A5C] font-mono text-sm sm:text-base">{statsB.totalPoints} pts</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Completed Goals:
              </span>
              <div className="flex items-center gap-2">
                {statsB.totalGoalsCompleted > statsA.totalGoalsCompleted && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 font-bold">Ahead</span>
                )}
                <strong className="text-emerald-400 font-mono text-sm sm:text-base">{statsB.totalGoalsCompleted}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#D98B4A]" /> Logged Workouts:
              </span>
              <div className="flex items-center gap-2">
                {statsB.workoutCount > statsA.workoutCount && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#F4F4F5] font-mono text-sm sm:text-base">{statsB.workoutCount} sessions</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> Net Weight Progress:
              </span>
              <strong className="text-emerald-400 font-mono text-sm sm:text-base">-{statsB.weightLoss} kg</strong>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#D98B4A]" /> Active Gym Streak:
              </span>
              <div className="flex items-center gap-2">
                {statsB.gymStreak > statsA.gymStreak && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#F4F4F5] font-mono text-sm sm:text-base">{statsB.gymStreak} days</strong>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-[#1B1B20] rounded-xl border border-[#26262C]">
              <span className="text-[#A1A1AA] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E69A5C]" /> Clean Sweeps:
              </span>
              <div className="flex items-center gap-2">
                {statsB.cleanSweeps > statsA.cleanSweeps && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D98B4A]/20 text-[#E69A5C] font-bold">Ahead</span>
                )}
                <strong className="text-[#E69A5C] font-mono text-sm sm:text-base">{statsB.cleanSweeps} days</strong>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
