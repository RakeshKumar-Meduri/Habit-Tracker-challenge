import { useState, useEffect, useRef } from 'react';
import type { 
  User, 
  DailyLog, 
  Workout, 
  WeightLog, 
  MissedReason, 
  Reaction, 
  Badge, 
  WeeklyChallenge, 
  AdminSettings,
  Supplement,
  SupplementLog,
  CustomHabit,
  CustomHabitLog,
  Group,
  Invite
} from './types';
import { 
  initializeStorageIfEmpty, 
  saveStateToStorage, 
  saveWorkoutsDirectly, 
  deleteWorkoutDirectly, 
  clearAllWorkoutsDirectly, 
  STORAGE_KEYS, 
  getTodayDateString, 
  DEFAULT_ADMIN_SETTINGS 
} from './utils/storage';
import { evaluateBadges } from './utils/gamification';
import { exportUserDataToCSV } from './utils/csvExport';
import { logoutSession } from './services/authService';
import { 
  fetchServerSync, 
  fetchServerUsers,
  pushDailyLogToServer, 
  pushWorkoutsToServer,
  deleteUserOnServer,
  updateUserOnServer,
  pushWeightLogToServer,
  pushMissedReasonToServer,
  pushReactionToServer,
  pushBadgesToServer,
  pushSupplementToServer,
  deleteSupplementOnServer,
  pushSupplementLogToServer,
  pushCustomHabitToServer,
  deleteCustomHabitOnServer,
  pushCustomHabitLogToServer,
  deleteWorkoutOnServer,
  clearAllWorkoutsOnServer,
  deleteMissedReasonOnServer,
  createGroupInvite,
  revokeInvite,
  leaveGroup,
  removeGroupMember,
  updateGroupSettings
} from './services/apiService';
import { realtimeClient } from './services/realtimeService';

import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DailyChecklist } from './components/DailyChecklist';
import { CalendarView } from './components/CalendarView';
import { WorkoutModal } from './components/WorkoutModal';
import { WorkoutHistory } from './components/WorkoutHistory';
import { ProfileSection } from './components/ProfileSection';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { Leaderboard } from './components/Leaderboard';
import { HeadToHead } from './components/HeadToHead';
import { ActivityFeed } from './components/ActivityFeed';
import { ExcuseAnalytics } from './components/ExcuseAnalytics';
import { GamificationSection } from './components/GamificationSection';
import { WeeklyRecapModal } from './components/WeeklyRecapModal';
import { InviteModal } from './components/InviteModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { Trophy, Swords, Award } from 'lucide-react';

export function App() {
  // Ref that always holds the latest users to avoid stale closure issues in sync callbacks
  const usersRef = useRef<User[]>([]);
  // Synchronous lazy state initialization from storage to prevent empty-state wipes
  const [initialData] = useState(() => initializeStorageIfEmpty());

  const [users, setUsers] = useState<User[]>(() => initialData.users);
  usersRef.current = users; // Keep ref in sync with latest state
  const [currentUserId, setCurrentUserId] = useState<string>(() => initialData.currentUserId);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => initialData.dailyLogs);
  const [workouts, setWorkouts] = useState<Workout[]>(() => initialData.workouts);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => initialData.weightLogs);
  const [missedReasons, setMissedReasons] = useState<MissedReason[]>(() => initialData.missedReasons);
  const [reactions, setReactions] = useState<Reaction[]>(() => initialData.reactions);
  const [badges, setBadges] = useState<Badge[]>(() => initialData.badges);
  const [challenge] = useState<WeeklyChallenge>(() => {
    const ch = initialData.challenge || {
      id: 'c_1', title: 'Group Clean Sweep Challenge', description: 'Complete daily goal targets together', target_type: 'total_goals', target_count: 150, current_count: 0, start_date: '', end_date: ''
    };
    return { ...ch, current_count: 0 };
  });
  const [adminSettings] = useState<AdminSettings>(() => initialData.adminSettings || DEFAULT_ADMIN_SETTINGS);

  // Supplements state
  const [supplements, setSupplements] = useState<Supplement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUPPLEMENTS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUPPLEMENT_LOGS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Custom Private Habits state
  const [customHabits, setCustomHabits] = useState<CustomHabit[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_HABITS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [customHabitLogs, setCustomHabitLogs] = useState<CustomHabitLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_HABIT_LOGS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const supplementsRef = useRef<Supplement[]>([]);
  supplementsRef.current = supplements;
  const customHabitsRef = useRef<CustomHabit[]>([]);
  customHabitsRef.current = customHabits;
  const pushedSupplementIdsRef = useRef<Set<string>>(new Set());
  const pushedHabitIdsRef = useRef<Set<string>>(new Set());

  // Tombstones for deleted supplements and habits to permanently prevent resurrection
  const [deletedSupplementIds, setDeletedSupplementIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pulse_deleted_supplement_ids');
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });
  const deletedSupplementIdsRef = useRef<Set<string>>(deletedSupplementIds);
  deletedSupplementIdsRef.current = deletedSupplementIds;

  const [deletedHabitIds, setDeletedHabitIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pulse_deleted_habit_ids');
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set();
  });
  const deletedHabitIdsRef = useRef<Set<string>>(deletedHabitIds);
  deletedHabitIdsRef.current = deletedHabitIds;

  useEffect(() => {
    try {
      localStorage.setItem('pulse_deleted_supplement_ids', JSON.stringify(Array.from(deletedSupplementIds)));
    } catch {}
  }, [deletedSupplementIds]);

  useEffect(() => {
    try {
      localStorage.setItem('pulse_deleted_habit_ids', JSON.stringify(Array.from(deletedHabitIds)));
    } catch {}
  }, [deletedHabitIds]);

  const [activeTab, setActiveTab] = useState<string>('checklist');
  const [planTier, setPlanTier] = useState<'none' | 'base' | 'pro'>('base');
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [highlightProInModal, setHighlightProInModal] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pulse_fitness_theme');
      if (saved) return saved === 'dark';
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pulse_fitness_theme', isDarkMode ? 'dark' : 'light');
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark', 'dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark', 'dark-theme');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark', 'dark-theme');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark', 'dark-theme');
      document.body.setAttribute('data-theme', 'light');
    }
  }, [isDarkMode]);

  const [realtimeStatus, setRealtimeStatus] = useState<{ isConnected: boolean; clientCount: number }>({
    isConnected: false,
    clientCount: 1,
  });

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState<boolean>(false);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState<boolean>(false);

  // Group & Invites state
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [myRole, setMyRole] = useState<'owner' | 'member'>('member');
  const [groupInvites, setGroupInvites] = useState<Invite[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);

  // Detect /join/:token on mount and popstate
  useEffect(() => {
    const checkJoinUrl = () => {
      if (typeof window === 'undefined') return;
      const match = window.location.pathname.match(/^\/join\/([^/?#]+)/);
      if (match && match[1]) {
        const token = match[1].trim();
        setJoinToken(token);
        setIsJoinModalOpen(true);
        try {
          sessionStorage.setItem('pulse_invite_token', token);
        } catch {}
      }
    };

    checkJoinUrl();
    window.addEventListener('popstate', checkJoinUrl);
    return () => {
      window.removeEventListener('popstate', checkJoinUrl);
    };
  }, []);

  // Guard to prevent initial mount from overwriting storage with default values
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  // Helper to apply incoming server data without losing state
  const applyServerData = (serverData: any) => {
    if (!serverData) return;

    if (serverData.group) {
      setCurrentGroup(serverData.group);
    }
    if (serverData.myRole) {
      setMyRole(serverData.myRole);
    }
    if (Array.isArray(serverData.invites)) {
      setGroupInvites(serverData.invites);
    }

    if (Array.isArray(serverData.users)) {
      const cleanServerUsers = serverData.users.filter(
        (u: any) => u && u.is_active !== false
      );

      // The server is the absolute source of truth for users: replace, don't resurrect deleted local users
      setUsers(cleanServerUsers);

      setCurrentUserId(currId => {
        if (currId && cleanServerUsers.length > 0) {
          const found = cleanServerUsers.find((u: any) => u.id === currId);
          if (!found || found.is_active === false) {
            logoutSession();
            return '';
          }
        }
        return currId;
      });
    }

    if (Array.isArray(serverData.dailyLogs)) {
      setDailyLogs(prev => {
        const isSeedLog = (l: any) => !l || !l.user_id ||
          l.id === 'cmuuvhlqk0005pxawp6f80dg9' ||
          (l.steps_value === 11200 && l.points_earned === 50) ||
          (l.user_id === 'usr_seed_rakesh' && l.steps_value === 11200);

        const map = new Map(
          prev
            .filter(l => !isSeedLog(l))
            .map(l => [`${l.user_id}_${l.date}`, l])
        );
        serverData.dailyLogs.forEach((l: any) => {
          if (isSeedLog(l)) return;
          const key = `${l.user_id}_${l.date}`;
          const existing = map.get(key);
          map.set(key, existing ? { ...existing, ...l } : l);
        });
        return Array.from(map.values()).filter(l => !isSeedLog(l));
      });
    }
    if (Array.isArray(serverData.workouts)) {
      const tombstoneSet = new Set<string>();
      if (Array.isArray(serverData.deletedWorkoutIds)) {
        serverData.deletedWorkoutIds.forEach((id: string) => tombstoneSet.add(String(id).trim()));
      }
      try {
        const localTombstones = JSON.parse(localStorage.getItem('pulse_fitness_deleted_workout_ids') || '[]');
        if (Array.isArray(localTombstones)) {
          localTombstones.forEach(id => tombstoneSet.add(String(id).trim()));
        }
        localStorage.setItem('pulse_fitness_deleted_workout_ids', JSON.stringify(Array.from(tombstoneSet)));
      } catch {}

      const cleanServerWorkouts = serverData.workouts.filter(
        (w: any) => {
          if (!w) return false;
          const wid = String(w.id || w._id || '').trim();
          if (!wid || tombstoneSet.has(wid)) return false;
          if (w.id === 'w_rakesh_1' || w.id === 'w_rakesh_2' || w.id === 'w_seed_bench') return false;
          return true;
        }
      );
      setWorkouts(cleanServerWorkouts);
      saveWorkoutsDirectly(cleanServerWorkouts);
    }
    if (Array.isArray(serverData.weightLogs)) {
      setWeightLogs(prev => {
        const map = new Map(prev.map(w => [w.id, w]));
        serverData.weightLogs.forEach((w: any) => {
          // Always upsert: server data should overwrite local stale entries
          const existing = map.get(w.id);
          map.set(w.id, existing ? { ...existing, ...w } : w);
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.missedReasons)) {
      setMissedReasons(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        serverData.missedReasons.forEach((m: any) => {
          map.set(m.id, m);
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.reactions)) {
      setReactions(serverData.reactions);
    }
    if (Array.isArray(serverData.badges)) {
      setBadges(serverData.badges);
    }
    if (Array.isArray(serverData.supplements)) {
      setSupplements(prev => {
        const tombstones = deletedSupplementIdsRef.current;
        const validServerSupps = serverData.supplements.filter((s: any) => s && s.id && !tombstones.has(s.id));
        const pendingOptimistic = prev.filter(p => pushedSupplementIdsRef.current.has(p.id) && !tombstones.has(p.id));

        const map = new Map<string, Supplement>();
        validServerSupps.forEach((s: any) => map.set(s.id, s));
        pendingOptimistic.forEach((s: any) => { if (!map.has(s.id)) map.set(s.id, s); });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.supplementLogs)) {
      setSupplementLogs(prev => {
        const tombstones = deletedSupplementIdsRef.current;
        const map = new Map(prev.filter(l => !tombstones.has(l.supplement_id)).map(l => [l.id, l]));
        serverData.supplementLogs.forEach((s: any) => {
          if (!tombstones.has(s.supplement_id)) {
            map.set(s.id, s);
          }
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.customHabits)) {
      setCustomHabits(prev => {
        const tombstones = deletedHabitIdsRef.current;
        const validServerHabits = serverData.customHabits.filter((h: any) => h && h.id && !tombstones.has(h.id));
        const pendingOptimistic = prev.filter(p => pushedHabitIdsRef.current.has(p.id) && !tombstones.has(p.id));

        const map = new Map<string, CustomHabit>();
        validServerHabits.forEach((h: any) => map.set(h.id, h));
        pendingOptimistic.forEach((h: any) => { if (!map.has(h.id)) map.set(h.id, h); });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.customHabitLogs)) {
      setCustomHabitLogs(prev => {
        const tombstones = deletedHabitIdsRef.current;
        const map = new Map(prev.filter(l => !tombstones.has(l.habit_id)).map(l => [l.id, l]));
        serverData.customHabitLogs.forEach((l: any) => {
          if (!tombstones.has(l.habit_id)) {
            map.set(l.id, l);
          }
        });
        return Array.from(map.values());
      });
    }

    if (serverData.planTier) {
      setPlanTier(serverData.planTier);
    }
    if (serverData.subscription !== undefined) {
      setActiveSubscription(serverData.subscription);
    }

    // Auto-discover unknown members who have logs/workouts but are not yet in local users list
    // Use usersRef.current to avoid stale closure — `users` from the outer scope is stale in periodic sync & WS callbacks
    const knownUserIds = new Set([
      ...(Array.isArray(serverData.users) ? serverData.users.map((u: any) => u.id) : []),
      ...usersRef.current.map(u => u.id)
    ]);
    const unknownUserIds = new Set<string>();

    if (Array.isArray(serverData.dailyLogs)) {
      serverData.dailyLogs.forEach((l: any) => {
        if (l && l.user_id && !knownUserIds.has(l.user_id)) {
          unknownUserIds.add(l.user_id);
        }
      });
    }
    if (Array.isArray(serverData.workouts)) {
      serverData.workouts.forEach((w: any) => {
        if (w && w.user_id && !knownUserIds.has(w.user_id)) {
          unknownUserIds.add(w.user_id);
        }
      });
    }

    if (unknownUserIds.size > 0) {
      fetchServerUsers().then(freshUsers => {
        if (freshUsers && freshUsers.length > 0) {
          setUsers(prev => {
            const map = new Map(prev.map(u => [u.id, u]));
            freshUsers.forEach(u => map.set(u.id, u));
            return Array.from(map.values());
          });
        }
      }).catch(() => {});
    }
  };

  // Keep a ref to the latest applyServerData so useEffect callbacks with [] deps always call the fresh version
  const applyServerDataRef = useRef(applyServerData);
  applyServerDataRef.current = applyServerData;

  // Real-Time WebSockets Engine Listener & Background HTTP Sync
  useEffect(() => {
    let isCancelled = false;

    // 1. Initial HTTP Fetch for fast hydration
    const initialSync = async () => {
      const data = await fetchServerSync();
      if (!isCancelled && data) {
        applyServerDataRef.current(data);
      }
    };
    initialSync();

    // 2. Subscribe to Real-Time WebSocket Events
    const unsubStatus = realtimeClient.onStatusChange((status) => {
      if (!isCancelled) {
        setRealtimeStatus(status);
      }
    });

    // Ensure presence is announced on connection or when user active
    realtimeClient.identify(currentUserId || null);

    const unsubEvents = realtimeClient.subscribe((msg) => {
      if (isCancelled) return;

      switch (msg.type) {
        case 'USER_REGISTERED':
        case 'USER_UPDATED': {
          const user = msg.payload as User;
          if (user && user.id) {
            setUsers(prev => {
              const map = new Map(prev.map(u => [u.id, u]));
              map.set(user.id, user);
              return Array.from(map.values());
            });
          }
          break;
        }

        case 'USER_DELETED': {
          const { userId } = msg.payload || {};
          if (userId) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            setDailyLogs(prev => prev.filter(l => l.user_id !== userId));
            setWorkouts(prev => prev.filter(w => w.user_id !== userId));
            setWeightLogs(prev => prev.filter(w => w.user_id !== userId));
            try {
              const raw = localStorage.getItem(STORAGE_KEYS.USERS);
              if (raw) {
                const list = JSON.parse(raw);
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list.filter((u: any) => u.id !== userId)));
              }
            } catch {}
            if (currentUserId === userId) {
              logoutSession();
              setCurrentUserId('');
            }
          }
          break;
        }

        case 'DAILY_LOG_UPDATED': {
          const log = msg.payload as DailyLog;
          if (log && log.user_id && log.date) {
            setDailyLogs(prev => {
              const map = new Map(prev.map(l => [`${l.user_id}_${l.date}`, l]));
              map.set(`${log.user_id}_${log.date}`, log);
              return Array.from(map.values());
            });
            // If the user who created this log is not yet in users, fetch fresh members immediately!
            setUsers(prev => {
              if (!prev.some(u => u.id === log.user_id)) {
                fetchServerUsers().then(freshUsers => {
                  if (freshUsers && freshUsers.length > 0) {
                    setUsers(p => {
                      const m = new Map(p.map(u => [u.id, u]));
                      freshUsers.forEach(u => m.set(u.id, u));
                      return Array.from(m.values());
                    });
                  }
                }).catch(() => {});
              }
              return prev;
            });
          }
          break;
        }

        case 'WORKOUTS_ADDED': {
          const incoming = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
          const localTombstones = new Set<string>();
          try {
            const raw = JSON.parse(localStorage.getItem('pulse_fitness_deleted_workout_ids') || '[]');
            if (Array.isArray(raw)) raw.forEach(id => localTombstones.add(String(id).trim()));
          } catch {}
          setWorkouts(prev => {
            const map = new Map(prev.map(w => [String(w.id).trim(), w]));
            incoming.forEach(w => {
              const wid = String(w?.id || '').trim();
              if (wid && !localTombstones.has(wid)) {
                map.set(wid, w);
              }
            });
            const updated = Array.from(map.values());
            saveWorkoutsDirectly(updated);
            return updated;
          });
          break;
        }

        case 'WORKOUT_DELETED': {
          const { id } = msg.payload || {};
          if (id) {
            const targetId = String(id).trim();
            deleteWorkoutDirectly(targetId);
            setWorkouts(prev => {
              const updated = prev.filter(w => String(w.id).trim() !== targetId);
              saveWorkoutsDirectly(updated);
              return updated;
            });
          }
          break;
        }

        case 'WORKOUTS_CLEARED': {
          clearAllWorkoutsDirectly();
          setWorkouts([]);
          break;
        }

        case 'WEIGHT_LOG_ADDED': {
          const wl = msg.payload as WeightLog;
          if (wl && wl.id) {
            setWeightLogs(prev => {
              const map = new Map(prev.map(w => [w.id, w]));
              map.set(wl.id, wl);
              return Array.from(map.values());
            });
            setUsers(prev => prev.map(u => u.id === wl.user_id ? { ...u, weight_current: wl.weight } : u));
          }
          break;
        }

        case 'MISSED_REASON_ADDED': {
          const r = msg.payload as MissedReason;
          if (r && r.id) {
            setMissedReasons(prev => {
              const map = new Map(prev.map(x => [x.id, x]));
              map.set(r.id, r);
              return Array.from(map.values());
            });
          }
          break;
        }

        case 'MISSED_REASON_DELETED': {
          const { id } = msg.payload || {};
          if (id) {
            setMissedReasons(prev => prev.filter(x => x.id !== id));
          }
          break;
        }

        case 'REACTION_ADDED': {
          const rx = msg.payload as Reaction;
          if (rx && rx.id) {
            setReactions(prev => {
              const map = new Map(prev.map(x => [x.id, x]));
              map.set(rx.id, rx);
              return Array.from(map.values());
            });
          }
          break;
        }

        case 'BADGES_UPDATED': {
          const bList = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
          setBadges(prev => {
            const map = new Map(prev.map(b => [b.id, b]));
            bList.forEach(b => { if (b && b.id) map.set(b.id, b); });
            return Array.from(map.values());
          });
          break;
        }

        case 'SUPPLEMENT_ADDED': {
          const s = msg.payload as Supplement;
          if (s && s.id) {
            setSupplements(prev => [...prev.filter(x => x.id !== s.id), s]);
          }
          break;
        }

        case 'SUPPLEMENT_DELETED': {
          const { id } = msg.payload || {};
          if (id) {
            deletedSupplementIdsRef.current.add(id);
            setDeletedSupplementIds(prev => new Set([...prev, id]));
            setSupplements(prev => prev.filter(x => x.id !== id));
            setSupplementLogs(prev => prev.filter(l => l.supplement_id !== id));
          }
          break;
        }

        case 'SUPPLEMENT_LOG_UPDATED': {
          const slog = msg.payload as SupplementLog;
          if (slog && slog.id) {
            setSupplementLogs(prev => {
              const map = new Map(prev.map(l => [l.id, l]));
              map.set(slog.id, slog);
              return Array.from(map.values());
            });
          }
          break;
        }

        case 'CUSTOM_HABIT_ADDED': {
          const h = msg.payload as CustomHabit;
          if (h && h.id && !deletedHabitIdsRef.current.has(h.id)) {
            setCustomHabits(prev => [...prev.filter(x => x.id !== h.id), h]);
          }
          break;
        }

        case 'CUSTOM_HABIT_DELETED': {
          const { id } = msg.payload || {};
          if (id) {
            deletedHabitIdsRef.current.add(id);
            setDeletedHabitIds(prev => new Set([...prev, id]));
            setCustomHabits(prev => prev.filter(x => x.id !== id));
            setCustomHabitLogs(prev => prev.filter(l => l.habit_id !== id));
          }
          break;
        }

        case 'CUSTOM_HABIT_LOG_UPDATED': {
          const hlog = msg.payload as CustomHabitLog;
          if (hlog && hlog.id) {
            setCustomHabitLogs(prev => {
              const map = new Map(prev.map(l => [l.id, l]));
              map.set(hlog.id, hlog);
              return Array.from(map.values());
            });
          }
          break;
        }

        case 'MEMBER_JOINED':
        case 'MEMBER_LEFT':
        case 'MEMBER_REMOVED':
        case 'GROUP_UPDATED': {
          fetchServerSync().then(data => {
            if (data) applyServerDataRef.current(data);
          }).catch(() => {});
          break;
        }

        case 'INVITE_CREATED': {
          const inv = msg.payload as Invite;
          if (inv && inv.token) {
            setGroupInvites(prev => [...prev.filter(i => i.token !== inv.token), inv]);
          }
          break;
        }

        case 'INVITE_REVOKED': {
          const { token } = msg.payload || {};
          if (token) {
            setGroupInvites(prev => prev.filter(i => i.token !== token));
          }
          break;
        }

        case 'FULL_SYNC': {
          if (msg.payload) {
            applyServerDataRef.current(msg.payload);
          }
          break;
        }
      }
    });

    // 3. Fallback Periodic Reconciliation (every 20s)
    const interval = setInterval(async () => {
      const data = await fetchServerSync();
      if (!isCancelled && data) {
        applyServerDataRef.current(data);
      }
    }, 20000);

    return () => {
      isCancelled = true;
      unsubStatus();
      unsubEvents();
      clearInterval(interval);
    };
  }, []);

  // Re-sync immediately on iOS mobile wake, tab focus, network reconnect
  useEffect(() => {
    const handleWakeSync = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const data = await fetchServerSync();
        if (data) {
          applyServerDataRef.current(data);
        }
        const freshUsers = await fetchServerUsers();
        if (freshUsers && freshUsers.length > 0) {
          setUsers(prev => {
            const map = new Map(freshUsers.map(u => [u.id, u]));
            prev.forEach(pu => { if (!map.has(pu.id)) map.set(pu.id, pu); });
            return Array.from(map.values());
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleWakeSync);
    window.addEventListener('focus', handleWakeSync);
    window.addEventListener('online', handleWakeSync);
    window.addEventListener('pageshow', handleWakeSync);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeSync);
      window.removeEventListener('focus', handleWakeSync);
      window.removeEventListener('online', handleWakeSync);
      window.removeEventListener('pageshow', handleWakeSync);
    };
  }, []);

  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);

  const handleRefreshMembers = async () => {
    setIsRefreshingMembers(true);
    try {
      const data = await fetchServerSync();
      if (data) {
        applyServerDataRef.current(data);
      }
      const freshUsers = await fetchServerUsers();
      if (freshUsers && freshUsers.length > 0) {
        setUsers(prev => {
          const map = new Map(freshUsers.map(u => [u.id, u]));
          prev.forEach(pu => { if (!map.has(pu.id)) map.set(pu.id, pu); });
          return Array.from(map.values());
        });
      }
    } finally {
      setIsRefreshingMembers(false);
    }
  };

  // Sync state changes to local storage safely
  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.USERS, users);
    }
  }, [users]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    }
    realtimeClient.identify(currentUserId || null);
  }, [currentUserId]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.DAILY_LOGS, dailyLogs);
    }
  }, [dailyLogs]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.WORKOUTS, workouts);
    }
  }, [workouts]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.WEIGHT_LOGS, weightLogs);
    }
  }, [weightLogs]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.MISSED_REASONS, missedReasons);
    }
  }, [missedReasons]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.REACTIONS, reactions);
    }
  }, [reactions]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.BADGES, badges);
    }
  }, [badges]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.SUPPLEMENTS, supplements);
    }
  }, [supplements]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.SUPPLEMENT_LOGS, supplementLogs);
    }
  }, [supplementLogs]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.CUSTOM_HABITS, customHabits);
    }
  }, [customHabits]);

  useEffect(() => {
    if (isMountedRef.current) {
      saveStateToStorage(STORAGE_KEYS.CUSTOM_HABIT_LOGS, customHabitLogs);
    }
  }, [customHabitLogs]);

  const currentUser = users.find(u => u.id === currentUserId && u.is_active !== false) || null;
  const activeUsers = users.filter(u => u.is_active !== false);
  const isModeratorOrVip = !!currentUser && (
    currentUser.role === 'admin' ||
    currentUser.role === 'moderator' ||
    currentUser.username?.toLowerCase() === 'rakesh' ||
    currentUser.username?.toLowerCase() === 'hitesh'
  );
  const effectivePlanTier: 'none' | 'base' | 'pro' = isModeratorOrVip ? 'pro' : planTier;

  // Toggle Dark/Light Theme
  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Find or create daily log for selected date
  const getOrCreateDailyLog = (): DailyLog => {
    if (!currentUser) return {
      id: '', user_id: '', date: selectedDate, gym_done: false, steps_done: false, sleep_done: false, junk_food_avoided: false, water_done: false
    };

    const existing = dailyLogs.find(l => l.user_id === currentUser.id && l.date === selectedDate);
    if (existing) return existing;

    const newLog: DailyLog = {
      id: `dl_${currentUser.id}_${selectedDate}`,
      user_id: currentUser.id,
      date: selectedDate,
      gym_done: false,
      steps_done: false,
      sleep_done: false,
      junk_food_avoided: false,
      water_done: false,
      water_intake_ml: 0,
      sleep_start: '23:00',
      sleep_end: '07:00',
      sleep_duration: 8.0,
      points_earned: 0,
    };

    return newLog;
  };

  // Update Daily Log
  const handleUpdateDailyLog = (updatedLog: DailyLog) => {
    // Automatically recompute points_earned based on 10 pts per goal + partial points for steps
    let isSunday = false;
    if (updatedLog.date) {
      const [y, m, d] = updatedLog.date.split('-').map(Number);
      isSunday = new Date(y, m - 1, d).getDay() === 0;
    }

    const groupTarget = currentGroup?.step_target || adminSettings?.step_target || 10000;
    const stepsVal = updatedLog.steps_value || 0;
    const isStepsHit = updatedLog.steps_done || stepsVal >= groupTarget;

    // Partial points for steps (up to 10 points proportional to group target)
    const stepPoints = isStepsHit 
      ? 10 
      : Math.min(10, Math.round((stepsVal / groupTarget) * 100) / 10);

    let otherPoints = 0;
    if (updatedLog.gym_done || (isSunday && updatedLog.gym_done !== false)) otherPoints += 10;
    if (updatedLog.sleep_done) otherPoints += 10;
    if (updatedLog.junk_food_avoided) otherPoints += 10;
    if (updatedLog.water_done) otherPoints += 10;

    const totalPointsEarned = Math.round((otherPoints + stepPoints) * 10) / 10;

    const logToSave: DailyLog = {
      ...updatedLog,
      steps_done: isStepsHit,
      steps_target: groupTarget,
      points_earned: totalPointsEarned,
    };

    let newLogs: DailyLog[] = [];
    setDailyLogs(prev => {
      const idx = prev.findIndex(l => l.id === logToSave.id || (l.user_id === logToSave.user_id && l.date === logToSave.date));
      if (idx >= 0) {
        newLogs = [...prev];
        newLogs[idx] = { ...prev[idx], ...logToSave };
      } else {
        newLogs = [...prev, logToSave];
      }
      return newLogs;
    });
    pushDailyLogToServer(logToSave);

    // Evaluate Badges
    if (currentUser) {
      const updatedBadges = evaluateBadges(currentUser, newLogs, workouts, weightLogs, badges);
      if (updatedBadges.length > badges.length) {
        setBadges(updatedBadges);
        pushBadgesToServer(updatedBadges);
      }
    }
  };

  // Save Missed Reason
  const handleSaveMissedReason = (newReason: MissedReason) => {
    setMissedReasons(prev => [...prev.filter(r => r.id !== newReason.id), newReason]);
    pushMissedReasonToServer(newReason);
  };

  // Remove Missed Reason (Undo "Failed" status)
  const handleRemoveMissedReason = (reasonId: string) => {
    setMissedReasons(prev => prev.filter(r => r.id !== reasonId));
    deleteMissedReasonOnServer(reasonId);
  };

  // Save Multiple Workouts / Routine
  const handleSaveWorkouts = (newWorkouts: Workout[]) => {
    if (newWorkouts.length === 0) return;
    const targetDate = newWorkouts[0].date;
    const isGymFailed = missedReasons.some(
      r => r.goal_type === 'gym' && r.user_id === currentUser?.id && r.date === targetDate
    );
    if (isGymFailed) {
      alert(`Cannot log workout: The gym routine for ${targetDate} is marked as Failed. Please remove the Failed status in the Daily Checklist first.`);
      return;
    }

    setWorkouts(prev => {
      const merged = [...newWorkouts, ...prev.filter(w => !newWorkouts.some(nw => nw.id === w.id))];
      saveWorkoutsDirectly(merged);
      return merged;
    });
    pushWorkoutsToServer(newWorkouts);
    
    // Auto-mark gym goal as done for that date
    if (currentUser) {
      const targetLog = dailyLogs.find(l => l.user_id === currentUser.id && l.date === targetDate) || {
        id: `dl_${currentUser.id}_${targetDate}`,
        user_id: currentUser.id,
        date: targetDate,
        gym_done: false,
        steps_done: false,
        sleep_done: false,
        junk_food_avoided: false,
        water_done: false,
        water_intake_ml: 0,
        sleep_start: '23:00',
        sleep_end: '07:00',
        sleep_duration: 8.0,
        points_earned: 0,
      };
      if (!targetLog.gym_done) {
        handleUpdateDailyLog({ ...targetLog, gym_done: true });
      }
    }
  };

  // Delete Logged Workout
  const handleDeleteWorkout = async (workoutId: string) => {
    const idStr = String(workoutId).trim();
    if (!idStr) return;

    // 1. Immediately record in local tombstones so subsequent syncs or rerenders never resurrect it
    deleteWorkoutDirectly(idStr);

    const targetWorkout = workouts.find(w => String(w.id || (w as any)._id || '').trim() === idStr);

    let updatedWorkouts: Workout[] = [];
    setWorkouts(prev => {
      updatedWorkouts = prev.filter(w => String(w.id || (w as any)._id || '').trim() !== idStr);
      saveWorkoutsDirectly(updatedWorkouts);
      return updatedWorkouts;
    });

    // If no workouts remain for this date and user, auto-reset gym_done: false
    if (targetWorkout && targetWorkout.date && targetWorkout.user_id) {
      const remainingOnDate = updatedWorkouts.filter(
        w => w.user_id === targetWorkout.user_id && w.date === targetWorkout.date
      );
      if (remainingOnDate.length === 0) {
        const existingLog = dailyLogs.find(
          l => l.user_id === targetWorkout.user_id && l.date === targetWorkout.date
        );
        if (existingLog && existingLog.gym_done) {
          handleUpdateDailyLog({ ...existingLog, gym_done: false });
        }
      }
    }

    // 2. Await backend deletion
    const success = await deleteWorkoutOnServer(idStr);
    if (!success) {
      console.error(`[PULSE] Failed to delete workout ${idStr} on server.`);
    }
  };

  // Group Management Handlers
  const handleCreateInvite = async (options: { expiresInDays?: number; maxUses?: number }) => {
    if (effectivePlanTier !== 'pro') {
      setHighlightProInModal(true);
      setIsSubscriptionModalOpen(true);
      return { success: false, error: 'Group invitations are exclusively available on the PULSE Pro Plan.' };
    }
    if (!currentGroup) return { success: false, error: 'No active group found' };
    const res = await createGroupInvite(currentGroup.id, options);
    if (res.success) {
      const data = await fetchServerSync();
      if (data) applyServerDataRef.current(data);
    }
    return res;
  };

  const handleRevokeInvite = async (token: string) => {
    const res = await revokeInvite(token);
    if (res.success) {
      setGroupInvites(prev => prev.filter(i => i.token !== token));
      try {
        const data = await fetchServerSync();
        if (data) applyServerDataRef.current(data);
      } catch {}
      return true;
    } else {
      alert(res.error || 'Failed to revoke invite link');
      return false;
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentGroup) return;
    const res = await leaveGroup(currentGroup.id);
    if (res.success) {
      const data = await fetchServerSync();
      if (data) applyServerDataRef.current(data);
    } else {
      alert(res.error || 'Failed to leave group');
    }
  };

  const handleRemoveGroupMember = async (userId: string) => {
    if (!currentGroup) return;
    const res = await removeGroupMember(currentGroup.id, userId);
    if (res.success) {
      const data = await fetchServerSync();
      if (data) applyServerDataRef.current(data);
    } else {
      alert(res.error || 'Failed to remove member');
    }
  };

  const handleUpdateGroup = async (groupId: string, data: { name?: string; step_target?: number }): Promise<boolean> => {
    const res = await updateGroupSettings(groupId, data);
    if (res.success && res.group) {
      setCurrentGroup(res.group);
      const syncData = await fetchServerSync();
      if (syncData) applyServerDataRef.current(syncData);
      return true;
    } else {
      alert(res.error || 'Failed to update group settings');
      return false;
    }
  };

  const handleJoinSuccess = async (group: Group) => {
    setCurrentGroup(group);
    const data = await fetchServerSync();
    if (data) applyServerDataRef.current(data);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Clear Current User's Workouts
  const handleClearAllWorkouts = async () => {
    if (!currentUser) return;
    setWorkouts(prev => prev.filter(w => w.user_id !== currentUser.id));
    await clearAllWorkoutsOnServer();
    setDailyLogs(prev => prev.map(l => {
      if (l.user_id === currentUser.id && l.gym_done) {
        const isSunday = l.date ? new Date(l.date).getDay() === 0 : false;
        let core = 0;
        if (isSunday) core += 1;
        if (l.steps_done) core += 1;
        if (l.sleep_done) core += 1;
        if (l.junk_food_avoided) core += 1;
        if (l.water_done) core += 1;
        const updated = { ...l, gym_done: false, points_earned: core * 10 };
        pushDailyLogToServer(updated);
        return updated;
      }
      return l;
    }));
  };

  // Update User Profile & Weight Log
  const handleUpdateProfile = (updatedUser: User, newWeightEntry?: WeightLog) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    updateUserOnServer(updatedUser);

    if (newWeightEntry) {
      setWeightLogs(prev => [...prev.filter(w => w.id !== newWeightEntry.id), newWeightEntry]);
      pushWeightLogToServer(newWeightEntry);
    }
  };

  // Delete Current User Account
  const handleDeleteAccount = async (userId: string) => {
    try {
      const success = await deleteUserOnServer(userId);
      if (!success) {
        alert('Failed to delete account on server. Please check your network connection and try again.');
        return;
      }
      logoutSession();
      setUsers(prev => prev.filter(u => u.id !== userId));
      setCurrentUserId('');
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.USERS);
        if (raw) {
          const list = JSON.parse(raw);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list.filter((u: any) => u.id !== userId)));
        }
      } catch {}
    } catch {
      alert('An error occurred while deleting your account. Please try again.');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    logoutSession();
    setCurrentUserId('');
    realtimeClient.identify(null);
  };

  // Emoji Reaction Handler
  const handleAddReaction = (targetId: string, targetType: 'daily_log' | 'workout', emoji: string) => {
    if (!currentUser) return;
    const newReaction: Reaction = {
      id: `rx_${currentUser.id}_${targetId}_${emoji}_${Date.now()}`,
      from_user_id: currentUser.id,
      target_id: targetId,
      target_type: targetType,
      emoji,
      created_at: new Date().toISOString(),
    };
    setReactions(prev => [
      ...prev.filter(r => !(r.from_user_id === currentUser.id && r.target_id === targetId && r.emoji === emoji)),
      newReaction,
    ]);
    pushReactionToServer(newReaction);
  };

  // Supplement Handlers
  const handleAddSupplement = (newSupp: Supplement) => {
    pushedSupplementIdsRef.current.add(newSupp.id);
    setSupplements(prev => [...prev.filter(s => s.id !== newSupp.id), newSupp]);
    pushSupplementToServer(newSupp);
  };

  const handleDeleteSupplement = (suppId: string) => {
    // Locate target supplement to identify its name and user
    const target = supplements.find(s => s.id === suppId);
    const targetName = target ? target.name.trim().toLowerCase() : null;
    const targetUserId = target ? target.user_id : currentUserId;

    // Collect all matching IDs (target ID + any duplicate clones with the same name for this user)
    const removedIds = new Set<string>([suppId]);
    if (targetName) {
      supplements.forEach(s => {
        if (s.user_id === targetUserId && s.name.trim().toLowerCase() === targetName) {
          removedIds.add(s.id);
        }
      });
    }

    // Record into tombstones so neither periodic sync nor local storage can ever resurrect them
    removedIds.forEach(id => {
      deletedSupplementIdsRef.current.add(id);
      pushedSupplementIdsRef.current.delete(id);
    });
    setDeletedSupplementIds(prev => new Set([...prev, ...removedIds]));

    // Clean state immediately
    setSupplements(prev => prev.filter(s => !removedIds.has(s.id)));
    setSupplementLogs(prev => prev.filter(l => !removedIds.has(l.supplement_id)));

    // Send delete request to server
    deleteSupplementOnServer(suppId);
  };

  const handleToggleSupplementLog = (suppId: string, date: string, taken: boolean) => {
    const existing = supplementLogs.find(l => l.supplement_id === suppId && l.date === date && l.user_id === currentUserId);
    const updatedLog: SupplementLog = existing 
      ? { ...existing, taken }
      : {
          id: `slog_${suppId}_${date}_${Date.now()}`,
          user_id: currentUserId,
          supplement_id: suppId,
          date,
          taken,
        };
    setSupplementLogs(prev => [...prev.filter(l => l.id !== updatedLog.id), updatedLog]);
    pushSupplementLogToServer(updatedLog);
  };

  // Custom Habit Handlers
  const handleAddCustomHabit = (newHabit: CustomHabit) => {
    pushedHabitIdsRef.current.add(newHabit.id);
    setCustomHabits(prev => [...prev.filter(h => h.id !== newHabit.id), newHabit]);
    pushCustomHabitToServer(newHabit);
  };

  const handleDeleteCustomHabit = (habitId: string) => {
    const target = customHabits.find(h => h.id === habitId);
    const targetTitle = target ? target.title.trim().toLowerCase() : null;
    const targetUserId = target ? target.user_id : currentUserId;

    const removedIds = new Set<string>([habitId]);
    if (targetTitle) {
      customHabits.forEach(h => {
        if (h.user_id === targetUserId && h.title.trim().toLowerCase() === targetTitle) {
          removedIds.add(h.id);
        }
      });
    }

    removedIds.forEach(id => {
      deletedHabitIdsRef.current.add(id);
      pushedHabitIdsRef.current.delete(id);
    });
    setDeletedHabitIds(prev => new Set([...prev, ...removedIds]));

    setCustomHabits(prev => prev.filter(h => !removedIds.has(h.id)));
    setCustomHabitLogs(prev => prev.filter(l => !removedIds.has(l.habit_id)));

    deleteCustomHabitOnServer(habitId);
  };

  const handleToggleCustomHabitLog = (habitId: string, date: string, completed: boolean) => {
    const existing = customHabitLogs.find(l => l.habit_id === habitId && l.date === date && l.user_id === currentUserId);
    const updatedLog: CustomHabitLog = existing
      ? { ...existing, completed }
      : {
          id: `hlog_${habitId}_${date}_${Date.now()}`,
          user_id: currentUserId,
          habit_id: habitId,
          date,
          completed,
        };
    setCustomHabitLogs(prev => [...prev.filter(l => l.id !== updatedLog.id), updatedLog]);
    pushCustomHabitLogToServer(updatedLog);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (currentUser) {
      exportUserDataToCSV(currentUser, dailyLogs, workouts, weightLogs, missedReasons);
    }
  };

  const currentDailyLog = getOrCreateDailyLog();
  const currentGymWorkoutsCount = workouts.filter(w => w.user_id === currentUser?.id && w.date === selectedDate).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans selection:bg-[#D98B4A] selection:text-[#0B0B0D]">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        currentGroup={currentGroup}
        allUsers={activeUsers}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenRecap={() => setIsRecapModalOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenAuth={() => handleOpenAuth('login')}
        onLogout={handleLogout}
        onOpenInviteModal={() => {
          if (effectivePlanTier !== 'pro') {
            setHighlightProInModal(true);
            setIsSubscriptionModalOpen(true);
          } else {
            setIsInviteModalOpen(true);
          }
        }}
        realtimeStatus={realtimeStatus}
        onRefreshMembers={handleRefreshMembers}
        isRefreshingMembers={isRefreshingMembers}
        planTier={effectivePlanTier}
        onOpenUpgradeModal={() => {
          setHighlightProInModal(effectivePlanTier === 'base');
          setIsSubscriptionModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
        
        {/* Tab 1: Checklist */}
        {activeTab === 'checklist' && currentUser && (
          <DailyChecklist
            currentUser={currentUser}
            allUsers={activeUsers}
            allDailyLogs={dailyLogs}
            allWorkouts={workouts}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dailyLog={currentDailyLog}
            currentGroup={currentGroup}
            missedReasons={missedReasons}
            adminSettings={adminSettings}
            supplements={supplements}
            supplementLogs={supplementLogs}
            customHabits={customHabits}
            customHabitLogs={customHabitLogs}
            onUpdateDailyLog={handleUpdateDailyLog}
            onSaveMissedReason={handleSaveMissedReason}
            onRemoveMissedReason={handleRemoveMissedReason}
            onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
            gymWorkoutsCount={currentGymWorkoutsCount}
            onDeleteWorkout={handleDeleteWorkout}
            onAddSupplement={handleAddSupplement}
            onDeleteSupplement={handleDeleteSupplement}
            onToggleSupplementLog={handleToggleSupplementLog}
            onAddCustomHabit={handleAddCustomHabit}
            onDeleteCustomHabit={handleDeleteCustomHabit}
            onToggleCustomHabitLog={handleToggleCustomHabitLog}
            onOpenCalendar={() => setActiveTab('calendar')}
            onRefreshMembers={handleRefreshMembers}
            isRefreshingMembers={isRefreshingMembers}
            isBasePlan={effectivePlanTier !== 'pro'}
            onOpenUpgradeModal={() => {
              setHighlightProInModal(true);
              setIsSubscriptionModalOpen(true);
            }}
          />
        )}

        {/* Tab: Activity Calendar */}
        {activeTab === 'calendar' && currentUser && (
          <CalendarView
            currentUser={currentUser}
            allUsers={activeUsers}
            dailyLogs={dailyLogs}
            workouts={workouts}
            weightLogs={weightLogs}
            missedReasons={missedReasons}
            supplements={supplements}
            supplementLogs={supplementLogs}
            customHabits={customHabits}
            customHabitLogs={customHabitLogs}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
            onNavigateToChecklist={(date) => {
              setSelectedDate(date);
              setActiveTab('checklist');
            }}
            onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
            onDeleteWorkout={handleDeleteWorkout}
            onRefreshMembers={handleRefreshMembers}
            isRefreshingMembers={isRefreshingMembers}
          />
        )}

        {/* Tab 2: Workouts */}
        {activeTab === 'workouts' && currentUser && (
          <WorkoutHistory
            workouts={workouts}
            users={activeUsers}
            currentUser={currentUser}
            missedReasons={missedReasons}
            selectedDate={selectedDate}
            onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
            onDeleteWorkout={handleDeleteWorkout}
            onClearAllWorkouts={handleClearAllWorkouts}
          />
        )}

        {/* Tab 3: Personal Analytics */}
        {activeTab === 'analytics' && currentUser && (
          <AnalyticsDashboard
            currentUser={currentUser}
            allUsers={activeUsers}
            dailyLogs={dailyLogs}
            weightLogs={weightLogs}
            onRefreshMembers={handleRefreshMembers}
            isRefreshingMembers={isRefreshingMembers}
          />
        )}

        {/* Mobile Sub-Navigation for Community Views (Rankings / H2H / Badges) */}
        {(activeTab === 'leaderboard' || activeTab === 'comparison' || activeTab === 'badges') && currentUser && (
          <div className="md:hidden flex items-center p-1 bg-[#131316] border border-[#26262C] rounded-xl mb-4 shadow-sm">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                activeTab === 'leaderboard'
                  ? 'bg-[#D98B4A] text-[#0B0B0D] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Rankings</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                activeTab === 'comparison'
                  ? 'bg-[#D98B4A] text-[#0B0B0D] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Head-to-Head</span>
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                activeTab === 'badges'
                  ? 'bg-[#D98B4A] text-[#0B0B0D] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Badges</span>
            </button>
          </div>
        )}

        {/* Tab 4: Leaderboard & Feed */}
        {activeTab === 'leaderboard' && currentUser && (
          <div className="space-y-10">
            <Leaderboard
              users={activeUsers}
              dailyLogs={dailyLogs}
              currentUser={currentUser}
              isBasePlan={effectivePlanTier !== 'pro'}
              onOpenUpgradeModal={() => {
                setHighlightProInModal(true);
                setIsSubscriptionModalOpen(true);
              }}
            />

            {effectivePlanTier === 'pro' && (
              <>
                <ActivityFeed
                  users={activeUsers}
                  dailyLogs={dailyLogs}
                  workouts={workouts}
                  weightLogs={weightLogs}
                  reactions={reactions}
                  onAddReaction={handleAddReaction}
                  currentUser={currentUser}
                />

                <ExcuseAnalytics
                  missedReasons={missedReasons}
                  users={activeUsers}
                  currentUser={currentUser}
                />
              </>
            )}
          </div>
        )}

        {/* Tab 5: Head-to-Head Comparison */}
        {activeTab === 'comparison' && currentUser && (
          <HeadToHead
            users={activeUsers}
            dailyLogs={dailyLogs}
            workouts={workouts}
            weightLogs={weightLogs}
            onRefreshMembers={handleRefreshMembers}
            isRefreshingMembers={isRefreshingMembers}
            isBasePlan={effectivePlanTier !== 'pro'}
            onOpenUpgradeModal={() => {
              setHighlightProInModal(true);
              setIsSubscriptionModalOpen(true);
            }}
          />
        )}

        {/* Tab 6: Badges & Gamification */}
        {activeTab === 'badges' && currentUser && (
          <GamificationSection
            currentUser={currentUser}
            badges={badges}
            challenge={challenge}
            dailyLogs={dailyLogs}
            isBasePlan={effectivePlanTier !== 'pro'}
            onOpenUpgradeModal={() => {
              setHighlightProInModal(true);
              setIsSubscriptionModalOpen(true);
            }}
          />
        )}

        {/* Tab 7: Profile */}
        {activeTab === 'profile' && currentUser && (
          <ProfileSection
            currentUser={currentUser}
            allUsers={activeUsers}
            currentGroup={currentGroup}
            myRole={myRole}
            invites={groupInvites}
            weightLogs={weightLogs}
            onUpdateProfile={handleUpdateProfile}
            onDeleteAccount={handleDeleteAccount}
            onRefreshMembers={handleRefreshMembers}
            isRefreshingMembers={isRefreshingMembers}
            onOpenInviteModal={() => {
              if (effectivePlanTier !== 'pro') {
                setHighlightProInModal(true);
                setIsSubscriptionModalOpen(true);
              } else {
                setIsInviteModalOpen(true);
              }
            }}
            onLeaveGroup={handleLeaveGroup}
            onRemoveGroupMember={handleRemoveGroupMember}
            onRevokeInvite={handleRevokeInvite}
            onUpdateGroup={handleUpdateGroup}
            planTier={effectivePlanTier}
            activeSubscription={activeSubscription}
            onOpenUpgradeModal={(highlightPro) => {
              setHighlightProInModal(!!highlightPro);
              setIsSubscriptionModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Mandatory Auth Screen / Modal */}
      {(!currentUser || isAuthModalOpen) && (
        <AuthModal
          isOpen={true}
          isMandatory={!currentUser}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          users={users}
          onLoginSuccess={(user) => {
            setUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
            setCurrentUserId(user.id);
            setIsAuthModalOpen(false);
            fetchServerSync().then(data => {
              if (data) applyServerDataRef.current(data);
            }).catch(() => {});
          }}
          onRegisterSuccess={(newUser) => {
            setUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
            setCurrentUserId(newUser.id);
            setIsAuthModalOpen(false);
            fetchServerSync().then(data => {
              if (data) applyServerDataRef.current(data);
            }).catch(() => {});
          }}
        />
      )}

      {/* Group Invite Creation & Management Modal */}
      {currentUser && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          group={currentGroup}
          myRole={myRole}
          invites={groupInvites}
          onCreateInvite={handleCreateInvite}
          onRevokeInvite={handleRevokeInvite}
          isBasePlan={effectivePlanTier !== 'pro'}
          onOpenUpgradeModal={() => {
            setIsInviteModalOpen(false);
            setHighlightProInModal(true);
            setIsSubscriptionModalOpen(true);
          }}
        />
      )}

      {/* Join Group Landing Modal */}
      {isJoinModalOpen && joinToken && (
        <JoinGroupModal
          isOpen={isJoinModalOpen}
          token={joinToken}
          onClose={() => {
            setIsJoinModalOpen(false);
            setJoinToken(null);
          }}
          currentUser={currentUser}
          onOpenAuth={(mode) => handleOpenAuth(mode || 'register')}
          onJoinSuccess={handleJoinSuccess}
        />
      )}

      {currentUser && (
        <WorkoutModal
          isOpen={isWorkoutModalOpen}
          onClose={() => setIsWorkoutModalOpen(false)}
          currentUser={currentUser}
          selectedDate={selectedDate}
          missedReasons={missedReasons}
          onSaveWorkouts={handleSaveWorkouts}
        />
      )}

      {currentUser && (
        <WeeklyRecapModal
          isOpen={isRecapModalOpen}
          onClose={() => setIsRecapModalOpen(false)}
          currentUser={currentUser}
          dailyLogs={dailyLogs}
          workouts={workouts}
          weightLogs={weightLogs}
        />
      )}

      {/* Subscription & Paywall Modal */}
      {currentUser && (
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen || planTier === 'none'}
          onClose={() => setIsSubscriptionModalOpen(false)}
          currentUser={currentUser}
          currentTier={planTier}
          activeSubscription={activeSubscription}
          forcePaywall={planTier === 'none'}
          highlightPro={highlightProInModal}
          onSubscriptionSuccess={(sub) => {
            setActiveSubscription(sub);
            setPlanTier(sub.plan_id?.includes('pro') ? 'pro' : 'base');
            handleRefreshMembers();
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#26262C] bg-[#131316] py-6 pb-24 md:pb-6 text-center text-xs text-[#A1A1AA]">
        <p>PULSE Fitness & Daily Goal Tracker — Real-Time Multi-User Edition</p>
      </footer>
    </div>
  );
}

export default App;
