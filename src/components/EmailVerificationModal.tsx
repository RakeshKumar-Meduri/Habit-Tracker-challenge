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
      <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-2xl p-6 sm:p-8 shadow-2xl text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1B1B20] rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* --- 1. Verifying State --- */}
        {viewState === 'verifying' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#D98B4A]/10 border border-[#D98B4A]/20 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-[#D98B4A] animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-[#F4F4F5] mb-2">Verifying Your Email</h3>
            <p className="text-sm text-[#A1A1AA]">
              Validating your secure verification token with the PULSE server...
            </p>
          </div>
        )}

        {/* --- 2. Success State --- */}
        {viewState === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">Email Verified!</h3>
            <p className="text-sm text-[#A1A1AA] mb-6">
              {message || 'Your email address is now officially verified. You have full access to PULSE Pro upgrades and payment receipts.'}
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] text-white font-bold rounded-xl shadow-lg shadow-[#D98B4A]/25 hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              <span>Continue to App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* --- 3. Expired State --- */}
        {viewState === 'expired' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">Verification Link Expired</h3>
            <p className="text-sm text-[#A1A1AA] mb-6">
              For your account security, verification links expire after 24 hours. Request a new link below to complete verification.
            </p>

            {statusNotice && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl">
                {statusNotice}
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={isSubmitting || cooldown > 0}
              className="w-full py-3 bg-[#1B1B20] border border-[#D98B4A]/40 text-[#D98B4A] font-bold rounded-xl hover:bg-[#D98B4A]/10 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{cooldown > 0 ? `Resend Available in ${cooldown}s` : 'Resend Verification Link'}</span>
            </button>
          </div>
        )}

        {/* --- 4. Invalid Link State --- */}
        {viewState === 'invalid' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#F4F4F5] mb-2">Invalid Verification Link</h3>
            <p className="text-sm text-[#A1A1AA] mb-6">
              {message || 'This verification link is invalid, already consumed, or improperly formatted.'}
            </p>

            {statusNotice && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl">
                {statusNotice}
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={isSubmitting || cooldown > 0}
              className="w-full py-3 bg-[#1B1B20] border border-[#26262C] text-[#F4F4F5] font-semibold rounded-xl hover:bg-[#26262C] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{cooldown > 0 ? `Wait ${cooldown}s` : 'Send Fresh Verification Email'}</span>
            </button>
          </div>
        )}

        {/* --- 5. Check Inbox / Setup State --- */}
        {viewState === 'check_inbox' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#D98B4A]/10 border border-[#D98B4A]/20 flex items-center justify-center text-[#D98B4A]">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#F4F4F5]">Verify Your Email</h3>
                <p className="text-xs text-[#A1A1AA]">Required for receipts and Pro features</p>
              </div>
            </div>

            {currentUser?.email ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#1B1B20] border border-[#26262C] rounded-xl text-sm">
                  <div className="text-xs text-[#71717A] mb-1">Confirmation sent to:</div>
                  <div className="font-semibold text-[#F4F4F5] flex items-center gap-2">
                    <span>{currentUser.email}</span>
                    {currentUser.email_verified ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">Verified</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">Unverified</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  We've emailed you a single-use verification link. Please click the link in your inbox to confirm your account.
                </p>

                {statusNotice && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{statusNotice}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleResend}
                    disabled={isSubmitting || cooldown > 0}
                    className="w-full py-2.5 bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#D98B4A]/25 hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{cooldown > 0 ? `Resend Link in ${cooldown}s` : 'Resend Verification Email'}</span>
                  </button>

                  <button
                    onClick={() => setViewState('expired')}
                    className="text-xs text-[#71717A] hover:text-[#A1A1AA] py-1 transition text-center"
                  >
                    Need to change your email address?
                  </button>
                </div>
              </div>
            ) : (
              /* Onboarding form for legacy account without email */
              <form onSubmit={handleSaveAndSendEmail} className="space-y-4">
                <p className="text-xs text-[#A1A1AA]">
                  Your account currently doesn't have an email address linked. Add one to enable receipts and paid upgrades.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. athlete@example.com"
                    className="w-full px-3 py-2 bg-[#1B1B20] border border-[#26262C] rounded-xl text-[#F4F4F5] text-sm focus:outline-none focus:border-[#D98B4A]"
                    required
                  />
                </div>

                {statusNotice && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl">
                    {statusNotice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !emailInput.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-[#D98B4A] to-[#B45F1E] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#D98B4A]/25 hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Save Email & Send Verification</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
