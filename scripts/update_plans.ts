import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const PLANS = [
  {
    id: 'plan_base_monthly',
    name: 'PULSE Base (Free)',
    description: 'Solo fitness tracking. Daily checklist, workout logs, personal weights & analytics (no groups).',
    price: 0, // Free (₹0)
    currency: 'INR',
    duration: 'monthly',
    is_active: true,
  },
  {
    id: 'plan_pro_monthly',
    name: 'PULSE Pro Monthly',
    description: 'Full group formation, add unlimited members, head-to-head challenges, team progress & rankings.',
    price: 9900, // ₹99.00
    currency: 'INR',
    duration: 'monthly',
    is_active: true,
  },
  {
    id: 'plan_pro_yearly',
    name: 'PULSE Pro Yearly',
    description: '1 Year of full Pro access: unlimited groups, head-to-head battles, and team leaderboards.',
    price: 99900, // ₹999.00
    currency: 'INR',
    duration: 'yearly',
    is_active: true,
  },
];

async function main() {
  console.log('Syncing plans to Supabase database...');
  for (const plan of PLANS) {
    const upserted = await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        duration: plan.duration,
        is_active: plan.is_active,
      },
      create: plan,
    });
    console.log(`✓ Plan synced: ${upserted.id} - ${upserted.name} (₹${upserted.price / 100}/${upserted.duration})`);
  }

  const allPlans = await prisma.plan.findMany({ orderBy: { price: 'asc' } });
  console.log('\n--- Current Active Plans in Database ---');
  for (const p of allPlans) {
    console.log(`• [${p.id}] ${p.name}: ₹${p.price / 100} / ${p.duration}`);
  }
}

main()
  .catch((e) => {
    console.error('Error syncing plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
