import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  
  // Get all user tables in public schema
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename;
  `;

  console.log(`Found ${tables.length} tables in public schema.`);

  for (const { tablename } of tables) {
    console.log(`Enabling RLS on: public.${tablename}`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY;`
    );
  }

  // Also check RLS status
  const rlsStatus = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
    WHERE pg_namespace.nspname = 'public' 
      AND pg_class.relkind = 'r'
      AND relname NOT LIKE '_prisma%'
    ORDER BY relname;
  `;

  console.log('\n--- Current RLS Status ---');
  for (const row of rlsStatus) {
    console.log(`Table: ${row.relname.padEnd(25)} RLS: ${row.relrowsecurity ? 'ENABLED (Protected)' : 'DISABLED'}`);
  }

  console.log('\nAll tables successfully secured with Row Level Security!');
}

main()
  .catch((e) => {
    console.error('Error enabling RLS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
