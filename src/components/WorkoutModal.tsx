import React, { useState } from 'react';
import type { Workout, User } from '../types';
import { Dumbbell, X, Plus, Trash2, Flame, HeartPulse, Sparkles, Lock, Globe } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  selectedDate: string;
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
      notes: '',
    },
  ]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setExercises(prev => [
      ...prev,
      {
        id: `ex_${Date.now()}_${prev.length}`,
        exercise_name: '',
        exercise_type: activeCategory === 'cardio' ? 'cardio' : 'strength',
        sets: 3,
        reps: 10,
        weight: '',
        duration: 15,
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
    const valid = exercises.filter(e => e.exercise_name.trim().length > 0);
    if (valid.length === 0) {
      alert('Please enter at least one exercise name.');
      return;
    }

    const timestamp = Date.now();
    const newWorkouts: Workout[] = valid.map((item, idx) => ({
      id: `wo_${currentUser.id}_${timestamp}_${idx}`,
      user_id: currentUser.id,
      date: selectedDate,
      exercise_name: item.exercise_name.trim(),
      exercise_type: item.exercise_type || 'strength',
      sets: Math.max(1, Number(item.sets) || 1),
      reps: Math.max(1, Number(item.reps) || 1),
      weight: item.weight ? parseFloat(item.weight) : undefined,
      weight_unit: 'kg',
      duration: Math.max(1, Number(item.duration) || 15),
      notes: item.notes.trim(),
      is_private: isPrivate,
      created_at: new Date().toISOString(),
    }));

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
      <div className="relative w-full max-w-2xl bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-7 shadow-2xl my-4 sm:my-8 text-[#f5efe6]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#c5b4a5] hover:text-[#f5efe6] p-2 rounded-xl hover:bg-[#322a24] transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#3d322a]">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-[#c68b59] to-[#b87b4b] flex items-center justify-center shadow-lg shadow-[#c68b59]/20 shrink-0">
            <Dumbbell className="w-6 h-6 text-[#1c1815] stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#f5efe6] flex items-center gap-2">
              Log Workout Session
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1c1815] text-[#d4a373] border border-[#3d322a] font-mono">
                {selectedDate}
              </span>
            </h3>
            <p className="text-xs text-[#c5b4a5] mt-0.5">
              Record sets, reps, weight, and cardio time for today
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Category Tabs */}
          <div>
            <label className="block text-xs font-semibold text-[#c5b4a5] mb-2">Select Category</label>
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
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#c68b59] to-[#b87b4b] text-[#1c1815] border-[#c68b59] shadow-md shadow-[#c68b59]/20'
                        : 'bg-[#1c1815] text-[#c5b4a5] border-[#3d322a] hover:text-[#f5efe6] hover:bg-[#322a24]'
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
            <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1.5">
              Popular Presets for {activeCategory.toUpperCase()}:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS[activeCategory]?.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    // Update current empty row or latest row
                    const emptyIdx = exercises.findIndex(e => !e.exercise_name);
                    const targetId = emptyIdx >= 0 ? exercises[emptyIdx].id : exercises[exercises.length - 1].id;
                    handleUpdateRow(targetId, 'exercise_name', ex);
                    handleUpdateRow(targetId, 'exercise_type', activeCategory === 'cardio' ? 'cardio' : 'strength');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#1c1815] hover:bg-[#322a24] text-xs text-[#d4a373] border border-[#3d322a] hover:border-[#c68b59]/50 transition cursor-pointer"
                >
                  + {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-3.5 max-h-[48vh] overflow-y-auto pr-1">
            {exercises.map((item, index) => (
              <div
                key={item.id}
                className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3.5 sm:p-4 space-y-3 relative hover:border-[#c68b59]/40 transition shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#d4a373] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#26201b] border border-[#3d322a] flex items-center justify-center text-[10px] text-[#f5efe6]">
                      {index + 1}
                    </span>
                    Exercise Item
                  </span>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-rose-950/40 transition"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1">
                    Exercise Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={item.exercise_name}
                    onChange={(e) => handleUpdateRow(item.id, 'exercise_name', e.target.value)}
                    placeholder="e.g. Barbell Squat, Dumbbell Shoulder Press, Running..."
                    className="w-full px-3 py-2 bg-[#26201b] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Sets</label>
                    <input
                      type="number"
                      min="1"
                      value={item.sets}
                      onChange={(e) => handleUpdateRow(item.id, 'sets', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Reps</label>
                    <input
                      type="number"
                      min="1"
                      value={item.reps}
                      onChange={(e) => handleUpdateRow(item.id, 'reps', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.weight}
                      onChange={(e) => handleUpdateRow(item.id, 'weight', e.target.value)}
                      placeholder="BW if 0"
                      className="w-full px-2.5 py-1.5 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      value={item.duration}
                      onChange={(e) => handleUpdateRow(item.id, 'duration', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                    placeholder="Optional notes e.g. Felt strong on 3rd set, good form..."
                    className="w-full px-3 py-1.5 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Exercise Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 min-h-[42px] border border-dashed border-[#3d322a] hover:border-[#c68b59]/60 rounded-xl text-xs font-bold text-[#d4a373] hover:bg-[#1c1815] transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Another Exercise to this Session</span>
          </button>

          {/* Privacy & Submission Footer */}
          <div className="pt-3 border-t border-[#3d322a] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className="flex items-center gap-2 text-xs text-[#c5b4a5] hover:text-[#f5efe6] cursor-pointer"
            >
              {isPrivate ? (
                <>
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Private (Only you can see this workout)</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 text-[#d4a373]" />
                  <span>Public (Shared with your fitness challenge group)</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-[#3d322a] bg-[#1c1815] hover:bg-[#322a24] text-[#c5b4a5] text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-6 py-2.5 min-h-[40px] rounded-xl bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] text-xs font-black shadow-lg shadow-[#c68b59]/25 transition cursor-pointer active:scale-95"
              >
                Save Workout Session
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
