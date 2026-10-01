import React, { useState } from 'react';
import type { User } from '../types';
import { changeUserPassword } from '../services/authService';
import { KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MustChangePasswordModalProps {
  currentUser: User;
  onPasswordChanged: (updatedUser: User) => void;
}

export const MustChangePasswordModal: React.FC<MustChangePasswordModalProps> = ({
  currentUser,
  onPasswordChanged,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await changeUserPassword(currentUser, newPassword);
    setLoading(false);

    if (result.success && result.updatedUser) {
      onPasswordChanged(result.updatedUser);
    } else {
      setError(result.error || 'Failed to update password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-[#26201b] border-2 border-[#c68b59]/60 rounded-2xl p-5 sm:p-7 shadow-2xl">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#c68b59] to-[#b87b4b] flex items-center justify-center text-[#1c1815] shadow-lg shadow-[#c68b59]/30">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#f5efe6]">Action Required: Set New Password</h3>
          <p className="text-xs text-[#c5b4a5] mt-1.5 leading-relaxed">
            Hi <span className="text-[#f5efe6] font-semibold">{currentUser.name}</span>! You are currently using a temporary password. For account security, please create a new password to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#c5b4a5] absolute left-3.5 top-3" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-10 pr-3 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#c5b4a5] mb-1">Confirm New Password</label>
            <div className="relative">
              <CheckCircle2 className="w-4 h-4 text-[#c5b4a5] absolute left-3.5 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-3 py-2.5 bg-[#1c1815] border border-[#3d322a] rounded-xl text-[#f5efe6] text-sm focus:outline-none focus:border-[#c68b59]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 min-h-[44px] bg-gradient-to-r from-[#c68b59] to-[#b87b4b] hover:from-[#b87b4b] hover:to-[#a06738] text-[#1c1815] font-black rounded-xl text-sm transition shadow-lg shadow-[#c68b59]/20 disabled:opacity-50 cursor-pointer flex items-center justify-center"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
