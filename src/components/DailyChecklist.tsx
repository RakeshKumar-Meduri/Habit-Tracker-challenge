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
  CustomHabitLog
} from '../types';
import { calculateSleepDuration } from '../utils/crypto';
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
  RotateCcw
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

  const stepTarget = adminSettings?.step_target || 10000;
  const sleepMin = adminSettings?.sleep_min_hours || 7.0;
  const sleepMax = adminSettings?.sleep_max_hours || 9.0;
  const waterTarget = adminSettings?.water_target_ml || 2500;

  // The daily log to display: if viewing other member, find their log for selectedDate
  const displayedDailyLog: DailyLog = isViewingOther
    ? (allDailyLogs?.find(l => l.user_id === selectedMemberId && l.date === selectedDate) || {
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
      })
    : (allDailyLogs?.find(l => l.user_id === currentUser.id && l.date === selectedDate) || dailyLog);

  const [deletedWorkoutIds, setDeletedWorkoutIds] = useState<Set<string>>(new Set());

  const targetWorkouts = (allWorkouts || [])
    .filter(w => {
      if (!w) return false;
      const wid = String(w.id || (w as any)._id || '').trim();
      if (deletedWorkoutIds.has(wid)) return false;
      return w.user_id === targetUser.id && w.date === selectedDate;
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

  const completionPercent = Math.round((completedCount / 5) * 100);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Member Accountability Selector */}
      {allUsers && allUsers.length > 1 && (
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[rgba(217,139,74,0.12)] text-[#D98B4A] border border-[rgba(217,139,74,0.25)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4F4F5] flex items-center gap-2">
                Member Checklist Viewer
                {isViewingOther && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-[#FBBF24] border border-amber-500/25 font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Read-Only
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#A1A1AA]">Inspect your own or your teammates' daily habits & accountability</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#A1A1AA] shrink-0">Member:</span>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full sm:w-auto bg-[#1B1B20] text-[#F4F4F5] font-bold text-xs border border-[#26262C] rounded-lg px-3 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === currentUser.id ? `👤 You (${u.name})` : `👥 ${u.name} (@${u.username})`}
                </option>
              ))}
            </select>
            {isViewingOther && (
              <button
                type="button"
                onClick={() => setSelectedMemberId(currentUser.id)}
                className="px-2.5 py-2 bg-[rgba(217,139,74,0.12)] hover:bg-[rgba(217,139,74,0.20)] text-[#D98B4A] text-xs font-bold rounded-lg border border-[#D98B4A]/30 transition shrink-0 cursor-pointer"
              >
                Reset to Me
              </button>
            )}
          </div>
        </div>
      )}

      {/* Read-Only Notice when viewing another member */}
      {isViewingOther && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-center justify-between text-xs text-[#FBBF24]">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#FBBF24] shrink-0" />
            <span>
              Viewing <strong>{targetUser.name}</strong>'s daily checklist for <strong>{selectedDate}</strong>. Check out their logged goals, steps, sleep, and reasons below!
            </span>
          </div>
        </div>
      )}

      {/* Collective Team Daily Goal Progress Bar */}
      {allUsers && allUsers.length > 1 && (
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
                  Collective accountability across all {activeMembersList.length} members for {selectedDate}
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

        {/* Daily Completion Meter */}
        <div className="w-full md:w-auto flex items-center gap-4 bg-[#1B1B20] border border-[#26262C] rounded-xl p-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4" className="text-[#26262C]" fill="transparent" />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="4"
                className="text-[#D98B4A] transition-all duration-500"
                fill="transparent"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * completionPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-black text-[#F4F4F5] tabular-nums">{completionPercent}%</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F4F4F5]">{isViewingOther ? `${targetUser.name}'s Goals` : 'Daily Goal Completion'}</h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              <strong className="text-[#F4F4F5] tabular-nums">{completedCount}</strong> of 5 core goals completed for <span className="text-[#F4F4F5]">{selectedDate}</span>
              {isSunday && <span className="text-[#34D399] font-semibold ml-1">(Sunday Healing)</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
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
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base">1. Gym Routine</h4>
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
                <span className="w-full xl:w-auto px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 shadow-sm min-h-[38px]">
                  <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                  <span>Healing</span>
                </span>
              </div>
            ) : isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.gym_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.gym_done ? <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> : <XCircle className="w-4 h-4 text-[#71717A]" />}
                <span>{displayedDailyLog.gym_done ? 'Completed' : 'Not Done'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.gym_done ? (
                  <button
                    onClick={() => handleToggleGoal('gym', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0"
                    title="Click to unmark as completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('gym', false)}
                      className="flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('gym')}
                      className={`flex-1 xl:flex-initial px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[38px] whitespace-nowrap shrink-0 ${
                        getGoalMissedReason('gym')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('gym') ? "Marked as Failed — click to remove / undo" : "Unable to complete gym workout? Log reason"}
                    >
                      {getGoalMissedReason('gym') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                    {getGoalMissedReason('gym') && (
                      <button
                        type="button"
                        onClick={() => setActiveMissedGoal('gym')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 bg-amber-500/10 border border-amber-500/25 text-[#FBBF24] hover:bg-amber-500/15"
                        title="View or edit logged reason"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Reason: {getGoalMissedReason('gym')?.reason_tag}</span>
                      </button>
                    )}
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

                    {!isViewingOther && onDeleteWorkout && (
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
        <div className={`relative bg-[#131316] border rounded-xl p-4 sm:p-5 transition-all overflow-hidden ${displayedDailyLog.steps_done ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${displayedDailyLog.steps_done ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'}`}>
                <Footprints className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base">2. Daily Steps</h4>
                <p className="text-xs text-[#A1A1AA]">Target: <span className="tabular-nums font-semibold text-[#F4F4F5]">{stepTarget.toLocaleString()}</span> steps</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.steps_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.steps_done ? <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> : <XCircle className="w-4 h-4 text-[#71717A]" />}
                <span className="tabular-nums">{displayedDailyLog.steps_done ? `${(displayedDailyLog.steps_value || 0).toLocaleString()} steps (Hit)` : 'Off Target'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.steps_done ? (
                  <button
                    onClick={() => handleToggleGoal('steps', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
                    <button
                      onClick={() => {
                        clearFailedIfAny('steps');
                        const val = Math.max(stepTarget, dailyLog.steps_value || 0);
                        onUpdateDailyLog({ ...dailyLog, steps_done: true, steps_value: val, steps_target: stepTarget });
                      }}
                      className="flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('steps')}
                      className={`flex-1 xl:flex-initial px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[38px] whitespace-nowrap shrink-0 ${
                        getGoalMissedReason('steps')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('steps') ? "Marked as Failed — click to remove / undo" : "Unable to hit step goal? Log reason"}
                    >
                      {getGoalMissedReason('steps') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                    {getGoalMissedReason('steps') && (
                      <button
                        type="button"
                        onClick={() => setActiveMissedGoal('steps')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 bg-amber-500/10 border border-amber-500/25 text-[#FBBF24] hover:bg-amber-500/15"
                        title="View or edit logged reason"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Reason: {getGoalMissedReason('steps')?.reason_tag}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Step Input */}
          <div className="mt-4 bg-[#1B1B20] p-3 rounded-lg border border-[#26262C] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-[#A1A1AA]">Total Steps Logged:</label>
              <div className="flex items-center gap-2">
                {isViewingOther ? (
                  <span className="font-mono font-bold text-sm text-[#F4F4F5] tabular-nums">{displayedDailyLog.steps_value || 0}</span>
                ) : (
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
                    className="w-28 px-2.5 py-1.5 bg-[#131316] text-[#F4F4F5] font-mono tabular-nums font-bold text-sm rounded-lg border border-[#26262C] focus:outline-none focus:border-[#D98B4A] text-right"
                  />
                )}
                <span className="text-xs font-bold text-[#A1A1AA]">steps</span>
              </div>
            </div>

            {!isViewingOther && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[6000, 8000, 10000].map((stepCount) => (
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
                    className="py-1.5 px-2 rounded-lg bg-[#131316] hover:bg-[#26262C] text-[#D98B4A] text-xs font-bold border border-[#26262C] transition cursor-pointer text-center tabular-nums"
                  >
                    +{stepCount.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.steps_done && getGoalMissedReason('steps') && (
            <div className="mt-3 p-2.5 bg-rose-500/10 rounded-lg text-xs text-[#F87171] flex items-center justify-between border border-rose-500/25">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('steps')?.reason_tag}]{' '}
                  {getGoalMissedReason('steps')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('steps')}
                  className="text-[11px] underline text-[#F87171] hover:text-[#F4F4F5] font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 3: Sleep Tracker */}
        <div className={`relative bg-[#131316] border rounded-xl p-4 sm:p-5 transition-all overflow-hidden ${displayedDailyLog.sleep_done ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#26262C]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${displayedDailyLog.sleep_done ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#1B1B20] text-[#A1A1AA]'}`}>
                <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base">3. Sleep Routine</h4>
                <p className="text-xs text-[#A1A1AA]">Target: <span className="tabular-nums font-semibold text-[#F4F4F5]">{sleepMin} – {sleepMax}</span> hrs</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.sleep_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.sleep_done ? <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> : <XCircle className="w-4 h-4 text-[#71717A]" />}
                <span>{displayedDailyLog.sleep_done ? 'Target Hit' : 'Off Target'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.sleep_done ? (
                  <button
                    onClick={() => handleToggleGoal('sleep', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target Hit</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('sleep', false)}
                      className="flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('sleep')}
                      className={`flex-1 xl:flex-initial px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[38px] whitespace-nowrap shrink-0 ${
                        getGoalMissedReason('sleep')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('sleep') ? "Marked as Failed — click to remove / undo" : "Missed sleep schedule? Log reason"}
                    >
                      {getGoalMissedReason('sleep') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                    {getGoalMissedReason('sleep') && (
                      <button
                        type="button"
                        onClick={() => setActiveMissedGoal('sleep')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 bg-amber-500/10 border border-amber-500/25 text-[#FBBF24] hover:bg-amber-500/15"
                        title="View or edit logged reason"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Reason: {getGoalMissedReason('sleep')?.reason_tag}</span>
                      </button>
                    )}
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
            <div className="mt-3 p-2.5 bg-rose-500/10 rounded-lg text-xs text-[#F87171] flex items-center justify-between border border-rose-500/25">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('sleep')?.reason_tag}]{' '}
                  {getGoalMissedReason('sleep')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('sleep')}
                  className="text-[11px] underline text-[#F87171] hover:text-[#F4F4F5] font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
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
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base">4. Junk Food Control</h4>
                <p className="text-xs text-[#A1A1AA]">Avoid processed sweets & junk meals</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.junk_food_avoided
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.junk_food_avoided ? <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> : <XCircle className="w-4 h-4 text-[#71717A]" />}
                <span>{displayedDailyLog.junk_food_avoided ? 'Clean Nutrition' : 'Had Junk Food'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.junk_food_avoided ? (
                  <button
                    onClick={() => handleToggleGoal('junk_food', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Avoided</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('junk_food', false)}
                      className="flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('junk_food')}
                      className={`flex-1 xl:flex-initial px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[38px] whitespace-nowrap shrink-0 ${
                        getGoalMissedReason('junk_food')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('junk_food') ? "Marked as Failed — click to remove / undo" : "Ate junk food / cheat meal? Log reason"}
                    >
                      {getGoalMissedReason('junk_food') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                    {getGoalMissedReason('junk_food') && (
                      <button
                        type="button"
                        onClick={() => setActiveMissedGoal('junk_food')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 bg-amber-500/10 border border-amber-500/25 text-[#FBBF24] hover:bg-amber-500/15"
                        title="View or edit logged reason"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Reason: {getGoalMissedReason('junk_food')?.reason_tag}</span>
                      </button>
                    )}
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
            <div className="mt-3 p-2.5 bg-rose-500/10 rounded-lg text-xs text-[#F87171] flex items-center justify-between border border-rose-500/25">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('junk_food')?.reason_tag}]{' '}
                  {getGoalMissedReason('junk_food')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('junk_food')}
                  className="text-[11px] underline text-[#F87171] hover:text-[#F4F4F5] font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
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
                <h4 className="font-bold text-[#F4F4F5] text-sm sm:text-base">5. Water Hydration</h4>
                <p className="text-xs text-[#A1A1AA]">Daily target: <span className="tabular-nums font-semibold text-[#F4F4F5]">{(waterTarget / 1000).toFixed(1)}</span> Liters</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full xl:w-auto justify-center px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                displayedDailyLog.water_done
                  ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                  : 'bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C]'
              }`}>
                {displayedDailyLog.water_done ? <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> : <XCircle className="w-4 h-4 text-[#71717A]" />}
                <span className="tabular-nums">{displayedDailyLog.water_done ? `${(waterTarget / 1000).toFixed(1)}L Target Hit` : `${((displayedDailyLog.water_intake_ml || 0) / 1000).toFixed(1)}L Logged`}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full xl:w-auto shrink-0">
                {displayedDailyLog.water_done ? (
                  <button
                    onClick={() => handleToggleGoal('water', true)}
                    className="w-full xl:w-auto flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 hover:bg-[#34D399]/25 text-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target Hit</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0">
                    <button
                      onClick={() => handleToggleGoal('water', false)}
                      className="flex-1 xl:flex-initial px-3.5 py-2 rounded-lg bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Target Hit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFailed('water')}
                      className={`flex-1 xl:flex-initial px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[38px] whitespace-nowrap shrink-0 ${
                        getGoalMissedReason('water')
                          ? 'bg-rose-500/15 text-[#F87171] border-rose-500/30 hover:bg-rose-500/25'
                          : 'bg-rose-500/10 text-[#F87171] border-rose-500/25 hover:bg-rose-500/20'
                      }`}
                      title={getGoalMissedReason('water') ? "Marked as Failed — click to remove / undo" : "Missed hydration target? Log reason"}
                    >
                      {getGoalMissedReason('water') ? <XCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      <span>Failed</span>
                    </button>
                    {getGoalMissedReason('water') && (
                      <button
                        type="button"
                        onClick={() => setActiveMissedGoal('water')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0 bg-amber-500/10 border border-amber-500/25 text-[#FBBF24] hover:bg-amber-500/15"
                        title="View logged reason"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Reason: {getGoalMissedReason('water')?.reason_tag}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1B1B20] p-3 rounded-lg border border-[#26262C]">
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
                  className="py-2 px-2 text-center rounded-lg bg-[rgba(217,139,74,0.12)] hover:bg-[rgba(217,139,74,0.22)] text-[#D98B4A] text-xs font-bold border border-[#D98B4A]/30 transition cursor-pointer tabular-nums"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(500)}
                  className="py-2 px-2 text-center rounded-lg bg-[rgba(217,139,74,0.12)] hover:bg-[rgba(217,139,74,0.22)] text-[#D98B4A] text-xs font-bold border border-[#D98B4A]/30 transition cursor-pointer tabular-nums"
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
                  className="py-2 px-2 text-center rounded-lg bg-[#131316] hover:bg-[#26262C] text-[#A1A1AA] hover:text-[#F4F4F5] text-xs font-bold border border-[#26262C] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed tabular-nums"
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
                  className="py-2 px-2 text-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[#F87171] border border-rose-500/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Reset Water Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.water_done && getGoalMissedReason('water') && (
            <div className="mt-3 p-2.5 bg-rose-500/10 rounded-lg text-xs text-[#F87171] flex items-center justify-between border border-rose-500/25">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
                <span>
                  <strong>Reason:</strong> [{getGoalMissedReason('water')?.reason_tag}]{' '}
                  {getGoalMissedReason('water')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('water')}
                  className="text-[11px] underline text-[#F87171] hover:text-[#F4F4F5] font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

      </div>

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
