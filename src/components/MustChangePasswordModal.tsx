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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-white border border-[#E4E7EC] rounded-[20px] p-5 sm:p-7 shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-[12px] bg-[#EFF8FF] border border-[#3157D5]/20 flex items-center justify-center text-[#3157D5] shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#111827]">Action Required: Set New Password</h3>
          <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
            Hi <span className="text-[#111827] font-semibold">{currentUser.name}</span>! You are currently using a temporary password. For account security, please create a new password to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-[10px] text-xs text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-3" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-[#111827] text-sm focus:outline-none focus:border-[#3157D5]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#667085] mb-1">Confirm New Password</label>
            <div className="relative">
              <CheckCircle2 className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-[#111827] text-sm focus:outline-none focus:border-[#3157D5]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 min-h-[46px] bg-[#3157D5] hover:bg-[#2544B8] text-white font-semibold rounded-[10px] text-sm transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
