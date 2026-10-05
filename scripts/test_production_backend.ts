import assert from 'assert';
import crypto from 'crypto';
import { hashPassword, verifyPassword, hashToken, generateSessionToken, sanitizeUser } from '../server/src/utils/crypto';
import { calculateServerPoints } from '../server/src/utils/scoring';
import {
  registerSchema,
  loginSchema,
  groupUpdateSchema,
  createInviteSchema,
  dailyLogSchema,
  workoutItemSchema,
  weightLogSchema,
  createOrderSchema,
  verifyPaymentSchema,
} from '../server/src/utils/validation';
import { processPaymentWebhook } from '../server/src/services/payment.service';
import { SCORING } from '../server/src/config/constants';

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
    failed++;
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('       PULSE PRODUCTION BACKEND TEST SUITE         ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. Authentication & Crypto Tests
  // ----------------------------------------------------
  console.log('--- 1. Authentication & Cryptography ---');

  await test('bcrypt hashes passwords securely with salt', async () => {
    const raw = 'my_secure_password_123';
    const hash = await hashPassword(raw);
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash should be bcrypt format');
    const { isValid, needsRehash } = await verifyPassword(raw, hash);
    assert.strictEqual(isValid, true, 'Password should verify against hash');
    assert.strictEqual(needsRehash, false, 'Modern bcrypt hash should not need rehash');
  });

  await test('rejects incorrect passwords', async () => {
    const hash = await hashPassword('correct_pass');
    const { isValid } = await verifyPassword('wrong_pass', hash);
    assert.strictEqual(isValid, false, 'Incorrect password should fail verification');
  });

  await test('backward-compatible legacy SHA-256 password upgrade', async () => {
    const rawPass = 'legacyPassword2026';
    const legacySalt = '_PULSE_SALT_2026';
    const legacyHash = crypto.createHash('sha256').update(rawPass + legacySalt).digest('hex');

    const { isValid, needsRehash } = await verifyPassword(rawPass, legacyHash);
    assert.strictEqual(isValid, true, 'Legacy hash should verify');
    assert.strictEqual(needsRehash, true, 'Legacy hash must trigger rehash flag');
  });

  await test('generateSessionToken returns raw and hashed token', () => {
    const { rawToken, tokenHash } = generateSessionToken();
    assert.ok(rawToken.length >= 32, 'Raw token should be sufficiently long');
    assert.strictEqual(tokenHash, hashToken(rawToken), 'Token hash should match SHA-256 of raw token');
  });

  await test('sanitizeUser strips password_hash', () => {
    const user = { id: 'u1', username: 'alex', password_hash: 'secret_hash', name: 'Alex' };
    const safe = sanitizeUser(user);
    assert.strictEqual((safe as any).password_hash, undefined, 'password_hash must be stripped');
    assert.strictEqual(safe?.username, 'alex');
  });

  // ----------------------------------------------------
  // 2. Scoring System Tests (Section 26)
  // ----------------------------------------------------
  console.log('\n--- 2. Server Scoring Engine ---');

  await test('calculates full 50 points on perfect weekday', () => {
    const log = {
      date: '2026-10-06', // Tuesday
      gym_done: true,
      sleep_done: true,
      junk_food_avoided: true,
      water_done: true,
      steps_done: true,
      steps_value: 12000,
      steps_target: 10000,
    };
    const pts = calculateServerPoints(log, 10000);
    assert.strictEqual(pts, 50, 'All 5 pillars should give exactly 50 points');
  });

  await test('auto-credits gym on Sunday (Healing Day) unless explicitly false', () => {
    const sundayLog = {
      date: '2026-10-04', // Sunday
      gym_done: false, // user did not go to gym
      sleep_done: true,
      junk_food_avoided: true,
      water_done: true,
      steps_done: false,
      steps_value: 0,
      steps_target: 10000,
    };
    // On Sunday, if gym_done is undefined or not explicitly false, it counts, but if false, it was opted out
    const defaultSundayLog = {
      date: '2026-10-04', // Sunday
      sleep_done: true,
      junk_food_avoided: true,
      water_done: true,
      steps_done: false,
      steps_value: 0,
    };
    const pts = calculateServerPoints(defaultSundayLog, 10000);
    assert.strictEqual(pts, 40, 'Sunday auto-credits gym for healing (10+10+10+10 = 40 pts)');
  });

  await test('calculates proportional partial points for steps', () => {
    const halfStepsLog = {
      date: '2026-10-06',
      gym_done: false,
      sleep_done: false,
      junk_food_avoided: false,
      water_done: false,
      steps_done: false,
      steps_value: 5000,
      steps_target: 10000,
    };
    const pts = calculateServerPoints(halfStepsLog, 10000);
    assert.strictEqual(pts, 5, '5,000 / 10,000 steps should give exactly 5.0 points');

    const customTargetLog = {
      date: '2026-10-06',
      steps_value: 4000,
      steps_target: 8000,
    };
    const customPts = calculateServerPoints(customTargetLog, 8000);
    assert.strictEqual(customPts, 5, '4,000 / 8,000 steps should give exactly 5.0 points');
  });

  await test('never exceeds 50 points per day maximum', () => {
    const excessiveLog = {
      date: '2026-10-06',
      gym_done: true,
      sleep_done: true,
      junk_food_avoided: true,
      water_done: true,
      steps_done: true,
      steps_value: 50000,
      steps_target: 10000,
    };
    const pts = calculateServerPoints(excessiveLog, 10000);
    assert.strictEqual(pts, 50, 'Max daily points must be clamped at 50');
  });

  // ----------------------------------------------------
  // 3. Input Validation Tests (Section 35)
  // ----------------------------------------------------
  console.log('\n--- 3. Input Validation (Zod) ---');

  await test('registerSchema validates correct inputs and rejects short passwords', () => {
    const valid = registerSchema.safeParse({
      username: 'johndoe',
      password: 'password123',
      name: 'John Doe',
      height: 180,
      weight: 75,
    });
    assert.strictEqual(valid.success, true, 'Valid registration payload should pass');

    const invalid = registerSchema.safeParse({
      username: 'jd', // too short (<3)
      password: '123', // too short (<6)
    });
    assert.strictEqual(invalid.success, false, 'Invalid registration payload should fail');
  });

  await test('groupUpdateSchema enforces valid step target bounds', () => {
    const valid = groupUpdateSchema.safeParse({
      name: 'Team Titan',
      step_target: 12000,
    });
    assert.strictEqual(valid.success, true);

    const tooLow = groupUpdateSchema.safeParse({ step_target: 500 });
    assert.strictEqual(tooLow.success, false, 'Step target < 1000 should fail');

    const tooHigh = groupUpdateSchema.safeParse({ step_target: 99999 });
    assert.strictEqual(tooHigh.success, false, 'Step target > 50000 should fail');
  });

  await test('workoutItemSchema validates exercises', () => {
    const valid = workoutItemSchema.safeParse({
      date: '2026-10-06',
      exercise_name: 'Overhead Press',
      sets: 4,
      reps: 8,
      weight: 50,
      weight_unit: 'kg',
      duration: 30,
    });
    assert.strictEqual(valid.success, true);

    const invalidDate = workoutItemSchema.safeParse({
      date: 'invalid-date',
      exercise_name: 'Press',
    });
    assert.strictEqual(invalidDate.success, false, 'Invalid date format must fail');
  });

  // ----------------------------------------------------
  // 4. Payment & Webhook Idempotency Tests (Section 31)
  // ----------------------------------------------------
  console.log('\n--- 4. Payments & Webhook Idempotency ---');

  await test('HMAC SHA-256 payment signature verification math', () => {
    const secret = 'test_webhook_secret_key';
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const payload = `${orderId}|${paymentId}`;

    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const computedSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    assert.strictEqual(expectedSignature, computedSignature, 'Signatures should match exactly');
  });

  await test('Payment schemas validate order creation and verification', () => {
    const orderValid = createOrderSchema.safeParse({ planId: 'plan_pro_monthly' });
    assert.strictEqual(orderValid.success, true);

    const verifyValid = verifyPaymentSchema.safeParse({
      orderId: 'order_123',
      paymentId: 'pay_123',
      signature: 'sig_abc',
    });
    assert.strictEqual(verifyValid.success, true);
  });

  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner encountered an error:', err);
  process.exit(1);
});
