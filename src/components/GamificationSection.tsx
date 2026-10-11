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
    <div className="space-y-6 max-w-5xl mx-auto font-sans text-zinc-900 dark:text-zinc-100">
      
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            Badges, Achievements & Community Challenges
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Earn badges, build streaks, and work together on community goals.
          </p>
        </div>

        <div className="w-full sm:w-auto bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl text-center">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider block">Your Total Points</span>
          <strong className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono">{totalPoints} pts</strong>
        </div>
      </div>

      {/* Pro Plan Exclusive Paywall Banner */}
      {isBasePlan && (
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" /> PULSE Pro Exclusive
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Badges & Squad Challenges Are Pro Features
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Unlocking milestone achievement badges, earning verified streaks, and contributing to weekly squad challenges are reserved exclusively for PULSE Pro members.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] btn-primary font-bold rounded-xl text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Crown className="w-4 h-4" />
              <span>Upgrade to PULSE Pro</span>
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Starting at ₹83/month
            </span>
          </div>
        </div>
      )}

      {/* Weekly Group Challenge Widget */}
      <div 
        onClick={isBasePlan ? onOpenUpgradeModal : undefined}
        className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 transition ${
          isBasePlan ? 'opacity-60 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 hover:opacity-80' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">{challenge.title}</h3>
                {isBasePlan && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> PRO
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{challenge.description}</p>
            </div>
          </div>

          <span className="self-start sm:self-auto text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-full shrink-0">
            {challengePercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 font-semibold">
            <span>Group Target Progress:</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">{groupCurrentCount} / {groupTargetCount} Goals</span>
          </div>
          <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-500 rounded-full"
              style={{ width: `${challengePercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Badges Showcase Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            Badge Collection
          </h3>
          {isBasePlan && (
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold flex items-center gap-1 cursor-pointer" onClick={onOpenUpgradeModal}>
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
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isBasePlan
                    ? 'bg-white border-zinc-200 hover:border-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer shadow-sm'
                    : isEarned
                      ? 'bg-white border-zinc-900 dark:border-zinc-100 shadow-sm dark:bg-zinc-900'
                      : 'bg-white border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800 shadow-sm opacity-70'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`text-3xl ${!isEarned ? 'grayscale opacity-60' : ''}`}>{badgeDef.icon}</div>
                  {isBasePlan ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Pro Exclusive
                    </span>
                  ) : isEarned ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{badgeDef.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">{badgeDef.desc}</p>

                {isEarned && earnedInfo && (
                  <p className="text-[10px] text-zinc-700 dark:text-zinc-300 font-mono mt-3">
                    Earned on {earnedInfo.earned_date}
                  </p>
                )}
                {isBasePlan && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold mt-3 flex items-center gap-1">
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
