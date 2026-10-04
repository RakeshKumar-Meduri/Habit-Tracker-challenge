const http = require('http');

const PORT = 3001;

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: PORT,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING ACCEPTANCE TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();

    // 1. Acceptance Test 1: New signup without link -> gets own group, sees only themselves
    console.log('\n[Test 1] New signup without link -> gets own group, sees only themselves');
    const user1Name = `Alice_${timestamp}`;
    const user1Username = `alice_${timestamp}`;
    const reg1 = await request('/api/auth/register', { method: 'POST' }, {
      name: user1Name,
      username: user1Username,
      passwordPlain: 'password123',
      height: 165,
      weight: 60,
      age: 26,
      gender: 'female'
    });

    assert(reg1.status === 200 || reg1.status === 201, `Alice registered with status 200/201 (got ${reg1.status})`);
    assert(!!reg1.body.token, `Registration returned session token`);
    assert(!reg1.body.user.password_hash, `User response contains NO password_hash`);
    const aliceToken = reg1.body.token;
    const aliceId = reg1.body.user.id;

    // Call sync for Alice
    const sync1 = await request('/api/sync', {
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(sync1.status === 200, `Alice sync status is 200`);
    assert(sync1.body.data.group.name.includes("Alice"), `Alice group name is '${sync1.body.data.group.name}'`);
    assert(sync1.body.data.myRole === 'owner', `Alice is group owner`);
    assert(sync1.body.data.users.length === 1 && sync1.body.data.users[0].id === aliceId, `Alice sees only herself in users list`);

    // 2. Acceptance Test 2: Signup via link -> joins inviter's group, no extra group created
    console.log('\n[Test 2] Signup via link -> joins inviter\'s group, no extra group created');
    const inviteRes = await request(`/api/groups/${sync1.body.data.group.id}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` }
    }, { expiresInDays: 7, maxUses: 10 });

    assert(inviteRes.status === 200 || inviteRes.status === 201, `Alice created invite link (status ${inviteRes.status})`);
    const inviteToken = inviteRes.body.token;
    assert(!!inviteToken, `Invite token returned: ${inviteToken}`);

    // Public preview check
    const previewRes = await request(`/api/invites/${inviteToken}`);
    assert(previewRes.status === 200 && previewRes.body.valid === true, `Public invite preview is valid`);
    assert(previewRes.body.inviterName === user1Name, `Preview inviterName is Alice`);

    // Bob registers with inviteToken
    const user2Name = `Bob_${timestamp}`;
    const user2Username = `bob_${timestamp}`;
    const reg2 = await request('/api/auth/register', { method: 'POST' }, {
      name: user2Name,
      username: user2Username,
      passwordPlain: 'password123',
      height: 180,
      weight: 75,
      age: 28,
      gender: 'male',
      inviteToken
    });

    assert(reg2.status === 200 || reg2.status === 201, `Bob registered via invite with status 200/201`);
    const bobToken = reg2.body.token;
    const bobId = reg2.body.user.id;

    // Bob sync check
    const sync2 = await request('/api/sync', {
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    assert(sync2.body.data.group.id === sync1.body.data.group.id, `Bob joined Alice's group (${sync2.body.data.group.name})`);
    assert(sync2.body.data.myRole === 'member', `Bob's role is member`);
    assert(sync2.body.data.users.length === 2, `Group now has 2 members (Alice and Bob)`);

    // 3. Acceptance Test 3: Existing solo user opens link -> old empty group deleted, joins new one
    console.log('\n[Test 3] Existing solo user opens link -> old empty group deleted, joins new one');
    const user3Name = `Charlie_${timestamp}`;
    const user3Username = `charlie_${timestamp}`;
    const reg3 = await request('/api/auth/register', { method: 'POST' }, {
      name: user3Name,
      username: user3Username,
      passwordPlain: 'password123',
      height: 175,
      weight: 70,
      age: 25,
      gender: 'male'
    });
    const charlieToken = reg3.body.token;
    const charlieId = reg3.body.user.id;

    const charlieSyncBefore = await request('/api/sync', {
      headers: { Authorization: `Bearer ${charlieToken}` }
    });
    const charlieOldGroupId = charlieSyncBefore.body.data.group.id;
    assert(charlieSyncBefore.body.data.myRole === 'owner', `Charlie is owner of solo group`);

    // Charlie redeems Alice's invite link
    const redeemRes = await request(`/api/invites/${inviteToken}/redeem`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${charlieToken}` }
    });
    assert(redeemRes.status === 200 && redeemRes.body.success === true, `Charlie redeemed invite (status 200)`);

    const charlieSyncAfter = await request('/api/sync', {
      headers: { Authorization: `Bearer ${charlieToken}` }
    });
    assert(charlieSyncAfter.body.data.group.id === sync1.body.data.group.id, `Charlie joined Alice's group`);
    assert(charlieSyncAfter.body.data.users.length === 3, `Alice's group now has 3 members`);

    // 4. Acceptance Test 4: Existing user in a group with others opens link -> clear 409 message
    console.log('\n[Test 4] Existing user in group with others -> 409 Conflict');
    // Create David with his own group and invite
    const reg4 = await request('/api/auth/register', { method: 'POST' }, {
      name: `David_${timestamp}`,
      username: `david_${timestamp}`,
      passwordPlain: 'password123',
      height: 170,
      weight: 68,
      age: 24,
      gender: 'male'
    });
    const davidToken = reg4.body.token;
    const davidSync = await request('/api/sync', { headers: { Authorization: `Bearer ${davidToken}` } });
    const davidInviteRes = await request(`/api/groups/${davidSync.body.data.group.id}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${davidToken}` }
    });
    const davidInviteToken = davidInviteRes.body.token;

    // Charlie is now in Alice's group with 3 members. Charlie tries to redeem David's invite:
    const conflictRes = await request(`/api/invites/${davidInviteToken}/redeem`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${charlieToken}` }
    });
    assert(conflictRes.status === 409, `Redeem returned 409 Conflict (got ${conflictRes.status})`);
    assert(conflictRes.body.error.includes('Leave your current group first'), `Got expected error message: ${conflictRes.body.error}`);

    // 5. Acceptance Test 5: Expired / revoked / max-used link -> rejected, no user created
    console.log('\n[Test 5] Expired / revoked / max-used link -> rejected, no user created');
    // 5a. Expired link
    const expInviteRes = await request(`/api/groups/${sync1.body.data.group.id}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` }
    }, { expiresInDays: -1, maxUses: 5 });
    const expToken = expInviteRes.body.token;

    const regExp = await request('/api/auth/register', { method: 'POST' }, {
      name: `ExpUser_${timestamp}`,
      username: `expuser_${timestamp}`,
      passwordPlain: 'password123',
      inviteToken: expToken
    });
    assert(regExp.status === 400, `Expired invite registration rejected with 400 (got ${regExp.status})`);

    // 5b. Revoked link
    const revokeTargetInvite = await request(`/api/groups/${sync1.body.data.group.id}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` }
    }, { expiresInDays: 7, maxUses: 5 });
    const revToken = revokeTargetInvite.body.token;

    const deleteInvRes = await request(`/api/invites/${revToken}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(deleteInvRes.status === 200 && deleteInvRes.body.success === true, `Invite revoked successfully`);

    const regRev = await request('/api/auth/register', { method: 'POST' }, {
      name: `RevUser_${timestamp}`,
      username: `revuser_${timestamp}`,
      passwordPlain: 'password123',
      inviteToken: revToken
    });
    assert(regRev.status === 400, `Revoked invite registration rejected with 400`);

    // 5c. Max-used link
    const maxInviteRes = await request(`/api/groups/${davidSync.body.data.group.id}/invites`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${davidToken}` }
    }, { expiresInDays: 7, maxUses: 1 });
    const maxToken = maxInviteRes.body.token;

    // First use: Should succeed
    const regMax1 = await request('/api/auth/register', { method: 'POST' }, {
      name: `MaxUser1_${timestamp}`,
      username: `maxuser1_${timestamp}`,
      passwordPlain: 'password123',
      inviteToken: maxToken
    });
    assert(regMax1.status === 200 || regMax1.status === 201, `First use of max-used invite succeeded (got ${regMax1.status})`);

    // Second use: Should be rejected
    const regMax2 = await request('/api/auth/register', { method: 'POST' }, {
      name: `MaxUser2_${timestamp}`,
      username: `maxuser2_${timestamp}`,
      passwordPlain: 'password123',
      inviteToken: maxToken
    });
    assert(regMax2.status === 400, `Second use of max-used invite rejected with 400`);

    // 6. Acceptance Test 6: User in group A cannot see group B's data via /api/sync
    console.log('\n[Test 6] User in group A cannot see group B data');
    // David creates a workout and daily log in Group D
    const davidWorkoutRes = await request('/api/workouts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${davidToken}` }
    }, {
      id: `w_david_${timestamp}`,
      user_id: davidSync.body.data.group.owner_id,
      date: '2026-10-04',
      exercise_name: 'David Secret Exercise',
      sets: 3,
      reps: 10,
      duration: 30
    });
    assert(davidWorkoutRes.status === 200, `David logged workout`);

    // Alice in Group A syncs
    const aliceSyncAfter = await request('/api/sync', {
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    const aliceSeesDavid = aliceSyncAfter.body.data.users.some(u => u.name.includes('David'));
    const aliceSeesDavidWorkout = aliceSyncAfter.body.data.workouts.some(w => w.exercise_name === 'David Secret Exercise');
    assert(!aliceSeesDavid, `Alice cannot see David in users list`);
    assert(!aliceSeesDavidWorkout, `Alice cannot see David's workouts`);

    // 7. Acceptance Test 7: Request without token -> 401; deleting another user's account -> 403
    console.log('\n[Test 7] Auth guards & permissions');
    const noTokenRes = await request('/api/sync');
    assert(noTokenRes.status === 401, `Request without token returns 401 (got ${noTokenRes.status})`);

    const badTokenRes = await request('/api/sync', {
      headers: { Authorization: 'Bearer invalid_random_token_12345' }
    });
    assert(badTokenRes.status === 401, `Request with invalid token returns 401`);

    // Alice tries to delete Charlie's account
    const delCharlieRes = await request(`/api/users/${charlieId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(delCharlieRes.status === 403, `Deleting another user's account returns 403 Forbidden (got ${delCharlieRes.status})`);

    // 8. Acceptance Test 8: Owner leaves with members present -> ownership transfers
    console.log('\n[Test 8] Owner leaves with members present -> ownership transfers');
    // In Alice's group, Alice is owner, Bob joined first, Charlie joined second.
    const leaveRes = await request(`/api/groups/${sync1.body.data.group.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(leaveRes.status === 200 && leaveRes.body.success === true, `Alice left group successfully`);

    // Check Bob's sync to see if Bob is now the owner
    const bobSyncAfterLeave = await request('/api/sync', {
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    assert(bobSyncAfterLeave.body.data.myRole === 'owner', `Bob is now group owner after Alice left`);
    assert(bobSyncAfterLeave.body.data.group.owner_id === bobId, `Group owner_id updated to Bob`);

    // Check Alice's sync: Alice now has her own solo group
    const aliceNewSync = await request('/api/sync', {
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(aliceNewSync.body.data.group.id !== sync1.body.data.group.id, `Alice has a new group`);
    assert(aliceNewSync.body.data.myRole === 'owner', `Alice is owner of her new group`);

    // 9. Extra Verification: Workout Deletion Creator Authorization
    console.log('\n[Test 9] Creator-only workout deletion enforcement');
    // Bob logs a workout
    const bobWid = `w_bob_${timestamp}`;
    await request('/api/workouts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${bobToken}` }
    }, {
      id: bobWid,
      user_id: bobId,
      date: '2026-10-04',
      exercise_name: 'Bob Heavy Squats',
      sets: 4,
      reps: 8,
      duration: 40
    });

    // Charlie tries to delete Bob's workout -> 403 Forbidden
    const charlieDeleteBobWorkout = await request(`/api/workouts/${bobWid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${charlieToken}` }
    });
    assert(charlieDeleteBobWorkout.status === 403, `Charlie cannot delete Bob's workout (returned 403)`);

    // Bob deletes his own workout -> 200 OK
    const bobDeleteOwnWorkout = await request(`/api/workouts/${bobWid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    assert(bobDeleteOwnWorkout.status === 200 && bobDeleteOwnWorkout.body.success === true, `Bob successfully deleted his own workout`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
