import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3001/api/auth';
const TEST_HEADERS = {
  'Content-Type': 'application/json',
  'x-pulse-test-bypass': 'pulse-internal-security-test',
};

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}${details ? ` (${details})` : ''}`);
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 PULSE PASSWORD RESET AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  const testSuffix = Math.floor(Math.random() * 100000);
  const testUsername = `test_pwd_user_${testSuffix}`;
  const testEmail = `test_pwd_user_${testSuffix}@pulse-internal-test.local`;
  const initialPassword = 'InitialPassword123!';
  const updatedPassword = 'NewSecretPassword456$';

  let testUserId = '';

  try {
    // Setup isolated test user
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const createdUser = await prisma.user.create({
      data: {
        username: testUsername,
        name: 'Password Reset Test User',
        email: testEmail,
        email_verified: true,
        password_hash: passwordHash,
        height: 175,
        weight_current: 70,
        age: 25,
        gender: 'male',
        role: 'member',
      },
    });
    testUserId = createdUser.id;
    console.log(`Created isolated test user: ${testUsername} (ID: ${testUserId})\n`);

    // Test 1: Unknown email returns generic response without revealing account existence
    {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ email: `unknown_${Date.now()}@example.com` }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.success === true && typeof data.message === 'string' && data.message.includes('If an account matches');
      record('Anti-Enumeration: Unknown email returns identical generic message', passed, `HTTP ${res.status}`);
    }

    // Test 2: Known email returns same generic response & creates secure token hash in DB
    {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.success === true && data.message.includes('If an account matches');
      
      // Verify token in DB
      const dbRecord = await prisma.passwordResetToken.findFirst({
        where: { user_id: testUserId },
        orderBy: { created_at: 'desc' },
      });
      const hasHash = !!dbRecord && dbRecord.token_hash.length === 64 && dbRecord.used_at === null;

      record('Known Email: Returns identical generic message & stores SHA-256 hash in DB', passed && hasHash, `HTTP ${res.status}, Hash stored: ${hasHash}`);
    }

    // Test 3: Anti-spam cooldown: Re-request within 60s suppresses duplicate token creation
    {
      const countBefore = await prisma.passwordResetToken.count({ where: { user_id: testUserId } });
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ email: testEmail }),
      });
      const countAfter = await prisma.passwordResetToken.count({ where: { user_id: testUserId } });
      const data = await res.json();
      const passed = res.status === 200 && data.success === true && countBefore === countAfter;
      record('Anti-Spam Cooldown: 60s cooldown silently suppresses duplicate token creation', passed, `HTTP ${res.status}, Tokens before/after: ${countBefore}/${countAfter}`);
    }

    // Test 4: Malformed token verification
    {
      const res = await fetch(`${API_BASE}/verify-reset-token`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: 'malformed_short_token' }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.valid === false && (data.reason === 'malformed' || data.reason === 'invalid');
      record('Token Verification: Malformed token rejected', passed, `Reason: ${data.reason}`);
    }

    // Test 5: Mismatched / Non-existent token verification
    {
      const fakeToken = crypto.randomBytes(32).toString('hex');
      const res = await fetch(`${API_BASE}/verify-reset-token`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: fakeToken }),
      });
      const data = await res.json();
      const passed = res.status === 200 && data.valid === false && data.reason === 'invalid';
      record('Token Verification: Non-existent token rejected as invalid', passed, `Reason: ${data.reason}`);
    }

    // Test 6: Expired token verification & rejection
    {
      const expiredRawToken = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          user_id: testUserId,
          email: testEmail,
          token_hash: expiredHash,
          expires_at: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        },
      });

      const verifyRes = await fetch(`${API_BASE}/verify-reset-token`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: expiredRawToken }),
      });
      const verifyData = await verifyRes.json();
      const verifyPassed = verifyData.valid === false && verifyData.reason === 'expired';

      // Attempt to reset with expired token
      const resetRes = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: expiredRawToken, newPassword: updatedPassword }),
      });
      const resetData = await resetRes.json();
      const resetPassed = resetRes.status === 400 && resetData.error?.code === 'TOKEN_EXPIRED';

      record('Token Expiration: Expired token cannot be verified or used for reset', verifyPassed && resetPassed, `Verify: ${verifyData.reason}, Reset Code: ${resetData.error?.code}`);
    }

    // Test 7: Already-used token verification & rejection
    {
      const usedRawToken = crypto.randomBytes(32).toString('hex');
      const usedHash = crypto.createHash('sha256').update(usedRawToken).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          user_id: testUserId,
          email: testEmail,
          token_hash: usedHash,
          expires_at: new Date(Date.now() + 3600 * 1000),
          used_at: new Date(),
        },
      });

      const verifyRes = await fetch(`${API_BASE}/verify-reset-token`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: usedRawToken }),
      });
      const verifyData = await verifyRes.json();
      const verifyPassed = verifyData.valid === false && verifyData.reason === 'already_used';

      const resetRes = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: usedRawToken, newPassword: updatedPassword }),
      });
      const resetData = await resetRes.json();
      const resetPassed = resetRes.status === 400 && resetData.error?.code === 'TOKEN_ALREADY_USED';

      record('Single-Use Enforcement: Reused token rejected for both verification and reset', verifyPassed && resetPassed, `Verify: ${verifyData.reason}, Reset Code: ${resetData.error?.code}`);
    }

    // Test 8: Password Policy Enforcement on Password Reset
    {
      const policyTestToken = crypto.randomBytes(32).toString('hex');
      const policyHash = crypto.createHash('sha256').update(policyTestToken).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          user_id: testUserId,
          email: testEmail,
          token_hash: policyHash,
          expires_at: new Date(Date.now() + 3600 * 1000),
        },
      });

      // Too short (<6 chars)
      const resShort = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: policyTestToken, newPassword: 'Ab1!' }),
      });
      const shortPassed = resShort.status === 400;

      // No uppercase
      const resNoUpper = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: policyTestToken, newPassword: 'lowercaseonly123!' }),
      });
      const noUpperPassed = resNoUpper.status === 400;

      // No special character
      const resNoSpecial = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: policyTestToken, newPassword: 'NoSpecialChars123' }),
      });
      const noSpecialPassed = resNoSpecial.status === 400;

      record('Password Policy: Rejects passwords failing length, uppercase, or symbol requirements', shortPassed && noUpperPassed && noSpecialPassed, `Short: ${resShort.status}, NoUpper: ${resNoUpper.status}, NoSpecial: ${resNoSpecial.status}`);
    }

    // Test 9: Successful Password Reset with valid token & policy compliant password
    let validRawToken = crypto.randomBytes(32).toString('hex');
    let validTokenHash = crypto.createHash('sha256').update(validRawToken).digest('hex');
    {
      await prisma.passwordResetToken.create({
        data: {
          user_id: testUserId,
          email: testEmail,
          token_hash: validTokenHash,
          expires_at: new Date(Date.now() + 3600 * 1000),
        },
      });

      // Create a mock active session to verify session revocation
      await prisma.session.create({
        data: {
          user_id: testUserId,
          session_token_hash: crypto.randomBytes(32).toString('hex'),
          expires_at: new Date(Date.now() + 86400 * 1000),
        },
      });

      const resetRes = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: validRawToken, newPassword: updatedPassword }),
      });
      const resetData = await resetRes.json();
      const resetOk = resetRes.status === 200 && resetData.success === true;

      // Verify token in DB is marked as used
      const updatedTokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token_hash: validTokenHash },
      });
      const tokenMarkedUsed = !!updatedTokenRecord && updatedTokenRecord.used_at !== null;

      // Verify session revocation (all active unrevoked sessions should be 0)
      const activeSessionsCount = await prisma.session.count({
        where: { user_id: testUserId, revoked_at: null },
      });
      const sessionsRevoked = activeSessionsCount === 0;

      record('Successful Password Reset: Updates password, invalidates token, and revokes sessions', resetOk && tokenMarkedUsed && sessionsRevoked, `Reset: HTTP ${resetRes.status}, Used: ${tokenMarkedUsed}, Unrevoked Sessions: ${activeSessionsCount}`);
    }

    // Test 10: Re-submission of now-used token fails
    {
      const reattemptRes = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ token: validRawToken, newPassword: 'AnotherNewPassword789!' }),
      });
      const reattemptData = await reattemptRes.json();
      const passed = reattemptRes.status === 400 && reattemptData.error?.code === 'TOKEN_ALREADY_USED';
      record('Re-submission Prevention: Token cannot be used again after successful reset', passed, `HTTP ${reattemptRes.status}, Code: ${reattemptData.error?.code}`);
    }

    // Test 11: Sign-in with New Password succeeds
    {
      const loginRes = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ identifier: testUsername, password: updatedPassword }),
      });
      const loginData = await loginRes.json();
      const passed = loginRes.status === 200 && loginData.success === true && loginData.user?.id === testUserId;
      record('Authentication: Sign-in with new password succeeds', passed, `HTTP ${loginRes.status}, User: ${loginData.user?.username}`);
    }

    // Test 12: Sign-in with Old Password fails
    {
      const loginOldRes = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: TEST_HEADERS,
        body: JSON.stringify({ identifier: testUsername, password: initialPassword }),
      });
      const passed = loginOldRes.status === 401;
      record('Authentication: Sign-in with old password is now rejected', passed, `HTTP ${loginOldRes.status}`);
    }

    // Test 13: IP Rate Limiting Verification
    {
      // Send rapid requests without bypass header to test forgot-password rate limiter
      const floodPromises = Array.from({ length: 7 }).map(() =>
        fetch(`${API_BASE}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `flood_rate_test_${Date.now()}@example.com` }),
        })
      );
      const responses = await Promise.all(floodPromises);
      const has429 = responses.some(r => r.status === 429);
      record('Rate Limiting: Exceeding request threshold triggers HTTP 429 response', has429, `Found HTTP 429: ${has429}`);
    }

  } catch (err: any) {
    console.error('Unexpected test suite error:', err);
    record('Test Suite Execution', false, err.message);
  } finally {
    // Clean up test artifacts and test user
    if (testUserId) {
      await prisma.passwordResetToken.deleteMany({ where: { user_id: testUserId } });
      await prisma.session.deleteMany({ where: { user_id: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      console.log(`\n🧹 Cleaned up isolated test user (${testUserId}) and test reset tokens.`);
    }
    await prisma.$disconnect();
  }

  console.log('\n======================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(allPassed ? '🎉 ALL TESTS PASSED SUCCESSFULLY!' : '⚠️ SOME TESTS FAILED');
  console.log('======================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTestSuite();
