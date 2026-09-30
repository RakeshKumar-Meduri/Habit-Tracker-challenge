import React, { useState } from 'react';
import type { 
  User, 
  DailyLog, 
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
  ListCheck
} from 'lucide-react';

interface DailyChecklistProps {
  currentUser: User;
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

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDateChange = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const newDateStr = d.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  const handleToggleGoal = (goal: GoalType, currentValue: boolean) => {
    const newValue = !currentValue;

    if (goal === 'gym') {
      const updatedLog = { ...dailyLog, gym_done: newValue };
      onUpdateDailyLog(updatedLog);
      if (newValue) {
        onOpenWorkoutModal();
      } else {
        setActiveMissedGoal('gym');
      }
    } else if (goal === 'steps') {
      onUpdateDailyLog({ ...dailyLog, steps_done: newValue, steps_target: stepTarget });
      if (!newValue) setActiveMissedGoal('steps');
    } else if (goal === 'sleep') {
      onUpdateDailyLog({ ...dailyLog, sleep_done: newValue });
      if (!newValue) setActiveMissedGoal('sleep');
    } else if (goal === 'junk_food') {
      onUpdateDailyLog({ ...dailyLog, junk_food_avoided: newValue });
      if (!newValue) setActiveMissedGoal('junk_food');
    } else if (goal === 'water') {
      const newWaterMl = newValue ? waterTarget : 0;
      onUpdateDailyLog({ ...dailyLog, water_done: newValue, water_intake_ml: newWaterMl, water_target_ml: waterTarget });
      if (!newValue) setActiveMissedGoal('water');
    }
  };

  const handleSleepTimeChange = (startTime?: string, endTime?: string) => {
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

  const userSupplements = supplements.filter(s => s.user_id === currentUser.id);
  const userHabits = customHabits.filter(h => h.user_id === currentUser.id);

  const completedCount = [
    dailyLog.gym_done,
    dailyLog.steps_done,
    dailyLog.sleep_done,
    dailyLog.junk_food_avoided,
    dailyLog.water_done,
  ].filter(Boolean).length;

  const completionPercent = Math.round((completedCount / 5) * 100);

  const getGoalMissedReason = (goal: GoalType) => {
    return missedReasons.find(r => r.goal_type === goal && (r.daily_log_id === dailyLog.id || r.date === selectedDate));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
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
            <h3 className="text-sm font-bold text-[#f5efe6]">Daily Goal Completion</h3>
            <p className="text-xs text-[#c5b4a5] mt-0.5">
              {completedCount} of 5 core goals logged for {selectedDate}
            </p>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Goal 1: Gym Routine */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-5 transition-all ${dailyLog.gym_done ? 'border-[#c68b59]/50 bg-[#c68b59]/10' : 'border-[#3d322a]'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${dailyLog.gym_done ? 'bg-[#c68b59]/20 text-[#d4a373]' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#f5efe6] text-base">1. Gym Routine</h4>
                <p className="text-xs text-[#c5b4a5]">Log strength or cardio workouts</p>
              </div>
            </div>

            <button
              onClick={() => handleToggleGoal('gym', dailyLog.gym_done)}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                dailyLog.gym_done
                  ? 'bg-[#c68b59] text-[#1c1815] shadow-md shadow-[#c68b59]/20'
                  : 'bg-[#1c1815] text-[#c5b4a5] hover:text-[#f5efe6] border border-[#3d322a]'
              }`}
            >
              {dailyLog.gym_done ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span>{dailyLog.gym_done ? 'Completed' : 'Mark Done'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-[#3d322a] flex items-center justify-between">
            <span className="text-xs text-[#c5b4a5]">
              Workouts Logged: <strong className="text-[#d4a373]">{gymWorkoutsCount} entries</strong>
            </span>
            <button
              onClick={onOpenWorkoutModal}
              className="text-xs font-bold text-[#d4a373] hover:text-[#f5efe6] flex items-center gap-1 py-1 px-2.5 rounded-lg bg-[#c68b59]/10 border border-[#c68b59]/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Log Workout Details
            </button>
          </div>

          {!dailyLog.gym_done && getGoalMissedReason('gym') && (
            <div className="mt-3 p-2.5 bg-[#1c1815] rounded-xl text-xs text-[#d4a373] flex items-center gap-2 border border-[#3d322a]">
              <AlertCircle className="w-4 h-4 text-[#c68b59] shrink-0" />
              <span>
                <strong>Reason logged:</strong> [{getGoalMissedReason('gym')?.reason_tag}]{' '}
                {getGoalMissedReason('gym')?.reason_text}
              </span>
            </div>
          )}
        </div>

        {/* Goal 2: Daily Steps & Points Allocation */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-5 transition-all ${dailyLog.steps_done ? 'border-[#c68b59]/50 bg-[#c68b59]/10' : 'border-[#3d322a]'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${dailyLog.steps_done ? 'bg-[#c68b59]/20 text-[#d4a373]' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Footprints className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#f5efe6] text-base">2. Daily Steps & Points</h4>
                <p className="text-xs text-[#c5b4a5]">Enter steps (6k – 10k+ for bonus points)</p>
              </div>
            </div>

            <div className="text-right">
              {(() => {
                const s = dailyLog.steps_value || 0;
                let tierLabel = 'Under 6k (0 pts)';
                let tierBg = 'bg-[#1c1815] text-[#c5b4a5] border-[#3d322a]';
                if (s >= 10000) {
                  tierLabel = 'Gold Tier (+3 pts)';
                  tierBg = 'bg-[#c68b59] text-[#1c1815] shadow-md shadow-[#c68b59]/20 font-black';
                } else if (s >= 8000) {
                  tierLabel = 'Silver Tier (+2 pts)';
                  tierBg = 'bg-[#c68b59]/30 text-[#d4a373] border border-[#c68b59]/50 font-bold';
                } else if (s >= 6000) {
                  tierLabel = 'Bronze Tier (+1 pt)';
                  tierBg = 'bg-[#c68b59]/20 text-[#d4a373] border border-[#c68b59]/30 font-semibold';
                }
                return (
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs transition ${tierBg}`}>
                    {tierLabel}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Interactive Step Input */}
          <div className="mt-4 bg-[#1c1815] p-3 rounded-xl border border-[#3d322a] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-[#c5b4a5]">Total Steps Logged:</label>
              <div className="flex items-center gap-2">
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
                      steps_done: num >= 6000,
                      steps_target: stepTarget,
                    });
                  }}
                  className="w-28 px-2.5 py-1 bg-[#26201b] text-[#f5efe6] font-mono font-bold text-sm rounded-lg border border-[#3d322a] focus:outline-none focus:border-[#c68b59] text-right"
                />
                <span className="text-xs font-bold text-[#c5b4a5]">steps</span>
              </div>
            </div>

            {/* Quick Step Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[6000, 8000, 10000].map((stepCount) => (
                <button
                  key={stepCount}
                  type="button"
                  onClick={() => {
                    onUpdateDailyLog({
                      ...dailyLog,
                      steps_value: stepCount,
                      steps_done: true,
                      steps_target: stepTarget,
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#26201b] hover:bg-[#322a24] text-[#d4a373] text-[11px] font-bold border border-[#3d322a] transition cursor-pointer"
                >
                  +{stepCount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Goal 3: Sleep Tracker (Start & End Time Calculation) */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-5 transition-all ${dailyLog.sleep_done ? 'border-[#c68b59]/50 bg-[#c68b59]/10' : 'border-[#3d322a]'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${dailyLog.sleep_done ? 'bg-[#c68b59]/20 text-[#d4a373]' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#f5efe6] text-base">3. Sleep Routine</h4>
                <p className="text-xs text-[#c5b4a5]">Auto-calculated duration from start & end time</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${dailyLog.sleep_done ? 'bg-[#c68b59]/20 text-[#d4a373] border border-[#c68b59]/30' : 'bg-[#322a24] text-[#c5b4a5] border border-[#3d322a]'}`}>
              {dailyLog.sleep_done ? 'Target Hit' : 'Off Target'}
            </span>
          </div>

          {/* Sleep Time Inputs */}
          <div className="mt-4 grid grid-cols-2 gap-3 bg-[#1c1815] p-3 rounded-xl border border-[#3d322a]">
            <div>
              <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#c68b59]" /> Sleep Start
              </label>
              <input
                type="time"
                value={dailyLog.sleep_start || '23:00'}
                onChange={(e) => handleSleepTimeChange(e.target.value, undefined)}
                className="w-full bg-[#26201b] text-[#f5efe6] text-xs px-2 py-1.5 rounded-lg border border-[#3d322a] focus:outline-none focus:border-[#c68b59]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#d4a373]" /> Wake Time
              </label>
              <input
                type="time"
                value={dailyLog.sleep_end || '07:00'}
                onChange={(e) => handleSleepTimeChange(undefined, e.target.value)}
                className="w-full bg-[#26201b] text-[#f5efe6] text-xs px-2 py-1.5 rounded-lg border border-[#3d322a] focus:outline-none focus:border-[#c68b59]"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-[#c5b4a5]">Calculated Sleep Duration:</span>
            <strong className="text-[#f5efe6] font-mono text-sm">{dailyLog.sleep_duration || 0} hrs</strong>
          </div>
        </div>

        {/* Goal 4: Junk Food Tracker */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-5 transition-all ${dailyLog.junk_food_avoided ? 'border-[#c68b59]/50 bg-[#c68b59]/10' : 'border-[#3d322a]'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${dailyLog.junk_food_avoided ? 'bg-[#c68b59]/20 text-[#d4a373]' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#f5efe6] text-base">4. Junk Food Control</h4>
                <p className="text-xs text-[#c5b4a5]">Avoid processed sweets & junk meals</p>
              </div>
            </div>

            <button
              onClick={() => handleToggleGoal('junk_food', dailyLog.junk_food_avoided)}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                dailyLog.junk_food_avoided
                  ? 'bg-[#c68b59] text-[#1c1815] shadow-md shadow-[#c68b59]/20'
                  : 'bg-[#1c1815] text-[#c5b4a5] hover:text-[#f5efe6] border border-[#3d322a]'
              }`}
            >
              {dailyLog.junk_food_avoided ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span>{dailyLog.junk_food_avoided ? 'Completed' : 'Mark Done'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-[#3d322a]">
            <span className="text-xs text-[#c5b4a5]">
              Goal: <strong className="text-[#f5efe6]">Clean nutrition maintained</strong>
            </span>
          </div>
        </div>

        {/* Goal 5: Water Hydration Tracker (With Delete / Undo Option) */}
        <div className={`relative bg-[#26201b] border rounded-2xl p-5 transition-all col-span-1 md:col-span-2 ${dailyLog.water_done ? 'border-[#c68b59]/50 bg-[#c68b59]/10' : 'border-[#3d322a]'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${dailyLog.water_done ? 'bg-[#c68b59]/20 text-[#d4a373]' : 'bg-[#1c1815] text-[#c5b4a5]'}`}>
                <Droplets className="w-6 h-6 text-[#d4a373]" />
              </div>
              <div>
                <h4 className="font-bold text-[#f5efe6] text-base">5. Water Hydration</h4>
                <p className="text-xs text-[#c5b4a5]">Daily target: {(waterTarget / 1000).toFixed(1)} Liters</p>
              </div>
            </div>

            <button
              onClick={() => handleToggleGoal('water', dailyLog.water_done)}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                dailyLog.water_done
                  ? 'bg-[#c68b59] text-[#1c1815] shadow-md shadow-[#c68b59]/20'
                  : 'bg-[#1c1815] text-[#c5b4a5] hover:text-[#f5efe6] border border-[#3d322a]'
              }`}
            >
              {dailyLog.water_done ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span>{dailyLog.water_done ? 'Target Hit' : 'Mark Done'}</span>
            </button>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1c1815] p-3 rounded-xl border border-[#3d322a]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#c5b4a5]">Water Logged:</span>
              <strong className="text-[#d4a373] font-mono text-sm">{dailyLog.water_intake_ml || 0} ml / {waterTarget} ml</strong>
            </div>

            {/* Water Action Buttons (Add, Subtract, Reset) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddWater(250)}
                className="px-2.5 py-1.5 rounded-lg bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] text-xs font-bold border border-[#c68b59]/30 transition cursor-pointer"
              >
                +250ml
              </button>
              <button
                type="button"
                onClick={() => handleAddWater(500)}
                className="px-2.5 py-1.5 rounded-lg bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] text-xs font-bold border border-[#c68b59]/30 transition cursor-pointer"
              >
                +500ml
              </button>

              {/* Undo / Delete accidental water clicks */}
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
                className="px-2.5 py-1.5 rounded-lg bg-[#322a24] hover:bg-[#3d322a] text-[#c5b4a5] hover:text-[#f5efe6] text-xs font-bold border border-[#3d322a] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Subtract 250ml (Undo accidental click)"
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
                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Reset Water Entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Supplements Tracker Section */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Pill className="w-5 h-5 text-[#c68b59]" />
            <div>
              <h3 className="text-base font-bold text-[#f5efe6]">Supplements Tracker</h3>
              <p className="text-xs text-[#c5b4a5]">Add, delete, and check off daily supplement intake</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddSuppOpen(true)}
            className="px-3 py-1.5 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
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
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isTaken ? 'bg-[#c68b59]/10 border-[#c68b59]/40' : 'bg-[#1c1815] border-[#3d322a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleSupplementLog(supp.id, selectedDate, !isTaken)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isTaken ? 'text-[#c68b59]' : 'text-[#c5b4a5] hover:text-[#f5efe6]'
                      }`}
                    >
                      {isTaken ? <CheckCircle2 className="w-5 h-5 text-[#c68b59]" /> : <XCircle className="w-5 h-5" />}
                    </button>
                    <div>
                      <h4 className="text-xs font-bold text-[#f5efe6]">{supp.name}</h4>
                      <p className="text-[11px] text-[#c5b4a5]">{supp.dosage} • {supp.timing}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteSupplement(supp.id)}
                    className="p-1 text-[#c5b4a5] hover:text-rose-400 transition"
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
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ListCheck className="w-5 h-5 text-[#c68b59]" />
            <div>
              <h3 className="text-base font-bold text-[#f5efe6] flex items-center gap-2">
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
            className="px-3 py-1.5 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
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
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isCompleted ? 'bg-[#c68b59]/10 border-[#c68b59]/40' : 'bg-[#1c1815] border-[#3d322a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleCustomHabitLog(habit.id, selectedDate, !isCompleted)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isCompleted ? 'text-[#c68b59]' : 'text-[#c5b4a5] hover:text-[#f5efe6]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[#c68b59]" /> : <XCircle className="w-5 h-5" />}
                    </button>
                    <div>
                      <h4 className="text-xs font-bold text-[#f5efe6]">{habit.title}</h4>
                      {habit.description && <p className="text-[11px] text-[#c5b4a5]">{habit.description}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteCustomHabit(habit.id)}
                    className="p-1 text-[#c5b4a5] hover:text-rose-400 transition"
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
          <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#f5efe6] mb-1 flex items-center gap-2">
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
                  className="w-full px-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Dosage</label>
                <input
                  type="text"
                  value={suppDosage}
                  onChange={(e) => setSuppDosage(e.target.value)}
                  placeholder="e.g. 5g or 1 scoop"
                  className="w-full px-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Timing</label>
                <select
                  value={suppTiming}
                  onChange={(e) => setSuppTiming(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
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
                  className="w-1/2 py-2.5 bg-[#1c1815] text-[#c5b4a5] font-bold rounded-xl text-xs hover:bg-[#322a24] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-[#c68b59]/20"
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
          <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#f5efe6] mb-1 flex items-center gap-2">
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
                  className="w-full px-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={habitDesc}
                  onChange={(e) => setHabitDesc(e.target.value)}
                  placeholder="e.g. Daily morning routine"
                  className="w-full px-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddHabitOpen(false)}
                  className="w-1/2 py-2.5 bg-[#1c1815] text-[#c5b4a5] font-bold rounded-xl text-xs hover:bg-[#322a24] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-[#c68b59]/20"
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
          <div className="relative w-full max-w-md bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#f5efe6] mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#c68b59]" />
              Reason for missing {activeMissedGoal.toUpperCase().replace('_', ' ')} goal
            </h3>

            <form onSubmit={handleSaveMissedReason} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c5b4a5] mb-2">Category Tag</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Tired', 'Work', 'Travel', 'Lazy', 'Sick', 'Other'] as ReasonTag[]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                  className="w-full px-3 py-2 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMissedGoal(null)}
                  className="w-1/2 py-2.5 bg-[#1c1815] text-[#c5b4a5] font-bold rounded-xl text-xs transition hover:bg-[#322a24] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition cursor-pointer"
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
