import React, { useState } from 'react';
import type { Workout, User } from '../types';
import { Dumbbell, Calendar, Filter, Lock, Globe, Clock } from 'lucide-react';

interface WorkoutHistoryProps {
  workouts: Workout[];
  users: User[];
  currentUser: User;
  onOpenWorkoutModal: () => void;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  workouts,
  users,
  currentUser,
  onOpenWorkoutModal,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchExercise, setSearchExercise] = useState('');

  // Filter workouts by user permissions & selected filters
  const visibleWorkouts = workouts.filter(w => {
    // Private check
    if (w.is_private && w.user_id !== currentUser.id) return false;
    // User filter
    if (selectedUserId !== 'all' && w.user_id !== selectedUserId) return false;
    // Exercise search
    if (searchExercise.trim() && !w.exercise_name.toLowerCase().includes(searchExercise.toLowerCase().trim())) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const getUser = (userId: string) => users.find(u => u.id === userId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      
      {/* Header & Filter Controls */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#f5efe6] flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-[#c68b59]" />
            Group Workout History
          </h2>
          <p className="text-xs text-[#c5b4a5] mt-1">
            Browse strength & cardio logs from group members
          </p>
        </div>

        <button
          onClick={onOpenWorkoutModal}
          className="py-2.5 px-4 bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-bold rounded-xl text-xs transition shadow-lg shadow-[#c68b59]/20 flex items-center gap-2 cursor-pointer"
        >
          + Log New Workout
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1c1815] p-4 rounded-xl border border-[#3d322a]">
        <div>
          <label className="block text-xs font-semibold text-[#c5b4a5] mb-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#c68b59]" /> Filter by Member
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-[#26201b] border border-[#3d322a] text-[#f5efe6] text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#c68b59] cursor-pointer"
          >
            <option value="all">All Group Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} {u.id === currentUser.id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Search Exercise Name</label>
          <input
            type="text"
            value={searchExercise}
            onChange={(e) => setSearchExercise(e.target.value)}
            placeholder="e.g. Squat, Bench, Run..."
            className="w-full bg-[#26201b] border border-[#3d322a] text-[#f5efe6] text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#c68b59]"
          />
        </div>
      </div>

      {/* Workout Entries List */}
      {visibleWorkouts.length === 0 ? (
        <div className="text-center py-12 bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 shadow-xl">
          <Dumbbell className="w-12 h-12 text-[#c5b4a5]/40 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-[#f5efe6]">No workout records found</h4>
          <p className="text-xs text-[#c5b4a5] mt-1">Try clearing filters or logging a new workout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleWorkouts.map((w) => {
            const user = getUser(w.user_id);
            return (
              <div
                key={w.id}
                className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-5 hover:border-[#c68b59]/40 transition shadow-lg"
              >
                {/* User & Date Header */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#3d322a]">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${user?.avatar_color || 'from-[#c68b59] to-[#785338]'} text-xs font-bold text-[#f5efe6] flex items-center justify-center`}>
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#f5efe6]">{user?.name}</h4>
                      <span className="text-[11px] text-[#c5b4a5] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#c68b59]" /> {w.date}
                      </span>
                    </div>
                  </div>

                  {w.is_private ? (
                    <span className="flex items-center gap-1 text-[11px] text-[#d4a373] bg-[#1c1815] px-2 py-0.5 rounded-full border border-[#3d322a]">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-[#d4a373] bg-[#c68b59]/10 px-2 py-0.5 rounded-full border border-[#c68b59]/30">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  )}
                </div>

                {/* Exercise Details */}
                <h3 className="text-base font-black text-[#f5efe6] mb-3">{w.exercise_name}</h3>

                <div className="grid grid-cols-3 gap-2 bg-[#1c1815] p-2.5 rounded-xl border border-[#3d322a] text-center mb-3">
                  <div>
                    <span className="block text-[10px] text-[#c5b4a5] font-semibold uppercase">Sets</span>
                    <strong className="text-sm font-bold text-[#f5efe6]">{w.sets}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#c5b4a5] font-semibold uppercase">Reps</span>
                    <strong className="text-sm font-bold text-[#f5efe6]">{w.reps}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#c5b4a5] font-semibold uppercase">Weight</span>
                    <strong className="text-sm font-bold text-[#d4a373]">{w.weight ? `${w.weight} kg` : 'Bodyweight'}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#c5b4a5]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#c68b59]" /> Duration: <strong className="text-[#f5efe6]">{w.duration} mins</strong>
                  </span>
                  {w.notes && (
                    <span className="truncate max-w-[200px] text-[#c5b4a5] italic" title={w.notes}>
                      "{w.notes}"
                    </span>
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
