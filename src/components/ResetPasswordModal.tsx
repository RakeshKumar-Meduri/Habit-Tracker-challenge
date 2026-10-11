import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, Circle, AlertCircle, ArrowLeft, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { verifyResetTokenOnServer, submitPasswordResetOnServer } from '../services/apiService';

interface ResetPasswordModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccessReturnToLogin: () => void;
  onRequestNewLink: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  token,
  isOpen,
  onClose,
  onSuccessReturnToLogin,
  onRequestNewLink,
}) => {
  const [verifying, setVerifying] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid' | 'expired' | 'already_used'>('valid');
  const [errorMessage, setErrorMessage] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify token on mount or token change
  useEffect(() => {
    if (!isOpen) return;

    if (!token || !token.trim()) {
      setVerifying(false);
      setTokenStatus('invalid');
      setErrorMessage('No password reset token was provided. Please request a new password reset link.');
      return;
    }

    let isMounted = true;
    setVerifying(true);
    setErrorMessage('');

    verifyResetTokenOnServer(token).then((res) => {
      if (!isMounted) return;
      setVerifying(false);

      if (res.valid) {
        setTokenStatus('valid');
        if (res.email) setMaskedEmail(res.email);
      } else {
        if (res.reason === 'expired') {
          setTokenStatus('expired');
          setErrorMessage(res.message || 'This password reset link has expired. Links are valid for 1 hour.');
        } else if (res.reason === 'already_used') {
          setTokenStatus('already_used');
          setErrorMessage(res.message || 'This password reset link has already been used.');
        } else {
          setTokenStatus('invalid');
          setErrorMessage(res.message || 'This password reset link is invalid or malformed.');
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  if (!isOpen) return null;

  // Validation criteria
  const hasMinLength = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasUppercase && hasSpecialChar && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!hasMinLength) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (!hasUppercase) {
      setFormError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!hasSpecialChar) {
      setFormError('Password must contain at least one special character (!@#$%^&*...).');
      return;
    }
    if (!passwordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPasswordResetOnServer({
        token,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setFormError(res.error || 'Failed to reset password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-4 text-zinc-900 dark:text-zinc-100">
        
        {/* Loading / Verifying Token State */}
        {verifying && (
          <div className="text-center py-10 space-y-4">
            <RefreshCw className="w-10 h-10 text-zinc-700 dark:text-zinc-300 animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Verifying Security Token...</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Checking cryptographic validity and expiration timestamp.
            </p>
          </div>
        )}

        {/* Token Invalid / Expired / Already Used State */}
        {!verifying && tokenStatus !== 'valid' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl flex items-center justify-center mx-auto text-zinc-900 dark:text-zinc-100">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {tokenStatus === 'expired' 
                  ? 'Reset Link Expired' 
                  : (tokenStatus === 'already_used' ? 'Link Already Used' : 'Invalid Reset Link')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-3 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestNewLink();
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm cursor-pointer border border-transparent"
              >
                Request a New Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccessReturnToLogin();
                }}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 rounded-xl text-xs transition cursor-pointer border border-zinc-300 dark:border-zinc-700 font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {!verifying && tokenStatus === 'valid' && isSuccess && (
          <div className="text-center space-y-4 py-2 animate-fadeIn">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl flex items-center justify-center mx-auto text-zinc-900 dark:text-zinc-100">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Password Reset Complete!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Your password has been successfully updated. All other active sessions have been signed out for your account security.
              </p>
            </div>

            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-medium">
              ✓ You can now sign in with your new password.
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccessReturnToLogin();
                }}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm cursor-pointer border border-transparent"
              >
                Sign In to PULSE
              </button>
            </div>
          </div>
        )}

        {/* Form State (Token Valid & Not Yet Reset) */}
        {!verifying && tokenStatus === 'valid' && !isSuccess && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center justify-center mx-auto mb-3 text-zinc-900 dark:text-zinc-100">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Choose a New Password</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                {maskedEmail ? `Resetting password for ${maskedEmail}` : 'Enter and confirm your new secure password.'}
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-zinc-800 dark:text-zinc-200" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real-Time Password Requirements Checklist in Monochrome */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 text-[11px]">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Password Requirements:</p>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>At least 6 characters long</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>At least one special character (!@#$%^&*...)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="w-full py-3 min-h-[46px] bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2 border border-transparent"
              >
                {submitting ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccessReturnToLogin();
                }}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel and return to sign in</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResetPasswordModal;
