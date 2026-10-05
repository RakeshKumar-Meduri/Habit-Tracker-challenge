import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimit';
import { createOrderSchema, verifyPaymentSchema } from '../utils/validation';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  processPaymentWebhook,
  ensureDefaultPlans,
} from '../services/payment.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ----------------------------------------------------
// Get Available Subscription Plans
// ----------------------------------------------------
router.get('/api/payments/plans', async (req, res, next) => {
  try {
    await ensureDefaultPlans();
    const plans = await prisma.plan.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' },
    });
    res.json({ success: true, plans });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Create Razorpay Order
// ----------------------------------------------------
router.post('/api/payments/create-order', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const validated = createOrderSchema.parse(req.body);
    const userId = req.user!.id;

    const orderData = await createPaymentOrder(userId, validated.planId);

    res.json({
      success: true,
      ...orderData,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Verify Payment Signature & Activate Subscription
// ----------------------------------------------------
router.post('/api/payments/verify', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const validated = verifyPaymentSchema.parse(req.body);
    const userId = req.user!.id;

    const result = await verifyPaymentSignature(
      userId,
      validated.orderId,
      validated.paymentId,
      validated.signature
    );

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully!',
      subscription: result.subscription,
      payment: result.payment,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Razorpay Webhook Handler (Idempotent)
// ----------------------------------------------------
router.post('/api/payments/webhook', async (req, res, next) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const result = await processPaymentWebhook(rawBody, signature);

    res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    console.error('[Payment Webhook Error]', err);
    // Return 400 for invalid signature or 500 for internal error so Razorpay retries if needed
    next(err);
  }
});

// ----------------------------------------------------
// Get Current User Subscription
// ----------------------------------------------------
router.get('/api/subscription', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active',
      },
      include: { plan: true },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      success: true,
      isSubscribed: !!subscription && (!subscription.expires_at || new Date(subscription.expires_at) > new Date()),
      subscription,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Cancel Subscription
// ----------------------------------------------------
router.post('/api/subscription/cancel', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active',
      },
    });

    if (!subscription) {
      throw new AppError('No active subscription found', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Subscription has been cancelled.',
      subscription: updated,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Payment Status Check
// ----------------------------------------------------
router.get('/api/payments/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const payments = await prisma.payment.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      payments,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
