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

  // Primary tabs for mobile bottom navigation bar (5 core actions per UX spec)
  const bottomNavItems = [
    { id: 'checklist', label: 'Today', icon: CheckSquare },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'leaderboard', label: 'Groups', icon: Trophy },
    { id: 'analytics', label: 'Progress', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#131316]/95 border-b border-slate-200 dark:border-[#26262C] backdrop-blur-md transition-colors font-sans">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <img 
                src="/logo.png" 
                alt="PULSE" 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0 shadow-md shadow-cyan-500/10 border border-slate-200 dark:border-white/5" 
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-[#F4F4F5] flex items-center gap-1.5 leading-none">
                  PULSE <span className="text-[#3157D5] dark:text-[#D98B4A] text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[#EFF8FF] dark:bg-[rgba(217,139,74,0.12)] border border-[#3157D5]/30 dark:border-[#D98B4A]/30 font-bold">FITNESS</span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#3157D5] dark:text-[#D98B4A] bg-[#EFF8FF] dark:bg-[rgba(217,139,74,0.12)] border border-[#3157D5]/30 dark:border-[#D98B4A]/30 px-2 py-0.5 rounded-full truncate max-w-[110px] sm:max-w-[160px] inline-block" title={currentGroup?.name || 'Group'}>
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
                        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border transition cursor-pointer active:scale-95 ${
                          realtimeStatus.isConnected
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-[#34D399] hover:bg-emerald-500/25'
                            : 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-[#FBBF24] hover:bg-amber-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus.isConnected ? 'bg-emerald-500 dark:bg-[#34D399] animate-pulse' : 'bg-amber-500'}`} />
                        <span className="hidden sm:inline tabular-nums">{realtimeStatus.isConnected ? `Live Sync (${effectiveCount} online)` : 'Syncing...'}</span>
                        <span className="sm:hidden tabular-nums">{realtimeStatus.isConnected ? `${effectiveCount} on` : 'sync'}</span>
                        {isRefreshingMembers && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-0.5 text-[#3157D5] dark:text-[#D98B4A]" />}
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
                  className="flex items-center gap-2 bg-slate-50 dark:bg-[#1B1B20] border border-slate-200 dark:border-[#26262C] rounded-lg px-3 py-1.5 text-xs shadow-sm cursor-pointer hover:border-[#3157D5]/50 dark:hover:border-[#D98B4A]/50 transition"
                  title="View Profile"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-[#1B1B20] border border-slate-300 dark:border-[#26262C] text-[11px] font-bold text-slate-800 dark:text-[#F4F4F5] flex items-center justify-center shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-slate-900 dark:text-[#F4F4F5] font-semibold truncate max-w-[100px] lg:max-w-[140px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#A1A1AA] font-mono leading-none">
                      @{currentUser.username}
                    </span>
                  </div>
                </div>
              )}

              {/* Recap Trigger */}
              <button
                onClick={onOpenRecap}
                title="Weekly Recap"
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#3157D5] border border-slate-200 dark:bg-[#1B1B20] dark:hover:bg-[#26262C] dark:text-[#D98B4A] dark:border-[#26262C] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#3157D5] dark:text-[#D98B4A]" />
                <span className="hidden lg:inline">Weekly Recap</span>
              </button>

              {/* CSV Export */}
              {currentUser && (
                <button
                  onClick={onExportCSV}
                  title="Export My Data as CSV"
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#3157D5] border border-slate-200 dark:bg-[#1B1B20] dark:hover:bg-[#26262C] dark:text-[#D98B4A] dark:border-[#26262C] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#3157D5] dark:text-[#D98B4A]" />
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
                  className="p-2 sm:px-3 rounded-[10px] bg-[#EFF8FF] hover:bg-[#DCEBFE] text-[#3157D5] border border-[#3157D5]/25 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4 text-[#3157D5]" />
                  <span className="hidden md:inline">Invite Friends</span>
                  {planTier !== 'pro' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#3157D5]/10 text-[#3157D5] font-bold border border-[#3157D5]/20 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> PRO
                    </span>
                  )}
                </button>
              )}

              {/* Membership Plan Pill / Upgrade */}
              {currentUser && (
                planTier === 'pro' ? (
                  <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#D98B4A]/20 to-[#F59E0B]/20 border border-[#D98B4A]/40 text-[#FBBF24] text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span className="hidden sm:inline">PRO</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenUpgradeModal}
                    title="Upgrade to PULSE Pro"
                    className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] text-[#0B0B0D] text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm hover:brightness-110 transition cursor-pointer active:scale-95"
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
                className="p-2 rounded-lg bg-[#1B1B20] hover:bg-[#26262C] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#26262C] transition cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-[#D98B4A]" /> : <Moon className="w-4 h-4 text-[#A1A1AA]" />}
              </button>

              {/* Auth / Logout */}
              {currentUser ? (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[#F87171] border border-rose-500/25 transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Log Out</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-1.5 px-3 bg-[#D98B4A] hover:bg-[#E69A5C] text-[#0B0B0D] font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Header Actions (Compact, Clean, Touch-Friendly) */}
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
                  className="w-9 h-9 rounded-[10px] bg-[#EFF8FF] text-[#3157D5] border border-[#3157D5]/25 flex items-center justify-center transition cursor-pointer active:scale-95 relative"
                >
                  <UserPlus className="w-4 h-4 text-[#3157D5]" />
                  {planTier !== 'pro' && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#3157D5] text-white flex items-center justify-center text-[8px]">
                      <Lock className="w-2 h-2" />
                    </span>
                  )}
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                aria-label="Toggle Theme"
                className="w-9 h-9 rounded-lg bg-[#1B1B20] text-[#A1A1AA] border border-[#26262C] flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-[#D98B4A]" /> : <Moon className="w-4 h-4 text-[#A1A1AA]" />}
              </button>

              {/* Current User Mini Avatar (Tap to go to Profile) */}
              {currentUser ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-9 h-9 rounded-lg bg-[#1B1B20] text-xs font-bold text-[#F4F4F5] flex items-center justify-center shadow-sm border border-[#26262C] cursor-pointer active:scale-95"
                  title={`Signed in as ${currentUser.name} (View Profile)`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-1.5 px-2.5 bg-[#D98B4A] text-[#0B0B0D] font-bold rounded-lg text-xs shadow-sm cursor-pointer"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Menu Dropdown Trigger */}
              <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Open Menu"
                  className={`w-9 h-9 rounded-lg bg-[#1B1B20] border border-[#26262C] flex items-center justify-center text-[#A1A1AA] hover:text-[#F4F4F5] transition cursor-pointer active:scale-95 ${
                    isMobileMenuOpen ? 'border-[#D98B4A] text-[#D98B4A]' : ''
                  }`}
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                </button>

                {/* Mobile Dropdown Popover */}
                {isMobileMenuOpen && (
                  <div className="absolute right-0 top-11 w-52 bg-[#131316] border border-[#26262C] rounded-xl p-2 shadow-2xl z-50 animate-fadeIn space-y-1">
                    {currentUser && (
                      <div className="px-3 py-2 border-b border-[#26262C] mb-1">
                        <p className="text-xs font-bold text-[#F4F4F5] truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-[#A1A1AA] font-mono">@{currentUser.username}</p>
                      </div>
                    )}

                    {onRefreshMembers && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onRefreshMembers();
                        }}
                        disabled={isRefreshingMembers}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#D98B4A] hover:bg-[#1B1B20] transition cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 text-[#D98B4A] ${isRefreshingMembers ? 'animate-spin' : ''}`} />
                        {isRefreshingMembers ? 'Syncing Members...' : 'Sync Members & Data'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenRecap();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#D98B4A] hover:bg-[#1B1B20] transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#D98B4A]" />
                      Weekly Recap
                    </button>

                    {currentUser && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onExportCSV();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F4F4F5] hover:bg-[#1B1B20] transition cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#D98B4A]" />
                        Export Data (CSV)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('calendar');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F4F4F5] hover:bg-[#1B1B20] transition cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-[#D98B4A]" />
                      Activity Calendar
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('comparison');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F4F4F5] hover:bg-[#1B1B20] transition cursor-pointer"
                    >
                      <Swords className="w-4 h-4 text-cyan-400" />
                      Head-to-Head
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('badges');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#F4F4F5] hover:bg-[#1B1B20] transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-[#FBBF24]" />
                        <span>Badges & Challenges</span>
                      </div>
                      {planTier !== 'pro' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#D98B4A]/20 text-[#D98B4A] font-bold border border-[#D98B4A]/30 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> PRO
                        </span>
                      )}
                    </button>

                    <div className="pt-1 border-t border-[#26262C]">
                      {currentUser ? (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#F87171] hover:bg-rose-500/10 transition cursor-pointer"
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
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-[#D98B4A] hover:bg-[#1B1B20] transition cursor-pointer"
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

          {/* Top Tab Navigation Strip (Horizontal scroll with smooth touch - Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-200 dark:border-[#26262C]/60 no-scrollbar touch-pan-x">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#EFF8FF] text-[#3157D5] border border-[#3157D5]/20 font-bold'
                      : 'text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#F4F4F5] hover:bg-slate-100 dark:hover:bg-[#1B1B20]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-[#3157D5]' : 'text-slate-500 dark:text-[#A1A1AA]'}`} />
                  <span>{item.label}</span>
                  {(item.id === 'badges' || item.id === 'comparison') && planTier !== 'pro' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#D98B4A]/15 text-[#D98B4A] font-bold border border-[#D98B4A]/25 flex items-center gap-0.5 leading-none">
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#131316]/95 border-t border-slate-200 dark:border-[#26262C] backdrop-blur-lg px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
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
                    ? 'text-[#3157D5] font-bold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                <div className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-[#EFF8FF] text-[#3157D5]' : ''
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#3157D5] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

