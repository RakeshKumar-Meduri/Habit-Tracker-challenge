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
      // Trigger canvas-confetti burst
      const duration = 2.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#c68b59', '#d4a373', '#e07a5f', '#81b29a', '#f2cc8f']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#c68b59', '#d4a373', '#e07a5f', '#81b29a', '#f2cc8f']
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
      <div className="relative w-full max-w-md bg-[#26201b] border-2 border-[#c68b59]/70 rounded-2xl p-5 sm:p-7 text-center shadow-2xl shadow-[#c68b59]/20 transform transition-all animate-bounce-short">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#c5b4a5] hover:text-[#f5efe6] p-1.5 rounded-lg hover:bg-[#322a24] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-[#c68b59] to-[#b87b4b] flex items-center justify-center shadow-lg shadow-[#c68b59]/30">
          {event.type === 'weight_loss' ? (
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-[#1c1815] animate-spin-slow" />
          ) : event.type === 'streak_milestone' ? (
            <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-[#1c1815]" />
          ) : (
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-[#1c1815]" />
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-[#f5efe6] mb-2">{event.title}</h3>
        <p className="text-[#c5b4a5] text-xs sm:text-sm mb-6 leading-relaxed">{event.message}</p>

        <button
          onClick={onClose}
          className="w-full py-3 px-6 min-h-[44px] bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center"
        >
          Awesome! Keep it Up 🚀
        </button>
      </div>
    </div>
  );
};
