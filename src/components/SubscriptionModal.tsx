import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Check, 
  X, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  fetchSubscriptionPlans, 
  initiateSubscriptionCheckout, 
  type Plan, 
  type Subscription 
} from '../services/paymentService';
import type { User } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentTier?: 'none' | 'base' | 'pro';
  activeSubscription?: Subscription | null;
  onSubscriptionSuccess: (sub: Subscription) => void;
  forcePaywall?: boolean; // If user has no active plan, modal cannot be simply closed without choosing
  highlightPro?: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTier = 'none',
  activeSubscription,
  onSubscriptionSuccess,
  forcePaywall = false,
  highlightPro = false,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan_pro_monthly');
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsLoadingPlans(true);
      setErrorMessage('');
      fetchSubscriptionPlans()
        .then((fetchedPlans) => {
          if (fetchedPlans.length > 0) {
            setPlans(fetchedPlans);
            // Default selection based on intent
            if (currentTier === 'base' || highlightPro) {
              const proMonthly = fetchedPlans.find(p => p.id === 'plan_pro_monthly');
              if (proMonthly) setSelectedPlanId(proMonthly.id);
            } else if (currentTier === 'none') {
              const basePlan = fetchedPlans.find(p => p.id === 'plan_base_monthly');
              if (basePlan) setSelectedPlanId(basePlan.id);
            }
          }
        })
        .finally(() => setIsLoadingPlans(false));
    }
  }, [isOpen, highlightPro, currentTier]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!selectedPlanId) return;
    setIsProcessing(true);
    setErrorMessage('');

    await initiateSubscriptionCheckout(
      selectedPlanId,
      currentUser,
      (newSubscription) => {
        setIsProcessing(false);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D98B4A', '#FBBF24', '#10B981'],
          });
        } catch {}
        onSubscriptionSuccess(newSubscription);
        onClose();
      },
      (error) => {
        setIsProcessing(false);
        setErrorMessage(error || 'Failed to complete payment. Please try again.');
      }
    );
  };

  const basePlan = plans.find(p => p.id === 'plan_base_monthly') || {
    id: 'plan_base_monthly',
    name: 'PULSE Base (Free)',
    price: 0,
    currency: 'INR',
    duration: 'monthly',
  };

  const proMonthly = plans.find(p => p.id === 'plan_pro_monthly') || {
    id: 'plan_pro_monthly',
    name: 'PULSE Pro Monthly',
    price: 9900,
    currency: 'INR',
    duration: 'monthly',
  };

  const proYearly = plans.find(p => p.id === 'plan_pro_yearly') || {
    id: 'plan_pro_yearly',
    name: 'PULSE Pro Yearly',
    price: 99900,
    currency: 'INR',
    duration: 'yearly',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-[#131316] border border-[#26262C] rounded-2xl p-5 sm:p-8 shadow-2xl my-auto text-[#F4F4F5] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (only if not forced paywall) */}
        {!forcePaywall && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1B1B20] rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D98B4A]/10 border border-[#D98B4A]/30 rounded-full text-[#D98B4A] text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            <span>PULSE Membership Plans</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            {forcePaywall 
              ? 'Choose Your Membership to Continue' 
              : currentTier === 'base'
              ? 'Upgrade to PULSE Pro for Group Features'
              : 'Choose the Plan that Fits Your Journey'}
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            {forcePaywall 
              ? 'Solo tracking is 100% Free forever. Unlock team groups and head-to-head challenges with Pro.'
              : 'Solo tracking is 100% Free forever. Upgrade to Pro for team groups & head-to-head battles.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoadingPlans ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#A1A1AA]">
            <Loader2 className="w-8 h-8 animate-spin text-[#D98B4A]" />
            <p className="text-xs font-semibold">Loading membership options...</p>
          </div>
        ) : (() => {
          const isBaseCurrent = currentTier === 'base';
          const isProMonthlyCurrent = currentTier === 'pro' && activeSubscription?.plan_id === proMonthly.id;
          const isProYearlyCurrent = currentTier === 'pro' && (activeSubscription?.plan_id === proYearly.id || (!isProMonthlyCurrent && currentTier === 'pro'));
          const isSelectedPlanCurrent =
            (selectedPlanId === basePlan.id && isBaseCurrent) ||
            (selectedPlanId === proMonthly.id && isProMonthlyCurrent) ||
            (selectedPlanId === proYearly.id && isProYearlyCurrent);

          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                
                {/* 1. BASE PLAN (Solo) */}
                <div 
                  onClick={() => setSelectedPlanId(basePlan.id)}
                  className={`relative flex flex-col justify-between rounded-xl p-5 border transition-all cursor-pointer ${
                    selectedPlanId === basePlan.id
                      ? 'bg-[#18181C] border-[#D98B4A] shadow-lg shadow-[#D98B4A]/10 ring-2 ring-[#D98B4A]/40'
                      : 'bg-[#16161A] border-[#26262C] hover:border-[#3F3F46]'
                  }`}
                >
                  {isBaseCurrent && (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                      ✓ Current Plan
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">Solo Tracker</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedPlanId === basePlan.id ? 'border-[#D98B4A] bg-[#D98B4A]' : 'border-[#3F3F46]'
                      }`}>
                        {selectedPlanId === basePlan.id && <div className="w-1.5 h-1.5 bg-[#0B0B0D] rounded-full" />}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#F4F4F5] mb-1">Base Plan</h3>
                    <p className="text-xs text-[#71717A] mb-4">Dedicated personal fitness & habit tracking for solo users.</p>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-extrabold text-[#F4F4F5]">Free</span>
                      <span className="text-xs text-[#71717A]">/ forever (₹0)</span>
                    </div>

                    <div className="space-y-2.5 text-xs border-t border-[#26262C] pt-4 mb-4">
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Daily Checklist & Habit Logs</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Workout Logging & Sets</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Body Weight & BMI Analytics</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Custom Habits & Supplements</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#71717A] line-through">
                        <X className="w-4 h-4 text-[#52525B] shrink-0" />
                        <span>No Group Creation or Joining</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#71717A] line-through">
                        <X className="w-4 h-4 text-[#52525B] shrink-0" />
                        <span>No Head-to-Head Battles</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#71717A] line-through">
                        <X className="w-4 h-4 text-[#52525B] shrink-0" />
                        <span>No Team Rankings & Leaderboards</span>
                      </div>
                    </div>
                  </div>

                  {isBaseCurrent ? (
                    <div className="text-[11px] font-bold text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 py-1.5 rounded-lg flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Your Current Plan (Free)</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 rounded-lg">
                      Free Forever
                    </div>
                  )}
                </div>

                {/* 2. PRO MONTHLY */}
                <div 
                  onClick={() => setSelectedPlanId(proMonthly.id)}
                  className={`relative flex flex-col justify-between rounded-xl p-5 border transition-all cursor-pointer ${
                    selectedPlanId === proMonthly.id
                      ? 'bg-[#18181C] border-[#D98B4A] shadow-lg shadow-[#D98B4A]/10 ring-2 ring-[#D98B4A]/40'
                      : 'bg-[#16161A] border-[#26262C] hover:border-[#3F3F46]'
                  }`}
                >
                  {isProMonthlyCurrent && (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                      ✓ Current Plan
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#D98B4A] uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Group & Team
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedPlanId === proMonthly.id ? 'border-[#D98B4A] bg-[#D98B4A]' : 'border-[#3F3F46]'
                      }`}>
                        {selectedPlanId === proMonthly.id && <div className="w-1.5 h-1.5 bg-[#0B0B0D] rounded-full" />}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#F4F4F5] mb-1">Pro Monthly</h3>
                    <p className="text-xs text-[#71717A] mb-4">Form groups with friends, add unlimited members, and compete.</p>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-extrabold text-[#F4F4F5]">₹{proMonthly.price / 100}</span>
                      <span className="text-xs text-[#71717A]">/ month</span>
                    </div>

                    <div className="space-y-2.5 text-xs border-t border-[#26262C] pt-4 mb-4">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 font-semibold">
                        <Sparkles className="w-4 h-4 text-[#D98B4A] shrink-0" />
                        <span>Everything in Base Plan</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Invite Friends & Add Members</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Badges & Milestone Achievements</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Team Daily Goals & Progress Bars</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Head-to-Head 1v1 Battles</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Team Rankings & Leaderboard</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Group Clean Sweep Challenge</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-center text-[#D98B4A] bg-[#D98B4A]/10 border border-[#D98B4A]/20 py-1.5 rounded-lg">
                    Group Member Requirement: Pro Plan
                  </div>
                </div>

                {/* 3. PRO YEARLY (Best Value) */}
                <div 
                  onClick={() => setSelectedPlanId(proYearly.id)}
                  className={`relative flex flex-col justify-between rounded-xl p-5 border transition-all cursor-pointer ${
                    selectedPlanId === proYearly.id
                      ? 'bg-[#18181C] border-[#D98B4A] shadow-lg shadow-[#D98B4A]/10 ring-2 ring-[#D98B4A]/40'
                      : 'bg-[#16161A] border-[#26262C] hover:border-[#3F3F46]'
                  }`}
                >
                  {isProYearlyCurrent ? (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                      ✓ Current Plan
                    </div>
                  ) : (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                      Best Value • 16% OFF
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#D98B4A] uppercase tracking-wider flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" /> Annual Full Access
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedPlanId === proYearly.id ? 'border-[#D98B4A] bg-[#D98B4A]' : 'border-[#3F3F46]'
                      }`}>
                        {selectedPlanId === proYearly.id && <div className="w-1.5 h-1.5 bg-[#0B0B0D] rounded-full" />}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-[#F4F4F5] mb-1">Pro Yearly</h3>
                    <p className="text-xs text-[#71717A] mb-4">Complete 1-year access to all features with maximum savings.</p>

                    <div className="flex items-baseline gap-1 mb-5">
                      <span className="text-3xl font-extrabold text-[#F4F4F5]">₹{proYearly.price / 100}</span>
                      <span className="text-xs text-[#71717A]">/ year (~₹83/mo)</span>
                    </div>

                    <div className="space-y-2.5 text-xs border-t border-[#26262C] pt-4 mb-4">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 font-semibold">
                        <Sparkles className="w-4 h-4 text-[#D98B4A] shrink-0" />
                        <span>All Pro Features Included</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>1 Full Year (365 Days) Uninterrupted</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Unlimited Groups & Invites</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Badges, Milestones & Team Challenges</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Team Goals, Head-to-Head & Leaderboard</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#E4E4E7]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Priority Pro Crown Badge on Profile</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-center text-[#D98B4A] bg-[#D98B4A]/10 border border-[#D98B4A]/20 py-1.5 rounded-lg">
                    Save ₹189 vs Monthly Billing
                  </div>
                </div>

              </div>

              {/* Security & Payment Footer */}
              <div className="border-t border-[#26262C] pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-[#71717A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Secured with Razorpay 256-bit encryption (UPI, Cards, NetBanking)</span>
                </div>

                <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-1">
                  {isSelectedPlanCurrent ? (
                    <button
                      disabled={true}
                      className="w-full sm:w-auto px-7 py-3 bg-[#1B1B20] text-emerald-400 border border-emerald-500/30 font-extrabold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Currently Active Plan</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessing || isLoadingPlans}
                      className="w-full sm:w-auto px-7 py-3 min-h-[46px] bg-[#3157D5] hover:bg-[#2544B8] disabled:opacity-50 text-white font-semibold text-sm rounded-[10px] transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Launching Razorpay...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {selectedPlanId === 'plan_base_monthly'
                              ? 'Start Free Solo Tracking'
                              : selectedPlanId === 'plan_pro_monthly'
                              ? (isBaseCurrent ? 'Upgrade to Pro Monthly (₹99/mo)' : 'Unlock Pro Groups (₹99/mo)')
                              : (isBaseCurrent ? 'Upgrade to Pro Yearly (₹999/yr)' : 'Activate Pro Yearly (₹999/yr)')}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                  {isSelectedPlanCurrent && isBaseCurrent && (
                    <p className="text-[11px] text-amber-400/90 text-center sm:text-right">
                      Select Pro Monthly or Pro Yearly to upgrade to team & group features.
                    </p>
                  )}
                </div>
              </div>
            </>
          );
        })()}

      </div>
    </div>
  );
};
