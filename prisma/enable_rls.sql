-- ==============================================================================
-- Supabase Row Level Security (RLS) Protection Script for PULSE
-- Enables RLS across all 21 public application tables to protect PostgREST APIs.
-- The Express backend connects via the superuser/owner role (BYPASSRLS),
-- maintaining 100% operational functionality while blocking unauthorized anonymous access.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE '_prisma%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;
