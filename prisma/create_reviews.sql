-- ==============================================================================
-- Production Migration: User Feedback & Reviews for PULSE
-- Enforces one review per user via UNIQUE(user_id)
-- Secures table with Row Level Security (RLS)
-- ==============================================================================

-- 1. Ensure uuid-ossp or pgcrypto is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create public.reviews table if not exists
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL CHECK (char_length(comment) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Ensure unique index on user_id for high-concurrency protection
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_id_unique_idx ON public.reviews (user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 5. Revoke direct anon/authenticated PostgREST permissions for least privilege
REVOKE ALL ON TABLE public.reviews FROM anon;
REVOKE ALL ON TABLE public.reviews FROM authenticated;
