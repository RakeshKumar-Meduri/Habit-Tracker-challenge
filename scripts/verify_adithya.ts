import { prisma } from '../server/src/db/prisma';
import { getUserPlanTier } from '../server/src/services/payment.service';
import { verifyPassword } from '../server/src/utils/crypto';

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'adithya' },
    include: {
      subscriptions: { include: { plan: true } },
      memberships: { include: { group: true } },
    },
  });

  if (!user) {
    console.error('User adithya NOT FOUND!');
    process.exit(1);
  }

  console.log('✓ Found user:');
  console.log('   ID:', user.id);
  console.log('   Username:', user.username);
  console.log('   Name:', user.name);
  console.log('   Role:', user.role);

  const pwCheck = await verifyPassword('adithya07', user.password_hash);
  console.log('✓ Password adithya07 matches:', pwCheck.isValid);

  const wrongPwCheck = await verifyPassword('wrongpassword', user.password_hash);
  console.log('✓ Wrong password rejected:', !wrongPwCheck.isValid);

  const tier = await getUserPlanTier(user.id);
  console.log('✓ Effective plan tier:', tier);

  console.log('✓ Subscriptions:');
  for (const s of user.subscriptions) {
    console.log(`   - ID: ${s.id}, Plan: ${s.plan?.name} (${s.plan_id}), Status: ${s.status}`);
    console.log(`     Starts: ${s.starts_at.toISOString()}`);
    console.log(`     Expires: ${s.expires_at?.toISOString()}`);
    const remainingHours = s.expires_at ? ((s.expires_at.getTime() - Date.now()) / (1000 * 60 * 60)).toFixed(1) : 'N/A';
    console.log(`     Hours remaining: ${remainingHours}h (~3 days)`);
  }

  console.log('✓ Groups:');
  for (const m of user.memberships) {
    console.log(`   - Group: ${m.group?.name} (${m.group_id}), Role: ${m.role}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
