import React from 'react';
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
  LogOut
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
  const navItems = [
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard & Feed', icon: Trophy },
    { id: 'comparison', label: 'Head-to-Head', icon: Swords },
    { id: 'badges', label: 'Badges & Goals', icon: Award },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#26201b]/95 border-b border-[#3d322a] backdrop-blur-md transition-colors font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#c68b59] via-[#b87b4b] to-[#d4a373] flex items-center justify-center shadow-lg shadow-[#c68b59]/20">
              <Dumbbell className="w-6 h-6 text-[#1c1815] stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#f5efe6] flex items-center gap-1.5">
                PULSE <span className="text-[#d4a373] text-xs px-2 py-0.5 rounded-full bg-[#c68b59]/10 border border-[#c68b59]/30 font-bold">FITNESS</span>
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-[#c5b4a5] -mt-0.5">Personal & Group Tracker</p>
                {realtimeStatus && (() => {
                  const totalUsers = allUsers ? allUsers.length : 0;
                  const effectiveCount = totalUsers > 0
                    ? Math.max(1, Math.min(realtimeStatus.clientCount, totalUsers))
                    : (realtimeStatus.clientCount > 0 ? realtimeStatus.clientCount : 1);
                  return (
                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      realtimeStatus.isConnected
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                        : 'bg-amber-950/40 border-amber-800/60 text-amber-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {realtimeStatus.isConnected ? `Live Sync (${effectiveCount} online)` : 'Syncing...'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Authenticated User Display & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Logged in User Display */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-[#1c1815] border border-[#3d322a] rounded-xl px-3 py-1.5 text-xs shadow-inner">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${currentUser.avatar_color || 'from-[#c68b59] to-[#785338]'} text-[11px] font-bold text-[#f5efe6] flex items-center justify-center shrink-0 shadow`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-[#f5efe6] font-semibold truncate max-w-[110px] sm:max-w-[150px]">
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
              className="p-2 rounded-xl bg-[#1c1815] hover:bg-[#322a24] text-[#d4a373] border border-[#3d322a] transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#c68b59]" />
              <span className="hidden lg:inline">Weekly Recap</span>
            </button>

            {/* CSV Export */}
            {currentUser && (
              <button
                onClick={onExportCSV}
                title="Export My Data as CSV"
                className="p-2 rounded-xl bg-[#1c1815] hover:bg-[#322a24] text-[#d4a373] border border-[#3d322a] transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
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
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-[#3d322a]/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#c68b59]/20 to-[#b87b4b]/20 text-[#d4a373] border border-[#c68b59]/40 shadow-sm'
                    : 'text-[#c5b4a5] hover:text-[#f5efe6] hover:bg-[#1c1815]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#c68b59]' : 'text-[#c5b4a5]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
