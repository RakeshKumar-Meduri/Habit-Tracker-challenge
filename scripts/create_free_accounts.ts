import { prisma } from '../server/src/db/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Ensuring 2 Free VIP Pro Accounts: rakesh & friend...');

  const proPlan = await prisma.plan.findUnique({
    where: { id: 'plan_pro_yearly' },
  });

  if (!proPlan) {
    console.error('Pro yearly plan not found. Please run update_plans.ts first.');
    return;
  }

  // 1. Ensure rakesh user has Pro subscription
  const rakeshUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: 'rakesh' },
        { username: 'rakeshmeduri' },
        { username: 'rakesh_meduri' },
      ],
    },
  });

  const now = new Date();
  const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years

  for (const u of rakeshUsers) {
    await prisma.subscription.upsert({
      where: { id: `sub_vip_${u.id}` },
      update: {
        status: 'active',
        plan_id: 'plan_pro_yearly',
        expires_at: farFuture,
      },
      create: {
        id: `sub_vip_${u.id}`,
        user_id: u.id,
        plan_id: 'plan_pro_yearly',
        status: 'active',
        starts_at: now,
        expires_at: farFuture,
      },
    });
    console.log(`Activated 10-year Lifetime Pro for @${u.username} (${u.id})`);
  }

  // 2. Find or create 'enumulahitesh' account
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('hitesh', salt);

  let friendUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'enumulahitesh' },
        { username: 'friend' },
      ],
    },
  });

  if (!friendUser) {
    friendUser = await prisma.user.create({
      data: {
        username: 'enumulahitesh',
        name: 'Hitesh Enumula',
        password_hash: passwordHash,
        role: 'member',
        height: 172,
        weight_current: 68,
        age: 24,
        gender: 'male',
        avatar_color: 'from-emerald-500 to-teal-700',
        is_active: true,
      },
    });
    console.log(`Created friend user @enumulahitesh (${friendUser.id}) with password: hitesh`);
  } else {
    friendUser = await prisma.user.update({
      where: { id: friendUser.id },
      data: {
        username: 'enumulahitesh',
        name: 'Hitesh Enumula',
        password_hash: passwordHash,
        is_active: true,
      },
    });
    console.log(`Updated friend user @enumulahitesh (${friendUser.id}) password to: hitesh`);
  }

  // Give friend account 10-year Lifetime Pro
  await prisma.subscription.upsert({
    where: { id: `sub_vip_${friendUser.id}` },
    update: {
      status: 'active',
      plan_id: 'plan_pro_yearly',
      expires_at: farFuture,
    },
    create: {
      id: `sub_vip_${friendUser.id}`,
      user_id: friendUser.id,
      plan_id: 'plan_pro_yearly',
      status: 'active',
      starts_at: now,
      expires_at: farFuture,
    },
  });
  console.log(`Activated 10-year Lifetime Pro for @friend (${friendUser.id})`);

  // Enroll friend into rakesh's group
  const targetGroup = await prisma.group.findFirst({
    where: {
      OR: [
        { name: "rakesh's Group" },
        { owner: { username: { in: ['rakesh', 'rakeshmeduri', 'rakesh_meduri'] } } },
      ],
    },
    orderBy: { created_at: 'desc' },
  });

  if (targetGroup) {
    await prisma.membership.deleteMany({
      where: { user_id: friendUser.id },
    });
    await prisma.membership.create({
      data: {
        user_id: friendUser.id,
        group_id: targetGroup.id,
        role: 'member',
        joined_at: new Date(),
      },
    });
    console.log(`Enrolled @friend into group "${targetGroup.name}" (${targetGroup.id}) with Rakesh!`);
  }

  console.log('✅ Both free accounts configured successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
