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
          colors: ['#D98B4A', '#E69A5C', '#e07a5f', '#81b29a', '#f2cc8f']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#D98B4A', '#E69A5C', '#e07a5f', '#81b29a', '#f2cc8f']
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
      <div className="relative w-full max-w-md bg-[#131316] border-2 border-[#D98B4A]/70 rounded-xl p-5 sm:p-7 text-center shadow-2xl shadow-[#D98B4A]/20 transform transition-all animate-bounce-short">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#F4F4F5] p-1.5 rounded-lg hover:bg-[#1B1B20] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-[#D98B4A] to-[#D98B4A] flex items-center justify-center shadow-lg shadow-[#D98B4A]/30">
          {event.type === 'weight_loss' ? (
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-[#1B1B20] animate-spin-slow" />
          ) : event.type === 'streak_milestone' ? (
            <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-[#1B1B20]" />
          ) : (
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-[#1B1B20]" />
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-[#F4F4F5] mb-2">{event.title}</h3>
        <p className="text-[#A1A1AA] text-xs sm:text-sm mb-6 leading-relaxed">{event.message}</p>

        <button
          onClick={onClose}
          className="w-full py-3 px-6 min-h-[44px] bg-gradient-to-r from-[#D98B4A] to-[#D98B4A] hover:from-[#D98B4A] hover:to-[#B45F1E] text-[#1B1B20] font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center"
        >
          Awesome! Keep it Up 🚀
        </button>
      </div>
    </div>
  );
};
