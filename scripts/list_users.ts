import { prisma } from '../server/src/db/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, is_active: true }
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const subs = await prisma.subscription.findMany({
    include: { plan: true, user: true }
  });
  console.log('SUBSCRIPTIONS:', JSON.stringify(subs, null, 2));

  const groups = await prisma.group.findMany({
    include: { memberships: { include: { user: { select: { id: true, username: true, name: true } } } } }
  });
  console.log('GROUPS:', JSON.stringify(groups, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
