import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { 
  CheckSquare, 
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
  X
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  allUsers?: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenRecap: () => void;
  onExportCSV: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  realtimeStatus?: { isConnected: boolean; clientCount: number };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  activeTab,
  setActiveTab,
  isDarkMode,
  onToggleTheme,
  onOpenRecap,
  onExportCSV,
  onOpenAuth,
  onLogout,
  realtimeStatus,
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
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'comparison', label: 'Head-to-Head', icon: Swords },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  // Primary tabs for mobile bottom navigation bar
  const bottomNavItems = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'leaderboard', label: 'Rankings', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#26201b]/95 border-b border-[#3d322a] backdrop-blur-md transition-colors font-sans">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#c68b59] via-[#b87b4b] to-[#d4a373] flex items-center justify-center shadow-lg shadow-[#c68b59]/20 shrink-0">
                <Dumbbell className="w-4 h-4 sm:w-6 sm:h-6 text-[#1c1815] stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#f5efe6] flex items-center gap-1.5 leading-none">
                  PULSE <span className="text-[#d4a373] text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-[#c68b59]/10 border border-[#c68b59]/30 font-bold">FITNESS</span>
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] sm:text-[11px] text-[#c5b4a5] hidden xs:block truncate">Group Tracker</p>
                  {realtimeStatus && (() => {
                    const totalUsers = allUsers ? allUsers.length : 0;
                    const effectiveCount = totalUsers > 0
                      ? Math.max(1, Math.min(realtimeStatus.clientCount, totalUsers))
                      : (realtimeStatus.clientCount > 0 ? realtimeStatus.clientCount : 1);
                    return (
                      <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border ${
                        realtimeStatus.isConnected
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                          : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="hidden sm:inline">{realtimeStatus.isConnected ? `Live Sync (${effectiveCount} online)` : 'Syncing...'}</span>
                        <span className="sm:hidden">{realtimeStatus.isConnected ? `${effectiveCount} on` : 'sync'}</span>
                      </span>
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
                  className="flex items-center gap-2 bg-[#1c1815] border border-[#3d322a] rounded-xl px-3 py-1.5 text-xs shadow-inner cursor-pointer hover:border-[#c68b59]/50 transition"
                  title="View Profile"
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${currentUser.avatar_color || 'from-[#c68b59] to-[#785338]'} text-[11px] font-bold text-[#f5efe6] flex items-center justify-center shrink-0 shadow`}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-[#f5efe6] font-semibold truncate max-w-[100px] lg:max-w-[140px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-[#c5b4a5] font-mono leading-none">
                      @{currentUser.username}
                    </span>
                  </div>
                </div>
              )}

              {/* Recap Trigger */}
              <button
                onClick={onOpenRecap}
                title="Weekly Recap"
                className="p-2 rounded-xl bg-[#1c1815] hover:bg-[#322a24] text-[#d4a373] border border-[#3d322a] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#c68b59]" />
                <span className="hidden lg:inline">Weekly Recap</span>
              </button>

              {/* CSV Export */}
              {currentUser && (
                <button
                  onClick={onExportCSV}
                  title="Export My Data as CSV"
                  className="p-2 rounded-xl bg-[#1c1815] hover:bg-[#322a24] text-[#d4a373] border border-[#3d322a] transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#d4a373]" />
                  <span className="hidden lg:inline">CSV Export</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                title="Toggle Theme"
                className="p-2 rounded-xl bg-[#1c1815] hover:bg-[#322a24] text-[#c5b4a5] border border-[#3d322a] transition cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-[#d4a373]" /> : <Moon className="w-4 h-4 text-[#c5b4a5]" />}
              </button>

              {/* Auth / Logout */}
              {currentUser ? (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Log Out</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-1.5 px-3 bg-[#c68b59] hover:bg-[#b87b4b] text-[#1c1815] font-bold rounded-xl text-xs transition shadow-md shadow-[#c68b59]/20 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Header Actions (Compact, Clean, Touch-Friendly) */}
            <div className="flex sm:hidden items-center gap-1.5">
              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                aria-label="Toggle Theme"
                className="w-9 h-9 rounded-xl bg-[#1c1815] text-[#c5b4a5] border border-[#3d322a] flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-[#d4a373]" /> : <Moon className="w-4 h-4 text-[#c5b4a5]" />}
              </button>

              {/* Current User Mini Avatar (Tap to go to Profile) */}
              {currentUser ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentUser.avatar_color || 'from-[#c68b59] to-[#785338]'} text-xs font-bold text-[#f5efe6] flex items-center justify-center shadow border border-[#3d322a] cursor-pointer active:scale-95`}
                  title={`Signed in as ${currentUser.name} (View Profile)`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="py-1.5 px-2.5 bg-[#c68b59] text-[#1c1815] font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Menu Dropdown Trigger */}
              <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Open Menu"
                  className={`w-9 h-9 rounded-xl bg-[#1c1815] border border-[#3d322a] flex items-center justify-center text-[#c5b4a5] hover:text-[#f5efe6] transition cursor-pointer active:scale-95 ${
                    isMobileMenuOpen ? 'border-[#c68b59] text-[#d4a373]' : ''
                  }`}
                >
                  {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                </button>

                {/* Mobile Dropdown Popover */}
                {isMobileMenuOpen && (
                  <div className="absolute right-0 top-11 w-52 bg-[#1c1815] border border-[#3d322a] rounded-2xl p-2 shadow-2xl z-50 animate-fadeIn space-y-1">
                    {currentUser && (
                      <div className="px-3 py-2 border-b border-[#3d322a] mb-1">
                        <p className="text-xs font-bold text-[#f5efe6] truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-[#c5b4a5] font-mono">@{currentUser.username}</p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenRecap();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#d4a373] hover:bg-[#26201b] transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#c68b59]" />
                      Weekly Recap
                    </button>

                    {currentUser && (
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onExportCSV();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#f5efe6] hover:bg-[#26201b] transition cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#d4a373]" />
                        Export Data (CSV)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('comparison');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#f5efe6] hover:bg-[#26201b] transition cursor-pointer"
                    >
                      <Swords className="w-4 h-4 text-cyan-400" />
                      Head-to-Head
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveTab('badges');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#f5efe6] hover:bg-[#26201b] transition cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      Badges & Challenges
                    </button>

                    <div className="pt-1 border-t border-[#3d322a]">
                      {currentUser ? (
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
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
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#c68b59] hover:bg-[#26201b] transition cursor-pointer"
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

          {/* Top Tab Navigation Strip (Horizontal scroll with smooth touch) */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-[#3d322a]/60 no-scrollbar touch-pan-x">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#c68b59]/25 to-[#b87b4b]/20 text-[#d4a373] border border-[#c68b59]/40 shadow-sm'
                      : 'text-[#c5b4a5] hover:text-[#f5efe6] hover:bg-[#1c1815]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-[#c68b59]' : 'text-[#c5b4a5]'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Modern Native-Style Bottom Navigation Bar for Mobile (< 768px) */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1c1815]/95 border-t border-[#3d322a] backdrop-blur-lg px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'text-[#d4a373] font-bold'
                    : 'text-[#c5b4a5] hover:text-[#f5efe6]'
                }`}
              >
                <div className={`p-1 rounded-lg transition ${
                  isActive ? 'bg-[#c68b59]/20 text-[#c68b59]' : ''
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight leading-none">{item.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#c68b59] mt-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

