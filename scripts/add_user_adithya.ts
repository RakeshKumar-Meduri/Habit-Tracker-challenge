import { prisma } from '../server/src/db/prisma';
import bcrypt from 'bcryptjs';
import { getUserPlanTier } from '../server/src/services/payment.service';
import { verifyPassword } from '../server/src/utils/crypto';

async function main() {
  console.log('Creating/Updating user adithya with 3-day Pro access...');

  // 1. Ensure plan_pro_monthly exists
  const proPlan = await prisma.plan.upsert({
    where: { id: 'plan_pro_monthly' },
    update: {},
    create: {
      id: 'plan_pro_monthly',
      name: 'PULSE Pro Monthly',
      description: 'Full group formation, add unlimited members, head-to-head challenges, team progress & rankings.',
      price: 9900,
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('adithya07', salt);

  const now = new Date();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  // 2. Upsert user
  const user = await prisma.user.upsert({
    where: { username: 'adithya' },
    update: {
      name: 'Adithya',
      password_hash: passwordHash,
      role: 'member',
      is_active: true,
    },
    create: {
      username: 'adithya',
      name: 'Adithya',
      password_hash: passwordHash,
      role: 'member',
      avatar_color: 'from-cyan-500 to-blue-700',
      is_active: true,
      height: 175,
      weight_current: 70,
      age: 25,
      gender: 'male',
    },
  });

  console.log(`✓ User created/updated: ID = ${user.id}, username = ${user.username}`);

  // 3. Upsert Group & Membership
  let group = await prisma.group.findFirst({
    where: { owner_id: user.id },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "Adithya's Squad",
        owner_id: user.id,
        step_target: 10000,
      },
    });
    console.log(`✓ Group created: ${group.name} (${group.id})`);
  }

  await prisma.membership.upsert({
    where: {
      user_id_group_id: {
        user_id: user.id,
        group_id: group.id,
      },
    },
    update: { role: 'owner' },
    create: {
      user_id: user.id,
      group_id: group.id,
      role: 'owner',
    },
  });
  console.log(`✓ Membership linked as group owner`);

  // 4. Create/Upsert 3-day Pro Subscription
  const subId = `sub_${user.id}`;
  const subscription = await prisma.subscription.upsert({
    where: { id: subId },
    update: {
      plan_id: proPlan.id,
      status: 'active',
      starts_at: now,
      expires_at: threeDaysFromNow,
      cancelled_at: null,
    },
    create: {
      id: subId,
      user_id: user.id,
      plan_id: proPlan.id,
      status: 'active',
      starts_at: now,
      expires_at: threeDaysFromNow,
    },
  });

  console.log(`✓ Subscription configured:`);
  console.log(`   ID: ${subscription.id}`);
  console.log(`   Plan: ${subscription.plan_id}`);
  console.log(`   Status: ${subscription.status}`);
  console.log(`   Starts At: ${subscription.starts_at.toISOString()}`);
  console.log(`   Expires At: ${subscription.expires_at?.toISOString()}`);

  // 5. Verification
  const tier = await getUserPlanTier(user.id);
  const authCheck = await verifyPassword('adithya07', user.password_hash);

  console.log('\n--- VERIFICATION ---');
  console.log(`Plan Tier: ${tier} (expected: pro)`);
  console.log(`Password verification: ${authCheck.isValid} (expected: true)`);
  console.log(`Valid until: ${subscription.expires_at?.toLocaleString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
