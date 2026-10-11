import React, { useState } from 'react';
import type { Group, Invite } from '../types';
import { 
  X, 
  UserPlus, 
  Copy, 
  Check, 
  Share2, 
  Trash2, 
  Clock, 
  Users, 
  AlertCircle,
  Crown
} from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  myRole: 'owner' | 'member';
  invites: Invite[];
  onCreateInvite: (options: { expiresInDays?: number; maxUses?: number }) => Promise<{ success: boolean; token?: string; url?: string; error?: string }>;
  onRevokeInvite: (token: string) => Promise<boolean>;
  isBasePlan?: boolean;
  onOpenUpgradeModal?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  group,
  myRole,
  invites,
  onCreateInvite,
  onRevokeInvite,
  isBasePlan = false,
  onOpenUpgradeModal,
}) => {
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [maxUses, setMaxUses] = useState<number>(10);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOwner = myRole === 'owner';
  const activeInvites = (invites || []).filter(i => !i.revoked && new Date(i.expires_at) > new Date());

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBasePlan) {
      onClose();
      onOpenUpgradeModal?.();
      return;
    }
    setErrorMsg(null);
    setIsCreating(true);
    try {
      const res = await onCreateInvite({ expiresInDays, maxUses });
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create invite link');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating invite');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      // Fallback prompt if clipboard API blocked
      window.prompt('Copy invite link:', url);
    }
  };

  const handleShareWhatsApp = async (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/join/${token}`;
    const groupName = group?.name || 'PULSE Group';
    const text = `Join my fitness accountability group "${groupName}" on PULSE!\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on PULSE`,
          text,
          url,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('[Share fallback]', err);
        } else {
          return;
        }
      }
    }

    // WhatsApp Web / Universal fallback
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRevoke = async (token: string) => {
    if (!window.confirm('Are you sure you want to revoke this invite link? Anyone who has not used it yet will not be able to join.')) {
      return;
    }
    setRevokingToken(token);
    setErrorMsg(null);
    try {
      const ok = await onRevokeInvite(token);
      if (!ok) {
        setErrorMsg('Failed to revoke invite link');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error revoking invite');
    } finally {
      setRevokingToken(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl my-4 text-zinc-900 dark:text-zinc-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Invite to {group?.name || 'Group'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Generate tokenized invite links with expiration and usage limits to add members
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Create Link Section / Pro Paywall */}
        {isBasePlan ? (
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 mb-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 mx-auto shadow-sm">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
                PULSE Pro Exclusive
              </span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                Group Invites Require PULSE Pro
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                Inviting friends, generating links, and squad accountability are exclusively available on PULSE Pro. Upgrade to invite unlimited friends.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpgradeModal?.();
              }}
              className="px-5 py-2.5 min-h-[38px] btn-primary font-bold rounded-lg text-xs transition cursor-pointer shadow-sm inline-flex items-center gap-1.5 active:scale-95"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Upgrade to PULSE Pro</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-5 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Create New Invite Link
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Expires In
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  <option value={1}>1 Day (24 hrs)</option>
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days (Recommended)</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Max Uses
                </label>
                <select
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                >
                  <option value={1}>1 Person (Single-use)</option>
                  <option value={5}>5 People</option>
                  <option value={10}>10 People (Recommended)</option>
                  <option value={25}>25 People</option>
                  <option value={50}>50 People</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 px-4 min-h-[38px] btn-primary font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Creating Link...' : 'Generate Invite Link'}</span>
            </button>
          </form>
        )}

        {/* Active Invites List */}
        <div>
          <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Active Invite Links ({activeInvites.length})</span>
          </h4>

          {activeInvites.length === 0 ? (
            <div className="bg-slate-50 dark:bg-[#1B1B20]/60 border border-slate-200 dark:border-[#26262C] rounded-xl p-5 text-center space-y-1.5">
              <p className="text-xs text-slate-800 dark:text-[#F4F4F5] font-medium">No active invite links</p>
              <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA]">
                {isBasePlan
                  ? 'Upgrade to PULSE Pro to generate and share group invite links.'
                  : isOwner 
                    ? 'Generate a link above to invite friends to your group.' 
                    : 'Ask the group owner to generate an invite link.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {activeInvites.map((inv) => {
                const url = `${window.location.origin}/join/${inv.token}`;
                const isCopied = copiedToken === inv.token;
                const daysLeft = Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                return (
                  <div
                    key={inv.token}
                    className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 text-zinc-900 dark:text-zinc-100"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-900 dark:text-zinc-100" /> {daysLeft}d left
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-zinc-900 dark:text-zinc-100" /> {inv.uses}/{inv.max_uses} used
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevoke(inv.token)}
                        disabled={revokingToken === inv.token}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-200/60 dark:bg-zinc-700/60 border border-zinc-300 dark:border-zinc-600 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                        title="Revoke this invite link immediately"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{revokingToken === inv.token ? 'Revoking...' : 'Revoke'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={url}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 font-mono truncate focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleCopyLink(inv.token)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                          isCopied 
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100' 
                            : 'btn-secondary'
                        }`}
                        title="Copy invite URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(inv.token)}
                        className="px-3 py-1.5 btn-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 shadow-sm"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-5 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Members who join your group will share real-time workouts, leaderboards, and daily accountability.
          </p>
        </div>

      </div>
    </div>
  );
};
