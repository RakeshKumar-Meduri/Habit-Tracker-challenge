import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development database for PULSE...');

  // 1. Seed Plans
  console.log('- Seeding plans...');
  await prisma.plan.upsert({
    where: { id: 'plan_base_monthly' },
    update: { price: 2900 },
    create: {
      id: 'plan_base_monthly',
      name: 'PULSE Base Monthly',
      description: 'Core daily habit tracking, hydration & activity logging.',
      price: 2900, // ₹29.00
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
  });

  await prisma.plan.upsert({
    where: { id: 'plan_pro_monthly' },
    update: { price: 9900 },
    create: {
      id: 'plan_pro_monthly',
      name: 'PULSE Pro Monthly',
      description: 'Unlimited groups, team goals, head-to-head battles, and badges.',
      price: 9900, // ₹99.00
      currency: 'INR',
      duration: 'monthly',
      is_active: true,
    },
  });

  await prisma.plan.upsert({
    where: { id: 'plan_pro_yearly' },
    update: { price: 99900 },
    create: {
      id: 'plan_pro_yearly',
      name: 'PULSE Pro Yearly',
      description: 'Annual full access with VIP status and team challenges.',
      price: 99900, // ₹999.00
      currency: 'INR',
      duration: 'yearly',
      is_active: true,
    },
  });

  // 2. Seed Default Users
  console.log('- Seeding default users (rakesh, hitesh, demouser1, demouser2)...');
  const salt = await bcrypt.genSalt(10);

  const userRakesh = await prisma.user.upsert({
    where: { username: 'rakesh' },
    update: { role: 'moderator' },
    create: {
      id: 'usr_seed_rakesh',
      username: 'rakesh',
      name: 'Rakesh (Moderator)',
      password_hash: await bcrypt.hash('rakesh', salt),
      role: 'moderator',
      height: 178,
      weight_current: 74.5,
      age: 26,
      gender: 'male',
      avatar_color: 'from-[#D98B4A] to-[#B45F1E]',
      is_active: true,
    },
  });

  const userHitesh = await prisma.user.upsert({
    where: { username: 'hitesh' },
    update: { role: 'moderator' },
    create: {
      id: 'usr_seed_hitesh',
      username: 'hitesh',
      name: 'Hitesh (Moderator)',
      password_hash: await bcrypt.hash('hitesh', salt),
      role: 'moderator',
      height: 175,
      weight_current: 72.0,
      age: 26,
      gender: 'male',
      avatar_color: 'from-blue-600 to-indigo-800',
      is_active: true,
    },
  });

  const userDemo1 = await prisma.user.upsert({
    where: { username: 'demouser1' },
    update: { role: 'member' },
    create: {
      id: 'usr_seed_demo1',
      username: 'demouser1',
      name: 'Demo Tester 1',
      password_hash: await bcrypt.hash('demouser1', salt),
      role: 'member',
      height: 170,
      weight_current: 68.0,
      age: 25,
      gender: 'male',
      avatar_color: 'from-emerald-500 to-teal-700',
      is_active: true,
    },
  });

  const userDemo2 = await prisma.user.upsert({
    where: { username: 'demouser2' },
    update: { role: 'member' },
    create: {
      id: 'usr_seed_demo2',
      username: 'demouser2',
      name: 'Demo Tester 2',
      password_hash: await bcrypt.hash('demouser2', salt),
      role: 'member',
      height: 165,
      weight_current: 60.0,
      age: 24,
      gender: 'female',
      avatar_color: 'from-purple-500 to-pink-600',
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
