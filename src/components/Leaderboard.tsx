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
      <div className="bg-[#131316] border border-[#26262C] rounded-2xl p-6 sm:p-10 shadow-xl text-center max-w-xl mx-auto my-6 sm:my-8 font-sans space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#FBBF24]">
          <Trophy className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D98B4A]/10 border border-[#D98B4A]/25 rounded-full text-[#D98B4A] text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>PULSE Pro Exclusive</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#F4F4F5]">Team Leaderboards & Rankings</h3>
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed max-w-md mx-auto">
            Compete on daily points, streaks, and clean sweeps across your team members. Group rankings are exclusively available on the PULSE Pro Plan.
          </p>
        </div>
        {onOpenUpgradeModal && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="px-6 py-3 bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] hover:from-[#B45F1E] hover:to-[#8E4410] text-[#0B0B0D] font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#D98B4A]/25 transition cursor-pointer flex items-center gap-2 mx-auto active:scale-95"
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
      <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3157D5] bg-[#EFF8FF] px-2 py-0.5 rounded-full border border-[#3157D5]/20">
              Rankings
            </span>
            <span className="text-xs text-[#667085]">{rankings.length} Members</span>
          </div>
          <h2 className="text-xl font-bold text-[#111827] mt-1">
            Group Leaderboard
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            10 points per habit completed daily • Up to 50 daily accountability points
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-xl border border-[#E4E7EC]">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`py-1.5 px-3.5 text-center rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === 'weekly' ? 'bg-white text-[#111827] shadow-sm font-bold' : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`py-1.5 px-3.5 text-center rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === 'all' ? 'bg-white text-[#111827] shadow-sm font-bold' : 'text-[#667085] hover:text-[#111827]'
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
              className={`rounded-[12px] p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 sm:gap-4 border ${
                isCurrent 
                  ? 'bg-[#EFF4FF] border-[#3157D5]/35 shadow-[0_1px_3px_rgba(49,87,213,0.08)]' 
                  : 'bg-white border-[#E4E7EC] hover:border-[#D0D5DD] shadow-[0_1px_3px_rgba(16,24,40,0.04)]'
              }`}
            >
              {/* Rank & User Info */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-8 text-center shrink-0">
                  {badge.icon ? (
                    <span className="text-xl sm:text-2xl">{badge.icon}</span>
                  ) : (
                    <span className="text-sm font-bold text-[#667085] font-mono">{badge.label}</span>
                  )}
                </div>

                <div className="w-10 h-10 rounded-xl bg-[#F1F3F6] border border-[#E4E7EC] text-sm font-bold text-[#111827] flex items-center justify-center shrink-0">
                  {item.user.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111827] truncate">
                      {item.user.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#3157D5] text-white font-bold shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#667085] mt-0.5">
                    <span>{item.totalCompletedGoals} goals</span>
                    <span>•</span>
                    <span>{item.cleanSweeps} clean sweeps</span>
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0 pl-2">
                <span className="text-[10px] uppercase tracking-wider text-[#667085] font-semibold block">Score</span>
                <strong className={`text-xl sm:text-2xl font-extrabold font-mono leading-none ${isCurrent ? 'text-[#3157D5]' : 'text-[#111827]'}`}>
                  {item.points} <span className="text-xs text-[#667085] font-sans font-normal">pts</span>
                </strong>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
