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
          colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 text-center shadow-2xl shadow-emerald-500/20 transform transition-all animate-bounce-short">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          {event.type === 'weight_loss' ? (
            <Sparkles className="w-10 h-10 text-slate-900 animate-spin-slow" />
          ) : event.type === 'streak_milestone' ? (
            <Flame className="w-10 h-10 text-slate-900" />
          ) : (
            <Trophy className="w-10 h-10 text-slate-900" />
          )}
        </div>

        <h3 className="text-2xl font-black text-white mb-2">{event.title}</h3>
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">{event.message}</p>

        <button
          onClick={onClose}
          className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg transition active:scale-95"
        >
          Awesome! Keep it Up 🚀
        </button>
      </div>
    </div>
  );
};
