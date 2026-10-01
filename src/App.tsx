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
  CustomHabitLog
} from './types';
import { initializeStorageIfEmpty, saveStateToStorage, STORAGE_KEYS, getTodayDateString, DEFAULT_ADMIN_SETTINGS } from './utils/storage';
import { evaluateBadges } from './utils/gamification';
import { exportUserDataToCSV } from './utils/csvExport';
import { logoutSession } from './services/authService';
import { 
  fetchServerSync, 
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
import { Trophy, Swords, Award } from 'lucide-react';

export function App() {
  // Synchronous lazy state initialization from storage to prevent empty-state wipes
  const [initialData] = useState(() => initializeStorageIfEmpty());

  const [users, setUsers] = useState<User[]>(() => initialData.users);
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

  const [activeTab, setActiveTab] = useState<string>('checklist');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [realtimeStatus, setRealtimeStatus] = useState<{ isConnected: boolean; clientCount: number }>({
    isConnected: false,
    clientCount: 1,
  });

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState<boolean>(false);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState<boolean>(false);

  // Guard to prevent initial mount from overwriting storage with default values
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
  }, []);

  // Helper to apply incoming server data without losing state
  const applyServerData = (serverData: any) => {
    if (!serverData) return;

    if (Array.isArray(serverData.users)) {
      const cleanServerUsers = serverData.users.filter(
        (u: any) => u.username !== 'testuser123' && u.id !== 'user_1790589874177_elgx' && u.username !== 'testuser2' && u.id !== 'user_1790824958946_sy7b' && u.username !== 'tester1' && !u.username.startsWith('test')
      );

      // Merge server users with existing local users so locally registered users are NEVER wiped
      setUsers(prev => {
        const serverUserMap = new Map(cleanServerUsers.map((u: User) => [u.id, u]));
        const merged = [...cleanServerUsers];
        prev.forEach(pu => {
          if (pu.username !== 'testuser2' && pu.id !== 'user_1790824958946_sy7b' && pu.username !== 'tester1' && !pu.username.startsWith('test')) {
            if (!serverUserMap.has(pu.id) && !merged.some(m => m.username.toLowerCase() === pu.username.toLowerCase())) {
              merged.push(pu);
            }
          }
        });
        return merged;
      });

      setCurrentUserId(currId => {
        if (currId && cleanServerUsers.length > 0) {
          const found = cleanServerUsers.find((u: any) => u.id === currId);
          if (found && found.is_active === false) {
            logoutSession();
            return '';
          }
        }
        return currId;
      });
    }

    if (Array.isArray(serverData.dailyLogs)) {
      setDailyLogs(prev => {
        const map = new Map(prev.filter(l => l.user_id !== 'user_1790824958946_sy7b').map(l => [`${l.user_id}_${l.date}`, l]));
        serverData.dailyLogs.forEach((l: any) => {
          if (l.user_id !== 'user_1790824958946_sy7b') {
            const key = `${l.user_id}_${l.date}`;
            const existing = map.get(key);
            map.set(key, existing ? { ...existing, ...l } : l);
          }
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.workouts)) {
      const cleanServerWorkouts = serverData.workouts.filter(
        (w: any) => w.user_id !== 'user_1790824958946_sy7b' && w.id !== 'w_rakesh_1' && w.id !== 'w_rakesh_2'
      );
      setWorkouts(cleanServerWorkouts);
    }
    if (Array.isArray(serverData.weightLogs)) {
      setWeightLogs(prev => {
        const map = new Map(prev.filter(w => w.user_id !== 'user_1790824958946_sy7b').map(w => [w.id, w]));
        serverData.weightLogs.forEach((w: any) => {
          if (w.user_id !== 'user_1790824958946_sy7b' && !map.has(w.id)) {
            map.set(w.id, w);
          }
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
        const map = new Map(prev.map(s => [s.id, s]));
        serverData.supplements.forEach((s: any) => {
          map.set(s.id, s);
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.supplementLogs)) {
      setSupplementLogs(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        serverData.supplementLogs.forEach((s: any) => {
          map.set(s.id, s);
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.customHabits)) {
      setCustomHabits(prev => {
        const map = new Map(prev.map(h => [h.id, h]));
        serverData.customHabits.forEach((h: any) => {
          map.set(h.id, h);
        });
        return Array.from(map.values());
      });
    }
    if (Array.isArray(serverData.customHabitLogs)) {
      setCustomHabitLogs(prev => {
        const map = new Map(prev.map(l => [l.id, l]));
        serverData.customHabitLogs.forEach((l: any) => {
          map.set(l.id, l);
        });
        return Array.from(map.values());
      });
    }
  };

  // Real-Time WebSockets Engine Listener & Background HTTP Sync
  useEffect(() => {
    let isCancelled = false;

    // 1. Initial HTTP Fetch for fast hydration
    const initialSync = async () => {
      const data = await fetchServerSync();
      if (!isCancelled && data) {
        applyServerData(data);
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
            setCurrentUserId(curr => (curr === userId ? '' : curr));
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
          }
          break;
        }

        case 'WORKOUTS_ADDED': {
          const incoming = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
          setWorkouts(prev => {
            const map = new Map(prev.map(w => [w.id, w]));
            incoming.forEach(w => {
              if (w && w.id) map.set(w.id, w);
            });
            return Array.from(map.values());
          });
          break;
        }

        case 'WORKOUT_DELETED': {
          const { id } = msg.payload || {};
          if (id) {
            setWorkouts(prev => prev.filter(w => w.id !== id));
          }
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
          if (h && h.id) {
            setCustomHabits(prev => [...prev.filter(x => x.id !== h.id), h]);
          }
          break;
        }

        case 'CUSTOM_HABIT_DELETED': {
          const { id } = msg.payload || {};
          if (id) {
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

        case 'FULL_SYNC': {
          if (msg.payload) {
            applyServerData(msg.payload);
          }
          break;
        }
      }
    });

    // 3. Fallback Periodic Reconciliation (every 45s)
    const interval = setInterval(async () => {
      const data = await fetchServerSync();
      if (!isCancelled && data) {
        applyServerData(data);
      }
    }, 45000);

    return () => {
      isCancelled = true;
      unsubStatus();
      unsubEvents();
      clearInterval(interval);
    };
  }, []);

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

  // Toggle Dark/Light Theme
  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
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
    // Automatically recompute points_earned based on 10 pts per completed goal
    let isSunday = false;
    if (updatedLog.date) {
      const [y, m, d] = updatedLog.date.split('-').map(Number);
      isSunday = new Date(y, m - 1, d).getDay() === 0;
    }
    let coreDone = 0;
    if (updatedLog.gym_done || (isSunday && updatedLog.gym_done !== false)) coreDone += 1;
    if (updatedLog.steps_done || (updatedLog.steps_value || 0) >= (adminSettings?.step_target || 10000)) coreDone += 1;
    if (updatedLog.sleep_done) coreDone += 1;
    if (updatedLog.junk_food_avoided) coreDone += 1;
    if (updatedLog.water_done) coreDone += 1;

    const logToSave: DailyLog = {
      ...updatedLog,
      points_earned: coreDone * 10,
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

  // Save Multiple Workouts / Routine
  const handleSaveWorkouts = (newWorkouts: Workout[]) => {
    setWorkouts(prev => [...newWorkouts, ...prev.filter(w => !newWorkouts.some(nw => nw.id === w.id))]);
    pushWorkoutsToServer(newWorkouts);
    
    // Auto-mark gym goal as done for that date
    if (currentUser && newWorkouts.length > 0) {
      const targetDate = newWorkouts[0].date;
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
  const handleDeleteWorkout = (workoutId: string) => {
    const idStr = String(workoutId);
    let updatedWorkouts: Workout[] = [];
    setWorkouts(prev => {
      updatedWorkouts = prev.filter(w => String(w.id) !== idStr);
      saveStateToStorage(STORAGE_KEYS.WORKOUTS, updatedWorkouts);
      return updatedWorkouts;
    });
    deleteWorkoutOnServer(idStr);
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
  const handleDeleteAccount = (userId: string) => {
    deleteUserOnServer(userId);
    logoutSession();
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    setCurrentUserId('');
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
    setSupplements(prev => [...prev.filter(s => s.id !== newSupp.id), newSupp]);
    pushSupplementToServer(newSupp);
  };

  const handleDeleteSupplement = (suppId: string) => {
    setSupplements(prev => prev.filter(s => s.id !== suppId));
    setSupplementLogs(prev => prev.filter(l => l.supplement_id !== suppId));
    deleteSupplementOnServer(suppId);
  };

  const handleToggleSupplementLog = (suppId: string, date: string, taken: boolean) => {
    setSupplementLogs(prev => {
      const existing = prev.find(l => l.supplement_id === suppId && l.date === date && l.user_id === currentUserId);
      const updatedLog: SupplementLog = existing 
        ? { ...existing, taken }
        : {
            id: `slog_${suppId}_${date}_${Date.now()}`,
            user_id: currentUserId,
            supplement_id: suppId,
            date,
            taken,
          };
      pushSupplementLogToServer(updatedLog);
      return [...prev.filter(l => l.id !== updatedLog.id), updatedLog];
    });
  };

  // Custom Habit Handlers
  const handleAddCustomHabit = (newHabit: CustomHabit) => {
    setCustomHabits(prev => [...prev.filter(h => h.id !== newHabit.id), newHabit]);
    pushCustomHabitToServer(newHabit);
  };

  const handleDeleteCustomHabit = (habitId: string) => {
    setCustomHabits(prev => prev.filter(h => h.id !== habitId));
    setCustomHabitLogs(prev => prev.filter(l => l.habit_id !== habitId));
    deleteCustomHabitOnServer(habitId);
  };

  const handleToggleCustomHabitLog = (habitId: string, date: string, completed: boolean) => {
    setCustomHabitLogs(prev => {
      const existing = prev.find(l => l.habit_id === habitId && l.date === date && l.user_id === currentUserId);
      const updatedLog: CustomHabitLog = existing
        ? { ...existing, completed }
        : {
            id: `hlog_${habitId}_${date}_${Date.now()}`,
            user_id: currentUserId,
            habit_id: habitId,
            date,
            completed,
          };
      pushCustomHabitLogToServer(updatedLog);
      return [...prev.filter(l => l.id !== updatedLog.id), updatedLog];
    });
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
    <div className="min-h-screen bg-[#1c1815] text-[#f5efe6] flex flex-col font-sans selection:bg-[#c68b59] selection:text-[#1c1815]">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={activeUsers}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenRecap={() => setIsRecapModalOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        realtimeStatus={realtimeStatus}
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
            missedReasons={missedReasons}
            adminSettings={adminSettings}
            supplements={supplements}
            supplementLogs={supplementLogs}
            customHabits={customHabits}
            customHabitLogs={customHabitLogs}
            onUpdateDailyLog={handleUpdateDailyLog}
            onSaveMissedReason={handleSaveMissedReason}
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
          />
        )}

        {/* Tab 2: Workouts */}
        {activeTab === 'workouts' && currentUser && (
          <WorkoutHistory
            workouts={workouts}
            users={activeUsers}
            currentUser={currentUser}
            onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
            onDeleteWorkout={handleDeleteWorkout}
          />
        )}

        {/* Tab 3: Personal Analytics */}
        {activeTab === 'analytics' && currentUser && (
          <AnalyticsDashboard
            currentUser={currentUser}
            allUsers={activeUsers}
            dailyLogs={dailyLogs}
            weightLogs={weightLogs}
          />
        )}

        {/* Mobile Sub-Navigation for Community Views (Rankings / H2H / Badges) */}
        {(activeTab === 'leaderboard' || activeTab === 'comparison' || activeTab === 'badges') && currentUser && (
          <div className="md:hidden flex items-center p-1 bg-[#26201b] border border-[#3d322a] rounded-2xl mb-4 shadow-lg">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-[#c68b59] to-[#b87b4b] text-[#1c1815] shadow-md shadow-[#c68b59]/30'
                  : 'text-[#c5b4a5] hover:text-[#f5efe6]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Rankings</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                activeTab === 'comparison'
                  ? 'bg-gradient-to-r from-[#c68b59] to-[#b87b4b] text-[#1c1815] shadow-md shadow-[#c68b59]/30'
                  : 'text-[#c5b4a5] hover:text-[#f5efe6]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Head-to-Head</span>
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                activeTab === 'badges'
                  ? 'bg-gradient-to-r from-[#c68b59] to-[#b87b4b] text-[#1c1815] shadow-md shadow-[#c68b59]/30'
                  : 'text-[#c5b4a5] hover:text-[#f5efe6]'
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
            />

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
          </div>
        )}

        {/* Tab 5: Head-to-Head Comparison */}
        {activeTab === 'comparison' && currentUser && (
          <HeadToHead
            users={activeUsers}
            dailyLogs={dailyLogs}
            workouts={workouts}
            weightLogs={weightLogs}
          />
        )}

        {/* Tab 6: Badges & Gamification */}
        {activeTab === 'badges' && currentUser && (
          <GamificationSection
            currentUser={currentUser}
            badges={badges}
            challenge={challenge}
            dailyLogs={dailyLogs}
          />
        )}

        {/* Tab 7: Profile */}
        {activeTab === 'profile' && currentUser && (
          <ProfileSection
            currentUser={currentUser}
            allUsers={activeUsers}
            weightLogs={weightLogs}
            onUpdateProfile={handleUpdateProfile}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      {/* Mandatory Auth Screen / Modal */}
      {(!currentUser || isAuthModalOpen) && (
        <AuthModal
          isOpen={true}
          isMandatory={!currentUser}
          initialMode={users.length === 0 ? 'register' : 'login'}
          onClose={() => setIsAuthModalOpen(false)}
          users={users}
          onLoginSuccess={(user) => {
            setUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
            setCurrentUserId(user.id);
            setIsAuthModalOpen(false);
          }}
          onRegisterSuccess={(newUser) => {
            setUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
            setCurrentUserId(newUser.id);
            setIsAuthModalOpen(false);
          }}
        />
      )}

      {currentUser && (
        <WorkoutModal
          isOpen={isWorkoutModalOpen}
          onClose={() => setIsWorkoutModalOpen(false)}
          currentUser={currentUser}
          selectedDate={selectedDate}
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

      {/* Footer */}
      <footer className="border-t border-[#3d322a] bg-[#1c1815] py-6 pb-24 md:pb-6 text-center text-xs text-[#c5b4a5]">
        <p>PULSE Fitness & Daily Goal Tracker — Real-Time Multi-User Edition</p>
      </footer>
    </div>
  );
}

export default App;
