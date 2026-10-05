import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

let supabaseClient: SupabaseClient | null = null;

if (ENV.SUPABASE_URL && (ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY)) {
  try {
    const key = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY;
    supabaseClient = createClient(ENV.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Supabase client initialized successfully');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
    supabaseClient = null;
  }
} else {
  console.log('[Supabase] Running without Supabase SDK credentials (set SUPABASE_URL and keys in .env)');
}

export const supabase = supabaseClient;

/**
 * Storage bucket names used by PULSE
 */
export const BUCKETS = {
  AVATARS: 'pulse-avatars',
  PROGRESS_PHOTOS: 'pulse-progress-photos',
} as const;

/**
 * Ensure storage buckets exist with public read access
 */
export async function ensureStorageBuckets() {
  if (!supabase) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const existing = new Set((buckets || []).map(b => b.name));

    for (const bucketName of Object.values(BUCKETS)) {
      if (!existing.has(bucketName)) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
        console.log(`[Supabase Storage] Created bucket: ${bucketName}`);
      }
    }
  } catch (err) {
    console.warn('[Supabase Storage Bucket Error]', (err as Error).message);
  }
}

/**
 * Upload a media buffer/base64 to Supabase Storage and return public URL
 */
export async function uploadMediaToSupabase(
  bucket: string,
  filePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!supabase) {
    console.warn('[Supabase Storage] Cannot upload: Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error('[Supabase Storage Upload Error]', error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[Supabase Storage Upload Exception]', err);
    return null;
  }
}
