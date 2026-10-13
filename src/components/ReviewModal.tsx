import React, { useState, useEffect } from 'react';
import type { UserReview } from '../types';
import { 
  Star, 
  X, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquareHeart,
  Lock
} from 'lucide-react';
import { submitReview } from '../services/apiService';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingReview?: UserReview | null;
  onReviewSubmitted: (review: UserReview) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  existingReview,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (!existingReview) {
        setRating(5);
        setComment('');
      }
      setErrorMsg(null);
      setIsSuccess(false);
      setSuccessMsg('');
    }
  }, [isOpen, existingReview]);

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Business rule: editing is disallowed
    if (existingReview) {
      setErrorMsg('Reviews cannot be edited once submitted.');
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      setErrorMsg('Please write a short comment about your experience.');
      return;
    }
    if (trimmed.length > 1000) {
      setErrorMsg('Comment cannot exceed 1,000 characters.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMsg('Please select a star rating between 1 and 5.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReview(rating, trimmed);
      if (res.success && res.review) {
        setIsSuccess(true);
        setSuccessMsg(res.message || 'Thank you for your feedback! Your review has been saved.');
        onReviewSubmitted(res.review);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (res.isDuplicate) {
        setErrorMsg('You have already submitted a review. Reviews cannot be edited.');
      } else {
        setErrorMsg(res.error || 'Failed to submit review. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving your review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl my-4 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          aria-label="Close review modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* Success Confirmation View */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Thank You!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                {successMsg}
              </p>
            </div>
            <div className="flex items-center justify-center gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= rating
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-zinc-300 dark:text-zinc-700'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : existingReview ? (
          /* Read-Only Submitted Review View (Editing is strictly disabled) */
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2 pr-6">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Your PULSE Review
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Thank you for your feedback! Reviews cannot be edited once submitted.
                </p>
              </div>
            </div>

            {/* Rating Display */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center space-y-2">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block uppercase tracking-wider">
                Rating Given
              </label>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= existingReview.rating
                        ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {existingReview.rating} / 5 Stars &mdash; {RATING_LABELS[existingReview.rating] || 'Rated'}
              </p>
            </div>

            {/* Comment Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Your Feedback
              </label>
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {existingReview.comment}
              </div>
            </div>

            {/* Locked Info Badge */}
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Review has been permanently recorded. Further edits are disabled.</span>
            </div>

            {/* Action */}
            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 btn-secondary rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* New Review Submission Form */
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  How is your experience with PULSE?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  We value your feedback. Let us know how PULSE is helping your fitness journey.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Star Rating Section */}
              <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center space-y-2">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block uppercase tracking-wider">
                  Rate PULSE (1 to 5 Stars)
                </label>
                <div 
                  className="flex items-center justify-center gap-2"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className="p-1 rounded-lg hover:scale-125 active:scale-95 transition-transform cursor-pointer focus:outline-none"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          star <= activeRating
                            ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                            : 'text-zinc-300 dark:text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {activeRating} / 5 &mdash; {RATING_LABELS[activeRating]}
                </p>
              </div>

              {/* Comment Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Your Review & Feedback <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      comment.length > 950
                        ? 'text-amber-500 font-bold'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {comment.length} / 1,000
                  </span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  maxLength={1000}
                  rows={4}
                  placeholder="Share your experience — what you love, tracking workouts, daily habits, or suggestions for improvements..."
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 btn-secondary rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="px-5 py-2.5 btn-primary rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
