import { prisma } from '../server/src/db/prisma';
import bcrypt from 'bcryptjs';

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

  console.log('✅ All 4 default users configured successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
