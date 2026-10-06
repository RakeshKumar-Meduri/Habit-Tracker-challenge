import React, { useState, useMemo } from 'react';
import type { Workout, User, MissedReason } from '../types';
import { Dumbbell, Calendar, Lock, Globe, Clock, Trash2, Search, AlertCircle } from 'lucide-react';

interface WorkoutHistoryProps {
  workouts: Workout[];
  users: User[];
  currentUser: User;
  missedReasons?: MissedReason[];
  selectedDate?: string;
  onOpenWorkoutModal: () => void;
  onDeleteWorkout?: (id: string) => void;
  onClearAllWorkouts?: () => void;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  workouts,
  users,
  currentUser,
  missedReasons = [],
  selectedDate,
  onOpenWorkoutModal,
  onDeleteWorkout,
  onClearAllWorkouts,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchExercise, setSearchExercise] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [clearedAll, setClearedAll] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Check if today's / selected date's gym goal is marked as Failed
  const isGymFailedOnSelectedDate = !!selectedDate && missedReasons.some(
    r => r.goal_type === 'gym' && r.user_id === currentUser.id && r.date === selectedDate
  );

  // Compute metrics for header
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  // Reset clearedAll if new workouts arrive from modal logging
  React.useEffect(() => {
    if (workouts.length > 0 && clearedAll) {
      setClearedAll(false);
    }
  }, [workouts.length]);

  const visibleWorkouts = useMemo(() => {
    if (clearedAll) return [];
    return workouts
      .filter(w => {
        if (!w) return false;
        const wid = String(w.id || (w as any)._id || '').trim();
        // Hide if deleted
        if (deletedIds.has(wid)) return false;
        // Private check
        if (w.is_private && w.user_id !== currentUser.id) return false;
        // Member filter
        if (selectedUserId !== 'all' && w.user_id !== selectedUserId) return false;
        // Search filter
        if (searchExercise.trim()) {
          const q = searchExercise.toLowerCase().trim();
          const matchName = (w.exercise_name || '').toLowerCase().includes(q);
          const matchNotes = (w.notes || '').toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || ''));
  }, [workouts, currentUser.id, selectedUserId, searchExercise, deletedIds, clearedAll]);

  const totalMinutes = useMemo(() => {
    return visibleWorkouts.reduce((acc, w) => acc + (Number(w.duration) || 0), 0);
  }, [visibleWorkouts]);

  const totalSets = useMemo(() => {
    return visibleWorkouts.reduce((acc, w) => acc + (Number(w.sets) || 0), 0);
  }, [visibleWorkouts]);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const idStr = String(id).trim();

    // 1. Optimistically hide immediately
    setDeletedIds(prev => new Set([...prev, idStr]));
    setSuccessBanner('Workout session deleted permanently!');
    setTimeout(() => setSuccessBanner(null), 3500);

    // 2. Synchronously remove from storage
    try {
      const raw = localStorage.getItem('pulse_fitness_workouts');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const remaining = arr.filter((x: any) => String(x.id || x._id || '').trim() !== idStr);
          localStorage.setItem('pulse_fitness_workouts', JSON.stringify(remaining));
        }
      }
    } catch {}

    // 3. Trigger parent delete handler
    if (onDeleteWorkout) {
      onDeleteWorkout(idStr);
    }
  };

  const handleClearAllClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // 1. Instantly wipe from screen
    setClearedAll(true);
    setDeletedIds(new Set());
    setSuccessBanner('All workout sessions cleared permanently!');
    setTimeout(() => setSuccessBanner(null), 3500);

    // 2. Direct synchronous localStorage and sessionStorage wipe
    try {
      localStorage.removeItem('pulse_fitness_workouts');
      localStorage.setItem('pulse_fitness_workouts', '[]');
      sessionStorage.removeItem('pulse_fitness_workouts');
      sessionStorage.setItem('pulse_fitness_workouts', '[]');
    } catch (err) {
      console.warn('Storage clear error', err);
    }

    // 3. Parent clear handler
    if (onClearAllWorkouts) {
      onClearAllWorkouts();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Header & Main Controls */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F4F4F5] flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#D98B4A] text-[#0B0B0D]">
              <Dumbbell className="w-5 h-5 stroke-[2.5]" />
            </div>
            Workout Sessions
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Browse, manage, and log workout sessions for yourself and your group
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {workouts.filter(w => w.user_id === currentUser.id).length > 0 && !clearedAll && onClearAllWorkouts && (
            <button
              type="button"
              onClick={handleClearAllClick}
              className="flex-1 sm:flex-none justify-center py-2 px-3.5 min-h-[38px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[#F87171] font-semibold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Delete all logged workout sessions permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={onOpenWorkoutModal}
            className="flex-1 sm:flex-none justify-center py-2.5 px-5 min-h-[44px] bg-[#3157D5] hover:bg-[#2544B8] text-white font-semibold rounded-[10px] text-xs sm:text-sm transition shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            <span>+ Log Session</span>
          </button>
        </div>
      </div>

      {/* Gym Failed Alert Warning if selected date is failed */}
      {isGymFailedOnSelectedDate && (
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 sm:p-4 text-xs text-[#F87171] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#F87171] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice: Gym routine for {selectedDate} is marked as Failed</p>
            <p className="text-rose-400/80 mt-0.5">
              Workouts cannot be logged for this date while it is marked as Failed. If you clicked "Failed" by mistake, you can remove the Failed status in the Daily Checklist.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-[#34D399] px-4 py-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center gap-2">✓ {successBanner}</span>
          <button type="button" onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <span className="text-[10px] sm:text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">Sessions</span>
          <strong className="text-lg sm:text-2xl font-bold text-[#F4F4F5] tabular-nums mt-0.5 block">{visibleWorkouts.length}</strong>
        </div>
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <span className="text-[10px] sm:text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">Total Sets</span>
          <strong className="text-lg sm:text-2xl font-bold text-[#F4F4F5] tabular-nums mt-0.5 block">{totalSets}</strong>
        </div>
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <span className="text-[10px] sm:text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">Duration</span>
          <strong className="text-lg sm:text-2xl font-bold text-[#D98B4A] tabular-nums mt-0.5 block">{totalMinutes}m</strong>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#131316] p-3.5 sm:p-4 rounded-xl border border-[#26262C]">
        
        {/* Member Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#A1A1AA] shrink-0">Member:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-[#1B1B20] text-[#F4F4F5] text-xs font-medium border border-[#26262C] rounded-lg px-3 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
          >
            <option value="all">🌐 All Members ({users.length})</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === currentUser.id ? `👤 You (${u.name})` : `👥 ${u.name}`}
              </option>
            ))}
          </select>
        </div>

        {/* Exercise Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchExercise}
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="Filter by exercise name or notes..."
            className="w-full pl-9 pr-3.5 py-2 bg-[#1B1B20] border border-[#26262C] rounded-lg text-[#F4F4F5] placeholder-[#71717A] text-xs focus:outline-none focus:border-[#D98B4A]"
          />
        </div>

      </div>

      {/* Workout Sessions Cards Grid */}
      {visibleWorkouts.length === 0 ? (
        <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-8 sm:p-12 text-center shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="w-12 h-12 rounded-[10px] bg-[#F1F3F6] border border-[#E4E7EC] flex items-center justify-center mx-auto text-[#667085]">
            <Dumbbell className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="text-base font-bold text-[#111827] mt-3.5">No workouts yet</h3>
          <p className="text-sm text-[#667085] mt-1 max-w-sm mx-auto">
            {searchExercise || selectedUserId !== 'all'
              ? 'No sessions match your current member or exercise filter.'
              : 'Your first workout starts your streak.'}
          </p>
          {(!searchExercise && selectedUserId === 'all') && (
            <button
              onClick={onOpenWorkoutModal}
              className="mt-5 px-5 py-2.5 min-h-[44px] bg-[#3157D5] hover:bg-[#2544B8] text-white font-semibold rounded-[10px] text-xs sm:text-sm transition inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
              <span>Log workout</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleWorkouts.map((w) => {
            const user = userMap.get(w.user_id) || { name: 'Member' };
            return (
              <div
                key={w.id}
                className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-5 hover:border-[#D98B4A]/30 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: User Info & Badges */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#26262C]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#1B1B20] border border-[#26262C] text-xs font-bold text-[#F4F4F5] flex items-center justify-center">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[#F4F4F5] leading-tight">{user.name}</h4>
                        <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-0.5 tabular-nums">
                          <Calendar className="w-3 h-3 text-[#D98B4A]" /> {w.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {w.is_private ? (
                        <span className="flex items-center gap-1 text-[10px] text-[#FBBF24] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 font-medium">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[#A1A1AA] bg-[#1B1B20] px-2 py-0.5 rounded-md border border-[#26262C]">
                          <Globe className="w-3 h-3 text-[#D98B4A]" /> Public
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exercise Title & Type Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] leading-snug">
                      {w.exercise_name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#1B1B20] text-[#D98B4A] border border-[#26262C] shrink-0 uppercase tracking-wider">
                      {w.exercise_type || 'Strength'}
                    </span>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-3 gap-2 bg-[#1B1B20] p-2.5 rounded-lg border border-[#26262C] text-center mb-3">
                    <div>
                      <span className="block text-[10px] text-[#71717A] font-medium uppercase">Sets</span>
                      <strong className="text-sm font-bold text-[#F4F4F5] tabular-nums">{w.sets}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#71717A] font-medium uppercase">Reps</span>
                      <strong className="text-sm font-bold text-[#F4F4F5] tabular-nums">{w.reps}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#71717A] font-medium uppercase">Weight</span>
                      <strong className="text-sm font-bold text-[#D98B4A] tabular-nums">
                        {w.weight ? `${w.weight} kg` : 'Bodyweight'}
                      </strong>
                    </div>
                  </div>

                  {/* Notes / Duration */}
                  <div className="flex items-center justify-between text-xs text-[#A1A1AA] mb-2">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-[#D98B4A]" /> Duration: <strong className="text-[#F4F4F5] tabular-nums">{w.duration} mins</strong>
                    </span>
                  </div>

                  {w.notes && (
                    <div className="bg-[#1B1B20] border border-[#26262C] rounded-lg p-2 text-xs text-[#A1A1AA] italic mb-3">
                      "{w.notes}"
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer with Quiet Delete Button */}
                <div className="pt-3 border-t border-[#26262C] flex items-center justify-end">
                  {onDeleteWorkout && w.user_id === currentUser.id && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(w.id || (w as any)._id, e)}
                      className="px-2.5 py-1.5 min-h-[32px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[#F87171] font-medium rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Permanently delete this workout session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Session</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
