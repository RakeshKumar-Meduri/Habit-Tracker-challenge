import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- PULSE Reviews Migration Check ---');

  // 1. Check if public.reviews already exists
  const existingTable = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews';
  `;

  if (existingTable.length > 0) {
    console.log('public.reviews table already exists. Checking existing data for duplicates...');
    const duplicates = await prisma.$queryRaw<{ user_id: string; count: bigint }[]>`
      SELECT user_id, COUNT(*)::bigint as count
      FROM public.reviews
      GROUP BY user_id
      HAVING COUNT(*) > 1;
    `;

    if (duplicates.length > 0) {
      console.warn('WARNING: Duplicate reviews found for users:', duplicates);
      console.warn('Please manually review and merge duplicate records before applying unique constraint.');
      process.exit(1);
    } else {
      console.log('No duplicate reviews found. Proceeding with migration/hardening.');
    }
  } else {
    console.log('public.reviews table does not exist. Creating new table...');
  }

  // 2. Read SQL migration file and split statements
  const sqlPath = path.resolve(process.cwd(), 'prisma/create_reviews.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Strip comments and split by semicolon
  const statements = sqlContent
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    console.log('Executing statement:\n', stmt.split('\n')[0], '...');
    await prisma.$executeRawUnsafe(stmt);
  }

  console.log('Successfully executed all migration statements.');

  // 3. Verify RLS status
  const rlsCheck = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
    WHERE pg_namespace.nspname = 'public' AND relname = 'reviews';
  `;

  console.log('RLS Status on public.reviews:', rlsCheck);

  // 4. Verify Table Columns and Constraints
  const columns = await prisma.$queryRaw<{ column_name: string; data_type: string; udt_name: string; is_nullable: string }[]>`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews'
    ORDER BY ordinal_position;
  `;
  console.log('Columns in public.reviews:', columns);

  const constraints = await prisma.$queryRaw<{ conname: string; contype: string }[]>`
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = 'public.reviews'::regclass;
  `;
  console.log('Constraints on public.reviews:', constraints);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
