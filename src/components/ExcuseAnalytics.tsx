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

  const COLORS = ['#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444', '#64748b'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            Excuse Analytics & Reason Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze common obstacles preventing members from hitting daily goals
          </p>
        </div>

        {/* Member Selector */}
        <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700">
          <Filter className="w-4 h-4 text-amber-400" />
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-slate-900">Whole Group</option>
            {users.map(u => (
              <option key={u.id} value={u.id} className="bg-slate-900">
                {u.name} {u.id === currentUser.id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Donut Chart Visual */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-cyan-400" />
            Reason Distribution
          </h3>

          {chartData.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No missed goal reasons recorded for this filter!
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Breakdown List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white mb-2">Tag Counts & Reasons</h3>

          {(Object.keys(tagCounts) as ReasonTag[]).map((tag, idx) => {
            const count = tagCounts[tag];
            const total = filteredReasons.length || 1;
            const percent = Math.round((count / total) * 100);

            return (
              <div key={tag} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    ></span>
                    {tag}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {count} times ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
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
