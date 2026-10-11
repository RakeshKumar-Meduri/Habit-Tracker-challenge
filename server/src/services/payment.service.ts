import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { sendPaymentReceiptEmail } from './email.service';

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
      name: 'PULSE Base (Free)',
      description: 'Solo fitness tracking. Daily checklist, workout logs, personal weights & analytics (no groups).',
      price: 0, // Free (₹0)
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
    {
      id: 'plan_pro_monthly',
      name: 'PULSE Pro Monthly',
      description: 'Full group formation, add unlimited members, head-to-head challenges, team progress & rankings.',
      price: 9900, // ₹99.00
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
    {
      id: 'plan_pro_yearly',
      name: 'PULSE Pro Yearly',
      description: '1 Year of full Pro access: unlimited groups, head-to-head battles, and team leaderboards.',
      price: 99900, // ₹999.00
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
  'hitesh',
  'friend',
  'enumulahitesh',
]);

/**
 * Determine a user's current subscription tier:
 * - 'base': Active on Base Plan (Free - solo only, no groups)
 * - 'pro': Active on Pro Plan (₹99/mo or ₹999/yr - full groups & head-to-head)
 */
export async function getUserPlanTier(userId: string): Promise<'none' | 'base' | 'pro'> {
  // 1. Check if user is VIP / exempt account (Rakesh & Hitesh moderator accounts)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true },
    });
    if (user) {
      const clean = user.username.replace(/^@+/, '').toLowerCase();
      if (
        user.role === 'admin' ||
        user.role === 'moderator' ||
        VIP_FREE_USERNAMES.has(clean) ||
        clean === 'rakesh' ||
        clean === 'hitesh' ||
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

  if (!subscription) return 'base';
  if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) {
    return 'base';
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, email_verified: true, name: true, username: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.is_active) {
    throw new AppError('Invalid or inactive subscription plan', 400, 'INVALID_PLAN');
  }

  // Enforce verified email requirement for paid checkouts
  if (plan.price > 0 && (!user.email || !user.email_verified)) {
    throw new AppError('Please verify your email address before upgrading to a paid plan.', 403, 'EMAIL_NOT_VERIFIED');
  }

  // Handle free plan directly without Razorpay
  if (plan.price <= 0) {
    const expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years / free forever
    const subscription = await prisma.subscription.upsert({
      where: { id: `sub_${userId}` },
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
      include: { plan: true },
    });

    return {
      orderId: `free_${Date.now()}`,
      amount: 0,
      currency: plan.currency,
      keyId: ENV.RAZORPAY_KEY_ID || 'free',
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: 0,
        currency: plan.currency,
      },
      paymentId: `free_pay_${Date.now()}`,
      freeActivated: true,
      subscription,
    };
  }

  const receiptNumber = `RCPT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  let razorpayOrderId: string;

  if (razorpay) {
    try {
      const order = await razorpay.orders.create({
        amount: plan.price,
        currency: plan.currency,
        receipt: receiptNumber,
        notes: {
          userId,
          planId: plan.id,
          userEmail: user.email || '',
        },
      });
      razorpayOrderId = order.id;
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test' || !ENV.RAZORPAY_KEY_ID?.startsWith('rzp_live')) {
        console.warn('[Razorpay] Order create via SDK fallback (test mode):', err?.error?.description || err?.message || err);
        razorpayOrderId = `order_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      } else {
        throw new AppError(err?.error?.description || err?.message || 'Payment provider order creation failed', 500, 'PAYMENT_GATEWAY_ERROR');
      }
    }
  } else {
    // Development / test fallback order
    razorpayOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // Record pending payment in PostgreSQL with receipt reference
  const payment = await prisma.payment.create({
    data: {
      user_id: userId,
      razorpay_order_id: razorpayOrderId,
      receipt_number: receiptNumber,
      plan_name: plan.name,
      amount: plan.price,
      currency: plan.currency,
      status: 'created',
    },
  });

  return {
    orderId: razorpayOrderId,
    amount: plan.price,
    currency: plan.currency,
    receiptNumber,
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
    include: { user: true },
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
        plan_name: payment.plan_name || plan.name,
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

  // Asynchronously send payment receipt email if user has verified email
  if (payment.user.email && payment.user.email_verified && !result.payment.email_sent) {
    const receiptNum = result.payment.receipt_number || `RCPT-${result.payment.id.slice(-6).toUpperCase()}`;
    sendPaymentReceiptEmail(payment.user.email, payment.user.name || payment.user.username, {
      receiptNumber: receiptNum,
      orderId,
      paymentId,
      planName: result.payment.plan_name || plan.name,
      amount: result.payment.amount,
      currency: result.payment.currency,
      paidAt: result.payment.updated_at,
    }).then(async (emailRes) => {
      if (emailRes.success) {
        await prisma.payment.update({
          where: { id: result.payment.id },
          data: { email_sent: true, email_sent_at: new Date() },
        });
      } else {
        console.warn(`[Receipt Delivery Failed] Order ${orderId}:`, emailRes.error);
      }
    }).catch((err) => {
      console.warn(`[Receipt Delivery Error] Order ${orderId}:`, err.message);
    });
  }

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

  let receiptToSend: { email: string; name: string; details: any; paymentDbId: string } | null = null;

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
          include: { user: true },
        });

        if (payment) {
          // Confirm amount and currency match server-created record
          if (paymentEntity?.amount && payment.amount !== paymentEntity.amount) {
            throw new AppError('Payment amount mismatch between order record and captured event', 400, 'PAYMENT_AMOUNT_MISMATCH');
          }
          if (paymentEntity?.currency && payment.currency !== paymentEntity.currency) {
            throw new AppError('Payment currency mismatch between order record and captured event', 400, 'PAYMENT_CURRENCY_MISMATCH');
          }

          const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'captured',
              razorpay_payment_id: paymentId || payment.razorpay_payment_id,
            },
          });

          // Activate subscription
          const resolvedPlanId = payment.plan_name?.toLowerCase().includes('yearly')
            ? 'plan_pro_yearly'
            : 'plan_pro_monthly';
          const durationDays = resolvedPlanId === 'plan_pro_yearly' ? 365 : 30;
          const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

          await tx.subscription.upsert({
            where: { id: `sub_${payment.user_id}` },
            update: {
              plan_id: resolvedPlanId,
              status: 'active',
              expires_at: expiresAt,
              cancelled_at: null,
            },
            create: {
              id: `sub_${payment.user_id}`,
              user_id: payment.user_id,
              plan_id: resolvedPlanId,
              status: 'active',
              expires_at: expiresAt,
            },
          });

          if (payment.user.email && payment.user.email_verified && !payment.email_sent) {
            receiptToSend = {
              email: payment.user.email,
              name: payment.user.name || payment.user.username,
              paymentDbId: updatedPayment.id,
              details: {
                receiptNumber: payment.receipt_number || `RCPT-${payment.id.slice(-6).toUpperCase()}`,
                orderId: payment.razorpay_order_id,
                paymentId: paymentId || payment.razorpay_payment_id || payment.id,
                planName: payment.plan_name || 'PULSE Pro Monthly',
                amount: payment.amount,
                currency: payment.currency,
                paidAt: new Date(),
              },
            };
          }
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorReason = paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed';

      if (orderId) {
        await tx.payment.updateMany({
          where: { razorpay_order_id: orderId },
          data: { status: 'failed', error_reason: errorReason },
        });
      }
    } else if (event.event === 'payment.refunded' || event.event === 'refund.created') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        await tx.payment.updateMany({
          where: { razorpay_order_id: orderId },
          data: { status: 'refunded', refunded_at: new Date() },
        });

        const payment = await tx.payment.findUnique({
          where: { razorpay_order_id: orderId },
        });
        if (payment) {
          await tx.subscription.updateMany({
            where: { user_id: payment.user_id },
            data: { status: 'cancelled', cancelled_at: new Date() },
          });
        }
      }
    }
  });

  // Asynchronously dispatch receipt email after transaction commits
  if (receiptToSend) {
    const r: any = receiptToSend;
    sendPaymentReceiptEmail(r.email, r.name, r.details).then(async (res) => {
      if (res.success) {
        await prisma.payment.update({
          where: { id: r.paymentDbId },
          data: { email_sent: true, email_sent_at: new Date() },
        });
      }
    }).catch((err) => {
      console.warn(`[Webhook Receipt Send Error]`, err.message);
    });
  }

  return { status: 'processed', eventId: providerEventId };
}

/**
 * Resend payment receipt for a captured payment
 */
export async function resendPaymentReceipt(userId: string, paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      user_id: userId,
      status: 'captured',
    },
    include: { user: true },
  });

  if (!payment) {
    throw new AppError('Captured payment record not found.', 404, 'PAYMENT_NOT_FOUND');
  }

  if (!payment.user.email || !payment.user.email_verified) {
    throw new AppError('Your account email address must be verified before a receipt can be sent.', 400, 'EMAIL_NOT_VERIFIED');
  }

  const receiptNumber = payment.receipt_number || `RCPT-${payment.id.slice(-6).toUpperCase()}`;

  const sendResult = await sendPaymentReceiptEmail(
    payment.user.email,
    payment.user.name || payment.user.username,
    {
      receiptNumber,
      orderId: payment.razorpay_order_id,
      paymentId: payment.razorpay_payment_id || payment.id,
      planName: payment.plan_name || 'PULSE Pro Monthly',
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.updated_at,
    }
  );

  if (sendResult.success) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { email_sent: true, email_sent_at: new Date() },
    });
  }

  return sendResult;
}

