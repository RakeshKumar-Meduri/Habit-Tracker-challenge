import React, { useState } from 'react';
import type { User, DailyLog, Workout, WeightLog } from '../types';
import { calculateUserPoints, calculateGoalStreak } from '../utils/gamification';
import { Swords } from 'lucide-react';

interface HeadToHeadProps {
  users: User[];
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs: WeightLog[];
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({
  users,
  dailyLogs,
  workouts,
  weightLogs,
}) => {
  const [userAId, setUserAId] = useState<string>(users[0]?.id || '');
  const [userBId, setUserBId] = useState<string>(users[1]?.id || '');

  if (users.length < 2) {
    return (
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-8 shadow-xl text-center max-w-xl mx-auto my-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#c68b59]/10 border border-[#c68b59]/30 flex items-center justify-center">
          <Swords className="w-6 h-6 text-[#c68b59]" />
        </div>
        <h3 className="text-xl font-black text-[#f5efe6]">Head-to-Head Face-Off</h3>
        <p className="text-xs text-[#c5b4a5] mt-2 leading-relaxed">
          At least 2 registered members are required for a side-by-side comparison. Invite friends or family to register and compete with you!
        </p>
      </div>
    );
  }

  const userA = users.find(u => u.id === userAId) || users[0];
  const userB = users.find(u => u.id === userBId) || users[1];

  const getStats = (user: User) => {
    if (!user) return {
      totalPoints: 0,
      totalGoalsCompleted: 0,
      workoutCount: 0,
      weightLoss: 0,
      gymStreak: 0,
      stepsStreak: 0,
      cleanSweeps: 0,
    };
    const uLogs = dailyLogs.filter(l => l.user_id === user.id);
    const uWorkouts = workouts.filter(w => w.user_id === user.id);
    const uWeights = weightLogs.filter(w => w.user_id === user.id).sort((a, b) => a.date.localeCompare(b.date));

    const totalPoints = calculateUserPoints(dailyLogs, user.id);
    const gymStreak = calculateGoalStreak(dailyLogs, user.id, 'gym');
    const stepsStreak = calculateGoalStreak(dailyLogs, user.id, 'steps');
    
    let weightLoss = 0;
    if (uWeights.length >= 2) {
      weightLoss = parseFloat((uWeights[0].weight - uWeights[uWeights.length - 1].weight).toFixed(1));
    }

    const totalGoalsCompleted = uLogs.reduce((acc, log) => {
      let c = 0;
      if (log.gym_done) c++;
      if (log.steps_done) c++;
      if (log.sleep_done) c++;
      if (log.junk_food_avoided) c++;
      if (log.water_done) c++;
      return acc + c;
    }, 0);

    const cleanSweeps = uLogs.filter(l => l.gym_done && l.steps_done && l.sleep_done && l.junk_food_avoided && l.water_done).length;

    return {
      totalPoints,
      totalGoalsCompleted,
      workoutCount: uWorkouts.length,
      weightLoss,
      gymStreak,
      stepsStreak,
      cleanSweeps,
    };
  };

  const statsA = getStats(userA);
  const statsB = getStats(userB);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
          <Swords className="w-7 h-7 text-cyan-400" />
          Head-to-Head User Face-Off
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Pick any two group members to compare consistency, streaks, and performance metrics side-by-side
        </p>

        {/* User Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mt-6">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <label className="block text-xs font-bold text-slate-400 mb-1">Select Competitor A</label>
            <select
              value={userAId}
              onChange={(e) => setUserAId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-sm px-3 py-2 rounded-lg focus:outline-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} disabled={u.id === userBId}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <label className="block text-xs font-bold text-slate-400 mb-1">Select Competitor B</label>
            <select
              value={userBId}
              onChange={(e) => setUserBId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-sm px-3 py-2 rounded-lg focus:outline-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} disabled={u.id === userAId}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* User A Card */}
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${userA.avatar_color || 'from-emerald-500 to-teal-700'} text-xl font-black text-white flex items-center justify-center shadow-lg`}>
              {userA.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{userA.name}</h3>
              <span className="text-xs text-slate-400">Current Weight: {userA.weight_current} kg</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Total Points:</span>
              <strong className="text-amber-400 font-mono text-sm">{statsA.totalPoints} pts</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Completed Goals:</span>
              <strong className="text-emerald-400 font-mono text-sm">{statsA.totalGoalsCompleted}</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Logged Workouts:</span>
              <strong className="text-cyan-400 font-mono text-sm">{statsA.workoutCount} sessions</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Weight Loss:</span>
              <strong className="text-emerald-400 font-mono text-sm">-{statsA.weightLoss} kg</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Active Gym Streak:</span>
              <strong className="text-white font-mono text-sm">{statsA.gymStreak} days</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Clean Sweeps:</span>
              <strong className="text-amber-400 font-mono text-sm">{statsA.cleanSweeps} days</strong>
            </div>
          </div>
        </div>

        {/* User B Card */}
        <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${userB.avatar_color || 'from-violet-500 to-purple-700'} text-xl font-black text-white flex items-center justify-center shadow-lg`}>
              {userB.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{userB.name}</h3>
              <span className="text-xs text-slate-400">Current Weight: {userB.weight_current} kg</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Total Points:</span>
              <strong className="text-amber-400 font-mono text-sm">{statsB.totalPoints} pts</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Completed Goals:</span>
              <strong className="text-emerald-400 font-mono text-sm">{statsB.totalGoalsCompleted}</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Logged Workouts:</span>
              <strong className="text-cyan-400 font-mono text-sm">{statsB.workoutCount} sessions</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Weight Loss:</span>
              <strong className="text-emerald-400 font-mono text-sm">-{statsB.weightLoss} kg</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Active Gym Streak:</span>
              <strong className="text-white font-mono text-sm">{statsB.gymStreak} days</strong>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 font-semibold">Clean Sweeps:</span>
              <strong className="text-amber-400 font-mono text-sm">{statsB.cleanSweeps} days</strong>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
