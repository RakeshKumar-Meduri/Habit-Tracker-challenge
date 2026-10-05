import { apiFetch } from './apiService';

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at?: string;
  cancelled_at?: string;
  plan?: Plan;
}

/**
 * Fetch active subscription plans from backend
 */
export async function fetchSubscriptionPlans(): Promise<Plan[]> {
  try {
    const res = await apiFetch('/api/payments/plans');
    if (!res.ok) return [];
    const data = await res.json();
    return data.plans || [];
  } catch (err) {
    console.error('[PaymentService] Error fetching plans:', err);
    return [];
  }
}

/**
 * Fetch current user's subscription status
 */
export async function fetchUserSubscription(): Promise<{ isSubscribed: boolean; subscription?: Subscription }> {
  try {
    const res = await apiFetch('/api/subscription');
    if (!res.ok) return { isSubscribed: false };
    const data = await res.json();
    return {
      isSubscribed: Boolean(data.isSubscribed),
      subscription: data.subscription,
    };
  } catch (err) {
    console.error('[PaymentService] Error fetching user subscription:', err);
    return { isSubscribed: false };
  }
}

/**
 * Cancel active subscription
 */
export async function cancelUserSubscription(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/subscription/cancel', { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.error('[PaymentService] Error cancelling subscription:', err);
    return false;
  }
}

/**
 * Load Razorpay Checkout SDK dynamically
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiate checkout for a subscription plan
 */
export async function initiateSubscriptionCheckout(
  planId: string,
  user: { name?: string; username: string },
  onSuccess: (subscription: Subscription) => void,
  onError: (error: string) => void
) {
  try {
    // 1. Create order on backend
    const orderRes = await apiFetch('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      return onError(orderData.error?.message || orderData.error || 'Failed to create payment order');
    }

    // 2. Load Razorpay SDK
    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      return onError('Razorpay SDK failed to load. Please check your internet connection.');
    }

    // 3. Open Checkout
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'PULSE Fitness',
      description: orderData.plan.name,
      order_id: orderData.orderId,
      prefill: {
        name: user.name || user.username,
      },
      theme: {
        color: '#D98B4A', // PULSE gold/amber brand color
      },
      handler: async (response: any) => {
        try {
          // 4. Verify signature on backend
          const verifyRes = await apiFetch('/api/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            onSuccess(verifyData.subscription);
          } else {
            onError(verifyData.error?.message || 'Payment verification failed');
          }
        } catch (err: any) {
          onError(err.message || 'Error verifying payment');
        }
      },
      modal: {
        ondismiss: () => {
          console.log('[Razorpay] Modal dismissed');
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err: any) {
    onError(err.message || 'An error occurred during payment');
  }
}
