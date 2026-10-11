import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  X, 
  Send,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { 
  fetchPaymentOrderByOrderId, 
  resendPaymentReceiptOnServer 
} from '../services/apiService';

interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  paymentRecord?: any;
}

export const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  isOpen,
  onClose,
  orderId,
  paymentRecord: initialRecord,
}) => {
  const [payment, setPayment] = useState<any>(initialRecord || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialRecord && !!orderId);
  const [resendStatus, setResendStatus] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);

  useEffect(() => {
    if (initialRecord) {
      setPayment(initialRecord);
    } else if (orderId && isOpen) {
      setIsLoading(true);
      fetchPaymentOrderByOrderId(orderId).then((res) => {
        if (res.success && res.payment) {
          setPayment(res.payment);
        }
      }).finally(() => setIsLoading(false));
    }
  }, [orderId, initialRecord, isOpen]);

  if (!isOpen) return null;

  const handleResendReceipt = async () => {
    if (!payment?.id) return;
    setIsResending(true);
    setResendStatus('');

    try {
      const res = await resendPaymentReceiptOnServer(payment.id);
      if (res.success) {
        setResendStatus('Receipt email dispatched successfully!');
        setPayment((prev: any) => prev ? { ...prev, email_sent: true } : prev);
      } else {
        setResendStatus(res.error || 'Failed to dispatch receipt email.');
      }
    } catch (err: any) {
      setResendStatus(err.message || 'Error sending receipt.');
    } finally {
      setIsResending(false);
    }
  };

  const status = payment?.status || 'created';

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

        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Retrieving Payment Status</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Contacting verification server...</p>
          </div>
        ) : !payment ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-zinc-900 dark:text-zinc-100 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Payment Record Not Found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 mb-6">
              Could not find a matching order reference for this payment.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 btn-secondary font-semibold rounded-xl transition text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            {/* Status Icon & Header */}
            {status === 'captured' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="inline-block px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full text-xs font-bold mb-2">
                  Verified Payment Successful
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{payment.plan_name || 'PULSE Pro'}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Receipt #{payment.receipt_number || payment.id.slice(0, 8)}</p>
              </div>
            )}

            {status === 'created' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full text-zinc-800 dark:text-zinc-200 text-xs font-bold mb-2">
                  Payment Created / Pending
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Awaiting Server Confirmation</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Order has been initiated but not yet captured.</p>
              </div>
            )}

            {status === 'failed' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-600 rounded-full text-zinc-900 dark:text-zinc-100 text-xs font-bold mb-2">
                  Payment Failed
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Transaction Incomplete</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{payment.error_reason || 'Bank declined or cancelled.'}</p>
              </div>
            )}

            {status === 'refunded' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                  <RotateCcw className="w-7 h-7" />
                </div>
                <div className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full text-zinc-800 dark:text-zinc-200 text-xs font-bold mb-2">
                  Payment Refunded
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Refund Processed</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Subscription tier has been reverted to Base.</p>
              </div>
            )}

            {/* Transaction Data Table */}
            <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs mb-4">
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Merchant</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">PULSE Fitness (Avix Studio)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Amount Paid</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  ₹{(payment.amount / 100).toFixed(2)} {payment.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400">Order ID</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{payment.razorpay_order_id}</span>
              </div>
              {payment.razorpay_payment_id && (
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400">Razorpay Payment ID</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{payment.razorpay_payment_id}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-zinc-500 dark:text-zinc-400">Payment Date</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {new Date(payment.updated_at || payment.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>

            {/* Email Status & Resend */}
            {status === 'captured' && (
              <div className="mb-4">
                {resendStatus && (
                  <div className="mb-3 p-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{resendStatus}</span>
                  </div>
                )}

                <button
                  onClick={handleResendReceipt}
                  disabled={isResending}
                  className="w-full py-2.5 btn-secondary text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Resend Official Receipt Email</span>
                </button>
              </div>
            )}

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center pt-2">
              For support, contact <span className="font-semibold text-zinc-900 dark:text-zinc-100">team@avixstudio.com</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
