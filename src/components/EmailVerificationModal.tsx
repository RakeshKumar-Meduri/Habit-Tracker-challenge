import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Send,
  Pencil
} from 'lucide-react';
import type { User } from '../types';
import { 
  verifyEmailOnServer, 
  resendVerificationEmail, 
  setUserEmail 
} from '../services/apiService';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  initialToken?: string | null;
  initialMode?: 'verify' | 'change';
  onEmailVerified?: (updatedUser: Partial<User>) => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialToken,
  initialMode = 'verify',
  onEmailVerified,
}) => {
  const [viewState, setViewState] = useState<
    'verifying' | 'success' | 'expired' | 'invalid' | 'check_inbox' | 'change_email'
  >(initialToken ? 'verifying' : (initialMode === 'change' || !currentUser?.email ? 'change_email' : 'check_inbox'));

  const [message, setMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [emailInput, setEmailInput] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string>('');

  // Handle token verification on mount or when initialToken/initialMode/isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialToken) {
      setViewState('verifying');
      verifyEmailOnServer(initialToken).then((res) => {
        if (res.success && res.status === 'verified') {
          setViewState('success');
          setMessage(res.message || 'Email verified successfully!');
          if (onEmailVerified && res.user) {
            onEmailVerified({ email_verified: true, ...res.user });
          }
        } else if (res.status === 'expired') {
          setViewState('expired');
          setMessage(res.message || 'This verification link has expired (24h limit).');
        } else if (res.status === 'already_used') {
          setViewState('success');
          setMessage('This email has already been verified! You are good to go.');
          if (onEmailVerified) {
            onEmailVerified({ email_verified: true });
          }
        } else {
          setViewState('invalid');
          setMessage(res.message || 'The verification link is invalid or malformed.');
        }
      });
    } else {
      if (initialMode === 'change' || !currentUser?.email) {
        setViewState('change_email');
        setEmailInput('');
      } else {
        setViewState('check_inbox');
        setEmailInput(currentUser.email);
      }
      setStatusNotice('');
      setErrorMessage('');
    }
  }, [initialToken, isOpen, initialMode, currentUser?.email]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsSubmitting(true);
    setStatusNotice('');
    setErrorMessage('');

    try {
      const res = await resendVerificationEmail(currentUser?.email || emailInput || undefined);
      if (res.success) {
        setStatusNotice(res.message || 'Verification link sent! Please check your inbox.');
        setCooldown(60); // 60s rate limit cooldown
      } else {
        setErrorMessage(res.message || 'Failed to send verification link.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) return;

    if (currentUser?.email && cleanEmail === currentUser.email.toLowerCase()) {
      setErrorMessage(
        'This is already your current email address. If you need a verification link, choose Resend Verification.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setStatusNotice('');
    setErrorMessage('');

    try {
      const res = await setUserEmail(cleanEmail);
      if (res.success) {
        setStatusNotice(res.message || 'Email updated! Verification link sent to your new address.');
        setCooldown(60);
        if (onEmailVerified && res.user) {
          onEmailVerified(res.user);
        }
        setViewState('check_inbox');
      } else {
        setErrorMessage(res.error || 'Failed to update email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while updating email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-left text-zinc-900 dark:text-zinc-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* --- 1. Verifying State --- */}
        {viewState === 'verifying' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-zinc-900 dark:text-zinc-100 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Verifying Your Email</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Validating your secure verification token with the PULSE server...
            </p>
          </div>
        )}

        {/* --- 2. Success State --- */}
        {viewState === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Email Verified!</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {message || 'Your email address is now officially verified. You have full access to PULSE Pro upgrades and payment receipts.'}
            </p>

            <button
              onClick={onClose}
              id="continue-to-app-btn"
              className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 text-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950"
            >
              <span className="font-bold">Continue to App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* --- 3. Expired State --- */}
        {viewState === 'expired' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Verification Link Expired</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              For your account security, verification links expire after 24 hours. Request a new link below or enter a different email.
            </p>

            {statusNotice && (
              <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{statusNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleResend}
                disabled={isSubmitting || cooldown > 0}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-zinc-950" />
                ) : (
                  <Send className="w-4 h-4 text-white dark:text-zinc-950" />
                )}
                <span className="text-white dark:text-zinc-950">
                  {cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Resend Verification Link'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailInput('');
                  setErrorMessage('');
                  setStatusNotice('');
                  setViewState('change_email');
                }}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Change Email Address</span>
              </button>
            </div>
          </div>
        )}

        {/* --- 4. Invalid Link State --- */}
        {viewState === 'invalid' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Invalid Verification Link</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {message || 'This verification link is invalid, already consumed, or improperly formatted.'}
            </p>

            {statusNotice && (
              <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{statusNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleResend}
                disabled={isSubmitting || cooldown > 0}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950"
              >
                <span className="text-white dark:text-zinc-950">
                  {cooldown > 0 ? `Wait ${cooldown}s` : 'Send Fresh Verification Email'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmailInput('');
                  setErrorMessage('');
                  setStatusNotice('');
                  setViewState('change_email');
                }}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Change Email Address</span>
              </button>
            </div>
          </div>
        )}

        {/* --- 5. Change / Enter Email State --- */}
        {viewState === 'change_email' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {currentUser?.email ? 'Change Email Address' : 'Add Email Address'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {currentUser?.email
                    ? 'Enter your new email. We will send a link to verify it.'
                    : 'Required for invoices, recovery, and Pro subscriptions.'}
                </p>
              </div>
            </div>

            {currentUser?.email && (
              <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Current linked email:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate ml-2">
                  {currentUser.email}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveAndSendEmail} className="space-y-4">
              <div>
                <label htmlFor="modal-email-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {currentUser?.email ? 'New Email Address' : 'Email Address'}
                </label>
                <input
                  id="modal-email-input"
                  type="email"
                  required
                  autoFocus
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="e.g. athlete@example.com"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {statusNotice && (
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{statusNotice}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {currentUser?.email && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setStatusNotice('');
                      setViewState('check_inbox');
                    }}
                    className="w-1/3 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  id="submit-email-change-btn"
                  disabled={isSubmitting || !emailInput.trim()}
                  className={`${currentUser?.email ? 'w-2/3' : 'w-full'} py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-zinc-950" />
                  ) : (
                    <Send className="w-4 h-4 text-white dark:text-zinc-950" />
                  )}
                  <span className="text-white dark:text-zinc-950">
                    {currentUser?.email ? 'Update & Send Link' : 'Save & Send Verification'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- 6. Check Inbox / Verification Status State --- */}
        {viewState === 'check_inbox' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {currentUser?.email_verified ? 'Email Status' : 'Verify Your Email'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {currentUser?.email_verified
                    ? 'Verified email connected to your account'
                    : 'Required for receipts and Pro features'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  {currentUser?.email_verified ? 'Active account email:' : 'Confirmation sent to:'}
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between gap-2">
                  <span className="truncate">{currentUser?.email || emailInput}</span>
                  {currentUser?.email_verified ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" /> Unverified
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {currentUser?.email_verified
                  ? 'Your email address is verified. All billing receipts and critical notifications are delivered here.'
                  : "We've emailed you a single-use verification link. Please click the link in your inbox to confirm your account."}
              </p>

              {statusNotice && (
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{statusNotice}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                {!currentUser?.email_verified && (
                  <button
                    onClick={handleResend}
                    disabled={isSubmitting || cooldown > 0}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-zinc-950" />
                    ) : (
                      <Send className="w-4 h-4 text-white dark:text-zinc-950" />
                    )}
                    <span className="text-white dark:text-zinc-950">
                      {cooldown > 0 ? `Resend Link in ${cooldown}s` : 'Resend Verification Email'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  id="open-change-email-form-btn"
                  onClick={() => {
                    setEmailInput('');
                    setErrorMessage('');
                    setStatusNotice('');
                    setViewState('change_email');
                  }}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Change Email Address</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
