import React, { useState, useEffect } from 'react';
import type { User, Group, InvitePreview } from '../types';
import { getInvitePreview, redeemInvite } from '../services/apiService';
import { 
  Users, 
  UserPlus, 
  AlertCircle, 
  LogIn, 
  X,
  Loader2 
} from 'lucide-react';

interface JoinGroupModalProps {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onJoinSuccess: (group: Group) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  token,
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onJoinSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !isOpen) return;

    let isCancelled = false;
    setLoading(true);
    setErrorMessage(null);

    // Save token in sessionStorage so signup/login can use it
    try {
      sessionStorage.setItem('pulse_invite_token', token);
    } catch {}

    getInvitePreview(token).then((data) => {
      if (!isCancelled) {
        setPreview(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!isCancelled) {
        setPreview({
          success: false,
          valid: false,
          reason: 'Unable to reach server. Please check your connection.',
        });
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [token, isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/join')) {
      window.history.replaceState({}, '', '/');
    }
    onClose();
  };

  const handleJoinClick = async () => {
    setIsJoining(true);
    setErrorMessage(null);

    try {
      const res = await redeemInvite(token);
      if (res.success && res.group) {
        sessionStorage.removeItem('pulse_invite_token');
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/');
        }
        onJoinSuccess(res.group);
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to join group');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error redeeming invite');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-2xl p-6 sm:p-8 shadow-2xl my-4 text-center">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#F4F4F5] p-1.5 rounded-lg hover:bg-[#1B1B20] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-[#D98B4A] animate-spin mx-auto" />
            <p className="text-xs text-[#A1A1AA]">Validating invite link...</p>
          </div>
        ) : !preview?.valid ? (
          /* Invalid / Expired State */
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F4F4F5]">Invite Link Unavailable</h3>
              <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                {preview?.reason || 'This invite link is invalid, expired, or has reached its usage limit.'}
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full py-3 px-4 min-h-[44px] bg-[#1B1B20] hover:bg-[#26262C] text-[#F4F4F5] font-bold rounded-xl text-xs transition border border-[#26262C] cursor-pointer"
            >
              Continue to App
            </button>
          </div>
        ) : (
          /* Valid Invite State */
          <div className="space-y-5 py-2">
            <div className="w-16 h-16 rounded-[14px] bg-[#EFF8FF] border border-[#3157D5]/20 flex items-center justify-center mx-auto text-[#3157D5] shadow-sm">
              <Users className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <p className="text-xs text-[#3157D5] font-semibold tracking-wide uppercase">
                Group Invitation
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-[#111827] mt-1">
                {preview.groupName}
              </h3>
              <p className="text-xs text-[#667085] mt-1.5">
                <strong>{preview.inviterName}</strong> invited you to join their fitness group.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F3F6] border border-[#E4E7EC] text-[11px] text-[#667085] mt-3">
                <Users className="w-3.5 h-3.5 text-[#3157D5]" />
                <span>{preview.memberCount} member{preview.memberCount === 1 ? '' : 's'} in this group</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {currentUser ? (
              /* User is logged in: Show Join button */
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleJoinClick}
                  disabled={isJoining}
                  className="w-full py-3 px-5 min-h-[46px] bg-[#3157D5] hover:bg-[#2544B8] text-white font-semibold rounded-[10px] text-sm transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isJoining ? 'Joining Group...' : 'Join Group'}</span>
                </button>

                <p className="text-[11px] text-[#667085]">
                  Logged in as <strong>{currentUser.name}</strong> (@{currentUser.username})
                </p>
              </div>
            ) : (
              /* User not logged in: Show Signup & Login triggers */
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onOpenAuth('register');
                  }}
                  className="w-full py-3 px-5 min-h-[46px] bg-[#3157D5] hover:bg-[#2544B8] text-white font-semibold rounded-[10px] text-sm transition shadow-sm cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up to Join Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onOpenAuth('login');
                  }}
                  className="w-full py-2.5 px-4 min-h-[44px] bg-white hover:bg-[#F1F3F6] text-[#344054] font-semibold rounded-[10px] text-xs transition border border-[#D0D5DD] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#3157D5]" />
                  <span>Already have an account? Sign In</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
