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
      <div className="relative w-full max-w-2xl bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-2xl my-4 sm:my-8 text-[#F4F4F5]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#F4F4F5] p-2 rounded-lg hover:bg-[#1B1B20] transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#26262C]">
          <div className="w-10 h-10 rounded-lg bg-[#D98B4A] text-[#0B0B0D] flex items-center justify-center shadow-md shadow-[#D98B4A]/20 shrink-0">
            <Dumbbell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#F4F4F5] flex items-center gap-2">
              Log Workout Session
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#1B1B20] text-[#D98B4A] border border-[#26262C] font-mono tabular-nums">
                {selectedDate}
              </span>
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Record sets, reps, weight, and cardio time for this day
            </p>
          </div>
        </div>

        {/* Locked / Failed Warning Banner */}
        {isGymFailed && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[#F87171] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#F87171] mt-0.5" />
            <div>
              <p className="font-semibold">Gym routine for {selectedDate} is marked as Failed</p>
              <p className="text-rose-400/80 mt-0.5">
                Workouts cannot be added while the gym routine is failed. You can remove the "Failed" status from your Daily Checklist first if you clicked it by mistake.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Category Tabs */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-2">Category</label>
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
                        ? 'bg-[#D98B4A] text-[#0B0B0D] border-[#D98B4A] shadow-sm'
                        : 'bg-[#1B1B20] text-[#A1A1AA] border-[#26262C] hover:text-[#F4F4F5] hover:bg-[#26262C]'
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
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1.5">
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
                    handleUpdateRow(targetId, 'exercise_type', activeCategory === 'cardio' ? 'cardio' : 'strength');
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#1B1B20] hover:bg-[#26262C] text-xs text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#26262C] hover:border-[#D98B4A]/40 transition cursor-pointer"
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
                className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3 sm:p-4 space-y-3 relative hover:border-[#D98B4A]/30 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F4F4F5] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-[#131316] border border-[#26262C] flex items-center justify-center text-[10px] text-[#A1A1AA] tabular-nums">
                      {index + 1}
                    </span>
                    Exercise Item
                  </span>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.id)}
                      className="text-[#71717A] hover:text-rose-400 p-1 rounded-md transition cursor-pointer"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#71717A] mb-1">Exercise Name</label>
                    <input
                      type="text"
                      value={item.exercise_name}
                      onChange={(e) => handleUpdateRow(item.id, 'exercise_name', e.target.value)}
                      placeholder="e.g. Bench Press, Treadmill..."
                      className="w-full px-3 py-2 bg-[#131316] border border-[#26262C] rounded-lg text-[#F4F4F5] text-xs focus:outline-none focus:border-[#D98B4A]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#71717A] mb-1">Sets</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={item.sets}
                        onChange={(e) => handleUpdateRow(item.id, 'sets', Number(e.target.value))}
                        className="w-full px-2.5 py-2 bg-[#131316] border border-[#26262C] rounded-lg text-[#F4F4F5] text-xs text-center tabular-nums focus:outline-none focus:border-[#D98B4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#71717A] mb-1">Reps</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={item.reps}
                        onChange={(e) => handleUpdateRow(item.id, 'reps', Number(e.target.value))}
                        className="w-full px-2.5 py-2 bg-[#131316] border border-[#26262C] rounded-lg text-[#F4F4F5] text-xs text-center tabular-nums focus:outline-none focus:border-[#D98B4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#71717A] mb-1">Kg / Lbs</label>
                      <input
                        type="text"
                        value={item.weight}
                        onChange={(e) => handleUpdateRow(item.id, 'weight', e.target.value)}
                        placeholder="Optional"
                        className="w-full px-2 py-2 bg-[#131316] border border-[#26262C] rounded-lg text-[#F4F4F5] text-xs text-center tabular-nums focus:outline-none focus:border-[#D98B4A]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                    placeholder="Optional notes e.g. Felt strong on 3rd set, good form..."
                    className="w-full px-3 py-1.5 bg-[#131316] border border-[#26262C] rounded-lg text-[#F4F4F5] text-xs focus:outline-none focus:border-[#D98B4A]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Another Exercise Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 min-h-[38px] border border-dashed border-[#26262C] hover:border-[#D98B4A]/50 rounded-lg text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5] bg-[#1B1B20] transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Another Exercise to this Session</span>
          </button>

          {/* Privacy & Submission Footer */}
          <div className="pt-3 border-t border-[#26262C] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className="flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
            >
              {isPrivate ? (
                <>
                  <Lock className="w-4 h-4 text-[#FBBF24]" />
                  <span>Private (Only you can see this workout)</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 text-[#D98B4A]" />
                  <span>Public (Shared with your fitness challenge group)</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg border border-[#26262C] bg-[#1B1B20] hover:bg-[#26262C] text-[#A1A1AA] hover:text-[#F4F4F5] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGymFailed}
                className={`flex-1 sm:flex-initial px-6 py-2 min-h-[38px] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isGymFailed
                    ? 'bg-[#1B1B20] text-[#71717A] border border-[#26262C] cursor-not-allowed opacity-60'
                    : 'bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] cursor-pointer shadow-md shadow-[#D98B4A]/20 active:scale-95'
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
