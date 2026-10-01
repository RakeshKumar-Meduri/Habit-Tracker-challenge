import React, { useState, useMemo } from 'react';
import type { 
  User, 
  DailyLog, 
  Workout, 
  WeightLog, 
  MissedReason, 
  Supplement, 
  SupplementLog, 
  CustomHabit, 
  CustomHabitLog 
} from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  Star, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  Dumbbell, 
  Footprints, 
  Droplets, 
  Moon, 
  Apple, 
  Pill, 
  Sparkles, 
  ExternalLink, 
  Leaf, 
  Lock, 
  Users, 
  Activity,
  Plus,
  Trash2
} from 'lucide-react';

interface CalendarViewProps {
  currentUser: User;
  allUsers: User[];
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs: WeightLog[];
  missedReasons: MissedReason[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  customHabits: CustomHabit[];
  customHabitLogs: CustomHabitLog[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNavigateToChecklist: (date: string) => void;
  onOpenWorkoutModal?: () => void;
  onDeleteWorkout?: (id: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentUser,
  allUsers,
  dailyLogs,
  workouts,
  weightLogs,
  missedReasons,
  supplements,
  supplementLogs,
  customHabits,
  customHabitLogs,
  selectedDate,
  onSelectDate,
  onNavigateToChecklist,
  onOpenWorkoutModal,
  onDeleteWorkout,
}) => {
  // Member selection (defaults to current user)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser.id);
  
  // Current calendar viewing month & year
  const initialDate = useMemo(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    return new Date();
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Today string
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Currently viewed user
  const targetUser = allUsers.find(u => u.id === selectedMemberId) || currentUser;
  const isViewingSelf = targetUser.id === currentUser.id;

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
    
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isToday: boolean;
      isFuture: boolean;
    }> = [];

    // Previous month padding
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isSunday: new Date(prevY, prevM - 1, d).getDay() === 0,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isSunday: new Date(viewYear, viewMonth, d).getDay() === 0,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    // Next month padding to complete 35 or 42 grid slots
    const totalCells = days.length <= 35 ? 35 : 42;
    const remainingSlots = totalCells - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isSunday: new Date(nextY, nextM - 1, d).getDay() === 0,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr]);

  // Daily statistics lookup helper
  const getDayStats = (dateStr: string, isSunday: boolean) => {
    const log = dailyLogs.find(l => l.user_id === targetUser.id && l.date === dateStr);
    const dayWorkouts = workouts.filter(w => w.user_id === targetUser.id && w.date === dateStr);

    let coreTasksDone = 0;
    if (log?.gym_done || (isSunday && log?.gym_done !== false)) coreTasksDone += 1;
    if (log?.steps_done) coreTasksDone += 1;
    if (log?.sleep_done) coreTasksDone += 1;
    if (log?.junk_food_avoided) coreTasksDone += 1;
    if (log?.water_done) coreTasksDone += 1;

    // Daily points: 10 pts per core goal (Max 50 pts/day)
    const calculatedPoints = coreTasksDone * 10;
    const points = (log?.points_earned !== undefined && log.points_earned !== null && log.points_earned > 0)
      ? Math.max(log.points_earned, calculatedPoints)
      : calculatedPoints;

    // Supplements stats
    const userSupps = supplements.filter(s => s.user_id === targetUser.id);
    const suppsTaken = userSupps.filter(s => {
      const sl = supplementLogs.find(l => l.supplement_id === s.id && l.date === dateStr);
      return !!sl?.taken;
    }).length;

    // Custom habits stats
    const userHabits = customHabits.filter(h => h.user_id === targetUser.id);
    const habitsDone = userHabits.filter(h => {
      const hl = customHabitLogs.find(l => l.habit_id === h.id && l.date === dateStr);
      return !!hl?.completed;
    }).length;

    const totalTasksDone = coreTasksDone + suppsTaken + habitsDone;
    const totalTasksPossible = 5 + userSupps.length + userHabits.length;

    const isPerfect = coreTasksDone === 5 || (isSunday && coreTasksDone >= 4);

    return {
      log,
      workouts: dayWorkouts,
      coreTasksDone,
      totalTasksDone,
      totalTasksPossible,
      points,
      isPerfect,
      hasActivity: coreTasksDone > 0 || dayWorkouts.length > 0 || suppsTaken > 0 || habitsDone > 0,
      suppsTaken,
      userSuppsCount: userSupps.length,
      habitsDone,
      userHabitsCount: userHabits.length,
    };
  };

  // Monthly aggregated metrics
  const monthlyMetrics = useMemo(() => {
    let totalPoints = 0;
    let perfectDays = 0;
    let activeDays = 0;
    let totalCoreTasks = 0;
    let totalWorkouts = 0;

    const daysInThisMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInThisMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSunday = new Date(viewYear, viewMonth, d).getDay() === 0;
      const stats = getDayStats(dateStr, isSunday);

      if (dateStr <= todayStr) {
        totalPoints += stats.points;
        if (stats.isPerfect) perfectDays++;
        if (stats.hasActivity) {
          activeDays++;
          totalCoreTasks += stats.coreTasksDone;
        }
        totalWorkouts += stats.workouts.length;
      }
    }

    const avgTasks = activeDays > 0 ? (totalCoreTasks / activeDays).toFixed(1) : '0';

    return {
      totalPoints,
      perfectDays,
      activeDays,
      avgTasks,
      totalWorkouts,
    };
  }, [viewYear, viewMonth, targetUser.id, dailyLogs, workouts, supplements, supplementLogs, customHabits, customHabitLogs, todayStr]);

  // Selected date statistics & breakdown
  const [selectedY, selectedM, selectedD] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(selectedY, selectedM - 1, selectedD);
  const isSelectedDateSunday = selectedDateObj.getDay() === 0;
  const selectedStats = getDayStats(selectedDate, isSelectedDateSunday);

  // Formatted date string for header
  const formattedSelectedDate = useMemo(() => {
    try {
      return selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDateObj, selectedDate]);

  // Relative badge for selected date
  const relativeDateLabel = useMemo(() => {
    if (selectedDate === todayStr) return 'Today';
    const selTime = new Date(selectedY, selectedM - 1, selectedD).getTime();
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const diffDays = Math.round((todayTime - selTime) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === -1) return 'Tomorrow';
    if (diffDays > 1) return `${diffDays} days ago`;
    if (diffDays < -1) return `In ${Math.abs(diffDays)} days`;
    return '';
  }, [selectedDate, todayStr, selectedY, selectedM, selectedD, today]);

  // Missed reasons for selected date
  const dayMissedReasons = missedReasons.filter(
    r => r.user_id === targetUser.id && r.date === selectedDate
  );

  // Weight log for selected date
  const dayWeightLog = weightLogs.find(
    w => w.user_id === targetUser.id && w.date === selectedDate
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 font-sans">
      
      {/* Header & Controls Bar */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#c68b59] to-[#d4a373] text-[#1c1815] shadow-lg shadow-[#c68b59]/20">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-[#f5efe6] tracking-tight">
                  Activity & Progress Calendar
                </h2>
                <p className="text-xs text-[#c5b4a5]">
                  Track daily completed tasks, earned points, and overall consistency.
                </p>
              </div>
            </div>
          </div>

          {/* Member Switcher (if multiple users) & Quick Jump */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {allUsers.length > 1 && (
              <div className="flex items-center gap-1.5 bg-[#1c1815] border border-[#3d322a] rounded-xl px-2.5 py-1.5">
                <Users className="w-4 h-4 text-[#c68b59]" />
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#f5efe6] focus:outline-none cursor-pointer pr-1"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#26201b] text-[#f5efe6]">
                      {u.name} {u.id === currentUser.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleJumpToToday}
              className="px-3 py-1.5 bg-[#1c1815] hover:bg-[#322a24] text-[#d4a373] hover:text-[#f5efe6] border border-[#3d322a] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Jump to Today"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c68b59]" />
              <span>Today</span>
            </button>
          </div>
        </div>

        {/* Monthly Summary Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-5 pt-5 border-t border-[#3d322a]/80">
          
          <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 sm:p-4 transition hover:border-[#c68b59]/40">
            <div className="flex items-center justify-between text-xs text-[#c5b4a5] mb-1">
              <span>Points ({MONTH_NAMES[viewMonth].substring(0, 3)})</span>
              <Trophy className="w-4 h-4 text-[#c68b59]" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-[#d4a373] tracking-tight">
              {monthlyMetrics.totalPoints} <span className="text-xs text-[#c5b4a5] font-normal">pts</span>
            </div>
            <p className="text-[10px] text-[#c5b4a5] mt-0.5">Earned this month</p>
          </div>

          <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 sm:p-4 transition hover:border-emerald-500/40">
            <div className="flex items-center justify-between text-xs text-[#c5b4a5] mb-1">
              <span>Perfect Days</span>
              <Star className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
              {monthlyMetrics.perfectDays} <span className="text-xs text-[#c5b4a5] font-normal">days</span>
            </div>
            <p className="text-[10px] text-[#c5b4a5] mt-0.5">All 5 goals done</p>
          </div>

          <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 sm:p-4 transition hover:border-[#c68b59]/40">
            <div className="flex items-center justify-between text-xs text-[#c5b4a5] mb-1">
              <span>Avg Goals / Day</span>
              <Activity className="w-4 h-4 text-[#c68b59]" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-[#f5efe6] tracking-tight">
              {monthlyMetrics.avgTasks} <span className="text-xs text-[#c5b4a5] font-normal">/ 5</span>
            </div>
            <p className="text-[10px] text-[#c5b4a5] mt-0.5">On active days</p>
          </div>

          <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 sm:p-4 transition hover:border-[#c68b59]/40">
            <div className="flex items-center justify-between text-xs text-[#c5b4a5] mb-1">
              <span>Workouts</span>
              <Dumbbell className="w-4 h-4 text-[#c68b59]" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-[#f5efe6] tracking-tight">
              {monthlyMetrics.totalWorkouts} <span className="text-xs text-[#c5b4a5] font-normal">sessions</span>
            </div>
            <p className="text-[10px] text-[#c5b4a5] mt-0.5">Logged this month</p>
          </div>

        </div>
      </div>

      {/* Main Calendar Month View Container */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-3 sm:p-6 shadow-xl">
        
        {/* Month Navigation Bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
          <button
            onClick={handlePrevMonth}
            className="p-2 sm:px-3 sm:py-2 bg-[#1c1815] hover:bg-[#322a24] text-[#c5b4a5] hover:text-[#f5efe6] border border-[#3d322a] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#c68b59]" />
            <span className="hidden sm:inline">Prev Month</span>
          </button>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#c68b59]" />
            <h3 className="text-base sm:text-xl font-black text-[#f5efe6] tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 sm:px-3 sm:py-2 bg-[#1c1815] hover:bg-[#322a24] text-[#c5b4a5] hover:text-[#f5efe6] border border-[#3d322a] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
            title="Next Month"
          >
            <span className="hidden sm:inline">Next Month</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#c68b59]" />
          </button>
        </div>

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div
              key={w}
              className={`text-center py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold tracking-wider uppercase ${
                idx === 0 ? 'text-emerald-400' : 'text-[#c5b4a5]'
              }`}
            >
              <span>{w}</span>
              {idx === 0 && <span className="hidden sm:inline text-[9px] ml-1 font-normal opacity-75">🌿</span>}
            </div>
          ))}
        </div>

        {/* 7-Column Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            const stats = getDayStats(day.dateStr, day.isSunday);

            return (
              <div
                key={day.dateStr}
                onClick={() => {
                  onSelectDate(day.dateStr);
                }}
                className={`min-h-[72px] sm:min-h-[96px] p-1.5 sm:p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none active:scale-[0.98] relative overflow-hidden ${
                  isSelected
                    ? 'border-[#c68b59] ring-2 ring-[#c68b59]/60 bg-gradient-to-b from-[#322a24] to-[#26201b] shadow-lg shadow-[#c68b59]/15 z-10'
                    : stats.isPerfect && day.isCurrentMonth
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-[#1c1815] hover:border-amber-400/60'
                    : stats.coreTasksDone >= 3 && day.isCurrentMonth
                    ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-[#1c1815] hover:border-emerald-400/50'
                    : day.isSunday && day.isCurrentMonth
                    ? 'border-teal-800/40 bg-[#1c1815] hover:border-teal-700/60'
                    : day.isCurrentMonth
                    ? 'border-[#3d322a] bg-[#1c1815] hover:border-[#c68b59]/50 hover:bg-[#2b241e]'
                    : 'border-[#3d322a]/40 bg-[#171412]/50 opacity-40 hover:opacity-70'
                }`}
              >
                {/* Top Row: Day Number & Today/Healing Badges */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs sm:text-sm font-black leading-none ${
                      day.isToday
                        ? 'text-[#d4a373] bg-[#c68b59]/20 px-1.5 py-0.5 rounded-md border border-[#c68b59]/40'
                        : day.isSunday && day.isCurrentMonth
                        ? 'text-emerald-400'
                        : day.isCurrentMonth
                        ? 'text-[#f5efe6]'
                        : 'text-[#c5b4a5]/60'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Badges: Today dot, Sunday Healing Icon, or Perfect Star */}
                  <div className="flex items-center gap-0.5">
                    {day.isSunday && day.isCurrentMonth && (
                      <span className="text-[9px] text-emerald-400" title="Sunday Healing Day">
                        🌿
                      </span>
                    )}
                    {stats.isPerfect && day.isCurrentMonth && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                    {day.isToday && !stats.isPerfect && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c68b59] animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Middle: Tasks Completed Pill & Points Earned */}
                <div className="my-1 space-y-0.5 sm:space-y-1">
                  
                  {/* Tasks count indicator */}
                  {day.isFuture ? (
                    <span className="text-[9px] text-[#c5b4a5]/40 italic block leading-none truncate">
                      Upcoming
                    </span>
                  ) : day.isSunday && stats.coreTasksDone === 0 ? (
                    <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-1 py-0.2 rounded block text-center truncate">
                      Heal
                    </span>
                  ) : stats.coreTasksDone > 0 ? (
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded border truncate ${
                          stats.isPerfect
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            : stats.coreTasksDone >= 3
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                            : 'bg-[#26201b] text-[#c5b4a5] border-[#3d322a]'
                        }`}
                        title={`${stats.coreTasksDone} of 5 core goals completed`}
                      >
                        ✓ {stats.coreTasksDone}/5
                      </span>

                      {/* Workouts indicator icon if any */}
                      {stats.workouts.length > 0 && (
                        <span className="hidden sm:inline-flex items-center text-[9px] text-[#c68b59]" title={`${stats.workouts.length} workout(s) logged`}>
                          <Dumbbell className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-[#c5b4a5]/40 block leading-none truncate">
                      - / 5
                    </span>
                  )}

                  {/* Points Earned Pill */}
                  {!day.isFuture && stats.points > 0 && (
                    <div className="flex items-center justify-start">
                      <span
                        className={`text-[9px] sm:text-[10px] font-mono font-bold leading-none ${
                          stats.points >= 50
                            ? 'text-[#d4a373]'
                            : stats.points >= 30
                            ? 'text-emerald-400'
                            : 'text-[#c5b4a5]'
                        }`}
                      >
                        +{stats.points} pts
                      </span>
                    </div>
                  )}

                </div>

                {/* Bottom: Mini completion progress bar */}
                <div className="w-full bg-[#26201b] h-1 rounded-full overflow-hidden border border-[#3d322a]/40">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      stats.isPerfect
                        ? 'bg-gradient-to-r from-[#c68b59] to-amber-400'
                        : stats.coreTasksDone >= 3
                        ? 'bg-emerald-500'
                        : stats.coreTasksDone > 0
                        ? 'bg-[#c68b59]'
                        : 'bg-transparent'
                    }`}
                    style={{ width: `${(stats.coreTasksDone / 5) * 100}%` }}
                  />
                </div>

              </div>
            );
          })}
        </div>

        {/* Legend / Key Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#3d322a]/60 text-[10px] sm:text-xs text-[#c5b4a5]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/40" />
              <span>Perfect Day (50 pts)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Strong (30–40 pts)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 text-xs leading-none">🌿</span>
              <span>Sunday Healing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-[#c68b59] bg-[#c68b59]/20" />
              <span>Selected Date</span>
            </div>
          </div>

          <div className="text-[11px] text-[#d4a373] font-semibold">
            Click any date below for full details
          </div>
        </div>

      </div>

      {/* Selected Date Information Breakdown Panel */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#3d322a]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#f5efe6] flex items-center gap-2">
                {formattedSelectedDate}
              </h3>
              {relativeDateLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c68b59]/20 text-[#d4a373] border border-[#c68b59]/30 font-bold">
                  {relativeDateLabel}
                </span>
              )}
              {isSelectedDateSunday && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <Leaf className="w-2.5 h-2.5" /> Healing Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[#c5b4a5] mt-0.5">
              {isViewingSelf
                ? `Your logged activity and completion report for this date.`
                : `Viewing ${targetUser.name}'s activity and goal breakdown.`}
            </p>
          </div>

          {/* Quick Action: Open in Daily Checklist */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToChecklist(selectedDate)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#c68b59]/20 cursor-pointer active:scale-95"
            >
              <span>Open in Checklist</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {onOpenWorkoutModal && isViewingSelf && (
              <button
                onClick={onOpenWorkoutModal}
                className="px-3 py-2 bg-[#1c1815] hover:bg-[#322a24] text-[#d4a373] border border-[#3d322a] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Workout</span>
              </button>
            )}
          </div>
        </div>

        {/* Day Score Overview Banner */}
        <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className={`p-3 rounded-xl border shrink-0 ${
              selectedStats.isPerfect
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                : selectedStats.coreTasksDone >= 3
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : 'bg-[#26201b] border-[#3d322a] text-[#c5b4a5]'
            }`}>
              {selectedStats.isPerfect ? (
                <Trophy className="w-6 h-6 text-amber-400" />
              ) : selectedStats.coreTasksDone >= 3 ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <Activity className="w-6 h-6 text-[#c68b59]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#f5efe6] font-mono">
                  {selectedStats.points} <span className="text-xs text-[#c5b4a5] font-sans font-normal">/ 50 pts</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    selectedStats.isPerfect
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : selectedStats.coreTasksDone >= 3
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                      : 'bg-[#26201b] text-[#c5b4a5] border-[#3d322a]'
                  }`}
                >
                  {selectedStats.isPerfect
                    ? '🌟 Perfect Day!'
                    : selectedStats.coreTasksDone >= 3
                    ? '💪 Strong Effort'
                    : '🌱 Active Day'}
                </span>
              </div>
              <p className="text-xs text-[#c5b4a5]">
                {selectedStats.coreTasksDone} of 5 core goals accomplished
                {selectedStats.suppsTaken > 0 ? ` • ${selectedStats.suppsTaken} supplement(s)` : ''}
                {selectedStats.habitsDone > 0 ? ` • ${selectedStats.habitsDone} habit(s)` : ''}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#c5b4a5]">Completion:</span>
              <span className="font-bold text-[#d4a373]">{Math.round((selectedStats.coreTasksDone / 5) * 100)}%</span>
            </div>
            <div className="w-full bg-[#26201b] h-2 rounded-full overflow-hidden border border-[#3d322a]">
              <div
                className="h-full bg-gradient-to-r from-[#c68b59] to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${(selectedStats.coreTasksDone / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Core Daily Goals Breakdown Grid */}
        <div>
          <h4 className="text-xs font-bold text-[#c5b4a5] uppercase tracking-wider mb-2.5">
            Core Daily Goals Status
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            
            {/* Gym / Workout */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 transition ${
              isSelectedDateSunday
                ? 'bg-emerald-950/15 border-emerald-500/30'
                : selectedStats.log?.gym_done
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-[#1c1815] border-[#3d322a]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                isSelectedDateSunday
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : selectedStats.log?.gym_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#26201b] text-[#c5b4a5]'
              }`}>
                {isSelectedDateSunday ? <Leaf className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#f5efe6] truncate">Gym & Workouts</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    isSelectedDateSunday
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : selectedStats.log?.gym_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {isSelectedDateSunday ? 'Healing Mode' : selectedStats.log?.gym_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                  {isSelectedDateSunday
                    ? 'Sunday rest & recovery day'
                    : selectedStats.workouts.length > 0
                    ? `${selectedStats.workouts.length} workout(s) recorded`
                    : selectedStats.log?.gym_done
                    ? 'Marked as completed'
                    : 'No workout logged'}
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 transition ${
              selectedStats.log?.steps_done
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-[#1c1815] border-[#3d322a]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.steps_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#26201b] text-[#c5b4a5]'
              }`}>
                <Footprints className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#f5efe6] truncate">Daily Steps</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.steps_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.steps_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                  {selectedStats.log?.steps_value
                    ? `${selectedStats.log.steps_value.toLocaleString()} / ${selectedStats.log.steps_target?.toLocaleString() || '10,000'} steps`
                    : selectedStats.log?.steps_done
                    ? 'Target met'
                    : 'Target not reached'}
                </p>
              </div>
            </div>

            {/* Water */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 transition ${
              selectedStats.log?.water_done
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-[#1c1815] border-[#3d322a]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.water_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#26201b] text-[#c5b4a5]'
              }`}>
                <Droplets className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#f5efe6] truncate">Water Hydration</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.water_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.water_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                  {selectedStats.log?.water_intake_ml
                    ? `${selectedStats.log.water_intake_ml.toLocaleString()} / ${selectedStats.log.water_target_ml || 2500} ml`
                    : selectedStats.log?.water_done
                    ? 'Hydration goal met'
                    : 'Goal not reached'}
                </p>
              </div>
            </div>

            {/* Sleep */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 transition ${
              selectedStats.log?.sleep_done
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-[#1c1815] border-[#3d322a]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.sleep_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#26201b] text-[#c5b4a5]'
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#f5efe6] truncate">Sleep Schedule</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.sleep_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.sleep_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                  {selectedStats.log?.sleep_duration
                    ? `${selectedStats.log.sleep_duration} hrs (${selectedStats.log.sleep_start || '23:00'} - ${selectedStats.log.sleep_end || '07:00'})`
                    : selectedStats.log?.sleep_done
                    ? 'Target met'
                    : 'Target missed'}
                </p>
              </div>
            </div>

            {/* Junk Food Avoided */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 transition ${
              selectedStats.log?.junk_food_avoided
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-[#1c1815] border-[#3d322a]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.junk_food_avoided
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#26201b] text-[#c5b4a5]'
              }`}>
                <Apple className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#f5efe6] truncate">Clean Nutrition</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.junk_food_avoided
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.junk_food_avoided ? '+10 pts Done' : 'Cheat / Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                  {selectedStats.log?.junk_food_avoided ? 'Avoided junk food successfully' : 'Had cheat snack or cravings'}
                </p>
              </div>
            </div>

            {/* Body Weight Log (if logged on this day) */}
            <div className="p-3 rounded-xl border border-[#3d322a] bg-[#1c1815] flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0 bg-[#26201b] text-[#d4a373]">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#f5efe6] truncate">Body Weight</h5>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-[#26201b] text-[#c5b4a5] border-[#3d322a]">
                    {dayWeightLog ? 'Logged' : 'No Entry'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                  {dayWeightLog ? `${dayWeightLog.weight} kg recorded` : 'Weigh-in not recorded'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Workouts Logged for this Date */}
        {selectedStats.workouts.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-[#c5b4a5] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#c68b59]" />
              Workouts Logged on this Date ({selectedStats.workouts.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedStats.workouts.map((w) => (
                <div key={w.id} className="p-3 rounded-xl bg-[#1c1815] border border-[#3d322a] flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-[#f5efe6] truncate">{w.exercise_name}</h5>
                    <p className="text-[11px] text-[#c5b4a5] mt-0.5">
                      {w.sets} sets × {w.reps} reps
                      {w.weight ? ` • ${w.weight} ${w.weight_unit || 'kg'}` : ''}
                      {w.duration ? ` • ${w.duration} mins` : ''}
                    </p>
                    {w.notes && (
                      <p className="text-[10px] text-[#d4a373] italic truncate mt-0.5">{w.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#26201b] text-[#c68b59] font-bold border border-[#3d322a]">
                      {w.exercise_type || 'Strength'}
                    </span>
                    {w.user_id === currentUser.id && onDeleteWorkout && (
                      <button
                        type="button"
                        onClick={() => onDeleteWorkout(w.id)}
                        className="p-1.5 text-[#c5b4a5] hover:text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-900/50 transition cursor-pointer"
                        title="Delete workout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missed Reasons / Excuse Tags (if any recorded) */}
        {dayMissedReasons.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-[#c5b4a5] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              Recorded Missed Reasons ({dayMissedReasons.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {dayMissedReasons.map((r) => (
                <div key={r.id} className="px-3 py-1.5 bg-rose-950/30 border border-rose-900/50 rounded-xl flex items-center gap-2 text-xs">
                  <span className="font-bold text-rose-300 capitalize">{r.goal_type}:</span>
                  <span className="text-rose-200">{r.reason_tag}</span>
                  {r.reason_text && (
                    <span className="text-[11px] text-rose-300/70 italic">"{r.reason_text}"</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supplements & Custom Habits Status for this Date */}
        {(selectedStats.userSuppsCount > 0 || selectedStats.userHabitsCount > 0) && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Supplements Checklist */}
            {selectedStats.userSuppsCount > 0 && (
              <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#f5efe6] flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-[#c68b59]" />
                    Supplements
                  </span>
                  <span className="text-[10px] font-mono text-[#d4a373]">
                    {selectedStats.suppsTaken} / {selectedStats.userSuppsCount} Taken
                  </span>
                </div>
                <div className="space-y-1">
                  {supplements.filter(s => s.user_id === targetUser.id).map(s => {
                    const isTaken = !!supplementLogs.find(l => l.supplement_id === s.id && l.date === selectedDate)?.taken;
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#26201b]">
                        <span className={`truncate text-xs ${isTaken ? 'text-emerald-300 line-through' : 'text-[#f5efe6]'}`}>
                          {s.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isTaken ? 'bg-emerald-950/60 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'
                        }`}>
                          {isTaken ? 'Taken' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Habits Checklist */}
            {selectedStats.userHabitsCount > 0 && (
              <div className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#f5efe6] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c68b59]" />
                    Custom Habits
                  </span>
                  {isViewingSelf ? (
                    <span className="text-[10px] font-mono text-[#d4a373]">
                      {selectedStats.habitsDone} / {selectedStats.userHabitsCount} Done
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#c5b4a5] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                </div>
                {isViewingSelf ? (
                  <div className="space-y-1">
                    {customHabits.filter(h => h.user_id === targetUser.id).map(h => {
                      const isDone = !!customHabitLogs.find(l => l.habit_id === h.id && l.date === selectedDate)?.completed;
                      return (
                        <div key={h.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#26201b]">
                          <span className={`truncate text-xs ${isDone ? 'text-emerald-300 line-through' : 'text-[#f5efe6]'}`}>
                            {h.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            isDone ? 'bg-emerald-950/60 text-emerald-400' : 'bg-[#1c1815] text-[#c5b4a5]'
                          }`}>
                            {isDone ? 'Done' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#c5b4a5] italic">
                    Personal habits are private to {targetUser.name}.
                  </p>
                )}
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};
