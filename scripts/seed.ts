import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development database for PULSE...');

  // 1. Seed Plans
  console.log('- Seeding plans...');
  await prisma.plan.upsert({
    where: { id: 'plan_pro_monthly' },
    update: {},
    create: {
      id: 'plan_pro_monthly',
      name: 'PULSE Pro Monthly',
      description: 'Unlimited groups, detailed body shape analytics, and priority badges.',
      price: 49900, // ₹499.00
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
  });

  await prisma.plan.upsert({
    where: { id: 'plan_pro_yearly' },
    update: {},
    create: {
      id: 'plan_pro_yearly',
      name: 'PULSE Pro Yearly',
      description: 'Annual full access with 2 months free and team challenges.',
      price: 399900, // ₹3,999.00
      currency: 'INR',
      duration: 'yearly',
      is_active: true,
    },
  });

  // 2. Seed Test Users
  console.log('- Seeding test users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('pulse123', salt);

  const userRakesh = await prisma.user.upsert({
    where: { username: 'rakesh' },
    update: {},
    create: {
      id: 'usr_seed_rakesh',
      username: 'rakesh',
      name: 'Rakesh Kumar',
      password_hash: passwordHash,
      role: 'admin',
      height: 178,
      weight_current: 74.5,
      age: 26,
      gender: 'male',
      avatar_color: 'from-[#D98B4A] to-[#B45F1E]',
      is_active: true,
    },
  });

  const userSarah = await prisma.user.upsert({
    where: { username: 'sarah' },
    update: {},
    create: {
      id: 'usr_seed_sarah',
      username: 'sarah',
      name: 'Sarah Connor',
      password_hash: passwordHash,
      role: 'member',
      height: 165,
      weight_current: 58.0,
      age: 28,
      gender: 'female',
      avatar_color: 'from-emerald-500 to-teal-700',
      is_active: true,
    },
  });

  // 3. Seed Group & Memberships
  console.log('- Seeding group and memberships...');
  const devGroup = await prisma.group.upsert({
    where: { id: 'grp_seed_alpha' },
    update: { step_target: 10000 },
    create: {
      id: 'grp_seed_alpha',
      name: 'Alpha Accountability',
      owner_id: userRakesh.id,
      step_target: 10000,
    },
  });

  await prisma.membership.upsert({
    where: {
      user_id_group_id: {
        user_id: userRakesh.id,
        group_id: devGroup.id,
      },
    },
    update: { role: 'owner' },
    create: {
      user_id: userRakesh.id,
      group_id: devGroup.id,
      role: 'owner',
    },
  });

  await prisma.membership.upsert({
    where: {
      user_id_group_id: {
        user_id: userSarah.id,
        group_id: devGroup.id,
      },
    },
    update: { role: 'member' },
    create: {
      user_id: userSarah.id,
      group_id: devGroup.id,
      role: 'member',
    },
  });

  // 4. Seed Daily Logs
  console.log('- Seeding daily logs...');
  const today = new Date().toISOString().split('T')[0];

  await prisma.dailyLog.upsert({
    where: {
      user_id_date: {
        user_id: userRakesh.id,
        date: today,
      },
    },
    update: {},
    create: {
      user_id: userRakesh.id,
      date: today,
      gym_done: true,
      steps_done: true,
      steps_value: 11200,
      steps_target: 10000,
      sleep_done: true,
      junk_food_avoided: true,
      water_done: true,
      water_intake_ml: 3000,
      points_earned: 50.0,
    },
  });

  // 5. Seed Workouts
  console.log('- Seeding workouts...');
  await prisma.workout.upsert({
    where: { id: 'w_seed_bench' },
    update: {},
    create: {
      id: 'w_seed_bench',
      user_id: userRakesh.id,
      group_id: devGroup.id,
      date: today,
      exercise_name: 'Barbell Bench Press',
      exercise_type: 'strength',
      sets: 4,
      reps: 10,
      weight: 80,
      weight_unit: 'kg',
      duration: 45,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
