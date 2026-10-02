import React from 'react';
import type { User, Badge, WeeklyChallenge, DailyLog } from '../types';
import { calculateUserPoints } from '../utils/gamification';
import { Award, Trophy, Lock, CheckCircle2, Users } from 'lucide-react';

interface GamificationSectionProps {
  currentUser: User;
  badges: Badge[];
  challenge: WeeklyChallenge;
  dailyLogs: DailyLog[];
}

export const GamificationSection: React.FC<GamificationSectionProps> = ({
  currentUser,
  badges,
  challenge,
  dailyLogs,
}) => {
  const userBadges = badges.filter(b => b.user_id === currentUser.id);
  const totalPoints = calculateUserPoints(dailyLogs, currentUser.id);

  const availableBadgeTypes = [
    { type: 'gym_streak_7', title: '7-Day Gym Beast', desc: 'Complete 7 consecutive gym sessions', icon: '🏋️‍♂️' },
    { type: 'steps_streak_7', title: 'Road Runner', desc: 'Hit 8,000 steps 7 days in a row', icon: '👟' },
    { type: 'no_junk_7', title: 'Iron Discipline', desc: 'No junk food for 7 consecutive days', icon: '🥗' },
    { type: 'weight_loss_3', title: '3kg Weight Loss Hero', desc: 'Lose 3kg from starting weight', icon: '🎉' },
    { type: 'weight_loss_5', title: '5kg Transformer', desc: 'Lose 5kg from starting weight', icon: '🔥' },
    { type: 'workouts_10', title: 'Workout Veteran', desc: 'Log 10 total workout sessions', icon: '💪' },
  ];

  // Dynamically calculate the group's real completed goals from dailyLogs
  const groupCurrentCount = dailyLogs.reduce((total, log) => {
    let count = 0;
    if (log.gym_done) count++;
    if (log.steps_done) count++;
    if (log.sleep_done) count++;
    if (log.water_done) count++;
    if (log.junk_food_avoided) count++;
    return total + count;
  }, 0);

  const groupTargetCount = challenge.target_count || 150;
  const challengePercent = Math.min(100, Math.round((groupCurrentCount / groupTargetCount) * 100));

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Header */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#F4F4F5] flex items-center gap-2">
            <Award className="w-6 h-6 text-[#D98B4A]" />
            Badges, Achievements & Community Challenges
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Earn badges, build streaks, and work together on community goals.
          </p>
        </div>

        <div className="w-full sm:w-auto bg-[#1B1B20] border border-[#26262C] px-4 py-2.5 rounded-xl text-center">
          <span className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wider block">Your Total Points</span>
          <strong className="text-2xl font-black text-[#E69A5C] font-mono">{totalPoints} pts</strong>
        </div>
      </div>

      {/* Weekly Group Challenge Widget */}
      <div className="bg-gradient-to-br from-[#131316] to-[#1B1B20] border-2 border-[#D98B4A]/40 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#D98B4A]/20 text-[#E69A5C] border border-[#D98B4A]/30 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-[#F4F4F5]">{challenge.title}</h3>
              <p className="text-xs text-[#A1A1AA]">{challenge.description}</p>
            </div>
          </div>

          <span className="self-start sm:self-auto text-xs font-bold text-[#E69A5C] bg-[#D98B4A]/15 px-3 py-1.5 rounded-full border border-[#D98B4A]/30 shrink-0">
            {challengePercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#A1A1AA] font-semibold">
            <span>Group Target Progress:</span>
            <span className="font-mono text-[#E69A5C] font-bold">{groupCurrentCount} / {groupTargetCount} Goals</span>
          </div>
          <div className="w-full h-3 bg-[#1B1B20] rounded-full overflow-hidden border border-[#26262C]">
            <div
              className="h-full bg-gradient-to-r from-[#D98B4A] to-[#E69A5C] transition-all duration-500 rounded-full"
              style={{ width: `${challengePercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Badges Showcase Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#F4F4F5] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#D98B4A]" />
          Badge Collection
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
          {availableBadgeTypes.map((badgeDef) => {
            const isEarned = userBadges.some(b => b.badge_type === badgeDef.type);
            const earnedInfo = userBadges.find(b => b.badge_type === badgeDef.type);

            return (
              <div
                key={badgeDef.type}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  isEarned
                    ? 'bg-[#131316] border-[#D98B4A]/60 shadow-lg shadow-[#D98B4A]/10'
                    : 'bg-[#1B1B20]/50 border-[#26262C]/70 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{badgeDef.icon}</div>
                  {isEarned ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D98B4A]/20 text-[#E69A5C] border border-[#D98B4A]/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-[#F4F4F5]">{badgeDef.title}</h4>
                <p className="text-xs text-[#A1A1AA] mt-1">{badgeDef.desc}</p>

                {isEarned && earnedInfo && (
                  <p className="text-[10px] text-[#E69A5C] font-mono mt-3">
                    Earned on {earnedInfo.earned_date}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
