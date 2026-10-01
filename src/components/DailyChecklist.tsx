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
  Eye
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
  onOpenWorkoutModal: () => void;
  gymWorkoutsCount: number;
  onAddSupplement: (supp: Supplement) => void;
  onDeleteSupplement: (suppId: string) => void;
  onToggleSupplementLog: (suppId: string, date: string, taken: boolean) => void;
  onAddCustomHabit: (habit: CustomHabit) => void;
  onDeleteCustomHabit: (habitId: string) => void;
  onToggleCustomHabitLog: (habitId: string, date: string, completed: boolean) => void;
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
  onOpenWorkoutModal,
  gymWorkoutsCount,
  onAddSupplement,
  onDeleteSupplement,
  onToggleSupplementLog,
  onAddCustomHabit,
  onDeleteCustomHabit,
  onToggleCustomHabitLog,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser.id);
  const isViewingOther = selectedMemberId !== currentUser.id;
  const targetUser = allUsers?.find(u => u.id === selectedMemberId) || currentUser;

  const [activeMissedGoal, setActiveMissedGoal] = useState<GoalType | null>(null);
  const [selectedTag, setSelectedTag] = useState<ReasonTag>('Tired');
  const [customReasonText, setCustomReasonText] = useState('');

  // Supplement Form Modal State
  const [isAddSuppOpen, setIsAddSuppOpen] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppDosage, setSuppDosage] = useState('');
  const [suppTiming, setSuppTiming] = useState('Morning');

  // Custom Habit Form Modal State
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDesc, setHabitDesc] = useState('');

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
    : dailyLog;

  const targetWorkoutsCount = allWorkouts
    ? allWorkouts.filter(w => w.user_id === targetUser.id && w.date === selectedDate).length
    : (isViewingOther ? 0 : gymWorkoutsCount);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDateChange = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const newDateStr = d.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  const handleToggleGoal = (goal: GoalType, currentValue: boolean) => {
    if (isViewingOther) return;
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

  const userSupplements = supplements.filter(s => s.user_id === targetUser.id);
  const userHabits = customHabits.filter(h => h.user_id === targetUser.id);

  const completedCount = [
    displayedDailyLog.gym_done,
    displayedDailyLog.steps_done,
    displayedDailyLog.sleep_done,
    displayedDailyLog.junk_food_avoided,
    displayedDailyLog.water_done,
  ].filter(Boolean).length;

  const completionPercent = Math.round((completedCount / 5) * 100);

  const getGoalMissedReason = (goal: GoalType) => {
    return missedReasons.find(
      r => r.goal_type === goal && r.user_id === targetUser.id && (r.daily_log_id === displayedDailyLog.id || r.date === selectedDate)
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Member Accountability Selector */}
      {allUsers && allUsers.length > 1 && (
        <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c68b59]/20 text-[#d4a373] border border-[#c68b59]/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#f5efe6] flex items-center gap-2">
                Member Checklist Viewer
                {isViewingOther && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/60 font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Read-Only
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#c5b4a5]">Inspect your own or your teammates' daily habits & accountability</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#c5b4a5] shrink-0">Member:</span>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full sm:w-auto bg-[#1c1815] text-[#f5efe6] font-bold text-xs border border-[#3d322a] rounded-xl px-3 py-2 focus:outline-none focus:border-[#c68b59] cursor-pointer"
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
                className="px-2.5 py-2 bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] text-xs font-bold rounded-xl border border-[#c68b59]/30 transition shrink-0 cursor-pointer"
              >
                Reset to Me
              </button>
            )}
          </div>
        </div>
      )}

      {/* Read-Only Notice when viewing another member */}
      {isViewingOther && (
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Viewing <strong>{targetUser.name}</strong>'s daily checklist for <strong>{selectedDate}</strong>. Check out their logged goals, steps, sleep, and reasons below!
            </span>
          </div>
        </div>
      )}

      {/* Date Navigation & Calendar Picker Bar */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Interactive Calendar Date Selector */}
        <div className="flex items-center gap-3 bg-[#1c1815] border border-[#3d322a] rounded-xl px-3 py-2">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-1.5 hover:bg-[#322a24] rounded-lg text-[#c5b4a5] transition cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-[#f5efe6] font-bold text-sm">
            <Calendar className="w-4 h-4 text-[#c68b59]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[#f5efe6] font-bold text-sm focus:outline-none cursor-pointer"
            />
            {selectedDate === todayStr && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#c68b59]/20 text-[#d4a373] font-bold border border-[#c68b59]/30">
                Today
              </span>
            )}
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-1.5 hover:bg-[#322a24] rounded-lg text-[#c5b4a5] transition cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Completion Meter */}
        <div className="w-full md:w-auto flex items-center gap-4 bg-[#1c1815] border border-[#3d322a] rounded-xl p-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4" className="text-[#322a24]" fill="transparent" />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="4"
                className="text-[#c68b59] transition-all duration-500"
                fill="transparent"
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * completionPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-black text-[#f5efe6]">{completionPercent}%</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#f5efe6]">{isViewingOther ? `${targetUser.name}'s Goals` : 'Daily Goal Completion'}</h3>
            <p className="text-xs text-[#c5b4a5] mt-0.5">
              {completedCount} of 5 core goals completed for {selectedDate}
            </p>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Goal 1: Gym Routine */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-4 sm:p-5 transition-all ${displayedDailyLog.gym_done ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#3d322a]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${displayedDailyLog.gym_done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-[#f5efe6] text-sm sm:text-base">1. Gym Routine</h4>
                <p className="text-xs text-[#c5b4a5] truncate">Log strength or cardio workouts</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                displayedDailyLog.gym_done
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                  : 'bg-[#1c1815] text-[#c5b4a5] border border-[#3d322a]'
              }`}>
                {displayedDailyLog.gym_done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-[#c5b4a5]" />}
                <span>{displayedDailyLog.gym_done ? 'Completed' : 'Not Done'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {displayedDailyLog.gym_done ? (
                  <button
                    onClick={() => handleToggleGoal('gym', true)}
                    className="w-full sm:w-auto flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer min-h-[40px]"
                    title="Click to unmark as completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleGoal('gym', false)}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#c68b59]/20 transition cursor-pointer min-h-[40px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMissedGoal('gym')}
                      className={`flex-1 sm:flex-initial px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[40px] ${
                        getGoalMissedReason('gym')
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/60'
                          : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-900/60'
                      }`}
                      title="Unable to complete gym workout? Log reason"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{getGoalMissedReason('gym') ? 'Reason Logged' : 'Failed'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#3d322a] flex items-center justify-between">
            <span className="text-xs text-[#c5b4a5]">
              Workouts Logged: <strong className="text-[#d4a373]">{targetWorkoutsCount} entries</strong>
            </span>
            {!isViewingOther && (
              <button
                onClick={onOpenWorkoutModal}
                className="text-xs font-bold text-[#d4a373] hover:text-[#f5efe6] flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#c68b59]/10 border border-[#c68b59]/30 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Log Details
              </button>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.gym_done && getGoalMissedReason('gym') && (
            <div className="mt-3 p-2.5 bg-red-950/30 rounded-xl text-xs text-red-300 flex items-center justify-between border border-red-800/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('gym')?.reason_tag}]{' '}
                  {getGoalMissedReason('gym')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('gym')}
                  className="text-[11px] underline text-red-400 hover:text-red-300 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 2: Daily Steps & Points Allocation */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-4 sm:p-5 transition-all ${displayedDailyLog.steps_done ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#3d322a]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${displayedDailyLog.steps_done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Footprints className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-[#f5efe6] text-sm sm:text-base">2. Daily Steps</h4>
                <p className="text-xs text-[#c5b4a5] truncate">Target: {stepTarget.toLocaleString()} steps</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                displayedDailyLog.steps_done
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                  : 'bg-[#1c1815] text-[#c5b4a5] border border-[#3d322a]'
              }`}>
                {displayedDailyLog.steps_done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-[#c5b4a5]" />}
                <span>{displayedDailyLog.steps_done ? `${(displayedDailyLog.steps_value || 0).toLocaleString()} steps (Hit)` : 'Off Target'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {displayedDailyLog.steps_done ? (
                  <button
                    onClick={() => handleToggleGoal('steps', true)}
                    className="w-full sm:w-auto flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer min-h-[40px]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        const val = Math.max(stepTarget, dailyLog.steps_value || 0);
                        onUpdateDailyLog({ ...dailyLog, steps_done: true, steps_value: val, steps_target: stepTarget });
                      }}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#c68b59]/20 transition cursor-pointer min-h-[40px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMissedGoal('steps')}
                      className={`flex-1 sm:flex-initial px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[40px] ${
                        getGoalMissedReason('steps')
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/60'
                          : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-900/60'
                      }`}
                      title="Unable to hit step goal? Log reason"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{getGoalMissedReason('steps') ? 'Reason Logged' : 'Failed'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Interactive Step Input (Only editable if viewing own checklist) */}
          <div className="mt-4 bg-[#1c1815] p-3 rounded-xl border border-[#3d322a] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-[#c5b4a5]">Total Steps Logged:</label>
              <div className="flex items-center gap-2">
                {isViewingOther ? (
                  <span className="font-mono font-bold text-sm text-[#f5efe6]">{displayedDailyLog.steps_value || 0}</span>
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
                    className="w-28 px-2.5 py-1.5 bg-[#26201b] text-[#f5efe6] font-mono font-bold text-sm rounded-lg border border-[#3d322a] focus:outline-none focus:border-[#c68b59] text-right"
                  />
                )}
                <span className="text-xs font-bold text-[#c5b4a5]">steps</span>
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
                    className="py-1.5 px-2 rounded-lg bg-[#26201b] hover:bg-[#322a24] text-[#d4a373] text-xs font-bold border border-[#3d322a] transition cursor-pointer text-center"
                  >
                    +{stepCount.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.steps_done && getGoalMissedReason('steps') && (
            <div className="mt-3 p-2.5 bg-red-950/30 rounded-xl text-xs text-red-300 flex items-center justify-between border border-red-800/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('steps')?.reason_tag}]{' '}
                  {getGoalMissedReason('steps')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('steps')}
                  className="text-[11px] underline text-red-400 hover:text-red-300 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 3: Sleep Tracker */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-4 sm:p-5 transition-all ${displayedDailyLog.sleep_done ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#3d322a]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${displayedDailyLog.sleep_done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-[#f5efe6] text-sm sm:text-base">3. Sleep Routine</h4>
                <p className="text-xs text-[#c5b4a5] truncate">Target: {sleepMin} – {sleepMax} hrs</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                displayedDailyLog.sleep_done
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                  : 'bg-[#1c1815] text-[#c5b4a5] border border-[#3d322a]'
              }`}>
                {displayedDailyLog.sleep_done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-[#c5b4a5]" />}
                <span>{displayedDailyLog.sleep_done ? 'Target Hit' : 'Off Target'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {displayedDailyLog.sleep_done ? (
                  <button
                    onClick={() => handleToggleGoal('sleep', true)}
                    className="w-full sm:w-auto flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer min-h-[40px]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target Hit</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleGoal('sleep', false)}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#c68b59]/20 transition cursor-pointer min-h-[40px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMissedGoal('sleep')}
                      className={`flex-1 sm:flex-initial px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[40px] ${
                        getGoalMissedReason('sleep')
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/60'
                          : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-900/60'
                      }`}
                      title="Missed sleep schedule? Log reason"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{getGoalMissedReason('sleep') ? 'Reason Logged' : 'Failed'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sleep Time Inputs */}
          <div className="mt-4 grid grid-cols-2 gap-3 bg-[#1c1815] p-3 rounded-xl border border-[#3d322a]">
            <div>
              <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#c68b59]" /> Sleep Start
              </label>
              {isViewingOther ? (
                <span className="font-mono text-xs text-[#f5efe6]">{displayedDailyLog.sleep_start || '23:00'}</span>
              ) : (
                <input
                  type="time"
                  value={dailyLog.sleep_start || '23:00'}
                  onChange={(e) => handleSleepTimeChange(e.target.value, undefined)}
                  className="w-full bg-[#26201b] text-[#f5efe6] text-sm sm:text-xs px-2 py-1.5 rounded-lg border border-[#3d322a] focus:outline-none focus:border-[#c68b59]"
                />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#d4a373]" /> Wake Time
              </label>
              {isViewingOther ? (
                <span className="font-mono text-xs text-[#f5efe6]">{displayedDailyLog.sleep_end || '07:00'}</span>
              ) : (
                <input
                  type="time"
                  value={dailyLog.sleep_end || '07:00'}
                  onChange={(e) => handleSleepTimeChange(undefined, e.target.value)}
                  className="w-full bg-[#26201b] text-[#f5efe6] text-sm sm:text-xs px-2 py-1.5 rounded-lg border border-[#3d322a] focus:outline-none focus:border-[#c68b59]"
                />
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#c5b4a5]">Calculated Sleep Duration:</span>
            <strong className="text-[#f5efe6] font-mono text-sm">{displayedDailyLog.sleep_duration || 0} hrs</strong>
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.sleep_done && getGoalMissedReason('sleep') && (
            <div className="mt-3 p-2.5 bg-red-950/30 rounded-xl text-xs text-red-300 flex items-center justify-between border border-red-800/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('sleep')?.reason_tag}]{' '}
                  {getGoalMissedReason('sleep')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('sleep')}
                  className="text-[11px] underline text-red-400 hover:text-red-300 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 4: Junk Food Tracker */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-4 sm:p-5 transition-all ${displayedDailyLog.junk_food_avoided ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#3d322a]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${displayedDailyLog.junk_food_avoided ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-[#f5efe6] text-sm sm:text-base">4. Junk Food Control</h4>
                <p className="text-xs text-[#c5b4a5] truncate">Avoid processed sweets & junk meals</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                displayedDailyLog.junk_food_avoided
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                  : 'bg-[#1c1815] text-[#c5b4a5] border border-[#3d322a]'
              }`}>
                {displayedDailyLog.junk_food_avoided ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-[#c5b4a5]" />}
                <span>{displayedDailyLog.junk_food_avoided ? 'Clean Nutrition' : 'Had Junk Food'}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {displayedDailyLog.junk_food_avoided ? (
                  <button
                    onClick={() => handleToggleGoal('junk_food', true)}
                    className="w-full sm:w-auto flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer min-h-[40px]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Avoided</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleGoal('junk_food', false)}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#c68b59]/20 transition cursor-pointer min-h-[40px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMissedGoal('junk_food')}
                      className={`flex-1 sm:flex-initial px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[40px] ${
                        getGoalMissedReason('junk_food')
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/60'
                          : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-900/60'
                      }`}
                      title="Ate junk food / cheat meal? Log reason"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{getGoalMissedReason('junk_food') ? 'Reason Logged' : 'Failed'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#3d322a]">
            <span className="text-xs text-[#c5b4a5]">
              Goal: <strong className="text-[#f5efe6]">Strict nutrition discipline</strong>
            </span>
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.junk_food_avoided && getGoalMissedReason('junk_food') && (
            <div className="mt-3 p-2.5 bg-red-950/30 rounded-xl text-xs text-red-300 flex items-center justify-between border border-red-800/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="break-words">
                  <strong>Reason:</strong> [{getGoalMissedReason('junk_food')?.reason_tag}]{' '}
                  {getGoalMissedReason('junk_food')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('junk_food')}
                  className="text-[11px] underline text-red-400 hover:text-red-300 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Goal 5: Water Hydration Tracker */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-4 sm:p-5 transition-all col-span-1 md:col-span-2 ${displayedDailyLog.water_done ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-[#3d322a]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${displayedDailyLog.water_done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-[#d4a373]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-[#f5efe6] text-sm sm:text-base">5. Water Hydration</h4>
                <p className="text-xs text-[#c5b4a5] truncate">Daily target: {(waterTarget / 1000).toFixed(1)} Liters</p>
              </div>
            </div>

            {/* Action Buttons: Mark Done and Failed */}
            {isViewingOther ? (
              <span className={`w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                displayedDailyLog.water_done
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                  : 'bg-[#1c1815] text-[#c5b4a5] border border-[#3d322a]'
              }`}>
                {displayedDailyLog.water_done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-[#c5b4a5]" />}
                <span>{displayedDailyLog.water_done ? `${(waterTarget / 1000).toFixed(1)}L Target Hit` : `${((displayedDailyLog.water_intake_ml || 0) / 1000).toFixed(1)}L Logged`}</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {displayedDailyLog.water_done ? (
                  <button
                    onClick={() => handleToggleGoal('water', true)}
                    className="w-full sm:w-auto flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer min-h-[40px]"
                    title="Click to unmark"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Target Hit</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleGoal('water', false)}
                      className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#c68b59]/20 transition cursor-pointer min-h-[40px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMissedGoal('water')}
                      className={`flex-1 sm:flex-initial px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border min-h-[40px] ${
                        getGoalMissedReason('water')
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/60'
                          : 'bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-900/60'
                      }`}
                      title="Missed hydration target? Log reason"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{getGoalMissedReason('water') ? 'Reason Logged' : 'Failed'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1c1815] p-3 rounded-xl border border-[#3d322a]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#c5b4a5]">Water Logged:</span>
              <strong className="text-[#d4a373] font-mono text-sm">{displayedDailyLog.water_intake_ml || 0} ml / {waterTarget} ml</strong>
            </div>

            {/* Water Action Buttons (Add, Subtract, Reset) */}
            {!isViewingOther && (
              <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleAddWater(250)}
                  className="py-2 px-2 text-center rounded-lg bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] text-xs font-bold border border-[#c68b59]/30 transition cursor-pointer"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(500)}
                  className="py-2 px-2 text-center rounded-lg bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] text-xs font-bold border border-[#c68b59]/30 transition cursor-pointer"
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
                  className="py-2 px-2 text-center rounded-lg bg-[#322a24] hover:bg-[#3d322a] text-[#c5b4a5] hover:text-[#f5efe6] text-xs font-bold border border-[#3d322a] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="py-2 px-2 text-center rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Reset Water Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Logged Failure Reason Banner */}
          {!displayedDailyLog.water_done && getGoalMissedReason('water') && (
            <div className="mt-3 p-2.5 bg-red-950/30 rounded-xl text-xs text-red-300 flex items-center justify-between border border-red-800/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Reason:</strong> [{getGoalMissedReason('water')?.reason_tag}]{' '}
                  {getGoalMissedReason('water')?.reason_text}
                </span>
              </div>
              {!isViewingOther && (
                <button
                  onClick={() => setActiveMissedGoal('water')}
                  className="text-[11px] underline text-red-400 hover:text-red-300 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Supplements Tracker Section */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Pill className="w-5 h-5 text-[#c68b59] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#f5efe6]">Supplements Tracker</h3>
              <p className="text-xs text-[#c5b4a5]">Add, delete, and check off daily supplement intake</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddSuppOpen(true)}
            className="w-full sm:w-auto justify-center px-3 py-2 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Supplement
          </button>
        </div>

        {userSupplements.length === 0 ? (
          <p className="text-xs text-[#c5b4a5] italic py-2">No supplements added yet. Click "+ Add Supplement" to add your daily stack.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userSupplements.map((supp) => {
              const log = supplementLogs.find(l => l.supplement_id === supp.id && l.date === selectedDate);
              const isTaken = !!log?.taken;

              return (
                <div
                  key={supp.id}
                  className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isTaken ? 'bg-[#c68b59]/10 border-[#c68b59]/40' : 'bg-[#1c1815] border-[#3d322a]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onToggleSupplementLog(supp.id, selectedDate, !isTaken)}
                      className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                        isTaken ? 'text-[#c68b59]' : 'text-[#c5b4a5] hover:text-[#f5efe6]'
                      }`}
                    >
                      {isTaken ? <CheckCircle2 className="w-5 h-5 text-[#c68b59]" /> : <XCircle className="w-5 h-5" />}
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#f5efe6] truncate">{supp.name}</h4>
                      <p className="text-[11px] text-[#c5b4a5] truncate">{supp.dosage} • {supp.timing}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteSupplement(supp.id)}
                    className="p-1.5 text-[#c5b4a5] hover:text-rose-400 transition shrink-0 ml-2"
                    title="Delete Supplement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Private Habit Tracker Section */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ListCheck className="w-5 h-5 text-[#c68b59] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#f5efe6] flex items-center gap-2">
                Custom Private Habit Tracker
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1815] text-[#d4a373] border border-[#3d322a] flex items-center gap-1 font-semibold">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              </h3>
              <p className="text-xs text-[#c5b4a5]">Add custom personal habits visible only to you</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddHabitOpen(true)}
            className="w-full sm:w-auto justify-center px-3 py-2 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Private Habit
          </button>
        </div>

        {userHabits.length === 0 ? (
          <p className="text-xs text-[#c5b4a5] italic py-2">No custom private habits added yet. Click "+ Add Private Habit" to create custom personal trackers.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userHabits.map((habit) => {
              const log = customHabitLogs.find(l => l.habit_id === habit.id && l.date === selectedDate);
              const isCompleted = !!log?.completed;

              return (
                <div
                  key={habit.id}
                  className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isCompleted ? 'bg-[#c68b59]/10 border-[#c68b59]/40' : 'bg-[#1c1815] border-[#3d322a]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onToggleCustomHabitLog(habit.id, selectedDate, !isCompleted)}
                      className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${
                        isCompleted ? 'text-[#c68b59]' : 'text-[#c5b4a5] hover:text-[#f5efe6]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[#c68b59]" /> : <XCircle className="w-5 h-5" />}
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#f5efe6] truncate">{habit.title}</h4>
                      {habit.description && <p className="text-[11px] text-[#c5b4a5] truncate">{habit.description}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteCustomHabit(habit.id)}
                    className="p-1.5 text-[#c5b4a5] hover:text-rose-400 transition shrink-0 ml-2"
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

      {/* Add Supplement Modal */}
      {isAddSuppOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#f5efe6] mb-1 flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#c68b59]" /> Add New Supplement
            </h3>
            <p className="text-xs text-[#c5b4a5] mb-4">Add a supplement to your daily intake checklist.</p>

            <form onSubmit={handleCreateSupplement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Supplement Name</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder="e.g. Creatine Monohydrate"
                  className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Dosage</label>
                <input
                  type="text"
                  value={suppDosage}
                  onChange={(e) => setSuppDosage(e.target.value)}
                  placeholder="e.g. 5g or 1 scoop"
                  className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Timing</label>
                <select
                  value={suppTiming}
                  onChange={(e) => setSuppTiming(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
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
                  className="w-1/2 py-2.5 min-h-[42px] bg-[#1c1815] text-[#c5b4a5] font-bold rounded-xl text-xs hover:bg-[#322a24] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 min-h-[42px] bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-[#c68b59]/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#f5efe6] mb-1 flex items-center gap-2">
              <ListCheck className="w-5 h-5 text-[#c68b59]" /> Add Custom Private Habit
            </h3>
            <p className="text-xs text-[#c5b4a5] mb-4">Create a private habit tracker visible only to your account.</p>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. Read 15 pages or Meditation"
                  className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={habitDesc}
                  onChange={(e) => setHabitDesc(e.target.value)}
                  placeholder="e.g. Daily morning routine"
                  className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddHabitOpen(false)}
                  className="w-1/2 py-2.5 min-h-[42px] bg-[#1c1815] text-[#c5b4a5] font-bold rounded-xl text-xs hover:bg-[#322a24] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 min-h-[42px] bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-[#c68b59]/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-[#f5efe6] mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#c68b59]" />
              Reason for missing {activeMissedGoal.toUpperCase().replace('_', ' ')} goal
            </h3>

            <form onSubmit={handleSaveMissedReason} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-2">Category Tag</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(['Tired', 'Work', 'Travel', 'Lazy', 'Sick', 'Sore', 'Cheat Day', 'Other'] as ReasonTag[]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`p-2 min-h-[38px] rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selectedTag === tag
                          ? 'bg-[#c68b59]/20 text-[#d4a373] border-[#c68b59]'
                          : 'bg-[#1c1815] text-[#c5b4a5] border-[#3d322a]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Notes</label>
                <input
                  type="text"
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="e.g. Travel delay, overtime work..."
                  className="w-full px-3.5 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal(null)}
                  className="w-1/2 py-2.5 min-h-[42px] bg-[#1c1815] text-[#c5b4a5] font-bold rounded-xl text-xs transition hover:bg-[#322a24] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 min-h-[42px] bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition cursor-pointer"
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
