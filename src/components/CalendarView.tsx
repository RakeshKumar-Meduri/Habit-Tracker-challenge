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
  Trash2,
  RefreshCw
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
  onRefreshMembers?: () => void;
  isRefreshingMembers?: boolean;
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
  onRefreshMembers,
  isRefreshingMembers = false,
}) => {
  // Member selection (defaults to current user)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser.id);
  const [deletedWorkoutIds, setDeletedWorkoutIds] = useState<Set<string>>(new Set());
  
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
    const dayWorkouts = workouts.filter(w => {
      if (!w) return false;
      const wid = String(w.id || (w as any)._id || '').trim();
      if (deletedWorkoutIds.has(wid)) return false;
      return w.user_id === targetUser.id && w.date === dateStr;
    });

    let coreTasksDone = 0;
    if (log?.gym_done || (isSunday && log?.gym_done !== false)) coreTasksDone += 1;
    if (log?.steps_done || (log?.steps_value || 0) >= (log?.steps_target || 10000)) coreTasksDone += 1;
    if (log?.sleep_done) coreTasksDone += 1;
    if (log?.junk_food_avoided) coreTasksDone += 1;
    if (log?.water_done) coreTasksDone += 1;

    let otherTasksDone = 0;
    if (log?.gym_done || (isSunday && log?.gym_done !== false)) otherTasksDone += 10;
    if (log?.sleep_done) otherTasksDone += 10;
    if (log?.junk_food_avoided) otherTasksDone += 10;
    if (log?.water_done) otherTasksDone += 10;

    const targetSteps = log?.steps_target || 10000;
    const currentSteps = log?.steps_value || 0;
    const stepPts = (log?.steps_done || currentSteps >= targetSteps)
      ? 10
      : Math.min(10, Math.round((currentSteps / targetSteps) * 100) / 10);

    // Daily points: 10 pts per core goal + partial step points (Max 50 pts/day)
    const calculatedPoints = Math.round((otherTasksDone + stepPts) * 10) / 10;
    const points = (log?.points_earned !== undefined && log.points_earned !== null)
      ? Math.max(log.points_earned, calculatedPoints)
      : calculatedPoints;

    // Supplements stats
    const userSuppsMap = new Map<string, Supplement>();
    supplements.filter(s => s && s.user_id === targetUser.id).forEach(s => {
      const k = (s.name || '').trim().toLowerCase();
      if (!userSuppsMap.has(k)) userSuppsMap.set(k, s);
    });
    const userSupps = Array.from(userSuppsMap.values());
    const suppsTaken = userSupps.filter(s => {
      const sl = supplementLogs.find(l => l.supplement_id === s.id && l.date === dateStr);
      return !!sl?.taken;
    }).length;

    // Custom habits stats
    const userHabitsMap = new Map<string, CustomHabit>();
    customHabits.filter(h => h && h.user_id === targetUser.id).forEach(h => {
      const k = (h.title || '').trim().toLowerCase();
      if (!userHabitsMap.has(k)) userHabitsMap.set(k, h);
    });
    const userHabits = Array.from(userHabitsMap.values());
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

  const userDeduplicatedSupps = useMemo(() => {
    const map = new Map<string, Supplement>();
    supplements.filter(s => s && s.user_id === targetUser.id).forEach(s => {
      const k = (s.name || '').trim().toLowerCase();
      if (!map.has(k)) map.set(k, s);
    });
    return Array.from(map.values());
  }, [supplements, targetUser.id]);

  const userDeduplicatedHabits = useMemo(() => {
    const map = new Map<string, CustomHabit>();
    customHabits.filter(h => h && h.user_id === targetUser.id).forEach(h => {
      const k = (h.title || '').trim().toLowerCase();
      if (!map.has(k)) map.set(k, h);
    });
    return Array.from(map.values());
  }, [customHabits, targetUser.id]);

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
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#D98B4A] to-[#E69A5C] text-[#1B1B20] shadow-lg shadow-[#D98B4A]/20">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-[#F4F4F5] tracking-tight">
                  Activity & Progress Calendar
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  Track daily completed tasks, earned points, and overall consistency.
                </p>
              </div>
            </div>
          </div>

          {/* Member Switcher & Quick Jump */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-[#1B1B20] border border-[#26262C] rounded-xl px-2.5 py-1.5">
              <Users className="w-4 h-4 text-[#D98B4A]" />
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#F4F4F5] focus:outline-none cursor-pointer pr-1"
              >
                {allUsers && allUsers.length > 0 ? (
                  allUsers.map((u) => (
                    <option key={u.id} value={u.id} className="bg-[#131316] text-[#F4F4F5]">
                      {u.name} {u.id === currentUser.id ? '(You)' : ''}
                    </option>
                  ))
                ) : (
                  <option value={currentUser.id} className="bg-[#131316] text-[#F4F4F5]">
                    {currentUser.name} (You)
                  </option>
                )}
              </select>
              {onRefreshMembers && (
                <button
                  type="button"
                  onClick={onRefreshMembers}
                  disabled={isRefreshingMembers}
                  title="Sync members from server"
                  className="p-0.5 hover:bg-[#26262C] text-[#D98B4A] rounded transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            <button
              onClick={handleJumpToToday}
              className="px-3 py-1.5 bg-[#1B1B20] hover:bg-[#1B1B20] text-[#E69A5C] hover:text-[#F4F4F5] border border-[#26262C] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Jump to Today"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D98B4A]" />
              <span>Today</span>
            </button>
          </div>
        </div>

        {/* Monthly Summary Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-5 pt-5 border-t border-[#26262C]/80">
          
          <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 sm:p-4 transition hover:border-[#D98B4A]/40">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
              <span>Points ({MONTH_NAMES[viewMonth].substring(0, 3)})</span>
              <Trophy className="w-4 h-4 text-[#D98B4A]" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-[#E69A5C] tracking-tight">
              {monthlyMetrics.totalPoints} <span className="text-xs text-[#A1A1AA] font-normal">pts</span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] mt-0.5">Earned this month</p>
          </div>

          <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 sm:p-4 transition hover:border-emerald-500/40">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
              <span>Perfect Days</span>
              <Star className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
              {monthlyMetrics.perfectDays} <span className="text-xs text-[#A1A1AA] font-normal">days</span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] mt-0.5">All 5 goals done</p>
          </div>

          <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 sm:p-4 transition hover:border-[#D98B4A]/40">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
              <span>Avg Goals / Day</span>
              <Activity className="w-4 h-4 text-[#D98B4A]" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-[#F4F4F5] tracking-tight">
              {monthlyMetrics.avgTasks} <span className="text-xs text-[#A1A1AA] font-normal">/ 5</span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] mt-0.5">On active days</p>
          </div>

          <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 sm:p-4 transition hover:border-[#D98B4A]/40">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-1">
              <span>Workouts</span>
              <Dumbbell className="w-4 h-4 text-[#D98B4A]" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-[#F4F4F5] tracking-tight">
              {monthlyMetrics.totalWorkouts} <span className="text-xs text-[#A1A1AA] font-normal">sessions</span>
            </div>
            <p className="text-[10px] text-[#A1A1AA] mt-0.5">Logged this month</p>
          </div>

        </div>
      </div>

      {/* Main Calendar Month View Container */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-6 shadow-xl">
        
        {/* Month Navigation Bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
          <button
            onClick={handlePrevMonth}
            className="p-2 sm:px-3 sm:py-2 bg-[#1B1B20] hover:bg-[#1B1B20] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#26262C] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A]" />
            <span className="hidden sm:inline">Prev Month</span>
          </button>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A]" />
            <h3 className="text-base sm:text-xl font-black text-[#F4F4F5] tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 sm:px-3 sm:py-2 bg-[#1B1B20] hover:bg-[#1B1B20] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#26262C] rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
            title="Next Month"
          >
            <span className="hidden sm:inline">Next Month</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A]" />
          </button>
        </div>

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div
              key={w}
              className={`text-center py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold tracking-wider uppercase ${
                idx === 0 ? 'text-emerald-400' : 'text-[#A1A1AA]'
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
                    ? 'border-[#D98B4A] ring-2 ring-[#D98B4A]/60 bg-gradient-to-b from-[#1B1B20] to-[#131316] shadow-lg shadow-[#D98B4A]/15 z-10'
                    : stats.isPerfect && day.isCurrentMonth
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-[#1B1B20] hover:border-amber-400/60'
                    : stats.coreTasksDone >= 3 && day.isCurrentMonth
                    ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-[#1B1B20] hover:border-emerald-400/50'
                    : day.isSunday && day.isCurrentMonth
                    ? 'border-teal-800/40 bg-[#1B1B20] hover:border-teal-700/60'
                    : day.isCurrentMonth
                    ? 'border-[#26262C] bg-[#1B1B20] hover:border-[#D98B4A]/50 hover:bg-[#1B1B20]'
                    : 'border-[#26262C]/40 bg-[#0B0B0D]/50 opacity-40 hover:opacity-70'
                }`}
              >
                {/* Top Row: Day Number & Today/Healing Badges */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs sm:text-sm font-black leading-none ${
                      day.isToday
                        ? 'text-[#E69A5C] bg-[#D98B4A]/20 px-1.5 py-0.5 rounded-md border border-[#D98B4A]/40'
                        : day.isSunday && day.isCurrentMonth
                        ? 'text-emerald-400'
                        : day.isCurrentMonth
                        ? 'text-[#F4F4F5]'
                        : 'text-[#A1A1AA]/60'
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
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D98B4A] animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Middle: Tasks Completed Pill & Points Earned */}
                <div className="my-1 space-y-0.5 sm:space-y-1">
                  
                  {/* Tasks count indicator */}
                  {day.isFuture ? (
                    <span className="text-[9px] text-[#A1A1AA]/40 italic block leading-none truncate">
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
                            : 'bg-[#131316] text-[#A1A1AA] border-[#26262C]'
                        }`}
                        title={`${stats.coreTasksDone} of 5 core goals completed`}
                      >
                        ✓ {stats.coreTasksDone}/5
                      </span>

                      {/* Workouts indicator icon if any */}
                      {stats.workouts.length > 0 && (
                        <span className="hidden sm:inline-flex items-center text-[9px] text-[#D98B4A]" title={`${stats.workouts.length} workout(s) logged`}>
                          <Dumbbell className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-[#A1A1AA]/40 block leading-none truncate">
                      - / 5
                    </span>
                  )}

                  {/* Points Earned Pill */}
                  {!day.isFuture && stats.points > 0 && (
                    <div className="flex items-center justify-start">
                      <span
                        className={`text-[9px] sm:text-[10px] font-mono font-bold leading-none ${
                          stats.points >= 50
                            ? 'text-[#E69A5C]'
                            : stats.points >= 30
                            ? 'text-emerald-400'
                            : 'text-[#A1A1AA]'
                        }`}
                      >
                        +{stats.points} pts
                      </span>
                    </div>
                  )}

                </div>

                {/* Bottom: Mini completion progress bar */}
                <div className="w-full bg-[#131316] h-1 rounded-full overflow-hidden border border-[#26262C]/40">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      stats.isPerfect
                        ? 'bg-gradient-to-r from-[#D98B4A] to-amber-400'
                        : stats.coreTasksDone >= 3
                        ? 'bg-emerald-500'
                        : stats.coreTasksDone > 0
                        ? 'bg-[#D98B4A]'
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
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#26262C]/60 text-[10px] sm:text-xs text-[#A1A1AA]">
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
              <span className="w-2.5 h-2.5 rounded-full border border-[#D98B4A] bg-[#D98B4A]/20" />
              <span>Selected Date</span>
            </div>
          </div>

          <div className="text-[11px] text-[#E69A5C] font-semibold">
            Click any date below for full details
          </div>
        </div>

      </div>

      {/* Selected Date Information Breakdown Panel */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26262C]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#F4F4F5] flex items-center gap-2">
                {formattedSelectedDate}
              </h3>
              {relativeDateLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D98B4A]/20 text-[#E69A5C] border border-[#D98B4A]/30 font-bold">
                  {relativeDateLabel}
                </span>
              )}
              {isSelectedDateSunday && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <Leaf className="w-2.5 h-2.5" /> Healing Mode
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isViewingSelf
                ? `Your logged activity and completion report for this date.`
                : `Viewing ${targetUser.name}'s activity and goal breakdown.`}
            </p>
          </div>

          {/* Quick Action: Open in Daily Checklist */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToChecklist(selectedDate)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#D98B4A] to-[#D98B4A] hover:from-[#D98B4A] hover:to-[#B45F1E] text-[#1B1B20] text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#D98B4A]/20 cursor-pointer active:scale-95"
            >
              <span>Open in Checklist</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {onOpenWorkoutModal && isViewingSelf && (
              <button
                onClick={onOpenWorkoutModal}
                className="px-3 py-2 bg-[#1B1B20] hover:bg-[#1B1B20] text-[#E69A5C] border border-[#26262C] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Workout</span>
              </button>
            )}
          </div>
        </div>

        {/* Day Score Overview Banner */}
        <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className={`p-3 rounded-xl border shrink-0 ${
              selectedStats.isPerfect
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                : selectedStats.coreTasksDone >= 3
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                : 'bg-[#131316] border-[#26262C] text-[#A1A1AA]'
            }`}>
              {selectedStats.isPerfect ? (
                <Trophy className="w-6 h-6 text-amber-400" />
              ) : selectedStats.coreTasksDone >= 3 ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <Activity className="w-6 h-6 text-[#D98B4A]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#F4F4F5] font-mono">
                  {selectedStats.points} <span className="text-xs text-[#A1A1AA] font-sans font-normal">/ 50 pts</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    selectedStats.isPerfect
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                      : selectedStats.coreTasksDone >= 3
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                      : 'bg-[#131316] text-[#A1A1AA] border-[#26262C]'
                  }`}
                >
                  {selectedStats.isPerfect
                    ? '🌟 Perfect Day!'
                    : selectedStats.coreTasksDone >= 3
                    ? '💪 Strong Effort'
                    : '🌱 Active Day'}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                {selectedStats.coreTasksDone} of 5 core goals accomplished
                {selectedStats.suppsTaken > 0 ? ` • ${selectedStats.suppsTaken} supplement(s)` : ''}
                {selectedStats.habitsDone > 0 ? ` • ${selectedStats.habitsDone} habit(s)` : ''}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A1A1AA]">Completion:</span>
              <span className="font-bold text-[#E69A5C]">{Math.round((selectedStats.coreTasksDone / 5) * 100)}%</span>
            </div>
            <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden border border-[#26262C]">
              <div
                className="h-full bg-gradient-to-r from-[#D98B4A] to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${(selectedStats.coreTasksDone / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Core Daily Goals Breakdown Grid */}
        <div>
          <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2.5">
            Core Daily Goals Status
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            
            {/* Gym / Workout */}
            <div className={`p-3 rounded-xl border flex items-start gap-3 transition ${
              isSelectedDateSunday
                ? 'bg-emerald-950/15 border-emerald-500/30'
                : selectedStats.log?.gym_done
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-[#1B1B20] border-[#26262C]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                isSelectedDateSunday
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : selectedStats.log?.gym_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#131316] text-[#A1A1AA]'
              }`}>
                {isSelectedDateSunday ? <Leaf className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#F4F4F5] truncate">Gym & Workouts</h5>
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
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
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
                : 'bg-[#1B1B20] border-[#26262C]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.steps_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#131316] text-[#A1A1AA]'
              }`}>
                <Footprints className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#F4F4F5] truncate">Daily Steps</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.steps_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.steps_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
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
                : 'bg-[#1B1B20] border-[#26262C]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.water_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#131316] text-[#A1A1AA]'
              }`}>
                <Droplets className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#F4F4F5] truncate">Water Hydration</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.water_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.water_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
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
                : 'bg-[#1B1B20] border-[#26262C]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.sleep_done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#131316] text-[#A1A1AA]'
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#F4F4F5] truncate">Sleep Schedule</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.sleep_done
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.sleep_done ? '+10 pts Done' : 'Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
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
                : 'bg-[#1B1B20] border-[#26262C]'
            }`}>
              <div className={`p-2 rounded-lg shrink-0 ${
                selectedStats.log?.junk_food_avoided
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[#131316] text-[#A1A1AA]'
              }`}>
                <Apple className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#F4F4F5] truncate">Clean Nutrition</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    selectedStats.log?.junk_food_avoided
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedStats.log?.junk_food_avoided ? '+10 pts Done' : 'Cheat / Missed'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                  {selectedStats.log?.junk_food_avoided ? 'Avoided junk food successfully' : 'Had cheat snack or cravings'}
                </p>
              </div>
            </div>

            {/* Body Weight Log (if logged on this day) */}
            <div className="p-3 rounded-xl border border-[#26262C] bg-[#1B1B20] flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0 bg-[#131316] text-[#E69A5C]">
                <Flame className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-[#F4F4F5] truncate">Body Weight</h5>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-[#131316] text-[#A1A1AA] border-[#26262C]">
                    {dayWeightLog ? 'Logged' : 'No Entry'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                  {dayWeightLog ? `${dayWeightLog.weight} kg recorded` : 'Weigh-in not recorded'}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Workouts Logged for this Date */}
        {selectedStats.workouts.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#D98B4A]" />
              Workouts Logged on this Date ({selectedStats.workouts.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedStats.workouts.map((w) => (
                <div key={w.id} className="p-3 rounded-xl bg-[#1B1B20] border border-[#26262C] flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-[#F4F4F5] truncate">{w.exercise_name}</h5>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                      {w.sets} sets × {w.reps} reps
                      {w.weight ? ` • ${w.weight} ${w.weight_unit || 'kg'}` : ''}
                      {w.duration ? ` • ${w.duration} mins` : ''}
                    </p>
                    {w.notes && (
                      <p className="text-[10px] text-[#E69A5C] italic truncate mt-0.5">{w.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#131316] text-[#D98B4A] font-bold border border-[#26262C]">
                      {w.exercise_type || 'Strength'}
                    </span>
                    {onDeleteWorkout && w.user_id === currentUser.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const wid = String(w.id || (w as any)._id || '').trim();
                          setDeletedWorkoutIds(prev => new Set([...prev, wid]));
                          onDeleteWorkout(wid);
                        }}
                        className="px-2.5 py-1.5 min-h-[34px] bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
                        title="Delete workout session"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete</span>
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
            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
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
              <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F4F4F5] flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-[#D98B4A]" />
                    Supplements
                  </span>
                  <span className="text-[10px] font-mono text-[#E69A5C]">
                    {selectedStats.suppsTaken} / {selectedStats.userSuppsCount} Taken
                  </span>
                </div>
                <div className="space-y-1">
                  {userDeduplicatedSupps.map(s => {
                    const isTaken = !!supplementLogs.find(l => l.supplement_id === s.id && l.date === selectedDate)?.taken;
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#131316]">
                        <span className={`truncate text-xs ${isTaken ? 'text-emerald-300 line-through' : 'text-[#F4F4F5]'}`}>
                          {s.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isTaken ? 'bg-emerald-950/60 text-emerald-400' : 'bg-[#1B1B20] text-[#A1A1AA]'
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
              <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#F4F4F5] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D98B4A]" />
                    Custom Habits
                  </span>
                  {isViewingSelf ? (
                    <span className="text-[10px] font-mono text-[#E69A5C]">
                      {selectedStats.habitsDone} / {selectedStats.userHabitsCount} Done
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#A1A1AA] flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  )}
                </div>
                {isViewingSelf ? (
                  <div className="space-y-1">
                    {userDeduplicatedHabits.map(h => {
                      const isDone = !!customHabitLogs.find(l => l.habit_id === h.id && l.date === selectedDate)?.completed;
                      return (
                        <div key={h.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#131316]">
                          <span className={`truncate text-xs ${isDone ? 'text-emerald-300 line-through' : 'text-[#F4F4F5]'}`}>
                            {h.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            isDone ? 'bg-emerald-950/60 text-emerald-400' : 'bg-[#1B1B20] text-[#A1A1AA]'
                          }`}>
                            {isDone ? 'Done' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#A1A1AA] italic">
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
