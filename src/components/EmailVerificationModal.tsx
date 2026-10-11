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
  Send
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
  onEmailVerified?: (updatedUser: Partial<User>) => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialToken,
  onEmailVerified,
}) => {
  const [viewState, setViewState] = useState<'verifying' | 'success' | 'expired' | 'invalid' | 'check_inbox'>(
    initialToken ? 'verifying' : 'check_inbox'
  );
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [emailInput, setEmailInput] = useState<string>(currentUser?.email || '');
  const [statusNotice, setStatusNotice] = useState<string>('');

  // Handle token verification on mount or when initialToken changes
  useEffect(() => {
    if (initialToken && isOpen) {
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
    } else if (isOpen) {
      setViewState('check_inbox');
      if (currentUser?.email) {
        setEmailInput(currentUser.email);
      }
    }
  }, [initialToken, isOpen]);

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

    try {
      const res = await resendVerificationEmail(currentUser?.email || emailInput || undefined);
      if (res.success) {
        setStatusNotice(res.message || 'Verification link sent! Please check your inbox.');
        setCooldown(60); // 60s rate limit cooldown
      } else {
        setStatusNotice(res.message || 'Failed to send verification link.');
      }
    } catch (err: any) {
      setStatusNotice(err.message || 'Failed to resend email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubmitting(true);
    setStatusNotice('');

    try {
      const res = await setUserEmail(emailInput.trim().toLowerCase());
      if (res.success) {
        setStatusNotice(res.message || 'Email updated and verification link sent!');
        setCooldown(60);
        if (onEmailVerified && res.user) {
          onEmailVerified(res.user);
        }
      } else {
        setStatusNotice(res.error || 'Failed to update email.');
      }
    } catch (err: any) {
      setStatusNotice(err.message || 'An error occurred.');
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
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
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
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Email Verified!</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {message || 'Your email address is now officially verified. You have full access to PULSE Pro upgrades and payment receipts.'}
            </p>

            <button
              onClick={onClose}
              id="continue-to-app-btn"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-contrast)',
              }}
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
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Verification Link Expired</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              For your account security, verification links expire after 24 hours. Request a new link below to complete verification.
            </p>

            {statusNotice && (
              <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl">
                {statusNotice}
              </div>
            )}

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
              <span className="text-white dark:text-zinc-950">{cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Resend Verification Link'}</span>
            </button>
          </div>
        )}

        {/* --- 4. Invalid Link State --- */}
        {viewState === 'invalid' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Invalid Verification Link</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {message || 'This verification link is invalid, already consumed, or improperly formatted.'}
            </p>

            {statusNotice && (
              <div className="mb-4 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl">
                {statusNotice}
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={isSubmitting || cooldown > 0}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950"
            >
              <span className="text-white dark:text-zinc-950">{cooldown > 0 ? `Wait ${cooldown}s` : 'Send Fresh Verification Email'}</span>
            </button>
          </div>
        )}

        {/* --- 5. Check Inbox / Setup State --- */}
        {viewState === 'check_inbox' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Verify Your Email</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Required for receipts and Pro features</p>
              </div>
            </div>

            {currentUser?.email ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Confirmation sent to:</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>{currentUser.email}</span>
                    {currentUser.email_verified ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold">Verified</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold">Unverified</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  We've emailed you a single-use verification link. Please click the link in your inbox to confirm your account.
                </p>

                {statusNotice && (
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{statusNotice}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
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
                    <span className="text-white dark:text-zinc-950">{cooldown > 0 ? `Resend Link in ${cooldown}s` : 'Resend Verification Email'}</span>
                  </button>

                  <button
                    onClick={() => setViewState('expired')}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-1 transition text-center cursor-pointer"
                  >
                    Need to change your email address?
                  </button>
                </div>
              </div>
            ) : (
              /* Onboarding form for legacy account without email */
              <form onSubmit={handleSaveAndSendEmail} className="space-y-4">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Your account currently doesn't have an email address linked. Add one to enable receipts and paid upgrades.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. athlete@example.com"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
                    required
                  />
                </div>

                {statusNotice && (
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl">
                    {statusNotice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !emailInput.trim()}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm !bg-zinc-900 dark:!bg-zinc-100 !text-white dark:!text-zinc-950"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-zinc-950" /> : <Send className="w-4 h-4 text-white dark:text-zinc-950" />}
                  <span className="text-white dark:text-zinc-950">Save Email & Send Verification</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
