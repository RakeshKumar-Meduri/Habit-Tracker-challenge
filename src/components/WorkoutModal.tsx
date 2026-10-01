import React, { useState } from 'react';
import type { Workout, User } from '../types';
import { Dumbbell, X, Lock, Globe, Plus, Trash2, Layers } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  selectedDate: string;
  onSaveWorkouts: (workouts: Workout[]) => void;
}

interface RoutineExerciseItem {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: string;
  duration: number;
  notes: string;
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedDate,
  onSaveWorkouts,
}) => {
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([
    {
      id: 'ex_1',
      exercise_name: '',
      sets: 4,
      reps: 10,
      weight: '',
      duration: 30,
      notes: '',
    },
  ]);
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleAddExerciseRow = () => {
    setExercises(prev => [
      ...prev,
      {
        id: `ex_${Date.now()}_${Math.random()}`,
        exercise_name: '',
        sets: 3,
        reps: 12,
        weight: '',
        duration: 15,
        notes: '',
      },
    ]);
  };

  const handleRemoveExerciseRow = (id: string) => {
    if (exercises.length === 1) return; // Keep at least one row
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const handleExerciseChange = (id: string, field: keyof RoutineExerciseItem, value: any) => {
    setExercises(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = exercises.filter(e => e.exercise_name.trim().length > 0);
    if (validItems.length === 0) return;

    const newWorkouts: Workout[] = validItems.map((item, idx) => ({
      id: `wo_${currentUser.id}_${Date.now()}_${idx}`,
      user_id: currentUser.id,
      date: selectedDate,
      exercise_name: item.exercise_name.trim(),
      sets: Number(item.sets) || 1,
      reps: Number(item.reps) || 1,
      weight: item.weight ? parseFloat(item.weight) : undefined,
      duration: Number(item.duration) || 15,
      notes: item.notes.trim(),
      is_private: isPrivate,
      created_at: new Date().toISOString(),
    }));

    onSaveWorkouts(newWorkouts);
    onClose();
    // Reset form
    setExercises([
      {
        id: 'ex_1',
        exercise_name: '',
        sets: 4,
        reps: 10,
        weight: '',
        duration: 30,
        notes: '',
      },
    ]);
  };

  const presetExercises = [
    'Barbell Squat', 'Bench Press', 'Deadlift', 'Dumbbell Shoulder Press', 
    'Pull-ups', 'Leg Press', 'Bicep Curls', 'Treadmill Run', 'HIIT Circuit'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-8 shadow-2xl my-4 sm:my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#c5b4a5] hover:text-[#f5efe6] p-1.5 rounded-lg hover:bg-[#322a24] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 sm:mb-6">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-[#c68b59] to-[#b87b4b] flex items-center justify-center shadow-lg shadow-[#c68b59]/20 shrink-0">
            <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-[#1c1815] stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-[#f5efe6] flex flex-wrap items-center gap-2">
              Log Gym Routine
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-[#1c1815] text-[#d4a373] border border-[#3d322a] font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3" /> Multi-Workout Supported
              </span>
            </h3>
            <p className="text-xs text-[#c5b4a5] truncate">Add multiple exercises performed in today's workout ({selectedDate})</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          
          <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
            {exercises.map((item, index) => (
              <div
                key={item.id}
                className="bg-[#1c1815] border border-[#3d322a] rounded-xl p-3.5 sm:p-4 space-y-3 relative transition hover:border-[#c68b59]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#d4a373]">
                    Exercise #{index + 1}
                  </span>
                  {exercises.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveExerciseRow(item.id)}
                      className="text-xs text-[#c5b4a5] hover:text-rose-400 flex items-center gap-1 cursor-pointer transition p-1"
                      title="Remove Exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#c5b4a5] mb-1">Exercise Name</label>
                  <input
                    type="text"
                    required
                    value={item.exercise_name}
                    onChange={(e) => handleExerciseChange(item.id, 'exercise_name', e.target.value)}
                    placeholder="e.g. Barbell Squat, Bench Press..."
                    className="w-full px-3 py-2 bg-[#26201b] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                  />
                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {presetExercises.slice(0, 5).map(ex => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => handleExerciseChange(item.id, 'exercise_name', ex)}
                        className="px-2 py-0.5 rounded-lg bg-[#26201b] hover:bg-[#322a24] text-[10px] text-[#c5b4a5] border border-[#3d322a] transition cursor-pointer"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Sets</label>
                    <input
                      type="number"
                      min="1"
                      value={item.sets}
                      onChange={(e) => handleExerciseChange(item.id, 'sets', e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Reps</label>
                    <input
                      type="number"
                      min="1"
                      value={item.reps}
                      onChange={(e) => handleExerciseChange(item.id, 'reps', e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={item.weight}
                      onChange={(e) => handleExerciseChange(item.id, 'weight', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-2.5 py-2 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#c5b4a5] mb-1">Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      value={item.duration}
                      onChange={(e) => handleExerciseChange(item.id, 'duration', e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleExerciseChange(item.id, 'notes', e.target.value)}
                    placeholder="Notes e.g. Felt strong on last set (+5kg)..."
                    className="w-full px-3 py-2 bg-[#26201b] border border-[#3d322a] rounded-lg text-[#f5efe6] text-xs focus:outline-none focus:border-[#c68b59]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add exercise button */}
          <button
            type="button"
            onClick={handleAddExerciseRow}
            className="w-full py-2.5 min-h-[42px] border-2 border-dashed border-[#3d322a] hover:border-[#c68b59]/50 rounded-xl text-xs font-bold text-[#d4a373] hover:bg-[#1c1815] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#c68b59]" /> Add Another Exercise to Routine
          </button>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#1c1815] rounded-xl border border-[#3d322a]">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="w-4 h-4 text-[#d4a373]" /> : <Globe className="w-4 h-4 text-[#c68b59]" />}
              <div>
                <span className="text-xs font-bold text-[#f5efe6] block">
                  {isPrivate ? 'Private Workout' : 'Public to Group Feed'}
                </span>
                <span className="text-[11px] text-[#c5b4a5]">
                  {isPrivate ? 'Only visible to your profile' : 'Visible to group members'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#26201b] text-[#d4a373] border border-[#3d322a] hover:bg-[#322a24] transition cursor-pointer"
            >
              Toggle
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 py-3 min-h-[44px] bg-[#1c1815] hover:bg-[#322a24] text-[#c5b4a5] font-bold rounded-xl text-xs transition border border-[#3d322a] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-2/3 py-3 min-h-[44px] bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-xs transition shadow-lg shadow-[#c68b59]/20 cursor-pointer flex items-center justify-center"
            >
              Save Routine ({exercises.filter(e => e.exercise_name.trim()).length || 1} exercises)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

