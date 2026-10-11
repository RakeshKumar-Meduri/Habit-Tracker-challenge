import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { CelebrationEvent } from '../types';
import { Sparkles, Trophy, Flame, X } from 'lucide-react';

interface CelebrationBannerProps {
  event: CelebrationEvent | null;
  onClose: () => void;
}

export const CelebrationBanner: React.FC<CelebrationBannerProps> = ({ event, onClose }) => {
  useEffect(() => {
    if (event) {
      // Trigger canvas-confetti burst with monochrome palette
      const duration = 2.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#09090B', '#27272A', '#71717A', '#D4D4D8', '#FAFAFA']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#09090B', '#27272A', '#71717A', '#D4D4D8', '#FAFAFA']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [event]);

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 text-center shadow-2xl transform transition-all animate-bounce-short">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shadow-lg">
          {event.type === 'weight_loss' ? (
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 animate-spin-slow" />
          ) : event.type === 'streak_milestone' ? (
            <Flame className="w-8 h-8 sm:w-10 sm:h-10" />
          ) : (
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2">{event.title}</h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mb-6 leading-relaxed">{event.message}</p>

        <button
          onClick={onClose}
          className="btn-primary w-full py-3 px-6 min-h-[44px] text-sm font-bold shadow-md cursor-pointer flex items-center justify-center"
        >
          Awesome! Keep it Up 🚀
        </button>
      </div>
    </div>
  );
};
