import React, { useState, useMemo } from 'react';
import type { User, MissedReason, ReasonTag } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AlertCircle, Filter, PieChart as PieIcon } from 'lucide-react';
import { isReasonForUser } from '../utils/userMatcher';

interface ExcuseAnalyticsProps {
  missedReasons: MissedReason[];
  users: User[];
  currentUser: User;
}

const ALL_TAGS: ReasonTag[] = [
  'Tired',
  'Work',
  'Travel',
  'Lazy',
  'Sick',
  'Weather',
  'Sore',
  'Cheat Day',
  'Other',
];

// High-contrast, vibrant palette visible in both Light and Dark modes
const TAG_COLOR_MAP: Record<ReasonTag, string> = {
  Tired: '#6366F1',       // Indigo
  Work: '#3B82F6',        // Blue
  Travel: '#06B6D4',      // Cyan
  Lazy: '#F59E0B',        // Amber
  Sick: '#EF4444',        // Rose/Red
  Weather: '#10B981',     // Emerald
  Sore: '#8B5CF6',        // Violet
  'Cheat Day': '#EC4899',  // Pink
  Other: '#94A3B8',       // Slate
};

const FALLBACK_PALETTE = [
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#94A3B8',
];

export const ExcuseAnalytics: React.FC<ExcuseAnalyticsProps> = ({
  missedReasons = [],
  users = [],
  currentUser,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  // Filter reasons using resilient userMatcher
  const filteredReasons = useMemo(() => {
    return missedReasons.filter(r => {
      if (!r) return false;
      if (selectedUserId === 'all') {
        if (!users || users.length === 0) return true;
        return (
          users.some(u => isReasonForUser(r, u, users)) ||
          users.some(u => u.id === r.user_id) ||
          r.user_id === currentUser.id
        );
      }
      const targetUser = users.find(u => u.id === selectedUserId);
      return (
        isReasonForUser(r, targetUser, users) ||
        r.user_id === selectedUserId
      );
    });
  }, [missedReasons, selectedUserId, users, currentUser]);

  // Aggregate count per reason tag with resilient case-insensitive matching
  const tagCounts = useMemo(() => {
    const counts: Record<ReasonTag, number> = {
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
      const rawTag = (r.reason_tag || '').toString().trim();
      const normalizedRaw = rawTag.toLowerCase().replace(/[-_]/g, ' ');
      const matched = ALL_TAGS.find(
        t => t.toLowerCase().replace(/[-_]/g, ' ') === normalizedRaw
      );
      if (matched) {
        counts[matched]++;
      } else if (rawTag) {
        counts['Other']++;
      }
    });

    return counts;
  }, [filteredReasons]);

  const totalReasons = useMemo(() => {
    return Object.values(tagCounts).reduce((acc, curr) => acc + curr, 0);
  }, [tagCounts]);

  const chartData = useMemo(() => {
    return ALL_TAGS.map(tag => ({
      name: tag,
      value: tagCounts[tag],
      color: TAG_COLOR_MAP[tag] || FALLBACK_PALETTE[0],
    })).filter(d => d.value > 0);
  }, [tagCounts]);

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
            <option value="all" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
              Whole Group
            </option>
            {users.map(u => (
              <option
                key={u.id}
                value={u.id}
                className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {u.name} {u.id === currentUser.id ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Donut Chart Visual */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col items-center justify-center min-w-0">
          <div className="flex items-center justify-between w-full mb-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              Reason Distribution
            </h3>
            {totalReasons > 0 && (
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {totalReasons} {totalReasons === 1 ? 'excuse' : 'excuses'} logged
              </span>
            )}
          </div>

          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center mb-2.5">
                <PieIcon className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
              </div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                No missed goal reasons recorded for this filter!
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px]">
                When members miss a daily target and log a reason, the breakdown will visualize here.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full min-w-0 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={chartData.length > 1 ? 4 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181B',
                      borderColor: '#27272A',
                      borderRadius: '10px',
                      color: '#FAFAFA',
                      fontSize: '12px',
                      fontWeight: 600,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                    }}
                    itemStyle={{ color: '#FAFAFA' }}
                    formatter={(value: any, name: any) => [
                      `${value} (${Math.round((Number(value) / (totalReasons || 1)) * 100)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Donut Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight tabular-nums">
                  {totalReasons}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                  Total
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Breakdown List */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Tag Counts & Reasons
            </h3>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              All 9 standard reasons
            </span>
          </div>

          {ALL_TAGS.map((tag) => {
            const count = tagCounts[tag];
            const percent = totalReasons > 0 ? Math.round((count / totalReasons) * 100) : 0;
            const tagColor = TAG_COLOR_MAP[tag];
            const hasEntries = count > 0;

            return (
              <div key={tag} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold flex items-center gap-2 ${
                    hasEntries
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform shadow-xs"
                      style={{ backgroundColor: tagColor }}
                    />
                    {tag}
                  </span>
                  <span className={`font-mono text-[11px] ${
                    hasEntries
                      ? 'text-zinc-900 dark:text-zinc-100 font-bold'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}>
                    {count} {count === 1 ? 'time' : 'times'} ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700/60">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: tagColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
