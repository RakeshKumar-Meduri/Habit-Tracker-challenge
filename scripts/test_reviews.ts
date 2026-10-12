import assert from 'assert';
import http from 'http';
import dotenv from 'dotenv';
import { prisma } from '../server/src/db/prisma';
import { generateSessionToken } from '../server/src/utils/crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import reviewsRoutes from '../server/src/routes/reviews.routes';
import { errorHandler } from '../server/src/middleware/errorHandler';

dotenv.config();

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
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('       PULSE USER FEEDBACK & REVIEWS COMPREHENSIVE TEST SUITE   ');
  console.log('================================================================\n');

  // 1. Setup lightweight Express server on test port
  const app = express();
  app.use(cors());
  app.use(cookieParser('test_secret_pulse'));
  app.use(express.json());
  app.use(reviewsRoutes);
  app.use(errorHandler);

  const testPort = 3199;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(testPort, resolve));
  const baseUrl = `http://127.0.0.1:${testPort}`;

  const testRunId = Date.now().toString(36);
  const createdUserIds: string[] = [];
  const createdSessionIds: string[] = [];

  async function retryOp<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
    for (let i = 1; i <= retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === retries) throw err;
        console.warn(`Connection retry ${i}/${retries}...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error('Retries exceeded');
  }

  // Helper to create test user & session
  async function createTestUserWithSession(usernameSuffix: string) {
    return retryOp(async () => {
      const user = await prisma.user.create({
        data: {
          username: `review_test_${usernameSuffix}_${testRunId}`,
          name: `Review Tester ${usernameSuffix}`,
          password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
          email: `tester_${usernameSuffix}_${testRunId}@example.com`,
          email_verified: true,
        },
      });
      createdUserIds.push(user.id);

      const { rawToken, tokenHash } = generateSessionToken();
      const session = await prisma.session.create({
        data: {
          user_id: user.id,
          session_token_hash: tokenHash,
          token: rawToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      createdSessionIds.push(session.id);

      return { user, rawToken };
    });
  }

  try {
    const { user: userA, rawToken: tokenA } = await createTestUserWithSession('a');
    const { user: userB, rawToken: tokenB } = await createTestUserWithSession('b');

    // Headers helper
    const authHeadersA = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`,
      'x-pulse-test-bypass': 'pulse-internal-security-test',
    };
    const authHeadersB = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`,
      'x-pulse-test-bypass': 'pulse-internal-security-test',
    };

    // ----------------------------------------------------
    // Section 1: Authentication & Authorization
    // ----------------------------------------------------
    console.log('--- 1. Authentication & Security Enforcement ---');

    await test('Unauthenticated user cannot submit review (401)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment: 'Nice app!' }),
      });
      assert.strictEqual(res.status, 401, 'Must reject unauthenticated submission with 401');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'UNAUTHORIZED');
    });

    await test('Unauthenticated user cannot read review endpoint (401)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(res.status, 401, 'Must reject unauthenticated fetch with 401');
    });

    await test('Unauthenticated user cannot update review (401)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 4, comment: 'Trying to update' }),
      });
      assert.strictEqual(res.status, 401, 'Must reject unauthenticated patch with 401');
    });

    // ----------------------------------------------------
    // Section 2: Input Validation (Edge Cases & Boundaries)
    // ----------------------------------------------------
    console.log('\n--- 2. Server-side Validation & Boundary Checks ---');

    await test('Empty comment is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 5, comment: '' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await test('Whitespace-only comment is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 5, comment: '     \n\t   ' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await test('Comment exceeding 1,000 characters is rejected (400)', async () => {
      const longComment = 'a'.repeat(1001);
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 5, comment: longComment }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await test('Rating below 1 is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 0, comment: 'Too low' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await test('Rating above 5 is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 6, comment: 'Too high' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    await test('Non-integer rating (e.g. 3.5) is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 3.5, comment: 'Decimal rating' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
    });

    // ----------------------------------------------------
    // Section 3: Review Creation & Initial Retrieval
    // ----------------------------------------------------
    console.log('\n--- 3. Review Submission & Retrieval ---');

    let createdReviewAId = '';

    await test('Initial GET /api/reviews/me returns review: null', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'GET',
        headers: authHeadersA,
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.review, null);
    });

    await test('User can submit valid review with max length 1,000 comment (201)', async () => {
      const validComment = 'PULSE fitness tracking is smooth and intuitive! ' + 'x'.repeat(900);
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 5, comment: validComment }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.review.id, 'Must return review ID');
      assert.strictEqual(data.review.userId, userA.id, 'Derived user ID must match session user');
      assert.strictEqual(data.review.rating, 5);
      assert.strictEqual(data.review.comment, validComment);
      createdReviewAId = data.review.id;
    });

    await test('GET /api/reviews/me now returns the saved review', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'GET',
        headers: authHeadersA,
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.review);
      assert.strictEqual(data.review.id, createdReviewAId);
      assert.strictEqual(data.review.rating, 5);
    });

    // ----------------------------------------------------
    // Section 4: One Review Per User Enforcement & Concurrency
    // ----------------------------------------------------
    console.log('\n--- 4. One Review Per User Enforcement & Concurrency Protection ---');

    await test('Submitting a second review is rejected with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 4, comment: 'Second attempt should fail' }),
      });
      assert.strictEqual(res.status, 409, 'Must return 409 Conflict for duplicate review');
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error.code, 'REVIEW_ALREADY_EXISTS');
    });

    await test('Simultaneous submissions for User B produce exactly 1 review and 1 conflict', async () => {
      // Send 3 simultaneous creation requests for user B
      const responses = await Promise.all([
        fetch(`${baseUrl}/api/reviews`, {
          method: 'POST',
          headers: authHeadersB,
          body: JSON.stringify({ rating: 5, comment: 'Concurrent test 1' }),
        }),
        fetch(`${baseUrl}/api/reviews`, {
          method: 'POST',
          headers: authHeadersB,
          body: JSON.stringify({ rating: 4, comment: 'Concurrent test 2' }),
        }),
        fetch(`${baseUrl}/api/reviews`, {
          method: 'POST',
          headers: authHeadersB,
          body: JSON.stringify({ rating: 3, comment: 'Concurrent test 3' }),
        }),
      ]);

      const statuses = responses.map((r) => r.status);
      const createdCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      assert.strictEqual(createdCount, 1, 'Exactly one simultaneous request must succeed (201)');
      assert.strictEqual(conflictCount, 2, 'The other simultaneous requests must be rejected (409)');

      // Verify in DB that only 1 record exists for User B
      const userBReviews = await prisma.review.findMany({ where: { user_id: userB.id } });
      assert.strictEqual(userBReviews.length, 1, 'Database must contain exactly 1 row for User B');
    });

    await test('PostgreSQL UNIQUE constraint directly rejects duplicate user_id insertion', async () => {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO public.reviews (user_id, rating, comment) VALUES ('${userA.id}', 1, 'Raw bypass attempt');`
        );
        assert.fail('Database unique constraint should have blocked direct insertion');
      } catch (err: any) {
        // Must fail with PostgreSQL unique constraint error (code 23505 / 'already exists')
        assert.ok(
          err.message.includes('already exists') ||
          err.message.includes('23505') ||
          err.message.includes('unique') ||
          err.code === 'P2002',
          `Expected unique constraint violation, got: ${err.message}`
        );
      }
    });

    await test('Client-supplied user_id spoofing is ignored and cannot overwrite other users', async () => {
      // User B attempts to submit spoofing userA's ID in request body
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'PATCH',
        headers: authHeadersB,
        body: JSON.stringify({
          rating: 1,
          comment: 'Hacked comment',
          userId: userA.id,
          user_id: userA.id,
        }),
      });
      assert.strictEqual(res.status, 200);

      // Verify User A's review was unaffected!
      const userAReview = await prisma.review.findUnique({ where: { user_id: userA.id } });
      assert.strictEqual(userAReview?.rating, 5, "User A's rating must remain unchanged");
      assert.notStrictEqual(userAReview?.comment, 'Hacked comment', "User A's comment must remain untouched");
    });

    // ----------------------------------------------------
    // Section 5: Review Editing & Privacy Isolation
    // ----------------------------------------------------
    console.log('\n--- 5. Review Editing & Privacy Scoping ---');

    await test('User A can edit review via PATCH /api/reviews/me', async () => {
      const updatedComment = 'PULSE continues to improve! Updated feedback.';
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'PATCH',
        headers: authHeadersA,
        body: JSON.stringify({ rating: 4, comment: updatedComment }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.review.id, createdReviewAId, 'Review ID must remain identical');
      assert.strictEqual(data.review.rating, 4);
      assert.strictEqual(data.review.comment, updatedComment);
    });

    await test('Editing does NOT create a new row in database', async () => {
      const allUserAReviews = await prisma.review.findMany({ where: { user_id: userA.id } });
      assert.strictEqual(allUserAReviews.length, 1, 'Total rows for user must remain strictly 1');
      assert.strictEqual(allUserAReviews[0].id, createdReviewAId);
      assert.strictEqual(allUserAReviews[0].rating, 4);
    });

    await test('User B cannot see User A reviews via GET /api/reviews/me', async () => {
      const res = await fetch(`${baseUrl}/api/reviews/me`, {
        method: 'GET',
        headers: authHeadersB,
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.notStrictEqual(data.review.id, createdReviewAId);
      assert.strictEqual(data.review.userId, userB.id);
    });

    // ----------------------------------------------------
    // Section 6: Database Security & RLS Verification
    // ----------------------------------------------------
    console.log('\n--- 6. Database RLS & Security Verification ---');

    await test('Row Level Security (RLS) is enabled on public.reviews', async () => {
      const rls = await prisma.$queryRaw<{ relrowsecurity: boolean }[]>`
        SELECT relrowsecurity 
        FROM pg_class 
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
        WHERE pg_namespace.nspname = 'public' AND relname = 'reviews';
      `;
      assert.strictEqual(rls[0].relrowsecurity, true, 'RLS must be enabled on public.reviews');
    });

    await test('Direct PostgREST permissions revoked from anon and authenticated', async () => {
      const privileges = await prisma.$queryRaw<{ grantee: string; privilege_type: string }[]>`
        SELECT grantee, privilege_type 
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' AND table_name = 'reviews'
          AND grantee IN ('anon', 'authenticated');
      `;
      assert.strictEqual(privileges.length, 0, 'No direct table privileges should be granted to anon or authenticated');
    });

  } finally {
    // Teardown
    console.log('\n--- Cleaning up test records ---');
    try {
      if (createdUserIds.length > 0) {
        // Reviews cascade delete on user delete
        await prisma.review.deleteMany({ where: { user_id: { in: createdUserIds } } });
        await prisma.session.deleteMany({ where: { user_id: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } catch (e: any) {
      console.warn('Cleanup warning:', e.message);
    }
    server.close();
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Fatal error running test suite:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
