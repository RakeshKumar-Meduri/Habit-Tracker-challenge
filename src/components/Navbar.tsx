import React, { useState, useRef, useEffect } from 'react';
import type { User, Group } from '../types';
import { 
  CheckSquare, 
  Calendar,
  Dumbbell, 
  BarChart3, 
  Trophy, 
  Swords, 
  Award, 
  User as UserIcon,
  Sun, 
  Moon, 
  Download, 
  Sparkles, 
  LogOut,
  MoreVertical,
  X,
  RefreshCw,
  UserPlus,
  Crown,
  Lock
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentGroup?: Group | null;
  allUsers?: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenRecap: () => void;
  onExportCSV: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenInviteModal?: () => void;
  realtimeStatus?: { isConnected: boolean; clientCount: number };
  onRefreshMembers?: () => void;
  isRefreshingMembers?: boolean;
  planTier?: 'none' | 'base' | 'pro';
  onOpenUpgradeModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentGroup,
  allUsers,
  activeTab,
  setActiveTab,
  isDarkMode,
  onToggleTheme,
  onOpenRecap,
  onExportCSV,
  onOpenAuth,
  onLogout,
  onOpenInviteModal,
  realtimeStatus,
  onRefreshMembers,
  isRefreshingMembers = false,
  planTier = 'none',
  onOpenUpgradeModal,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'comparison', label: 'Head-to-Head', icon: Swords },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  // Primary tabs for mobile bottom navigation bar (5 core actions)
  const bottomNavItems = [
    { id: 'checklist', label: 'Today', icon: CheckSquare },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'leaderboard', label: 'Groups', icon: Trophy },
    { id: 'analytics', label: 'Progress', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-md transition-colors font-sans">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <img 
                src="/logo.png" 
                alt="PULSE" 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0 border border-zinc-300 dark:border-zinc-700" 
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 leading-none">
                  PULSE <span className="text-zinc-900 dark:text-zinc-100 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold">FITNESS</span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded-full truncate max-w-[110px] sm:max-w-[160px] inline-block" title={currentGroup?.name || 'Group'}>
                    {currentGroup?.name || 'PULSE'}
                  </span>
                  {realtimeStatus && (() => {
                    const totalUsers = allUsers ? allUsers.length : 0;
                    const effectiveCount = totalUsers > 0
                      ? Math.max(1, Math.min(realtimeStatus.clientCount, totalUsers))
                      : (realtimeStatus.clientCount > 0 ? realtimeStatus.clientCount : 1);
                    return (
                      <button
                        type="button"
                        onClick={onRefreshMembers}
                        disabled={isRefreshingMembers}
                        title="Live Sync Status • Tap to force refresh members and data"
                        className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border transition cursor-pointer active:scale-95 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus.isConnected ? 'bg-zinc-900 dark:bg-zinc-100' : 'border border-zinc-500'}`} />
                        <span className="hidden sm:inline tabular-nums">{realtimeStatus.isConnected ? `Live Sync (${effectiveCount} online)` : 'Syncing...'}</span>
                        <span className="sm:hidden tabular-nums">{realtimeStatus.isConnected ? `${effectiveCount} on` : 'sync'}</span>
                        {isRefreshingMembers && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-0.5 text-zinc-900 dark:text-zinc-100" />}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Desktop Actions Row */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              {/* Logged in User Display */}
              {currentUser && (
                <div 
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs shadow-sm cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition"
                  title="View Profile"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-zinc-900 dark:text-zinc-100 font-semibold truncate max-w-[100px] lg:max-w-[140px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono leading-none">
                      @{currentUser.username}
                    </span>
                  </div>
                </div>
              )}

              {/* Recap Trigger */}
              <button
                onClick={onOpenRecap}
                title="Weekly Recap"
                className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-800 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span className="hidden lg:inline">Weekly Recap</span>
              </button>

              {/* CSV Export */}
              {currentUser && (
                <button
                  onClick={onExportCSV}
                  title="Export My Data as CSV"
                  className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-800 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <span className="hidden lg:inline">CSV Export</span>
                </button>
              )}

              {/* Invite Friends Trigger */}
              {currentUser && (onOpenInviteModal || onOpenUpgradeModal) && (
                <button
                  type="button"
                  onClick={() => {
                    if (planTier !== 'pro') {
                      onOpenUpgradeModal?.();
                    } else {
                      onOpenInviteModal?.();
                    }
                  }}
                  title={planTier !== 'pro' ? 'Invite Friends (PULSE Pro Exclusive)' : 'Invite Friends to Group'}
                  className="p-2 sm:px-3 rounded-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                  <span className="hidden md:inline">Invite Friends</span>
                  {planTier !== 'pro' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-300 dark:border-zinc-700 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> PRO
                    </span>
                  )}
                </button>
              )}

              {/* Membership Plan Pill / Upgrade */}
              {currentUser && (
                planTier === 'pro' ? (
                  <span className="px-2.5 py-1 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PRO</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenUpgradeModal}
                    title="Upgrade to PULSE Pro"
                    className="px-2.5 py-1 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition cursor-pointer active:scale-95 border border-transparent"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Upgrade Pro</span>
                  </button>
                )
              )}

              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                title="Toggle Theme"
                className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-800 transition cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-zinc-200" /> : <Moon className="w-4 h-4 text-zinc-800" />}
              </button>

              {/* Auth / Logout */}
              {currentUser ? (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Log Out</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Header Actions */}
            <div className="flex sm:hidden items-center gap-1.5">
              {/* Invite Friends Button (Mobile) */}
              {currentUser && (onOpenInviteModal || onOpenUpgradeModal) && (
                <button
                  type="button"
                  onClick={() => {
                    if (planTier !== 'pro') {
                      onOpenUpgradeModal?.();
                    } else {
                      onOpenInviteModal?.();
                    }
                  }}
                  aria-label="Invite Friends"
                  title={planTier !== 'pro' ? 'Invite Friends (PULSE Pro Exclusive)' : 'Invite Friends to Group'}
                  className="w-9 h-9 rounded-[10px] bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 flex items-center justify-center transition cursor-pointer active:scale-95 relative"
                >
                  <UserPlus className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                  {planTier !== 'pro' && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center text-[8px]">
                      <Lock className="w-2 h-2" />
                    </span>
                  )}
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                aria-label="Toggle Theme"
                className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-zinc-200" /> : <Moon className="w-4 h-4 text-zinc-800" />}
              </button>

              {/* Current User Mini Avatar (Tap to go to Profile) */}
              {currentUser ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-9 h-9 rounded-lg bg-zinc-100 text-xs font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex items-center justify-center shadow-sm border border-zinc-300 dark:border-zinc-700 cursor-pointer active:scale-95"
                  title={`Signed in as ${currentUser.name} (View Profile)`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-1.5 px-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold rounded-lg text-xs shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Menu Dropdown Trigger */}
              <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Open Menu"
                  className={`w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-center text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition cursor-pointer active:scale-95 ${
                    isMobileMenuOpen ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100' : ''
                  }`}
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                </button>

                {/* Mobile Dropdown Popover */}
                {isMobileMenuOpen && (
                  <div className="absolute right-0 top-11 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-2xl z-50 animate-fadeIn space-y-1">
                    {currentUser && (
                      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 mb-1">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">@{currentUser.username}</p>
                      </div>
                    )}

                    {onRefreshMembers && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onRefreshMembers();
                        }}
                        disabled={isRefreshingMembers}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 text-zinc-800 dark:text-zinc-200 ${isRefreshingMembers ? 'animate-spin' : ''}`} />
                        {isRefreshingMembers ? 'Syncing Members...' : 'Sync Members & Data'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenRecap();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                      Weekly Recap
                    </button>

                    {currentUser && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onExportCSV();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                        Export Data (CSV)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('calendar');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                      Activity Calendar
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('comparison');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                    >
                      <Swords className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                      Head-to-Head
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('badges');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                        <span>Badges & Challenges</span>
                      </div>
                      {planTier !== 'pro' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 font-bold border border-zinc-300 dark:border-zinc-700 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> PRO
                        </span>
                      )}
                    </button>

                    <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      {currentUser ? (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onOpenAuth();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer"
                        >
                          Sign In / Register
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Top Tab Navigation Strip (Horizontal scroll - Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-zinc-200 dark:border-zinc-800/80 no-scrollbar touch-pan-x">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-500 dark:text-zinc-400'}`} />
                  <span>{item.label}</span>
                  {(item.id === 'badges' || item.id === 'comparison') && planTier !== 'pro' && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-0.5 leading-none ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700 dark:bg-zinc-200 dark:text-zinc-800 dark:border-zinc-300'
                        : 'bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                    }`}>
                      <Lock className="w-2 h-2" /> PRO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Modern Native-Style Bottom Navigation Bar for Mobile (< 768px) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-lg px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'leaderboard' && (activeTab === 'comparison' || activeTab === 'badges'));
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 min-h-[48px] rounded-lg transition-all cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'text-zinc-950 dark:text-zinc-50 font-bold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <div className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-zinc-900 dark:bg-zinc-100 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
