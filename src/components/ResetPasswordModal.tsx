import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  ArrowLeft, 
  RefreshCw, 
  KeyRound, 
  ShieldCheck, 
  Clipboard, 
  X,
  MailCheck
} from 'lucide-react';
import { verifyResetTokenOnServer, submitPasswordResetOnServer } from '../services/apiService';

interface ResetPasswordModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccessReturnToLogin: () => void;
  onRequestNewLink: () => void;
}

/**
 * Extracts raw 64-char token if user pastes full reset URL or query string
 */
function sanitizeAndExtractToken(input: string): string {
  let cleaned = (input || '').trim().replace(/^["']|["']$/g, '');
  if (cleaned.includes('token=')) {
    try {
      const url = new URL(cleaned.startsWith('http') ? cleaned : `http://localhost/${cleaned}`);
      const t = url.searchParams.get('token') || url.searchParams.get('resetToken') || url.searchParams.get('reset_token');
      if (t) return t.trim();
    } catch {
      const match = cleaned.match(/[?&](?:token|resetToken|reset_token)=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return match[1];
    }
  }
  return cleaned;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  token,
  isOpen,
  onClose,
  onSuccessReturnToLogin,
  onRequestNewLink,
}) => {
  const [activeToken, setActiveToken] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid' | 'expired' | 'already_used' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  // Form state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Verification executor
  const verifyToken = useCallback(async (tokenCandidate: string) => {
    const clean = sanitizeAndExtractToken(tokenCandidate);
    if (!clean || clean.length < 10) {
      setVerifying(false);
      setTokenStatus('invalid');
      setErrorMessage('Please enter a valid password reset token (at least 10 characters).');
      return;
    }

    setVerifying(true);
    setErrorMessage('');
    setFormError('');

    try {
      const res = await verifyResetTokenOnServer(clean);
      setVerifying(false);

      if (res.valid) {
        setActiveToken(clean);
        setTokenStatus('valid');
        if (res.email) setMaskedEmail(res.email);
        if (res.username) setUsername(res.username);
        // Persist token in sessionStorage so page reload preserves the session
        try {
          sessionStorage.setItem('pulse_reset_token', clean);
        } catch {}
      } else {
        if (res.reason === 'expired') {
          setTokenStatus('expired');
          setErrorMessage(res.message || 'This password reset token has expired. Reset tokens are valid for 1 hour.');
        } else if (res.reason === 'already_used') {
          setTokenStatus('already_used');
          setErrorMessage(res.message || 'This password reset token has already been used.');
        } else {
          setTokenStatus('invalid');
          setErrorMessage(res.message || 'This password reset token does not exist or is invalid.');
        }
      }
    } catch (err: any) {
      setVerifying(false);
      setTokenStatus('invalid');
      setErrorMessage(err.message || 'Network error while verifying reset token.');
    }
  }, []);

  // When modal opens or token prop changes:
  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setNewPassword('');
      setConfirmPassword('');
      setFormError('');
      setIsSuccess(false);
      return;
    }

    const initialToken = sanitizeAndExtractToken(token);
    if (initialToken) {
      setManualTokenInput(initialToken);
      verifyToken(initialToken);
    } else {
      // Check sessionStorage fallback
      let stored = '';
      try {
        stored = sessionStorage.getItem('pulse_reset_token') || '';
      } catch {}
      if (stored) {
        setManualTokenInput(stored);
        verifyToken(stored);
      } else {
        setVerifying(false);
        setTokenStatus('idle');
        setErrorMessage('');
      }
    }
  }, [isOpen, token, verifyToken]);

  if (!isOpen) return null;

  // Validation criteria
  const hasMinLength = newPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasUppercase && hasSpecialChar && passwordsMatch;

  const handleManualVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) {
      setErrorMessage('Please enter or paste your password reset token.');
      return;
    }
    verifyToken(manualTokenInput.trim());
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const cleaned = sanitizeAndExtractToken(text);
          setManualTokenInput(cleaned);
          verifyToken(cleaned);
        }
      }
    } catch {}
  };

  const handleSubmitNewPassword = async (e: React.FormEvent) => {
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
        token: activeToken,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setIsSuccess(true);
        // Clear stored reset token on successful completion
        try {
          sessionStorage.removeItem('pulse_reset_token');
        } catch {}
      } else {
        setFormError(res.error || 'Failed to reset password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl my-4 text-zinc-900 dark:text-zinc-100">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Loading / Verifying Token State */}
        {verifying && (
          <div className="text-center py-10 space-y-4">
            <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Verifying Security Token...</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Checking cryptographic signature, single-use status, and timestamp.
            </p>
          </div>
        )}

        {/* Token Invalid / Expired / Missing / Manual Entry State */}
        {!verifying && tokenStatus !== 'valid' && !isSuccess && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {tokenStatus === 'expired' 
                  ? 'Reset Token Expired' 
                  : tokenStatus === 'already_used'
                  ? 'Token Already Used'
                  : tokenStatus === 'invalid'
                  ? 'Invalid Reset Token'
                  : 'Enter Reset Token'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {errorMessage || 'Enter or paste the security token sent to your email to choose a new password.'}
              </p>
            </div>

            {/* Error banner if an error occurred */}
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <p className="font-semibold">{errorMessage}</p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    You can paste your token directly below or request a fresh link.
                  </p>
                </div>
              </div>
            )}

            {/* Manual Token Input Form */}
            <form onSubmit={handleManualVerifySubmit} className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Password Reset Token
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span>Paste from Clipboard</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={manualTokenInput}
                    onChange={(e) => {
                      setManualTokenInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Paste 64-character token or reset link"
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Check your inbox for the email titled <em>"Reset your password for PULSE"</em>. You can paste either the token or the full URL.
                </p>
              </div>

              <button
                type="submit"
                disabled={!manualTokenInput.trim() || verifying}
                className="w-full py-2.5 min-h-[42px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed border border-transparent"
              >
                {verifying ? 'Verifying Token...' : 'Verify Token & Continue'}
              </button>
            </form>

            {/* Alternative Action Links */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestNewLink();
                }}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition cursor-pointer border border-zinc-300 dark:border-zinc-700"
              >
                Request a New Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccessReturnToLogin();
                }}
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {!verifying && tokenStatus === 'valid' && isSuccess && (
          <div className="text-center space-y-4 py-2 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Password Reset Complete!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Your password has been successfully updated. All other active sessions have been signed out for your account security.
              </p>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium">
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
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Choose a New Password</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {maskedEmail ? `Resetting password for ${maskedEmail}` : 'Enter and confirm your new secure password.'}
              </p>
              {username && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                  <MailCheck className="w-3 h-3 text-emerald-500" />
                  <span>Account: @{username}</span>
                </div>
              )}
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewPassword} className="space-y-4">
              {/* New Password Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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

              {/* Real-Time Password Requirements Checklist */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 text-[11px]">
                <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Password Requirements:</p>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>At least 6 characters long</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {hasUppercase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {hasSpecialChar ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>At least one special character (!@#$%^&*...)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />}
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="w-full py-3 min-h-[46px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2 border border-transparent"
              >
                {submitting ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setTokenStatus('idle');
                  setActiveToken('');
                  setManualTokenInput('');
                }}
                className="hover:text-amber-500 transition cursor-pointer"
              >
                Use a different token
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccessReturnToLogin();
                }}
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResetPasswordModal;
