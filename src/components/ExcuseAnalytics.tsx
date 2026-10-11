import React, { useState } from 'react';
import type { User, MissedReason, ReasonTag } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AlertCircle, Filter, PieChart as PieIcon } from 'lucide-react';

interface ExcuseAnalyticsProps {
  missedReasons: MissedReason[];
  users: User[];
  currentUser: User;
}

export const ExcuseAnalytics: React.FC<ExcuseAnalyticsProps> = ({
  missedReasons,
  users,
  currentUser,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const filteredReasons = missedReasons.filter(r => {
    if (selectedUserId !== 'all' && r.user_id !== selectedUserId) return false;
    return true;
  });

  // Aggregate count per reason tag
  const tagCounts: Record<ReasonTag, number> = {
    Tired: 0,
    Work: 0,
    Travel: 0,
    Lazy: 0,
    Sick: 0,
    Weather: 0,
    Sore: 0,
    'Cheat Day': 0,
    Other: 0,
  };

  filteredReasons.forEach(r => {
    if (tagCounts[r.reason_tag] !== undefined) {
      tagCounts[r.reason_tag]++;
    }
  });

  const chartData = (Object.keys(tagCounts) as ReasonTag[])
    .map(tag => ({
      name: tag,
      value: tagCounts[tag],
    }))
    .filter(d => d.value > 0);

  const COLORS = ['#09090B', '#27272A', '#3F3F46', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8', '#E4E4E7'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            Excuse Analytics & Reason Breakdown
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Analyze common obstacles preventing members from hitting daily goals
          </p>
        </div>

        {/* Member Selector */}
        <div className="w-full sm:w-auto flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full sm:w-auto bg-transparent text-zinc-900 dark:text-zinc-100 font-bold text-xs focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Whole Group</option>
            {users.map(u => (
              <option key={u.id} value={u.id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                {u.name} {u.id === currentUser.id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Donut Chart Visual */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center justify-center min-w-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
            Reason Distribution
          </h3>

          {chartData.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">
              No missed goal reasons recorded for this filter!
            </div>
          ) : (
            <div className="h-60 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--text)' }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Breakdown List */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-3.5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Tag Counts & Reasons</h3>

          {(Object.keys(tagCounts) as ReasonTag[]).map((tag, idx) => {
            const count = tagCounts[tag];
            const total = filteredReasons.length || 1;
            const percent = Math.round((count / total) * 100);

            return (
              <div key={tag} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    ></span>
                    {tag}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                    {count} {count === 1 ? 'time' : 'times'} ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
