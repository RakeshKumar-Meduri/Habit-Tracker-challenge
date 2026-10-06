import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring 4 Default Users: rakesh, hitesh (moderators) & demouser1, demouser2 (demo testers)...');

  const proPlan = await prisma.plan.findUnique({
    where: { id: 'plan_pro_yearly' },
  });

  const now = new Date();
  const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years

  const defaultUsers = [
    {
      username: 'rakesh',
      name: 'Rakesh',
      password: 'rakesh',
      role: 'moderator',
      isPro: true,
      avatar_color: 'from-[#D98B4A] to-[#B45F1E]',
    },
    {
      username: 'hitesh',
      name: 'Hitesh',
      password: 'hitesh',
      role: 'moderator',
      isPro: true,
      avatar_color: 'from-cyan-500 to-blue-700',
    },
    {
      username: 'demouser1',
      name: 'Demo User 1',
      password: 'demouser1',
      role: 'member',
      isPro: false,
      avatar_color: 'from-emerald-500 to-teal-700',
    },
    {
      username: 'demouser2',
      name: 'Demo User 2',
      password: 'demouser2',
      role: 'member',
      isPro: false,
      avatar_color: 'from-violet-500 to-purple-700',
    },
  ];

  for (const def of defaultUsers) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(def.password, salt);

    const user = await prisma.user.upsert({
      where: { username: def.username },
      update: {
        name: def.name,
        password_hash: passwordHash,
        role: def.role,
        is_active: true,
      },
      create: {
        username: def.username,
        name: def.name,
        password_hash: passwordHash,
        role: def.role,
        avatar_color: def.avatar_color,
        is_active: true,
        height: 175,
        weight_current: 70,
        age: 25,
        gender: 'male',
      },
    });

    console.log(`User @${user.username} configured (${user.id}) with password: ${def.password}`);

    if (def.isPro && proPlan) {
      await prisma.subscription.upsert({
        where: { id: `sub_vip_${user.id}` },
        update: {
          status: 'active',
          plan_id: 'plan_pro_yearly',
          expires_at: farFuture,
        },
        create: {
          id: `sub_vip_${user.id}`,
          user_id: user.id,
          plan_id: 'plan_pro_yearly',
          status: 'active',
          starts_at: now,
          expires_at: farFuture,
        },
      });
      console.log(`Activated 10-year Lifetime Pro for @${user.username}`);
    }
  }

  // Ensure default groups in Supabase
  const userRakesh = await prisma.user.findUnique({ where: { username: 'rakesh' } });
  const userHitesh = await prisma.user.findUnique({ where: { username: 'hitesh' } });
  const userDemo1 = await prisma.user.findUnique({ where: { username: 'demouser1' } });
  const userDemo2 = await prisma.user.findUnique({ where: { username: 'demouser2' } });

  if (userRakesh && userHitesh) {
    const eliteGroup = await prisma.group.upsert({
      where: { id: 'grp_pulse_elite' },
      update: { name: 'PULSE Elite Squad', owner_id: userRakesh.id },
      create: {
        id: 'grp_pulse_elite',
        name: 'PULSE Elite Squad',
        owner_id: userRakesh.id,
        step_target: 10000,
      },
    });

    await prisma.membership.upsert({
      where: { user_id_group_id: { user_id: userRakesh.id, group_id: eliteGroup.id } },
      update: { role: 'owner' },
      create: { user_id: userRakesh.id, group_id: eliteGroup.id, role: 'owner' },
    });

    await prisma.membership.upsert({
      where: { user_id_group_id: { user_id: userHitesh.id, group_id: eliteGroup.id } },
      update: { role: 'member' },
      create: { user_id: userHitesh.id, group_id: eliteGroup.id, role: 'member' },
    });
    console.log('✓ Group "PULSE Elite Squad" linked with @rakesh and @hitesh');
  }

  if (userDemo1 && userDemo2) {
    const demoGroup = await prisma.group.upsert({
      where: { id: 'grp_pulse_demo' },
      update: { name: 'Demo Testing Squad', owner_id: userDemo1.id },
      create: {
        id: 'grp_pulse_demo',
        name: 'Demo Testing Squad',
        owner_id: userDemo1.id,
        step_target: 8000,
      },
    });

    await prisma.membership.upsert({
      where: { user_id_group_id: { user_id: userDemo1.id, group_id: demoGroup.id } },
      update: { role: 'owner' },
      create: { user_id: userDemo1.id, group_id: demoGroup.id, role: 'owner' },
    });

    await prisma.membership.upsert({
      where: { user_id_group_id: { user_id: userDemo2.id, group_id: demoGroup.id } },
      update: { role: 'member' },
      create: { user_id: userDemo2.id, group_id: demoGroup.id, role: 'member' },
    });
    console.log('✓ Group "Demo Testing Squad" linked with @demouser1 and @demouser2');
  }

  console.log('✅ All 4 default users and squads configured successfully in Supabase!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
