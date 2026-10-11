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
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Password must contain at least one special character.');
      return;
    }
    if (newPassword.toLowerCase() === currentUser.username.toLowerCase()) {
      setError('Password cannot match your username.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl text-zinc-900 dark:text-zinc-100">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Action Required: Set New Password</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            Hi <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{currentUser.name}</span>! You are currently using a temporary password. For account security, please create a new password to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-zinc-800 dark:text-zinc-200" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Confirm New Password</label>
            <div className="relative">
              <CheckCircle2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 min-h-[46px] bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center border border-transparent"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MustChangePasswordModal;
