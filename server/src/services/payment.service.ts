import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';

let razorpayClient: Razorpay | null = null;

if (ENV.RAZORPAY_KEY_ID && ENV.RAZORPAY_KEY_SECRET) {
  try {
    razorpayClient = new Razorpay({
      key_id: ENV.RAZORPAY_KEY_ID,
      key_secret: ENV.RAZORPAY_KEY_SECRET,
    });
    console.log('[Razorpay] Payment service initialized successfully');
  } catch (err) {
    console.warn('[Razorpay] Failed to initialize Razorpay SDK:', err);
  }
} else {
  console.log('[Razorpay] Running in mock/development mode (keys not provided)');
}

export const razorpay = razorpayClient;

/**
 * Ensure default plans exist in database
 */
export async function ensureDefaultPlans() {
  const plans = [
    {
      id: 'plan_base_monthly',
      name: 'PULSE Base Monthly',
      description: 'Solo fitness tracking. Daily checklist, workout logs, personal weights & analytics (no groups).',
      price: 4900, // ₹49.00
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
    {
      id: 'plan_pro_monthly',
      name: 'PULSE Pro Monthly',
      description: 'Full group formation, add unlimited members, head-to-head challenges, team progress & rankings.',
      price: 14900, // ₹149.00
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
    {
      id: 'plan_pro_yearly',
      name: 'PULSE Pro Yearly',
      description: '1 Year of full Pro access: unlimited groups, head-to-head battles, and team leaderboards.',
      price: 149900, // ₹1,499.00
      currency: 'INR',
      duration: 'yearly',
      is_active: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        duration: plan.duration,
        is_active: plan.is_active,
      },
      create: plan,
    });
  }
}

export const VIP_FREE_USERNAMES = new Set([
  'rakesh',
  'rakeshmeduri',
  'rakesh_meduri',
  'friend',
  'enumulahitesh',
]);

/**
 * Determine a user's current subscription tier:
 * - 'none': No active subscription (requires paywall checkout)
 * - 'base': Active on Base Plan (₹49/mo - solo only, no groups)
 * - 'pro': Active on Pro Plan (₹149/mo or ₹1,499/yr - full groups & head-to-head)
 */
export async function getUserPlanTier(userId: string): Promise<'none' | 'base' | 'pro'> {
  // 1. Check if user is VIP / exempt account (Rakesh & Friend free accounts)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true },
    });
    if (user) {
      const clean = user.username.replace(/^@+/, '').toLowerCase();
      if (
        user.role === 'admin' ||
        VIP_FREE_USERNAMES.has(clean) ||
        clean.startsWith('rakesh') ||
        clean === 'friend' ||
        clean === 'enumulahitesh'
      ) {
        return 'pro';
      }
    }
  } catch (err) {
    console.warn('[PlanTier] Error checking VIP user status:', err);
  }

  // 2. Query active subscription from database
  const subscription = await prisma.subscription.findFirst({
    where: {
      user_id: userId,
      status: 'active',
    },
    include: { plan: true },
    orderBy: { created_at: 'desc' },
  });

  if (!subscription) return 'none';
  if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) {
    return 'none';
  }

  if (subscription.plan_id.includes('pro')) {
    return 'pro';
  }
  return 'base';
}

/**
 * Create a new Razorpay order and register pending payment record
 */
export async function createPaymentOrder(userId: string, planId: string) {
  await ensureDefaultPlans();

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.is_active) {
    throw new AppError('Invalid or inactive subscription plan', 400, 'INVALID_PLAN');
  }

  let razorpayOrderId: string;

  if (razorpay) {
    const order = await razorpay.orders.create({
      amount: plan.price,
      currency: plan.currency,
      receipt: `rcpt_${userId.slice(-6)}_${Date.now()}`,
      notes: {
        userId,
        planId: plan.id,
      },
    });
    razorpayOrderId = order.id;
  } else {
    // Development / test fallback order
    razorpayOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // Record pending payment in PostgreSQL
  const payment = await prisma.payment.create({
    data: {
      user_id: userId,
      razorpay_order_id: razorpayOrderId,
      amount: plan.price,
      currency: plan.currency,
      status: 'created',
    },
  });

  return {
    orderId: razorpayOrderId,
    amount: plan.price,
    currency: plan.currency,
    keyId: ENV.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    plan: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
    },
    paymentId: payment.id,
  };
}

/**
 * Verify client payment signature and activate subscription transactionally
 */
export async function verifyPaymentSignature(
  userId: string,
  orderId: string,
  paymentId: string,
  signature: string
) {
  if (razorpay && ENV.RAZORPAY_KEY_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError('Payment signature verification failed', 400, 'INVALID_SIGNATURE');
    }
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpay_order_id: orderId },
  });

  if (!payment) {
    throw new AppError('Payment record not found for this order', 404, 'PAYMENT_NOT_FOUND');
  }

  if (payment.user_id !== userId) {
    throw new AppError('Unauthorized: Order does not belong to this user', 403, 'FORBIDDEN');
  }

  const plan = await prisma.plan.findFirst({
    where: { price: payment.amount, is_active: true },
  }) || await prisma.plan.findFirst();

  if (!plan) {
    throw new AppError('Subscription plan not found', 404, 'PLAN_NOT_FOUND');
  }

  const durationDays = plan.duration === 'yearly' ? 365 : 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  // PostgreSQL Transaction: update payment and activate subscription
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update Payment status
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        status: 'captured',
      },
    });

    // 2. Upsert Subscription
    const subscription = await tx.subscription.upsert({
      where: {
        id: payment.subscription_id || `sub_${userId}`,
      },
      update: {
        plan_id: plan.id,
        status: 'active',
        starts_at: new Date(),
        expires_at: expiresAt,
        cancelled_at: null,
      },
      create: {
        id: `sub_${userId}`,
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        starts_at: new Date(),
        expires_at: expiresAt,
      },
    });

    // Link subscription to payment
    await tx.payment.update({
      where: { id: payment.id },
      data: { subscription_id: subscription.id },
    });

    return { payment: updatedPayment, subscription };
  });

  return result;
}

/**
 * Handle incoming Razorpay Webhook with strict idempotency (Section 31)
 */
export async function processPaymentWebhook(rawBody: string, webhookSignature: string) {
  if (ENV.RAZORPAY_WEBHOOK_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', ENV.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }
  }

  const event = JSON.parse(rawBody);
  const providerEventId = event.event_id || event.id;

  if (!providerEventId) {
    throw new AppError('Missing webhook event ID', 400, 'MISSING_EVENT_ID');
  }

  // Idempotency check: see if already processed
  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { provider_event_id: providerEventId },
  });

  if (existingEvent && existingEvent.processed) {
    console.log(`[Webhook Idempotency] Event ${providerEventId} already processed, skipping.`);
    return { status: 'already_processed', eventId: providerEventId };
  }

  // Transactionally record event and process effects
  await prisma.$transaction(async (tx) => {
    // 1. Record event with unique constraint to prevent race conditions
    await tx.paymentEvent.upsert({
      where: { provider_event_id: providerEventId },
      update: {
        processed: true,
        processed_at: new Date(),
      },
      create: {
        provider_event_id: providerEventId,
        event_type: event.event || 'unknown',
        payload: rawBody,
        processed: true,
        processed_at: new Date(),
      },
    });

    // 2. Process event actions
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const payment = await tx.payment.findUnique({
          where: { razorpay_order_id: orderId },
        });

        if (payment) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'captured',
              razorpay_payment_id: paymentId || payment.razorpay_payment_id,
            },
          });

          // Activate subscription
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await tx.subscription.upsert({
            where: { id: `sub_${payment.user_id}` },
            update: {
              status: 'active',
              expires_at: expiresAt,
              cancelled_at: null,
            },
            create: {
              id: `sub_${payment.user_id}`,
              user_id: payment.user_id,
              plan_id: 'plan_pro_monthly',
              status: 'active',
              expires_at: expiresAt,
            },
          });
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        await tx.payment.updateMany({
          where: { razorpay_order_id: orderId },
          data: { status: 'failed' },
        });
      }
    }
  });

  return { status: 'processed', eventId: providerEventId };
}
