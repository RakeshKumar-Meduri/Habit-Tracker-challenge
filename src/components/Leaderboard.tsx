import React, { useState } from 'react';
import type { User, DailyLog } from '../types';
import { calculateUserPoints } from '../utils/gamification';
import { Trophy, Crown, Lock } from 'lucide-react';

interface LeaderboardProps {
  users: User[];
  dailyLogs: DailyLog[];
  currentUser: User;
  isBasePlan?: boolean;
  onOpenUpgradeModal?: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  users,
  dailyLogs,
  currentUser,
  isBasePlan = false,
  onOpenUpgradeModal,
}) => {
  const [timeframe, setTimeframe] = useState<'all' | 'weekly'>('all');

  if (isBasePlan) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-10 shadow-sm text-center max-w-xl mx-auto my-6 sm:my-8 font-sans space-y-4 text-zinc-900 dark:text-zinc-100">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
          <Trophy className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-900 dark:text-zinc-100 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>PULSE Pro Exclusive</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100">Team Leaderboards & Rankings</h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
            Compete on daily points, streaks, and clean sweeps across your team members. Group rankings are exclusively available on the PULSE Pro Plan.
          </p>
        </div>
        {onOpenUpgradeModal && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="px-6 py-3 btn-primary font-bold text-xs sm:text-sm rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2 mx-auto active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>Upgrade to Pro (from ₹99/mo)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Compute rankings
  const rankings = users.map(user => {
    let filteredLogs = dailyLogs.filter(l => l.user_id === user.id);
    
    if (timeframe === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoff = sevenDaysAgo.toISOString().split('T')[0];
      filteredLogs = filteredLogs.filter(l => l.date >= cutoff);
    }

    const points = calculateUserPoints(filteredLogs, user.id);

    const cleanSweeps = filteredLogs.filter(l => {
      const steps = l.steps_value || 0;
      const hasSteps = steps >= 6000 || l.steps_done;
      return l.gym_done && hasSteps && l.sleep_done && l.junk_food_avoided && l.water_done;
    }).length;

    const totalCompletedGoals = filteredLogs.reduce((acc, log) => {
      let c = 0;
      if (log.gym_done) c++;
      if (log.steps_done || (log.steps_value || 0) >= 6000) c++;
      if (log.sleep_done) c++;
      if (log.junk_food_avoided) c++;
      if (log.water_done) c++;
      return acc + c;
    }, 0);

    return {
      user,
      points,
      cleanSweeps,
      totalCompletedGoals,
    };
  }).sort((a, b) => b.points - a.points);

  const getRankBadge = (rank: number) => {
    if (rank === 0) return { icon: '🥇', label: '1' };
    if (rank === 1) return { icon: '🥈', label: '2' };
    if (rank === 2) return { icon: '🥉', label: '3' };
    return { icon: null, label: `${rank + 1}` };
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto font-sans">
      
      {/* Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-700">
              Rankings
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{rankings.length} Members</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            Group Leaderboard
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            10 points per habit completed daily • Up to 50 daily accountability points
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`py-1.5 px-3.5 text-center rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === 'weekly' 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`py-1.5 px-3.5 text-center rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === 'all' 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm font-bold' 
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Leaderboard Cards List */}
      <div className="space-y-2">
        {rankings.map((item, index) => {
          const badge = getRankBadge(index);
          const isCurrent = item.user.id === currentUser.id;

          return (
            <div
              key={item.user.id}
              className={`rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 sm:gap-4 border ${
                isCurrent 
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-900 dark:border-zinc-100 shadow-sm ring-1 ring-zinc-900/15 dark:ring-zinc-100/20' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
              }`}
            >
              {/* Rank & User Info */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-8 text-center shrink-0">
                  {badge.icon ? (
                    <span className="text-xl sm:text-2xl">{badge.icon}</span>
                  ) : (
                    <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 font-mono">{badge.label}</span>
                  )}
                </div>

                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  {item.user.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {item.user.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <span>{item.totalCompletedGoals} goals</span>
                    <span>•</span>
                    <span>{item.cleanSweeps} clean sweeps</span>
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0 pl-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">Score</span>
                <strong className={`text-xl sm:text-2xl font-extrabold font-mono leading-none ${isCurrent ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {item.points} <span className="text-xs text-zinc-500 dark:text-zinc-400 font-sans font-normal">pts</span>
                </strong>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
