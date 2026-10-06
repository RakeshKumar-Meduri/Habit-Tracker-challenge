import React, { useState } from 'react';
import type { 
  User, 
  DailyLog, 
  Workout,
  MissedReason, 
  GoalType, 
  ReasonTag, 
  AdminSettings,
  Supplement,
  SupplementLog,
  CustomHabit,
  CustomHabitLog,
  Group
} from '../types';
import { calculateSleepDuration } from '../utils/crypto';
import { calculateGoalStreak, calculateUserPoints } from '../utils/gamification';
import { isLogForUser, isWorkoutForUser } from '../utils/userMatcher';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Footprints, 
  Moon, 
  UtensilsCrossed, 
  Droplets, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Plus,
  Pill,
  Lock,
  Trash2,
  ListCheck,
  Users,
  Eye,
  RotateCcw,
  RefreshCw,
  Crown
} from 'lucide-react';

interface DailyChecklistProps {
  currentUser: User;
  allUsers?: User[];
  allDailyLogs?: DailyLog[];
  allWorkouts?: Workout[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  dailyLog: DailyLog;
  missedReasons: MissedReason[];
  adminSettings?: AdminSettings;
  currentGroup?: Group | null;
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  customHabits: CustomHabit[];
  customHabitLogs: CustomHabitLog[];
  onUpdateDailyLog: (updatedLog: DailyLog) => void;
  onSaveMissedReason: (reason: MissedReason) => void;
  onRemoveMissedReason?: (reasonId: string) => void;
  onOpenWorkoutModal: () => void;
  onDeleteWorkout?: (id: string) => void;
  gymWorkoutsCount: number;
  onAddSupplement: (supp: Supplement) => void;
  onDeleteSupplement: (suppId: string) => void;
  onToggleSupplementLog: (suppId: string, date: string, taken: boolean) => void;
  onAddCustomHabit: (habit: CustomHabit) => void;
  onDeleteCustomHabit: (habitId: string) => void;
  onToggleCustomHabitLog: (habitId: string, date: string, completed: boolean) => void;
  onOpenCalendar?: () => void;
  onRefreshMembers?: () => void;
  isRefreshingMembers?: boolean;
  isBasePlan?: boolean;
  onOpenUpgradeModal?: () => void;
}

export const DailyChecklist: React.FC<DailyChecklistProps> = ({
  currentUser,
  allUsers,
  allDailyLogs,
  allWorkouts,
  selectedDate,
  setSelectedDate,
  dailyLog,
  missedReasons,
  adminSettings,
  currentGroup,
  supplements,
  supplementLogs,
  customHabits,
  customHabitLogs,
  onUpdateDailyLog,
  onSaveMissedReason,
  onRemoveMissedReason,
  onOpenWorkoutModal,
  onDeleteWorkout,
  gymWorkoutsCount: _gymWorkoutsCount,
  onAddSupplement,
  onDeleteSupplement,
  onToggleSupplementLog,
  onAddCustomHabit,
  onDeleteCustomHabit,
  onToggleCustomHabitLog,
  onOpenCalendar,
  onRefreshMembers,
  isRefreshingMembers = false,
  isBasePlan = false,
  onOpenUpgradeModal,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser.id);
  const isViewingOther = selectedMemberId !== currentUser.id;
  const targetUser = allUsers?.find(u => u.id === selectedMemberId) || currentUser;

  const [activeMissedGoal, setActiveMissedGoal] = useState<GoalType | null>(null);
  const [selectedTag, setSelectedTag] = useState<ReasonTag>('Tired');
  const [customReasonText, setCustomReasonText] = useState('');

  // Supplement Form Modal & Inline Quick-Add State
  const [isAddSuppOpen, setIsAddSuppOpen] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppDosage, setSuppDosage] = useState('');
  const [suppTiming, setSuppTiming] = useState('Morning');
  const [inlineSuppName, setInlineSuppName] = useState('');
  const [inlineSuppTiming, setInlineSuppTiming] = useState('');

  // Custom Habit Form Modal & Inline Quick-Add State
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [inlineHabitTitle, setInlineHabitTitle] = useState('');
  const [inlineHabitDesc, setInlineHabitDesc] = useState('');

  const stepTarget = currentGroup?.step_target || adminSettings?.step_target || 10000;
  const sleepMin = adminSettings?.sleep_min_hours || 7.0;
  const sleepMax = adminSettings?.sleep_max_hours || 9.0;
  const waterTarget = adminSettings?.water_target_ml || 2500;

  // The daily log to display: if viewing other member, find their log for selectedDate using resilient matcher
  const actualMemberLog = isViewingOther
    ? allDailyLogs?.find(l => (l.user_id === selectedMemberId || isLogForUser(l, targetUser, allUsers)) && l.date === selectedDate)
    : (allDailyLogs?.find(l => (l.user_id === currentUser.id || isLogForUser(l, currentUser, allUsers)) && l.date === selectedDate) || dailyLog);

  const hasLoggedForDate = isViewingOther ? !!actualMemberLog : true;

  const displayedDailyLog: DailyLog = actualMemberLog || {
    id: `view_${selectedMemberId}_${selectedDate}`,
    user_id: selectedMemberId,
    date: selectedDate,
    gym_done: false,
    steps_done: false,
    sleep_done: false,
    junk_food_avoided: false,
    water_done: false,
    steps_value: 0,
    steps_target: stepTarget,
    sleep_start: '23:00',
    sleep_end: '07:00',
    sleep_duration: 8,
    water_intake_ml: 0,
  };

  const [deletedWorkoutIds, setDeletedWorkoutIds] = useState<Set<string>>(new Set());

  const targetWorkouts = (allWorkouts || [])
    .filter(w => {
      if (!w) return false;
      const wid = String(w.id || (w as any)._id || '').trim();
      if (deletedWorkoutIds.has(wid)) return false;
      return (w.user_id === targetUser.id || isWorkoutForUser(w, targetUser, allUsers)) && w.date === selectedDate;
    });
  const targetWorkoutsCount = targetWorkouts.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedY, selectedM, selectedD] = selectedDate.split('-').map(Number);
  const isSunday = new Date(selectedY, selectedM - 1, selectedD).getDay() === 0;

  const handleDateChange = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + offset);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleToggleFailed = (goal: GoalType) => {
    if (isViewingOther) return;
    const reason = getGoalMissedReason(goal);
    if (reason && onRemoveMissedReason) {
      onRemoveMissedReason(reason.id);
    } else {
      setActiveMissedGoal(goal);
    }
  };

  const clearFailedIfAny = (goal: GoalType) => {
    const reason = getGoalMissedReason(goal);
    if (reason && onRemoveMissedReason) {
      onRemoveMissedReason(reason.id);
    }
  };

  const handleToggleGoal = (goal: GoalType, currentValue: boolean) => {
    if (isViewingOther) return;
    if (!currentValue) {
      clearFailedIfAny(goal);
    }
    const newValue = !currentValue;

    if (goal === 'gym') {
      const updatedLog = { ...dailyLog, gym_done: newValue };
      onUpdateDailyLog(updatedLog);
      if (newValue) {
        onOpenWorkoutModal();
      }
    } else if (goal === 'steps') {
      onUpdateDailyLog({ ...dailyLog, steps_done: newValue, steps_target: stepTarget });
    } else if (goal === 'sleep') {
      onUpdateDailyLog({ ...dailyLog, sleep_done: newValue });
    } else if (goal === 'junk_food') {
      onUpdateDailyLog({ ...dailyLog, junk_food_avoided: newValue });
    } else if (goal === 'water') {
      const newWaterMl = newValue ? waterTarget : 0;
      onUpdateDailyLog({ ...dailyLog, water_done: newValue, water_intake_ml: newWaterMl, water_target_ml: waterTarget });
    }
  };

  const handleSleepTimeChange = (startTime?: string, endTime?: string) => {
    if (isViewingOther) return;
    const sStart = startTime !== undefined ? startTime : (dailyLog.sleep_start || '23:00');
    const sEnd = endTime !== undefined ? endTime : (dailyLog.sleep_end || '07:00');
    const duration = calculateSleepDuration(sStart, sEnd);
    const isTargetHit = duration >= sleepMin && duration <= sleepMax;

    onUpdateDailyLog({
      ...dailyLog,
      sleep_start: sStart,
      sleep_end: sEnd,
      sleep_duration: duration,
      sleep_done: isTargetHit,
    });
  };

  const handleAddWater = (ml: number) => {
    if (isViewingOther) return;
    const currentMl = dailyLog.water_intake_ml || 0;
    const newMl = Math.min(6000, currentMl + ml);
    const isDone = newMl >= waterTarget;
    onUpdateDailyLog({
      ...dailyLog,
      water_intake_ml: newMl,
      water_done: isDone,
      water_target_ml: waterTarget,
    });
  };

  const handleSaveMissedReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMissedGoal) return;

    const newReason: MissedReason = {
      id: `mr_${dailyLog.id}_${activeMissedGoal}_${Date.now()}`,
      daily_log_id: dailyLog.id,
      user_id: currentUser.id,
      date: selectedDate,
      goal_type: activeMissedGoal,
      reason_tag: selectedTag,
      reason_text: customReasonText.trim(),
    };

    onSaveMissedReason(newReason);
    
    // Automatically set that goal to false when marked as failed
    const updatedLog = { ...dailyLog };
    if (activeMissedGoal === 'gym') updatedLog.gym_done = false;
    else if (activeMissedGoal === 'steps') updatedLog.steps_done = false;
    else if (activeMissedGoal === 'sleep') updatedLog.sleep_done = false;
    else if (activeMissedGoal === 'junk_food') updatedLog.junk_food_avoided = false;
    else if (activeMissedGoal === 'water') updatedLog.water_done = false;
    onUpdateDailyLog(updatedLog);

    setActiveMissedGoal(null);
    setCustomReasonText('');
  };

  const handleCreateSupplement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim()) return;

    const newSupp: Supplement = {
      id: `supp_${currentUser.id}_${Date.now()}`,
      user_id: currentUser.id,
      name: suppName.trim(),
      dosage: suppDosage.trim(),
      timing: suppTiming,
    };

    onAddSupplement(newSupp);
    setSuppName('');
    setSuppDosage('');
    setIsAddSuppOpen(false);
  };

  const handleInlineAddSupplement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineSuppName.trim()) return;

    const newSupp: Supplement = {
      id: `supp_${currentUser.id}_${Date.now()}`,
      user_id: currentUser.id,
      name: inlineSuppName.trim(),
      dosage: inlineSuppTiming.trim() || 'Daily',
      timing: inlineSuppTiming.trim() || 'Daily',
    };

    onAddSupplement(newSupp);
    setInlineSuppName('');
    setInlineSuppTiming('');
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    const newHabit: CustomHabit = {
      id: `habit_${currentUser.id}_${Date.now()}`,
      user_id: currentUser.id,
      title: habitTitle.trim(),
      description: habitDesc.trim(),
      is_private: true,
      created_at: new Date().toISOString(),
    };

    onAddCustomHabit(newHabit);
    setHabitTitle('');
    setHabitDesc('');
    setIsAddHabitOpen(false);
  };

  const handleInlineAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineHabitTitle.trim()) return;

    const newHabit: CustomHabit = {
      id: `habit_${currentUser.id}_${Date.now()}`,
      user_id: currentUser.id,
      title: inlineHabitTitle.trim(),
      description: inlineHabitDesc.trim(),
      is_private: true,
      created_at: new Date().toISOString(),
    };

    onAddCustomHabit(newHabit);
    setInlineHabitTitle('');
    setInlineHabitDesc('');
  };

  const userSupplements = supplements.filter(s => s.user_id === targetUser.id);
  const userHabits = customHabits.filter(h => h.user_id === targetUser.id);

  // Supplements Tracking Stats for targetUser on selectedDate
  const supplementsTakenCount = userSupplements.filter(s => {
    const l = supplementLogs.find(log => log.supplement_id === s.id && log.date === selectedDate);
    return !!l?.taken;
  }).length;
  const supplementsTotal = userSupplements.length;
  const supplementsPercent = supplementsTotal > 0 ? Math.round((supplementsTakenCount / supplementsTotal) * 100) : 0;

  // Custom Habits Tracking Stats for targetUser on selectedDate
  const habitsCompletedCount = userHabits.filter(h => {
    const l = customHabitLogs.find(log => log.habit_id === h.id && log.date === selectedDate);
    return !!l?.completed;
  }).length;
  const habitsTotal = userHabits.length;
  const habitsPercent = habitsTotal > 0 ? Math.round((habitsCompletedCount / habitsTotal) * 100) : 0;

  const isGymSatisfied = isSunday || displayedDailyLog.gym_done;

  const completedCount = [
    isGymSatisfied,
    displayedDailyLog.steps_done,
    displayedDailyLog.sleep_done,
    displayedDailyLog.junk_food_avoided,
    displayedDailyLog.water_done,
  ].filter(Boolean).length;

  // Collective team goal statistics for selectedDate across all active group members
  const activeMembersList = allUsers && allUsers.length > 0 ? allUsers : [currentUser];
  const teamTotalTarget = activeMembersList.length * 5;
  const teamCompletedCount = activeMembersList.reduce((total, u) => {
    const log = allDailyLogs?.find(l => l.user_id === u.id && l.date === selectedDate);
    let count = 0;
    if (isSunday || log?.gym_done) count++;
    if (log?.steps_done) count++;
    if (log?.sleep_done) count++;
    if (log?.junk_food_avoided) count++;
    if (log?.water_done) count++;
    return total + count;
  }, 0);
  const teamCompletionPercent = Math.min(100, Math.round((teamCompletedCount / teamTotalTarget) * 100));

  const getGoalMissedReason = (goal: GoalType) => {
    return missedReasons.find(
      r => r.goal_type === goal && r.user_id === targetUser.id && (r.daily_log_id === displayedDailyLog.id || r.date === selectedDate)
    );
  };

  // Section 14 & 18 Dynamic Momentum & Streak Calculations
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const currentStreak = calculateGoalStreak(allDailyLogs || [], currentUser, 'gym', allUsers);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const workoutsThisWeek = last7Days.filter(dateStr => {
    const hasWorkout = allWorkouts?.some(w => isWorkoutForUser(w, currentUser, allUsers) && w.date === dateStr);
    const log = allDailyLogs?.find(l => isLogForUser(l, currentUser, allUsers) && l.date === dateStr);
    return hasWorkout || log?.gym_done;
  }).length;

  const totalGroupMembers = activeMembersList.length;
  const userRankings = activeMembersList.map(u => ({
    id: u.id,
    points: calculateUserPoints(allDailyLogs || [], u, allUsers),
  })).sort((a, b) => b.points - a.points);
  const userRank = Math.max(1, userRankings.findIndex(r => r.id === currentUser.id) + 1);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">

      {/* Section 14 & 18: Hero Greeting & Key Momentum Metrics */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              {greeting}, {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#667085]">
              Here is your daily momentum and consistency breakdown for today.
            </p>
          </div>
        </div>

        {/* 4 Restrained Overview Cards (Score, Workouts, Streak, Group Rank) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Today's Score</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#111827] tabular-nums">
                {displayedDailyLog.points_earned !== undefined ? displayedDailyLog.points_earned : (completedCount * 10)}
              </span>
              <span className="text-xs text-[#98A2B3] font-semibold">/ 50</span>
            </div>
          </div>

          <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Workouts</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#111827] tabular-nums">{workoutsThisWeek}</span>
              <span className="text-xs text-[#98A2B3] font-semibold">/ 7</span>
            </div>
          </div>

          <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Streak</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#111827] tabular-nums">{currentStreak}</span>
              <span className="text-sm">🔥</span>
            </div>
          </div>

          {isBasePlan ? (
            <button
              type="button"
              onClick={() => onOpenUpgradeModal?.()}
              className="bg-white border border-[#E4E7EC] hover:border-[#D98B4A]/50 rounded-[14px] p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)] text-left transition cursor-pointer group"
              title="Team Goals & Squad Ranking are exclusively available on PULSE Pro"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Team Goals</span>
                <Crown className="w-3.5 h-3.5 text-[#D98B4A] group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-bold text-[#D98B4A] bg-[#D98B4A]/10 border border-[#D98B4A]/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Pro Only
                </span>
              </div>
            </button>
          ) : (
            <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
              <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">Group Rank</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-bold text-[#3157D5] tabular-nums">#{userRank}</span>
                <span className="text-xs text-[#98A2B3] font-semibold">of {totalGroupMembers}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Member Accountability Selector - Hidden for Base (Solo) Plan */}
      {!isBasePlan && (
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[rgba(217,139,74,0.12)] text-[#D98B4A] border border-[rgba(217,139,74,0.25)] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#F4F4F5]">
                  Member Checklist Viewer
                </h3>
                {isViewingOther ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-[#FBBF24] border border-amber-500/25 font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Viewing {targetUser.name}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(217,139,74,0.12)] text-[#D98B4A] border border-[#D98B4A]/25 font-semibold">
                    Viewing Yourself
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C] font-mono tabular-nums">
                  {allUsers && allUsers.length > 0 ? allUsers.length : 1} {(allUsers?.length || 1) === 1 ? 'member' : 'members'}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Inspect your own or your teammates' daily habits & accountability
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
              <label htmlFor="member-checklist-select" className="text-xs font-semibold text-[#A1A1AA] shrink-0">
                Member:
              </label>
              <select
                id="member-checklist-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="flex-1 sm:w-52 md:w-60 min-h-[42px] bg-[#1B1B20] text-[#F4F4F5] font-bold text-xs border border-[#26262C] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
              >
                {allUsers && allUsers.length > 0 ? (
                  allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id === currentUser.id ? `👤 You (${u.name})` : `👥 ${u.name} (@${u.username})`}
                    </option>
                  ))
                ) : (
                  <option value={currentUser.id}>👤 You ({currentUser.name})</option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {onRefreshMembers && (
                <button
                  type="button"
                  onClick={onRefreshMembers}
                  disabled={isRefreshingMembers}
                  title="Refresh and sync member list from server"
                  aria-label="Refresh and sync member list"
                  className="min-h-[40px] px-3 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#D98B4A] hover:text-[#E69A5C] text-xs font-bold rounded-xl border border-[#26262C] hover:border-[#D98B4A]/40 transition shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingMembers ? 'Syncing...' : 'Sync'}</span>
                </button>
              )}

              {isViewingOther && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberId(currentUser.id)}
                  title="Return to your personal checklist"
                  className="min-h-[40px] px-3 py-2 bg-[#D98B4A]/20 hover:bg-[#D98B4A]/30 text-[#E69A5C] text-xs font-bold rounded-xl border border-[#D98B4A]/40 transition shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D98B4A]" />
                  <span>Reset to Me</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prominent Mobile-Friendly "Viewing Other Member" Alert Banner */}
        {isViewingOther && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-[#FBBF24]">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#F4F4F5] font-bold truncate">
                  Viewing {targetUser.name}'s Checklist
                </p>
                <p className="text-[11px] text-[#A1A1AA]">
                  Read-only mode • Actions log to your own profile
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMemberId(currentUser.id)}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to My Checklist</span>
            </button>
          </div>
        )}

        {/* Helpful alert if only 1 member is currently present in local state */}
        {allUsers && allUsers.length <= 1 && (
          <div className="bg-[#1B1B20]/60 border border-[#26262C] rounded-lg p-2.5 flex flex-col xs:flex-row items-start xs:items-center justify-between text-xs text-[#A1A1AA] gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <span>Only 1 member is loaded locally. If your teammate joined recently, tap <strong>Sync</strong> to refresh the members list.</span>
            </div>
            {onRefreshMembers && (
              <button
                type="button"
                onClick={onRefreshMembers}
                disabled={isRefreshingMembers}
                className="px-2.5 py-1 bg-[rgba(217,139,74,0.12)] hover:bg-[rgba(217,139,74,0.20)] text-[#D98B4A] font-bold text-[11px] rounded border border-[#D98B4A]/30 shrink-0 cursor-pointer transition flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
                <span>{isRefreshingMembers ? 'Syncing...' : 'Sync Members'}</span>
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* Solo Plan Banner for Base Users */}
      {isBasePlan && (
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#A1A1AA] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(217,139,74,0.15)] text-[#D98B4A] font-extrabold uppercase tracking-wider">Base Solo Plan</span>
            <span>Personal tracking active. Upgrade to Pro for group formation and team challenges.</span>
          </div>
          {onOpenUpgradeModal && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="text-[#D98B4A] hover:text-[#E69A5C] hover:underline font-bold shrink-0 cursor-pointer text-left sm:text-right"
            >
              Upgrade to Pro →
            </button>
          )}
        </div>
      )}

      {/* Read-Only Notice when viewing another member */}
      {isViewingOther && (
        <div className={`rounded-xl p-3 flex items-center justify-between text-xs border ${
          hasLoggedForDate 
            ? 'bg-amber-500/10 border-amber-500/25 text-[#FBBF24]' 
            : 'bg-zinc-800/60 border-zinc-700/50 text-[#A1A1AA]'
        }`}>
          <div className="flex items-center gap-2">
            {hasLoggedForDate ? (
              <Eye className="w-4 h-4 text-[#FBBF24] shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span>
              Viewing <strong>{targetUser.name}</strong>'s daily checklist for <strong>{selectedDate}</strong>.
              {!hasLoggedForDate && (
                <span className="ml-1 text-zinc-300 font-medium">
                  — No checklist entry recorded by {targetUser.name} for this date yet.
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Collective Team Daily Goal Progress Bar - Pro Exclusive */}
      {isBasePlan ? (
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#D98B4A]/15 border border-[#D98B4A]/30 flex items-center justify-center text-[#D98B4A] font-bold shrink-0 shadow-sm">
                <Users className="w-4 h-4 text-[#D98B4A]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                  Team Daily Goals
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(217,139,74,0.12)] text-[#D98B4A] font-bold border border-[#D98B4A]/25 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> PULSE Pro Exclusive
                  </span>
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Collective squad targets, combined progress bars, and team accountability are exclusively available on PULSE Pro.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenUpgradeModal?.()}
              className="self-start sm:self-auto px-4 py-2 min-h-[36px] bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] hover:from-[#E69A5C] hover:to-[#D98B4A] text-[#131316] font-bold rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Unlock Team Goals</span>
            </button>
          </div>

          {/* Locked Preview Progress Bar */}
          <div className="w-full h-2.5 bg-[#1B1B20] rounded-full overflow-hidden border border-[#26262C] opacity-35">
            <div className="h-full bg-[#D98B4A]/50 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      ) : (
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D98B4A] flex items-center justify-center text-[#0B0B0D] font-black shrink-0 shadow-sm">
              <Users className="w-4 h-4 text-[#0B0B0D]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                Team Daily Goal Progress
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(217,139,74,0.12)] text-[#D98B4A] font-bold border border-[#D98B4A]/25 tabular-nums">
                  {teamCompletionPercent}% Together
                </span>
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                Collective accountability across all {activeMembersList.length} {activeMembersList.length === 1 ? 'member' : 'members'} for {selectedDate}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-[#D98B4A] font-mono font-bold tabular-nums">
              {teamCompletedCount} / {teamTotalTarget} Goals Met
            </span>
          </div>
        </div>

        {/* Combined Team Progress Bar */}
        <div className="w-full h-2.5 bg-[#1B1B20] rounded-full overflow-hidden border border-[#26262C] relative">
          <div
            className="h-full bg-[#D98B4A] transition-all duration-500 rounded-full"
            style={{ width: `${teamCompletionPercent}%` }}
          />
        </div>

        {/* Per-Member Breakdown Badges (Click to switch member) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {activeMembersList.map(user => {
            const uLog = allDailyLogs?.find(l => l.user_id === user.id && l.date === selectedDate);
            const uCompleted = [
              isSunday || uLog?.gym_done,
              uLog?.steps_done,
              uLog?.sleep_done,
              uLog?.junk_food_avoided,
              uLog?.water_done
            ].filter(Boolean).length;
            const isCurrent = user.id === currentUser.id;
            const isSelected = user.id === selectedMemberId;

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedMemberId(user.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[rgba(217,139,74,0.12)] border-[#D98B4A] text-[#F4F4F5]'
                    : 'bg-[#1B1B20] border-[#26262C] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-[#D98B4A]/40'
                }`}
                title={`View ${user.name}'s checklist for ${selectedDate}`}
              >
                <div className="w-5 h-5 rounded-full bg-[#1B1B20] border border-[#26262C] text-[10px] font-bold text-[#F4F4F5] flex items-center justify-center shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{isCurrent ? `${user.name} (You)` : user.name}:</span>
                <strong className={`tabular-nums ${uCompleted > 0 ? 'text-[#34D399] font-bold' : 'text-[#71717A]'}`}>
                  {uCompleted}/5 goals
                </strong>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Date Navigation & Calendar Picker Bar */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Interactive Calendar Date Selector */}
        <div className="flex items-center gap-3 bg-[#1B1B20] border border-[#26262C] rounded-lg px-3 py-2">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-1.5 hover:bg-[#26262C] rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] transition cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-[#F4F4F5] font-bold text-sm">
            <Calendar className="w-4 h-4 text-[#D98B4A]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[#F4F4F5] font-bold text-sm focus:outline-none cursor-pointer"
            />
            {selectedDate === todayStr && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(217,139,74,0.12)] text-[#D98B4A] font-bold border border-[#D98B4A]/30">
                Today
              </span>
            )}
            {isSunday && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#34D399]/15 text-[#34D399] font-bold border border-[#34D399]/30">
                Sunday
              </span>
            )}
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-1.5 hover:bg-[#26262C] rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] transition cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className="p-1.5 px-2.5 hover:bg-[#26262C] text-[#D98B4A] hover:text-[#F4F4F5] rounded-lg transition flex items-center gap-1.5 cursor-pointer border border-[#26262C] ml-1 bg-[#131316]"
              title="Open Month Calendar View"
            >
              <Calendar className="w-3.5 h-3.5 text-[#D98B4A]" />
              <span className="hidden sm:inline text-xs font-bold">Calendar</span>
            </button>
          )}
        </div>

        {/* Today's Score Circular Progress Indicator (Section 19 Spec) */}
        <div className="w-full md:w-auto flex items-center gap-4 bg-white border border-[#E4E7EC] rounded-[14px] p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="#E9EDF5" strokeWidth="4.5" fill="transparent" />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="#3157D5"
                strokeWidth="4.5"
                fill="transparent"
                strokeDasharray={138.2}
                strokeDashoffset={138.2 - (138.2 * (Math.min(50, displayedDailyLog.points_earned !== undefined ? displayedDailyLog.points_earned : (completedCount * 10))) / 50)}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-black text-[#111827] tabular-nums leading-none">
                {isViewingOther && !actualMemberLog ? '—' : (displayedDailyLog.points_earned !== undefined ? displayedDailyLog.points_earned : (completedCount * 10))}
              </span>
              <span className="text-[8px] font-bold text-[#667085] leading-none mt-0.5">/ 50</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3157D5]">
                Today's Score
              </span>
              {isSunday && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#ECFDF3] text-[#15803D] font-bold border border-[#15803D]/20">
                  Healing
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-[#111827]">
              {isViewingOther ? `${targetUser.name}'s Progress` : `${completedCount} of 5 Habits Completed`}
            </h3>
            <p className="text-xs text-[#667085] mt-0.5">
              {isViewingOther && !actualMemberLog ? (
                <span>No habits recorded for <span className="text-[#111827] font-semibold">{selectedDate}</span></span>
              ) : (
                <span>Selected Date: <span className="text-[#111827] font-semibold">{selectedDate}</span></span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid or No Data State */}
      {isViewingOther && !actualMemberLog ? (
        <div className="bg-[#131316] border border-[#26262C] rounded-2xl p-8 sm:p-12 text-center shadow-sm space-y-4 my-2">
          <div className="w-16 h-16 rounded-2xl bg-[#1B1B20] border border-[#26262C] flex items-center justify-center mx-auto text-[#D98B4A]">
            <Clock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-[#F4F4F5]">No data for this member yet</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              <strong>{targetUser.name}</strong> hasn't logged their daily checklist for <strong className="text-[#F4F4F5]">{selectedDate}</strong>.
              Progress and workout logs will automatically appear here once recorded.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSelectedMemberId(currentUser.id)}
              className="px-4 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#F4F4F5] border border-[#26262C] hover:border-[#D98B4A]/40 font-semibold rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D98B4A]" />
              <span>Back to My Checklist</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Goal 1: Gym Routine */}
        <div className={`relative bg-[#131316] border rounded-xl p-4 sm:p-5 transition-all overflow-hidden ${
          (displayedDailyLog.gym_done || isSunday) ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${
                (displayedDailyLog.gym_done || isSunday) ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'
              }`}>
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base whitespace-nowrap">1. Gym Routine</h4>
                  {isSunday && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 flex items-center gap-1 shrink-0">
                      🌿 Healing
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#A1A1AA]">
                  {isSunday ? 'Sunday Body Recovery — Rest & Healing Day' : 'Log strength or cardio workouts'}
                </p>
              </div>
            </div>

            {/* Action Buttons: On Sunday show green Healing badge with no Mark Done or Failed buttons */}
            {isSunday ? (
              <div className="w-full xl:w-auto shrink-0 flex items-center">
                <span className="w-full xl:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 shadow-sm min-h-[42px]">
                  <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                  <span>Healing</span>
                </span>
              </div>
            ) : isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.gym_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.gym_done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                ) : !hasLoggedForDate ? (
                  <Clock className="w-4 h-4 text-zinc-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#71717A]" />
                )}
                <span>{displayedDailyLog.gym_done ? 'Completed' : !hasLoggedForDate ? 'Not Logged Yet' : 'Not Done'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.gym_done ? (
                  <button
                    onClick={() => handleToggleGoal('gym', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-4 py-2.5 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shrink-0 active:scale-[0.98]"
                    title="Click to unmark as completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('gym', false)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shadow-sm active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('gym')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[42px] whitespace-nowrap active:scale-[0.98] ${
                        getGoalMissedReason('gym')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('gym') ? "Marked as Failed — click to remove / undo" : "Unable to complete gym workout? Log reason"}
                    >
                      {getGoalMissedReason('gym') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#26262C] flex items-center justify-between">
            <span className="text-xs text-[#A1A1AA]">
              Workouts Logged: <strong className="text-[#D98B4A] tabular-nums">{targetWorkoutsCount} entries</strong>
            </span>
            {!isViewingOther && !getGoalMissedReason('gym') && (
              <button
                onClick={onOpenWorkoutModal}
                className="text-xs font-bold text-[#D98B4A] hover:text-[#F4F4F5] flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[rgba(217,139,74,0.12)] border border-[#D98B4A]/30 transition cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> {isSunday ? 'Optional: Log Workout' : 'Log Details'}
              </button>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.gym_done && getGoalMissedReason('gym') && (
            <div className="mt-3 p-3 bg-amber-500/10 rounded-lg text-xs text-[#FBBF24] flex items-center justify-between border border-amber-500/25">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('gym')?.reason_tag}]{' '}
                  {getGoalMissedReason('gym')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal('gym')}
                  className="text-xs px-2.5 py-1 rounded bg-[#1B1B20] hover:bg-[#26262C] text-[#FBBF24] border border-amber-500/30 font-semibold cursor-pointer shrink-0 ml-3 transition"
                >
                  Edit Reason
                </button>
              )}
            </div>
          )}

          {/* List of Logged Workouts on this date with Prominent Delete Button */}
          {targetWorkouts.length > 0 && (
            <div className="mt-3.5 space-y-2 pt-3 border-t border-[#26262C]/60">
              <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider block">
                Workout Sessions for {selectedDate}:
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {targetWorkouts.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 bg-[#1B1B20] border border-[#26262C] hover:border-[#D98B4A]/40 rounded-lg text-xs transition shadow-sm"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#F4F4F5] font-bold truncate">{w.exercise_name}</strong>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#131316] text-[#D98B4A] border border-[#26262C] font-semibold">
                          {w.exercise_type || 'Strength'}
                        </span>
                        {w.is_private && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-[#FBBF24] border border-amber-500/25 font-semibold">
                            Private
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] mt-1 font-mono tabular-nums">
                        <span>{w.sets} sets × {w.reps} reps</span>
                        <span>•</span>
                        <span className="text-[#D98B4A]">{w.weight ? `${w.weight} kg` : 'Bodyweight'}</span>
                        <span>•</span>
                        <span>{w.duration}m</span>
                      </div>
                      {w.notes && (
                        <p className="text-[10px] text-[#71717A] italic truncate mt-1">"{w.notes}"</p>
                      )}
                    </div>

                    {!isViewingOther && onDeleteWorkout && w.user_id === currentUser.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const wid = String(w.id || (w as any)._id || '').trim();
                          setDeletedWorkoutIds(prev => new Set([...prev, wid]));
                          onDeleteWorkout(wid);
                        }}
                        className="px-2.5 py-1.5 min-h-[34px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[#F87171] font-semibold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                        title="Delete this logged workout session"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#F87171]" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Goal 2: Daily Steps & Points Allocation */}
        {(() => {
          const currentSteps = displayedDailyLog.steps_value || 0;
          const isStepHit = displayedDailyLog.steps_done || currentSteps >= stepTarget;
          const stepPercent = Math.min(100, Math.round((currentSteps / stepTarget) * 100));
          const stepPartialPoints = isStepHit ? 10 : Math.min(10, Math.round((currentSteps / stepTarget) * 100) / 10);
          const stepsRemaining = Math.max(0, stepTarget - currentSteps);
          const quickPresets = [
            Math.round(stepTarget * 0.5),
            Math.round(stepTarget * 0.75),
            stepTarget,
          ];

          return (
            <div className={`relative bg-[#131316] border rounded-2xl p-4 sm:p-5 transition-all overflow-hidden flex flex-col justify-between ${
              isStepHit ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'
            }`}>
              <div>
                {/* Header: Icon, Title, Points Badge & Target */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                      isStepHit ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'
                    }`}>
                      <Footprints className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base whitespace-nowrap">
                          2. Daily Steps
                        </h4>
                        <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          isStepHit 
                            ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30' 
                            : stepPartialPoints > 0 
                            ? 'bg-[#D98B4A]/20 text-[#D98B4A] border border-[#D98B4A]/30' 
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          +{stepPartialPoints} / 10 pts
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] mt-0.5 truncate">
                        Group Target: <span className="tabular-nums font-semibold text-[#F4F4F5]">{stepTarget.toLocaleString()}</span> steps
                        {!isStepHit && currentSteps > 0 && (
                          <span className="text-[#D98B4A] ml-1.5 font-medium">({stepPercent}%)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {isViewingOther && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                      isStepHit
                        ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                        : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
                    }`}>
                      {isStepHit ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span className="tabular-nums">
                        {isStepHit ? 'Target Hit' : `${currentSteps.toLocaleString()} steps`}
                      </span>
                    </span>
                  )}
                </div>

                {/* Primary Action Buttons (Thumb-friendly mobile layout) */}
                {!isViewingOther && (
                  <div className="mt-3.5 flex items-center gap-2 w-full">
                    {displayedDailyLog.steps_done ? (
                      <button
                        type="button"
                        onClick={() => handleToggleGoal('steps', true)}
                        className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
                        title="Click to unmark as completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed (10 pts)</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            clearFailedIfAny('steps');
                            const val = Math.max(stepTarget, dailyLog.steps_value || 0);
                            onUpdateDailyLog({ ...dailyLog, steps_done: true, steps_value: val, steps_target: stepTarget });
                          }}
                          className="flex-1 min-h-[42px] px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] hover:from-[#E69A5C] hover:to-[#C66D28] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-[#D98B4A]/20 active:scale-[0.98]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Hit Target (10 pts)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFailed('steps')}
                          className={`min-h-[42px] px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border active:scale-[0.98] shrink-0 ${
                            getGoalMissedReason('steps')
                              ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                              : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                          }`}
                          title={getGoalMissedReason('steps') ? "Marked as Failed — click to remove / undo" : "Unable to hit step goal? Log reason"}
                        >
                          {getGoalMissedReason('steps') ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>Failed</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Progress Bar towards Step Target */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                    <span className="font-medium">
                      {isBasePlan ? 'Daily Step Progress' : 'Progress to Group Target'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-400 tabular-nums">
                        {currentSteps.toLocaleString()} / {stepTarget.toLocaleString()}
                      </span>
                      <span className="font-mono font-bold text-[#F4F4F5] bg-[#1B1B20] px-1.5 py-0.5 rounded border border-[#26262C]">
                        {stepPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[#1B1B20] rounded-full h-2.5 overflow-hidden border border-[#26262C] relative">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        isStepHit 
                          ? 'bg-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.4)]' 
                          : 'bg-gradient-to-r from-amber-500 via-[#D98B4A] to-amber-600'
                      }`}
                      style={{ width: `${stepPercent}%` }}
                    />
                  </div>
                  {!isStepHit && stepsRemaining > 0 && (
                    <p className="text-[11px] text-zinc-400 font-medium">
                      🎯 <strong className="text-zinc-300 font-mono">{stepsRemaining.toLocaleString()}</strong> steps to reach 100% and claim all 10 pts
                    </p>
                  )}
                </div>

                {/* Interactive Step Input & Dynamic Presets */}
                <div className="mt-3.5 bg-[#1B1B20] p-3 sm:p-3.5 rounded-xl border border-[#26262C] space-y-2.5">
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#F4F4F5] flex items-center gap-1.5">
                        <span>Log Step Count:</span>
                        <span className="text-[11px] text-[#D98B4A] font-medium font-mono">
                          +{stepPartialPoints} pts
                        </span>
                      </label>
                      <p className="text-[11px] text-[#A1A1AA]">Earn partial points proportionally</p>
                    </div>

                    {isViewingOther ? (
                      <span className="font-mono font-bold text-sm text-[#F4F4F5] tabular-nums bg-[#131316] px-3 py-1.5 rounded-lg border border-[#26262C]">
                        {displayedDailyLog.steps_value || 0} steps
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Quick Minus 500 button */}
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, (dailyLog.steps_value || 0) - 500);
                            onUpdateDailyLog({
                              ...dailyLog,
                              steps_value: val,
                              steps_done: val >= stepTarget,
                              steps_target: stepTarget,
                            });
                          }}
                          disabled={(dailyLog.steps_value || 0) === 0}
                          title="Subtract 500 steps"
                          className="w-8 h-8 rounded-lg bg-[#131316] hover:bg-[#26262C] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#26262C] flex items-center justify-center font-bold text-xs transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        >
                          -500
                        </button>

                        <div className="relative">
                          <input
                            type="number"
                            step="500"
                            min="0"
                            max="100000"
                            value={dailyLog.steps_value || 0}
                            onChange={(e) => {
                              const num = Math.max(0, parseInt(e.target.value) || 0);
                              onUpdateDailyLog({
                                ...dailyLog,
                                steps_value: num,
                                steps_done: num >= stepTarget,
                                steps_target: stepTarget,
                              });
                            }}
                            className="w-24 sm:w-28 px-2.5 py-1.5 bg-[#131316] text-[#F4F4F5] font-mono tabular-nums font-bold text-sm rounded-lg border border-[#26262C] focus:outline-none focus:border-[#D98B4A] text-right"
                          />
                        </div>

                        {/* Quick Plus 500 button */}
                        <button
                          type="button"
                          onClick={() => {
                            const val = (dailyLog.steps_value || 0) + 500;
                            onUpdateDailyLog({
                              ...dailyLog,
                              steps_value: val,
                              steps_done: val >= stepTarget,
                              steps_target: stepTarget,
                            });
                          }}
                          title="Add 500 steps"
                          className="w-8 h-8 rounded-lg bg-[#131316] hover:bg-[#26262C] text-[#D98B4A] border border-[#26262C] flex items-center justify-center font-bold text-xs transition cursor-pointer active:scale-95"
                        >
                          +500
                        </button>

                        {/* Reset / Clear Steps button */}
                        {(dailyLog.steps_value || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateDailyLog({
                                ...dailyLog,
                                steps_value: 0,
                                steps_done: false,
                                steps_target: stepTarget,
                              });
                            }}
                            title="Reset steps to 0"
                            className="h-8 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[#F87171] border border-rose-500/25 flex items-center justify-center text-xs font-bold transition cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Preset Buttons */}
                  {!isViewingOther && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {quickPresets.map((stepCount) => {
                        const pts = Math.min(10, Math.round((stepCount / stepTarget) * 100) / 10);
                        const isCurrentVal = (dailyLog.steps_value || 0) === stepCount;
                        return (
                          <button
                            key={stepCount}
                            type="button"
                            onClick={() => {
                              onUpdateDailyLog({
                                ...dailyLog,
                                steps_value: stepCount,
                                steps_done: stepCount >= stepTarget,
                                steps_target: stepTarget,
                              });
                            }}
                            className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center tabular-nums flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                              isCurrentVal
                                ? 'bg-[rgba(217,139,74,0.18)] text-[#D98B4A] border-[#D98B4A]'
                                : 'bg-[#131316] hover:bg-[#26262C] text-[#F4F4F5] border-[#26262C]'
                            }`}
                          >
                            <span className="font-mono text-xs">{stepCount.toLocaleString()}</span>
                            <span className={`text-[10px] font-normal ${isCurrentVal ? 'text-[#D98B4A] font-semibold' : 'text-[#A1A1AA]'}`}>
                              +{pts} pts
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Logged Failure Reason Banner */}
                  {!displayedDailyLog.steps_done && getGoalMissedReason('steps') && (
                    <div className="mt-3 p-3 bg-amber-500/10 rounded-xl text-xs text-[#FBBF24] flex items-center justify-between border border-amber-500/25">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                        <span className="break-words">
                          <strong>Reason:</strong> [{getGoalMissedReason('steps')?.reason_tag}]{' '}
                          {getGoalMissedReason('steps')?.reason_text}
                        </span>
                      </div>
                      {!isViewingOther && (
                        <button
                          type="button"
                          onClick={() => setActiveMissedGoal('steps')}
                          className="text-xs px-2.5 py-1 rounded-lg bg-[#1B1B20] hover:bg-[#26262C] text-[#FBBF24] border border-amber-500/30 font-semibold cursor-pointer shrink-0 ml-3 transition"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Goal 3: Sleep Tracker */}
        <div className={`relative bg-[#131316] border rounded-xl p-4 sm:p-5 transition-all overflow-hidden ${displayedDailyLog.sleep_done ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${displayedDailyLog.sleep_done ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'}`}>
                <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base whitespace-nowrap">3. Sleep Routine</h4>
                <p className="text-xs text-[#A1A1AA]">Target: <span className="tabular-nums font-semibold text-[#F4F4F5]">{sleepMin} – {sleepMax}</span> hrs</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.sleep_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.sleep_done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                ) : !hasLoggedForDate ? (
                  <Clock className="w-4 h-4 text-zinc-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#71717A]" />
                )}
                <span>{displayedDailyLog.sleep_done ? 'Target Hit' : !hasLoggedForDate ? 'Pending' : 'Off Target'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.sleep_done ? (
                  <button
                    onClick={() => handleToggleGoal('sleep', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-4 py-2.5 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shrink-0 active:scale-[0.98]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target Hit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('sleep', false)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shadow-sm active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('sleep')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[42px] whitespace-nowrap active:scale-[0.98] ${
                        getGoalMissedReason('sleep')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('sleep') ? "Marked as Failed — click to remove / undo" : "Missed sleep schedule? Log reason"}
                    >
                      {getGoalMissedReason('sleep') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sleep Time Inputs */}
          <div className="mt-4 grid grid-cols-2 gap-3 bg-[#1B1B20] p-3 rounded-lg border border-[#26262C]">
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#D98B4A]" /> Sleep Start
              </label>
              {isViewingOther ? (
                <span className="font-mono text-xs text-[#F4F4F5] tabular-nums">{displayedDailyLog.sleep_start || '23:00'}</span>
              ) : (
                <input
                  type="time"
                  value={dailyLog.sleep_start || '23:00'}
                  onChange={(e) => handleSleepTimeChange(e.target.value, undefined)}
                  className="w-full bg-[#131316] text-[#F4F4F5] text-sm sm:text-xs px-2 py-1.5 rounded-lg border border-[#26262C] focus:outline-none focus:border-[#D98B4A]"
                />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#D98B4A]" /> Wake Time
              </label>
              {isViewingOther ? (
                <span className="font-mono text-xs text-[#F4F4F5] tabular-nums">{displayedDailyLog.sleep_end || '07:00'}</span>
              ) : (
                <input
                  type="time"
                  value={dailyLog.sleep_end || '07:00'}
                  onChange={(e) => handleSleepTimeChange(undefined, e.target.value)}
                  className="w-full bg-[#131316] text-[#F4F4F5] text-sm sm:text-xs px-2 py-1.5 rounded-lg border border-[#26262C] focus:outline-none focus:border-[#D98B4A]"
                />
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#A1A1AA]">Calculated Sleep Duration:</span>
            <strong className="text-[#F4F4F5] font-mono text-sm tabular-nums">{displayedDailyLog.sleep_duration || 0} hrs</strong>
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.sleep_done && getGoalMissedReason('sleep') && (
            <div className="mt-3 p-3 bg-amber-500/10 rounded-lg text-xs text-[#FBBF24] flex items-center justify-between border border-amber-500/25">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('sleep')?.reason_tag}]{' '}
                  {getGoalMissedReason('sleep')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal('sleep')}
                  className="text-xs px-2.5 py-1 rounded bg-[#1B1B20] hover:bg-[#26262C] text-[#FBBF24] border border-amber-500/30 font-semibold cursor-pointer shrink-0 ml-3 transition"
                >
                  Edit Reason
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 4: Junk Food Tracker */}
        <div className={`relative bg-[#131316] border rounded-xl p-4 sm:p-5 transition-all overflow-hidden ${displayedDailyLog.junk_food_avoided ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${displayedDailyLog.junk_food_avoided ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'}`}>
                <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base whitespace-nowrap">4. Junk Food Control</h4>
                <p className="text-xs text-[#A1A1AA]">Avoid processed sweets & junk meals</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.junk_food_avoided
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.junk_food_avoided ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                ) : !hasLoggedForDate ? (
                  <Clock className="w-4 h-4 text-zinc-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#71717A]" />
                )}
                <span>{displayedDailyLog.junk_food_avoided ? 'Clean Nutrition' : !hasLoggedForDate ? 'Pending' : 'Had Junk Food'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.junk_food_avoided ? (
                  <button
                    onClick={() => handleToggleGoal('junk_food', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-4 py-2.5 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shrink-0 active:scale-[0.98]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Avoided</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('junk_food', false)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shadow-sm active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('junk_food')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[42px] whitespace-nowrap active:scale-[0.98] ${
                        getGoalMissedReason('junk_food')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('junk_food') ? "Marked as Failed — click to remove / undo" : "Ate junk food / cheat meal? Log reason"}
                    >
                      {getGoalMissedReason('junk_food') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#26262C]">
            <span className="text-xs text-[#A1A1AA]">
              Goal: <strong className="text-[#F4F4F5]">Strict nutrition discipline</strong>
            </span>
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.junk_food_avoided && getGoalMissedReason('junk_food') && (
            <div className="mt-3 p-3 bg-amber-500/10 rounded-lg text-xs text-[#FBBF24] flex items-center justify-between border border-amber-500/25">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('junk_food')?.reason_tag}]{' '}
                  {getGoalMissedReason('junk_food')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal('junk_food')}
                  className="text-xs px-2.5 py-1 rounded bg-[#1B1B20] hover:bg-[#26262C] text-[#FBBF24] border border-amber-500/30 font-semibold cursor-pointer shrink-0 ml-3 transition"
                >
                  Edit Reason
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 5: Water Hydration Tracker */}
        <div className={`relative bg-[#131316] border rounded-xl p-4 sm:p-5 transition-all overflow-hidden col-span-1 md:col-span-2 ${displayedDailyLog.water_done ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${displayedDailyLog.water_done ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'}`}>
                <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-[#D98B4A]" />
              </div>
              <div>
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base whitespace-nowrap">5. Water Hydration</h4>
                <p className="text-xs text-[#A1A1AA]">Daily target: <span className="tabular-nums font-semibold text-[#F4F4F5]">{(waterTarget / 1000).toFixed(1)}</span> Liters</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.water_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.water_done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                ) : !hasLoggedForDate ? (
                  <Clock className="w-4 h-4 text-zinc-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#71717A]" />
                )}
                <span className="tabular-nums">
                  {displayedDailyLog.water_done
                    ? `${(waterTarget / 1000).toFixed(1)}L Target Hit`
                    : !hasLoggedForDate
                    ? 'Pending'
                    : `${((displayedDailyLog.water_intake_ml || 0) / 1000).toFixed(1)}L Logged`}
                </span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.water_done ? (
                  <button
                    onClick={() => handleToggleGoal('water', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-4 py-2.5 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shrink-0 active:scale-[0.98]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target Hit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('water', false)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[42px] whitespace-nowrap shadow-sm active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Target Hit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('water')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[42px] whitespace-nowrap active:scale-[0.98] ${
                        getGoalMissedReason('water')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('water') ? "Marked as Failed — click to remove / undo" : "Missed hydration target? Log reason"}
                    >
                      {getGoalMissedReason('water') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1B1B20] p-3 rounded-xl border border-[#26262C]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A1A1AA]">Water Logged:</span>
              <strong className="text-[#D98B4A] font-mono text-sm tabular-nums">{displayedDailyLog.water_intake_ml || 0} ml / {waterTarget} ml</strong>
            </div>

            {/* Water Action Buttons (Add, Subtract, Reset) */}
            {!isViewingOther && (
              <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleAddWater(250)}
                  className="min-h-[40px] py-2 px-2 text-center rounded-xl bg-[rgba(217,139,74,0.12)] hover:bg-[rgba(217,139,74,0.22)] text-[#D98B4A] text-xs font-bold border border-[#D98B4A]/30 transition cursor-pointer tabular-nums active:scale-95"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(500)}
                  className="min-h-[40px] py-2 px-2 text-center rounded-xl bg-[rgba(217,139,74,0.12)] hover:bg-[rgba(217,139,74,0.22)] text-[#D98B4A] text-xs font-bold border border-[#D98B4A]/30 transition cursor-pointer tabular-nums active:scale-95"
                >
                  +500ml
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentMl = dailyLog.water_intake_ml || 0;
                    const newMl = Math.max(0, currentMl - 250);
                    onUpdateDailyLog({
                      ...dailyLog,
                      water_intake_ml: newMl,
                      water_done: newMl >= waterTarget,
                      water_target_ml: waterTarget,
                    });
                  }}
                  disabled={(dailyLog.water_intake_ml || 0) === 0}
                  className="min-h-[40px] py-2 px-2 text-center rounded-xl bg-[#131316] hover:bg-[#26262C] text-[#A1A1AA] hover:text-[#F4F4F5] text-xs font-bold border border-[#26262C] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed tabular-nums active:scale-95"
                  title="Subtract 250ml"
                >
                  -250ml
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateDailyLog({
                      ...dailyLog,
                      water_intake_ml: 0,
                      water_done: false,
                      water_target_ml: waterTarget,
                    });
                  }}
                  disabled={(dailyLog.water_intake_ml || 0) === 0}
                  className="min-h-[40px] py-2 px-2 text-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-[#F87171] border border-rose-500/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
                  title="Reset Water Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.water_done && getGoalMissedReason('water') && (
            <div className="mt-3 p-3 bg-amber-500/10 rounded-lg text-xs text-[#FBBF24] flex items-center justify-between border border-amber-500/25">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AlertCircle className="w-4 h-4 text-[#FBBF24] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('water')?.reason_tag}]{' '}
                  {getGoalMissedReason('water')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal('water')}
                  className="text-xs px-2.5 py-1 rounded bg-[#1B1B20] hover:bg-[#26262C] text-[#FBBF24] border border-amber-500/30 font-semibold cursor-pointer shrink-0 ml-3 transition"
                >
                  Edit Reason
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Supplements Daily Checklist Section */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-[rgba(217,139,74,0.12)] text-[#D98B4A] border border-[rgba(217,139,74,0.25)]">
              <Pill className="w-5 h-5 text-[#D98B4A] shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                Daily Supplements Checklist
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#1B1B20] text-[#D98B4A] border border-[#26262C] font-semibold tabular-nums">
                  {selectedDate}
                </span>
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                {isViewingOther
                  ? `Viewing daily supplement intake for ${targetUser.name}`
                  : 'Items persist on all days until deleted. Check off daily intake below.'}
              </p>
            </div>
          </div>

          {!isViewingOther && (
            <button
              onClick={() => setIsAddSuppOpen(true)}
              className="w-full sm:w-auto justify-center px-3 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#D98B4A] border border-[#26262C] text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" /> Detailed Stack Form
            </button>
          )}
        </div>

        {/* Inline Quick Add Input Form for Supplements */}
        {!isViewingOther && (
          <form onSubmit={handleInlineAddSupplement} className="flex flex-col sm:flex-row items-center gap-2 bg-[#1B1B20] p-2.5 rounded-lg border border-[#26262C]">
            <input
              type="text"
              value={inlineSuppName}
              onChange={(e) => setInlineSuppName(e.target.value)}
              placeholder="Add supplement (e.g. Creatine 5g, Fish Oil, Multivitamin)..."
              className="w-full sm:flex-1 bg-[#131316] border border-[#26262C] text-[#F4F4F5] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#D98B4A]"
            />
            <input
              type="text"
              value={inlineSuppTiming}
              onChange={(e) => setInlineSuppTiming(e.target.value)}
              placeholder="Dosage / Time (e.g. 1 scoop Morning)"
              className="w-full sm:w-44 bg-[#131316] border border-[#26262C] text-[#F4F4F5] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#D98B4A]"
            />
            <button
              type="submit"
              disabled={!inlineSuppName.trim()}
              className="w-full sm:w-auto px-4 py-2 bg-[#D98B4A] hover:bg-[#E69A5C] disabled:opacity-50 text-[#0B0B0D] text-xs font-bold rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add to Checklist</span>
            </button>
          </form>
        )}

        {/* Daily Supplement Intake Tracking Bar */}
        {userSupplements.length > 0 && (
          <div className="bg-[#1B1B20] border border-[#26262C] rounded-lg p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A1A1AA]">Checklist for {selectedDate}:</span>
                <span className="text-xs font-mono font-bold text-[#F4F4F5] tabular-nums">
                  {supplementsTakenCount} / {supplementsTotal} Taken
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tabular-nums ${
                  supplementsTakenCount === supplementsTotal && supplementsTotal > 0
                    ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                    : 'bg-[#131316] text-[#D98B4A] border-[#26262C]'
                }`}
              >
                {supplementsTakenCount === supplementsTotal && supplementsTotal > 0
                  ? '✨ All Taken'
                  : `${supplementsPercent}% Done`}
              </span>
            </div>
            <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden border border-[#26262C]/60">
              <div
                className="h-full bg-[#D98B4A] rounded-full transition-all duration-300"
                style={{ width: `${supplementsPercent}%` }}
              />
            </div>
          </div>
        )}

        {userSupplements.length === 0 ? (
          <div className="text-center py-6 bg-[#1B1B20] border border-dashed border-[#26262C] rounded-lg p-4">
            <Pill className="w-8 h-8 text-[#71717A]/40 mx-auto mb-2" />
            <p className="text-xs text-[#A1A1AA]">
              {isViewingOther
                ? `No supplements configured by ${targetUser.name}.`
                : 'No supplements added yet. Enter a supplement above to add it to your daily checklist.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userSupplements.map((supp) => {
              const log = supplementLogs.find(l => l.supplement_id === supp.id && l.date === selectedDate);
              const isTaken = !!log?.taken;

              return (
                <div
                  key={supp.id}
                  className={`p-3 sm:p-3.5 rounded-lg border flex items-center justify-between transition ${
                    isTaken ? 'bg-[#34D399]/5 border-[#34D399]/40 shadow-sm' : 'bg-[#1B1B20] border-[#26262C]'
                  }`}
                >
                  <div
                    onClick={() => {
                      if (!isViewingOther) {
                        onToggleSupplementLog(supp.id, selectedDate, !isTaken);
                      }
                    }}
                    className={`flex items-center gap-3 min-w-0 flex-1 ${!isViewingOther ? 'cursor-pointer select-none' : ''}`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 transition ${
                        isTaken
                          ? 'text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30'
                          : 'text-[#A1A1AA] bg-[#131316] border border-[#26262C] hover:border-[#D98B4A]'
                      }`}
                      title={isTaken ? 'Mark as not taken' : 'Mark as taken'}
                    >
                      {isTaken ? <CheckCircle2 className="w-5 h-5 text-[#34D399]" /> : <div className="w-5 h-5 rounded-full border-2 border-[#26262C]" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-bold truncate transition ${isTaken ? 'text-[#34D399] line-through' : 'text-[#F4F4F5]'}`}>
                          {supp.name}
                        </h4>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                            isTaken
                              ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                              : 'bg-[#131316] text-[#A1A1AA] border-[#26262C]'
                          }`}
                        >
                          {isTaken ? 'Taken' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] truncate">{supp.dosage} • {supp.timing}</p>
                    </div>
                  </div>

                  {/* Only owner can delete their supplements */}
                  {!isViewingOther && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete supplement "${supp.name}" from your daily checklist?`)) {
                          onDeleteSupplement(supp.id);
                        }
                      }}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#F87171] hover:bg-rose-500/10 rounded-lg transition shrink-0 ml-2 cursor-pointer"
                      title="Delete from checklist permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Private Habit Tracker Section */}
      {isViewingOther ? (
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-[#1B1B20] text-[#D98B4A] border border-[#26262C] shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                Custom Private Habit Tracker
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B1B20] text-[#D98B4A] border border-[#26262C] font-semibold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Private to {targetUser.name}
                </span>
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Personal habits are strictly private and can only be viewed and modified by their owner.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-[rgba(217,139,74,0.12)] text-[#D98B4A] border border-[rgba(217,139,74,0.25)]">
                <ListCheck className="w-5 h-5 text-[#D98B4A] shrink-0" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                  Custom Private Habits Checklist
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B1B20] text-[#D98B4A] border border-[#26262C] flex items-center gap-1 font-semibold">
                    <Lock className="w-2.5 h-2.5" /> Private
                  </span>
                </h3>
                <p className="text-xs text-[#A1A1AA]">Habits persist across all days until deleted. Check off daily below.</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddHabitOpen(true)}
              className="w-full sm:w-auto justify-center px-3 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#D98B4A] border border-[#26262C] text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" /> Detailed Habit Form
            </button>
          </div>

          {/* Inline Quick Add Input Form for Custom Habits */}
          <form onSubmit={handleInlineAddHabit} className="flex flex-col sm:flex-row items-center gap-2 bg-[#1B1B20] p-2.5 rounded-lg border border-[#26262C]">
            <input
              type="text"
              value={inlineHabitTitle}
              onChange={(e) => setInlineHabitTitle(e.target.value)}
              placeholder="Add personal habit (e.g. Read 20 pages, Cold shower, Meditate)..."
              className="w-full sm:flex-1 bg-[#131316] border border-[#26262C] text-[#F4F4F5] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#D98B4A]"
            />
            <input
              type="text"
              value={inlineHabitDesc}
              onChange={(e) => setInlineHabitDesc(e.target.value)}
              placeholder="Target / Notes (e.g. 20 mins)"
              className="w-full sm:w-44 bg-[#131316] border border-[#26262C] text-[#F4F4F5] text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#D98B4A]"
            />
            <button
              type="submit"
              disabled={!inlineHabitTitle.trim()}
              className="w-full sm:w-auto px-4 py-2 bg-[#D98B4A] hover:bg-[#E69A5C] disabled:opacity-50 text-[#0B0B0D] text-xs font-bold rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add to Checklist</span>
            </button>
          </form>

          {/* Daily Habit Tracking Progress Bar */}
          {userHabits.length > 0 && (
            <div className="bg-[#1B1B20] border border-[#26262C] rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A1A1AA]">Checklist for {selectedDate}:</span>
                  <span className="text-xs font-mono font-bold text-[#F4F4F5] tabular-nums">
                    {habitsCompletedCount} / {habitsTotal} Completed
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border tabular-nums ${
                    habitsCompletedCount === habitsTotal && habitsTotal > 0
                      ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                      : 'bg-[#131316] text-[#D98B4A] border-[#26262C]'
                  }`}
                >
                  {habitsCompletedCount === habitsTotal && habitsTotal > 0
                    ? '🔥 All Habits Done'
                    : `${habitsPercent}% Complete`}
                </span>
              </div>
              <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden border border-[#26262C]/60">
                <div
                  className="h-full bg-[#D98B4A] rounded-full transition-all duration-300"
                  style={{ width: `${habitsPercent}%` }}
                />
              </div>
            </div>
          )}

          {userHabits.length === 0 ? (
            <div className="text-center py-6 bg-[#1B1B20] border border-dashed border-[#26262C] rounded-lg p-4">
              <ListCheck className="w-8 h-8 text-[#71717A]/40 mx-auto mb-2" />
              <p className="text-xs text-[#A1A1AA]">
                No custom private habits added yet. Enter a habit above to add it to your daily checklist.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userHabits.map((habit) => {
                const log = customHabitLogs.find(l => l.habit_id === habit.id && l.date === selectedDate);
                const isCompleted = !!log?.completed;

                return (
                  <div
                    key={habit.id}
                    className={`p-3 sm:p-3.5 rounded-lg border flex items-center justify-between transition ${
                      isCompleted ? 'bg-[#34D399]/5 border-[#34D399]/40 shadow-sm' : 'bg-[#1B1B20] border-[#26262C]'
                    }`}
                  >
                    <div
                      onClick={() => onToggleCustomHabitLog(habit.id, selectedDate, !isCompleted)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                    >
                      <div
                        className={`p-1.5 rounded-lg transition shrink-0 ${
                          isCompleted
                            ? 'text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/30'
                            : 'text-[#A1A1AA] bg-[#131316] border border-[#26262C] hover:border-[#D98B4A]'
                        }`}
                        title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[#34D399]" /> : <div className="w-5 h-5 rounded-full border-2 border-[#26262C]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold truncate transition ${isCompleted ? 'text-[#34D399] line-through' : 'text-[#F4F4F5]'}`}>
                            {habit.title}
                          </h4>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                              isCompleted
                                ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                                : 'bg-[#131316] text-[#A1A1AA] border-[#26262C]'
                            }`}
                          >
                            {isCompleted ? 'Done' : 'To Do'}
                          </span>
                        </div>
                        {habit.description && <p className="text-[11px] text-[#A1A1AA] truncate">{habit.description}</p>}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete habit "${habit.title}" from your daily checklist?`)) {
                          onDeleteCustomHabit(habit.id);
                        }
                      }}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#F87171] hover:bg-rose-500/10 rounded-lg transition shrink-0 ml-2 cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Supplement Modal */}
      {isAddSuppOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#F4F4F5] mb-1 flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#D98B4A]" /> Add New Supplement
            </h3>
            <p className="text-xs text-[#A1A1AA] mb-4">Add a supplement to your daily intake checklist.</p>

            <form onSubmit={handleCreateSupplement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Supplement Name</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder="e.g. Creatine Monohydrate"
                  className="w-full px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Dosage</label>
                <input
                  type="text"
                  value={suppDosage}
                  onChange={(e) => setSuppDosage(e.target.value)}
                  placeholder="e.g. 5g or 1 scoop"
                  className="w-full px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Timing</label>
                <select
                  value={suppTiming}
                  onChange={(e) => setSuppTiming(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                >
                  <option value="Morning">Morning</option>
                  <option value="Pre-workout">Pre-workout</option>
                  <option value="Post-workout">Post-workout</option>
                  <option value="Evening / Night">Evening / Night</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSuppOpen(false)}
                  className="w-1/2 py-2.5 min-h-[38px] bg-[#1B1B20] text-[#A1A1AA] hover:text-[#F4F4F5] font-semibold rounded-lg text-xs hover:bg-[#26262C] transition cursor-pointer border border-[#26262C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 min-h-[38px] bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold rounded-lg text-xs transition cursor-pointer shadow-md shadow-[#D98B4A]/20"
                >
                  Save Supplement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Private Habit Modal */}
      {isAddHabitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#F4F4F5] mb-1 flex items-center gap-2">
              <ListCheck className="w-5 h-5 text-[#D98B4A]" /> Add Custom Private Habit
            </h3>
            <p className="text-xs text-[#A1A1AA] mb-4">Create a private habit tracker visible only to your account.</p>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. Read 15 pages or Meditation"
                  className="w-full px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={habitDesc}
                  onChange={(e) => setHabitDesc(e.target.value)}
                  placeholder="e.g. Daily morning routine"
                  className="w-full px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddHabitOpen(false)}
                  className="w-1/2 py-2.5 min-h-[38px] bg-[#1B1B20] text-[#A1A1AA] hover:text-[#F4F4F5] font-semibold rounded-lg text-xs hover:bg-[#26262C] transition cursor-pointer border border-[#26262C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 min-h-[38px] bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold rounded-lg text-xs transition cursor-pointer shadow-md shadow-[#D98B4A]/20"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Missed Reason Dialog Popup */}
      {activeMissedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#F4F4F5] mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#D98B4A]" />
              Reason for missing {activeMissedGoal.toUpperCase().replace('_', ' ')} goal
            </h3>

            {/* Option to Remove Failed Status if already logged */}
            {getGoalMissedReason(activeMissedGoal) && onRemoveMissedReason && (
              <div className="mb-4 p-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg flex items-center justify-between gap-2">
                <span className="text-xs text-[#A1A1AA]">Current status: <strong className="text-[#F87171]">Failed</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const r = getGoalMissedReason(activeMissedGoal);
                    if (r) {
                      onRemoveMissedReason(r.id);
                      setActiveMissedGoal(null);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-[#F87171] border border-rose-500/25 transition flex items-center gap-1 cursor-pointer"
                  title="Remove Failed status and restore goal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Remove Failed</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveMissedReason} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-2">Category Tag</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(['Tired', 'Work', 'Travel', 'Lazy', 'Sick', 'Sore', 'Cheat Day', 'Other'] as ReasonTag[]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`p-2 min-h-[38px] rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-[rgba(217,139,74,0.15)] text-[#D98B4A] border-[#D98B4A]'
                          : 'bg-[#1B1B20] text-[#A1A1AA] border-[#26262C] hover:text-[#F4F4F5] hover:bg-[#26262C]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Notes</label>
                <input
                  type="text"
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="e.g. Travel delay, overtime work..."
                  className="w-full px-3.5 py-2.5 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal(null)}
                  className="w-1/2 py-2.5 min-h-[38px] bg-[#1B1B20] text-[#A1A1AA] hover:text-[#F4F4F5] font-semibold rounded-lg text-xs transition hover:bg-[#26262C] cursor-pointer border border-[#26262C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 min-h-[38px] bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold rounded-lg text-xs transition cursor-pointer shadow-md shadow-[#D98B4A]/20"
                >
                  Save Reason
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
