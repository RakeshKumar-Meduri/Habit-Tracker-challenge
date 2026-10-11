import React, { useState } from 'react';
import type { Workout, User, MissedReason } from '../types';
import { Dumbbell, X, Plus, Trash2, Flame, HeartPulse, Sparkles, Lock, Globe, AlertCircle } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  selectedDate: string;
  missedReasons?: MissedReason[];
  onSaveWorkouts: (workouts: Workout[]) => void;
}

interface RoutineItem {
  id: string;
  exercise_name: string;
  exercise_type: 'strength' | 'cardio' | 'other';
  sets: number;
  reps: number;
  weight: string;
  duration: number;
  distance?: string;
  intervals?: string;
  notes: string;
}

const CATEGORY_PRESETS: Record<string, string[]> = {
  strength: ['Barbell Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Dumbbell Curls', 'Pull-ups', 'Leg Press'],
  cardio: ['Treadmill Run', 'Outdoor Jog', 'Stationary Bike', 'Rowing Machine', 'Jump Rope', 'Stair Climber'],
  hiit: ['Burpees', 'Kettlebell Swings', 'Box Jumps', 'Battle Ropes', 'Mountain Climbers'],
  mobility: ['Full Body Yoga', 'Dynamic Stretch', 'Foam Rolling', 'Core Planks'],
};

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedDate,
  missedReasons = [],
  onSaveWorkouts,
}) => {
  const [activeCategory, setActiveCategory] = useState<'strength' | 'cardio' | 'hiit' | 'mobility'>('strength');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [exercises, setExercises] = useState<RoutineItem[]>([
    {
      id: `ex_${Date.now()}_0`,
      exercise_name: '',
      exercise_type: 'strength',
      sets: 3,
      reps: 10,
      weight: '',
      duration: 30,
      distance: '',
      intervals: '',
      notes: '',
    },
  ]);

  if (!isOpen) return null;

  // Check if Gym routine is marked as Failed for this user on this date
  const isGymFailed = missedReasons.some(
    r => r.goal_type === 'gym' && r.user_id === currentUser.id && r.date === selectedDate
  );

  const handleAddRow = () => {
    setExercises(prev => [
      ...prev,
      {
        id: `ex_${Date.now()}_${prev.length}`,
        exercise_name: '',
        exercise_type: activeCategory === 'cardio' ? 'cardio' : activeCategory === 'strength' ? 'strength' : 'other',
        sets: activeCategory === 'strength' ? 3 : (activeCategory === 'hiit' ? 4 : 1),
        reps: activeCategory === 'strength' ? 10 : 1,
        weight: '',
        duration: activeCategory === 'cardio' ? 30 : (activeCategory === 'hiit' ? 20 : 15),
        distance: '',
        intervals: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (exercises.length <= 1) return;
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateRow = (id: string, field: keyof RoutineItem, value: any) => {
    setExercises(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isGymFailed) {
      alert(`Cannot log workout: The gym routine for ${selectedDate} is marked as Failed. Please remove the Failed status in the Daily Checklist first.`);
      return;
    }

    const valid = exercises.filter(e => e.exercise_name.trim().length > 0);
    if (valid.length === 0) {
      alert('Please enter at least one exercise name.');
      return;
    }

    const timestamp = Date.now();
    const newWorkouts: Workout[] = valid.map((item, idx) => {
      let finalNotes = item.notes.trim();
      if (item.distance && item.distance.trim()) {
        finalNotes = finalNotes ? `${item.distance.trim()} · ${finalNotes}` : item.distance.trim();
      }
      if (item.intervals && item.intervals.trim()) {
        finalNotes = finalNotes ? `[${item.intervals.trim()}] ${finalNotes}` : `[${item.intervals.trim()}]`;
      }

      return {
        id: `wo_${currentUser.id}_${timestamp}_${idx}`,
        user_id: currentUser.id,
        date: selectedDate,
        exercise_name: item.exercise_name.trim(),
        exercise_type: item.exercise_type || (activeCategory === 'cardio' ? 'cardio' : activeCategory === 'strength' ? 'strength' : 'other'),
        sets: Math.max(1, Number(item.sets) || 1),
        reps: Math.max(1, Number(item.reps) || 1),
        weight: item.weight ? parseFloat(item.weight) : undefined,
        weight_unit: 'kg',
        duration: Math.max(1, Number(item.duration) || 15),
        notes: finalNotes,
        is_private: isPrivate,
        created_at: new Date().toISOString(),
      };
    });

    onSaveWorkouts(newWorkouts);
    onClose();

    // Reset state
    setExercises([
      {
        id: `ex_${Date.now()}_0`,
        exercise_name: '',
        exercise_type: 'strength',
        sets: 3,
        reps: 10,
        weight: '',
        duration: 30,
        notes: '',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl my-4 sm:my-8 text-zinc-900 dark:text-zinc-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Log Workout Session
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-mono tabular-nums">
                {selectedDate}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Record sets, reps, weight, and cardio time for this day
            </p>
          </div>
        </div>

        {/* Locked / Failed Warning Banner */}
        {isGymFailed && (
          <div className="mb-5 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-zinc-900 dark:text-zinc-100 mt-0.5" />
            <div>
              <p className="font-semibold">Gym routine for {selectedDate} is marked as Failed</p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                Workouts cannot be added while the gym routine is failed. You can remove the "Failed" status from your Daily Checklist first if you clicked it by mistake.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Category Tabs */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'strength', label: 'Strength', icon: Dumbbell },
                { id: 'cardio', label: 'Cardio', icon: HeartPulse },
                { id: 'hiit', label: 'HIIT / Circuit', icon: Flame },
                { id: 'mobility', label: 'Mobility', icon: Sparkles },
              ].map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-sm'
                        : 'btn-secondary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick-Pick Popular Exercises */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
              Popular Presets for {activeCategory.toUpperCase()}:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS[activeCategory]?.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    const emptyIdx = exercises.findIndex(e => !e.exercise_name);
                    const targetId = emptyIdx >= 0 ? exercises[emptyIdx].id : exercises[exercises.length - 1].id;
                    handleUpdateRow(targetId, 'exercise_name', ex);
                    handleUpdateRow(targetId, 'exercise_type', activeCategory === 'cardio' ? 'cardio' : activeCategory === 'strength' ? 'strength' : 'other');
                  }}
                  className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                >
                  + {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
            {exercises.map((item, index) => (
              <div
                key={item.id}
                className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 relative hover:border-zinc-400 dark:hover:border-zinc-600 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {index + 1}
                    </span>
                    {activeCategory === 'cardio' ? 'Cardio Activity' : activeCategory === 'hiit' ? 'HIIT / Circuit Drill' : activeCategory === 'mobility' ? 'Mobility / Recovery' : 'Strength Exercise'}
                  </span>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.id)}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 rounded-md transition cursor-pointer"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                      {activeCategory === 'cardio' ? 'Activity Name' : activeCategory === 'hiit' ? 'Exercise / Circuit Drill' : activeCategory === 'mobility' ? 'Routine / Pose Name' : 'Exercise Name'}
                    </label>
                    <input
                      type="text"
                      value={item.exercise_name}
                      onChange={(e) => handleUpdateRow(item.id, 'exercise_name', e.target.value)}
                      placeholder={activeCategory === 'cardio' ? 'e.g. Treadmill Run, Outdoor Jog...' : activeCategory === 'hiit' ? 'e.g. Burpees, Kettlebell Circuit...' : activeCategory === 'mobility' ? 'e.g. Full Body Yoga, Foam Rolling...' : 'e.g. Bench Press, Squats...'}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Category-Specific Right Side Inputs */}
                  {activeCategory === 'cardio' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Duration (mins) *</label>
                        <input
                          type="number"
                          min="1"
                          max="360"
                          placeholder="30"
                          value={item.duration === 0 || !item.duration ? '' : item.duration}
                          onChange={(e) => handleUpdateRow(item.id, 'duration', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Distance (km/mi)</label>
                        <input
                          type="text"
                          value={item.distance || ''}
                          onChange={(e) => handleUpdateRow(item.id, 'distance', e.target.value)}
                          placeholder="e.g. 5.0 km"
                          className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  ) : activeCategory === 'hiit' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Duration (mins) *</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          placeholder="20"
                          value={item.duration === 0 || !item.duration ? '' : item.duration}
                          onChange={(e) => handleUpdateRow(item.id, 'duration', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Rounds</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          placeholder="4"
                          value={item.sets === 0 || !item.sets ? '' : item.sets}
                          onChange={(e) => handleUpdateRow(item.id, 'sets', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Work / Rest</label>
                        <input
                          type="text"
                          value={item.intervals || ''}
                          onChange={(e) => handleUpdateRow(item.id, 'intervals', e.target.value)}
                          placeholder="45s / 15s"
                          className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  ) : activeCategory === 'mobility' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Duration (mins) *</label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          placeholder="20"
                          value={item.duration === 0 || !item.duration ? '' : item.duration}
                          onChange={(e) => handleUpdateRow(item.id, 'duration', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Sets / Hold</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          placeholder="1"
                          value={item.sets === 0 || !item.sets ? '' : item.sets}
                          onChange={(e) => handleUpdateRow(item.id, 'sets', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Sets</label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          placeholder="3"
                          value={item.sets === 0 || !item.sets ? '' : item.sets}
                          onChange={(e) => handleUpdateRow(item.id, 'sets', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Reps</label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          placeholder="10"
                          value={item.reps === 0 || !item.reps ? '' : item.reps}
                          onChange={(e) => handleUpdateRow(item.id, 'reps', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Kg / Lbs</label>
                        <input
                          type="text"
                          value={item.weight}
                          onChange={(e) => handleUpdateRow(item.id, 'weight', e.target.value)}
                          placeholder="Optional"
                          className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                    placeholder={activeCategory === 'cardio' ? 'Optional pace, incline, machine, or heart rate notes...' : activeCategory === 'hiit' ? 'Optional round notes, target heart rate...' : 'Optional notes e.g. Felt strong on 3rd set, good form...'}
                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Exercise Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 min-h-[38px] btn-secondary border-dashed rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Another Exercise to this Session</span>
          </button>

          {/* Privacy & Submission Footer */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              {isPrivate ? (
                <>
                  <Lock className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                  <span>Private to Me (Hidden from group feed)</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                  <span>Visible to This Group (Shared with teammates)</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg btn-secondary text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGymFailed}
                className={`flex-1 sm:flex-initial px-6 py-2 min-h-[38px] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isGymFailed
                    ? 'btn-secondary cursor-not-allowed opacity-50'
                    : 'btn-primary cursor-pointer active:scale-95'
                }`}
              >
                <span>{isGymFailed ? 'Gym Goal Marked as Failed' : 'Save Workout Session'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
