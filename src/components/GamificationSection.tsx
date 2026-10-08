import React from 'react';
import type { User, Badge, WeeklyChallenge, DailyLog } from '../types';
import { calculateUserPoints } from '../utils/gamification';
import { Award, Trophy, Lock, CheckCircle2, Users, Crown, Sparkles } from 'lucide-react';

interface GamificationSectionProps {
  currentUser: User;
  badges: Badge[];
  challenge: WeeklyChallenge;
  dailyLogs: DailyLog[];
  isBasePlan?: boolean;
  onOpenUpgradeModal?: () => void;
}

export const GamificationSection: React.FC<GamificationSectionProps> = ({
  currentUser,
  badges,
  challenge,
  dailyLogs,
  isBasePlan = false,
  onOpenUpgradeModal,
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
      <div className="bg-white dark:bg-[#131316] border border-slate-200 dark:border-[#26262C] rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Award className="w-6 h-6 text-[#3157D5] dark:text-[#D98B4A]" />
            Badges, Achievements & Community Challenges
          </h2>
          <p className="text-xs text-slate-600 dark:text-[#A1A1AA] mt-1">
            Earn badges, build streaks, and work together on community goals.
          </p>
        </div>

        <div className="w-full sm:w-auto bg-slate-50 dark:bg-[#1B1B20] border border-slate-200 dark:border-[#26262C] px-4 py-2.5 rounded-xl text-center">
          <span className="text-[10px] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold tracking-wider block">Your Total Points</span>
          <strong className="text-2xl font-black text-[#3157D5] dark:text-[#E69A5C] font-mono">{totalPoints} pts</strong>
        </div>
      </div>

      {/* Pro Plan Exclusive Paywall Banner */}
      {isBasePlan && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1C1A17] dark:via-[#16161A] dark:to-[#18181C] border-2 border-amber-300 dark:border-[#D98B4A]/50 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-[#D98B4A] border border-amber-400/35 text-xs font-black uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" /> PULSE Pro Exclusive
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F4F4F5] tracking-tight">
              Badges & Squad Challenges Are Pro Features
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A1A1AA] leading-relaxed">
              Unlocking milestone achievement badges, earning verified streaks, and contributing to weekly squad challenges are reserved exclusively for PULSE Pro members.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>Upgrade to PULSE Pro</span>
            </button>
            <span className="text-xs text-slate-600 dark:text-[#71717A] font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Starting at ₹83/month
            </span>
          </div>
        </div>
      )}

      {/* Weekly Group Challenge Widget */}
      <div 
        onClick={isBasePlan ? onOpenUpgradeModal : undefined}
        className={`bg-white dark:bg-gradient-to-br dark:from-[#131316] dark:to-[#1B1B20] border-2 border-slate-200 dark:border-[#D98B4A]/40 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-xl space-y-4 transition ${
          isBasePlan ? 'opacity-60 cursor-pointer hover:border-[#3157D5] dark:hover:border-[#D98B4A] hover:opacity-80' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 text-[#3157D5] border border-[#3157D5]/20 dark:bg-[#D98B4A]/20 dark:text-[#E69A5C] dark:border-[#D98B4A]/30 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#F4F4F5]">{challenge.title}</h3>
                {isBasePlan && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF8FF] text-[#3157D5] border border-[#3157D5]/30 dark:bg-[#D98B4A]/20 dark:text-[#D98B4A] dark:border-[#D98B4A]/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-[#A1A1AA]">{challenge.description}</p>
            </div>
          </div>

          <span className="self-start sm:self-auto text-xs font-bold text-[#3157D5] bg-[#EFF8FF] border border-[#3157D5]/30 dark:text-[#E69A5C] dark:bg-[#D98B4A]/15 dark:border-[#D98B4A]/30 px-3 py-1.5 rounded-full shrink-0">
            {challengePercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600 dark:text-[#A1A1AA] font-semibold">
            <span>Group Target Progress:</span>
            <span className="font-mono text-[#3157D5] dark:text-[#E69A5C] font-bold">{groupCurrentCount} / {groupTargetCount} Goals</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-[#1B1B20] rounded-full overflow-hidden border border-slate-200 dark:border-[#26262C]">
            <div
              className="h-full bg-gradient-to-r from-[#3157D5] to-[#2544B8] dark:from-[#D98B4A] dark:to-[#E69A5C] transition-all duration-500 rounded-full"
              style={{ width: `${challengePercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Badges Showcase Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F4F4F5] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#3157D5] dark:text-[#D98B4A]" />
            Badge Collection
          </h3>
          {isBasePlan && (
            <span className="text-xs text-[#3157D5] dark:text-[#D98B4A] font-semibold flex items-center gap-1 cursor-pointer" onClick={onOpenUpgradeModal}>
              <Lock className="w-3.5 h-3.5" /> Pro Exclusive Collection
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
          {availableBadgeTypes.map((badgeDef) => {
            const isEarned = !isBasePlan && userBadges.some(b => b.badge_type === badgeDef.type);
            const earnedInfo = !isBasePlan ? userBadges.find(b => b.badge_type === badgeDef.type) : undefined;

            return (
              <div
                key={badgeDef.type}
                onClick={isBasePlan ? onOpenUpgradeModal : undefined}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  isBasePlan
                    ? 'bg-slate-50/80 border-slate-200 dark:bg-[#18181C]/60 dark:border-[#26262C] hover:border-[#3157D5]/40 cursor-pointer'
                    : isEarned
                      ? 'bg-white border-[#3157D5]/40 shadow-md dark:bg-[#131316] dark:border-[#D98B4A]/60 dark:shadow-[#D98B4A]/10'
                      : 'bg-slate-50/90 border-slate-200 dark:bg-[#1B1B20]/50 dark:border-[#26262C]/70'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`text-3xl ${!isEarned ? 'grayscale-[30%] opacity-80' : ''}`}>{badgeDef.icon}</div>
                  {isBasePlan ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF8FF] text-[#3157D5] border border-[#3157D5]/30 dark:bg-[#D98B4A]/15 dark:text-[#D98B4A] dark:border-[#D98B4A]/30 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Pro Exclusive
                    </span>
                  ) : isEarned ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-[#D98B4A]/20 dark:text-[#E69A5C] dark:border-[#D98B4A]/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 border border-slate-300 dark:bg-[#1B1B20] dark:text-[#A1A1AA] dark:border-[#26262C] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-[#F4F4F5]">{badgeDef.title}</h4>
                <p className="text-xs text-slate-600 dark:text-[#A1A1AA] mt-1">{badgeDef.desc}</p>

                {isEarned && earnedInfo && (
                  <p className="text-[10px] text-emerald-700 dark:text-[#E69A5C] font-mono mt-3">
                    Earned on {earnedInfo.earned_date}
                  </p>
                )}
                {isBasePlan && (
                  <p className="text-[10px] text-[#3157D5] dark:text-[#D98B4A] font-semibold mt-3 flex items-center gap-1">
                    Upgrade to Pro to earn this badge
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
