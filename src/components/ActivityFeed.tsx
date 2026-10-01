import React from 'react';
import type { User, DailyLog, Workout, WeightLog, Reaction } from '../types';
import { MessageSquare, Dumbbell, Sparkles, Scale } from 'lucide-react';

interface ActivityFeedProps {
  users: User[];
  dailyLogs: DailyLog[];
  workouts: Workout[];
  weightLogs?: WeightLog[];
  reactions?: Reaction[];
  onAddReaction?: (targetId: string, targetType: 'daily_log' | 'workout', emoji: string) => void;
  currentUser: User;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  users,
  dailyLogs,
  workouts,
  weightLogs = [],
  reactions = [],
  onAddReaction,
  currentUser,
}) => {
  const getUser = (userId: string) => users.find(u => u.id === userId);

  // Combine workouts, daily completion, and weight log updates into a clean feed
  const feedItems: Array<{
    id: string;
    type: 'workout' | 'clean_sweep' | 'weight_change';
    userId: string;
    date: string;
    title: string;
    subtitle: string;
  }> = [];

  workouts.forEach(w => {
    if (!w.is_private || w.user_id === currentUser.id) {
      feedItems.push({
        id: w.id,
        type: 'workout',
        userId: w.user_id,
        date: w.date,
        title: `Logged Workout: ${w.exercise_name}`,
        subtitle: `${w.sets} sets × ${w.reps} reps ${w.weight ? '@ ' + w.weight + 'kg' : ''} (${w.duration} mins)`,
      });
    }
  });

  dailyLogs.forEach(l => {
    if (l.gym_done && l.steps_done && l.sleep_done && l.junk_food_avoided && l.water_done) {
      feedItems.push({
        id: l.id,
        type: 'clean_sweep',
        userId: l.user_id,
        date: l.date,
        title: `Completed 5/5 Full-Day Goals`,
        subtitle: `Met target for Gym, Steps, Sleep, Clean Diet, and Hydration`,
      });
    }
  });

  // Calculate weight changes per user to announce publicly
  users.forEach(u => {
    if (!u.is_private || u.id === currentUser.id) {
      const uLogs = weightLogs.filter(w => w.user_id === u.id).sort((a, b) => b.date.localeCompare(a.date));
      if (uLogs.length >= 2) {
        const latest = uLogs[0];
        const previous = uLogs[1];
        const diff = parseFloat((latest.weight - previous.weight).toFixed(1));
        if (diff !== 0) {
          const changeText = diff < 0 ? `lost ${Math.abs(diff)} kg` : `gained ${diff} kg`;
          feedItems.push({
            id: `w_announce_${latest.id}`,
            type: 'weight_change',
            userId: u.id,
            date: latest.date,
            title: `Body Weight Update: ${latest.weight} kg`,
            subtitle: `Public announcement: ${u.name} ${changeText} (Previous: ${previous.weight} kg)`,
          });
        }
      }
    }
  });

  // Sort descending by date
  feedItems.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 max-w-3xl mx-auto font-sans">
      
      {/* Header */}
      <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-6 shadow-xl">
        <h2 className="text-xl font-black text-[#f5efe6] flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#c68b59]" />
          Group Activity & Announcements
        </h2>
        <p className="text-xs text-[#c5b4a5] mt-1">
          Chronological timeline of workout sessions, full-day completions, and public weight updates.
        </p>
      </div>

      {/* Feed List */}
      <div className="space-y-3.5 sm:space-y-4">
        {feedItems.length === 0 ? (
          <div className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-6 text-center text-xs text-[#c5b4a5]">
            No activity logged yet.
          </div>
        ) : (
          feedItems.slice(0, 15).map(item => {
            const user = getUser(item.userId);

            return (
              <div
                key={item.id}
                className="bg-[#26201b] border border-[#3d322a] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c68b59] to-[#785338] text-sm font-black text-[#f5efe6] flex items-center justify-center shadow-md shrink-0">
                      {user?.name.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#f5efe6] flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="truncate">{user?.name}</span>
                        {item.type === 'clean_sweep' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c68b59]/20 text-[#d4a373] font-bold border border-[#c68b59]/30 shrink-0">
                            FULL SWEEP
                          </span>
                        )}
                        {item.type === 'weight_change' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#322a24] text-[#c5b4a5] font-bold border border-[#3d322a] shrink-0">
                            WEIGHT LOG
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-[#c5b4a5]">{item.date}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-[#1c1815] text-[#c68b59] border border-[#3d322a] shrink-0 ml-2">
                    {item.type === 'clean_sweep' && <Sparkles className="w-5 h-5" />}
                    {item.type === 'workout' && <Dumbbell className="w-5 h-5" />}
                    {item.type === 'weight_change' && <Scale className="w-5 h-5" />}
                  </div>
                </div>

                {/* Content Box */}
                <div className="bg-[#1c1815] p-3 sm:p-3.5 rounded-xl border border-[#3d322a]">
                  <h5 className="text-sm font-bold text-[#f5efe6]">{item.title}</h5>
                  <p className="text-xs text-[#c5b4a5] mt-0.5">{item.subtitle}</p>
                </div>

                {/* Real-Time Reactions */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 border-t border-[#3d322a]/50">
                  {['🔥', '💪', '👏', '🎯'].map(emoji => {
                    const count = reactions.filter(r => r.target_id === item.id && r.emoji === emoji).length;
                    const hasReacted = reactions.some(r => r.target_id === item.id && r.emoji === emoji && r.from_user_id === currentUser.id);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onAddReaction?.(item.id, item.type === 'workout' ? 'workout' : 'daily_log', emoji)}
                        className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer border ${
                          hasReacted 
                            ? 'bg-[#c68b59]/20 border-[#c68b59]/50 text-[#f5efe6]' 
                            : 'bg-[#1c1815] border-[#3d322a] text-[#c5b4a5] hover:text-[#f5efe6] hover:bg-[#322a24]'
                        }`}
                        title={`React with ${emoji}`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="text-[10px] font-bold text-[#d4a373]">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
