import React, { useState, useMemo } from 'react';
import type { Workout, User } from '../types';
import { Dumbbell, Calendar, Filter, Lock, Globe, Clock, Trash2, Search } from 'lucide-react';

interface WorkoutHistoryProps {
  workouts: Workout[];
  users: User[];
  currentUser: User;
  onOpenWorkoutModal: () => void;
  onDeleteWorkout?: (id: string) => void;
  onClearAllWorkouts?: () => void;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  workouts,
  users,
  currentUser,
  onOpenWorkoutModal,
  onDeleteWorkout,
  onClearAllWorkouts,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchExercise, setSearchExercise] = useState('');
  const [deletedId, setDeletedId] = useState<string | null>(null);

  // Compute metrics for header
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const visibleWorkouts = useMemo(() => {
    return workouts
      .filter(w => {
        // Hide if deleted in current tick
        if (deletedId === w.id) return false;
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
  }, [workouts, currentUser.id, selectedUserId, searchExercise, deletedId]);

  const totalMinutes = useMemo(() => {
    return visibleWorkouts.reduce((acc, w) => acc + (Number(w.duration) || 0), 0);
  }, [visibleWorkouts]);

  const totalSets = useMemo(() => {
    return visibleWorkouts.reduce((acc, w) => acc + (Number(w.sets) || 0), 0);
  }, [visibleWorkouts]);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeletedId(id);
    if (onDeleteWorkout) {
      onDeleteWorkout(id);
    }
  };

  const handleClearAllClick = () => {
    if (workouts.length === 0) return;
    if (window.confirm('Are you sure you want to delete all workout sessions? This will permanently remove them.')) {
      if (onClearAllWorkouts) {
        onClearAllWorkouts();
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Header & Main Controls */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#f5efe6] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#c68b59] to-[#b87b4b] text-[#1c1815]">
              <Dumbbell className="w-5 h-5" />
            </div>
            Workout Sessions
          </h2>
          <p className="text-xs text-[#c5b4a5] mt-1">
            Browse, manage, and log workout sessions for yourself and your group
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {workouts.length > 0 && onClearAllWorkouts && (
            <button
              type="button"
              onClick={handleClearAllClick}
              className="flex-1 sm:flex-none justify-center py-2.5 px-3.5 min-h-[40px] bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title="Delete all logged workout sessions"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clear All Sessions</span>
            </button>
          )}

          <button
            onClick={onOpenWorkoutModal}
            className="flex-1 sm:flex-none justify-center py-2.5 px-4 min-h-[40px] bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-xs transition shadow-lg shadow-[#c68b59]/25 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            <span>+ Log New Session</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#26201b] border border-[#3d322a] rounded-xl p-3 sm:p-4 text-center">
          <span className="text-[10px] sm:text-xs font-semibold text-[#c5b4a5] uppercase tracking-wider block">Total Sessions</span>
          <strong className="text-lg sm:text-2xl font-black text-[#d4a373] font-mono mt-0.5 block">{visibleWorkouts.length}</strong>
        </div>
        <div className="bg-[#26201b] border border-[#3d322a] rounded-xl p-3 sm:p-4 text-center">
          <span className="text-[10px] sm:text-xs font-semibold text-[#c5b4a5] uppercase tracking-wider block">Total Sets</span>
          <strong className="text-lg sm:text-2xl font-black text-[#f5efe6] font-mono mt-0.5 block">{totalSets}</strong>
        </div>
        <div className="bg-[#26201b] border border-[#3d322a] rounded-xl p-3 sm:p-4 text-center">
          <span className="text-[10px] sm:text-xs font-semibold text-[#c5b4a5] uppercase tracking-wider block">Active Time</span>
          <strong className="text-lg sm:text-2xl font-black text-emerald-400 font-mono mt-0.5 block">{totalMinutes}m</strong>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1c1815] p-3.5 sm:p-4 rounded-xl border border-[#3d322a]">
        <div>
          <label className="block text-xs font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#c68b59]" /> Filter by Member
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-[#26201b] border border-[#3d322a] text-[#f5efe6] text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#c68b59] cursor-pointer"
          >
            <option value="all">All Group Members ({users.length})</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} {u.id === currentUser.id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-[#c68b59]" /> Search Exercise / Notes
          </label>
          <input
            type="text"
            value={searchExercise}
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="e.g. Squat, Bench, Run, Curls..."
            className="w-full bg-[#26201b] border border-[#3d322a] text-[#f5efe6] text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#c68b59]"
          />
        </div>
      </div>

      {/* Workout Sessions Cards List */}
      {visibleWorkouts.length === 0 ? (
        <div className="text-center py-14 bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1c1815] border border-[#3d322a] flex items-center justify-center mx-auto text-[#c5b4a5]/40">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-[#f5efe6]">No workout sessions found</h4>
          <p className="text-xs text-[#c5b4a5] max-w-sm mx-auto">
            {searchExercise.trim() || selectedUserId !== 'all'
              ? 'No sessions match your search criteria. Try clearing filters.'
              : 'You have not recorded any workout sessions yet. Log your first session today!'}
          </p>
          <button
            onClick={onOpenWorkoutModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c68b59]/20 hover:bg-[#c68b59]/30 text-[#d4a373] border border-[#c68b59]/40 rounded-xl text-xs font-bold transition cursor-pointer mt-2"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>+ Log Workout Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleWorkouts.map((w) => {
            const user = userMap.get(w.user_id) || { name: 'Member', avatar_color: 'from-[#c68b59] to-[#785338]' };
            return (
              <div
                key={w.id}
                className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-5 hover:border-[#c68b59]/50 transition-all duration-200 shadow-xl flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: User Info & Badges */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#3d322a]">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${user.avatar_color || 'from-[#c68b59] to-[#785338]'} text-xs font-black text-[#f5efe6] flex items-center justify-center shadow-sm`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#f5efe6] leading-tight">{user.name}</h4>
                        <span className="text-[11px] text-[#c5b4a5] flex items-center gap-1 mt-0.5 font-mono">
                          <Calendar className="w-3 h-3 text-[#c68b59]" /> {w.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {w.is_private ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/60 font-semibold">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-[#d4a373] bg-[#1c1815] px-2 py-0.5 rounded-full border border-[#3d322a]">
                          <Globe className="w-3 h-3 text-[#c68b59]" /> Public
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exercise Title & Type Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-black text-[#f5efe6] leading-snug">
                      {w.exercise_name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1c1815] text-[#d4a373] border border-[#3d322a] shrink-0 uppercase tracking-wider">
                      {w.exercise_type || 'Strength'}
                    </span>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-3 gap-2 bg-[#1c1815] p-2.5 rounded-xl border border-[#3d322a] text-center mb-3">
                    <div>
                      <span className="block text-[10px] text-[#c5b4a5] font-semibold uppercase">Sets</span>
                      <strong className="text-sm font-black text-[#f5efe6] font-mono">{w.sets}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#c5b4a5] font-semibold uppercase">Reps</span>
                      <strong className="text-sm font-black text-[#f5efe6] font-mono">{w.reps}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#c5b4a5] font-semibold uppercase">Weight</span>
                      <strong className="text-sm font-black text-[#d4a373] font-mono">
                        {w.weight ? `${w.weight} kg` : 'Bodyweight'}
                      </strong>
                    </div>
                  </div>

                  {/* Notes / Duration */}
                  <div className="flex items-center justify-between text-xs text-[#c5b4a5] mb-2">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-[#c68b59]" /> Duration: <strong className="text-[#f5efe6]">{w.duration} mins</strong>
                    </span>
                  </div>

                  {w.notes && (
                    <div className="bg-[#1c1815]/60 border border-[#3d322a]/70 rounded-lg p-2 text-xs text-[#c5b4a5] italic mb-3">
                      "{w.notes}"
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer with Prominent Red Delete Button */}
                <div className="pt-3 border-t border-[#3d322a] flex items-center justify-end">
                  {onDeleteWorkout && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(w.id, e)}
                      className="px-3 py-1.5 min-h-[36px] bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                      title="Permanently delete this workout session"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
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
