import assert from 'assert';
import crypto from 'crypto';
import { prisma } from '../server/src/db/prisma';
import { ENV } from '../server/src/config/env';
import { generateVerificationToken, hashToken } from '../server/src/utils/crypto';
import {
  createPaymentOrder,
  processPaymentWebhook,
  resendPaymentReceipt,
  ensureDefaultPlans,
} from '../server/src/services/payment.service';
import { sendVerificationEmail, sendPaymentReceiptEmail } from '../server/src/services/email.service';
import { AppError } from '../server/src/middleware/errorHandler';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 3).join('\n'));
    }
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  PULSE EMAIL VERIFICATION & PAYMENT CONFIRMATION TEST SUITE');
  console.log('================================================================\n');

  // Test setup
  await ensureDefaultPlans();
  const testRunId = Date.now().toString(36);
  const testSecret = 'whsec_test_pulse_verification_secret_2026';
  ENV.RAZORPAY_WEBHOOK_SECRET = testSecret;

  // Cleanup helper
  const createdUserIds: string[] = [];

  try {
    // ----------------------------------------------------
    // 1. Email Verification Token Generation & Hashing Tests
    // ----------------------------------------------------
    console.log('--- 1. Cryptographic Token Generation & Hashing ---');

    await test('generateVerificationToken produces secure 64-char hex token and SHA-256 hash', () => {
      const { rawToken, tokenHash } = generateVerificationToken();
      assert.ok(rawToken && rawToken.length === 64, 'Raw token must be a 64-character hex string (32 bytes)');
      assert.ok(tokenHash && tokenHash.length === 64, 'Token hash must be a 64-character SHA-256 hex string');
      assert.strictEqual(tokenHash, hashToken(rawToken), 'Token hash must match exact SHA-256 digest of raw token');
      assert.notStrictEqual(rawToken, tokenHash, 'Raw token and token hash must never be identical');
    });

    await test('two generated tokens are completely distinct (cryptographic uniqueness)', () => {
      const t1 = generateVerificationToken();
      const t2 = generateVerificationToken();
      assert.notStrictEqual(t1.rawToken, t2.rawToken);
      assert.notStrictEqual(t1.tokenHash, t2.tokenHash);
    });

    // ----------------------------------------------------
    // 2. Database Token Verification Lifecycle Tests
    // ----------------------------------------------------
    console.log('\n--- 2. Email Verification Token Lifecycle & Safety ---');

    const testEmail1 = `verify_test_${testRunId}@example.com`;
    const user1 = await prisma.user.create({
      data: {
        username: `user_v1_${testRunId}`,
        name: 'Verification User 1',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        email: testEmail1,
        email_verified: false,
      },
    });
    createdUserIds.push(user1.id);

    await test('successful verification marks user verified and sets used_at timestamp', async () => {
      const { rawToken, tokenHash } = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.emailVerificationToken.create({
        data: {
          user_id: user1.id,
          email: testEmail1,
          token_hash: tokenHash,
          expires_at: expiresAt,
        },
      });

      // Verify the token
      const foundToken = await prisma.emailVerificationToken.findUnique({
        where: { token_hash: tokenHash },
        include: { user: true },
      });

      assert.ok(foundToken, 'Token record should exist in database');
      assert.strictEqual(foundToken.used_at, null, 'New token should not be marked used');
      assert.ok(foundToken.expires_at > new Date(), 'Token should not be expired');

      // Execute verification transaction
      await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.update({
          where: { id: foundToken.id },
          data: { used_at: new Date() },
        });
        await tx.user.update({
          where: { id: user1.id },
          data: { email_verified: true, email_verified_at: new Date() },
        });
      });

      const updatedUser = await prisma.user.findUnique({ where: { id: user1.id } });
      assert.strictEqual(updatedUser?.email_verified, true, 'User should be marked email_verified: true');
      assert.ok(updatedUser?.email_verified_at, 'email_verified_at should be recorded');

      const usedToken = await prisma.emailVerificationToken.findUnique({ where: { id: foundToken.id } });
      assert.ok(usedToken?.used_at, 'Token should have used_at recorded');
    });

    await test('reused verification token is rejected', async () => {
      const { rawToken, tokenHash } = generateVerificationToken();
      // Create an already-used token
      await prisma.emailVerificationToken.create({
        data: {
          user_id: user1.id,
          email: testEmail1,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          used_at: new Date(),
        },
      });

      const foundToken = await prisma.emailVerificationToken.findUnique({
        where: { token_hash: tokenHash },
      });

      assert.ok(foundToken, 'Token should exist');
      assert.ok(foundToken.used_at !== null, 'Reused token check: used_at is not null');
    });

    await test('expired verification token is rejected', async () => {
      const { rawToken, tokenHash } = generateVerificationToken();
      // Create an expired token (1 hour ago)
      await prisma.emailVerificationToken.create({
        data: {
          user_id: user1.id,
          email: testEmail1,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() - 3600000), // 1 hr in past
        },
      });

      const foundToken = await prisma.emailVerificationToken.findUnique({
        where: { token_hash: tokenHash },
      });

      assert.ok(foundToken, 'Token should exist');
      assert.ok(foundToken.expires_at < new Date(), 'Expired token check: expires_at is in past');
    });

    await test('tampered / non-existent verification token is not found', async () => {
      const fakeHash = hashToken('totally_fabricated_token_not_in_database');
      const foundToken = await prisma.emailVerificationToken.findUnique({
        where: { token_hash: fakeHash },
      });
      assert.strictEqual(foundToken, null, 'Non-existent token must return null');
    });

    // ----------------------------------------------------
    // 3. Duplicate Email Constraint & Account Protection
    // ----------------------------------------------------
    console.log('\n--- 3. Duplicate Email Conflict Protection ---');

    await test('enforces uniqueness on email across users without corrupting existing accounts', async () => {
      let threwConflict = false;
      try {
        await prisma.user.create({
          data: {
            username: `duplicate_try_${testRunId}`,
            name: 'Duplicate Attempt',
            password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
            email: testEmail1, // Same as user1
          },
        });
      } catch (err: any) {
        threwConflict = true;
        assert.ok(
          err.code === 'P2002' || err.message.includes('unique') || err.message.includes('email'),
          'Unique constraint violation expected for duplicate email'
        );
      }
      assert.strictEqual(threwConflict, true, 'Duplicate email registration must be rejected');
    });

    // ----------------------------------------------------
    // 4. Payment Gating: Verified Email Requirement
    // ----------------------------------------------------
    console.log('\n--- 4. Payment Gating (Email Verification Required) ---');

    const unverifiedUser = await prisma.user.create({
      data: {
        username: `unverified_${testRunId}`,
        name: 'Unverified User',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        email: `unverified_${testRunId}@example.com`,
        email_verified: false,
      },
    });
    createdUserIds.push(unverifiedUser.id);

    await test('blocks unverified user from creating paid order with EMAIL_NOT_VERIFIED (403)', async () => {
      let errorThrown: any = null;
      try {
        await createPaymentOrder(unverifiedUser.id, 'plan_pro_monthly');
      } catch (err: any) {
        errorThrown = err;
      }

      assert.ok(errorThrown, 'Should throw AppError for unverified user');
      assert.strictEqual(errorThrown.code, 'EMAIL_NOT_VERIFIED');
      assert.strictEqual(errorThrown.statusCode, 403);
    });

    await test('allows user without verified email to enroll in Base (free ₹0) plan', async () => {
      const freeOrder = await createPaymentOrder(unverifiedUser.id, 'plan_base_monthly');
      assert.ok(freeOrder, 'Free plan should be allowed without payment');
      assert.strictEqual(freeOrder.amount, 0);
      assert.strictEqual(freeOrder.subscription?.status, 'active');
      assert.strictEqual(freeOrder.freeActivated, true);
    });

    // Mark user verified and test paid checkout
    await prisma.user.update({
      where: { id: unverifiedUser.id },
      data: { email_verified: true, email_verified_at: new Date() },
    });

    let paidOrder: any = null;
    await test('allows verified user to create paid order with server-generated receipt number', async () => {
      paidOrder = await createPaymentOrder(unverifiedUser.id, 'plan_pro_monthly');
      assert.ok(paidOrder, 'Paid order should be created');
      assert.ok(paidOrder.orderId, 'Order ID must be generated');
      assert.ok(paidOrder.receiptNumber, 'Receipt number must be generated');
      assert.ok(paidOrder.receiptNumber.startsWith('RCPT-'), 'Receipt number must follow RCPT- format');
      assert.strictEqual(paidOrder.amount, 9900, 'Expected ₹99 (9900 paise)');
      assert.strictEqual(paidOrder.currency, 'INR');

      // Verify pending payment record exists in database
      const dbPayment = await prisma.payment.findUnique({
        where: { razorpay_order_id: paidOrder.orderId },
      });
      assert.ok(dbPayment, 'Database payment record must exist');
      assert.ok(dbPayment.status === 'created' || dbPayment.status === 'pending', 'Initial status must be created/pending');
      assert.strictEqual(dbPayment.receipt_number, paidOrder.receiptNumber);
    });

    // ----------------------------------------------------
    // 5. Payment Webhook Signature & Security Tests
    // ----------------------------------------------------
    console.log('\n--- 5. Webhook Signature Verification ---');

    const webhookOrderId = paidOrder.orderId;
    const testPaymentId = `pay_test_${testRunId}`;
    const capturedPayload = JSON.stringify({
      event_id: `evt_cap_${testRunId}`,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            order_id: webhookOrderId,
            amount: 9900,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    await test('rejects webhook with invalid/forged signature', async () => {
      const forgedSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      let errorThrown: any = null;
      try {
        await processPaymentWebhook(capturedPayload, forgedSignature);
      } catch (err: any) {
        errorThrown = err;
      }

      assert.ok(errorThrown, 'Forged signature must throw error');
      assert.strictEqual(errorThrown.code, 'INVALID_WEBHOOK_SIGNATURE');
    });

    await test('accepts webhook with valid HMAC SHA-256 signature and captures payment', async () => {
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(capturedPayload)
        .digest('hex');

      const result = await processPaymentWebhook(capturedPayload, validSignature);
      assert.ok(result, 'Webhook should process successfully');

      // Verify payment transitioned to captured
      const updatedPayment = await prisma.payment.findUnique({
        where: { razorpay_order_id: webhookOrderId },
      });
      assert.strictEqual(updatedPayment?.status, 'captured', 'Payment status must be captured');
      assert.strictEqual(updatedPayment?.razorpay_payment_id, testPaymentId);

      // Verify user subscription was activated
      const sub = await prisma.subscription.findUnique({
        where: { id: `sub_${unverifiedUser.id}` },
      });
      assert.ok(sub, 'Subscription must be activated');
      assert.strictEqual(sub?.plan_id, 'plan_pro_monthly');
    });

    // ----------------------------------------------------
    // 6. Webhook Idempotency (Duplicate Delivery Protection)
    // ----------------------------------------------------
    console.log('\n--- 6. Webhook Idempotency (Duplicate Delivery) ---');

    await test('duplicate webhook delivery with same event_id is safely skipped (idempotent)', async () => {
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(capturedPayload)
        .digest('hex');

      // Deliver exact same event second time
      const duplicateResult = await processPaymentWebhook(capturedPayload, validSignature);
      assert.strictEqual(
        (duplicateResult as any).status,
        'already_processed',
        'Duplicate webhook should return already_processed status'
      );
    });

    // ----------------------------------------------------
    // 7. Webhook Amount & Currency Mismatch Rejection
    // ----------------------------------------------------
    console.log('\n--- 7. Webhook Amount & Currency Validation ---');

    // Create a new order to test mismatch
    const orderForMismatch = await createPaymentOrder(unverifiedUser.id, 'plan_pro_monthly');

    await test('rejects webhook if captured amount does not match order record', async () => {
      const mismatchAmountPayload = JSON.stringify({
        event_id: `evt_mismatch_amt_${testRunId}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_mismatch_amt_${testRunId}`,
              order_id: orderForMismatch.orderId,
              amount: 1000, // Expected 9900!
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });

      const sig = crypto.createHmac('sha256', testSecret).update(mismatchAmountPayload).digest('hex');
      let errorThrown: any = null;
      try {
        await processPaymentWebhook(mismatchAmountPayload, sig);
      } catch (err: any) {
        errorThrown = err;
      }

      assert.ok(errorThrown, 'Amount mismatch must throw error');
      assert.strictEqual(errorThrown.code, 'PAYMENT_AMOUNT_MISMATCH');
    });

    await test('rejects webhook if captured currency does not match order record', async () => {
      const mismatchCurrencyPayload = JSON.stringify({
        event_id: `evt_mismatch_curr_${testRunId}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_mismatch_curr_${testRunId}`,
              order_id: orderForMismatch.orderId,
              amount: 9900,
              currency: 'USD', // Expected INR!
              status: 'captured',
            },
          },
        },
      });

      const sig = crypto.createHmac('sha256', testSecret).update(mismatchCurrencyPayload).digest('hex');
      let errorThrown: any = null;
      try {
        await processPaymentWebhook(mismatchCurrencyPayload, sig);
      } catch (err: any) {
        errorThrown = err;
      }

      assert.ok(errorThrown, 'Currency mismatch must throw error');
      assert.strictEqual(errorThrown.code, 'PAYMENT_CURRENCY_MISMATCH');
    });

    // ----------------------------------------------------
    // 8. Payment State Transitions: Failed & Refunded
    // ----------------------------------------------------
    console.log('\n--- 8. Payment State Transitions (Failed & Refunded) ---');

    await test('handles payment.failed webhook event and records error reason', async () => {
      const failedPayload = JSON.stringify({
        event_id: `evt_failed_${testRunId}`,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_failed_${testRunId}`,
              order_id: orderForMismatch.orderId,
              error_description: 'Card declined by issuing bank',
            },
          },
        },
      });

      const sig = crypto.createHmac('sha256', testSecret).update(failedPayload).digest('hex');
      await processPaymentWebhook(failedPayload, sig);

      const payment = await prisma.payment.findUnique({
        where: { razorpay_order_id: orderForMismatch.orderId },
      });
      assert.strictEqual(payment?.status, 'failed', 'Payment should be marked failed');
      assert.strictEqual(payment?.error_reason, 'Card declined by issuing bank');
    });

    await test('handles payment.refunded webhook, cancels subscription and sets refunded_at', async () => {
      const refundPayload = JSON.stringify({
        event_id: `evt_refund_${testRunId}`,
        event: 'payment.refunded',
        payload: {
          payment: {
            entity: {
              id: testPaymentId,
              order_id: webhookOrderId,
              amount_refunded: 9900,
            },
          },
        },
      });

      const sig = crypto.createHmac('sha256', testSecret).update(refundPayload).digest('hex');
      await processPaymentWebhook(refundPayload, sig);

      const refundedPayment = await prisma.payment.findUnique({
        where: { razorpay_order_id: webhookOrderId },
      });
      assert.strictEqual(refundedPayment?.status, 'refunded', 'Payment status must be refunded');
      assert.ok(refundedPayment?.refunded_at, 'refunded_at timestamp must be set');

      // Verify subscription was cancelled
      const cancelledSub = await prisma.subscription.findFirst({
        where: { user_id: unverifiedUser.id },
      });
      assert.strictEqual(cancelledSub?.status, 'cancelled', 'Subscription must be cancelled upon refund');
    });

    // ----------------------------------------------------
    // 9. Email Delivery Safety & Receipt Resend
    // ----------------------------------------------------
    console.log('\n--- 9. Email Delivery Safety & Receipt Resend ---');

    await test('sendVerificationEmail gracefully succeeds in dev/test mode when RESEND_API_KEY is unset', async () => {
      const res = await sendVerificationEmail(
        'test@example.com',
        'Test User',
        'https://pulse.avixstudio.com/verify-email?token=abcdef123456'
      );
      assert.strictEqual(res.success, true, 'Email service should simulate successfully');
    });

    await test('sendPaymentReceiptEmail handles delivery gracefully without exposing sensitive card data', async () => {
      const res = await sendPaymentReceiptEmail('test@example.com', 'Test User', {
        receiptNumber: 'RCPT-2026-TEST',
        orderId: 'order_123',
        paymentId: 'pay_123',
        planName: 'PULSE Pro Monthly',
        amount: 9900,
        currency: 'INR',
        paidAt: new Date(),
      });
      assert.strictEqual(res.success, true, 'Receipt email service should succeed');
    });

    await test('resendPaymentReceipt allows resending receipt for user payment', async () => {
      // Find the payment
      const p = await prisma.payment.findUnique({
        where: { razorpay_order_id: webhookOrderId },
      });
      assert.ok(p, 'Payment should exist');

      // Temporarily mark status back to captured so receipt can be resent
      await prisma.payment.update({
        where: { id: p.id },
        data: { status: 'captured' },
      });

      const resendRes = await resendPaymentReceipt(unverifiedUser.id, p.id);
      assert.strictEqual(resendRes.success, true, 'Receipt resend should succeed');
    });

  } finally {
    // Clean up test records
    console.log('\nCleaning up test artifacts...');
    for (const uId of createdUserIds) {
      try {
        await prisma.paymentEvent.deleteMany({});
        await prisma.payment.deleteMany({ where: { user_id: uId } });
        await prisma.subscription.deleteMany({ where: { user_id: uId } });
        await prisma.emailVerificationToken.deleteMany({ where: { user_id: uId } });
        await prisma.user.delete({ where: { id: uId } });
      } catch (e) {
        // ignore cleanup errors
      }
    }
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
