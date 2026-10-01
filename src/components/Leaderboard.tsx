import React, { useState } from 'react';
import type { User, DailyLog } from '../types';
import { calculateUserPoints } from '../utils/gamification';
import { Trophy, Flame, Zap } from 'lucide-react';

interface LeaderboardProps {
  users: User[];
  dailyLogs: DailyLog[];
  currentUser: User;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  users,
  dailyLogs,
  currentUser,
}) => {
  const [timeframe, setTimeframe] = useState<'all' | 'weekly'>('all');

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
    if (rank === 0) return { title: '1st Place', icon: '🥇', bg: 'from-[#c68b59]/30 to-[#b87b4b]/20 border-[#c68b59]' };
    if (rank === 1) return { title: '2nd Place', icon: '🥈', bg: 'from-[#26201b] to-[#26201b] border-[#3d322a]' };
    if (rank === 2) return { title: '3rd Place', icon: '🥉', bg: 'from-[#26201b] to-[#26201b] border-[#3d322a]' };
    return { title: `${rank + 1}th Place`, icon: `#${rank + 1}`, bg: 'from-[#26201b] to-[#26201b] border-[#3d322a]' };
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Header */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#f5efe6] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#c68b59]" />
            Group Fitness Leaderboard
          </h2>
          <p className="text-xs text-[#c5b4a5] mt-1">
            Points allocated per completed goal, bonus points for step tiers (6k–10k+) and clean sweeps!
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 bg-[#1c1815] p-1 rounded-xl border border-[#3d322a]">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`py-1.5 px-3 text-center rounded-lg text-xs font-bold transition cursor-pointer ${
              timeframe === 'weekly' ? 'bg-[#c68b59] text-[#1c1815] shadow-md' : 'text-[#c5b4a5] hover:text-[#f5efe6]'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`py-1.5 px-3 text-center rounded-lg text-xs font-bold transition cursor-pointer ${
              timeframe === 'all' ? 'bg-[#c68b59] text-[#1c1815] shadow-md' : 'text-[#c5b4a5] hover:text-[#f5efe6]'
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Leaderboard Cards List */}
      <div className="space-y-2.5 sm:space-y-3">
        {rankings.map((item, index) => {
          const badge = getRankBadge(index);
          const isCurrent = item.user.id === currentUser.id;

          return (
            <div
              key={item.user.id}
              className={`relative bg-gradient-to-r ${badge.bg} border rounded-2xl p-3.5 sm:p-5 transition-all shadow-lg flex items-center justify-between gap-3 sm:gap-4 ${
                isCurrent ? 'ring-2 ring-[#c68b59] shadow-[#c68b59]/20' : ''
              }`}
            >
              {/* Rank Icon & Avatar & Info */}
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                <div className="text-base sm:text-2xl font-black min-w-[28px] sm:min-w-[36px] text-center text-[#d4a373] shrink-0">
                  {badge.icon}
                </div>

                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr ${item.user.avatar_color || 'from-[#c68b59] to-[#785338]'} text-sm sm:text-base font-black text-[#f5efe6] flex items-center justify-center shadow-md shrink-0`}>
                  {item.user.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#f5efe6] flex items-center gap-1.5 sm:gap-2 truncate">
                    <span className="truncate">{item.user.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-[#c68b59]/20 text-[#d4a373] font-bold border border-[#c68b59]/30 shrink-0">
                        YOU
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-[#c5b4a5] mt-0.5">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#d4a373]" /> {item.totalCompletedGoals} goals
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#c68b59]" /> {item.cleanSweeps} clean sweeps
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Points Score */}
              <div className="text-right shrink-0 pl-2">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#c5b4a5] font-bold block">Score</span>
                <strong className="text-xl sm:text-3xl font-black text-[#d4a373] font-mono leading-none">
                  {item.points} <span className="text-[10px] sm:text-xs text-[#c5b4a5] font-sans font-normal">pts</span>
                </strong>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
