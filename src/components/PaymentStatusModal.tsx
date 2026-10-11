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
      <div className="relative w-full max-w-md bg-[#131316] border border-[#26262C] rounded-2xl p-6 sm:p-8 shadow-2xl text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1B1B20] rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-[#D98B4A] animate-spin mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#F4F4F5]">Retrieving Payment Status</h3>
            <p className="text-xs text-[#A1A1AA] mt-1">Contacting verification server...</p>
          </div>
        ) : !payment ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#F4F4F5]">Payment Record Not Found</h3>
            <p className="text-xs text-[#A1A1AA] mt-2 mb-6">
              Could not find a matching order reference for this payment.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#1B1B20] text-[#F4F4F5] font-semibold rounded-xl hover:bg-[#26262C] transition text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            {/* Status Icon & Header */}
            {status === 'captured' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="inline-block px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold mb-2">
                  Verified Payment Successful
                </div>
                <h3 className="text-xl font-bold text-[#F4F4F5]">{payment.plan_name || 'PULSE Pro'}</h3>
                <p className="text-xs text-[#A1A1AA]">Receipt #{payment.receipt_number || payment.id.slice(0, 8)}</p>
              </div>
            )}

            {status === 'created' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <div className="inline-block px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold mb-2">
                  Payment Created / Pending
                </div>
                <h3 className="text-lg font-bold text-[#F4F4F5]">Awaiting Server Confirmation</h3>
                <p className="text-xs text-[#A1A1AA]">Order has been initiated but not yet captured.</p>
              </div>
            )}

            {status === 'failed' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="inline-block px-3 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-400 text-xs font-bold mb-2">
                  Payment Failed
                </div>
                <h3 className="text-lg font-bold text-[#F4F4F5]">Transaction Incomplete</h3>
                <p className="text-xs text-[#A1A1AA]">{payment.error_reason || 'Bank declined or cancelled.'}</p>
              </div>
            )}

            {status === 'refunded' && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <RotateCcw className="w-7 h-7" />
                </div>
                <div className="inline-block px-3 py-1 bg-sky-500/15 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold mb-2">
                  Payment Refunded
                </div>
                <h3 className="text-lg font-bold text-[#F4F4F5]">Refund Processed</h3>
                <p className="text-xs text-[#A1A1AA]">Subscription tier has been reverted to Base.</p>
              </div>
            )}

            {/* Transaction Data Table */}
            <div className="bg-[#1B1B20] border border-[#26262C] rounded-xl p-3.5 space-y-2 text-xs mb-4">
              <div className="flex justify-between py-1 border-b border-[#26262C]/60">
                <span className="text-[#71717A]">Merchant</span>
                <span className="font-semibold text-[#F4F4F5]">PULSE Fitness (Avix Studio)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26262C]/60">
                <span className="text-[#71717A]">Amount Paid</span>
                <span className="font-bold text-[#D98B4A]">
                  ₹{(payment.amount / 100).toFixed(2)} {payment.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#26262C]/60">
                <span className="text-[#71717A]">Order ID</span>
                <span className="font-mono text-[#A1A1AA]">{payment.razorpay_order_id}</span>
              </div>
              {payment.razorpay_payment_id && (
                <div className="flex justify-between py-1 border-b border-[#26262C]/60">
                  <span className="text-[#71717A]">Razorpay Payment ID</span>
                  <span className="font-mono text-[#A1A1AA]">{payment.razorpay_payment_id}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-[#71717A]">Payment Date</span>
                <span className="text-[#A1A1AA]">
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
                  <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{resendStatus}</span>
                  </div>
                )}

                <button
                  onClick={handleResendReceipt}
                  disabled={isResending}
                  className="w-full py-2.5 bg-[#1B1B20] border border-[#D98B4A]/40 text-[#D98B4A] hover:bg-[#D98B4A]/10 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Resend Official Receipt Email</span>
                </button>
              </div>
            )}

            <div className="text-[11px] text-[#71717A] text-center pt-2">
              For support, contact <span className="text-[#D98B4A]">support@avixstudio.in</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
