import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Lock, 
  FileText, 
  Shield, 
  RefreshCcw, 
  Mail, 
  HelpCircle, 
  ChevronRight, 
  Flame, 
  CheckCircle2,
  Star
} from 'lucide-react';
import type { LegalTab } from './LegalModal';
import type { UserReview } from '../types';

interface FooterProps {
  onOpenLegal: (tab: LegalTab) => void;
  onOpenReview?: () => void;
  userReview?: UserReview | null;
}

export const Footer: React.FC<FooterProps> = ({ 
  onOpenLegal, 
  onOpenReview,
  userReview 
}) => {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#0c0c0e] text-zinc-600 dark:text-zinc-400 font-sans transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        
        {/* Top Section: Brand Statement, Live Status & Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-zinc-200/80 dark:border-zinc-800/80">
          
          {/* Brand Info & Mission (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D98B4A] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#D98B4A]/25">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
                PULSE
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
              The high-performance habit and group fitness tracking application. Build daily discipline, log workouts, monitor body metrics, and push limits with your squad.
            </p>

            {/* Live Operational & Trust Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Realtime Engine Active</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                <Lock className="w-3 h-3 text-[#D98B4A]" />
                <span>256-Bit SSL Secured</span>
              </div>
            </div>
          </div>

          {/* 3 Nav Columns: FEATURES, LEGAL, SUPPORT (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            
            {/* Column 1: PLATFORM & CORE */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Platform
              </h3>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Daily Checklist</span>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Flame className="w-3.5 h-3.5 text-[#D98B4A] shrink-0" />
                    <span>Workouts & Weights</span>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Group Leaderboards</span>
                  </div>
                </li>
                <li>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
                    <span>Solo Mode 100% Free</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 2: LEGAL & POLICIES */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Legal & Privacy
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#D98B4A] transition" />
                    <span className="group-hover:translate-x-0.5 transition-transform font-medium">Terms & Conditions</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#D98B4A] transition" />
                    <span className="group-hover:translate-x-0.5 transition-transform font-medium">Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('refund')}
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#D98B4A] transition" />
                    <span className="group-hover:translate-x-0.5 transition-transform font-medium">Refund & Cancellation</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('contact')}
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition" />
                    <span className="group-hover:translate-x-0.5 transition-transform font-medium">Row Level Security</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: SUPPORT & HELP */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Support & Help
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="mailto:supportpulseteam@gmail.com"
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition py-0.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#D98B4A] transition" />
                    <span className="truncate group-hover:translate-x-0.5 transition-transform font-medium">
                      supportpulseteam@gmail.com
                    </span>
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('contact')}
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#D98B4A] transition" />
                    <span className="group-hover:translate-x-0.5 transition-transform font-medium">Help & Contact Portal</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenLegal('contact')}
                    className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#D98B4A] transition" />
                    <span className="group-hover:translate-x-0.5 transition-transform font-medium">Billing & Razorpay Support</span>
                  </button>
                </li>
                {onOpenReview && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenReview}
                      className="group flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer text-left py-0.5"
                    >
                      <Star className={`w-3.5 h-3.5 transition shrink-0 ${
                        userReview 
                          ? 'text-amber-500 fill-amber-500' 
                          : 'text-zinc-400 group-hover:text-amber-500'
                      }`} />
                      <span className="group-hover:translate-x-0.5 transition-transform font-medium">
                        {userReview ? `Your Review (${userReview.rating}★)` : 'Rate & Review PULSE'}
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar: Copyright & Quick Links */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-zinc-500 dark:text-zinc-500">
            © 2026 PULSE. All rights reserved. Designed for disciplined athletes.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              Terms
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <button
              type="button"
              onClick={() => onOpenLegal('refund')}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              Refunds
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <button
              type="button"
              onClick={() => onOpenLegal('contact')}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              Contact
            </button>
            {onOpenReview && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <button
                  type="button"
                  onClick={onOpenReview}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Star className={`w-3 h-3 ${userReview ? 'text-amber-500 fill-amber-500' : 'text-zinc-400'}`} />
                  <span>{userReview ? 'Your Review' : 'Rate PULSE'}</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </footer>
  );
};
