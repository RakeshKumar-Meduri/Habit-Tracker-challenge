import React, { useState } from 'react';
import type { User, DailyLog, WeightLog, GoalType } from '../types';
import { calculateGoalStreak } from '../utils/gamification';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  BarChart3, 
  TrendingDown, 
  Moon, 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Footprints, 
  UtensilsCrossed, 
  Droplets,
  Users,
  Eye,
  RefreshCw
} from 'lucide-react';

interface AnalyticsDashboardProps {
  currentUser: User;
  allUsers?: User[];
  dailyLogs: DailyLog[];
  weightLogs: WeightLog[];
  onRefreshMembers?: () => void;
  isRefreshingMembers?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentUser,
  allUsers,
  dailyLogs,
  weightLogs,
  onRefreshMembers,
  isRefreshingMembers = false,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const targetUser = allUsers?.find(u => u.id === selectedUserId) || currentUser;
  const isViewingOther = targetUser.id !== currentUser.id;

  const [selectedHeatmapGoal, setSelectedHeatmapGoal] = useState<GoalType>('gym');

  // Filter logs for selected user
  const userLogs = dailyLogs
    .filter(log => log.user_id === targetUser.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const userWeightLogs = weightLogs
    .filter(w => w.user_id === targetUser.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Streaks per goal for selected user
  const gymStreak = calculateGoalStreak(dailyLogs, targetUser.id, 'gym');
  const stepStreak = calculateGoalStreak(dailyLogs, targetUser.id, 'steps');
  const sleepStreak = calculateGoalStreak(dailyLogs, targetUser.id, 'sleep');
  const junkStreak = calculateGoalStreak(dailyLogs, targetUser.id, 'junk_food');
  const waterStreak = calculateGoalStreak(dailyLogs, targetUser.id, 'water');

  // 7-day completion data
  const last7Logs = userLogs.slice(-7);
  const weeklyBarData = last7Logs.map(log => {
    let completed = 0;
    if (log.gym_done) completed++;
    if (log.steps_done) completed++;
    if (log.sleep_done) completed++;
    if (log.junk_food_avoided) completed++;
    if (log.water_done) completed++;
    return {
      date: log.date.slice(5),
      completed,
      percent: Math.round((completed / 5) * 100),
    };
  });

  // Sleep duration chart data
  const last14Logs = userLogs.slice(-14);
  const sleepChartData = last14Logs.map(log => ({
    date: log.date.slice(5),
    duration: log.sleep_duration || 0,
    hitTarget: log.sleep_done,
  }));

  // Weight trend chart data
  const weightChartData = userWeightLogs.map(w => ({
    date: w.date.slice(5),
    weight: w.weight,
  }));

  // Heatmap tile grid data (last 30 days)
  const last30Logs = userLogs.slice(-30);

  const getHeatmapColor = (log: DailyLog) => {
    let done = false;
    if (selectedHeatmapGoal === 'gym') done = log.gym_done;
    if (selectedHeatmapGoal === 'steps') done = log.steps_done;
    if (selectedHeatmapGoal === 'sleep') done = log.sleep_done;
    if (selectedHeatmapGoal === 'junk_food') done = log.junk_food_avoided;
    if (selectedHeatmapGoal === 'water') done = log.water_done;

    return done
      ? 'bg-[#D98B4A] border-[#D98B4A] text-[#1B1B20] shadow-sm font-bold'
      : 'bg-[#1B1B20] border-[#26262C] text-[#A1A1AA] hover:bg-[#1B1B20]';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      
      {/* Member Accountability Selector - ALWAYS VISIBLE */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D98B4A]/20 text-[#E69A5C] border border-[#D98B4A]/30 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F4F4F5] flex items-center gap-2">
              Member Analytics Inspector
              {isViewingOther && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/60 font-semibold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Inspecting {targetUser.name}
                </span>
              )}
            </h3>
            <p className="text-xs text-[#A1A1AA]">Inspect your own or your teammates' habit streaks, sleep, and weight trends</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-[#A1A1AA] shrink-0">Member:</span>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 sm:flex-initial sm:w-auto min-h-[44px] sm:min-h-[38px] bg-[#1B1B20] text-[#F4F4F5] font-bold text-xs border border-[#26262C] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D98B4A] cursor-pointer"
          >
            {allUsers && allUsers.length > 0 ? (
              allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id === currentUser.id ? `👤 You (${u.name})` : `👥 ${u.name} (@${u.username})`}
                </option>
              ))
            ) : (
              <option value={currentUser.id}>👤 You ({currentUser.name})</option>
            )}
          </select>
          {onRefreshMembers && (
            <button
              type="button"
              onClick={onRefreshMembers}
              disabled={isRefreshingMembers}
              title="Sync members from server"
              className="min-h-[44px] sm:min-h-[38px] px-3 py-2 bg-[#1B1B20] hover:bg-[#26262C] text-[#D98B4A] rounded-xl border border-[#26262C] transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
            </button>
          )}
          {isViewingOther && (
            <button
              type="button"
              onClick={() => setSelectedUserId(currentUser.id)}
              className="min-h-[44px] sm:min-h-[38px] px-2.5 py-2 bg-[#D98B4A]/20 hover:bg-[#D98B4A]/30 text-[#E69A5C] text-xs font-bold rounded-xl border border-[#D98B4A]/30 transition shrink-0 cursor-pointer"
            >
              Reset to Me
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl">
        <h2 className="text-lg sm:text-xl font-black text-[#F4F4F5] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#D98B4A]" />
          {isViewingOther ? `${targetUser.name}'s Health & Habit Analytics` : 'Personal Health Analytics Dashboard'}
        </h2>
        <p className="text-xs text-[#A1A1AA] mt-1">
          {isViewingOther
            ? `Inspecting ${targetUser.name}'s consistency, sleep records, and progress metrics.`
            : 'Visualizing your progress across weight trends, sleep targets, and goal consistency'}
        </p>
      </div>

      {/* Streak Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A] mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#A1A1AA] block truncate">Gym Streak</span>
          <strong className="text-base sm:text-xl font-black text-[#F4F4F5]">{gymStreak} days</strong>
        </div>
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <Footprints className="w-4 h-4 sm:w-5 sm:h-5 text-[#E69A5C] mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#A1A1AA] block truncate">Step Streak</span>
          <strong className="text-base sm:text-xl font-black text-[#F4F4F5]">{stepStreak} days</strong>
        </div>
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A] mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#A1A1AA] block truncate">Sleep Target</span>
          <strong className="text-base sm:text-xl font-black text-[#F4F4F5]">{sleepStreak} days</strong>
        </div>
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center">
          <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-[#E69A5C] mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#A1A1AA] block truncate">No Junk Food</span>
          <strong className="text-base sm:text-xl font-black text-[#F4F4F5]">{junkStreak} days</strong>
        </div>
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
          <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A] mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#A1A1AA] block truncate">Water Target</span>
          <strong className="text-base sm:text-xl font-black text-[#F4F4F5]">{waterStreak} days</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Weight Trend Area Chart */}
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A]" />
                Weight Trend Over Time
              </h3>
              <p className="text-xs text-[#A1A1AA]">Recorded weight entries (kg)</p>
            </div>
            {weightChartData.length >= 2 && (
              <span className="self-start sm:self-auto text-xs font-bold text-[#E69A5C] bg-[#D98B4A]/15 px-2.5 py-1 rounded-full border border-[#D98B4A]/30">
                -{(weightChartData[0].weight - weightChartData[weightChartData.length - 1].weight).toFixed(1)} kg lost
              </span>
            )}
          </div>

          <div className="h-60 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightChartData}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D98B4A" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#D98B4A" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262C" />
                <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#A1A1AA" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B20', borderColor: '#26262C', borderRadius: '12px', color: '#F4F4F5' }}
                  labelStyle={{ color: '#E69A5C', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#D98B4A" strokeWidth={3} fillOpacity={1} fill="url(#weightGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sleep Duration Bar Chart */}
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A]" />
                Nightly Sleep Duration (7–8h Target)
              </h3>
              <p className="text-xs text-[#A1A1AA]">Beige = target hit (7-8.5 hrs)</p>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262C" />
                <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11} />
                <YAxis domain={[0, 10]} stroke="#A1A1AA" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B20', borderColor: '#26262C', borderRadius: '12px', color: '#F4F4F5' }}
                  labelStyle={{ color: '#E69A5C', fontWeight: 'bold' }}
                />
                <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                  {sleepChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hitTarget ? '#D98B4A' : '#26262C'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Completion % Bar Chart */}
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] mb-1">7-Day Completion Rate (%)</h3>
          <p className="text-xs text-[#A1A1AA] mb-4">Daily percentage of core goals completed</p>

          <div className="h-52 sm:h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26262C" />
                <XAxis dataKey="date" stroke="#A1A1AA" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#A1A1AA" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1B1B20', borderColor: '#26262C', borderRadius: '12px', color: '#F4F4F5' }}
                  labelStyle={{ color: '#E69A5C', fontWeight: 'bold' }}
                />
                <Bar dataKey="percent" fill="#E69A5C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calendar Heatmap Grid */}
        <div className="bg-[#131316] border border-[#26262C] rounded-xl p-4 sm:p-6 shadow-xl min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#F4F4F5] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98B4A]" />
                30-Day Activity Heatmap
              </h3>
              <p className="text-xs text-[#A1A1AA]">Goal completion grid</p>
            </div>

            {/* Goal Selector */}
            <select
              value={selectedHeatmapGoal}
              onChange={(e) => setSelectedHeatmapGoal(e.target.value as GoalType)}
              className="w-full sm:w-auto bg-[#1B1B20] border border-[#26262C] text-[#F4F4F5] text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#D98B4A] cursor-pointer"
            >
              <option value="gym">Gym Goal</option>
              <option value="steps">Steps Goal</option>
              <option value="sleep">Sleep Target</option>
              <option value="junk_food">No Junk Food</option>
              <option value="water">Water Target</option>
            </select>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 pt-2">
            {last30Logs.map((log) => (
              <div
                key={log.id}
                title={`${log.date}: ${selectedHeatmapGoal.toUpperCase()}`}
                className={`h-7 sm:h-8 rounded-lg border transition-transform hover:scale-105 flex items-center justify-center text-[10px] font-mono ${getHeatmapColor(log)}`}
              >
                {log.date.slice(8)}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-5 sm:mt-6 text-xs text-[#A1A1AA]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1B1B20] border border-[#26262C] inline-block"></span> Not Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#D98B4A] inline-block"></span> Goal Completed
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
