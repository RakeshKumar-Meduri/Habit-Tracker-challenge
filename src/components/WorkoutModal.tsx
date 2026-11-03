import React, { useState } from 'react';
import type { Workout, User, MissedReason } from '../types';
import { Dumbbell, X, Plus, Trash2, Flame, Sparkles, Lock, Globe, AlertCircle, Footprints } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  selectedDate: string;
  missedReasons?: MissedReason[];
  onSaveWorkouts: (workouts: Workout[]) => void;
}

export type WorkoutCategory = 'strength' | 'cardio' | 'hiit' | 'mobility';

interface RoutineItem {
  id: string;
  exercise_name: string;
  exercise_type: WorkoutCategory;
  sets: number;
  reps: number;
  weight: string;
  duration: number;
  distance?: string;
  intervals?: string;
  notes: string;
}

const CATEGORY_PRESETS: Record<WorkoutCategory, string[]> = {
  strength: ['Barbell Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Dumbbell Curls', 'Pull-ups', 'Leg Press', 'Cable Push Down', 'Lateral Chest Press'],
  cardio: ['Treadmill Walk', 'Outdoor Walk', 'Treadmill Run', 'Outdoor Jog', 'Stationary Bike', 'Rowing Machine', 'Jump Rope', 'Stair Climber', 'Elliptical'],
  hiit: ['Burpees', 'Kettlebell Swings', 'Box Jumps', 'Battle Ropes', 'Mountain Climbers'],
  mobility: ['Full Body Yoga', 'Dynamic Stretch', 'Foam Rolling', 'Core Planks', 'Pilates'],
};

/**
 * Automatically detects whether an exercise name is Cardio, HIIT, Mobility, or Strength
 */
export function detectExerciseCategory(name: string): WorkoutCategory {
  const lower = name.toLowerCase().trim();
  if (!lower) return 'strength';

  // Cardio & Walking keywords
  if (/(\bwalk|\bwalking|\btreadmill|\bjog|\bjogging|\brun|\brunning|\bsprint|\bcycle|\bcycling|\bbike|\bbiking|\bspin|\bspinning|\browing|\belliptical|\bstair|\bclimber|\bclimb|\bjump rope|\bswim|\bswimming|\baerobic)/i.test(lower)) {
    return 'cardio';
  }

  // HIIT keywords
  if (/(\bburpee|\bhiit|\btabata|\bcircuit|\bkettlebell|\bbox jump|\bbattle rope|\bmountain climber|\bjumping jack)/i.test(lower)) {
    return 'hiit';
  }

  // Mobility keywords
  if (/(\byoga|\bstretch|\bstretching|\bfoam roll|\bmobility|\bpilates|\bwarm up|\bcooldown|\bplank)/i.test(lower)) {
    return 'mobility';
  }

  // Strength keywords
  if (/(\bpress|\bcurl|\bsquat|\bdeadlift|\bbench|\blunge|\bpull-?up|\bchin-?up|\bpush-?up|\bdip|\bextension|\braise|\brow|\bfly|\btricep|\bbicep|\bshoulder|\bchest|\blat|\bcalf|\bdumbbell|\bbarbell|\bcable)/i.test(lower)) {
    return 'strength';
  }

  return 'strength';
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  selectedDate,
  missedReasons = [],
  onSaveWorkouts,
}) => {
  const [activePresetCategory, setActivePresetCategory] = useState<WorkoutCategory>('strength');
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

  const handleAddRow = (preferredCategory?: WorkoutCategory) => {
    const cat = preferredCategory || activePresetCategory;
    setExercises(prev => [
      ...prev,
      {
        id: `ex_${Date.now()}_${prev.length}`,
        exercise_name: '',
        exercise_type: cat,
        sets: cat === 'strength' ? 3 : (cat === 'hiit' ? 4 : 1),
        reps: cat === 'strength' ? 10 : 1,
        weight: '',
        duration: cat === 'cardio' ? 30 : (cat === 'hiit' ? 20 : 15),
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
      prev.map(item => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // When changing exercise_name, auto-detect type if relevant keywords match
        if (field === 'exercise_name') {
          const detected = detectExerciseCategory(String(value));
          if (detected !== item.exercise_type) {
            updated.exercise_type = detected;
            if (detected === 'cardio' && (!updated.duration || updated.duration === 15)) {
              updated.duration = 30;
            }
          }
        }

        // When changing exercise_type explicitly, adjust reasonable defaults
        if (field === 'exercise_type') {
          if (value === 'cardio') {
            if (!updated.duration) updated.duration = 30;
          } else if (value === 'hiit') {
            if (!updated.sets) updated.sets = 4;
            if (!updated.duration) updated.duration = 20;
          } else if (value === 'strength') {
            if (!updated.sets) updated.sets = 3;
            if (!updated.reps) updated.reps = 10;
          }
        }

        return updated;
      })
    );
  };

  const handleSelectPreset = (presetName: string, category: WorkoutCategory) => {
    // Look for first blank row
    const emptyIdx = exercises.findIndex(e => !e.exercise_name.trim());
    if (emptyIdx >= 0) {
      const targetId = exercises[emptyIdx].id;
      handleUpdateRow(targetId, 'exercise_name', presetName);
      handleUpdateRow(targetId, 'exercise_type', category);
    } else {
      // Append a new exercise row with this preset
      setExercises(prev => [
        ...prev,
        {
          id: `ex_${Date.now()}_${prev.length}`,
          exercise_name: presetName,
          exercise_type: category,
          sets: category === 'strength' ? 3 : (category === 'hiit' ? 4 : 1),
          reps: category === 'strength' ? 10 : 1,
          weight: '',
          duration: category === 'cardio' ? 30 : (category === 'hiit' ? 20 : 15),
          distance: '',
          intervals: '',
          notes: '',
        },
      ]);
    }
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

      const isCardioOrMobility = item.exercise_type === 'cardio' || item.exercise_type === 'mobility';

      return {
        id: `wo_${currentUser.id}_${timestamp}_${idx}`,
        user_id: currentUser.id,
        date: selectedDate,
        exercise_name: item.exercise_name.trim(),
        exercise_type: item.exercise_type || detectExerciseCategory(item.exercise_name) || 'strength',
        sets: isCardioOrMobility ? 1 : Math.max(1, Number(item.sets) || 1),
        reps: isCardioOrMobility ? 1 : Math.max(1, Number(item.reps) || 1),
        weight: item.exercise_type === 'strength' && item.weight && !isNaN(parseFloat(item.weight))
          ? parseFloat(item.weight)
          : undefined,
        weight_unit: 'kg',
        duration: Math.max(1, Number(item.duration) || (isCardioOrMobility ? 30 : 15)),
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
        distance: '',
        intervals: '',
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
              Add multiple exercise types (Strength, Cardio/Walk, HIIT, Mobility) in a single session
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

          {/* Quick-Pick Category Preset Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Browse Presets by Category
              </label>
              <span className="text-[11px] text-zinc-400">Click a preset to add or fill</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'strength' as const, label: 'Strength', icon: Dumbbell },
                { id: 'cardio' as const, label: 'Cardio & Walk', icon: Footprints },
                { id: 'hiit' as const, label: 'HIIT / Circuit', icon: Flame },
                { id: 'mobility' as const, label: 'Mobility', icon: Sparkles },
              ].map(cat => {
                const Icon = cat.icon;
                const isActive = activePresetCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActivePresetCategory(cat.id)}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
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

          {/* Quick-Pick Presets Pills */}
          <div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS[activePresetCategory]?.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleSelectPreset(ex, activePresetCategory)}
                  className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-zinc-400" />
                  <span>{ex}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Exercises List - Each Row has its Own Type Selector! */}
          <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
            {exercises.map((item, index) => {
              const currentType = item.exercise_type || 'strength';

              return (
                <div
                  key={item.id}
                  className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 relative hover:border-zinc-400 dark:hover:border-zinc-600 transition"
                >
                  {/* Row Header: Exercise Number + Row-Level Type Selector + Remove Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] text-zinc-600 dark:text-zinc-400 tabular-nums font-bold">
                        {index + 1}
                      </span>
                      
                      {/* Individual Exercise Type Pill Selector */}
                      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        {[
                          { id: 'strength' as const, label: 'Strength', icon: Dumbbell },
                          { id: 'cardio' as const, label: 'Cardio / Walk', icon: Footprints },
                          { id: 'hiit' as const, label: 'HIIT', icon: Flame },
                          { id: 'mobility' as const, label: 'Mobility', icon: Sparkles },
                        ].map(typeChoice => {
                          const isSelected = currentType === typeChoice.id;
                          return (
                            <button
                              key={typeChoice.id}
                              type="button"
                              onClick={() => handleUpdateRow(item.id, 'exercise_type', typeChoice.id)}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? typeChoice.id === 'cardio'
                                    ? 'bg-sky-500 text-white shadow-sm'
                                    : typeChoice.id === 'hiit'
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : typeChoice.id === 'mobility'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                              }`}
                            >
                              <typeChoice.icon className="w-2.5 h-2.5" />
                              <span>{typeChoice.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(item.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 rounded-md transition cursor-pointer ml-auto"
                        title="Remove this exercise"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Input Fields specifically adapted to THIS row's type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        {currentType === 'cardio' ? 'Cardio / Walking Activity' : currentType === 'hiit' ? 'HIIT / Circuit Drill' : currentType === 'mobility' ? 'Routine / Pose Name' : 'Exercise Name'}
                      </label>
                      <input
                        type="text"
                        value={item.exercise_name}
                        onChange={(e) => handleUpdateRow(item.id, 'exercise_name', e.target.value)}
                        placeholder={
                          currentType === 'cardio'
                            ? 'e.g. Treadmill Walk, Outdoor Jog, Cycling...'
                            : currentType === 'hiit'
                            ? 'e.g. Burpees, Kettlebell Swings...'
                            : currentType === 'mobility'
                            ? 'e.g. Full Body Yoga, Foam Rolling...'
                            : 'e.g. Bench Press, Bicep Curls, Squats...'
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                      />
                    </div>

                    {/* Inputs based on THIS ROW'S TYPE */}
                    {currentType === 'cardio' ? (
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
                            className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Distance (km/mi)</label>
                          <input
                            type="text"
                            value={item.distance || ''}
                            onChange={(e) => handleUpdateRow(item.id, 'distance', e.target.value)}
                            placeholder="e.g. 3.0 km"
                            className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                      </div>
                    ) : currentType === 'hiit' ? (
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
                    ) : currentType === 'mobility' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Duration (mins) *</label>
                          <input
                            type="number"
                            min="1"
                            max="180"
                            placeholder="15"
                            value={item.duration === 0 || !item.duration ? '' : item.duration}
                            onChange={(e) => handleUpdateRow(item.id, 'duration', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Hold / Sets</label>
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
                      /* Strength Fields: Sets, Reps, Weight */
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
                            className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500 font-semibold"
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
                            className="w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Weight (kg)</label>
                          <input
                            type="text"
                            value={item.weight}
                            onChange={(e) => handleUpdateRow(item.id, 'weight', e.target.value)}
                            placeholder="Bodyweight"
                            className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs text-center tabular-nums focus:outline-none focus:border-zinc-500 font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes / Pacing for this row */}
                  <div>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                      placeholder={
                        currentType === 'cardio'
                          ? 'Optional notes e.g. 5.5 km/h incline 3, 130 bpm heart rate...'
                          : currentType === 'hiit'
                          ? 'Optional round notes, target heart rate...'
                          : 'Optional notes e.g. Felt strong on 3rd set, good form...'
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Buttons for Different Categories */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleAddRow('strength')}
              className="flex-1 py-2 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Dumbbell className="w-3.5 h-3.5 text-amber-500" />
              <span>+ Add Strength</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRow('cardio')}
              className="flex-1 py-2 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Footprints className="w-3.5 h-3.5 text-sky-400" />
              <span>+ Add Cardio / Walk</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRow('hiit')}
              className="flex-1 py-2 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>+ Add HIIT</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddRow('mobility')}
              className="flex-1 py-2 px-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Add Mobility</span>
            </button>
          </div>

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
