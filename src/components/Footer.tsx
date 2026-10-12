import React from 'react';
import type { LegalTab } from './LegalModal';

interface FooterProps {
  onOpenLegal: (tab: LegalTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Brand & Mission Tagline */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            PULSE
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track your progress. Build consistency. Grow together.
          </p>
        </div>

        {/* Divider line matching card screenshot */}
        <div className="h-px bg-zinc-200 dark:border-zinc-800/80 dark:bg-zinc-800/80 w-full" />

        {/* 2-Column Links: LEGAL & SUPPORT */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 text-xs">
          {/* LEGAL */}
          <div>
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              LEGAL
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 transition cursor-pointer text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 transition cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('refund')}
                  className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 transition cursor-pointer text-left"
                >
                  Refund & Cancellation
                </button>
              </li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              SUPPORT
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('contact')}
                  className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 transition cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('contact')}
                  className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 transition cursor-pointer text-left"
                >
                  Help & Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Statement */}
        <div className="pt-4 text-xs text-zinc-400 dark:text-zinc-500">
          © 2026 PULSE. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
